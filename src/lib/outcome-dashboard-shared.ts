// Outcome Proof Dashboard — pure, browser-safe metric math.
// Four executive metrics, computed deterministically from raw rows so the
// School, Centre and Parent views always agree on the same numbers.

export type GapRow = {
  id: string;
  learner_id: string;
  status: string; // 'open' | 'resolved' | ...
  first_detected_at: string;
  updated_at: string;
};

export type OutcomeMetricRow = {
  learner_id: string;
  status: string; // pending | improvement | no_improvement | low_confidence | requires_review
  mastery_lift: number | null;
  post_score: number | null;
  baseline_score: number;
  created_at: string;
  completed_at: string | null;
};

export type OutcomeMetrics = {
  // Gap Closure Rate: resolved gaps / all detected gaps.
  gapsTotal: number;
  gapsClosed: number;
  gapClosureRatePct: number | null;
  // Mastery Lift: mean percentage-point gain across measured outcomes.
  masteryLiftAvg: number | null;
  masteryLiftLearners: number;
  // Reassessment Success: measured outcomes classified as improvement.
  reassessmentsMeasured: number;
  reassessmentsSuccessful: number;
  reassessmentSuccessRatePct: number | null;
  // Time To Close: gap detected -> outcome completed, in days.
  timeToCloseAvgDays: number | null;
  timeToCloseMedianDays: number | null;
  timeToCloseSamples: number;
  // Context
  learners: number;
  outcomesPending: number;
};

export const METRIC_FORMULAS: { metric: string; formula: string }[] = [
  {
    metric: "Gap Closure Rate",
    formula: "resolved learning gaps ÷ all detected learning gaps × 100",
  },
  {
    metric: "Mastery Lift",
    formula: "mean of (reassessment score − baseline score) across measured outcomes",
  },
  {
    metric: "Reassessment Success",
    formula: "outcomes classified 'improvement' ÷ outcomes with a submitted reassessment × 100",
  },
  {
    metric: "Time To Close",
    formula: "mean and median days from outcome opened to outcome completed",
  },
];

function pct(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function days(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeOutcomeMetrics(input: {
  learnerIds: string[];
  gaps: GapRow[];
  outcomes: OutcomeMetricRow[];
}): OutcomeMetrics {
  const scope = new Set(input.learnerIds);
  const gaps = input.gaps.filter((g) => scope.has(g.learner_id));
  const outcomes = input.outcomes.filter((o) => scope.has(o.learner_id));

  const gapsClosed = gaps.filter((g) => g.status === "resolved").length;

  const measured = outcomes.filter((o) => o.post_score !== null && o.status !== "pending");
  const lifts = measured
    .map((o) => (o.mastery_lift !== null ? o.mastery_lift : o.post_score! - o.baseline_score))
    .filter((v) => Number.isFinite(v));
  const successful = measured.filter((o) => o.status === "improvement").length;

  const durations = outcomes
    .filter((o) => o.completed_at !== null)
    .map((o) => days(o.created_at, o.completed_at!))
    .filter((d) => Number.isFinite(d) && d >= 0);

  return {
    gapsTotal: gaps.length,
    gapsClosed,
    gapClosureRatePct: pct(gapsClosed, gaps.length),
    masteryLiftAvg:
      lifts.length === 0 ? null : round1(lifts.reduce((s, v) => s + v, 0) / lifts.length),
    masteryLiftLearners: new Set(measured.map((o) => o.learner_id)).size,
    reassessmentsMeasured: measured.length,
    reassessmentsSuccessful: successful,
    reassessmentSuccessRatePct: pct(successful, measured.length),
    timeToCloseAvgDays:
      durations.length === 0
        ? null
        : round1(durations.reduce((s, v) => s + v, 0) / durations.length),
    timeToCloseMedianDays: durations.length === 0 ? null : round1(median(durations)!),
    timeToCloseSamples: durations.length,
    learners: input.learnerIds.length,
    outcomesPending: outcomes.filter((o) => o.status === "pending").length,
  };
}

export type SegmentMetrics = {
  id: string;
  name: string;
  subtitle: string | null;
  metrics: OutcomeMetrics;
};

// Presentation helpers shared by all three executive views.
export function fmtPct(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

export function fmtLift(value: number | null): string {
  return value === null ? "—" : `${value >= 0 ? "+" : ""}${value} pts`;
}

export function fmtDays(value: number | null): string {
  return value === null ? "—" : `${value} ${value === 1 ? "day" : "days"}`;
}
