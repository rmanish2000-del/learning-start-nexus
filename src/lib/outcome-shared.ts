// Sprint 5: outcome proof — pure, browser-safe logic for the mastery loop.
// Diagnostic -> gap -> intervention -> AI tutor -> reassessment -> outcome.
// The audit center renders these formulas verbatim so reviewers can verify
// determinism: same inputs always produce the same outcome.

export type OutcomeStatus =
  | "pending"
  | "improvement"
  | "no_improvement"
  | "low_confidence"
  | "requires_review";

export const OUTCOME_STATUS_LABELS: Record<OutcomeStatus, string> = {
  pending: "Pending reassessment",
  improvement: "Improvement",
  no_improvement: "No improvement",
  low_confidence: "Low confidence",
  requires_review: "Requires review",
};

// ---------------------------------------------------------------------------
// Mastery lift: percentage-point improvement from baseline to reassessment.
// ---------------------------------------------------------------------------
export function computeLift(baselineScore: number, postScore: number): number {
  return postScore - baselineScore;
}

// ---------------------------------------------------------------------------
// Confidence score (0–100): how much we trust the measured lift.
//   Coverage    (max 40): 4 points per reassessment item, capped at 40
//   Practice    (max 30): 30 x tutor practice accuracy; 15 when no practice
//   Consistency (max 30): subtopic >= 70% -> 30, 50-69% -> 20, else 10
// ---------------------------------------------------------------------------
export type ConfidenceInput = {
  totalItems: number; // items scored on the reassessment
  practiceAttempts: number; // graded tutor practice answers for the intervention
  practiceCorrect: number;
  subtopicPct: number | null; // reassessment accuracy on the intervention's subtopic
};

export const CONFIDENCE_FORMULA: string[] = [
  "Coverage (max 40): 4 points per scored reassessment item, capped at 40",
  "Practice (max 30): 30 x tutor practice accuracy for the intervention; 15 if no graded practice exists",
  "Consistency (max 30): reassessment accuracy on the intervention's subtopic — 70%+ = 30, 50–69% = 20, below 50% = 10",
];

export function computeConfidence(input: ConfidenceInput): number {
  const coverage = Math.min(40, input.totalItems * 4);
  const practice =
    input.practiceAttempts === 0
      ? 15
      : Math.round(30 * (input.practiceCorrect / input.practiceAttempts));
  const consistency =
    input.subtopicPct === null ? 10 : input.subtopicPct >= 70 ? 30 : input.subtopicPct >= 50 ? 20 : 10;
  return coverage + practice + consistency;
}

// ---------------------------------------------------------------------------
// Outcome classification. Confidence is checked first: a big lift measured
// with thin evidence is reported as low confidence, not as improvement.
// ---------------------------------------------------------------------------
export const LOW_CONFIDENCE_BELOW = 50;
export const IMPROVEMENT_LIFT_AT_LEAST = 10;

export function classifyOutcome(lift: number, confidence: number): OutcomeStatus {
  if (confidence < LOW_CONFIDENCE_BELOW) return "low_confidence";
  if (lift >= IMPROVEMENT_LIFT_AT_LEAST) return "improvement";
  if (lift <= 0) return "no_improvement";
  return "requires_review";
}

// ---------------------------------------------------------------------------
// Outcome timeline: Diagnostic -> Intervention -> Practice -> Reassessment
// -> Outcome. Built from raw rows; rendered on the learner outcome report.
// ---------------------------------------------------------------------------
export type TimelineEvent = {
  key: string;
  label: string;
  at: string | null;
  detail: string;
  state: "done" | "current" | "upcoming";
};

export type TimelineInput = {
  baselineAt: string | null;
  baselineScore: number;
  gapAt: string | null;
  subtopic: string;
  interventionTitle: string;
  interventionStartedAt: string | null;
  interventionCompletedAt: string | null;
  practiceCount: number;
  practiceLastAt: string | null;
  reassessmentAt: string | null;
  postScore: number | null;
  lift: number | null;
  confidence: number | null;
  status: string;
  completedAt: string | null;
};

export function buildOutcomeTimeline(input: TimelineInput): TimelineEvent[] {
  const done = input.status !== "pending";
  return [
    {
      key: "diagnostic",
      label: "Diagnostic",
      at: input.baselineAt,
      detail: `Baseline score ${input.baselineScore}%`,
      state: input.baselineAt ? "done" : "upcoming",
    },
    {
      key: "gap",
      label: "Gap detected",
      at: input.gapAt,
      detail: `Gap on ${input.subtopic}`,
      state: input.gapAt ? "done" : "upcoming",
    },
    {
      key: "intervention",
      label: "Intervention",
      at: input.interventionCompletedAt ?? input.interventionStartedAt,
      detail: input.interventionTitle,
      state: input.interventionCompletedAt
        ? "done"
        : input.interventionStartedAt
          ? "current"
          : "upcoming",
    },
    {
      key: "practice",
      label: "AI tutor practice",
      at: input.practiceLastAt,
      detail:
        input.practiceCount > 0
          ? `${input.practiceCount} tutor interaction${input.practiceCount === 1 ? "" : "s"}`
          : "No tutor practice yet",
      state: input.practiceCount > 0 ? "done" : done ? "done" : "upcoming",
    },
    {
      key: "reassessment",
      label: "Reassessment",
      at: input.reassessmentAt,
      detail: input.postScore !== null ? `Post-intervention score ${input.postScore}%` : "Awaiting submission",
      state: input.reassessmentAt ? "done" : "current",
    },
    {
      key: "outcome",
      label: "Outcome",
      at: input.completedAt,
      detail: done
        ? `Lift ${input.lift !== null && input.lift >= 0 ? "+" : ""}${input.lift ?? "?"} pts · confidence ${input.confidence ?? "?"}/100 · ${OUTCOME_STATUS_LABELS[input.status as OutcomeStatus] ?? input.status}`
        : "Computed when the reassessment is submitted",
      state: done ? "done" : "upcoming",
    },
  ];
}
