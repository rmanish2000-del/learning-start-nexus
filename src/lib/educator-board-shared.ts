// UX Phase 1 · Wave 2 — browser-safe pure helpers for the educator board:
// UX-03 gap heatmap banding, UX-04 intervention queue ranking, UX-14 cohort view.
// No server imports: the same functions render in the UI and are used server-side.

export type HeatBand = 0 | 1 | 2 | 3 | 4;

// Density banding used by the heatmap legend: 0 / 1–2 / 3–4 / 5–7 / 8+
export function heatBand(count: number): HeatBand {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

export const HEAT_BAND_LABELS: Record<HeatBand, string> = {
  0: "0",
  1: "1–2",
  2: "3–4",
  3: "5–7",
  4: "8+",
};

export const HEAT_BAND_CLASSES: Record<HeatBand, string> = {
  0: "bg-muted/40 text-muted-foreground",
  1: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  2: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  3: "bg-orange-500/25 text-orange-700 dark:text-orange-300",
  4: "bg-destructive/25 text-destructive",
};

export type RiskLevel = "on_track" | "at_risk" | "critical";

export const RISK_LABELS: Record<RiskLevel, string> = {
  on_track: "On track",
  at_risk: "At risk",
  critical: "Critical",
};

// Deterministic risk chip: driven by open-gap count first, mastery second.
export function riskFor(openGaps: number, mastery: number): RiskLevel {
  if (openGaps >= 5 || mastery < 50) return "critical";
  if (openGaps >= 2 || mastery < 70) return "at_risk";
  return "on_track";
}

export function daysBetween(fromIso: string, now = new Date()): number {
  const ms = now.getTime() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

// UX-04 urgency score. Published verbatim next to the queue so educators can
// verify the order themselves. Higher score = act sooner.
export const URGENCY_RULE_TEXT =
  "Urgency = (100 − learner mastery) + severity bonus (high 30 / medium 15) + stage bonus (planned 10 / in progress 5) + days in current phase (capped at 30). Ties break on learner name.";

export function urgencyScore(input: {
  mastery: number;
  severity: string | null;
  status: string;
  daysInPhase: number;
}): number {
  const severityBonus = input.severity === "high" ? 30 : input.severity === "medium" ? 15 : 0;
  const stageBonus = input.status === "planned" ? 10 : input.status === "in_progress" ? 5 : 0;
  return (
    Math.max(0, 100 - input.mastery) +
    severityBonus +
    stageBonus +
    Math.min(30, Math.max(0, input.daysInPhase))
  );
}

export type HeatmapCell = { subject: string; openGaps: number };

export type HeatmapRow = {
  learnerId: string;
  learnerName: string;
  grade: number;
  mastery: number;
  cells: HeatmapCell[];
  total: number;
  risk: RiskLevel;
};

export type ClassGapMatrix = {
  subjects: string[];
  rows: HeatmapRow[];
  columnTotals: { subject: string; openGaps: number }[];
  totalOpenGaps: number;
  generatedAt: string;
};

export type CohortProgress = {
  learners: number;
  averageMastery: number;
  activeGaps: number;
  gapsClosedThisTerm: number;
  closureRatePct: number;
  subjects: {
    subject: string;
    learners: number;
    averageMastery: number;
    openGaps: number;
    closedGaps: number;
  }[];
};

export type QueueRow = {
  interventionId: string;
  learnerId: string;
  learnerName: string;
  mastery: number;
  gapId: string | null;
  subtopic: string | null;
  subject: string | null;
  severity: string | null;
  status: string;
  title: string;
  activity: string;
  phaseSince: string;
  daysInPhase: number;
  urgency: number;
  needsActionToday: boolean;
};

// A row needs action today when it is stalled: planned for 3+ days, or
// in progress for 7+ days without completion.
export function needsActionToday(status: string, daysInPhase: number): boolean {
  if (status === "planned") return daysInPhase >= 3;
  if (status === "in_progress") return daysInPhase >= 7;
  return false;
}
