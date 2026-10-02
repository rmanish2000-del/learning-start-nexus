// Class 10 (2026-27) draft question generation — shared contracts.
//
// Everything here is pure and deterministic: the same inputs always produce the
// same 326 items, byte for byte. Nothing in this pipeline marks an item
// approved, verified or eligible — that is a named subject expert's act.

export type Pool = "DIAGNOSTIC" | "FRESH_REASSESSMENT";

export type QuestionKind =
  | "mcq"
  | "true_false"
  | "fill_blank"
  | "short_answer"
  | "case_study"
  | "assertion_reason"
  | "data_interpretation"
  | "applied_mcq";

/** A numeric claim the validator recomputes from first principles. */
export type NumericCheck = {
  /** Named recomputation routine implemented independently in the validator. */
  fn: string;
  args: number[];
  expect: number;
  tolerance?: number;
};

/** What an author function returns; mapping metadata is attached afterwards. */
export type Draft = {
  templateId: string;
  kind: QuestionKind;
  /** 1..5, matching question_bank.difficulty. */
  difficulty: number;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  marks: number;
  numericCheck?: NumericCheck;
  /** Free-text note when the item deliberately stops short of excluded scope. */
  scopeNote?: string;
};

export type GeneratedItem = Draft & {
  externalRef: string;
  board: "CBSE";
  classLevel: 10;
  academicYear: "2026-27";
  subject: "Mathematics" | "Science";
  officialRequirementIds: string[];
  officialSourceReference: string | null;
  bookId: string;
  unitId: string;
  unitTitle: string;
  chapterId: string | null;
  chapterTitle: string | null;
  topicId: string | null;
  topicTitle: string | null;
  outcomeId: string;
  outcomeCode: string;
  outcomeTitle: string;
  /** curriculum_outcomes row — the learning atom. Never invented. */
  atomId: string | null;
  atomStatus: "MAPPED" | "ATOM_MAPPING_REQUIRED";
  pool: Pool;
  scoringRule: string;
  sourceAlignment: string;
  originality: string;
  batch: string;
  status: "draft";
  verificationState: "unverified";
  reviewQueue: "MATHEMATICS_EXPERT_REVIEW" | "SCIENCE_EXPERT_REVIEW";
  reviewStatus: "REVIEW_PENDING";
  reviewerId: null;
  reviewerName: null;
  reviewedAt: null;
  generationMethod: string;
  generatedAt: string;
};

export const GENERATION_METHOD =
  "deterministic-template-authoring/1.0.0 (scripts/class10/gen) — original items, answers computed in code";

export const ORIGINALITY_DECLARATION =
  "Original item authored from the outcome statement. Not copied from NCERT textbook exercises, CBSE sample papers, board papers, exemplars or any commercial bank.";

/** Named author: outcome code -> pool -> ordered drafts. */
export type OutcomeAuthor = {
  outcomeCode: string;
  diagnostic: Draft[];
  reassessment: Draft[];
};

export function mcqOptions(correct: string, distractors: string[]): { options: string[]; correctAnswer: string } {
  const options = [correct, ...distractors];
  return { options, correctAnswer: correct };
}

export function num(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const r = Math.round(n * 1000) / 1000;
  return String(r);
}
