// Sprint 6G audit center: server-only helpers returning plain DTOs and probe
// results with verbatim database responses so an independent reviewer can
// verify outcome scoring, mastery mapping, intervention lookup, curriculum
// traceability, determinism, and organization isolation.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchPolicyAudit,
  getCallerIdentity,
  type CallerIdentity,
  type DbErrorShape,
  type PolicyAuditRow,
} from "./audit.server";
import {
  bandForScore,
  buildOutcomeAnalyses,
  scoreQuestions,
  type GapCategory,
  type RiskLevel,
} from "./gap-shared";
import { assembleAnalysisInput, type AssembledSession } from "./gap.server";

type Client = SupabaseClient<Database>;

export const GAP_AUDIT_TABLES = [
  "assessment_sessions",
  "assessment_question_map",
  "question_bank",
  "intervention_map",
  "mastery_levels",
] as const;

const ORG_A = { orgId: "11111111-1111-4111-8111-111111111111", name: "Northstar Learning Hub" };
const ORG_B = { orgId: "22222222-2222-4222-8222-222222222222", name: "Other Org (isolation demo)" };

export const GAP_EXPECTED = {
  diagnosticId: "cc000001-0000-4000-8000-000000000001",
  diagnosticTitle: "My Country — Unit Diagnostic (Auto)",
  bookId: "66000000-0000-4000-8000-000000000003",
  sessions: [
    {
      id: "dd000001-0000-4000-8000-000000000001",
      learnerName: "Aarav Sharma",
      totalCount: 9,
      correctCount: 6,
      scorePct: 67,
      // code -> [pct, band label, category, risk]
      outcomes: {
        LO_GK3_NAT_01: { pct: 100, band: "Advanced", category: "strong", risk: "low" },
        LO_GK3_NAT_02: { pct: 67, band: "Developing", category: "medium", risk: "medium" },
        LO_GK3_NAT_03: { pct: 33, band: "Beginning", category: "weak", risk: "high" },
      } as Record<string, { pct: number; band: string; category: GapCategory; risk: RiskLevel }>,
    },
    {
      id: "dd000002-0000-4000-8000-000000000002",
      learnerName: "Diya Patel",
      totalCount: 9,
      correctCount: 4,
      scorePct: 44,
      outcomes: {
        LO_GK3_NAT_01: { pct: 67, band: "Developing", category: "medium", risk: "low" },
        LO_GK3_NAT_02: { pct: 33, band: "Beginning", category: "weak", risk: "high" },
        LO_GK3_NAT_03: { pct: 33, band: "Beginning", category: "weak", risk: "high" },
      } as Record<string, { pct: number; band: string; category: GapCategory; risk: RiskLevel }>,
    },
  ],
} as const;

// ---------------------------------------------------------------------------
// Isolation counts
// ---------------------------------------------------------------------------

export type GapCount = {
  table: string;
  label: string;
  visibleToYou: number | null;
  globalAllOrgs: number;
  isolated: boolean;
  note: string;
};

async function isoCount(
  supabase: Client,
  table: (typeof GAP_AUDIT_TABLES)[number],
  label: string,
  callerOrgId: string | null,
  note: string,
): Promise<GapCount> {
  const { count: visible, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count: globalCount } = await supabaseAdmin
    .from(table)
    .select("*", { count: "exact", head: true });
  // The expectation is derived live from the service-role view of the caller's
  // own organization — never a hardcoded count, so seeding, generation and
  // cleanup runs cannot make the probe drift out of date.
  let orgCount: number | null = null;
  if (callerOrgId) {
    if (table === "assessment_question_map") {
      const { data: orgAssessments } = await supabaseAdmin
        .from("assessments")
        .select("id")
        .eq("org_id", callerOrgId);
      const ids = (orgAssessments ?? []).map((a) => a.id);
      if (ids.length) {
        const { count } = await supabaseAdmin
          .from("assessment_question_map")
          .select("assessment_id", { count: "exact", head: true })
          .in("assessment_id", ids);
        orgCount = count ?? 0;
      } else {
        orgCount = 0;
      }
    } else {
      const { count } = await (
        supabaseAdmin.from(table) as unknown as {
          select: (c: string, o: { count: "exact"; head: boolean }) => {
            eq: (col: string, val: string) => PromiseLike<{ count: number | null }>;
          };
        }
      )
        .select("*", { count: "exact", head: true })
        .eq("org_id", callerOrgId);
      orgCount = count ?? 0;
    }
  }
  const visibleToYou = error ? null : (visible ?? 0);
  const globalAllOrgs = globalCount ?? 0;
  return {
    table,
    label,
    visibleToYou,
    globalAllOrgs,
    // RLS is proven when the caller sees exactly their own organization's rows
    // and nothing beyond them.
    isolated:
      visibleToYou !== null &&
      globalAllOrgs >= visibleToYou &&
      (orgCount === null ? visibleToYou === 0 && globalAllOrgs > 0 : visibleToYou === orgCount),
    note,
  };
}

