// UX Phase 1 · UX-01 / UX-02 — server-side assembly for the gap-first student
// home. Learner identity is resolved from the caller's own RLS-scoped client;
// only after that ownership check do we read the learner's gap loop with the
// privileged client, because learning_gaps is staff-scoped by policy. Every
// read is filtered to the caller's single learner id.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { computeOutcomeMetrics, type GapRow, type OutcomeMetricRow } from "./outcome-dashboard-shared";
import { summariseClosure, type ClosureSummary } from "./closure-shared";
import {
  daysBetween,
  sortGapCards,
  urgencyScore,
  type LoopStage,
  type StudentGapAction,
  type StudentGapCard,
} from "./student-home-shared";

type Client = SupabaseClient<Database>;

export type StudentHomeView = {
  learnerId: string | null;
  summary: ClosureSummary;
  gaps: StudentGapCard[];
  generatedAt: string;
};

const EMPTY_METRICS = computeOutcomeMetrics({ learnerIds: [], gaps: [], outcomes: [] });

export async function fetchStudentHomeView(
  supabase: Client,
  userId: string,
): Promise<StudentHomeView> {
  const { data: learner, error } = await supabase
    .from("learners")
    .select("id, educator_id")
    .eq("student_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!learner) {
    return {
      learnerId: null,
      summary: summariseClosure("Your gaps", EMPTY_METRICS),
      gaps: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const learnerId = learner.id;
  // Class 10 diagnostic-to-conversion: with no educator assigned the plan is
  // AI-generated, so the fallback copy must never mention an educator.
  const educatorAssigned = !!(learner as { educator_id?: string | null }).educator_id;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as Client;

  const [gapsRes, outcomesRes, interventionsRes, tutorRes] = await Promise.all([
    admin
      .from("learning_gaps")
      .select(
        "id, learner_id, status, severity, subject, topic, subtopic, gap_score_pct, first_detected_at, updated_at",
      )
      .eq("learner_id", learnerId),
    admin
      .from("learner_outcomes")
      .select(
        "learner_id, status, mastery_lift, post_score, baseline_score, created_at, completed_at, gap_id",
      )
      .eq("learner_id", learnerId),
    admin
      .from("interventions")
      .select("id, gap_id, title, activity, status, updated_at")
      .eq("learner_id", learnerId),
    admin.from("tutor_sessions").select("gap_id, updated_at").eq("learner_id", learnerId),
  ]);

  for (const res of [gapsRes, outcomesRes, interventionsRes, tutorRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const gapRows = (gapsRes.data ?? []) as unknown as (GapRow & {
    severity: string;
    subject: string;
    topic: string;
    subtopic: string;
    gap_score_pct: number;
  })[];
  const outcomeRows = (outcomesRes.data ?? []) as unknown as (OutcomeMetricRow & {
    gap_id: string | null;
  })[];
  const interventionRows = (interventionsRes.data ?? []) as unknown as {
    id: string;
    gap_id: string | null;
    title: string;
    activity: string;
    status: string;
    updated_at: string;
  }[];
  const tutorRows = (tutorRes.data ?? []) as unknown as { gap_id: string | null; updated_at: string }[];

  const now = new Date();
  const tutorByGap = new Set(tutorRows.map((t) => t.gap_id).filter((v): v is string => !!v));

  const cards: StudentGapCard[] = gapRows
    .filter((g) => g.status !== "addressed" && g.status !== "resolved")
    .map((g) => {
      const intervention = interventionRows.find((i) => i.gap_id === g.id) ?? null;
      const outcome = outcomeRows.find((o) => o.gap_id === g.id) ?? null;

      let stage: LoopStage = "Gap";
      let phaseStart = g.first_detected_at;

      if (outcome && outcome.post_score !== null && outcome.status !== "pending") {
        stage = "Evidence";
        phaseStart = outcome.completed_at ?? outcome.created_at;
      } else if (outcome && intervention?.status === "completed") {
        stage = "Reassessment";
        phaseStart = outcome.created_at;
      } else if (tutorByGap.has(g.id)) {
        stage = "Tutor";
        phaseStart =
          tutorRows.find((t) => t.gap_id === g.id)?.updated_at ?? intervention?.updated_at ?? phaseStart;
      } else if (intervention) {
        stage = "Intervention";
        phaseStart = intervention.updated_at;
      }

      let action: StudentGapAction = "wait";
      let actionLabel = educatorAssigned
        ? "Waiting for your educator"
        : "In your study plan below";
      if (stage === "Evidence") {
        action = "review-evidence";
        actionLabel = "See your proof";
      } else if (stage === "Reassessment") {
        action = "resume-assessment";
        actionLabel = "Take your reassessment";
      } else if (intervention && intervention.status !== "completed") {
        action = "launch-tutor";
        actionLabel = "Practise with the AI Tutor";
      }

      const daysInPhase = daysBetween(phaseStart, now);
      return {
        gapId: g.id,
        subject: g.subject,
        topic: g.topic,
        subtopic: g.subtopic,
        severity: g.severity,
        masteryPct: g.gap_score_pct,
        stage,
        daysInPhase,
        interventionId: intervention?.id ?? null,
        interventionTitle: intervention?.title ?? null,
        activity: intervention?.activity ?? null,
        action,
        actionLabel,
        urgency: urgencyScore({
          severity: g.severity,
          daysInPhase,
          masteryPct: g.gap_score_pct,
        }),
      } satisfies StudentGapCard;
    });

  const metrics = computeOutcomeMetrics({
    learnerIds: [learnerId],
    gaps: gapRows,
    outcomes: outcomeRows,
  });

  return {
    learnerId,
    summary: summariseClosure("Your gaps", metrics),
    gaps: sortGapCards(cards),
    generatedAt: new Date().toISOString(),
  };
}
