// Class 10 Diagnostic-to-Conversion — the self-serve study plan.
//
// Pure, browser-safe derivation. The plan is generated from data the platform
// already produces (diagnostic breakdown → learning_gaps → recommendations →
// curriculum outcomes). No educator is required at any step: educator
// messaging is a decoration that only appears when `educatorAssigned` is true.

export type DiagnosticState = "no-learner" | "not-started" | "in-progress" | "submitted";

export type StrengthArea = {
  code: string;
  label: string;
  pct: number;
  correct: number;
  total: number;
};

export type FocusArea = {
  gapId: string | null;
  code: string;
  label: string;
  pct: number;
  severity: string;
  activity: string;
  rationale: string | null;
  interventionId: string | null;
};

export type NextTopic = {
  code: string;
  title: string;
  reason: string;
};

export type StudyPlanView = {
  learnerId: string | null;
  // Authoritative operating mode; DIRECT_PARENT plans need no educator approval.
  mode: "direct_parent" | "centre_managed";
  planStatus: "none" | "preparing" | "ready" | "awaiting_educator";
  planGeneratedAt: string | null;
  rulesVersion: string | null;
  learnerName: string | null;
  grade: number | null;
  subject: string | null;
  educatorAssigned: boolean;
  state: DiagnosticState;
  activeSessionId: string | null;
  lastSubmittedSessionId: string | null;
  assessmentTitle: string | null;
  scorePct: number | null;
  strengths: StrengthArea[];
  focusAreas: FocusArea[];
  nextTopics: NextTopic[];
  canStartDiagnostic: boolean;
  generatedAt: string;
};

export type BreakdownEntry = { subtopic: string; correct: boolean };

export const MASTERY_THRESHOLD = 70;

export function aggregateBreakdown(
  breakdown: BreakdownEntry[],
): { code: string; correct: number; total: number; pct: number }[] {
  const by = new Map<string, { correct: number; total: number }>();
  for (const entry of breakdown) {
    const bucket = by.get(entry.subtopic) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (entry.correct) bucket.correct += 1;
    by.set(entry.subtopic, bucket);
  }
  return [...by.entries()]
    .map(([code, b]) => ({
      code,
      correct: b.correct,
      total: b.total,
      pct: b.total === 0 ? 0 : Math.round((b.correct / b.total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct || a.code.localeCompare(b.code));
}

export function severityOrder(severity: string): number {
  const s = severity.toLowerCase();
  if (s === "critical" || s === "high") return 3;
  if (s === "medium") return 2;
  return 1;
}

export function sortFocusAreas(areas: FocusArea[]): FocusArea[] {
  return [...areas].sort(
    (a, b) => severityOrder(b.severity) - severityOrder(a.severity) || a.pct - b.pct,
  );
}

// Human label for an outcome code when the curriculum title is available.
export function labelFor(code: string, titles: Map<string, string>): string {
  return titles.get(code) ?? code;
}
