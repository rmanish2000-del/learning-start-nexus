// Sprint 6D: shared types, labels, and validation for the Question Bank
// Engine. Client-safe — no server-only imports.
//
// Chain: Assessment Outcome → Question Bank → Difficulty → Answer Key →
// Explanation. This sprint ships no automatic assessment generation.

import { z } from "zod";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export type QuestionKind = "mcq" | "true_false" | "fill_blank" | "short_answer";
export type QuestionStatus = "draft" | "approved" | "retired";

export type QuestionDto = {
  id: string;
  outcomeId: string;
  kind: QuestionKind;
  difficulty: number; // 1–5
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string;
  status: QuestionStatus;
  source: "ai" | "manual";
  createdAt: string;
  updatedAt: string;
};

export type OutcomeBankDto = {
  id: string;
  code: string;
  title: string;
  bloomLevel: string;
  difficulty: number;
  diagnosticWeight: number;
  questionTypes: string[];
  questions: QuestionDto[];
  // Coverage summary for the chain view.
  counts: {
    total: number;
    approved: number;
    draft: number;
    byDifficulty: Record<number, number>;
  };
};

export type QuestionBankUnitDto = {
  id: string;
  title: string;
  position: number;
  outcomes: OutcomeBankDto[];
};

export type QuestionBankWorkspace = {
  book: {
    id: string;
    title: string;
    board: string | null;
    grade: number;
    subject: string;
    status: string;
  };
  units: QuestionBankUnitDto[];
  totals: {
    outcomes: number;
    outcomesWithQuestions: number;
    questions: number;
    approved: number;
  };
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const KIND_LABELS: Record<QuestionKind, string> = {
  mcq: "Multiple choice",
  true_false: "True / False",
  fill_blank: "Fill in the blank",
  short_answer: "Short answer",
};

export const STATUS_LABELS: Record<QuestionStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  retired: "Retired",
};

export const QB_DIFFICULTY_LABELS: Record<number, string> = {
  1: "Foundational",
  2: "Easy",
  3: "Moderate",
  4: "Challenging",
  5: "Advanced",
};

// The generation prompt contract, printed in the UI and audit center so the
// AI output shape is independently verifiable.
export const GENERATION_CONTRACT: string[] = [
  "Input: one assessment outcome (code, title, Bloom level, difficulty, question types) plus the book's grade and subject",
  "Output per question: kind, difficulty (1–5), prompt, options (MCQ only), answer key, explanation",
  "Every generated question lands as a DRAFT with source = ai — staff review and approve before use",
  "No assessments are assembled automatically in this sprint",
];

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const bankBookSchema = z.object({ bookId: z.string().uuid() });

export const outcomeBankSchema = z.object({ outcomeId: z.string().uuid() });

export const generateQuestionsSchema = z.object({
  outcomeId: z.string().uuid(),
  count: z.number().int().min(1).max(6),
});

export const questionIdSchema = z.object({ questionId: z.string().uuid() });

const questionCore = {
  kind: z.enum(["mcq", "true_false", "fill_blank", "short_answer"]),
  difficulty: z.number().int().min(1).max(5),
  prompt: z.string().trim().min(5, "Prompt is required").max(500),
  options: z.array(z.string().trim().min(1).max(200)).max(8).nullable(),
  correctAnswer: z.string().trim().min(1, "Answer key is required").max(300),
  explanation: z.string().trim().min(5, "Explanation is required").max(800),
};

export const createQuestionSchema = z.object({
  outcomeId: z.string().uuid(),
  ...questionCore,
});

export const updateQuestionSchema = z.object({
  questionId: z.string().uuid(),
  ...questionCore,
});

export const setQuestionStatusSchema = z.object({
  questionId: z.string().uuid(),
  status: z.enum(["draft", "approved", "retired"]),
});
