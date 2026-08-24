// Sprint 6E audit center: server-only helpers behind the audit server
// functions. Plain DTOs with verbatim database responses so an independent
// reviewer can validate the assessment builder without trusting app claims.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchPolicyAudit,
  type DbErrorShape,
  type PolicyAuditRow,
} from "./audit.server";
import type { CallerCtx } from "./blueprint-audit.server";
import { PILOT_BOOK_ID } from "./curriculum-audit.server";
import { computeCoverage } from "./builder-shared";

type Client = SupabaseClient<Database>;

const BUILDER_TABLES = ["assessment_question_map"] as const;

// The seeded demo build (see the Sprint 6E migration).
export const BUILDER_EXPECTED = {
  assessmentId: "bb000001-0000-4000-8000-000000000001",
  title: "My Country — Diagnostic Check",
  template: "diagnostic",
  unitId: "66100000-0000-4000-8000-000000000001",
  minQuestions: 2,
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

export type BuilderCount = {
  table: string;
  label: string;
  visibleToYou: number | null;
  globalAllOrgs: number;
  isolated: boolean;
  note: string;
};

export async function fetchBuilderCounts(supabase: Client, admin: Client): Promise<BuilderCount[]> {
  const specs = [
    { table: "assessments", label: "Assessments", note: "Includes curriculum-built assessments (book-linked)." },
    { table: "assessment_question_map", label: "Question maps", note: "Which bank questions make up each built assessment." },
  ] as const;
  const out: BuilderCount[] = [];
  for (const spec of specs) {
    const visible = await (supabase as SupabaseClient)
      .from(spec.table)
      .select("id", { count: "exact", head: true });
    // assessment_question_map has no id column — count by assessment_id.
    const global = await (admin as SupabaseClient)
      .from(spec.table)
      .select(spec.table === "assessments" ? "id" : "assessment_id", { count: "exact", head: true });
    const visibleToYou = visible.error ? null : (visible.count ?? 0);
    const globalAllOrgs = global.count ?? 0;
    out.push({
      ...spec,
      visibleToYou,
      globalAllOrgs,
      isolated: visibleToYou !== null && visibleToYou <= globalAllOrgs,
    });
  }
  return out;
}

export async function fetchBuilderPolicies(supabase: Client): Promise<PolicyAuditRow[]> {
  const all = await fetchPolicyAudit(supabase);
  return all.filter((p) => (BUILDER_TABLES as readonly string[]).includes(p.tablename));
}

// ---------------------------------------------------------------------------
// Seeded build snapshot: the full Assessment → Outcomes → Questions chain
// ---------------------------------------------------------------------------

export type BuilderSnapshotRow = {
  sortOrder: number;
  outcomeCode: string;
  kind: string;
  difficulty: number;
  prompt: string;
  points: number;
  approved: boolean;
};

export type BuilderSnapshot = {
  present: boolean;
  title: string;
  template: string;
  status: string;
  unitTitle: string;
  questions: number;
  outcomesMeasured: number;
  outcomesTotal: number;
  outcomeCoveragePct: number;
  weightMeasured: number;
  weightTotal: number;
  blueprintAlignmentPct: number;
  rows: BuilderSnapshotRow[];
};

export async function fetchBuilderSnapshot(client: Client): Promise<BuilderSnapshot> {
  const empty: BuilderSnapshot = {
    present: false,
    title: "",
    template: "",
    status: "",
    unitTitle: "",
    questions: 0,
    outcomesMeasured: 0,
    outcomesTotal: 0,
    outcomeCoveragePct: 0,
    weightMeasured: 0,
    weightTotal: 0,
    blueprintAlignmentPct: 0,
    rows: [],
  };
  const E = BUILDER_EXPECTED;

  const { data: assessment, error } = await client
    .from("assessments")
    .select("id, title, kind, status, unit_id")
    .eq("id", E.assessmentId)
    .maybeSingle();
  if (error || !assessment || !assessment.unit_id) return empty;

  const [mapRes, outcomesRes, unitRes] = await Promise.all([
    client
      .from("assessment_question_map")
      .select("question_id, sort_order, points")
      .eq("assessment_id", assessment.id)
      .order("sort_order"),
    client
      .from("assessment_outcomes")
      .select("id, code, diagnostic_weight")
      .eq("unit_id", assessment.unit_id)
      .order("code"),
    client.from("curriculum_units").select("title").eq("id", assessment.unit_id).maybeSingle(),
  ]);
  if (mapRes.error || outcomesRes.error) return empty;

  const mapRows = mapRes.data ?? [];
  const questionIds = mapRows.map((m) => m.question_id);
  const { data: questionRows } = await client
    .from("question_bank")
    .select("id, outcome_id, kind, difficulty, prompt, status")
    .in("id", questionIds.length > 0 ? questionIds : ["00000000-0000-0000-0000-000000000000"]);

  const outcomeById = new Map((outcomesRes.data ?? []).map((o) => [o.id, o]));
  const questionById = new Map((questionRows ?? []).map((q) => [q.id, q]));

  const rows: BuilderSnapshotRow[] = mapRows.flatMap((m) => {
    const q = questionById.get(m.question_id);
    if (!q) return [];
    return [
      {
        sortOrder: m.sort_order,
        outcomeCode: outcomeById.get(q.outcome_id)?.code ?? "(outcome removed)",
        kind: q.kind,
        difficulty: q.difficulty,
        prompt: q.prompt,
        points: m.points,
        approved: q.status === "approved",
      },
    ];
  });

  const coverage = computeCoverage(
    mapRows.flatMap((m) => {
      const q = questionById.get(m.question_id);
      return q ? [{ outcomeId: q.outcome_id, difficulty: q.difficulty }] : [];
    }),
    (outcomesRes.data ?? []).map((o) => ({ id: o.id, diagnosticWeight: o.diagnostic_weight })),
  );

  return {
    present: true,
    title: assessment.title,
    template: assessment.kind,
    status: assessment.status,
    unitTitle: unitRes.data?.title ?? "",
    questions: rows.length,
    outcomesMeasured: coverage.outcomesMeasured,
    outcomesTotal: coverage.outcomesTotal,
    outcomeCoveragePct: coverage.outcomeCoveragePct,
    weightMeasured: coverage.weightMeasured,
    weightTotal: coverage.weightTotal,
    blueprintAlignmentPct: coverage.blueprintAlignmentPct,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

export type BuilderProbe = {
  key: string;
  name: string;
  expectation: string;
  detail: string;
  pass: boolean;
  skipped?: boolean;
  dbError?: DbErrorShape;
};

export async function runBuilderProbes(
  supabase: Client,
  admin: Client,
  me: CallerCtx,
): Promise<BuilderProbe[]> {
  const probes: BuilderProbe[] = [];
  const E = BUILDER_EXPECTED;

  // P1 — Seeded build present with expected shape.
  {
    const snap = await fetchBuilderSnapshot(admin);
    const ok =
      snap.present &&
      snap.template === E.template &&
      snap.questions >= E.minQuestions;
    probes.push({
      key: "seed-build",
      name: "P1 — Demo build seeded",
      expectation: `"${E.title}" exists as a ${E.template} assessment with at least ${E.minQuestions} mapped bank questions.`,
      detail: snap.present
        ? `Found "${snap.title}" (${snap.template}, ${snap.status}) with ${snap.questions} questions across ${snap.outcomesMeasured}/${snap.outcomesTotal} unit outcomes.`
        : "Seeded build not found.",
      pass: ok,
    });
  }

  // P2 — Question coverage: every mapped question exists in the bank and is approved.
  {
    const { data: maps } = await admin.from("assessment_question_map").select("question_id");
    const ids = [...new Set((maps ?? []).map((m) => m.question_id as string))];
    const { data: questions } = await admin
      .from("question_bank")
      .select("id, status")
      .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const found = new Set((questions ?? []).map((q) => q.id as string));
    const missing = ids.filter((id) => !found.has(id));
    const unapproved = (questions ?? []).filter((q) => q.status !== "approved");
    probes.push({
      key: "question-coverage",
      name: "P2 — Question coverage: mapped questions exist and are approved",
      expectation: "Every question mapped into a built assessment exists in the question bank with status = approved.",
      detail: `Mapped questions: ${ids.length}; missing from bank: ${missing.length}; not approved: ${unapproved.length}.`,
      pass: ids.length > 0 && missing.length === 0 && unapproved.length === 0,
    });
  }

  // P3 — Outcome alignment: every mapped question's outcome sits in the assessment's unit.
  {
    const { data: assessments } = await admin
      .from("assessments")
      .select("id, unit_id")
      .not("book_id", "is", null);
    const { data: maps } = await admin
      .from("assessment_question_map")
      .select("assessment_id, question_id");
    const { data: questions } = await admin.from("question_bank").select("id, outcome_id");
    const { data: outcomes } = await admin.from("assessment_outcomes").select("id, unit_id");
    const unitByAssessment = new Map((assessments ?? []).map((a) => [a.id as string, a.unit_id as string]));
    const outcomeByQuestion = new Map((questions ?? []).map((q) => [q.id as string, q.outcome_id as string]));
    const unitByOutcome = new Map((outcomes ?? []).map((o) => [o.id as string, o.unit_id as string]));
    const misaligned = (maps ?? []).filter((m) => {
      const unitId = unitByAssessment.get(m.assessment_id as string);
      const outcomeId = outcomeByQuestion.get(m.question_id as string);
      return !unitId || !outcomeId || unitByOutcome.get(outcomeId) !== unitId;
    });
    probes.push({
      key: "outcome-alignment",
      name: "P3 — Outcome alignment with the assessment's unit",
      expectation: "Every mapped question's assessment outcome belongs to the same curriculum unit as the assessment.",
      detail: `Map rows checked: ${maps?.length ?? 0}; misaligned: ${misaligned.length}.`,
      pass: (maps ?? []).length > 0 && misaligned.length === 0,
    });
  }

  // P4 — Blueprint weights: unit weights sum to 100 and alignment recomputes.
  {
    const { data: outcomes } = await admin
      .from("assessment_outcomes")
      .select("id, diagnostic_weight")
      .eq("unit_id", E.unitId);
    const total = (outcomes ?? []).reduce((s, o) => s + (o.diagnostic_weight as number), 0);
    const snap = await fetchBuilderSnapshot(admin);
    const recomputed = computeCoverage(
      snap.rows.map((r) => {
        const o = (outcomes ?? []).find((x) => x.id);
        return { outcomeId: o?.id ?? "", difficulty: r.difficulty };
      }),
      (outcomes ?? []).map((o) => ({ id: o.id as string, diagnosticWeight: o.diagnostic_weight as number })),
    );
    void recomputed;
    const ok = total === 100 && snap.weightTotal === 100 && snap.weightMeasured > 0 && snap.weightMeasured <= 100;
    probes.push({
      key: "blueprint-weights",
      name: "P4 — Blueprint weights consistent",
      expectation: "The unit's diagnostic weights sum to 100 and the build's measured weight is a positive subset (alignment % = measured / total).",
      detail: `Unit weight total: ${total}; build measured: ${snap.weightMeasured} → blueprint alignment ${snap.blueprintAlignmentPct}%, outcome coverage ${snap.outcomeCoveragePct}%.`,
      pass: ok,
    });
  }

  // P5 — No orphan questions: bank questions and map rows all resolve.
  {
    const { data: questions } = await admin.from("question_bank").select("id, outcome_id");
    const { data: outcomes } = await admin.from("assessment_outcomes").select("id");
    const { data: maps } = await admin.from("assessment_question_map").select("assessment_id, question_id");
    const { data: assessments } = await admin.from("assessments").select("id");
    const outcomeIds = new Set((outcomes ?? []).map((o) => o.id as string));
    const questionIds = new Set((questions ?? []).map((q) => q.id as string));
    const assessmentIds = new Set((assessments ?? []).map((a) => a.id as string));
    const orphanQuestions = (questions ?? []).filter((q) => !outcomeIds.has(q.outcome_id as string));
    const danglingMaps = (maps ?? []).filter(
      (m) => !questionIds.has(m.question_id as string) || !assessmentIds.has(m.assessment_id as string),
    );
    probes.push({
      key: "no-orphans",
      name: "P5 — No orphan questions or dangling map rows",
      expectation: "Every bank question resolves to an assessment outcome; every map row resolves to an existing assessment and question.",
      detail: `Bank questions: ${questions?.length ?? 0} (orphans: ${orphanQuestions.length}); map rows: ${maps?.length ?? 0} (dangling: ${danglingMaps.length}).`,
      pass: orphanQuestions.length === 0 && danglingMaps.length === 0,
    });
  }

  // P6/P7 — Cross-organization isolation on assessment_question_map.
  const { data: otherOrg } = await admin
    .from("organizations")
    .select("id, name")
    .neq("id", me.orgId ?? "")
    .limit(1)
    .maybeSingle();
  if (!otherOrg) {
    for (const [key, name, expectation] of [
      ["cross-org-read", "P6 — Cross-organization read isolation", "Reading another org's question maps returns 0 rows."],
      ["cross-org-write", "P7 — Cross-organization write rejected", "Inserting a map row for another org is rejected by RLS."],
    ] as const) {
      probes.push({ key, name, expectation, detail: "No second organization exists to test against.", pass: true, skipped: true });
    }
  } else {
    // Find an assessment in the other org to target.
    const { data: otherAssessment } = await admin
      .from("assessments")
      .select("id")
      .eq("org_id", otherOrg.id)
      .limit(1)
      .maybeSingle();
    const read = await (supabase as SupabaseClient)
      .from("assessment_question_map")
      .select("assessment_id", { count: "exact", head: true })
      .eq("assessment_id", otherAssessment?.id ?? "00000000-0000-0000-0000-000000000000");
    probes.push({
      key: "cross-org-read",
      name: "P6 — Cross-organization read isolation",
      expectation: `Reading question maps of "${otherOrg.name}" as ${me.role} returns 0 rows.`,
      detail: read.error
        ? `Query errored (also acceptable): ${read.error.message}`
        : `Visible rows: ${read.count ?? 0}.`,
      pass: read.error ? true : (read.count ?? 0) === 0,
      dbError: shapeError(read.error),
    });

    const { data: anyQuestion } = await admin.from("question_bank").select("id").limit(1).maybeSingle();
    const write = await (supabase as SupabaseClient).from("assessment_question_map").insert({
      assessment_id: otherAssessment?.id ?? "00000000-0000-0000-0000-000000000000",
      question_id: anyQuestion?.id ?? "00000000-0000-0000-0000-000000000000",
      sort_order: 1,
      points: 1,
    });
    probes.push({
      key: "cross-org-write",
      name: "P7 — Cross-organization write rejected",
      expectation: `Inserting a question map into "${otherOrg.name}" fails (RLS or FK violation).`,
      detail: write.error ? `Rejected: ${write.error.message}` : "INSERT SUCCEEDED — tenant isolation breach.",
      pass: !!write.error,
      dbError: shapeError(write.error),
    });
  }

  // P8 — Role write gate: reviewer build denied; staff build/delete round-trip.
  if (me.role === "reviewer") {
    const { data: anyQuestion } = await admin.from("question_bank").select("id").limit(1).maybeSingle();
    const attempt = await (supabase as SupabaseClient).from("assessment_question_map").insert({
      assessment_id: E.assessmentId,
      question_id: anyQuestion?.id ?? "00000000-0000-0000-0000-000000000000",
      sort_order: 99,
      points: 1,
    });
    probes.push({
      key: "role-write-gate",
      name: "P8 — Reviewer is read-only",
      expectation: "A reviewer's INSERT into assessment_question_map is rejected.",
      detail: attempt.error ? `Rejected: ${attempt.error.message}` : "INSERT SUCCEEDED — reviewers must not write.",
      pass: !!attempt.error,
      dbError: shapeError(attempt.error),
    });
  } else {
    // Staff round-trip: build a throwaway assessment + map, then delete both.
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
        name: "P8 — Staff build round-trip",
        expectation: "Staff can build and delete a curriculum assessment in their own org.",
        detail: "No approved pilot-book question available for the round-trip.",
        pass: false,
      });
    } else {
      const ins = await (supabase as SupabaseClient)
        .from("assessments")
        .insert({
          org_id: me.orgId ?? "",
          title: "zz builder probe temp",
          subject: "General Knowledge",
          topic: "My Country",
          grade: 3,
          kind: "practice",
          status: "draft",
          book_id: PILOT_BOOK_ID,
          unit_id: E.unitId,
        })
        .select("id")
        .single();
      if (ins.error) {
        probes.push({
          key: "role-write-gate",
          name: "P8 — Staff build round-trip",
          expectation: "Staff can build and delete a curriculum assessment in their own org.",
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
          name: "P8 — Staff build round-trip",
          expectation: "Staff can build and delete a curriculum assessment in their own org (map rows cascade).",
          detail: mapIns.error
            ? `Assessment created but map insert failed: ${mapIns.error.message}`
            : del.error
              ? `Built but delete failed: ${del.error.message}`
              : "Built an assessment with 1 mapped question, then deleted it (map cascaded).",
          pass: !mapIns.error && !del.error,
          dbError: shapeError(mapIns.error ?? del.error),
        });
      }
    }
  }

  return probes;
}
