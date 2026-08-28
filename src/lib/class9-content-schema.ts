// Wave 1: contracts for CBSE Class 9 content preparation packs.
//
// These packs are PREPARATION artefacts only. Nothing here activates Class 9,
// makes it purchasable, or exposes it in any public selector. The shapes below
// mirror the live pipeline tables (catalogue_subjects → curriculum_units →
// curriculum_chapters → curriculum_topics → assessment_outcomes/curriculum_outcomes
// → question_bank) so an import can later be executed without a parallel pipeline.
//
// Hierarchy law: Unit → Chapter → Topic → Outcome → Atoms. No subtopic level.

import { z } from "zod";

export const CLASS_9_BOARD = "CBSE" as const;
export const CLASS_9_ACADEMIC_YEAR = "2026-27" as const;
export const CLASS_9_CLASS_LEVEL = 9 as const;

/** Deterministic external reference: CBSE/2026-27/C9/<SUBJ>/<local path>. */
export function externalRef(subjectCode: string, ...segments: string[]): string {
  return [
    CLASS_9_BOARD,
    CLASS_9_ACADEMIC_YEAR,
    `C${CLASS_9_CLASS_LEVEL}`,
    subjectCode,
    ...segments,
  ].join("/");
}

export const provenanceSchema = z.object({
  sourceId: z.string().min(3),
  sourceRef: z.string().min(3),
  retrievedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().optional(),
});

export const atomSchema = z.object({
  id: z.string().regex(/^C9-[A-Z]{3}-U\d+-CH\d+-T\d+-O\d+-A\d+$/),
  text: z.string().min(6),
});

export const outcomeSchema = z.object({
  id: z.string().regex(/^C9-[A-Z]{3}-U\d+-CH\d+-T\d+-O\d+$/),
  externalRef: z.string().min(10),
  code: z.string().min(3),
  title: z.string().min(6),
  category: z.enum(["conceptual", "procedural", "application", "analysis"]),
  bloomLevel: z.enum(["remember", "understand", "apply", "analyse", "evaluate", "create"]),
  difficulty: z.number().int().min(1).max(5),
  diagnosticWeight: z.number().int().min(1).max(10),
  questionTypes: z.array(z.string().min(2)).min(1),
  atoms: z.array(atomSchema).min(1),
  prerequisites: z.array(z.string()).default([]),
});

export const topicSchema = z.object({
  id: z.string().regex(/^C9-[A-Z]{3}-U\d+-CH\d+-T\d+$/),
  externalRef: z.string().min(10),
  title: z.string().min(3),
  position: z.number().int().min(1),
  outcomes: z.array(outcomeSchema).min(1),
});

export const chapterSchema = z.object({
  id: z.string().regex(/^C9-[A-Z]{3}-U\d+-CH\d+$/),
  externalRef: z.string().min(10),
  ncertChapter: z.number().int().min(1),
  title: z.string().min(3),
  position: z.number().int().min(1),
  provenance: provenanceSchema,
  topics: z.array(topicSchema).min(1),
});

export const unitSchema = z.object({
  id: z.string().regex(/^C9-[A-Z]{3}-U\d+$/),
  externalRef: z.string().min(10),
  title: z.string().min(3),
  position: z.number().int().min(1),
  syllabusMarks: z.number().int().min(1).max(100),
  chapters: z.array(chapterSchema).min(1),
});

export const curriculumPackSchema = z.object({
  packVersion: z.literal(1),
  board: z.literal(CLASS_9_BOARD),
  academicYear: z.literal(CLASS_9_ACADEMIC_YEAR),
  classLevel: z.literal(CLASS_9_CLASS_LEVEL),
  subjectCode: z.enum(["MAT", "SCI"]),
  subjectKey: z.enum(["Mathematics", "Science"]),
  catalogueCode: z.string().min(6),
  /** Preparation gates — every pack ships inactive and non-purchasable. */
  activation: z.object({
    isActive: z.literal(false),
    commercialStatus: z.literal("hidden"),
    reviewState: z.literal("draft"),
    diagnosticEligible: z.literal(false),
    reassessmentReady: z.literal(false),
  }),
  sources: z.array(
    z.object({
      id: z.string().min(3),
      title: z.string().min(6),
      issuingAuthority: z.string().min(3),
      edition: z.string().min(2),
      officialReference: z.string().min(6),
      retrievedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      licensing: z.string().min(6),
      supersedes: z.string().nullable(),
      provenanceStatus: z.enum(["official", "official-derived", "unverified"]),
    }),
  ).min(1),
  ambiguities: z.array(z.string()).default([]),
  units: z.array(unitSchema).min(1),
});

