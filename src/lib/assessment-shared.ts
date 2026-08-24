// Shared assessment-engine types and pure scoring logic.
// Sprint 6R: the runner also serves curriculum-pipeline questions
// (question_bank via assessment_question_map) — kinds widened accordingly.
// Browser-safe: no server-only imports.

export type ItemKind = "mcq" | "numeric" | "true_false" | "fill_blank" | "short_answer";

export type AssessmentItem = {
  id: string;
  org_id: string;
  grade: number;
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: number; // 1–3
  kind: ItemKind;
  prompt: string;
  options: string[] | null;
  correct_answer: string; // stripped for students before submission (see stripAnswers)
  explanation: string | null;
  sort_order?: number;
  points?: number;
};

export type Assessment = {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  subject: string;
  topic: string;
  grade: number;
  kind: string;
  status: "draft" | "published" | "archived";
  time_limit_minutes: number | null;
  created_at: string;
};

export type SessionStatus = "assigned" | "in_progress" | "submitted";

export type AssessmentSession = {
  id: string;
  org_id: string;
  assessment_id: string;
  learner_id: string;
  assigned_by: string | null;
  status: SessionStatus;
  answers: Record<string, string>;
  current_position: number;
  score_pct: number | null;
  correct_count: number | null;
  total_count: number | null;
  result: ResultEntry[] | null;
  due: string | null;
  started_at: string | null;
  last_activity_at: string | null;
  submitted_at: string | null;
  created_at: string;
};

export type ResultEntry = {
  item_id: string;
  subtopic: string;
  given: string;
  correct_answer: string;
  correct: boolean;
};

// The question shape the student runner actually needs. Both pipelines
// (legacy assessment_items, curriculum question_bank) are mapped into this.
export type RunnerQuestion = {
  id: string;
  subtopic: string; // legacy subtopic label, or the outcome code for curriculum questions
  difficulty: number;
  kind: ItemKind;
  prompt: string;
  options: string[] | null;
  correct_answer: string; // stripped for students before submission (see stripAnswers)
  explanation: string | null;
  sort_order: number;
  points: number;
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Foundational",
  2: "Core",
  3: "Stretch",
  4: "Advanced",
  5: "Mastery",
};

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

// Automatic scoring: numeric answers compare as numbers with a small
// tolerance (any kind — a bank question may carry a numeric key); everything
// else falls back to normalized string equality.
export function gradeAnswer(
  item: { kind: ItemKind; correct_answer: string },
  given: string | undefined,
): boolean {
  if (!given || !given.trim()) return false;
  const g = Number(given);
  const c = Number(item.correct_answer);
  if (Number.isFinite(g) && Number.isFinite(c) && item.correct_answer.trim() !== "") {
    return Math.abs(g - c) < 0.0001;
  }
  return normalizeAnswer(given) === normalizeAnswer(item.correct_answer);
}

export function scoreItems(
  items: { id: string; subtopic: string; kind: ItemKind; correct_answer: string }[],
  answers: Record<string, string>,
): { scorePct: number; correctCount: number; totalCount: number; breakdown: ResultEntry[] } {
  const breakdown: ResultEntry[] = items.map((item) => {
    const given = (answers[item.id] ?? "").trim();
    return {
      item_id: item.id,
      subtopic: item.subtopic,
      given,
      correct_answer: item.correct_answer,
      correct: gradeAnswer(item, given),
    };
  });
  const correctCount = breakdown.filter((b) => b.correct).length;
  const totalCount = breakdown.length;
  const scorePct = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);
  return { scorePct, correctCount, totalCount, breakdown };
}

// Subtopic strengths/gaps used for the generated evidence note.
export function summarizeBreakdown(breakdown: ResultEntry[]): { strong: string[]; needs: string[] } {
  const bySubtopic = new Map<string, { total: number; correct: number }>();
  for (const entry of breakdown) {
    const bucket = bySubtopic.get(entry.subtopic) ?? { total: 0, correct: 0 };
    bucket.total += 1;
    if (entry.correct) bucket.correct += 1;
    bySubtopic.set(entry.subtopic, bucket);
  }
  const strong: string[] = [];
  const needs: string[] = [];
  for (const [subtopic, bucket] of bySubtopic) {
    (bucket.correct === bucket.total ? strong : needs).push(subtopic);
  }
  return { strong, needs };
}
