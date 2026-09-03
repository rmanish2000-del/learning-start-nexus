import { describe, expect, it } from "vitest";

import {
  chapterForOutcomeCode,
  NCERT_CHAPTERS,
  PYQ_BLUEPRINT_COHORT,
  PYQ_INTELLIGENCE,
  pyqChapterWeight,
  pyqChapters,
  pyqCohort,
  scorePct,
} from "../pyq-shared";
import {
  AUTO_VERIFICATION_ENGINE_VERSION,
  decide,
  detectDuplicates,
  poolOf,
  runChecks,
  verifyCorpus,
  type AutoVerificationItem,
} from "../auto-verification-shared";
import { selectBlueprintItems } from "../pyq.server";

describe("PYQ intelligence provenance", () => {
  it("keeps the 2022 term papers out of the blueprint cohort", () => {
    expect(PYQ_BLUEPRINT_COHORT).toBe("recent_2023_2026");
    expect(pyqCohort("recent_2023_2026")?.years).toEqual(["2023", "2024", "2025", "2026"]);
    expect(pyqCohort("term_2022")?.usedForBlueprintWeights).toBe(false);
  });

  it("records the quarantined Mathematics Basic contamination", () => {
    expect(PYQ_INTELLIGENCE.provenance.quarantinedPdfs).toBeGreaterThan(0);
    expect(PYQ_INTELLIGENCE.provenance.quarantineReasons).toContain("MATHEMATICS_BASIC_241");
  });

  it("derives weights for both subjects that sum to a share of 1", () => {
    for (const subject of ["Mathematics", "Science"] as const) {
      const chapters = pyqChapters(subject);
      expect(chapters.length).toBeGreaterThan(0);
      const total = chapters.reduce((sum, c) => sum + c.markShare, 0);
      expect(total).toBeGreaterThan(0.9);
      expect(total).toBeLessThanOrEqual(1.001);
    }
  });
});

describe("outcome code to NCERT chapter mapping", () => {
  it("maps Mathematics outcome codes", () => {
    expect(chapterForOutcomeCode("LO_M1.1.1")).toBe("Real Numbers");
    expect(chapterForOutcomeCode("LO_M14.1.1")).toBe("Probability");
  });

  it("maps Science outcome codes", () => {
    expect(chapterForOutcomeCode("LO_2.1.1.1")).toBe("Acids, Bases and Salts");
    expect(chapterForOutcomeCode("LO_11.1.1.1")).toBe("Electricity");
  });

  it("returns null for unmappable codes", () => {
    expect(chapterForOutcomeCode("LO_M99.1.1")).toBeNull();
    expect(chapterForOutcomeCode("nonsense")).toBeNull();
  });

  it("covers the full NCERT chapter lists", () => {
    expect(NCERT_CHAPTERS.Mathematics).toHaveLength(14);
    expect(NCERT_CHAPTERS.Science).toHaveLength(13);
  });
});

type Row = Parameters<typeof selectBlueprintItems>[0][number];

function row(id: string, code: string): Row {
  return {
    id,
    kind: "mcq",
    difficulty: 2,
    prompt: `Prompt ${id}`,
    stimulus: null,
    options: ["a", "b"],
    correct_answer: "a",
    explanation: "because",
    verification_tier: "eduos_automated",
    assessment_outcomes: { code, title: "t" },
  } as Row;
}

describe("blueprint-weighted selection", () => {
  const rows = [
    ...Array.from({ length: 20 }, (_, i) => row(`m1-${i}`, "LO_M1.1.1")),
    ...Array.from({ length: 20 }, (_, i) => row(`m14-${i}`, "LO_M14.1.1")),
  ];

  it("returns the requested number of items", () => {
    expect(selectBlueprintItems(rows, "Mathematics", 10, null)).toHaveLength(10);
  });

  it("restricts a chapter run to that chapter", () => {
    const picked = selectBlueprintItems(rows, "Mathematics", 5, "Probability");
    expect(picked).toHaveLength(5);
    expect(picked.every((r) => r.id.startsWith("m14-"))).toBe(true);
  });

  it("never exceeds the available pool", () => {
    expect(selectBlueprintItems(rows.slice(0, 3), "Mathematics", 10, null)).toHaveLength(3);
  });

  it("gives no weight to a chapter absent from the papers", () => {
    expect(pyqChapterWeight("Mathematics", "Not A Chapter")).toBe(0);
  });
});

const item: AutoVerificationItem = {
  id: "00000000-0000-0000-0000-000000000001",
  subject: "Mathematics",
  externalRef: "C10-2627-MATH-REQ001-DIAG-001",
  kind: "mcq",
  difficulty: 2,
  prompt: "Using prime factorisation, find the HCF of 96 and 404.",
  stimulus: null,
  options: ["12", "4", "2", "8"],
  correctAnswer: "4",
  explanation:
    "96 = 2^5 x 3 and 404 = 2^2 x 101, so the common factors give an HCF of 2^2 = 4.",
  outcomeCode: "LO_M1.1.1",
  unitTitle: "Number Systems",
  chapterTitle: "Real Numbers",
};

const clean = { duplicateOf: null, crossPoolDuplicate: false, contaminated: false };

describe("automated verification engine", () => {
  it("auto-approves a well-formed, well-evidenced item", () => {
    const verdict = decide(item, runChecks(item, clean));
    expect(verdict.outcome).toBe("auto_approved");
    expect(verdict.confidence).toBeGreaterThan(0.8);
  });

  it("holds an item whose answer is not among the options", () => {
    const bad = { ...item, correctAnswer: "7" };
    expect(decide(bad, runChecks(bad, clean)).outcome).toBe("quarantined");
  });

  it("holds an item with a thin explanation", () => {
    const bad = { ...item, explanation: "4." };
    expect(decide(bad, runChecks(bad, clean)).outcome).toBe("quarantined");
  });

  it("holds a copyright-contaminated item", () => {
    const checks = runChecks(item, { ...clean, contaminated: true });
    expect(decide(item, checks).outcome).toBe("quarantined");
  });

  it("holds a duplicate and reports the twin", () => {
    const checks = runChecks(item, { ...clean, duplicateOf: "other-id" });
    const verdict = decide(item, checks);
    expect(verdict.outcome).toBe("quarantined");
    expect(checks.some((c) => c.checkId === "DUPLICATE" && c.verdict === "fail")).toBe(true);
  });

  it("detects cross-pool duplication between diagnostic and reassessment", () => {
    const twin: AutoVerificationItem = {
      ...item,
      id: "00000000-0000-0000-0000-000000000002",
      externalRef: "C10-2627-MATH-REQ001-REASS-001",
    };
    const dupes = detectDuplicates([item, twin]);
    expect(dupes.get(twin.id)?.crossPool).toBe(true);
  });

  it("reads the pool from the external reference", () => {
    expect(poolOf("C10-2627-MATH-REQ001-DIAG-001")).toBe("DIAGNOSTIC");
    expect(poolOf("C10-2627-MATH-REQ001-REASS-001")).toBe("REASSESSMENT");
    expect(poolOf(null)).toBe("UNKNOWN");
  });

  it("verifies a corpus and stamps the engine version", () => {
    const verdicts = verifyCorpus([item], new Set());
    expect(verdicts).toHaveLength(1);
    expect(AUTO_VERIFICATION_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("scorePct", () => {
  it("rounds and handles the empty case", () => {
    expect(scorePct(3, 4)).toBe(75);
    expect(scorePct(0, 0)).toBe(0);
  });
});
