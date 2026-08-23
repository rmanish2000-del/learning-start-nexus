// Sprint 5 server-only engine: outcome creation on intervention completion,
// outcome finalization on reassessment submission, and outcome reporting.
// Never imported by client code — client-safe logic lives in outcome-shared.ts.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ResultEntry } from "./assessment-shared";
import { computeSubtopicStats } from "./intervention-shared";
import {
  classifyOutcome,
  computeConfidence,
  computeLift,
  type OutcomeStatus,
} from "./outcome-shared";

type Client = SupabaseClient<Database>;

// learner_outcomes and assessment_sessions.intervention_id are newer than the
// generated Database types, so query them through an untyped handle and map
// results into explicit DTOs below.
function outcomesTable(client: Client) {
  return (client as SupabaseClient).from("learner_outcomes");
}
function sessionsTable(client: Client) {
  return (client as SupabaseClient).from("assessment_sessions");
}

export type OutcomeRow = {
  id: string;
  org_id: string;
  learner_id: string;
  intervention_id: string;
  gap_id: string | null;
  subject: string;
  topic: string;
  subtopic: string;
  baseline_session_id: string | null;
  baseline_score: number;
  reassessment_session_id: string | null;
  post_score: number | null;
  mastery_lift: number | null;
  confidence: number | null;
  status: OutcomeStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// 1. Open an outcome when an intervention is completed. Creates the pending
//    outcome row (baseline = the session that detected the gap) and assigns
//    the published reassessment to the learner, linked to the intervention.
//    Idempotent: intervention_id is unique on learner_outcomes.
// ---------------------------------------------------------------------------
export type OpenOutcomeResult = {
  outcomeId: string;
  created: boolean;
  reassessmentSessionId: string | null;
  reassessmentAssigned: boolean;
  baselineScore: number;
};

export async function openOutcomeForIntervention(
  admin: Client,
  interventionId: string,
): Promise<OpenOutcomeResult | null> {
  const { data: intervention, error } = await admin
    .from("interventions")
    .select("*")
    .eq("id", interventionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!intervention || intervention.status !== "completed") return null;

  const { data: existing } = await outcomesTable(admin)
    .select("id, baseline_score, reassessment_session_id")
    .eq("intervention_id", interventionId)
    .maybeSingle();
  if (existing) {
    return {
      outcomeId: existing.id as string,
      created: false,
      reassessmentSessionId: (existing.reassessment_session_id as string | null) ?? null,
      reassessmentAssigned: false,
      baselineScore: existing.baseline_score as number,
    };
  }

  // Baseline = the assessment session that detected the gap.
  let baselineSessionId: string | null = null;
  let baselineScore = 0;
  let subtopic = intervention.title;
  let subject = "Mathematics";
  let topic = "Fractions";
  if (intervention.gap_id) {
    const { data: gap } = await admin
      .from("learning_gaps")
      .select("*")
      .eq("id", intervention.gap_id)
      .maybeSingle();
    if (gap) {
      subtopic = gap.subtopic;
      subject = gap.subject;
      topic = gap.topic;
      baselineSessionId = gap.session_id;
    }
  }
  if (baselineSessionId) {
    const { data: baseline } = await sessionsTable(admin)
      .select("score_pct")
      .eq("id", baselineSessionId)
      .maybeSingle();
    baselineScore = (baseline?.score_pct as number | null) ?? 0;
  }

  const { data: outcome, error: insError } = await outcomesTable(admin)
    .insert({
      org_id: intervention.org_id,
      learner_id: intervention.learner_id,
      intervention_id: intervention.id,
      gap_id: intervention.gap_id,
      subject,
      topic,
      subtopic,
      baseline_session_id: baselineSessionId,
      baseline_score: baselineScore,
      status: "pending",
    })
    .select("id")
    .single();
  if (insError) throw new Error(insError.message);

  // Assign the published reassessment for this org/subject/topic, linked to
  // the intervention. The (assessment_id, learner_id) unique constraint makes
  // re-assignment a no-op.
  const { data: reassessment } = await admin
    .from("assessments")
    .select("id, title")
    .eq("org_id", intervention.org_id)
    .eq("kind", "reassessment")
    .eq("status", "published")
    .eq("subject", subject)
    .eq("topic", topic)
    .limit(1)
    .maybeSingle();

  let reassessmentSessionId: string | null = null;
  let reassessmentAssigned = false;
  if (reassessment) {
    const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: session, error: sessError } = await sessionsTable(admin)
      .upsert(
        {
          org_id: intervention.org_id,
          assessment_id: reassessment.id,
          learner_id: intervention.learner_id,
          assigned_by: intervention.educator_id,
          intervention_id: intervention.id,
          status: "assigned",
          due,
        },
        { onConflict: "assessment_id,learner_id", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle();
    if (sessError) throw new Error(sessError.message);
    if (session) {
      reassessmentSessionId = session.id as string;
      reassessmentAssigned = true;
      await outcomesTable(admin)
        .update({ reassessment_session_id: reassessmentSessionId })
        .eq("id", outcome.id);
    } else {
      // Session already existed — link it to this intervention if unlinked.
      const { data: existingSession } = await sessionsTable(admin)
        .select("id, intervention_id, status")
        .eq("assessment_id", reassessment.id)
        .eq("learner_id", intervention.learner_id)
        .maybeSingle();
      if (existingSession && !existingSession.intervention_id && existingSession.status !== "submitted") {
        await sessionsTable(admin)
          .update({ intervention_id: intervention.id })
          .eq("id", existingSession.id);
        reassessmentSessionId = existingSession.id as string;
        await outcomesTable(admin)
          .update({ reassessment_session_id: reassessmentSessionId })
          .eq("id", outcome.id);
      }
    }
  }

  return {
    outcomeId: outcome.id as string,
    created: true,
    reassessmentSessionId,
    reassessmentAssigned,
    baselineScore,
  };
}

// ---------------------------------------------------------------------------
// 2. Finalize pending outcomes when a reassessment session is submitted.
//    Computes post score, mastery lift, confidence, and status; updates the
//    learner's mastery index; writes mastery history and an evidence entry.
// ---------------------------------------------------------------------------
export type FinalizedOutcome = {
  outcomeId: string;
  subtopic: string;
  baselineScore: number;
  postScore: number;
  lift: number;
  confidence: number;
  status: OutcomeStatus;
};

export async function finalizeOutcomesForSession(
  admin: Client,
  params: {
    orgId: string;
    learnerId: string;
    sessionId: string;
    interventionId: string | null;
    scorePct: number;
    totalCount: number;
    breakdown: ResultEntry[];
    assessmentTitle: string;
  },
): Promise<FinalizedOutcome[]> {
  // Pending outcomes for this learner that point at this session directly, or
  // at the intervention this session reassesses.
  const { data: pending, error } = await outcomesTable(admin)
    .select("*")
    .eq("learner_id", params.learnerId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);

  const rows = ((pending ?? []) as unknown as OutcomeRow[]).filter(
    (o) =>
      o.reassessment_session_id === params.sessionId ||
      (params.interventionId !== null && o.intervention_id === params.interventionId),
  );
  if (rows.length === 0) return [];

  const stats = computeSubtopicStats(params.breakdown);
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const finalized: FinalizedOutcome[] = [];

  for (const outcome of rows) {
    // Practice component: graded tutor practice answers across tutor sessions
    // launched for this intervention.
    const { data: tutorSessions } = await admin
      .from("tutor_sessions")
      .select("id")
      .eq("intervention_id", outcome.intervention_id);
    const tutorSessionIds = (tutorSessions ?? []).map((s) => s.id);
    let practiceAttempts = 0;
    let practiceCorrect = 0;
    if (tutorSessionIds.length > 0) {
      const { data: practice } = await admin
        .from("tutor_interactions")
        .select("practice_correct")
        .in("session_id", tutorSessionIds)
        .not("practice_correct", "is", null);
      practiceAttempts = (practice ?? []).length;
      practiceCorrect = (practice ?? []).filter((p) => p.practice_correct === true).length;
    }

    const subtopicPct = stats.find((s) => s.subtopic === outcome.subtopic)?.pct ?? null;
    const postScore = params.scorePct;
    const lift = computeLift(outcome.baseline_score, postScore);
    const confidence = computeConfidence({
      totalItems: params.totalCount,
      practiceAttempts,
      practiceCorrect,
      subtopicPct,
    });
    const status = classifyOutcome(lift, confidence);

    const { error: updError } = await outcomesTable(admin)
      .update({
        reassessment_session_id: params.sessionId,
        post_score: postScore,
        mastery_lift: lift,
        confidence,
        status,
        completed_at: now,
      })
      .eq("id", outcome.id);
    if (updError) throw new Error(updError.message);

    // Mastery index: the reassessment is the learner's new mastery score.
    await admin
      .from("learners")
      .update({ mastery_score: postScore, mastery_lift: lift })
      .eq("id", params.learnerId);
    await admin.from("mastery_history").insert({
      learner_id: params.learnerId,
      recorded_on: today,
      score: postScore,
    });
    await admin.from("learner_evidence").insert({
      learner_id: params.learnerId,
      title: `${params.assessmentTitle} — outcome`,
      kind: "assessment",
      note:
        `Reassessment scored ${postScore}% after intervention on ${outcome.subtopic}. ` +
        `Baseline ${outcome.baseline_score}% -> post ${postScore}% = ${lift >= 0 ? "+" : ""}${lift} points mastery lift. ` +
        `Confidence ${confidence}/100. Outcome: ${status.replace("_", " ")}.`,
      recorded_on: today,
    });

    finalized.push({
      outcomeId: outcome.id,
      subtopic: outcome.subtopic,
      baselineScore: outcome.baseline_score,
      postScore,
      lift,
      confidence,
      status,
    });
  }

  return finalized;
}

// ---------------------------------------------------------------------------
// 3. Reads (RLS-scoped to the caller).
// ---------------------------------------------------------------------------
export async function fetchOutcomesForLearner(
  supabase: Client,
  learnerId: string,
): Promise<OutcomeRow[]> {
  const { data, error } = await outcomesTable(supabase)
    .select("*")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OutcomeRow[];
}

export type OutcomeSummary = {
  total: number;
  pending: number;
  improvement: number;
  noImprovement: number;
  lowConfidence: number;
  requiresReview: number;
  averageLift: number | null;
};

export async function fetchOrgOutcomeSummary(supabase: Client): Promise<OutcomeSummary> {
  const { data, error } = await outcomesTable(supabase).select("status, mastery_lift");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as { status: string; mastery_lift: number | null }[];
  const completed = rows.filter((r) => r.status !== "pending");
  const lifts = completed.map((r) => r.mastery_lift).filter((v): v is number => v !== null);
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    improvement: rows.filter((r) => r.status === "improvement").length,
    noImprovement: rows.filter((r) => r.status === "no_improvement").length,
    lowConfidence: rows.filter((r) => r.status === "low_confidence").length,
    requiresReview: rows.filter((r) => r.status === "requires_review").length,
    averageLift:
      lifts.length === 0 ? null : Math.round((lifts.reduce((s, v) => s + v, 0) / lifts.length) * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// 4. Outcome report: the full evidence chain for one outcome, read through
//    the caller's RLS-scoped client (staff see org learners; students their own).
// ---------------------------------------------------------------------------
export type OutcomeReport = {
  outcome: OutcomeRow;
  learnerName: string;
  baselineSession: { id: string; title: string; scorePct: number | null; submittedAt: string | null } | null;
  gap: {
    id: string;
    subtopic: string;
    gapScorePct: number;
    severity: string;
    status: string;
    firstDetectedAt: string;
  } | null;
  recommendation: { id: string; ruleId: string; title: string; status: string } | null;
  intervention: {
    id: string;
    title: string;
    activity: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
  } | null;
  tutorSessions: { id: string; status: string; interactionCount: number; lastActivityAt: string }[];
  reassessmentSession: {
    id: string;
    title: string;
    status: string;
    scorePct: number | null;
    submittedAt: string | null;
  } | null;
  evidence: { id: string; title: string; kind: string; note: string | null; recordedOn: string }[];
};

export async function fetchOutcomeReport(
  supabase: Client,
  outcomeId: string,
): Promise<OutcomeReport | null> {
  const { data: outcome, error } = await outcomesTable(supabase)
    .select("*")
    .eq("id", outcomeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!outcome) return null;
  const o = outcome as unknown as OutcomeRow;

  const { data: learner } = await supabase
    .from("learners")
    .select("full_name")
    .eq("id", o.learner_id)
    .maybeSingle();

  const [
    { data: baseline },
    { data: gap },
    { data: intervention },
    { data: reassessment },
    { data: evidence },
  ] = await Promise.all([
    o.baseline_session_id
      ? sessionsTable(supabase)
          .select("id, score_pct, submitted_at, assessments(title)")
          .eq("id", o.baseline_session_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    o.gap_id
      ? supabase
          .from("learning_gaps")
          .select("id, subtopic, gap_score_pct, severity, status, first_detected_at")
          .eq("id", o.gap_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("interventions")
      .select("id, title, activity, status, started_at, completed_at")
      .eq("id", o.intervention_id)
      .maybeSingle(),
    o.reassessment_session_id
      ? sessionsTable(supabase)
          .select("id, status, score_pct, submitted_at, assessments(title)")
          .eq("id", o.reassessment_session_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("learner_evidence")
      .select("id, title, kind, note, recorded_on")
      .eq("learner_id", o.learner_id)
      .order("recorded_on", { ascending: false })
      .limit(10),
  ]);

  const { data: recommendation } = gap
    ? await supabase
        .from("recommendations")
        .select("id, rule_id, title, status")
        .eq("gap_id", gap.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { data: tutorSessions } = await supabase
    .from("tutor_sessions")
    .select("id, status, interaction_count, last_activity_at")
    .eq("intervention_id", o.intervention_id)
    .order("last_activity_at", { ascending: false });

  type SessionJoin = {
    id: string;
    status?: string;
    score_pct: number | null;
    submitted_at: string | null;
    assessments: { title: string } | null;
  };
  const baselineRow = baseline as unknown as SessionJoin | null;
  const reassessmentRow = reassessment as unknown as SessionJoin | null;

  return {
    outcome: o,
    learnerName: learner?.full_name ?? "Learner",
    baselineSession: baselineRow
      ? {
          id: baselineRow.id,
          title: baselineRow.assessments?.title ?? "Diagnostic",
          scorePct: baselineRow.score_pct,
          submittedAt: baselineRow.submitted_at,
        }
      : null,
    gap: gap
      ? {
          id: gap.id,
          subtopic: gap.subtopic,
          gapScorePct: gap.gap_score_pct,
          severity: gap.severity,
          status: gap.status,
          firstDetectedAt: gap.first_detected_at,
        }
      : null,
    recommendation: recommendation
      ? {
          id: recommendation.id,
          ruleId: recommendation.rule_id,
          title: recommendation.title,
          status: recommendation.status,
        }
      : null,
    intervention: intervention
      ? {
          id: intervention.id,
          title: intervention.title,
          activity: intervention.activity,
          status: intervention.status,
          startedAt: intervention.started_at,
          completedAt: intervention.completed_at,
        }
      : null,
    tutorSessions: (tutorSessions ?? []).map((s) => ({
      id: s.id,
      status: s.status,
      interactionCount: s.interaction_count,
      lastActivityAt: s.last_activity_at,
    })),
    reassessmentSession: reassessmentRow
      ? {
          id: reassessmentRow.id,
          title: reassessmentRow.assessments?.title ?? "Reassessment",
          status: reassessmentRow.status ?? "assigned",
          scorePct: reassessmentRow.score_pct,
          submittedAt: reassessmentRow.submitted_at,
        }
      : null,
    evidence: (evidence ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      kind: e.kind,
      note: e.note,
      recordedOn: e.recorded_on,
    })),
  };
}