export type CurriculumPack = z.infer<typeof curriculumPackSchema>;
export type CurriculumUnit = z.infer<typeof unitSchema>;
export type CurriculumOutcome = z.infer<typeof outcomeSchema>;

export const questionSchema = z.object({
  id: z.string().regex(/^C9-[A-Z]{3}-U\d+-CH\d+-T\d+-O\d+-Q\d+$/),
  externalRef: z.string().min(10),
  outcomeId: z.string().regex(/^C9-[A-Z]{3}-U\d+-CH\d+-T\d+-O\d+$/),
  atomId: z.string().min(6),
  kind: z.enum([
    "mcq",
    "true_false",
    "fill_blank",
    "short_answer",
    "case_study",
    "assertion_reason",
    "data_interpretation",
    "applied_mcq",
  ]),
  difficulty: z.number().int().min(1).max(5),
  stimulus: z.string().nullable().default(null),
  prompt: z.string().min(12),
  options: z.array(z.string().min(1)).min(2).max(6).nullable(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(20),
  language: z.literal("en"),
  status: z.literal("draft"),
  verificationState: z.literal("unverified"),
  reviewNote: z.string().default(""),
  provenance: provenanceSchema,
});

export const questionPackSchema = z.object({
  packVersion: z.literal(1),
  subjectCode: z.enum(["MAT", "SCI"]),
  academicYear: z.literal(CLASS_9_ACADEMIC_YEAR),
  generatedBy: z.string().min(3),
  questions: z.array(questionSchema).min(1),
});

export type QuestionPack = z.infer<typeof questionPackSchema>;
export type PreparedQuestion = z.infer<typeof questionSchema>;

// ---------------------------------------------------------------------------
// Derived requirement math (from live gates, not from prose)
// ---------------------------------------------------------------------------

export type VolumeGates = {
  diagnosticMinimum: number;
  diagnosticTarget: number;
  minQuestionsPerOutcome: number;
};

/**
 * Required verified questions per unit.
 * Diagnostic uses `diagnosticTarget` items; a fresh reassessment excludes the
 * baseline's questions, so a unit needs a second non-overlapping set of the
 * same size. Outcome coverage adds a floor of minQuestionsPerOutcome per
 * outcome across both sittings.
 */
export function requiredQuestionsPerUnit(gates: VolumeGates, outcomeCount: number): number {
  const twoSittings = gates.diagnosticTarget * 2;
  const outcomeFloor = outcomeCount * gates.minQuestionsPerOutcome * 2;
  return Math.max(twoSittings, outcomeFloor, gates.diagnosticMinimum * 2);
}

export function flattenOutcomes(pack: CurriculumPack) {
  return pack.units.flatMap((u) =>
    u.chapters.flatMap((c) =>
      c.topics.flatMap((t) =>
        t.outcomes.map((o) => ({ unit: u, chapter: c, topic: t, outcome: o })),
      ),
    ),
  );
}

/** Cheap near-duplicate signature: lowercase alphanumerics, sorted tokens. */
export function normaliseForDuplicateCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

export type IntegrityIssue = { level: "error" | "warning"; code: string; detail: string };

export function checkPackIntegrity(pack: CurriculumPack, questions: PreparedQuestion[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const rows = flattenOutcomes(pack);
  const outcomeIds = new Set(rows.map((r) => r.outcome.id));
  const atomIds = new Set(rows.flatMap((r) => r.outcome.atoms.map((a) => a.id)));

  const seenIds = new Set<string>();
  const seenRefs = new Set<string>();
  for (const r of rows) {
    for (const id of [r.unit.id, r.chapter.id, r.topic.id, r.outcome.id]) {
      if (seenIds.has(id + "@node")) continue;
      seenIds.add(id + "@node");
    }
    if (seenRefs.has(r.outcome.externalRef)) {
      issues.push({ level: "error", code: "DUPLICATE_EXTERNAL_REF", detail: r.outcome.externalRef });
    }
    seenRefs.add(r.outcome.externalRef);
    if (!r.outcome.id.startsWith(r.topic.id)) {
      issues.push({ level: "error", code: "HIERARCHY_BREAK", detail: `${r.outcome.id} not under ${r.topic.id}` });
    }
  }

  const qIds = new Set<string>();
  const qRefs = new Set<string>();
  const signatures = new Map<string, string>();
  for (const q of questions) {
    if (qIds.has(q.id)) issues.push({ level: "error", code: "DUPLICATE_QUESTION_ID", detail: q.id });
    qIds.add(q.id);
    if (qRefs.has(q.externalRef)) issues.push({ level: "error", code: "DUPLICATE_QUESTION_REF", detail: q.externalRef });
    qRefs.add(q.externalRef);
    if (!outcomeIds.has(q.outcomeId)) {
      issues.push({ level: "error", code: "ORPHAN_QUESTION", detail: `${q.id} → ${q.outcomeId}` });
    }
    if (!atomIds.has(q.atomId)) {
      issues.push({ level: "error", code: "ORPHAN_ATOM", detail: `${q.id} → ${q.atomId}` });
    }
    if (q.options) {
      const uniq = new Set(q.options.map((o) => o.trim().toLowerCase()));
      if (uniq.size !== q.options.length) {
        issues.push({ level: "error", code: "DUPLICATE_OPTION", detail: q.id });
      }
      if (!q.options.includes(q.correctAnswer)) {
        issues.push({ level: "error", code: "ANSWER_NOT_IN_OPTIONS", detail: q.id });
      }
    }
    if (q.explanation.toLowerCase().includes("option a is correct")) {
      issues.push({ level: "warning", code: "WEAK_EXPLANATION", detail: q.id });
    }
    const sig = normaliseForDuplicateCheck(q.prompt);
    const clash = signatures.get(sig);
    if (clash) issues.push({ level: "error", code: "NEAR_DUPLICATE_PROMPT", detail: `${clash} ≈ ${q.id}` });
    signatures.set(sig, q.id);
    if (q.status !== "draft" || q.verificationState !== "unverified") {
      issues.push({ level: "error", code: "PREMATURE_APPROVAL", detail: q.id });
    }
  }
  return issues;
}

export type UnitReadinessRow = {
  unitId: string;
  unitTitle: string;
  outcomes: number;
  required: number;
  prepared: number;
  structurallyValid: number;
  readyForReview: number;
  humanReviewed: number;
  verified: number;
  approved: number;
  outcomeCoveragePct: number;
  difficultyMix: Record<number, number>;
  allocationReady: boolean;
  reassessmentReady: boolean;
  shortfall: number;
  blockingReason: string;
};

export function buildReadinessMatrix(
  pack: CurriculumPack,
  questions: PreparedQuestion[],
  gates: VolumeGates,
): UnitReadinessRow[] {
  return pack.units.map((u) => {
    const outcomes = u.chapters.flatMap((c) => c.topics.flatMap((t) => t.outcomes));
    const outcomeIds = new Set(outcomes.map((o) => o.id));
    const qs = questions.filter((q) => outcomeIds.has(q.outcomeId));
    const required = requiredQuestionsPerUnit(gates, outcomes.length);
    const covered = new Set(qs.map((q) => q.outcomeId));
    const difficultyMix: Record<number, number> = {};
    for (const q of qs) difficultyMix[q.difficulty] = (difficultyMix[q.difficulty] ?? 0) + 1;
    const verified = qs.filter((q) => q.verificationState === "verified").length;
    const shortfall = Math.max(required - verified, 0);
    return {
      unitId: u.id,
      unitTitle: u.title,
      outcomes: outcomes.length,
      required,
      prepared: qs.length,
      structurallyValid: qs.length,
      readyForReview: qs.length,
      humanReviewed: 0,
      verified,
      approved: 0,
      outcomeCoveragePct: outcomes.length === 0 ? 0 : Math.round((covered.size / outcomes.length) * 100),
      difficultyMix,
      allocationReady: verified >= gates.diagnosticTarget,
      reassessmentReady: verified >= gates.diagnosticTarget * 2,
      shortfall,
      blockingReason:
        shortfall > 0
          ? `${shortfall} more verified question(s) needed; human subject-expert review not yet performed`
          : "None",
    };
  });
}
