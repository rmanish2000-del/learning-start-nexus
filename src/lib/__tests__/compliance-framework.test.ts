import { describe, expect, it } from "vitest";
import {
  analyseImpact,
  activationBlocked,
  canTransition,
  classifyQuestionRollover,
  deriveComplianceStatus,
  diffCurriculum,
  requiredVerifiedPerUnit,
  runComplianceGates,
  sourceManifestSchema,
  validateSnapshot,
  validateSourceRegistry,
  validateVersionSet,
  type CurriculumSnapshot,
  type GateInput,
  type SnapshotNode,
  type SourceRecord,
} from "../compliance-shared";
import manifestJson from "../../../content/compliance/cbse-2026-27.sources.json";

const source = (over: Partial<SourceRecord> = {}): SourceRecord => ({
  id: "S1",
  board: "CBSE",
  classLevel: 10,
  subject: "Mathematics",
  academicSession: "2026-27",
  authority: "CBSE",
  sourceType: "subject_syllabus",
  documentTitle: "Syllabus",
  documentVersion: "1",
  edition: null,
  publishedOn: null,
  effectiveFrom: null,
  effectiveTo: null,
  officialUrl: null,
  retrievedAt: "2026-08-28",
  checksum: "a".repeat(64),
  checksumAlgorithm: "sha256",
  status: "final",
  supersedesId: null,
  supersededById: null,
  applicability: "applicable",
  reviewerNote: "",
  evidenceRef: null,
  ...over,
});

const manifest = (sources: SourceRecord[]) => ({ manifestVersion: "1", generatedAt: "2026-08-28", authorityOrder: ["CBSE"], sources });

describe("source registry", () => {
  it("accepts a complete, checksummed official source", () => {
    expect(validateSourceRegistry(manifest([source()]))).toEqual([]);
  });

  it("rejects an applicable final source without a checksum", () => {
    const issues = validateSourceRegistry(manifest([source({ checksum: null, checksumAlgorithm: null })]));
    expect(issues.map((i) => i.code)).toContain("CHECKSUM_MISSING");
  });

  it("rejects draft documents marked applicable and recalled documents still in force", () => {
    const issues = validateSourceRegistry(
      manifest([source({ status: "draft" }), source({ id: "S2", status: "recalled", applicability: "applicable" })]),
    );
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(["DRAFT_FINAL_CONFUSION", "RECALLED_STILL_APPLICABLE"]));
  });

  it("rejects dangling and self-referential supersession", () => {
    const issues = validateSourceRegistry(manifest([source({ supersedesId: "ghost" }), source({ id: "S2", supersedesId: "S2" })]));
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(["DANGLING_SUPERSEDES", "SUPERSESSION_CYCLE"]));
  });

  it("keeps the committed CBSE manifest schema-valid and free of errors", () => {
    const parsed = sourceManifestSchema.parse(manifestJson);
    const issues = validateSourceRegistry(parsed);
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
    // Every source is still pending retrieval, so no COMPLIANT verdict is possible.
    expect(issues.every((i) => i.code === "SOURCE_PENDING_CONFIRMATION")).toBe(true);
  });
});

describe("academic-year versioning", () => {
  it("is forward-only and terminal at ARCHIVED", () => {
    expect(canTransition("APPROVED", "ACTIVE")).toBe(true);
    expect(canTransition("ACTIVE", "APPROVED")).toBe(false);
    expect(canTransition("DRAFT", "ACTIVE")).toBe(false);
    expect(canTransition("ARCHIVED", "DRAFT")).toBe(false);
  });

  it("permits only one ACTIVE version per board/class/subject", () => {
    const base = { board: "CBSE", classLevel: 10, subject: "Science", sourceVersion: "v1", supersedesVersion: null, supersededByVersion: null } as const;
    const issues = validateVersionSet([
      { ...base, academicSession: "2025-26", curriculumVersion: 1, state: "ACTIVE", activatedAt: "2025-04-01" },
      { ...base, academicSession: "2026-27", curriculumVersion: 2, state: "ACTIVE", activatedAt: "2026-04-01" },
    ]);
    expect(issues.map((i) => i.code)).toContain("MULTIPLE_ACTIVE_VERSIONS");
  });

  it("refuses to lose history", () => {
    const base = { board: "CBSE", classLevel: 10, subject: "Science", sourceVersion: "v1", supersededByVersion: null } as const;
    const issues = validateVersionSet([
      { ...base, academicSession: "2026-27", curriculumVersion: 2, state: "APPROVED", activatedAt: null, supersedesVersion: 1 },
    ]);
    expect(issues.map((i) => i.code)).toContain("HISTORY_LOST");
  });
});

