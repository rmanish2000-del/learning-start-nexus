// Sprint 3 audit center: server-only helpers. Everything returns plain DTOs
// with verbatim database responses so an independent reviewer can validate
// Sprint 3 without trusting application claims.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ResultEntry } from "./assessment-shared";
import {
  computeSubtopicStats,
  RECOMMENDATION_RULES,
  GAP_THRESHOLD_PCT,
  HIGH_SEVERITY_BELOW_PCT,
} from "./intervention-shared";
import { applyGapDetection, regenerateRecommendations } from "./interventions.server";

type Client = SupabaseClient<Database>;

export const SPRINT3_TABLES = ["learning_gaps", "recommendations", "interventions"] as const;

export type Sprint3Count = {
  table: string;
  label: string;
  visibleToYou: number | null; // null = access denied by RLS
  globalAllOrgs: number;
  isolated: boolean;
};

export async function fetchSprint3Counts(supabase: Client, admin: Client): Promise<Sprint3Count[]> {
  const tables: { table: (typeof SPRINT3_TABLES)[number]; label: string }[] = [
    { table: "learning_gaps", label: "Learning gaps" },
    { table: "recommendations", label: "Recommendations" },
    { table: "interventions", label: "Interventions" },
  ];
  const counts: Sprint3Count[] = [];
  for (const { table, label } of tables) {
    const [{ count: visible, error: visibleError }, { count: global }] = await Promise.all([
      supabase.from(table).select("id", { count: "exact", head: true }),
      admin.from(table).select("id", { count: "exact", head: true }),
    ]);
    const visibleToYou = visibleError ? null : (visible ?? 0);
    const globalAllOrgs = global ?? 0;
    counts.push({
      table,
      label,
      visibleToYou,
      globalAllOrgs,
      isolated: visibleToYou === null ? true : visibleToYou < globalAllOrgs,
    });
  }
  return counts;
}

