// Sprint 6C: shared types, validation, and the deterministic mastery
// projection for the Assessment Blueprint Engine.
// Client-safe — no server-only imports.
//
// Chain: Curriculum (Topic → Learning Outcome) → Assessment Outcome →
// Diagnostic Weight → Intervention Mapping → Mastery Level.
// This sprint ships no question generation and no automated reassignment.

import { z } from "zod";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export type MasteryLevelDto = {
  id: string;
  label: string;
  minScore: number;
  maxScore: number;
  color: string;
  sortOrder: number;
};

export type InterventionMappingDto = {
  id: string;
  failurePattern: string;
  recommendedIntervention: string;
  priority: number;
};

export type OutcomeMappingDto = {
  id: string;
  curriculumOutcomeId: string;
  learningOutcomeText: string;
  learningOutcomeStatus: string;
  topicId: string;
  topicTitle: string;
  chapterTitle: string;
};

export type AssessmentOutcomeDto = {
  id: string;
  code: string;
  title: string;
  category: string;
  bloomLevel: string;
  difficulty: number;
  diagnosticWeight: number;
  questionTypes: string[];
  interventionStrategy: string;
  status: string;
  mappings: OutcomeMappingDto[];
  interventions: InterventionMappingDto[];
};

export type BlueprintUnitDto = {
  id: string;
  title: string;
  position: number;
  weightSum: number;
  outcomes: AssessmentOutcomeDto[];
};

export type BlueprintWorkspace = {
  book: {
    id: string;
    title: string;
    board: string | null;
    grade: number;
    subject: string;
    status: string;
  };
  units: BlueprintUnitDto[];
  totals: {
    units: number;
    outcomes: number;
    mappings: number;
    interventions: number;
  };
};

export type LearnerOption = {
  id: string;
  fullName: string;
  grade: number;
  subject: string;
  masteryScore: number;
};

// One row of the mastery projection: a mapped assessment outcome with its
// evidence (if any) and the level the projection lands in.
export type ProjectionRow = {
  outcomeId: string;
  code: string;
  title: string;
  unitTitle: string;
  weight: number;
  evidenceScore: number | null;
  projectedScore: number;
  projectedLevel: string;
};

export type MasteryPreview = {
  learner: LearnerOption;
  bookSubject: string;
  priorMastery: number;
  evidenceScore: number | null;
  evidenceLabel: string | null;
  rows: ProjectionRow[];
  overall: number;
  overallLevel: MasteryLevelDto | null;
  basis: "prior_only" | "blended";
};

// ---------------------------------------------------------------------------
// Deterministic mastery projection (preview only — no reassignment yet).
//
// For each mapped assessment outcome:
//   projected score = evidence score when evidence exists, else the learner's
//   current mastery (prior).
// Overall:
//   no evidence  -> overall = prior mastery
//   with evidence -> overall = round(0.5 * prior + 0.5 * evidenceMean)
//   where evidenceMean = Σ(score × weight) / Σ(weight) over scored outcomes.
// Same inputs always produce the same output; the audit center re-runs it.
// ---------------------------------------------------------------------------

export const MASTERY_FORMULA: string[] = [
  "Per outcome: projected score = evidence score if present, otherwise the learner's current mastery (prior)",
  "Evidence mean = Σ(score × diagnostic weight) ÷ Σ(weight) across outcomes that have evidence",
  "Overall projection = round(0.5 × prior mastery + 0.5 × evidence mean); with no evidence, overall = prior mastery",
  "Level = the mastery band whose [min, max] range contains the overall score",
];

export type ProjectionInputRow = {
  outcomeId: string;
  weight: number;
  evidenceScore: number | null;
};

export function projectMastery(
  rows: ProjectionInputRow[],
  priorMastery: number,
): { perOutcome: Map<string, number>; overall: number; basis: "prior_only" | "blended" } {
  const perOutcome = new Map<string, number>();
  for (const r of rows) {
    perOutcome.set(r.outcomeId, r.evidenceScore ?? priorMastery);
  }
  const scored = rows.filter((r) => r.evidenceScore !== null);
  if (scored.length === 0) {
    return { perOutcome, overall: priorMastery, basis: "prior_only" };
  }
  const totalWeight = scored.reduce((sum, r) => sum + r.weight, 0);
  const evidenceMean =
    totalWeight === 0
      ? priorMastery
      : scored.reduce((sum, r) => sum + (r.evidenceScore ?? 0) * r.weight, 0) / totalWeight;
  return {
    perOutcome,
    overall: Math.round(0.5 * priorMastery + 0.5 * evidenceMean),
    basis: "blended",
  };
}

export function levelForScore(levels: MasteryLevelDto[], score: number): MasteryLevelDto | null {
  return levels.find((l) => score >= l.minScore && score <= l.maxScore) ?? null;
}

export const BLOOM_LABELS: Record<string, string> = {
  remember: "Remember",
  understand: "Understand",
  apply: "Apply",
  analyze: "Analyze",
  evaluate: "Evaluate",
  create: "Create",
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Foundational",
  2: "Easy",
  3: "Moderate",
  4: "Challenging",
  5: "Advanced",
};

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const blueprintBookSchema = z.object({ bookId: z.string().uuid() });

export const masteryPreviewSchema = z.object({
  bookId: z.string().uuid(),
  learnerId: z.string().uuid(),
});

export const updateMasteryLevelSchema = z
  .object({
    levelId: z.string().uuid(),
    minScore: z.number().int().min(0).max(100),
    maxScore: z.number().int().min(0).max(100),
  })
  .refine((v) => v.minScore <= v.maxScore, "Min must not exceed max");
