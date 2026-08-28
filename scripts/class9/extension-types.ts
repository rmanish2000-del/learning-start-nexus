// Wave 1 continuation: per-unit question-bank extensions.
//
// An extension may (a) append new topics (with their outcomes, atoms and
// questions) to an existing chapter of the unit, and (b) append extra
// questions to outcomes that already exist in scripts/class9/authoring.ts.
//
// Nothing here activates Class 9. All emitted questions remain draft +
// unverified, exactly like the Wave 1 baseline.

import type { AuthoredQuestion, AuthoredTopic } from "./authoring";

export type UnitExtension = {
  /** e.g. "C9-MAT-U1" — must match the unit position in authoring.ts. */
  unitId: string;
  /** New topics appended to the 1-based chapter position inside this unit. */
  newTopics: { chapter: number; topic: AuthoredTopic }[];
  /** outcomeId (e.g. "C9-MAT-U1-CH1-T1-O1") → additional questions. */
  extraQuestions: Record<string, AuthoredQuestion[]>;
};