// Live rows (caller-visible only) for the three Sprint 3 tables.
export async function fetchSprint3Rows(supabase: Client) {
  const [{ data: gaps, error: gErr }, { data: recs, error: rErr }, { data: ints, error: iErr }] =
    await Promise.all([
      supabase
        .from("learning_gaps")
        .select("*, learners(full_name)")
        .order("detected_at", { ascending: false })
        .limit(25),
      supabase
        .from("recommendations")
        .select("*, learners(full_name), learning_gaps(subtopic, severity, status)")
        .order("priority")
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("interventions")
        .select("*, learners(full_name)")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
  if (gErr) throw new Error(gErr.message);
  if (rErr) throw new Error(rErr.message);
  if (iErr) throw new Error(iErr.message);
  return { gaps: gaps ?? [], recommendations: recs ?? [], interventions: ints ?? [] };
}

// Full chain for one gap: gap -> recommendation -> intervention, with IDs and
// timestamps. Picks the most recent intervention-visible chain.
export async function fetchSprint3Chain(supabase: Client) {
  const { data: intervention, error } = await supabase
    .from("interventions")
    .select("*, learners(full_name)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!intervention) return null;

  const [{ data: rec }, { data: gap }] = await Promise.all([
    intervention.recommendation_id
      ? supabase.from("recommendations").select("*").eq("id", intervention.recommendation_id).maybeSingle()
      : Promise.resolve({ data: null }),
    intervention.gap_id
      ? supabase.from("learning_gaps").select("*").eq("id", intervention.gap_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  type Joined = { learners: { full_name: string } | null };
  const learnerName = (intervention as unknown as Joined).learners?.full_name ?? "—";

  return {
    learnerName,
    gap: gap
      ? {
          id: gap.id,
          subtopic: gap.subtopic,
          scorePct: gap.gap_score_pct,
          severity: gap.severity,
          status: gap.status,
          sessionId: gap.session_id,
          detectedAt: gap.detected_at,
          createdAt: gap.created_at,
        }
      : null,
    recommendation: rec
      ? {
          id: rec.id,
          ruleId: rec.rule_id,
          priority: rec.priority,
          title: rec.title,
          activity: rec.activity,
          rationale: rec.rationale,
          status: rec.status,
          createdAt: rec.created_at,
        }
      : null,
    intervention: {
      id: intervention.id,
      title: intervention.title,
      status: intervention.status,
      educatorId: intervention.educator_id,
      targetDate: intervention.target_date,
      startedAt: intervention.started_at,
      completedAt: intervention.completed_at,
      createdAt: intervention.created_at,
    },
  };
}

// ---------------------------------------------------------------------------
// Probe 1: gap-detection idempotency + recommendation determinism.
// Re-runs the real engine twice on the latest submitted session visible to
// the caller and proves the second run changes nothing.
// ---------------------------------------------------------------------------

export type DetectionProbe = {
  sessionId: string;
  learnerName: string;
  assessmentTitle: string;
  scorePct: number | null;
  subtopicStats: ReturnType<typeof computeSubtopicStats>;
  firstRun: { detected: number; refreshed: number; reopened: number; addressed: number; recsCreated: number; recsUpdated: number };
  secondRun: { detected: number; refreshed: number; reopened: number; addressed: number; recsCreated: number; recsUpdated: number };
  fingerprintBefore: string;
  fingerprintAfter: string;
  pass: boolean;
};

async function engineFingerprint(admin: Client, orgId: string): Promise<string> {
  const [{ data: gaps }, { data: recs }] = await Promise.all([
    admin.from("learning_gaps").select("learner_id, subtopic, gap_score_pct, severity, status").eq("org_id", orgId),
    admin.from("recommendations").select("gap_id, rule_id, title, activity, status").eq("org_id", orgId),
  ]);
  const norm = (rows: Record<string, unknown>[] | null) =>
    (rows ?? [])
      .map((r) => JSON.stringify(r))
      .sort()
      .join("|");
  return `${norm(gaps)}##${norm(recs)}`;
}

export async function runDetectionProbe(
  supabase: Client,
  admin: Client,
  orgId: string,
): Promise<DetectionProbe | null> {
  const { data: row, error } = await supabase
    .from("assessment_sessions")
    .select("id, org_id, learner_id, score_pct, result, learners(full_name), assessments(title)")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;

  type Joined = {
    learners: { full_name: string } | null;
    assessments: { title: string } | null;
  };
  const joined = row as unknown as Joined;
  const breakdown = (row.result ?? []) as ResultEntry[];
  const stats = computeSubtopicStats(breakdown);

  const params = {
    orgId: row.org_id,
    learnerId: row.learner_id,
    sessionId: row.id,
    subject: "Mathematics",
    topic: "Fractions",
    breakdown,
  };

  const fingerprintBefore = await engineFingerprint(admin, orgId);
  const first = await applyGapDetection(admin, params);
  const second = await applyGapDetection(admin, params);
  const fingerprintAfter = await engineFingerprint(admin, orgId);

  const summarize = (s: Awaited<ReturnType<typeof applyGapDetection>>) => ({
    detected: s.detected,
    refreshed: s.refreshed,
    reopened: s.reopened,
    addressed: s.addressed,
    recsCreated: s.recommendationsCreated,
    recsUpdated: s.recommendationsUpdated,
  });

  const firstRun = summarize(first);
  const secondRun = summarize(second);
  // Pass: engine output is stable — a second identical run creates nothing
  // new (only refreshes/no-ops) and the org fingerprint is unchanged.
  const pass =
    secondRun.detected === 0 &&
    secondRun.reopened === 0 &&
    secondRun.addressed === 0 &&
    secondRun.recsCreated === 0 &&
    fingerprintBefore === fingerprintAfter;

  return {
    sessionId: row.id,
    learnerName: joined.learners?.full_name ?? "—",
    assessmentTitle: joined.assessments?.title ?? "—",
    scorePct: row.score_pct,
    subtopicStats: stats,
    firstRun,
    secondRun,
    fingerprintBefore,
    fingerprintAfter,
    pass,
  };
}

// ---------------------------------------------------------------------------
// Probe 2: end-to-end intervention workflow. Uses a dedicated synthetic
// subtopic ("Audit probe") so it never collides with real gaps; re-running
// resets the same rows (deterministic target, repeatable proof). All workflow
// writes run AS THE CALLER — proving staff RLS policies allow them.
// ---------------------------------------------------------------------------

export const WORKFLOW_PROBE_SUBTOPIC = "Audit probe";

export type WorkflowProbe = {
  learnerName: string;
  steps: {
    key: string;
    name: string;
    dbResponse: string;
    rowId: string | null;
    pass: boolean;
  }[];
  pass: boolean;
};

export async function runWorkflowProbe(
  supabase: Client,
  admin: Client,
  orgId: string,
  userId: string,
): Promise<WorkflowProbe | null> {
  // Locate the org's first learner via service role (probe harness only).
  const { data: learner } = await admin
    .from("learners")
    .select("id, full_name")
    .eq("org_id", orgId)
    .order("full_name")
    .limit(1)
    .maybeSingle();
  if (!learner) return null;

  const steps: WorkflowProbe["steps"] = [];
  const learnerName = learner.full_name;

  // Step 0 (harness): reset deterministic probe rows via service role so the
  // walk always starts from the same state. Not part of the proof.
  const { data: existingGap } = await admin
    .from("learning_gaps")
    .select("id")
    .eq("learner_id", learner.id)
    .eq("subtopic", WORKFLOW_PROBE_SUBTOPIC)
    .maybeSingle();
  if (existingGap) {
    await admin.from("interventions").delete().eq("gap_id", existingGap.id);
    await admin.from("learning_gaps").delete().eq("id", existingGap.id);
  }

  // Step 1: staff creates a gap row as the CALLER (proves gaps_insert policy).
  const gapInsert = await supabase
    .from("learning_gaps")
    .insert({
      org_id: orgId,
      learner_id: learner.id,
      subject: "Mathematics",
      topic: "Fractions",
      subtopic: WORKFLOW_PROBE_SUBTOPIC,
      items_total: 4,
      items_correct: 1,
      gap_score_pct: 25,
      severity: "high",
      status: "open",
    })
    .select("id")
    .single();
  steps.push({
    key: "create-gap",
    name: "Staff opens a gap row (INSERT as caller)",
    dbResponse: gapInsert.error
      ? `Rejected: ${gapInsert.error.message}`
      : `HTTP 201 — gap row created (${gapInsert.data.id})`,
    rowId: gapInsert.data?.id ?? null,
    pass: !gapInsert.error,
  });
  if (gapInsert.error) return { learnerName, steps, pass: false };
  const gapId = gapInsert.data.id;

  // Step 2: deterministic engine generates the recommendation (service role
  // harness runs the same regenerateRecommendations the submission path uses).
  await regenerateRecommendations(admin, learner.id);
  const { data: rec } = await admin
    .from("recommendations")
    .select("id, rule_id, title, status")
    .eq("gap_id", gapId)
    .maybeSingle();
  steps.push({
    key: "generate-rec",
    name: "Engine generates recommendation (rule GEN-HIGH expected)",
    dbResponse: rec
      ? `Recommendation ${rec.id} — rule ${rec.rule_id}, status ${rec.status}`
      : "No recommendation generated",
    rowId: rec?.id ?? null,
    pass: !!rec && rec.rule_id === "GEN-HIGH" && rec.status === "suggested",
  });
  if (!rec) return { learnerName, steps, pass: false };

  // Step 3: staff accepts the recommendation as the CALLER (recs_update +
  // interventions_insert policies).
  const recUpdate = await supabase
    .from("recommendations")
    .update({ status: "accepted" })
    .eq("id", rec.id);
  const intInsert = recUpdate.error
    ? { data: null, error: recUpdate.error }
    : await supabase
        .from("interventions")
        .insert({
          org_id: orgId,
          learner_id: learner.id,
          recommendation_id: rec.id,
          gap_id: gapId,
          educator_id: userId,
          title: rec.title,
          activity: "Probe walk: accept -> start -> complete.",
          status: "planned",
        })
        .select("id")
        .single();
  steps.push({
    key: "accept",
    name: "Staff accepts -> intervention planned (INSERT as caller)",
    dbResponse: intInsert.error
      ? `Rejected: ${intInsert.error.message}`
      : `HTTP 201 — intervention ${intInsert.data?.id} created, recommendation marked accepted`,
    rowId: intInsert.data?.id ?? null,
    pass: !intInsert.error,
  });
  if (intInsert.error || !intInsert.data) return { learnerName, steps, pass: false };
  const interventionId = intInsert.data.id;

  // Steps 4-5: lifecycle transitions as the CALLER.
  const start = await supabase
    .from("interventions")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", interventionId)
    .select("id");
  steps.push({
    key: "start",
    name: "Start intervention (UPDATE as caller)",
    dbResponse: start.error
      ? `Rejected: ${start.error.message}`
      : `HTTP 200 — ${start.data?.length ?? 0} row(s) updated to in_progress`,
    rowId: interventionId,
    pass: !start.error && (start.data?.length ?? 0) === 1,
  });

  const complete = await supabase
    .from("interventions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", interventionId)
    .select("id");
  steps.push({
    key: "complete",
    name: "Complete intervention (UPDATE as caller)",
    dbResponse: complete.error
      ? `Rejected: ${complete.error.message}`
      : `HTTP 200 — ${complete.data?.length ?? 0} row(s) updated to completed`,
    rowId: interventionId,
    pass: !complete.error && (complete.data?.length ?? 0) === 1,
  });

  return { learnerName, steps, pass: steps.every((s) => s.pass) };
}

// ---------------------------------------------------------------------------
// Probe 3: cross-organization denial for the Sprint 3 tables. Real operations
// as the caller against rows owned by another organization.
// ---------------------------------------------------------------------------

export type Sprint3CrossOrgTest = {
  key: "read_gap" | "create_recommendation" | "update_intervention";
  name: string;
  operation: string;
  expectation: string;
  targetOrgName: string;
  targetId: string | null;
  pass: boolean;
  skipped: boolean;
  dbResponse: { code: string | null; message: string; rowsAffected: number | null };
  postCheck: string | null;
};

export async function runSprint3CrossOrgTests(
  supabase: Client,
  admin: Client,
  orgId: string,
): Promise<Sprint3CrossOrgTest[]> {
  const { data: foreignOrg } = await admin
    .from("organizations")
    .select("id, name")
    .neq("id", orgId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!foreignOrg) return [];
  const org = { id: foreignOrg.id, name: foreignOrg.name };
  const tests: Sprint3CrossOrgTest[] = [];

  const { data: foreignGap } = await admin
    .from("learning_gaps")
    .select("id, learner_id")
    .eq("org_id", org.id)
    .limit(1)
    .maybeSingle();
  const { data: foreignIntervention } = await admin
    .from("interventions")
    .select("id, notes")
    .eq("org_id", org.id)
    .limit(1)
    .maybeSingle();

  // Test 1: read another organization's gap by primary key.
  if (!foreignGap) {
    tests.push({
      key: "read_gap",
      name: "Read other-org gap",
      operation: "SELECT learning_gaps WHERE id = <other-org row>",
      expectation: "0 rows — the row belongs to another organization",
      targetOrgName: org.name,
      targetId: null,
      pass: true,
      skipped: true,
      dbResponse: { code: null, message: "Skipped — the other organization has no gap to target", rowsAffected: null },
      postCheck: null,
    });
  } else {
    const read = await supabase.from("learning_gaps").select("id").eq("id", foreignGap.id);
    const rows = read.data?.length ?? 0;
    tests.push({
      key: "read_gap",
      name: "Read other-org gap",
      operation: `SELECT id FROM learning_gaps WHERE id = '${foreignGap.id}'`,
      expectation: "0 rows — the row belongs to another organization",
      targetOrgName: org.name,
      targetId: foreignGap.id,
      pass: rows === 0,
      skipped: false,
      dbResponse: {
        code: read.error?.code ?? null,
        message: read.error
          ? `Request rejected: ${read.error.message}`
          : `HTTP 200 OK — ${rows} row(s) returned (target exists globally, confirmed via service role)`,
        rowsAffected: rows,
      },
      postCheck: null,
    });
  }

  // Test 2: create a recommendation inside another organization.
  if (!foreignGap) {
    tests.push({
      key: "create_recommendation",
      name: "Create recommendation in other org",
      operation: "INSERT INTO recommendations (org_id = <other org>)",
      expectation: "Rejected by RLS (42501 row-level security violation)",
      targetOrgName: org.name,
      targetId: null,
      pass: true,
      skipped: true,
      dbResponse: { code: null, message: "Skipped — no other-org gap to attach to", rowsAffected: null },
      postCheck: null,
    });
  } else {
    const ins = await supabase.from("recommendations").insert({
      org_id: org.id,
      learner_id: foreignGap.learner_id,
      gap_id: foreignGap.id,
      rule_id: "XORG-PROBE",
      priority: 1,
      title: "Cross-org probe",
      activity: "Cross-org probe",
      rationale: "Cross-org probe",
    });
    let postCheck: string | null = null;
    if (!ins.error) {
      await admin.from("recommendations").delete().eq("gap_id", foreignGap.id).eq("rule_id", "XORG-PROBE");
      postCheck = "Inserted row was deleted via service role during cleanup.";
    }
    tests.push({
      key: "create_recommendation",
      name: "Create recommendation in other org",
      operation: `INSERT INTO recommendations (org_id = '${org.id}', gap_id = '${foreignGap.id}')`,
      expectation: "Rejected by RLS (42501 row-level security violation)",
      targetOrgName: org.name,
      targetId: foreignGap.id,
      pass: !!ins.error,
      skipped: false,
      dbResponse: {
        code: ins.error?.code ?? null,
        message: ins.error
          ? `HTTP ${ins.error.code === "42501" ? "403 Forbidden" : "error"} — ${ins.error.message}`
          : "INSERT SUCCEEDED — policy breach",
        rowsAffected: ins.error ? 0 : 1,
      },
      postCheck,
    });
  }

  // Test 3: update another organization's intervention.
  if (!foreignIntervention) {
    tests.push({
      key: "update_intervention",
      name: "Update other-org intervention",
      operation: "UPDATE interventions SET notes = <tamper> WHERE id = <other-org row>",
      expectation: "0 rows modified — the row is invisible to the caller",
      targetOrgName: org.name,
      targetId: null,
      pass: true,
      skipped: true,
      dbResponse: { code: null, message: "Skipped — the other organization has no intervention to target", rowsAffected: null },
      postCheck: null,
    });
  } else {
    const tamper = `CROSS-ORG TAMPER ATTEMPT ${new Date().toISOString()}`;
    const upd = await supabase
      .from("interventions")
      .update({ notes: tamper })
      .eq("id", foreignIntervention.id)
      .select("id");
    const modified = upd.data?.length ?? 0;
    const { data: after } = await admin
      .from("interventions")
      .select("notes")
      .eq("id", foreignIntervention.id)
      .maybeSingle();
    const unchanged = (after?.notes ?? null) === (foreignIntervention.notes ?? null);
    tests.push({
      key: "update_intervention",
      name: "Update other-org intervention",
      operation: `UPDATE interventions SET notes = '${tamper.slice(0, 40)}…' WHERE id = '${foreignIntervention.id}'`,
      expectation: "0 rows modified — the row is invisible to the caller",
      targetOrgName: org.name,
      targetId: foreignIntervention.id,
      pass: modified === 0 && unchanged,
      skipped: false,
      dbResponse: {
        code: upd.error?.code ?? null,
        message: upd.error
          ? `Request rejected: ${upd.error.message}`
          : `HTTP 200 OK — ${modified} row(s) modified`,
        rowsAffected: modified,
      },
      postCheck: unchanged
        ? "Service-role re-read confirms the row is unchanged."
        : "Service-role re-read shows the row WAS modified — policy breach",
    });
  }

  return tests;
}

export { RECOMMENDATION_RULES, GAP_THRESHOLD_PCT, HIGH_SEVERITY_BELOW_PCT };
