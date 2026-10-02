// EduOS Annual CBSE/NCERT Compliance Framework — pure, client-safe contracts.
//
// This module is the deterministic core of the annual compliance standard:
//   * official source registry contracts + validation
//   * academic-year curriculum version lifecycle + supersession law
//   * curriculum snapshot model
//   * annual change-detection (classification) engine
//   * change-impact analysis
//   * question rollover classification
//   * the reusable subject compliance gate + compliance status
//
// It is board/class/subject agnostic on purpose: Class 10 Mathematics and
// Science are only the first application. No database access, no I/O, no
// runtime coupling — every function is pure so reports are reproducible.

import { z } from "zod";

export const VALIDATOR_VERSION = "compliance-validator/1.0.0";

// ---------------------------------------------------------------------------
// Phase 2 — Official source registry
// ---------------------------------------------------------------------------

export const SOURCE_AUTHORITIES = ["CBSE", "NCERT"] as const;
export const sourceAuthoritySchema = z.enum(SOURCE_AUTHORITIES);

export const SOURCE_TYPES = [
  "cbse_curriculum",
  "cbse_initial_curriculum_page",
  "subject_syllabus",
  "ncert_syllabus",
  "ncert_textbook",
  "rationalised_content_notice",
  "sample_paper",
  "marking_scheme",
  "circular",
  "erratum",
  "corrigendum",
  "assessment_guidance",
  "practical_requirement",
] as const;
export const sourceTypeSchema = z.enum(SOURCE_TYPES);

export const SOURCE_STATUSES = ["final", "draft", "corrected", "recalled", "superseded"] as const;
export const APPLICABILITY = ["applicable", "not_applicable", "pending_confirmation"] as const;

export const sourceRecordSchema = z.object({
  id: z.string().min(3),
  board: z.string().min(2),
  classLevel: z.number().int().min(1).max(12),
  subject: z.string().min(2),
  academicSession: z.string().regex(/^\d{4}-\d{2}$/),
  authority: sourceAuthoritySchema,
  sourceType: sourceTypeSchema,
  documentTitle: z.string().min(3),
  documentVersion: z.string().min(1),
  edition: z.string().nullable(),
  publishedOn: z.string().nullable(),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  officialUrl: z.string().url().nullable(),
  retrievedAt: z.string().nullable(),
  checksum: z.string().nullable(),
  checksumAlgorithm: z.enum(["sha256"]).nullable(),
  status: z.enum(SOURCE_STATUSES),
  supersedesId: z.string().nullable(),
  supersededById: z.string().nullable(),
  applicability: z.enum(APPLICABILITY),
  reviewerNote: z.string(),
  evidenceRef: z.string().nullable(),
});
export type SourceRecord = z.infer<typeof sourceRecordSchema>;

export const sourceManifestSchema = z.object({
  manifestVersion: z.string(),
  generatedAt: z.string(),
  authorityOrder: z.array(z.string()).min(1),
  sources: z.array(sourceRecordSchema),
});
export type SourceManifest = z.infer<typeof sourceManifestSchema>;

export type Issue = { level: "error" | "warning"; code: string; detail: string };