const node = (over: Partial<SnapshotNode> & Pick<SnapshotNode, "id">): SnapshotNode => ({
  kind: "topic",
  parentId: null,
  sequence: 1,
  officialTitle: "Topic",
  internalTitle: null,
  sourceExternalRef: over.id,
  sourceVersion: "v1",
  assessable: true,
  enrichment: false,
  active: true,
  academicSession: "2026-27",
  supersedesNodeId: null,
  changeClassification: null,
  reviewState: "reviewed",
  ...over,
});

const snap = (nodes: SnapshotNode[], session = "2026-27", version = 1): CurriculumSnapshot => ({
  board: "CBSE",
  classLevel: 10,
  subject: "Science",
  academicSession: session,
  sourceVersion: "v1",
  curriculumVersion: version,
  nodes,
});

describe("snapshot validation", () => {
  it("flags orphans, year leaks and assessable+enrichment conflicts", () => {
    const issues = validateSnapshot(
      snap([
        node({ id: "A", parentId: "missing" }),
        node({ id: "B", academicSession: "2025-26" }),
        node({ id: "C", enrichment: true }),
      ]),
    );
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(["ORPHAN_NODE", "ACADEMIC_YEAR_LEAK", "ASSESSABLE_AND_ENRICHMENT"]));
  });
});

describe("annual change detection", () => {
  const prev = snap([node({ id: "T1", officialTitle: "Electricity" }), node({ id: "T2", officialTitle: "Dobereiner Triads" })], "2025-26", 1);

  it("classifies unchanged, renamed, scope changes, added and removed nodes", () => {
    const next = snap([
      node({ id: "T1", officialTitle: "Electricity" }),
      node({ id: "T3", officialTitle: "Heredity" }),
    ]);
    const changes = diffCurriculum(prev, next);
    const byNode = Object.fromEntries(changes.map((c) => [c.nodeId, c.classification]));
    expect(byNode["T1"]).toBe("UNCHANGED");
    expect(byNode["T2"]).toBe("REMOVED");
    expect(byNode["T3"]).toBe("ADDED");
  });

  it("escalates simultaneous changes to AMBIGUOUS and requires human review", () => {
    const next = snap([node({ id: "T1", officialTitle: "Electric Current", parentId: null, assessable: false })]);
    const change = diffCurriculum(prev, next).find((c) => c.nodeId === "T1");
    expect(change?.classification).toBe("AMBIGUOUS");
    expect(change?.humanReviewRequired).toBe(true);
  });

  it("detects a split via explicit supersession", () => {
    const next = snap([
      node({ id: "T2a", supersedesNodeId: "T2" }),
      node({ id: "T2b", supersedesNodeId: "T2" }),
      node({ id: "T1", officialTitle: "Electricity" }),
    ]);
    expect(diffCurriculum(prev, next).some((c) => c.classification === "SPLIT")).toBe(true);
  });

  it("is deterministic", () => {
    const next = snap([node({ id: "T1", officialTitle: "Electricity" }), node({ id: "T9" })]);
    expect(diffCurriculum(prev, next)).toEqual(diffCurriculum(prev, next));
  });
});

