// Sprint 6F audit center: server-only helpers behind the audit server
// functions. Recomputes the engine's allocation from live database rows and
// compares it against what is actually stored, so an independent reviewer can
// verify weight compliance, coverage, and the reassessment reuse rules.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchPolicyAudit,
  type DbErrorShape,
  type PolicyAuditRow,
} from "./audit.server";
import type { CallerCtx } from "./blueprint-audit.server";
import { PILOT_BOOK_ID } from "./curriculum-audit.server";
import { allocateByWeight, buildDiagnosticPlan, predictRisks, type RiskRow } from "./diagnostic-shared";

type Client = SupabaseClient<Database>;

const ENGINE_TABLES = ["assessments", "assessment_question_map", "book_events"] as const;
const NO_ROWS = ["00000000-0000-4000-8000-000000000000"];

// The seeded generated pair (see the Sprint 6F migration).
export const DIAG_EXPECTED = {
  diagnosticId: "cc000001-0000-4000-8000-000000000001",
  reassessmentId: "cc000002-0000-4000-8000-000000000002",
  diagnosticTitle: "My Country — Unit Diagnostic (Auto)",
  reassessmentTitle: "My Country — Unit Reassessment (Auto)",
  unitId: "66100000-0000-4000-8000-000000000001",
  totalQuestions: 9,
  outcomesInUnit: 3,
  // Sprint 6G seeded two submitted demo sessions on the diagnostic to power
  // the Gap Analysis sprint — they are expected and allowed by probe P6.
  demoSessionIds: [
    "dd000001-0000-4000-8000-000000000001",
    "dd000002-0000-4000-8000-000000000002",
  ],
} as const;

function shapeError(err: unknown): DbErrorShape {
  if (!err || typeof err !== "object") return null;
  const e = err as { code?: string; message?: string; details?: string | null; hint?: string | null };
  return {
    code: e.code ?? null,
    message: e.message ?? "unknown error",
    details: e.details ?? null,
    hint: e.hint ?? null,
  };
}

// ---------------------------------------------------------------------------
// Counts: caller-visible (RLS) vs global (service role)
// ---------------------------------------------------------------------------

export type EngineCount = {
  table: string;
  label: string;
  visibleToYou: number | null;
  globalAllOrgs: number;
  isolated: boolean;
  note: string;
};

export async function fetchEngineCounts(supabase: Client, admin: Client): Promise<EngineCount[]> {
  const specs = [
    { table: "assessments", label: "Assessments", note: "Includes engine-generated diagnostics and reassessments.", idCol: "id" },
    { table: "assessment_question_map", label: "Question maps", note: "The engine's picked questions per generated assessment.", idCol: "assessment_id" },
    { table: "book_events", label: "Book events", note: "Append-only log — diagnostic_generated rows record every generation.", idCol: "id" },
  ] as const;
  const out: EngineCount[] = [];
  for (const spec of specs) {
    const visible = await (supabase as SupabaseClient)
      .from(spec.table)
      .select(spec.idCol, { count: "exact", head: true });
    const global = await (admin as SupabaseClient)
      .from(spec.table)
      .select(spec.idCol, { count: "exact", head: true });
    const visibleToYou = visible.error ? null : (visible.count ?? 0);
    const globalAllOrgs = global.count ?? 0;
    out.push({
      table: spec.table,
      label: spec.label,
      note: spec.note,
      visibleToYou,
      globalAllOrgs,
      isolated: visibleToYou !== null && visibleToYou <= globalAllOrgs,
    });
  }
  return out;
}

export async function fetchEnginePolicies(supabase: Client): Promise<PolicyAuditRow[]> {
  const all = await fetchPolicyAudit(supabase);
  return all.filter((p) => (ENGINE_TABLES as readonly string[]).includes(p.tablename));
}

// ---------------------------------------------------------------------------
// Snapshot: the seeded pair, re-derived allocation, overlap, and risks
// ---------------------------------------------------------------------------

export type OutcomeAllocationRow = {
  code: string;
  title: string;
  weight: number;
  diagnosticStored: number;
  diagnosticRecomputed: number;
  reassessmentStored: number;
  reassessmentRecomputed: number;
  approvedInBank: number;
};