/** Deterministic registry validation. Third-party sources are never authority. */
export function validateSourceRegistry(manifest: SourceManifest): Issue[] {
  const issues: Issue[] = [];
  const byId = new Map(manifest.sources.map((s) => [s.id, s]));
  if (byId.size !== manifest.sources.length) {
    issues.push({ level: "error", code: "DUPLICATE_SOURCE_ID", detail: "source ids must be unique" });
  }
  for (const s of [...manifest.sources].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!SOURCE_AUTHORITIES.includes(s.authority)) {
      issues.push({ level: "error", code: "NON_OFFICIAL_AUTHORITY", detail: `${s.id}: ${s.authority}` });
    }
    if (s.status === "final" && s.applicability === "applicable" && !s.checksum) {
      issues.push({ level: "error", code: "CHECKSUM_MISSING", detail: `${s.id} is applicable+final without a checksum` });
    }
    if (s.checksum && s.checksumAlgorithm !== "sha256") {
      issues.push({ level: "error", code: "CHECKSUM_ALGORITHM", detail: `${s.id}: only sha256 is accepted` });
    }
    if (s.checksum && !/^[0-9a-f]{64}$/.test(s.checksum)) {
      issues.push({ level: "error", code: "CHECKSUM_MALFORMED", detail: `${s.id}` });
    }
    if (s.checksum && !s.retrievedAt) {
      issues.push({ level: "error", code: "RETRIEVAL_TIMESTAMP_MISSING", detail: `${s.id}` });
    }
    if (s.status === "draft" && s.applicability === "applicable") {
      issues.push({ level: "error", code: "DRAFT_FINAL_CONFUSION", detail: `${s.id} is draft but marked applicable` });
    }
    if (s.status === "recalled" && s.applicability !== "not_applicable") {
      issues.push({ level: "error", code: "RECALLED_STILL_APPLICABLE", detail: `${s.id}` });
    }
    if (s.applicability === "pending_confirmation") {
      issues.push({ level: "warning", code: "SOURCE_PENDING_CONFIRMATION", detail: `${s.id}` });
    }
    if (s.supersedesId && !byId.has(s.supersedesId)) {
      issues.push({ level: "error", code: "DANGLING_SUPERSEDES", detail: `${s.id} → ${s.supersedesId}` });
    }
    if (s.supersededById) {
      if (!byId.has(s.supersededById)) {
        issues.push({ level: "error", code: "DANGLING_SUPERSEDED_BY", detail: `${s.id} → ${s.supersededById}` });
      }
      if (s.status !== "superseded") {
        issues.push({ level: "error", code: "SUPERSESSION_STATUS_MISMATCH", detail: `${s.id}` });
      }
    }
    if (s.supersedesId && s.supersedesId === s.id) {
      issues.push({ level: "error", code: "SUPERSESSION_CYCLE", detail: `${s.id}` });
    }
  }
  return issues;
}

