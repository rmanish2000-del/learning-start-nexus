// Small deterministic builders shared by every Class 10 author module.

import type { Draft, NumericCheck, QuestionKind } from "./types";

const AR_OPTIONS = [
  "Both A and R are true and R is the correct explanation of A.",
  "Both A and R are true but R is not the correct explanation of A.",
  "A is true but R is false.",
  "A is false but R is true.",
] as const;

export type ARVerdict = "A_R_TRUE_R_EXPLAINS" | "A_R_TRUE_R_DOES_NOT_EXPLAIN" | "A_TRUE_R_FALSE" | "A_FALSE_R_TRUE";

const AR_INDEX: Record<ARVerdict, number> = {
  A_R_TRUE_R_EXPLAINS: 0,
  A_R_TRUE_R_DOES_NOT_EXPLAIN: 1,
  A_TRUE_R_FALSE: 2,
  A_FALSE_R_TRUE: 3,
};

/** Deterministic rotation so the key is not always option A. */
function rotate<T>(items: T[], by: number): T[] {
  const n = items.length;
  const k = ((by % n) + n) % n;
  return [...items.slice(n - k), ...items.slice(0, n - k)];
}

export function sa(
  templateId: string,
  difficulty: number,
  prompt: string,
  correctAnswer: string,
  explanation: string,
  marks = 2,
  numericCheck?: NumericCheck,
): Draft {
  return {
    templateId,
    kind: "short_answer",
    difficulty,
    prompt,
    correctAnswer,
    explanation,
    marks,
    ...(numericCheck ? { numericCheck } : {}),
  };
}

export function mc(
  templateId: string,
  difficulty: number,
  prompt: string,
  correct: string,
  distractors: string[],
  explanation: string,
  rotateBy: number,
  marks = 1,
  numericCheck?: NumericCheck,
  kind: QuestionKind = "mcq",
): Draft {
  const options = rotate([correct, ...distractors], rotateBy);
  return {
    templateId,
    kind,
    difficulty,
    prompt,
    options,
    correctAnswer: correct,
    explanation,
    marks,
    ...(numericCheck ? { numericCheck } : {}),
  };
}

export function tf(templateId: string, difficulty: number, statement: string, isTrue: boolean, explanation: string): Draft {
  return {
    templateId,
    kind: "true_false",
    difficulty,
    prompt: `State whether the following is true or false, and justify in one line: ${statement}`,
    options: ["True", "False"],
    correctAnswer: isTrue ? "True" : "False",
    explanation,
    marks: 1,
  };
}

export function ar(
  templateId: string,
  difficulty: number,
  assertion: string,
  reason: string,
  verdict: ARVerdict,
  explanation: string,
): Draft {
  return {
    templateId,
    kind: "assertion_reason",
    difficulty,
    prompt: `Assertion (A): ${assertion}\nReason (R): ${reason}\nChoose the correct option.`,
    options: [...AR_OPTIONS],
    correctAnswer: AR_OPTIONS[AR_INDEX[verdict]],
    explanation,
    marks: 1,
  };
}

export function cs(
  templateId: string,
  difficulty: number,
  stimulus: string,
  question: string,
  correctAnswer: string,
  explanation: string,
  marks = 3,
  numericCheck?: NumericCheck,
): Draft {
  return {
    templateId,
    kind: "case_study",
    difficulty,
    prompt: `${stimulus}\n\n${question}`,
    correctAnswer,
    explanation,
    marks,
    ...(numericCheck ? { numericCheck } : {}),
  };
}

export function di(
  templateId: string,
  difficulty: number,
  table: string,
  question: string,
  correctAnswer: string,
  explanation: string,
  marks = 3,
  numericCheck?: NumericCheck,
): Draft {
  return {
    templateId,
    kind: "data_interpretation",
    difficulty,
    prompt: `${table}\n\n${question}`,
    correctAnswer,
    explanation,
    marks,
    ...(numericCheck ? { numericCheck } : {}),
  };
}

export function fb(templateId: string, difficulty: number, prompt: string, correctAnswer: string, explanation: string): Draft {
  return { templateId, kind: "fill_blank", difficulty, prompt, correctAnswer, explanation, marks: 1 };
}

// --- arithmetic helpers used by the authors (answers are computed, not typed) --

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