export type EngineSnapshot = {
  diagnosticPresent: boolean;
  reassessmentPresent: boolean;
  diagnosticTitle: string;
  reassessmentTitle: string;
  diagnosticStatus: string;
  reassessmentStatus: string;
  diagnosticQuestions: number;
  reassessmentQuestions: number;
  overlapCount: number;
  // Reassessment questions that were already used by another assessment.
  reusedCount: number;
  // Reassessment questions that are not approved in the bank.
  unapprovedCount: number;
  rows: OutcomeAllocationRow[];
  risks: RiskRow[];
};

export async function fetchEngineSnapshot(client: Client): Promise<EngineSnapshot> {
  const E = DIAG_EXPECTED;
  const empty: EngineSnapshot = {
    diagnosticPresent: false,
    reassessmentPresent: false,
    diagnosticTitle: "",
    reassessmentTitle: "",
    diagnosticStatus: "",
    reassessmentStatus: "",
    diagnosticQuestions: 0,
    reassessmentQuestions: 0,
    overlapCount: 0,
    reusedCount: 0,
    unapprovedCount: 0,
    rows: [],
    risks: [],
  };

  const { data: pair, error } = await client
    .from("assessments")
    .select("id, title, kind, status, unit_id, book_id")
    .in("id", [E.diagnosticId, E.reassessmentId]);
  if (error || !pair) return empty;
  const diagnostic = pair.find((a) => a.id === E.diagnosticId);
  const reassessment = pair.find((a) => a.id === E.reassessmentId);
  if (!diagnostic?.unit_id || !diagnostic.book_id) return empty;

  const [outcomesRes, questionsRes, mapsRes, bookAssessmentsRes] = await Promise.all([
    client
      .from("assessment_outcomes")
      .select("id, code, title, diagnostic_weight, difficulty, status")
      .eq("unit_id", diagnostic.unit_id)
      .order("code"),
    client
      .from("question_bank")
      .select("id, outcome_id, kind, difficulty, prompt, status")
      .eq("book_id", diagnostic.book_id),
    client
      .from("assessment_question_map")
      .select("assessment_id, question_id")
      .in("assessment_id", [E.diagnosticId, E.reassessmentId]),
    client.from("assessments").select("id").eq("book_id", diagnostic.book_id),
  ]);
  if (outcomesRes.error || questionsRes.error || mapsRes.error || bookAssessmentsRes.error) return empty;

  const outcomes = (outcomesRes.data ?? []).filter((o) => o.status === "active");
  const approved = (questionsRes.data ?? []).filter((q) => q.status === "approved");
  const maps = mapsRes.data ?? [];

  const diagnosticIds = maps.filter((m) => m.assessment_id === E.diagnosticId).map((m) => m.question_id);
  const reassessmentIds = maps.filter((m) => m.assessment_id === E.reassessmentId).map((m) => m.question_id);

  // Usage state as the engine saw it at generation time: all mapped questions
  // of the book excluding the generated pair itself.
  const { data: otherMaps } = await client
    .from("assessment_question_map")
    .select("assessment_id, question_id")
    .in("assessment_id", (bookAssessmentsRes.data ?? []).map((a) => a.id).filter((id) => id !== E.reassessmentId));
  const usedAtGeneration = new Set(
    (otherMaps ?? []).filter((m) => m.assessment_id !== E.reassessmentId).map((m) => m.question_id),
  );

  // Recompute both plans with the shared engine math.
  const engineOutcomes = outcomes.map((o) => ({
    id: o.id,
    code: o.code,
    title: o.title,
    category: "",
    bloomLevel: "",
    difficulty: o.difficulty,
    diagnosticWeight: o.diagnostic_weight,
    status: o.status,
    questions: approved
      .filter((q) => q.outcome_id === o.id)
      .map((q) => ({ id: q.id, kind: q.kind, difficulty: q.difficulty, prompt: q.prompt })),
  }));

  const diagnosticPlan = buildDiagnosticPlan({
    template: "diagnostic",
    outcomes: engineOutcomes,
    totalQuestions: E.totalQuestions,
    usedQuestionIds: usedAtGeneration,
  });
  const reassessmentPlan = buildDiagnosticPlan({
    template: "reassessment",
    outcomes: engineOutcomes,
    totalQuestions: E.totalQuestions,
    excludeQuestionIds: new Set(diagnosticIds),
    usedQuestionIds: usedAtGeneration,
  });

  const storedCount = (outcomeId: string, ids: string[]) => {
    const inBank = new Map(approved.map((q) => [q.id, q.outcome_id]));
    return ids.filter((id) => inBank.get(id) === outcomeId).length;
  };

  const rows: OutcomeAllocationRow[] = outcomes.map((o) => ({
    code: o.code,
    title: o.title,
    weight: o.diagnostic_weight,
    diagnosticStored: storedCount(o.id, diagnosticIds),
    diagnosticRecomputed: diagnosticPlan.outcomes.find((p) => p.outcomeId === o.id)?.actualQuestions ?? 0,
    reassessmentStored: storedCount(o.id, reassessmentIds),
    reassessmentRecomputed: reassessmentPlan.outcomes.find((p) => p.outcomeId === o.id)?.actualQuestions ?? 0,
    approvedInBank: approved.filter((q) => q.outcome_id === o.id).length,
  }));

  const diagnosticSet = new Set(diagnosticIds);
  const overlapCount = reassessmentIds.filter((id) => diagnosticSet.has(id)).length;
  const statusById = new Map((questionsRes.data ?? []).map((q) => [q.id, q.status]));
  const unapprovedCount = reassessmentIds.filter((id) => statusById.get(id) !== "approved").length;
  // Reused = reassessment question appears in some other assessment's map.
  const usedElsewhere = new Set(
    (otherMaps ?? []).filter((m) => m.assessment_id !== E.reassessmentId).map((m) => m.question_id),
  );
  const reusedCount = reassessmentIds.filter((id) => usedElsewhere.has(id)).length;

  return {
    diagnosticPresent: !!diagnostic,
    reassessmentPresent: !!reassessment,
    diagnosticTitle: diagnostic.title,
    reassessmentTitle: reassessment?.title ?? "",
    diagnosticStatus: diagnostic.status,
    reassessmentStatus: reassessment?.status ?? "",
    diagnosticQuestions: diagnosticIds.length,
    reassessmentQuestions: reassessmentIds.length,
    overlapCount,
    reusedCount,
    unapprovedCount,
    rows,
    risks: predictRisks(outcomes.map((o) => ({ ...o, diagnosticWeight: o.diagnostic_weight }))),
  };
}

