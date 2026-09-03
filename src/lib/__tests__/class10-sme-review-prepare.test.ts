import { describe, expect, it } from "vitest";

import { isOfficialHost } from "../../../scripts/compliance/retrieve-missing-sources";
import {
  evaluateNumericCheck,
  findDuplicates,
  jaccard,
  normalisePrompt,
  POOLS,
  validateItem,
  type RegisterItem,
} from "../../../scripts/class10/sme-review-prepare";

const base: RegisterItem = {
  externalRef: "C10-2627-MATH-REQ001-DIAG-001",
  subject: "Mathematics",
  kind: "mcq",
  difficulty: 2,
  prompt: "Using prime factorisation, find the HCF of 96 and 404.",
  options: ["12", "4", "2", "8"],
  correctAnswer: "4",
  explanation: "96 = 2^5 x 3 and 404 = 2^2 x 101, so the HCF is 2^2 = 4.",
  marks: 1,
  pool: "DIAGNOSTIC",
  officialRequirementIds: ["REQ_MATH_2026_001"],
  officialSourceReference: "Maths_SecP1X_2026-27.pdf Page 2",
  unitId: "u",
  unitTitle: "Number Systems",
  chapterId: "c",
  chapterTitle: "Real Numbers",
  topicId: "t",
  topicTitle: "Fundamental Theorem of Arithmetic",
  outcomeId: "o",
  outcomeCode: "LO_M1.1.1",
  outcomeTitle: "HCF and LCM by prime factorisation",
  atomId: "a",
  atomStatus: "MAPPED",
  numericCheck: { fn: "gcd", args: [96, 404], expect: 4 },
};

describe("official domain allowlist", () => {
  it("accepts only CBSE and NCERT hosts", () => {
    expect(isOfficialHost("https://cbseacademic.nic.in/x.pdf")).toBe(true);
    expect(isOfficialHost("https://ncert.nic.in/x.pdf")).toBe(true);
    expect(isOfficialHost("https://cbse.gov.in/x.pdf")).toBe(true);
  });

  it("rejects unofficial and look-alike hosts", () => {
    expect(isOfficialHost("https://byjus.com/cbse/x.pdf")).toBe(false);
    expect(isOfficialHost("https://ncert.nic.in.evil.example/x.pdf")).toBe(false);
    expect(isOfficialHost("not a url")).toBe(false);
  });
});

describe("numeric assertion recomputation", () => {
  it("confirms a correct gcd assertion", () => {
    expect(evaluateNumericCheck({ fn: "gcd", args: [96, 404], expect: 4 })).toBe(true);
  });

  it("rejects a wrong lcm assertion", () => {
    expect(evaluateNumericCheck({ fn: "lcm", args: [4, 6], expect: 24 })).toBe(false);
  });

  it("reports unsupported functions as not machine-checked", () => {
    expect(evaluateNumericCheck({ fn: "quadratic_roots", args: [1, 2], expect: 3 })).toBeNull();
  });
});

describe("validateItem", () => {
  it("passes a well-formed draft with no blockers", () => {
    expect(validateItem(base).filter((f) => f.severity === "BLOCKER")).toEqual([]);
  });

  it("blocks an answer that is not among the options", () => {
    const f = validateItem({ ...base, correctAnswer: "7" });
    expect(f.some((x) => x.checkId === "ANSWER_NOT_IN_OPTIONS" && x.severity === "BLOCKER")).toBe(true);
  });

  it("blocks a missing curriculum mapping", () => {
    const f = validateItem({ ...base, outcomeId: null });
    expect(f.some((x) => x.checkId === "CURRICULUM_MAPPING" && x.severity === "BLOCKER")).toBe(true);
  });

  it("blocks an unknown pool and accepts the three valid pools", () => {
    expect(validateItem({ ...base, pool: "MIXED" }).some((x) => x.checkId === "POOL_INVALID")).toBe(true);
    for (const pool of POOLS) {
      expect(validateItem({ ...base, pool }).some((x) => x.checkId === "POOL_INVALID")).toBe(false);
    }
  });

  it("blocks a numeric assertion that disagrees with the answer", () => {
    const f = validateItem({ ...base, numericCheck: { fn: "gcd", args: [96, 404], expect: 8 } });
    expect(f.some((x) => x.checkId === "NUMERIC_CHECK" && x.severity === "BLOCKER")).toBe(true);
  });

  it("accepts a case study whose context is embedded in the prompt", () => {
    const f = validateItem({
      ...base,
      kind: "case_study",
      marks: 3,
      options: null,
      scoringRule: "1 mark for the method, 2 for the value.",
      prompt: "A florist has 84 roses and 126 lilies.\n\nWhat is the greatest bunch size?",
    });
    expect(f.some((x) => x.checkId === "STIMULUS_MISSING")).toBe(false);
    expect(f.some((x) => x.checkId === "STIMULUS_EMBEDDED" && x.severity === "WARNING")).toBe(true);
  });

  it("blocks a case study with no context at all", () => {
    const f = validateItem({ ...base, kind: "case_study", marks: 3, options: null, scoringRule: "r", prompt: "Find it." });
    expect(f.some((x) => x.checkId === "STIMULUS_MISSING" && x.severity === "BLOCKER")).toBe(true);
  });
});

describe("duplicate detection", () => {
  it("normalises unicode notation before comparison", () => {
    expect(normalisePrompt("Find the HCF of 96 \u2212 4")).toBe("find the hcf of 96 - 4");
  });

  it("scores identical token sets as 1", () => {
    expect(jaccard(["a", "b"], ["b", "a"])).toBe(1);
  });

  it("groups exact duplicates and flags near duplicates", () => {
    const a = { ...base, externalRef: "A", prompt: "Find the HCF of 96 and 404." };
    const b = { ...base, externalRef: "B", prompt: "find  the HCF of 96 and 404." };
    const c = { ...base, externalRef: "C", prompt: "Please find the HCF of 96 and 404." };
    const result = findDuplicates([a, b, c]);
    expect(result.exactGroups).toHaveLength(1);
    expect(result.near.some((p) => p.a === "A" && p.b === "C")).toBe(true);
  });
});
