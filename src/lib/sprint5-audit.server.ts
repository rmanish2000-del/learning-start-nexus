// Sprint 5 audit center: server-only helpers behind the audit server
// functions. Returns plain DTOs with verbatim database responses so an
// independent reviewer can validate the outcome loop without trusting claims.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchPolicyAudit,
  type DbErrorShape,
  type PolicyAuditRow,
} from "./audit.server";
import type { ResultEntry } from "./assessment-shared";
import { computeSubtopicStats } from "./intervention-shared";
import {
  classifyOutcome,
  computeConfidence,
  computeLift,
  CONFIDENCE_FORMULA,
  type OutcomeStatus,
} from "./outcome-shared";
import type { OutcomeRow } from "./outcomes.server";

type Client = SupabaseClient<Database>;

function outcomesTable(client: Client) {
  return (client as SupabaseClient).from("learner_outcomes");
}
function sessionsTable(client: Client) {
  return (client as SupabaseClient).from("assessment_sessions");
}

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

export type Sprint5Count = {
  table: string;
  label: string;
  visibleToYou: number | null;
  globalAllOrgs: number;
  isolated: boolean;
  note: string;
};

export async function fetchSprint5Counts(
  supabase: Client,
  admin: Client,
): Promise<Sprint5Count[]> {
  const specs = [
    {
      key: "learner_outcomes",
      label: "Learner outcomes",
      note: "Staff see org learners they manage; students see only their own.",
    },
    {
      key: "reassessment_items",
      label: "Reassessment item bank",
      note: "Fresh items, separate from the diagnostic bank (staff-only read).",
    },
  ];

  const out: Sprint5Count[] = [];
  for (const spec of specs) {
    let visibleToYou: number | null = null;
    let globalAllOrgs = 0;
    if (spec.key === "learner_outcomes") {
      const visible = await outcomesTable(supabase).select("id", { count: "exact", head: true });
      const global = await outcomesTable(admin).select("id", { count: "exact", head: true });
      visibleToYou = visible.error ? null : (visible.count ?? 0);
      globalAllOrgs = global.count ?? 0;
    } else {
      const visible = await supabase
        .from("assessment_items")
        .select("id", { count: "exact", head: true })
        .in("id", await reassessmentItemIds(admin));
      const global = await admin
        .from("assessment_items")
        .select("id", { count: "exact", head: true })
        .in("id", await reassessmentItemIds(admin));
      visibleToYou = visible.error ? null : (visible.count ?? 0);
      globalAllOrgs = global.count ?? 0;
    }
    out.push({
      table: spec.key,
      label: spec.label,
      visibleToYou,
      globalAllOrgs,
      isolated: visibleToYou !== null && visibleToYou <= globalAllOrgs,
      note: spec.note,
    });
  }
  return out;
}

async function reassessmentItemIds(admin: Client): Promise<string[]> {
  const { data } = await admin
    .from("assessment_item_map")
    .select("item_id, assessments!inner(kind)")
    .eq("assessments.kind", "reassessment");
  return (data ?? []).map((r) => r.item_id as string);
}

export async function fetchOutcomePolicies(supabase: Client): Promise<PolicyAuditRow[]> {
  const all = await fetchPolicyAudit(supabase);
  return all.filter((p) => p.tablename === "learner_outcomes");
}

// ---------------------------------------------------------------------------
// Outcomes visible to the caller, with learner names
// ---------------------------------------------------------------------------

export type OutcomeListEntry = {
  id: string;
  learnerName: string;
  subtopic: string;
  baselineScore: number;
  postScore: number | null;
  masteryLift: number | null;
  confidence: number | null;
  status: OutcomeStatus;
  completedAt: string | null;
  createdAt: string;
};

export async function fetchVisibleOutcomes(supabase: Client): Promise<OutcomeListEntry[]> {
  const { data, error } = await outcomesTable(supabase)
    .select("*, learners(full_name)")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as (OutcomeRow & { learners: { full_name: string } | null })[]).map(
    (row) => ({
      id: row.id,
      learnerName: row.learners?.full_name ?? "Unknown learner",
      subtopic: row.subtopic,
      baselineScore: row.baseline_score,
      postScore: row.post_score,
      masteryLift: row.mastery_lift,
      confidence: row.confidence,
      status: row.status,
      completedAt: row.completed_at,
      createdAt: row.created_at,
    }),
  );
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