describe("impact analysis and question rollover", () => {
  it("blocks activation on ambiguous or newly added assessable scope", () => {
    const impacts = analyseImpact(diffCurriculum(snap([]), snap([node({ id: "NEW" })])));
    expect(activationBlocked(impacts)).toBe(true);
  });

  it("never rolls a question forward automatically", () => {
    const q = { questionId: "Q1", academicSession: "2025-26", curriculumVersion: 1, topicId: "T1", outcomeId: "O1", atomId: "A1", sourceRef: "ref", reviewState: "reviewed" as const, verified: true };
    expect(classifyQuestionRollover(q, undefined)).toBe("REVIEW_REQUIRED");
    expect(classifyQuestionRollover({ ...q, verified: false }, "UNCHANGED")).toBe("REVIEW_REQUIRED");
    expect(classifyQuestionRollover(q, "UNCHANGED")).toBe("VALID_UNCHANGED");
    expect(classifyQuestionRollover(q, "MOVED")).toBe("VALID_AFTER_REMAP");
    expect(classifyQuestionRollover(q, "SCOPE_REDUCED")).toBe("OUT_OF_SCOPE");
    expect(classifyQuestionRollover(q, "REMOVED")).toBe("RETIRED");
  });
});

describe("subject compliance gate", () => {
  const gates = { diagnosticTarget: 20, diagnosticMinimum: 5, minQuestionsPerOutcome: 1 };

  it("requires enough verified items for a diagnostic plus a fresh reassessment", () => {
    expect(requiredVerifiedPerUnit(gates, 3)).toBe(40);
    expect(requiredVerifiedPerUnit(gates, 40)).toBe(80);
  });

  const input = (over: Partial<GateInput> = {}): GateInput => ({
    board: "CBSE",
    classLevel: 10,
    subject: "Science",
    academicSession: "2026-27",
    gates,
    sourceIssues: [],
    applicableSourceCount: 2,
    requiredSourceTypes: ["subject_syllabus"],
    presentSourceTypes: ["subject_syllabus"],
    units: [
      {
        unitId: "U1",
        title: "U1",
        officialMapped: true,
        outOfSyllabusActive: false,
        outcomes: 10,
        orphanOutcomes: 0,
        atoms: 10,
        atomsWithoutQuestions: 0,
        questions: 60,
        verified: 40,
        difficulties: 3,
        kinds: 3,
        duplicateQuestions: 0,
      },
    ],
    unmappedOfficialTopics: [],
    duplicateOfficialMappings: [],
    unapprovedSourceBooks: [],
    learningLoop: { diagnostic: true, gaps: true, tutor: true, reassessment: true, report: true },
    review: { reviewerName: "Reviewer", reviewedAt: "2026-08-28", decision: "approved", unresolvedAmbiguities: 0 },
    commercial: { activeAcademicSession: "2026-27", purchasable: true, approvedVersion: true, selectorsCorrect: true, entitlementsScoped: true, pricingApproved: true },
    ...over,
  });

  it("passes only when every gate passes", () => {
    const gatesOut = runComplianceGates(input());
    expect(gatesOut.every((g) => g.pass)).toBe(true);
    expect(deriveComplianceStatus(gatesOut)).toBe("COMPLIANT");
  });

  it("fails source first, then mapping, then content, then review", () => {
    expect(deriveComplianceStatus(runComplianceGates(input({ applicableSourceCount: 0 })))).toBe("SOURCE_PENDING");
    expect(deriveComplianceStatus(runComplianceGates(input({ unmappedOfficialTopics: ["SCI-U5-C1"] })))).toBe("MAPPING_INCOMPLETE");
    expect(
      deriveComplianceStatus(runComplianceGates(input({ units: [{ ...input().units[0]!, verified: 12 }] }))),
    ).toBe("CONTENT_GAPS");
    expect(deriveComplianceStatus(runComplianceGates(input({ review: { reviewerName: null, reviewedAt: null, decision: null, unresolvedAmbiguities: 0 } })))).toBe("REVIEW_PENDING");
  });

  it("blocks a subject whose source book is not approved", () => {
    const result = runComplianceGates(input({ unapprovedSourceBooks: ["NCERT Class 10 Science (processed)"] }));
    expect(result.find((g) => g.gate === "CURRICULUM_GATE")?.pass).toBe(false);
  });

  it("blocks commercial availability when the active academic year differs", () => {
    const result = runComplianceGates(input({ commercial: { ...input().commercial, activeAcademicSession: "2025-26" } }));
    expect(result.find((g) => g.gate === "COMMERCIAL_GATE")?.pass).toBe(false);
  });
});
