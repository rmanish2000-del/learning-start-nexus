// UX Phase 1 · Wave 2 — server-only aggregation for the educator board.
// Everything is read-only and runs as the caller, so RLS scopes results to the
// educator's organization. Aggregation happens here, never in the browser.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  daysBetween,
  needsActionToday,
  riskFor,
  urgencyScore,
  type ClassGapMatrix,
  type CohortProgress,
  type HeatmapRow,
  type QueueRow,
} from "./educator-board-shared";

type Client = SupabaseClient<Database>;

// Pilot term boundary: the current calendar half-year (Jan–Jun / Jul–Dec).
export function termStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() < 6 ? 0 : 6, 1));
}

export async function fetchClassBoard(
  supabase: Client,
): Promise<{ matrix: ClassGapMatrix; cohort: CohortProgress }> {
  const [{ data: learners, error: lErr }, { data: gaps, error: gErr }] = await Promise.all([
    supabase.from("learners").select("id, full_name, grade, subject, mastery_score").order("full_name"),
    supabase.from("learning_gaps").select("learner_id, subject, status, updated_at"),
  ]);
  if (lErr) throw new Error(lErr.message);
  if (gErr) throw new Error(gErr.message);

  const roster = learners ?? [];
  const allGaps = gaps ?? [];
  const openGaps = allGaps.filter((g) => g.status === "open");

  const subjects = Array.from(
    new Set([...roster.map((l) => l.subject), ...allGaps.map((g) => g.subject)].filter(Boolean)),
  ).sort();

  const rows: HeatmapRow[] = roster.map((learner) => {
    const cells = subjects.map((subject) => ({
      subject,
      openGaps: openGaps.filter((g) => g.learner_id === learner.id && g.subject === subject).length,
    }));
    const total = cells.reduce((s, c) => s + c.openGaps, 0);
    return {
      learnerId: learner.id,
      learnerName: learner.full_name,
      grade: learner.grade,
      mastery: learner.mastery_score,
      cells,
      total,
      risk: riskFor(total, learner.mastery_score),
    };
  });
  // Worst first: most open gaps, then lowest mastery, then name.
  rows.sort(
    (a, b) => b.total - a.total || a.mastery - b.mastery || a.learnerName.localeCompare(b.learnerName),
  );

  const columnTotals = subjects.map((subject) => ({
    subject,
    openGaps: openGaps.filter((g) => g.subject === subject).length,
  }));

  const matrix: ClassGapMatrix = {
    subjects,
    rows,
    columnTotals,
    totalOpenGaps: openGaps.length,
    generatedAt: new Date().toISOString(),
  };

  // UX-14 cohort progress
  const start = termStart().toISOString();
  const closedThisTerm = allGaps.filter(
    (g) => (g.status === "addressed" || g.status === "dismissed") && g.updated_at >= start,
  );
  const averageMastery = roster.length
    ? Math.round(roster.reduce((s, l) => s + l.mastery_score, 0) / roster.length)
    : 0;

  const cohortSubjects = subjects
    .map((subject) => {
      const subjectLearners = roster.filter((l) => l.subject === subject);
      return {
        subject,
        learners: subjectLearners.length,
        averageMastery: subjectLearners.length
          ? Math.round(
              subjectLearners.reduce((s, l) => s + l.mastery_score, 0) / subjectLearners.length,
            )
          : 0,
        openGaps: openGaps.filter((g) => g.subject === subject).length,
        closedGaps: closedThisTerm.filter((g) => g.subject === subject).length,
      };
    })
    // Worst first: most open gaps, then lowest mastery.
    .sort((a, b) => b.openGaps - a.openGaps || a.averageMastery - b.averageMastery);

  const denominator = openGaps.length + closedThisTerm.length;

  const cohort: CohortProgress = {
    learners: roster.length,
    averageMastery,
    activeGaps: openGaps.length,
    gapsClosedThisTerm: closedThisTerm.length,
    closureRatePct: denominator ? Math.round((closedThisTerm.length / denominator) * 100) : 0,
    subjects: cohortSubjects,
  };

  return { matrix, cohort };
}

export async function fetchInterventionQueue(
  supabase: Client,
): Promise<{ rows: QueueRow[]; needAction: number }> {
  const { data, error } = await supabase
    .from("interventions")
    .select(
      "id, learner_id, gap_id, title, activity, status, created_at, started_at, learners(full_name, mastery_score), learning_gaps(subtopic, subject, severity)",
    )
    .in("status", ["planned", "in_progress"]);
  if (error) throw new Error(error.message);

  const rows: QueueRow[] = (data ?? []).map((i) => {
    const phaseSince = i.status === "in_progress" ? (i.started_at ?? i.created_at) : i.created_at;
    const days = daysBetween(phaseSince);
    const mastery = i.learners?.mastery_score ?? 0;
    const severity = i.learning_gaps?.severity ?? null;
    return {
      interventionId: i.id,
      learnerId: i.learner_id,
      learnerName: i.learners?.full_name ?? "—",
      mastery,
      gapId: i.gap_id,
      subtopic: i.learning_gaps?.subtopic ?? null,
      subject: i.learning_gaps?.subject ?? null,
      severity,
      status: i.status,
      title: i.title,
      activity: i.activity,
      phaseSince,
      daysInPhase: days,
      urgency: urgencyScore({ mastery, severity, status: i.status, daysInPhase: days }),
      needsActionToday: needsActionToday(i.status, days),
    };
  });

  rows.sort((a, b) => b.urgency - a.urgency || a.learnerName.localeCompare(b.learnerName));
  return { rows, needAction: rows.filter((r) => r.needsActionToday).length };
}
