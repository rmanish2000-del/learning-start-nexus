// CBSE past-paper (PYQ) intelligence — shared contract (browser-safe).
//
// The weights below are derived from the officially retrieved 2022-2026 CBSE
// Class 10 question papers by scripts/pyq/build_pattern_intelligence.py.
// No question text from those papers is stored, shipped or shown: EduOS keeps
// counts, mark weights and chapter attribution only, and practises learners on
// its own approved question bank shaped to the observed exam pattern.

import intelligence from "../../content/pyq/class10-pyq-intelligence.json";

export const PYQ_COHORTS = ["recent_2023_2026", "term_2022"] as const;
export type PyqCohort = (typeof PYQ_COHORTS)[number];

/** Only the 2023-2026 single-examination cohort drives blueprint weights. */
export const PYQ_BLUEPRINT_COHORT: PyqCohort = "recent_2023_2026";

export const PYQ_SUBJECTS = ["Mathematics", "Science"] as const;
export type PyqSubject = (typeof PYQ_SUBJECTS)[number];

export type PyqChapterPattern = {
  chapter: string;
  questions: number;
  marks: number;
  markShare: number;
  questionShare: number;
  byYear: Record<string, number>;
};

export type PyqSubjectPattern = {
  papersAnalysed: number;
  attributedQuestions: number;
  unattributedQuestions: number;
  chapters: PyqChapterPattern[];
  competencyMix: Record<string, number>;
  repeatedConcepts: Array<{ concept: string; occurrences: number }>;
};

export type PyqCohortPattern = {
  years: string[];
  format: string;
  usedForBlueprintWeights: boolean;
  pdfsInCohort: number;
  pdfsAnalysed: number;
  pdfsWithoutTextLayer: number;
  subjects: Record<string, PyqSubjectPattern>;
};

export type PyqIntelligence = {
  generatedFrom: string;
  academicYear: string;
  provenance: {
    archives: number;
    acceptedPdfs: number;
    quarantinedPdfs: number;
    quarantineReasons: string[];
  };
  cohorts: Record<string, PyqCohortPattern>;
};

export const PYQ_INTELLIGENCE = intelligence as unknown as PyqIntelligence;

export function pyqCohort(cohort: PyqCohort = PYQ_BLUEPRINT_COHORT): PyqCohortPattern | null {
  return PYQ_INTELLIGENCE.cohorts[cohort] ?? null;
}

export function pyqChapters(
  subject: PyqSubject,
  cohort: PyqCohort = PYQ_BLUEPRINT_COHORT,
): PyqChapterPattern[] {
  return pyqCohort(cohort)?.subjects[subject]?.chapters ?? [];
}

/** Exam mark share for one chapter, 0 when the chapter never appeared. */
export function pyqChapterWeight(
  subject: PyqSubject,
  chapter: string,
  cohort: PyqCohort = PYQ_BLUEPRINT_COHORT,
): number {
  const match = pyqChapters(subject, cohort).find(
    (c) => c.chapter.toLowerCase() === chapter.toLowerCase(),
  );
  return match?.markShare ?? 0;
}

/** Highest-yield chapters first — used for study-plan and tutor prioritisation. */
export function pyqPriorityChapters(subject: PyqSubject, limit = 5): PyqChapterPattern[] {
  return pyqChapters(subject).slice(0, limit);
}

/** Chapters that recur in every analysed year of the recent cohort. */
export function pyqRepeatedChapters(subject: PyqSubject): PyqChapterPattern[] {
  const years = pyqCohort()?.years ?? [];
  return pyqChapters(subject).filter((c) => years.every((y) => (c.byYear[y] ?? 0) > 0));
}

// Outcome codes encode the NCERT chapter number: Mathematics as LO_M<chapter>.x.x,
// Science as LO_<chapter>.x.x.x. Chapter names follow the NCERT Class 10 order.
export const NCERT_CHAPTERS: Record<PyqSubject, string[]> = {
  Mathematics: [
    "Real Numbers",
    "Polynomials",
    "Pair of Linear Equations in Two Variables",
    "Quadratic Equations",
    "Arithmetic Progressions",
    "Triangles",
    "Coordinate Geometry",
    "Introduction to Trigonometry",
    "Some Applications of Trigonometry",
    "Circles",
    "Areas Related to Circles",
    "Surface Areas and Volumes",
    "Statistics",
    "Probability",
  ],
  Science: [
    "Chemical Reactions and Equations",
    "Acids, Bases and Salts",
    "Metals and Non-metals",
    "Carbon and its Compounds",
    "Life Processes",
    "Control and Coordination",
    "How do Organisms Reproduce?",
    "Heredity",
    "Light \u2013 Reflection and Refraction",
    "The Human Eye and the Colourful World",
    "Electricity",
    "Magnetic Effects of Electric Current",
    "Our Environment",
  ],
};

export function chapterForOutcomeCode(code: string): string | null {
  const math = /^LO_M(\d+)\./.exec(code);
  if (math) return NCERT_CHAPTERS.Mathematics[Number(math[1]) - 1] ?? null;
  const science = /^LO_(\d+)\./.exec(code);
  if (science) return NCERT_CHAPTERS.Science[Number(science[1]) - 1] ?? null;
  return null;
}

export const PYQ_MODES = ["practice", "timed_paper"] as const;
export type PyqMode = (typeof PYQ_MODES)[number];

export const PYQ_TIMED_MINUTES = 45;
export const PYQ_PRACTICE_SIZE = 10;
export const PYQ_TIMED_SIZE = 20;

export type PyqPracticeItem = {
  id: string;
  chapter: string;
  outcomeCode: string;
  kind: string;
  difficulty: number;
  prompt: string;
  stimulus: string | null;
  options: string[] | null;
  /** Present only after submission. */
  correctAnswer?: string;
  explanation?: string | null;
  verificationTier?: string | null;
};

export type PyqSessionSummary = {
  id: string;
  subject: string;
  chapter: string | null;
  mode: PyqMode;
  status: "in_progress" | "submitted";
  scorePct: number | null;
  correctCount: number | null;
  totalCount: number | null;
  startedAt: string;
  submittedAt: string | null;
};

export type PyqWorkspace = {
  subject: PyqSubject;
  cohort: PyqCohort;
  chapters: PyqChapterPattern[];
  repeatedConcepts: Array<{ concept: string; occurrences: number }>;
  competencyMix: Record<string, number>;
  provenance: PyqIntelligence["provenance"];
  cohortMeta: { years: string[]; format: string; papersAnalysed: number };
  termCohortNote: string;
  availableByChapter: Array<{ chapter: string; available: number }>;
  history: PyqSessionSummary[];
  weakChapters: string[];
};

export const PYQ_TERM_2022_NOTE =
  "2022 used the two-term, 40-mark format. It is reported separately and never mixed into the 2023-2026 pattern weights.";

export function scorePct(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}
