import { describe, expect, it } from "vitest";

import {
  MIN_QUESTIONS,
  actionsFor,
  isLegacyContent,
  publishBlockers,
  resolveState,
  unavailableReason,
} from "../assessment-lifecycle";

const base = {
  title: "Class 10 Mathematics checkpoint",
  subject: "Mathematics",
  grade: 10,
  board: "CBSE",
  questionCount: MIN_QUESTIONS,
  unverifiedCount: 0,
  duplicateCount: 0,
  timeLimitMinutes: 30,
  legacy: false,
};

describe("assessment state resolution", () => {
  it("treats a new assessment as a draft", () => {
    expect(resolveState({ status: "draft" })).toBe("draft");
  });

  it("distinguishes published from assigned", () => {
    expect(resolveState({ status: "published", assignedCount: 0 })).toBe("published");
    expect(resolveState({ status: "published", assignedCount: 3 })).toBe("assigned");
  });

  it("archives win over stored status", () => {
    expect(resolveState({ status: "published", archivedAt: "2026-01-01" })).toBe("archived");
  });
});

describe("allowed actions", () => {
  it("never allows assigning a draft, and explains why", () => {
    expect(actionsFor("draft")).not.toContain("assign");
    expect(unavailableReason("assign", "draft")).toMatch(/published/i);
  });

  it("allows assigning once published", () => {
    expect(actionsFor("published")).toContain("assign");
    expect(unavailableReason("assign", "published")).toBeNull();
  });
});

describe("publish gates", () => {
  it("passes a complete Class 10 assessment", () => {
    expect(publishBlockers(base)).toEqual([]);
  });

  it("blocks too few questions", () => {
    const codes = publishBlockers({ ...base, questionCount: 2 }).map((b) => b.code);
    expect(codes).toContain("min-questions");
  });

  it("blocks unverified and duplicate questions", () => {
    const codes = publishBlockers({ ...base, unverifiedCount: 1, duplicateCount: 2 }).map(
      (b) => b.code,
    );
    expect(codes).toEqual(expect.arrayContaining(["unverified", "duplicates"]));
  });

  it("blocks a missing duration and short title", () => {
    const codes = publishBlockers({ ...base, timeLimitMinutes: null, title: "x" }).map(
      (b) => b.code,
    );
    expect(codes).toEqual(expect.arrayContaining(["duration", "title"]));
  });

  it("blocks legacy pilot content out of scope", () => {
    const codes = publishBlockers({
      ...base,
      grade: 6,
      subject: "Mathematics",
      legacy: true,
    }).map((b) => b.code);
    expect(codes).toContain("scope");
  });
});

describe("legacy content detection", () => {
  it("flags Grade 6 fractions pilot data", () => {
    expect(isLegacyContent({ grade: 6, subject: "Mathematics", topic: "Fractions" })).toBe(true);
  });

  it("keeps CBSE Class 10 Mathematics and Science active", () => {
    expect(isLegacyContent({ grade: 10, subject: "Mathematics" })).toBe(false);
    expect(isLegacyContent({ grade: 10, subject: "Science" })).toBe(false);
  });

  it("flags demo rows", () => {
    expect(isLegacyContent({ grade: 10, subject: "Science", isDemo: true })).toBe(true);
  });
});
