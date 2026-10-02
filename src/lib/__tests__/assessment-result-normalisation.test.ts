import { describe, expect, it } from "vitest";

import {
  normalizeResultEntries,
  summarizeResultEntries,
  type ItemKind,
  type ResultEntry,
} from "../assessment-shared";

const questions = [
  { id: "q1", subtopic: "LO_M1.1.1", kind: "mcq" as ItemKind, correct_answer: "2 x 3" },
  { id: "q2", subtopic: "LO_M1.1.2", kind: "numeric" as ItemKind, correct_answer: "12" },
  { id: "q3", subtopic: "LO_M1.1.2", kind: "short_answer" as ItemKind, correct_answer: "irrational" },
];

// Regression: the parent-diagnostic pipeline writes a DiagnosticReport object
// into assessment_sessions.result. The student runner used to call
// result.map(...) on it, which threw and rendered the generic error page for
// session b63963f9-344b-4a2d-89be-d4c9b73a919e.
const diagnosticReport = {
  gaps: [{ code: "LO_M1.1.1", severity: "high" }],
  outcomes: [{ code: "LO_M1.1.1", pct: 0 }],
  scorePct: 0,
  totalQuestions: 6,
  correctQuestions: 0,
};

describe("normalizeResultEntries", () => {
  it("re-derives review entries when result holds a diagnostic report object", () => {
    const entries = normalizeResultEntries(diagnosticReport, questions, { q1: "2 x 3", q2: "11" });
    expect(Array.isArray(entries)).toBe(true);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ item_id: "q1", correct: true });
    expect(entries[1]).toMatchObject({ item_id: "q2", correct: false, given: "11" });
    expect(entries[2]).toMatchObject({ item_id: "q3", correct: false, given: "" });
  });

  it("keeps a stored ResultEntry[] breakdown as-is", () => {
    const stored: ResultEntry[] = [
      { item_id: "q1", subtopic: "LO_M1.1.1", given: "2 x 3", correct_answer: "2 x 3", correct: true },
    ];
    expect(normalizeResultEntries(stored, questions, {})).toEqual(stored);
  });

  it("handles null, undefined, empty arrays and junk without throwing", () => {
    expect(normalizeResultEntries(null, questions, {})).toHaveLength(3);
    expect(normalizeResultEntries(undefined, questions, null)).toHaveLength(3);
    expect(normalizeResultEntries([], questions, {})).toHaveLength(3);
    expect(normalizeResultEntries("oops", questions, {})).toHaveLength(3);
    expect(normalizeResultEntries(diagnosticReport, [], {})).toEqual([]);
  });

  it("drops malformed entries mixed into a stored array", () => {
    const mixed = [{ nope: true }, { item_id: "q1", subtopic: "x", given: "", correct_answer: "y", correct: false }];
    expect(normalizeResultEntries(mixed, questions, {})).toHaveLength(1);
  });
});

describe("summarizeResultEntries", () => {
  it("prefers stored totals", () => {
    const entries = normalizeResultEntries(diagnosticReport, questions, { q1: "2 x 3" });
    expect(summarizeResultEntries(entries, { scorePct: 42, correct: 2, total: 6 })).toEqual({
      scorePct: 42,
      correct: 2,
      total: 6,
    });
  });

  it("recomputes when stored totals are missing", () => {
    const entries = normalizeResultEntries(diagnosticReport, questions, { q1: "2 x 3" });
    expect(summarizeResultEntries(entries, { scorePct: null, correct: null, total: null })).toEqual({
      scorePct: 33,
      correct: 1,
      total: 3,
    });
  });

  it("never divides by zero", () => {
    expect(summarizeResultEntries([])).toEqual({ scorePct: 0, correct: 0, total: 0 });
  });
});