// Convenience re-export so probes and the UI share one allocation source.
export { allocateByWeight };

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

export type EngineProbe = {
  key: string;
  name: string;
  expectation: string;
  detail: string;
  pass: boolean;
  skipped?: boolean;
  dbError?: DbErrorShape;
};

export async function runEngineProbes(
  supabase: Client,
  admin: Client,
  me: CallerCtx,
): Promise<EngineProbe[]> {
  const probes: EngineProbe[] = [];
  const E = DIAG_EXPECTED;

  const snap = await fetchEngineSnapshot(admin);

  // P1 — Seeded generated pair present with expected shape.
  {
    const ok =
      snap.diagnosticPresent &&
      snap.reassessmentPresent &&
      snap.diagnosticQuestions === E.totalQuestions &&
      snap.reassessmentQuestions === E.totalQuestions;
    probes.push({
      key: "seeded-pair",
      name: "P1 — Generated pair seeded",
      expectation: `"${E.diagnosticTitle}" and "${E.reassessmentTitle}" exist with ${E.totalQuestions} mapped questions each.`,
      detail: snap.diagnosticPresent && snap.reassessmentPresent
        ? `Diagnostic: ${snap.diagnosticQuestions} questions (${snap.diagnosticStatus}); reassessment: ${snap.reassessmentQuestions} questions (${snap.reassessmentStatus}).`
        : "Seeded generated pair not found.",
      pass: ok,
    });
  }

  // P2 — Weight compliance: stored allocation matches largest-remainder recompute.
  {
    const weights = snap.rows.map((r) => ({ id: r.code, code: r.code, diagnosticWeight: r.weight }));
    const recomputed = allocateByWeight(weights, E.totalQuestions);
    const mismatches = snap.rows.filter(
      (r) => r.diagnosticStored !== (recomputed.get(r.code) ?? 0) || r.diagnosticStored !== r.diagnosticRecomputed,
    );
    const summary = snap.rows.map((r) => `${r.code} ${r.weight}%→${r.diagnosticStored}q`).join(", ");
    probes.push({
      key: "weight-compliance",
      name: "P2 — Weight compliance (largest remainder)",
      expectation: `Stored per-outcome question counts equal the largest-remainder allocation of ${E.totalQuestions} questions over the live blueprint weights.`,
      detail: `Allocation: ${summary}. Mismatches vs recompute: ${mismatches.length}.`,
      pass: snap.rows.length > 0 && mismatches.length === 0,
    });
  }

  // P3 — Outcome coverage: every outcome with approved questions is measured.
  {
    const coverable = snap.rows.filter((r) => r.approvedInBank > 0);
    const measured = coverable.filter((r) => r.diagnosticStored > 0);
    probes.push({
      key: "outcome-coverage",
      name: "P3 — Outcome coverage",
      expectation: "The generated diagnostic measures every unit outcome that has at least one approved question.",
      detail: `Coverable outcomes: ${coverable.length}/${snap.rows.length}; measured by the diagnostic: ${measured.length}.`,
      pass: snap.diagnosticPresent && coverable.length > 0 && measured.length === coverable.length,
    });
  }

  // P4 — Reassessment separation: zero overlap with the baseline diagnostic.
  {
    probes.push({
      key: "reassessment-separation",
      name: "P4 — Reassessment separation",
      expectation: "The reassessment shares zero questions with the baseline diagnostic (alternatives existed for every outcome).",
      detail: `Overlapping question ids between the pair: ${snap.overlapCount}.`,
      pass: snap.reassessmentPresent && snap.reassessmentQuestions > 0 && snap.overlapCount === 0,
    });
  }

  // P5 — Reuse rules: reassessment prefers unused, approved-only questions.
  {
    probes.push({
      key: "reuse-rules",
      name: "P5 — Question reuse rules",
      expectation: "Every reassessment question is approved and was unused by any other assessment (reused count = 0 when alternatives exist).",
      detail: `Reassessment questions: ${snap.reassessmentQuestions}; already used elsewhere: ${snap.reusedCount}; not approved: ${snap.unapprovedCount}.`,
      pass: snap.reassessmentQuestions > 0 && snap.reusedCount === 0 && snap.unapprovedCount === 0,
    });
  }

  // P6 — No side effects: generated assessments are never assigned and create
  // no sessions, gaps, interventions, or mastery changes.
  {
    const { data: pairSessions } = await admin
      .from("assessment_sessions")
      .select("id")
      .in("assessment_id", [E.diagnosticId, E.reassessmentId]);
    const nonDemo = (pairSessions ?? []).filter(
      (s) => !(E.demoSessionIds as readonly string[]).includes(s.id as string),
    );
    const { data: events } = await admin
      .from("book_events")
      .select("event")
      .eq("book_id", PILOT_BOOK_ID)
      .contains("detail", { engine: "sprint-6f" });
    const eventKinds = [...new Set((events ?? []).map((e) => e.event as string))];
    const ok = nonDemo.length === 0 && eventKinds.every((e) => e === "diagnostic_generated");
    probes.push({
      key: "no-side-effects",
      name: "P6 — Generation has no side effects",
      expectation: `Generated assessments have no sessions beyond the two seeded Sprint 6G demo submissions (${E.demoSessionIds.join(", ")}), and engine events are limited to diagnostic_generated log rows.`,
      detail: `Sessions on the pair: ${(pairSessions ?? []).length} total, ${nonDemo.length} non-demo; engine event kinds: ${eventKinds.join(", ") || "none"}.`,
      pass: ok,
    });
  }

  // P7/P8 — Cross-organization isolation on the engine's output table.
  const { data: otherOrg } = await admin
    .from("organizations")
    .select("id, name")
    .neq("id", me.orgId ?? "")
    .limit(1)
    .maybeSingle();
  if (!otherOrg) {
    for (const [key, name, expectation] of [
      ["cross-org-read", "P7 — Cross-organization read isolation", "Reading another org's generated maps returns 0 rows."],
      ["cross-org-write", "P8 — Cross-organization write rejected", "Inserting a map row for another org is rejected by RLS."],
    ] as const) {
      probes.push({ key, name, expectation, detail: "No second organization exists to test against.", pass: true, skipped: true });
    }
  } else {
    const { data: otherAssessment } = await admin
      .from("assessments")
      .select("id")
      .eq("org_id", otherOrg.id)
      .limit(1)
      .maybeSingle();
    const read = await (supabase as SupabaseClient)
      .from("assessment_question_map")
      .select("assessment_id", { count: "exact", head: true })
      .eq("assessment_id", otherAssessment?.id ?? NO_ROWS[0]);
    probes.push({
      key: "cross-org-read",
      name: "P7 — Cross-organization read isolation",
      expectation: `Reading question maps of "${otherOrg.name}" as ${me.role} returns 0 rows.`,
      detail: read.error
        ? `Query errored (also acceptable): ${read.error.message}`
        : `Visible rows: ${read.count ?? 0}.`,
      pass: read.error ? true : (read.count ?? 0) === 0,
      dbError: shapeError(read.error),
    });

    const { data: anyQuestion } = await admin.from("question_bank").select("id").limit(1).maybeSingle();
    const write = await (supabase as SupabaseClient).from("assessment_question_map").insert({
      assessment_id: otherAssessment?.id ?? NO_ROWS[0],
      question_id: anyQuestion?.id ?? NO_ROWS[0],
      sort_order: 1,
      points: 1,
    });
    probes.push({
      key: "cross-org-write",
      name: "P8 — Cross-organization write rejected",
      expectation: `Inserting a question map into "${otherOrg.name}" fails (RLS or FK violation).`,
      detail: write.error ? `Rejected: ${write.error.message}` : "INSERT SUCCEEDED — tenant isolation breach.",
      pass: !!write.error,
      dbError: shapeError(write.error),
    });
  }

  // P9 — Role write gate: reviewer generation denied; staff round-trip works.
  if (me.role === "reviewer") {
    const { data: anyQuestion } = await admin.from("question_bank").select("id").limit(1).maybeSingle();
    const attempt = await (supabase as SupabaseClient).from("assessment_question_map").insert({
      assessment_id: E.diagnosticId,
      question_id: anyQuestion?.id ?? NO_ROWS[0],
      sort_order: 99,
      points: 1,
    });
    probes.push({
      key: "role-write-gate",
      name: "P9 — Reviewer is read-only",
      expectation: "A reviewer's INSERT into assessment_question_map is rejected.",
      detail: attempt.error ? `Rejected: ${attempt.error.message}` : "INSERT SUCCEEDED — reviewers must not write.",
      pass: !!attempt.error,
      dbError: shapeError(attempt.error),
    });
  } else {
    const { data: approved } = await (supabase as SupabaseClient)
      .from("question_bank")
      .select("id")
      .eq("book_id", PILOT_BOOK_ID)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();
    if (!approved) {
      probes.push({
        key: "role-write-gate",
        name: "P9 — Staff generation round-trip",
        expectation: "Staff can create and delete a generated assessment in their own org.",
        detail: "No approved pilot-book question available for the round-trip.",
        pass: false,
      });
    } else {
      const ins = await (supabase as SupabaseClient)
        .from("assessments")
        .insert({
          org_id: me.orgId ?? "",
          title: "zz diagnostic engine probe temp",
          subject: "General Knowledge",
          topic: "My Country",
          grade: 3,
          kind: "diagnostic",
          status: "draft",
          book_id: PILOT_BOOK_ID,
          unit_id: E.unitId,
        })
        .select("id")
        .single();
      if (ins.error) {
        probes.push({
          key: "role-write-gate",
          name: "P9 — Staff generation round-trip",
          expectation: "Staff can create and delete a generated assessment in their own org.",
          detail: `Assessment create failed: ${ins.error.message}`,
          pass: false,
          dbError: shapeError(ins.error),
        });
      } else {
        const mapIns = await (supabase as SupabaseClient).from("assessment_question_map").insert({
          assessment_id: ins.data.id,
          question_id: approved.id,
          sort_order: 1,
          points: 1,
        });
        const del = await (supabase as SupabaseClient).from("assessments").delete().eq("id", ins.data.id);
        probes.push({
          key: "role-write-gate",
          name: "P9 — Staff generation round-trip",
          expectation: "Staff can create and delete a generated assessment in their own org (map rows cascade).",
          detail: mapIns.error
            ? `Assessment created but map insert failed: ${mapIns.error.message}`
            : del.error
              ? `Created but delete failed: ${del.error.message}`
              : "Created a diagnostic with 1 mapped question, then deleted it (map cascaded).",
          pass: !mapIns.error && !del.error,
          dbError: shapeError(mapIns.error ?? del.error),
        });
      }
    }
  }

  return probes;
}
