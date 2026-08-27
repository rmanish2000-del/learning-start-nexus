// Free Learning Check — pure, client-safe contracts.
//
// The free check is a five-question, no-payment taste of the ₹199 diagnostic.
// It is answered by the learner in the Student workspace and summarised for the
// parent as a deliberately limited preview. Nothing here performs I/O.

import { z } from "zod";

/** Five approved + verified questions. Never more: the paid diagnostic is 20. */
export const FREE_CHECK_QUESTION_COUNT = 5;

export const FREE_CHECK_SUBJECTS = ["Mathematics", "Science"] as const;
export type FreeCheckSubject = (typeof FREE_CHECK_SUBJECTS)[number];

export const startFreeCheckSchema = z.object({
  learnerId: z.string().uuid(),
  subject: z.enum(FREE_CHECK_SUBJECTS),
});

export const freeCheckIdSchema = z.object({ checkId: z.string().uuid() });

export const freeCheckAnswerSchema = z.object({
  checkId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: z.string().max(2000),
  position: z.number().int().min(0).max(FREE_CHECK_QUESTION_COUNT),
});

export type FreeCheckQuestion = {
  id: string;
  kind: string;
  prompt: string;
  stimulus: string | null;
  options: string[] | null;
  outcomeCode: string;
};

/** What the answering learner sees. Correct answers never cross this line. */
export type FreeCheckRun = {
  checkId: string;
  learnerName: string;
  subject: string;
  unitTitle: string;
  status: "in_progress" | "submitted";
  currentPosition: number;
  answers: Record<string, string>;
  questions: FreeCheckQuestion[];
};

export type FreeCheckSkill = {
  code: string;
  title: string;
  correct: boolean;
};

/** The parent-facing preview: limited on purpose, and clearly labelled. */
export type FreeCheckPreview = {
  checkId: string;
  learnerId: string;
  learnerName: string;
  subject: string;
  unitTitle: string;
  status: "in_progress" | "submitted";
  totalQuestions: number;
  answeredCount: number;
  scorePct: number | null;
  correctCount: number | null;
  skills: FreeCheckSkill[];
  possibleGaps: { code: string; title: string }[];
  sampleRecommendation: string | null;
  submittedAt: string | null;
};

export type FreeCheckStatus = {
  subject: FreeCheckSubject;
  available: boolean;
  check: FreeCheckPreview | null;
};

/**
 * What the ₹199 diagnostic adds over the free check. Kept here so the parent
 * portal, the preview screen and the upgrade copy can never drift apart.
 */
export const FREE_VS_PAID: { free: string; paid: string }[] = [
  { free: "5 questions from one chapter group", paid: "20 questions across the whole chapter group" },
  { free: "Skills checked, shown pass/fail", paid: "Outcome-by-outcome mastery bands" },
  { free: "One sample recommendation", paid: "Full prioritised intervention plan" },
  { free: "No marks estimate", paid: "Estimated board marks at risk" },
  { free: "Preview only", paid: "Shareable parent report and AI study plan" },
];