// ---------------------------------------------------------------------------
// Audit snapshot: both demo sessions recomputed live, per outcome
// ---------------------------------------------------------------------------

export type GapSnapshotRow = {
  code: string;
  title: string;
  weight: number;
  questions: string; // "2/3"
  pct: number | null;
  bandLabel: string | null;
  gapCategory: GapCategory;
  riskLevel: RiskLevel;
  interventions: number;
  traceComplete: boolean;
};

export type GapSnapshotSession = {
  id: string;
  present: boolean;
  learnerName: string;
  submittedAt: string | null;
  storedScorePct: number | null;
  recomputedScorePct: number;
  recomputedCorrect: number;
  recomputedTotal: number;
  rows: GapSnapshotRow[];
};

export type GapAuditPayload = {
  me: CallerIdentity;
  counts: GapCount[];
  policies: PolicyAuditRow[];
  snapshot: { sessions: GapSnapshotSession[] };
};

async function snapshotSession(
  supabase: Client,
  expected: (typeof GAP_EXPECTED.sessions)[number],
): Promise<GapSnapshotSession> {
  try {
    const a = await assembleAnalysisInput(supabase, expected.id);
    const { rows } = buildOutcomeAnalyses(a.input);
    const totals = scoreQuestions(a.input.questions, a.input.answers);
    return {
      id: expected.id,
      present: true,
      learnerName: a.learner?.fullName ?? expected.learnerName,
      submittedAt: a.session.submittedAt,
      storedScorePct: a.session.scorePct,
      recomputedScorePct: totals.scorePct,
      recomputedCorrect: totals.correct,
      recomputedTotal: totals.total,
      rows: rows.map((r) => ({
        code: r.code,
        title: r.title,
        weight: r.weight,
        questions: `${r.questionsCorrect}/${r.questionsTotal}`,
        pct: r.pct,
        bandLabel: r.bandLabel,
        gapCategory: r.gapCategory,
        riskLevel: r.riskLevel,
        interventions: r.interventions.length,
        traceComplete:
          r.traces.length > 0 &&
          r.traces.every(
            (t) =>
              t.learningOutcomeText.length > 0 &&
              t.topicTitle !== "—" &&
              t.chapterTitle !== "—" &&
              t.unitTitle !== "—",
          ),
      })),
    };
  } catch {
    return {
      id: expected.id,
      present: false,
      learnerName: expected.learnerName,
      submittedAt: null,
      storedScorePct: null,
      recomputedScorePct: 0,
      recomputedCorrect: 0,
      recomputedTotal: 0,
      rows: [],
    };
  }
}

export async function getGapAudit(supabase: Client, userId: string): Promise<GapAuditPayload> {
  const me = await getCallerIdentity(supabase, userId);
  const pilotOrg = me.orgName === ORG_A.name;

  const counts = await Promise.all([
    isoCount(supabase, "assessment_sessions", "Assessment sessions", me.orgId, "Sprint 2 demo sessions + the two Sprint 6G submissions"),
    isoCount(supabase, "assessment_question_map", "Assessment question map", me.orgId, "Builder demo + 6F generated pair"),
    isoCount(supabase, "question_bank", "Question bank", me.orgId, "Seeded + AI-generated drafts for the pilot book"),
    isoCount(supabase, "intervention_map", "Intervention map", me.orgId, "Failure patterns per blueprint outcome"),
    isoCount(supabase, "mastery_levels", "Mastery levels", me.orgId, "Beginning / Developing / Proficient / Advanced"),
  ]);

  const policies = (await fetchPolicyAudit(supabase)).filter((p) =>
    [...GAP_AUDIT_TABLES, "assessments"].includes(p.tablename),
  );

  const sessions: GapSnapshotSession[] = [];
  for (const expected of GAP_EXPECTED.sessions) {
    sessions.push(await snapshotSession(supabase, expected));
  }

  return { me, counts, policies, snapshot: { sessions } };
}

