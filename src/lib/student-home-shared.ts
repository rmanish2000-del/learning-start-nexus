// UX Phase 1 · UX-01 — gap-first student home: pure, browser-safe types and
// ordering logic. No writes, no new pipeline: this only reorders data that the
// diagnostic → gap → intervention → tutor → reassessment → evidence loop
// already produces.

export const LOOP_STAGES = [
  "Diagnostic",
  "Gap",
  "Intervention",
  "Tutor",
  "Reassessment",
  "Evidence",
] as const;

export type LoopStage = (typeof LOOP_STAGES)[number];

export type StudentGapAction =
  | "launch-tutor"
  | "resume-assessment"
  | "review-evidence"
  | "wait";

export type StudentGapCard = {
  gapId: string;
  subject: string;
  topic: string;
  subtopic: string;
  severity: string;
  masteryPct: number;
  stage: LoopStage;
  daysInPhase: number;
  interventionId: string | null;
  interventionTitle: string | null;
  activity: string | null;
  action: StudentGapAction;
  actionLabel: string;
  urgency: number;
};

const SEVERITY_RANK: Record<string, number> = { high: 3, critical: 3, medium: 2, low: 1 };

export function severityRank(severity: string): number {
  return SEVERITY_RANK[severity.toLowerCase()] ?? 1;
}

export function daysBetween(from: string, to: Date): number {
  const diff = (to.getTime() - new Date(from).getTime()) / 86_400_000;
  return diff > 0 ? Math.floor(diff) : 0;
}

// Deterministic urgency: severity dominates, then time stuck in the current
// phase, then how far below mastery the learner is.
export function urgencyScore(input: {
  severity: string;
  daysInPhase: number;
  masteryPct: number;
}): number {
  return (
    severityRank(input.severity) * 1000 +
    Math.min(input.daysInPhase, 90) * 10 +
    Math.max(0, 100 - input.masteryPct) / 10
  );
}

export function stageLabel(stage: LoopStage): string {
  return stage;
}

export function stageIndex(stage: LoopStage): number {
  return LOOP_STAGES.indexOf(stage);
}

export function sortGapCards(cards: StudentGapCard[]): StudentGapCard[] {
  return [...cards].sort((a, b) => b.urgency - a.urgency || a.subtopic.localeCompare(b.subtopic));
}