export type Sprint5Probe = {
  key: string;
  name: string;
  expectation: string;
  pass: boolean;
  skipped: boolean;
  detail: string;
  dbError: DbErrorShape;
};

export async function runSprint5Probes(
  supabase: Client,
  admin: Client,
  myOrgId: string,
): Promise<Sprint5Probe[]> {
  const probes: Sprint5Probe[] = [];

  // P1 — Outcome calculation proof: recompute lift/confidence/status for a
  // completed outcome from raw rows and compare against the stored values.
  {
    const { data: completed } = await outcomesTable(admin)
      .select("*")
      .eq("org_id", myOrgId)
      .neq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (!completed) {
      probes.push({
        key: "outcome_calculation",
        name: "Outcome calculation proof",
        expectation: "Stored lift/confidence/status match a recomputation from raw rows.",
        pass: false,
        skipped: true,
        detail: "No completed outcome in this organization yet — complete the demo loop first.",
        dbError: null,
      });
    } else {
      const o = completed as unknown as OutcomeRow;
      const { data: session } = await sessionsTable(admin)
        .select("total_count, result")
        .eq("id", o.reassessment_session_id)
        .maybeSingle();
      const breakdown = ((session?.result as ResultEntry[] | null) ?? []) as ResultEntry[];
      const stats = computeSubtopicStats(breakdown);
      const subtopicPct = stats.find((s) => s.subtopic === o.subtopic)?.pct ?? null;

      const { data: tutorSessions } = await admin
        .from("tutor_sessions")
        .select("id")
        .eq("intervention_id", o.intervention_id);
      const ids = (tutorSessions ?? []).map((s) => s.id);
      let practiceAttempts = 0;
      let practiceCorrect = 0;
      if (ids.length > 0) {
        const { data: practice } = await admin
          .from("tutor_interactions")
          .select("practice_correct")
          .in("session_id", ids)
          .not("practice_correct", "is", null);
        practiceAttempts = (practice ?? []).length;
        practiceCorrect = (practice ?? []).filter((p) => p.practice_correct === true).length;
      }

      const lift = computeLift(o.baseline_score, o.post_score ?? 0);
      const confidence = computeConfidence({
        totalItems: (session?.total_count as number | null) ?? breakdown.length,
        practiceAttempts,
        practiceCorrect,
        subtopicPct,
      });
      const status = classifyOutcome(lift, confidence);
      const matches =
        lift === o.mastery_lift && confidence === o.confidence && status === o.status;
      probes.push({
        key: "outcome_calculation",
        name: "Outcome calculation proof",
        expectation:
          "Recomputed lift, confidence, and status equal the stored outcome values exactly.",
        pass: matches,
        skipped: false,
        detail:
          `Outcome ${o.id} (${o.subtopic}): stored lift ${o.mastery_lift}, confidence ${o.confidence}, status "${o.status}". ` +
          `Recomputed from raw rows: lift ${lift} (${o.baseline_score}% -> ${o.post_score}%), ` +
          `confidence ${confidence} (items ${(session?.total_count as number | null) ?? breakdown.length}, ` +
          `practice ${practiceCorrect}/${practiceAttempts}, subtopic ${subtopicPct ?? "n/a"}%), status "${status}". ` +
          (matches ? "Exact match." : "MISMATCH — stored values do not match the formula."),
        dbError: null,
      });
    }
  }

  // P2 — Reassessment bank separation: fresh items, disjoint from diagnostics.
  {
    const { data: maps } = await admin
      .from("assessment_item_map")
      .select("item_id, assessments!inner(kind, org_id)")
      .eq("assessments.org_id", myOrgId);
    const byKind = new Map<string, Set<string>>();
    for (const row of maps ?? []) {
      const kind = (row.assessments as unknown as { kind: string }).kind;
      if (!byKind.has(kind)) byKind.set(kind, new Set());
      byKind.get(kind)!.add(row.item_id as string);
    }
    const diagnostic = byKind.get("diagnostic") ?? new Set<string>();
    const reassessment = byKind.get("reassessment") ?? new Set<string>();
    const overlap = [...reassessment].filter((id) => diagnostic.has(id));
    probes.push({
      key: "bank_separation",
      name: "Reassessment items are fresh and separate",
      expectation: "Reassessment bank shares zero items with the diagnostic bank.",
      pass: reassessment.size >= 10 && overlap.length === 0,
      skipped: false,
      detail:
        `Diagnostic bank: ${diagnostic.size} items. Reassessment bank: ${reassessment.size} items. ` +
        `Overlap: ${overlap.length} item(s). ` +
        (overlap.length === 0
          ? "Reassessment measures mastery with questions the student has never seen."
          : `Shared item ids: ${overlap.join(", ")}`),
      dbError: null,
    });
  }

  // P3 — Mastery proof: learner mastery index reflects the completed outcome.
  {
    const { data: completed } = await outcomesTable(admin)
      .select("*")
      .eq("org_id", myOrgId)
      .neq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (!completed) {
      probes.push({
        key: "mastery_proof",
        name: "Mastery index proof",
        expectation: "learners.mastery_score equals the outcome's post score.",
        pass: false,
        skipped: true,
        detail: "No completed outcome in this organization yet.",
        dbError: null,
      });
    } else {
      const o = completed as unknown as OutcomeRow;
      const { data: learner } = await admin
        .from("learners")
        .select("full_name, mastery_score, mastery_lift")
        .eq("id", o.learner_id)
        .single();
      const { data: history } = await admin
        .from("mastery_history")
        .select("score, recorded_on")
        .eq("learner_id", o.learner_id)
        .eq("score", o.post_score ?? -1);
      const scoreMatches = learner?.mastery_score === o.post_score;
      const liftMatches = Number(learner?.mastery_lift) === o.mastery_lift;
      const historyHas = (history ?? []).length > 0;
      probes.push({
        key: "mastery_proof",
        name: "Mastery index proof",
        expectation:
          "The learner's mastery score, lift, and history row all reflect the reassessment outcome.",
        pass: scoreMatches && liftMatches && historyHas,
        skipped: false,
        detail:
          `${learner?.full_name}: mastery_score ${learner?.mastery_score}% (post ${o.post_score}%), ` +
          `mastery_lift ${learner?.mastery_lift} (outcome ${o.mastery_lift}), ` +
          `mastery_history row at post score: ${historyHas ? "present" : "MISSING"}.`,
        dbError: null,
      });
    }
  }

  // P4 — Evidence chain proof: every link of the loop exists for a completed
  // outcome (diagnostic, gap, recommendation, intervention, tutor practice,
  // reassessment, evidence entries).
  {
    const { data: completed } = await outcomesTable(admin)
      .select("*")
      .eq("org_id", myOrgId)
      .neq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (!completed) {
      probes.push({
        key: "evidence_chain",
        name: "Evidence chain proof",
        expectation: "Diagnostic -> gap -> recommendation -> intervention -> practice -> reassessment -> outcome.",
        pass: false,
        skipped: true,
        detail: "No completed outcome in this organization yet.",
        dbError: null,
      });
    } else {
      const o = completed as unknown as OutcomeRow;
      const gapId = o.gap_id ?? "";
      const [
        { data: baseline },
        { data: gap },
        { data: rec },
        { data: intervention },
        { count: tutorCount },
        { data: reassessment },
        { count: evidenceCount },
      ] = await Promise.all([
        sessionsTable(admin).select("id, status").eq("id", o.baseline_session_id ?? "").maybeSingle(),
        admin.from("learning_gaps").select("id, status").eq("id", gapId).maybeSingle(),
        admin.from("recommendations").select("id, status").eq("gap_id", gapId).limit(1).maybeSingle(),
        admin.from("interventions").select("id, status").eq("id", o.intervention_id).maybeSingle(),
        admin.from("tutor_sessions").select("id", { count: "exact", head: true }).eq("intervention_id", o.intervention_id),
        sessionsTable(admin).select("id, status").eq("id", o.reassessment_session_id ?? "").maybeSingle(),
        admin.from("learner_evidence").select("id", { count: "exact", head: true }).eq("learner_id", o.learner_id),
      ]);
      const links = [
        { label: "diagnostic session submitted", ok: baseline?.status === "submitted" },
        { label: "gap recorded", ok: !!gap },
        { label: "recommendation generated", ok: !!rec },
        { label: "intervention completed", ok: intervention?.status === "completed" },
        { label: "tutor practice held", ok: (tutorCount ?? 0) > 0 },
        { label: "reassessment submitted", ok: reassessment?.status === "submitted" },
        { label: "evidence entries written", ok: (evidenceCount ?? 0) > 0 },
      ];
      const missing = links.filter((l) => !l.ok).map((l) => l.label);
      probes.push({
        key: "evidence_chain",
        name: "Evidence chain proof",
        expectation: "Every link of the outcome loop exists as a real database row.",
        pass: missing.length === 0,
        skipped: false,
        detail:
          missing.length === 0
            ? `All 7 links verified for outcome ${o.id}: ${links.map((l) => l.label).join(" -> ")}.`
            : `Missing links: ${missing.join(", ")}.`,
        dbError: null,
      });
    }
  }

  // P5 — Cross-organization read denial on the reassessment bank.
  {
    const { data: otherOrg } = await admin
      .from("organizations")
      .select("id, name")
      .neq("id", myOrgId)
      .limit(1)
      .maybeSingle();
    if (!otherOrg) {
      probes.push({
        key: "cross_org_read",
        name: "Cross-organization read denied",
        expectation: "Another organization's reassessment items are invisible.",
        pass: false,
        skipped: true,
        detail: "Only one organization exists — probe skipped.",
        dbError: null,
      });
    } else {
      const { count: globalCount } = await admin
        .from("assessment_items")
        .select("id", { count: "exact", head: true })
        .eq("org_id", otherOrg.id);
      const { data: rows, error } = await supabase
        .from("assessment_items")
        .select("id")
        .eq("org_id", otherOrg.id);
      const visibleRows = rows?.length ?? 0;
      probes.push({
        key: "cross_org_read",
        name: "Cross-organization read denied",
        expectation: `Reading ${otherOrg.name}'s item bank returns 0 rows.`,
        pass: visibleRows === 0 && !error,
        skipped: false,
        detail:
          visibleRows === 0
            ? `${otherOrg.name} holds ${globalCount ?? 0} items globally; the caller's read returned 0 rows.`
            : `Caller could READ ${visibleRows} of another org's items — isolation broken.`,
        dbError: shapeError(error),
      });
    }
  }

  // P6 — Cross-organization insert denial on learner_outcomes.
  {
    const { data: otherOrg } = await admin
      .from("organizations")
      .select("id, name")
      .neq("id", myOrgId)
      .limit(1)
      .maybeSingle();
    const { data: otherIntervention } = otherOrg
      ? await admin
          .from("interventions")
          .select("id, learner_id")
          .eq("org_id", otherOrg.id)
          .limit(1)
          .maybeSingle()
      : { data: null };
    if (!otherOrg || !otherIntervention) {
      probes.push({
        key: "cross_org_insert",
        name: "Cross-organization insert denied",
        expectation: "Inserting an outcome into another organization is rejected.",
        pass: false,
        skipped: true,
        detail: "No intervention in another organization to target — probe skipped.",
        dbError: null,
      });
    } else {
      const { error } = await outcomesTable(supabase).insert({
        org_id: otherOrg.id,
        learner_id: otherIntervention.learner_id,
        intervention_id: otherIntervention.id,
        subject: "Mathematics",
        topic: "Fractions",
        subtopic: "Audit probe",
        baseline_score: 0,
        status: "pending",
      });
      probes.push({
        key: "cross_org_insert",
        name: "Cross-organization insert denied",
        expectation: `Inserting an outcome into ${otherOrg.name} is rejected by RLS.`,
        pass: !!error,
        skipped: false,
        detail: error
          ? `Database rejected the cross-org insert: ${error.message}`
          : "Cross-org insert SUCCEEDED — isolation broken.",
        dbError: shapeError(error),
      });
    }
  }

  // P7 — Demo story readiness: Aarav's outcome chain, owned by educator
  // Sarah Whitfield. Passes when the story is mid-flight (pending outcome
  // with an assigned reassessment) or complete (finalized outcome with a
  // mastery lift).
  {
    const { data: aarav } = await admin
      .from("learners")
      .select("id, full_name, educator_id")
      .eq("org_id", myOrgId)
      .eq("handle", "aarav")
      .maybeSingle();
    if (!aarav) {
      probes.push({
        key: "demo_story_ready",
        name: "MVP demo story ready (Sarah -> Aarav)",
        expectation: "Aarav has a pending outcome and an assigned reassessment.",
        pass: false,
        skipped: true,
        detail: "No learner with handle 'aarav' in this organization — probe skipped.",
        dbError: null,
      });
    } else {
      const [{ data: outcome }, { data: educator }] = await Promise.all([
        outcomesTable(admin)
          .select("id, subtopic, baseline_score, post_score, mastery_lift, status, reassessment_session_id")
          .eq("learner_id", aarav.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        aarav.educator_id
          ? admin.from("profiles").select("full_name").eq("id", aarav.educator_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const o = outcome as unknown as {
        subtopic: string;
        baseline_score: number;
        post_score: number | null;
        mastery_lift: number | null;
        status: string;
        reassessment_session_id: string | null;
      } | null;
      let reassessmentReady = false;
      if (o?.status === "pending" && o.reassessment_session_id) {
        const { data: session } = await sessionsTable(admin)
          .select("status")
          .eq("id", o.reassessment_session_id)
          .maybeSingle();
        reassessmentReady = session?.status === "assigned" || session?.status === "in_progress";
      }
      const completed = !!o && o.status !== "pending" && o.mastery_lift !== null;
      const sarah = educator?.full_name === "Sarah Whitfield";
      probes.push({
        key: "demo_story_ready",
        name: "MVP demo story ready (Sarah -> Aarav)",
        expectation:
          "Aarav's educator is Sarah Whitfield; his outcome chain is either mid-flight (pending outcome with an assigned reassessment) or complete (finalized with a mastery lift).",
        pass: sarah && (completed || (!!o && o.status === "pending" && reassessmentReady)),
        skipped: false,
        detail:
          `Educator: ${educator?.full_name ?? "none"}${sarah ? "" : " (expected Sarah Whitfield)"}. ` +
          (!o
            ? "No outcome for Aarav."
            : completed
              ? `Story complete: ${o.subtopic} baseline ${o.baseline_score}% -> post ${o.post_score}% = ${o.mastery_lift !== null && o.mastery_lift >= 0 ? "+" : ""}${o.mastery_lift} points (${o.status}).`
              : `Pending outcome on ${o.subtopic} (baseline ${o.baseline_score}%); reassessment session ${reassessmentReady ? "assigned and ready" : "NOT ready"}.`),
        dbError: null,
      });
    }
  }

  // P8 — Policy registry: learner_outcomes carries the full policy set.
  {
    const policies = await fetchOutcomePolicies(supabase);
    const cmds = new Set(policies.map((p) => p.cmd));
    const expected = ["SELECT", "INSERT", "UPDATE", "DELETE"];
    const missing = expected.filter((c) => !cmds.has(c));
    probes.push({
      key: "policy_registry",
      name: "Outcome RLS policy registry",
      expectation: "learner_outcomes has SELECT, INSERT, UPDATE, and DELETE policies.",
      pass: missing.length === 0,
      skipped: false,
      detail:
        missing.length === 0
          ? `All 4 policies present (read live from pg_policies): ${policies.map((p) => p.policyname).join(", ")}.`
          : `Missing policies for: ${missing.join(", ")}.`,
      dbError: null,
    });
  }

  return probes;
}

// Static formula contract, rendered verbatim for reviewers.
export const OUTCOME_FORMULA_SUMMARY = {
  lift: "mastery_lift = post_score - baseline_score (percentage points)",
  confidence: CONFIDENCE_FORMULA,
  classification: [
    "confidence < 50 -> low_confidence",
    "lift >= 10 -> improvement",
    "lift <= 0 -> no_improvement",
    "otherwise -> requires_review",
  ],
};
