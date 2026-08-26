// Sprint 6D: shared types, labels, and validation for the Question Bank
// Engine. Client-safe — no server-only imports.
//
// Chain: Assessment Outcome → Question Bank → Difficulty → Answer Key →
// Explanation. This sprint ships no automatic assessment generation.

import { z } from "zod";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export type QuestionKind =
  | "mcq"
  | "true_false"
  | "fill_blank"
  | "short_answer"
  // M7: CBSE competency-based types
  | "case_study"
  | "assertion_reason"
  | "data_interpretation"
  | "applied_mcq";
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
  // M7: shared passage / data table / assertion-reason pair
  stimulus: string | null;
  // M8: reviewer verification
  verificationState: "unverified" | "verified" | "rejected";
  verifiedAt: string | null;
  verificationNote: string | null;
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
  case_study: "Case Study",
  assertion_reason: "Assertion\u2013Reason",
  data_interpretation: "Data Interpretation",
  applied_mcq: "Applied MCQ",
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
  "Competency types must clear the quality gate: original scenarios, causal Assertion\u2013Reason pairs, 3+ data points with units, and novel transfer contexts \u2014 weak sets are auto-regenerated once, never stored",
];

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const bankBookSchema = z.object({ bookId: z.string().uuid() });

export const outcomeBankSchema = z.object({ outcomeId: z.string().uuid() });

export const generateQuestionsSchema = z.object({
  outcomeId: z.string().uuid(),
  count: z.number().int().min(1).max(6),
  // M7: optional CBSE competency style for the whole generated set.
  style: z
    .enum(["auto", "case_study", "assertion_reason", "data_interpretation", "applied_mcq"])
    .optional(),
});

export const questionIdSchema = z.object({ questionId: z.string().uuid() });

const questionCore = {
  kind: z.enum([
    "mcq",
    "true_false",
    "fill_blank",
    "short_answer",
    "case_study",
    "assertion_reason",
    "data_interpretation",
    "applied_mcq",
  ]),
  stimulus: z.string().trim().max(1500).nullable().optional(),
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

// ---------------------------------------------------------------------------
// Batch generation (all outcomes in a book / unit in one action)
// ---------------------------------------------------------------------------

export const batchGenerateSchema = z.object({
  bookId: z.string().uuid(),
  // null / omitted = every unit in the book.
  unitId: z.string().uuid().nullable().optional(),
  perOutcome: z.number().int().min(1).max(6),
  style: z
    .enum(["auto", "case_study", "assertion_reason", "data_interpretation", "applied_mcq"])
    .optional(),
  // Skip outcomes that already have at least this many questions (0 = never skip).
  skipIfAtLeast: z.number().int().min(0).max(50).optional(),
});

export type BatchOutcomeResult = {
  outcomeId: string;
  code: string;
  title: string;
  unitTitle: string;
  before: number;
  requested: number;
  inserted: number;
  status: "generated" | "skipped" | "failed";
  error: string | null;
  latencyMs: number | null;
};

export type BatchGenerationReport = {
  bookTitle: string;
  unitTitle: string | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  totals: {
    outcomes: number;
    generated: number;
    skipped: number;
    failed: number;
    questionsInserted: number;
  };
  coverage: {
    outcomesWithQuestionsBefore: number;
    outcomesWithQuestionsAfter: number;
    coveragePctBefore: number;
    coveragePctAfter: number;
    questionsBefore: number;
    questionsAfter: number;
  };
  results: BatchOutcomeResult[];
};