/** Sources that may be cited as curriculum authority for a subject-year. */
export function applicableSources(manifest: SourceManifest, classLevel: number, subject: string, session: string) {
  return manifest.sources
    .filter(
      (s) =>
        s.classLevel === classLevel &&
        s.subject.toLowerCase() === subject.toLowerCase() &&
        s.academicSession === session &&
        s.applicability === "applicable" &&
        s.status !== "recalled",
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------------------
// Phase 3 — Academic-year versioning law
// ---------------------------------------------------------------------------

export const CURRICULUM_LIFECYCLE = [
  "DRAFT",
  "SOURCE_VERIFIED",
  "MAPPED",
  "GAP_ANALYSED",
  "CONTENT_READY",
  "SUBJECT_EXPERT_REVIEWED",
  "APPROVED",
  "ACTIVE",
  "SUPERSEDED",
  "ARCHIVED",
] as const;
export type LifecycleState = (typeof CURRICULUM_LIFECYCLE)[number];

export const curriculumVersionSchema = z.object({
  board: z.string(),
  classLevel: z.number().int(),
  subject: z.string(),
  academicSession: z.string().regex(/^\d{4}-\d{2}$/),
  sourceVersion: z.string(),
  curriculumVersion: z.number().int().min(1),
  state: z.enum(CURRICULUM_LIFECYCLE),
  activatedAt: z.string().nullable(),
  supersedesVersion: z.number().int().nullable(),
  supersededByVersion: z.number().int().nullable(),
});
export type CurriculumVersion = z.infer<typeof curriculumVersionSchema>;

export function versionKey(v: Pick<CurriculumVersion, "board" | "classLevel" | "subject">): string {
  return `${v.board}/${v.classLevel}/${v.subject}`;
}

/** Forward-only lifecycle; ARCHIVED is terminal. Rollback is a new version. */
export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  const i = CURRICULUM_LIFECYCLE.indexOf(from);
  const j = CURRICULUM_LIFECYCLE.indexOf(to);
  if (i < 0 || j < 0) return false;
  if (from === "ARCHIVED") return false;
  if (to === "ARCHIVED") return from === "SUPERSEDED";
  return j === i + 1;
}

/** Versioning law: never silently overwrite a year; one ACTIVE per subject. */
export function validateVersionSet(versions: CurriculumVersion[]): Issue[] {
  const issues: Issue[] = [];
  const groups = new Map<string, CurriculumVersion[]>();
  for (const v of versions) {
    const k = versionKey(v);
    groups.set(k, [...(groups.get(k) ?? []), v]);
  }
  for (const [k, list] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const active = list.filter((v) => v.state === "ACTIVE");
    if (active.length > 1) {
      issues.push({ level: "error", code: "MULTIPLE_ACTIVE_VERSIONS", detail: `${k}: ${active.length} active` });
    }
    const seen = new Set<string>();
    for (const v of list) {
      const id = `${v.academicSession}#${v.curriculumVersion}`;
      if (seen.has(id)) issues.push({ level: "error", code: "DUPLICATE_VERSION", detail: `${k}: ${id}` });
      seen.add(id);
      if (v.state === "ACTIVE" && !v.activatedAt) {
        issues.push({ level: "error", code: "ACTIVATION_TIMESTAMP_MISSING", detail: `${k}: ${id}` });
      }
      if (v.state === "SUPERSEDED" && v.supersededByVersion == null) {
        issues.push({ level: "error", code: "SUPERSESSION_REFERENCE_MISSING", detail: `${k}: ${id}` });
      }
    }
    // Historical preservation: an older session may never be deleted, and a
    // superseding version must point back at what it replaced.
    for (const v of list) {
      if (v.supersedesVersion != null && !list.some((o) => o.curriculumVersion === v.supersedesVersion)) {
        issues.push({ level: "error", code: "HISTORY_LOST", detail: `${k}: v${v.curriculumVersion} supersedes a missing version` });
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Phase 4 — Curriculum snapshot model
// ---------------------------------------------------------------------------

export const NODE_KINDS = ["unit", "chapter", "topic", "outcome", "atom"] as const;
export type SnapshotNodeKind = (typeof NODE_KINDS)[number];

export const REVIEW_STATES = ["unreviewed", "in_review", "reviewed", "rejected"] as const;

export const snapshotNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(NODE_KINDS),
  parentId: z.string().nullable(),
  sequence: z.number().int().min(0),
  officialTitle: z.string().min(1),
  internalTitle: z.string().nullable(),
  sourceExternalRef: z.string().nullable(),
  sourceVersion: z.string().nullable(),
  assessable: z.boolean(),
  enrichment: z.boolean(),
  active: z.boolean(),
  academicSession: z.string().regex(/^\d{4}-\d{2}$/),
  supersedesNodeId: z.string().nullable(),
  changeClassification: z.string().nullable(),
  reviewState: z.enum(REVIEW_STATES),
});
export type SnapshotNode = z.infer<typeof snapshotNodeSchema>;

export const curriculumSnapshotSchema = z.object({
  board: z.string(),
  classLevel: z.number().int(),
  subject: z.string(),
  academicSession: z.string(),
  sourceVersion: z.string(),
  curriculumVersion: z.number().int(),
  nodes: z.array(snapshotNodeSchema),
});
export type CurriculumSnapshot = z.infer<typeof curriculumSnapshotSchema>;

export function validateSnapshot(s: CurriculumSnapshot): Issue[] {
  const issues: Issue[] = [];
  const byId = new Map(s.nodes.map((n) => [n.id, n]));
  if (byId.size !== s.nodes.length) issues.push({ level: "error", code: "DUPLICATE_NODE_ID", detail: s.subject });
  for (const n of [...s.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    if (n.parentId && !byId.has(n.parentId)) {
      issues.push({ level: "error", code: "ORPHAN_NODE", detail: `${n.id} → ${n.parentId}` });
    }
    if (n.kind === "unit" && n.parentId) issues.push({ level: "error", code: "UNIT_HAS_PARENT", detail: n.id });
    if (n.assessable && n.enrichment) {
      issues.push({ level: "error", code: "ASSESSABLE_AND_ENRICHMENT", detail: n.id });
    }
    if (n.academicSession !== s.academicSession) {
      issues.push({ level: "error", code: "ACADEMIC_YEAR_LEAK", detail: `${n.id}: ${n.academicSession}` });
    }
    if (n.active && !n.assessable && !n.enrichment) {
      issues.push({ level: "warning", code: "ACTIVE_UNCLASSIFIED_NODE", detail: n.id });
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Phase 5 — Annual change-detection engine
// ---------------------------------------------------------------------------

export const CHANGE_CLASSIFICATIONS = [
  "UNCHANGED",
  "ADDED",
  "REMOVED",
  "RENAMED",
  "MOVED",
  "MERGED",
  "SPLIT",
  "SCOPE_EXPANDED",
  "SCOPE_REDUCED",
  "ASSESSMENT_CHANGED",
  "SOURCE_CORRECTED",
  "AMBIGUOUS",
  "HUMAN_REVIEW_REQUIRED",
] as const;
export type ChangeClassification = (typeof CHANGE_CLASSIFICATIONS)[number];

export type ChangeRecord = {
  nodeId: string;
  kind: SnapshotNodeKind;
  previousId: string | null;
  classification: ChangeClassification;
  evidence: string;
  humanReviewRequired: boolean;
};

/**
 * Deterministic diff between the active version and a proposed next-year
 * version. Identity is source reference first, never title similarity alone;
 * anything the machine cannot prove is escalated to human review.
 */
export function diffCurriculum(prev: CurriculumSnapshot, next: CurriculumSnapshot): ChangeRecord[] {
  const out: ChangeRecord[] = [];
  const key = (n: SnapshotNode) => n.sourceExternalRef ?? `~${n.kind}:${n.officialTitle.trim().toLowerCase()}`;
  const prevByKey = new Map(prev.nodes.map((n) => [key(n), n]));
  const nextByKey = new Map(next.nodes.map((n) => [key(n), n]));

  for (const n of [...next.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    const p = prevByKey.get(key(n));
    if (!p) {
      const renamedFrom = prev.nodes.find(
        (c) => c.sourceExternalRef && c.sourceExternalRef === n.supersedesNodeId,
      );
      if (renamedFrom) {
        out.push({
          nodeId: n.id,
          kind: n.kind,
          previousId: renamedFrom.id,
          classification: "RENAMED",
          evidence: `explicit supersession ${renamedFrom.id} → ${n.id}`,
          humanReviewRequired: true,
        });
      } else {
        out.push({
          nodeId: n.id,
          kind: n.kind,
          previousId: null,
          classification: "ADDED",
          evidence: `no prior node with source ref ${key(n)}`,
          humanReviewRequired: n.assessable,
        });
      }
      continue;
    }
    const changes: ChangeClassification[] = [];
    if (p.officialTitle.trim() !== n.officialTitle.trim()) changes.push("RENAMED");
    if ((p.parentId ?? "") !== (n.parentId ?? "")) changes.push("MOVED");
    if (!p.assessable && n.assessable) changes.push("SCOPE_EXPANDED");
    if (p.assessable && !n.assessable) changes.push("SCOPE_REDUCED");
    if (p.enrichment !== n.enrichment) changes.push("ASSESSMENT_CHANGED");
    if ((p.sourceVersion ?? "") !== (n.sourceVersion ?? "") && changes.length === 0) {
      changes.push("SOURCE_CORRECTED");
    }
    if (changes.length === 0) {
      out.push({ nodeId: n.id, kind: n.kind, previousId: p.id, classification: "UNCHANGED", evidence: "identical source ref, title, parent and scope", humanReviewRequired: false });
    } else if (changes.length === 1) {
      out.push({ nodeId: n.id, kind: n.kind, previousId: p.id, classification: changes[0]!, evidence: changes.join("+"), humanReviewRequired: changes[0] !== "SOURCE_CORRECTED" });
    } else {
      out.push({ nodeId: n.id, kind: n.kind, previousId: p.id, classification: "AMBIGUOUS", evidence: `multiple simultaneous changes: ${changes.join("+")}`, humanReviewRequired: true });
    }
  }

  for (const p of [...prev.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    if (nextByKey.has(key(p))) continue;
    const mergedInto = next.nodes.filter((n) => n.supersedesNodeId === p.sourceExternalRef || n.supersedesNodeId === p.id);
    if (mergedInto.length === 1) {
      out.push({ nodeId: mergedInto[0]!.id, kind: p.kind, previousId: p.id, classification: "MERGED", evidence: `${p.id} folded into ${mergedInto[0]!.id}`, humanReviewRequired: true });
    } else if (mergedInto.length > 1) {
      out.push({ nodeId: mergedInto.map((n) => n.id).join("+"), kind: p.kind, previousId: p.id, classification: "SPLIT", evidence: `${p.id} split into ${mergedInto.length} nodes`, humanReviewRequired: true });
    } else {
      out.push({ nodeId: p.id, kind: p.kind, previousId: p.id, classification: "REMOVED", evidence: "no node in the proposed version carries this source reference", humanReviewRequired: true });
    }
  }
  return out.sort((a, b) => a.nodeId.localeCompare(b.nodeId) || a.classification.localeCompare(b.classification));
}

// ---------------------------------------------------------------------------
// Phase 6 — Impact analysis
// ---------------------------------------------------------------------------

export const IMPACT_STATUSES = [
  "NO_ACTION",
  "METADATA_UPDATE",
  "REMAP_REQUIRED",
  "OUTCOME_UPDATE_REQUIRED",
  "QUESTION_REVIEW_REQUIRED",
  "NEW_CONTENT_REQUIRED",
  "RETIRE_CONTENT",
  "REASSESSMENT_RESERVE_GAP",
  "SUBJECT_EXPERT_REVIEW_REQUIRED",
  "ACTIVATION_BLOCKED",
] as const;
export type ImpactStatus = (typeof IMPACT_STATUSES)[number];

export const IMPACT_SURFACES = [
  "outcomes",
  "atoms",
  "questions",
  "answers",
  "explanations",
  "interventions",
  "ai_tutor_scope",
  "diagnostic_blueprints",
  "reassessment_reserves",
  "reports",
  "evidence_history",
  "catalogue_availability",
  "entitlements",
  "public_selectors",
  "pricing",
  "source_provenance",
] as const;
export type ImpactSurface = (typeof IMPACT_SURFACES)[number];

export type ImpactRecord = { change: ChangeRecord; statuses: ImpactStatus[]; surfaces: ImpactSurface[] };

const IMPACT_MAP: Record<ChangeClassification, { statuses: ImpactStatus[]; surfaces: ImpactSurface[] }> = {
  UNCHANGED: { statuses: ["NO_ACTION"], surfaces: [] },
  ADDED: {
    statuses: ["NEW_CONTENT_REQUIRED", "OUTCOME_UPDATE_REQUIRED", "SUBJECT_EXPERT_REVIEW_REQUIRED", "REASSESSMENT_RESERVE_GAP", "ACTIVATION_BLOCKED"],
    surfaces: ["outcomes", "atoms", "questions", "diagnostic_blueprints", "reassessment_reserves", "ai_tutor_scope"],
  },
  REMOVED: {
    statuses: ["RETIRE_CONTENT", "QUESTION_REVIEW_REQUIRED", "SUBJECT_EXPERT_REVIEW_REQUIRED"],
    surfaces: ["outcomes", "atoms", "questions", "interventions", "ai_tutor_scope", "diagnostic_blueprints", "reports"],
  },
  RENAMED: { statuses: ["METADATA_UPDATE", "SUBJECT_EXPERT_REVIEW_REQUIRED"], surfaces: ["outcomes", "reports", "source_provenance"] },
  MOVED: { statuses: ["REMAP_REQUIRED", "SUBJECT_EXPERT_REVIEW_REQUIRED"], surfaces: ["outcomes", "atoms", "diagnostic_blueprints", "reports"] },
  MERGED: { statuses: ["REMAP_REQUIRED", "QUESTION_REVIEW_REQUIRED", "SUBJECT_EXPERT_REVIEW_REQUIRED"], surfaces: ["outcomes", "atoms", "questions", "interventions"] },
  SPLIT: { statuses: ["REMAP_REQUIRED", "NEW_CONTENT_REQUIRED", "SUBJECT_EXPERT_REVIEW_REQUIRED", "REASSESSMENT_RESERVE_GAP"], surfaces: ["outcomes", "atoms", "questions", "reassessment_reserves"] },
  SCOPE_EXPANDED: { statuses: ["NEW_CONTENT_REQUIRED", "QUESTION_REVIEW_REQUIRED", "SUBJECT_EXPERT_REVIEW_REQUIRED"], surfaces: ["outcomes", "questions", "diagnostic_blueprints", "ai_tutor_scope"] },
  SCOPE_REDUCED: { statuses: ["RETIRE_CONTENT", "QUESTION_REVIEW_REQUIRED"], surfaces: ["questions", "diagnostic_blueprints", "ai_tutor_scope"] },
  ASSESSMENT_CHANGED: { statuses: ["QUESTION_REVIEW_REQUIRED", "SUBJECT_EXPERT_REVIEW_REQUIRED"], surfaces: ["questions", "answers", "explanations", "diagnostic_blueprints"] },
  SOURCE_CORRECTED: { statuses: ["METADATA_UPDATE"], surfaces: ["source_provenance"] },
  AMBIGUOUS: { statuses: ["SUBJECT_EXPERT_REVIEW_REQUIRED", "ACTIVATION_BLOCKED"], surfaces: ["outcomes", "atoms", "questions"] },
  HUMAN_REVIEW_REQUIRED: { statuses: ["SUBJECT_EXPERT_REVIEW_REQUIRED", "ACTIVATION_BLOCKED"], surfaces: ["outcomes", "questions"] },
};

/** Historical learner evidence is never re-labelled: it is read-only here. */
export function analyseImpact(changes: ChangeRecord[]): ImpactRecord[] {
  return changes.map((change) => {
    const m = IMPACT_MAP[change.classification];
    return { change, statuses: [...m.statuses], surfaces: [...m.surfaces] };
  });
}

export function activationBlocked(impacts: ImpactRecord[]): boolean {
  return impacts.some((i) => i.statuses.includes("ACTIVATION_BLOCKED"));
}

// ---------------------------------------------------------------------------
// Phase 7 — Question validity across years
// ---------------------------------------------------------------------------

export const QUESTION_ROLLOVER = [
  "VALID_UNCHANGED",
  "VALID_AFTER_REMAP",
  "REVIEW_REQUIRED",
  "OUT_OF_SCOPE",
  "RETIRED",
  "REPLACEMENT_REQUIRED",
] as const;
export type QuestionRollover = (typeof QUESTION_ROLLOVER)[number];

export type QuestionProvenance = {
  questionId: string;
  academicSession: string;
  curriculumVersion: number;
  topicId: string;
  outcomeId: string;
  atomId: string | null;
  sourceRef: string | null;
  reviewState: (typeof REVIEW_STATES)[number];
  verified: boolean;
};

export function questionProvenanceIssues(q: QuestionProvenance): Issue[] {
  const issues: Issue[] = [];
  if (!q.academicSession) issues.push({ level: "error", code: "QUESTION_YEAR_MISSING", detail: q.questionId });
  if (!q.outcomeId) issues.push({ level: "error", code: "QUESTION_OUTCOME_MISSING", detail: q.questionId });
  if (!q.atomId) issues.push({ level: "warning", code: "QUESTION_ATOM_MISSING", detail: q.questionId });
  if (!q.sourceRef) issues.push({ level: "warning", code: "QUESTION_SOURCE_PROVENANCE_MISSING", detail: q.questionId });
  return issues;
}

/** A question never rolls into a later year automatically. */
export function classifyQuestionRollover(q: QuestionProvenance, nodeChange: ChangeClassification | undefined): QuestionRollover {
  if (!nodeChange) return "REVIEW_REQUIRED";
  switch (nodeChange) {
    case "UNCHANGED":
      return q.verified ? "VALID_UNCHANGED" : "REVIEW_REQUIRED";
    case "RENAMED":
    case "MOVED":
    case "SOURCE_CORRECTED":
      return q.verified ? "VALID_AFTER_REMAP" : "REVIEW_REQUIRED";
    case "MERGED":
    case "SPLIT":
    case "SCOPE_EXPANDED":
    case "ASSESSMENT_CHANGED":
      return "REVIEW_REQUIRED";
    case "SCOPE_REDUCED":
      return "OUT_OF_SCOPE";
    case "REMOVED":
      return "RETIRED";
    case "ADDED":
      return "REPLACEMENT_REQUIRED";
    default:
      return "REVIEW_REQUIRED";
  }
}

// ---------------------------------------------------------------------------
// Phase 8 — Annual compliance gate
// ---------------------------------------------------------------------------

export const GATE_NAMES = [
  "SOURCE_GATE",
  "CURRICULUM_GATE",
  "OUTCOME_GATE",
  "QUESTION_GATE",
  "LEARNING_LOOP_GATE",
  "REVIEW_GATE",
  "COMMERCIAL_GATE",
] as const;
export type GateName = (typeof GATE_NAMES)[number];

export type GateResult = { gate: GateName; pass: boolean; checks: { id: string; pass: boolean; detail: string }[] };

export type VolumeGates = { diagnosticTarget: number; diagnosticMinimum: number; minQuestionsPerOutcome: number };

/** Depth law: a unit must sustain one diagnostic AND one fresh reassessment. */
export function requiredVerifiedPerUnit(gates: VolumeGates, outcomes: number): number {
  return Math.max(2 * gates.diagnosticTarget, 2 * outcomes * gates.minQuestionsPerOutcome, 2 * gates.diagnosticMinimum);
}

export type UnitCoverage = {
  unitId: string;
  title: string;
  officialMapped: boolean;
  outOfSyllabusActive: boolean;
  outcomes: number;
  orphanOutcomes: number;
  atoms: number;
  atomsWithoutQuestions: number;
  questions: number;
  verified: number;
  difficulties: number;
  kinds: number;
  duplicateQuestions: number;
};

export type GateInput = {
  board: string;
  classLevel: number;
  subject: string;
  academicSession: string;
  gates: VolumeGates;
  sourceIssues: Issue[];
  applicableSourceCount: number;
  requiredSourceTypes: string[];
  presentSourceTypes: string[];
  units: UnitCoverage[];
  unmappedOfficialTopics: string[];
  duplicateOfficialMappings: string[];
  unapprovedSourceBooks: string[];
  learningLoop: Record<string, boolean>;
  review: { reviewerName: string | null; reviewedAt: string | null; decision: string | null; unresolvedAmbiguities: number };
  commercial: { activeAcademicSession: string; purchasable: boolean; approvedVersion: boolean; selectorsCorrect: boolean; entitlementsScoped: boolean; pricingApproved: boolean };
};

export function runComplianceGates(input: GateInput): GateResult[] {
  const results: GateResult[] = [];
  const missingTypes = input.requiredSourceTypes.filter((t) => !input.presentSourceTypes.includes(t));
  results.push({
    gate: "SOURCE_GATE",
    pass: input.sourceIssues.filter((i) => i.level === "error").length === 0 && input.applicableSourceCount > 0 && missingTypes.length === 0,
    checks: [
      { id: "sources_recorded", pass: input.applicableSourceCount > 0, detail: `${input.applicableSourceCount} applicable source(s)` },
      { id: "required_types_present", pass: missingTypes.length === 0, detail: missingTypes.length ? `missing: ${missingTypes.join(", ")}` : "all required source types present" },
      { id: "registry_valid", pass: input.sourceIssues.filter((i) => i.level === "error").length === 0, detail: `${input.sourceIssues.filter((i) => i.level === "error").length} registry error(s)` },
    ],
  });

  const outOfSyllabus = input.units.filter((u) => u.outOfSyllabusActive);
  results.push({
    gate: "CURRICULUM_GATE",
    pass:
      input.unmappedOfficialTopics.length === 0 &&
      input.duplicateOfficialMappings.length === 0 &&
      outOfSyllabus.length === 0 &&
      input.unapprovedSourceBooks.length === 0,
    checks: [
      { id: "all_assessable_topics_mapped", pass: input.unmappedOfficialTopics.length === 0, detail: `${input.unmappedOfficialTopics.length} unmapped official topic(s)` },
      { id: "no_duplicate_mapping", pass: input.duplicateOfficialMappings.length === 0, detail: `${input.duplicateOfficialMappings.length} duplicate mapping(s)` },
      { id: "no_active_out_of_syllabus", pass: outOfSyllabus.length === 0, detail: outOfSyllabus.map((u) => u.unitId).join(", ") || "none" },
      { id: "source_books_approved", pass: input.unapprovedSourceBooks.length === 0, detail: input.unapprovedSourceBooks.join(", ") || "all mapped source books approved" },
    ],
  });


  const orphans = input.units.reduce((s, u) => s + u.orphanOutcomes, 0);
  const atomGaps = input.units.reduce((s, u) => s + u.atomsWithoutQuestions, 0);
  results.push({
    gate: "OUTCOME_GATE",
    pass: orphans === 0 && input.units.every((u) => u.outcomes > 0 && u.atoms >= u.outcomes),
    checks: [
      { id: "no_orphan_outcomes", pass: orphans === 0, detail: `${orphans} orphan outcome(s)` },
      { id: "outcomes_have_atoms", pass: input.units.every((u) => u.atoms >= u.outcomes), detail: input.units.filter((u) => u.atoms < u.outcomes).map((u) => u.unitId).join(", ") || "every outcome carries at least one atom" },
      { id: "every_unit_has_outcomes", pass: input.units.every((u) => u.outcomes > 0), detail: input.units.filter((u) => u.outcomes === 0).map((u) => u.unitId).join(", ") || "none empty" },
    ],
  });

  const shortUnits = input.units.filter((u) => u.verified < requiredVerifiedPerUnit(input.gates, u.outcomes));
  const dupes = input.units.reduce((s, u) => s + u.duplicateQuestions, 0);
  results.push({
    gate: "QUESTION_GATE",
    pass: shortUnits.length === 0 && atomGaps === 0 && dupes === 0,
    checks: [
      { id: "verified_depth", pass: shortUnits.length === 0, detail: shortUnits.map((u) => `${u.unitId}:${u.verified}/${requiredVerifiedPerUnit(input.gates, u.outcomes)}`).join(", ") || "all units meet the depth law" },
      { id: "atom_coverage", pass: atomGaps === 0, detail: `${atomGaps} atom(s) without a question` },
      { id: "difficulty_coverage", pass: input.units.every((u) => u.difficulties >= 2), detail: input.units.filter((u) => u.difficulties < 2).map((u) => u.unitId).join(", ") || "≥2 difficulty bands per unit" },
      { id: "type_coverage", pass: input.units.every((u) => u.kinds >= 2), detail: input.units.filter((u) => u.kinds < 2).map((u) => u.unitId).join(", ") || "≥2 question types per unit" },
      { id: "duplicate_free", pass: dupes === 0, detail: `${dupes} duplicate question(s)` },
    ],
  });

  const loopChecks = Object.entries(input.learningLoop).map(([id, pass]) => ({ id, pass, detail: pass ? "verified" : "not verified" }));
  results.push({ gate: "LEARNING_LOOP_GATE", pass: loopChecks.every((c) => c.pass), checks: loopChecks });

  results.push({
    gate: "REVIEW_GATE",
    pass: Boolean(input.review.reviewerName && input.review.reviewedAt && input.review.decision) && input.review.unresolvedAmbiguities === 0,
    checks: [
      { id: "named_reviewer", pass: Boolean(input.review.reviewerName), detail: input.review.reviewerName ?? "none recorded" },
      { id: "review_timestamp", pass: Boolean(input.review.reviewedAt), detail: input.review.reviewedAt ?? "none recorded" },
      { id: "review_decision", pass: Boolean(input.review.decision), detail: input.review.decision ?? "none recorded" },
      { id: "no_unresolved_ambiguity", pass: input.review.unresolvedAmbiguities === 0, detail: `${input.review.unresolvedAmbiguities} unresolved` },
    ],
  });

  const c = input.commercial;
  results.push({
    gate: "COMMERCIAL_GATE",
    pass: c.activeAcademicSession === input.academicSession && c.approvedVersion && c.selectorsCorrect && c.entitlementsScoped && c.pricingApproved,
    checks: [
      { id: "academic_year_active", pass: c.activeAcademicSession === input.academicSession, detail: c.activeAcademicSession },
      { id: "approved_version_only", pass: c.approvedVersion, detail: c.purchasable ? "purchasable" : "not purchasable" },
      { id: "selectors_correct", pass: c.selectorsCorrect, detail: String(c.selectorsCorrect) },
      { id: "entitlements_scoped", pass: c.entitlementsScoped, detail: String(c.entitlementsScoped) },
      { id: "pricing_approved", pass: c.pricingApproved, detail: String(c.pricingApproved) },
    ],
  });

  return results;
}

// ---------------------------------------------------------------------------
// Phase 9 — Compliance status
// ---------------------------------------------------------------------------

export const COMPLIANCE_STATUSES = [
  "NOT_ASSESSED",
  "SOURCE_PENDING",
  "MAPPING_INCOMPLETE",
  "CONTENT_GAPS",
  "REVIEW_PENDING",
  "COMPLIANT",
  "COMPLIANT_WITH_ACCEPTED_LIMITATIONS",
  "SUPERSEDED",
  "BLOCKED",
] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export type ComplianceRecord = {
  board: string;
  classLevel: number;
  subject: string;
  academicSession: string;
  status: ComplianceStatus;
  assessedAt: string;
  sourceSet: string[];
  curriculumVersion: number;
  gapCount: number;
  reviewerEvidence: string | null;
  validatorVersion: string;
  reportRef: string;
};

export function deriveComplianceStatus(gates: GateResult[], acceptedLimitations = 0): ComplianceStatus {
  const failed = new Set(gates.filter((g) => !g.pass).map((g) => g.gate));
  if (failed.size === 0) return acceptedLimitations > 0 ? "COMPLIANT_WITH_ACCEPTED_LIMITATIONS" : "COMPLIANT";
  if (failed.has("SOURCE_GATE")) return "SOURCE_PENDING";
  if (failed.has("CURRICULUM_GATE")) return "MAPPING_INCOMPLETE";
  if (failed.has("OUTCOME_GATE") || failed.has("QUESTION_GATE") || failed.has("LEARNING_LOOP_GATE")) return "CONTENT_GAPS";
  if (failed.has("REVIEW_GATE")) return "REVIEW_PENDING";
  return "BLOCKED";
}

export function gapCount(gates: GateResult[]): number {
  return gates.reduce((s, g) => s + g.checks.filter((c) => !c.pass).length, 0);
}