// ---------------------------------------------------------------------------
// Probe suite
// ---------------------------------------------------------------------------

export type GapProbe = {
  key: string;
  name: string;
  pass: boolean;
  skipped?: boolean;
  expectation: string;
  detail: string;
  dbError?: DbErrorShape;
};

export async function runGapProbes(
  supabase: Client,
  me: CallerIdentity,
): Promise<{ generatedAt: string; me: CallerIdentity; probes: GapProbe[] }> {
  const generatedAt = new Date().toISOString();
  const probes: GapProbe[] = [];
  const otherOrg = me.orgId === ORG_B.orgId ? ORG_A.orgId : ORG_B.orgId;

  // Assemble both demo sessions through the same code path the dashboard uses.
  const assembled: {
    expected: (typeof GAP_EXPECTED.sessions)[number];
    a: AssembledSession | null;
    error: string | null;
  }[] = [];
  for (const expected of GAP_EXPECTED.sessions) {
    try {
      assembled.push({ expected, a: await assembleAnalysisInput(supabase, expected.id), error: null });
    } catch (err) {
      assembled.push({
        expected,
        a: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // P1: both seeded submissions are present with the expected stored totals.
  const p1Fails = assembled
    .filter(
      ({ expected, a }) =>
        !a ||
        a.session.status !== "submitted" ||
        a.session.scorePct !== expected.scorePct ||
        a.session.correctCount !== expected.correctCount ||
        a.session.totalCount !== expected.totalCount,
    )
    .map(({ expected, error }) => `${expected.learnerName}${error ? ` (${error})` : ""}`);
  probes.push({
    key: "seeded_sessions",
    name: "P1 — Seeded diagnostic submissions exist with stored scores",
    pass: p1Fails.length === 0,
    expectation: `Two submitted sessions on "${GAP_EXPECTED.diagnosticTitle}": Aarav 6/9 (67%), Diya 4/9 (44%).`,
    detail:
      p1Fails.length === 0
        ? `Both sessions visible with matching stored totals: ${assembled
            .map(({ a }) => `${a?.session.scorePct}% (${a?.session.correctCount}/${a?.session.totalCount})`)
            .join(" · ")}.`
        : `Missing or mismatched: ${p1Fails.join(", ")}.`,
  });

  // P2: outcome-level scoring recomputed from answers + bank matches expected.
  const p2Details: string[] = [];
  let p2Pass = true;
  for (const { expected, a } of assembled) {
    if (!a) {
      p2Pass = false;
      continue;
    }
    const { rows } = buildOutcomeAnalyses(a.input);
    const totals = scoreQuestions(a.input.questions, a.input.answers);
    const perOutcome = new Map(rows.map((r) => [r.code, r.pct]));
    for (const [code, exp] of Object.entries(expected.outcomes)) {
      const actual = perOutcome.get(code) ?? null;
      if (actual !== exp.pct) p2Pass = false;
      p2Details.push(`${expected.learnerName.split(" ")[0]} ${code}: expected ${exp.pct}% got ${actual}%`);
    }
    if (totals.correct !== expected.correctCount || totals.total !== expected.totalCount) {
      p2Pass = false;
      p2Details.push(`${expected.learnerName}: overall recompute ${totals.correct}/${totals.total} ≠ stored ${expected.correctCount}/${expected.totalCount}`);
    }
  }
  probes.push({
    key: "outcome_scoring",
    name: "P2 — Outcome-level scoring recomputes exactly from stored answers",
    pass: p2Pass,
    expectation:
      "Per-outcome percentages derived from answers × question_bank correct answers match the expected matrix, and the overall recompute matches the stored score.",
    detail: p2Details.join(" · "),
  });

  // P3: mastery mapping — each percentage lands in the expected band.
  const p3Details: string[] = [];
  let p3Pass = true;
  for (const { expected, a } of assembled) {
    if (!a) continue;
    for (const [code, exp] of Object.entries(expected.outcomes)) {
      const { band } = bandForScore([...a.input.levels], exp.pct);
      if (!band || band.label !== exp.band) p3Pass = false;
      p3Details.push(`${code} ${exp.pct}% → ${band?.label ?? "no band"} (expected ${exp.band})`);
    }
  }
  probes.push({
    key: "mastery_mapping",
    name: "P3 — Mastery framework mapping (Beginning / Developing / Proficient / Advanced)",
    pass: p3Pass,
    expectation:
      "100% → Advanced, 67% → Developing, 33% → Beginning against the org's live mastery bands.",
    detail: p3Details.join(" · "),
  });

  // P4: category + risk derivation matches the documented deterministic rules.
  const p4Details: string[] = [];
  let p4Pass = true;
  for (const { expected, a } of assembled) {
    if (!a) continue;
    const { rows } = buildOutcomeAnalyses(a.input);
    const byCode = new Map(rows.map((r) => [r.code, r]));
    for (const [code, exp] of Object.entries(expected.outcomes)) {
      const r = byCode.get(code);
      const ok = r && r.gapCategory === exp.category && r.riskLevel === exp.risk;
      if (!ok) p4Pass = false;
      p4Details.push(
        `${expected.learnerName.split(" ")[0]} ${code}: ${r?.gapCategory ?? "?"}/${r?.riskLevel ?? "?"} (expected ${exp.category}/${exp.risk})`,
      );
    }
  }
  probes.push({
    key: "category_risk",
    name: "P4 — Weak/Medium/Strong categories and risk levels derive from band rank + weight × difficulty",
    pass: p4Pass,
    expectation:
      "Aarav: LO_GK3_NAT_01 strong/low, LO_GK3_NAT_02 medium/medium, LO_GK3_NAT_03 weak/high. Diya: LO_GK3_NAT_01 medium/low, LO_GK3_NAT_02 weak/high, LO_GK3_NAT_03 weak/high. Benchmark = unit mean of weight × difficulty; 0.9× threshold.",
    detail: p4Details.join(" · "),
  });

  // P5: intervention lookup works AND nothing was auto-created.
  const p5Details: string[] = [];
  let p5Pass = true;
  for (const { expected, a } of assembled) {
    if (!a) continue;
    const { rows } = buildOutcomeAnalyses(a.input);
    for (const r of rows.filter((x) => x.gapCategory !== "strong")) {
      if (r.interventions.length === 0) {
        p5Pass = false;
        p5Details.push(`${r.code}: no intervention mapping found`);
      }
    }
  }
  const { count: autoGaps, error: gapsErr } = await supabase
    .from("learning_gaps")
    .select("*", { count: "exact", head: true })
    .in(
      "session_id",
      GAP_EXPECTED.sessions.map((s) => s.id),
    );
  if (gapsErr) {
    p5Pass = false;
    p5Details.push(`learning_gaps check failed: ${gapsErr.message}`);
  } else if ((autoGaps ?? 0) !== 0) {
    p5Pass = false;
    p5Details.push(`${autoGaps} learning_gaps rows reference the demo sessions — analysis must never write.`);
  } else {
    p5Details.push("intervention_map lookups resolve for every weak/medium outcome; zero learning_gaps rows reference these sessions (no auto-creation)");
  }
  probes.push({
    key: "intervention_lookup",
    name: "P5 — Intervention recommendations resolve from the blueprint map, with no automatic assignment",
    pass: p5Pass,
    expectation:
      "Every weak/medium outcome has ≥1 intervention_map row (failure pattern → recommended intervention); zero learning_gaps/recommendations reference the analyzed sessions.",
    detail: p5Details.join(" · "),
  });

  // P6: curriculum traceability — Gap → Outcome → LO → Topic → Chapter → Unit.
  const p6Details: string[] = [];
  let p6Pass = true;
  for (const { expected, a } of assembled) {
    if (!a) continue;
    const { rows } = buildOutcomeAnalyses(a.input);
    for (const r of rows) {
      const good = r.traces.find(
        (t) =>
          t.learningOutcomeText.length > 0 &&
          t.topicTitle !== "—" &&
          t.chapterTitle !== "—" &&
          t.unitTitle !== "—",
      );
      if (!good) {
        p6Pass = false;
        p6Details.push(`${r.code}: chain broken`);
      } else {
        p6Details.push(`${r.code}: ${good.unitTitle} › ${good.chapterTitle} › ${good.topicTitle} › LO`);
      }
    }
  }
  probes.push({
    key: "traceability",
    name: "P6 — Curriculum traceability resolves for every measured outcome",
    pass: p6Pass,
    expectation: "Each measured outcome traces to at least one complete chain: Outcome → Learning Outcome → Topic → Chapter → Unit.",
    detail: p6Details.join(" · "),
  });

  // P7: cross-org isolation — reads return zero, writes are rejected.
  const { count: crossRead, error: crossErr } = await supabase
    .from("assessment_sessions")
    .select("*", { count: "exact", head: true })
    .eq("org_id", otherOrg);
  const crossWrite = await supabase.from("assessment_sessions").insert({
    org_id: otherOrg,
    assessment_id: GAP_EXPECTED.diagnosticId,
    learner_id: GAP_EXPECTED.sessions[0].id.replace("dd000001", "ccccccc1"),
    status: "assigned",
    answers: {},
  });
  probes.push({
    key: "cross_org_isolation",
    name: "P7 — Cross-organization reads return zero rows; writes are rejected",
    pass: !crossErr && (crossRead ?? -1) === 0 && !!crossWrite.error,
    expectation: `Reading sessions for the other organization returns 0 rows; inserting a session into it is rejected by RLS.`,
    detail: `Cross-org read returned ${crossRead ?? "error"} rows; cross-org write ${crossWrite.error ? "rejected (verbatim response below)" : "SUCCEEDED — RLS failure"}.`,
    dbError: crossWrite.error
      ? {
          message: crossWrite.error.message,
          details: crossWrite.error.details ?? null,
          hint: crossWrite.error.hint ?? null,
          code: crossWrite.error.code ?? null,
        }
      : null,
  });

  // P8: determinism — the analyzer is a pure function over the same rows.
  let p8Pass = false;
  let p8Detail = "Could not assemble the demo session twice.";
  const first = assembled[0];
  if (first?.a) {
    const again = await assembleAnalysisInput(supabase, first.expected.id);
    const run1 = JSON.stringify(buildOutcomeAnalyses(first.a.input));
    const run2 = JSON.stringify(buildOutcomeAnalyses(again.input));
    p8Pass = run1 === run2;
    p8Detail = p8Pass
      ? `Two independent recomputes of ${first.expected.learnerName}'s analysis are byte-identical (${run1.length} chars). The analyzer is a pure TypeScript function — no AI, no randomness, no clock.`
      : "Recomputed analyses differ — determinism violated.";
  }
  probes.push({
    key: "determinism",
    name: "P8 — Analysis is deterministic (same inputs → byte-identical output)",
    pass: p8Pass,
    expectation: "Re-assembling and re-analyzing the same session twice produces byte-identical results.",
    detail: p8Detail,
  });

  // P9: read-only — analysis leaves learner/gap/intervention state untouched.
  const demoLearnerIds = GAP_EXPECTED.sessions.map((s) => s.id.replace("dd00000", "ccccccc").replace("-000000000001", "-000000000001"));
  const demoLearners = ["ccccccc1-0000-4000-8000-000000000001", "ccccccc1-0000-4000-8000-000000000002"];
  const snapshotState = async () => {
    const [learners, gaps, recs, ints] = await Promise.all([
      supabase.from("learners").select("id, mastery_score, mastery_lift").in("id", demoLearners),
      supabase.from("learning_gaps").select("*", { count: "exact", head: true }).in("learner_id", demoLearners),
      supabase.from("recommendations").select("*", { count: "exact", head: true }).in("learner_id", demoLearners),
      supabase.from("interventions").select("*", { count: "exact", head: true }).in("learner_id", demoLearners),
    ]);
    return JSON.stringify({
      learners: learners.data,
      gaps: gaps.count,
      recs: recs.count,
      ints: ints.count,
    });
  };
  const before = await snapshotState();
  // Run a fresh analysis in between to prove the act of analyzing writes nothing.
  if (assembled[1]?.a) buildOutcomeAnalyses(assembled[1].a.input);
  await assembleAnalysisInput(supabase, GAP_EXPECTED.sessions[0].id).catch(() => null);
  const after = await snapshotState();
  probes.push({
    key: "read_only",
    name: "P9 — Analysis is read-only: no gaps, recommendations, interventions, or mastery changes",
    pass: before === after,
    expectation:
      "Learner mastery rows and gap/recommendation/intervention counts are identical before and after running analyses.",
    detail:
      before === after
        ? "State snapshot before and after analysis is identical (learners' mastery, gap/recommendation/intervention counts unchanged)."
        : `State changed across analysis: before=${before} after=${after}`,
  });

  return { generatedAt, me, probes };
}
