// Sprint 6E: shared types, labels, and pure coverage math for the
// curriculum-driven Assessment Builder. Client-safe — no server-only imports.
//
// Chain: Board → Grade → Subject → Unit → Outcome → selected bank questions.
// This sprint ships construction only: no auto-assign, no question generation,
// no grading changes.

import { z } from "zod";
import type { QuestionDto } from "./question-bank-shared";

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export type AssessmentTemplate = "diagnostic" | "practice" | "reassessment";

export const TEMPLATE_LABELS: Record<AssessmentTemplate, string> = {
  diagnostic: "Diagnostic",
  practice: "Practice",
  reassessment: "Reassessment",
};

export const TEMPLATE_DESCRIPTIONS: Record<AssessmentTemplate, string> = {
  diagnostic: "First measurement of a unit — feeds gap detection.",
  practice: "Low-stakes rehearsal built from the same outcome bank.",
  reassessment: "Post-intervention check — feeds mastery lift proof.",
};

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export type BuilderBookDto = {
  id: string;
  title: string;
  board: string | null;
  grade: number;
  subject: string;
  status: string;
};

export type BuilderOutcomeDto = {
  id: string;
  code: string;
  title: string;
  category: string;
  bloomLevel: string;
  difficulty: number;
  diagnosticWeight: number;
  questionTypes: string[];
  // Approved + draft bank questions for this outcome (picker data).
  questions: QuestionDto[];
  counts: {
    total: number;
    approved: number;
    byDifficulty: Record<number, number>;
    byKind: Record<string, number>;
  };
  // Intervention-map rows for the gap coverage preview.
  interventions: {
    failurePattern: string;
    recommendedIntervention: string;
    priority: number;
  }[];
};

export type BuilderUnitDto = { id: string; title: string; position: number };

export type BuiltAssessmentSummaryDto = {
  id: string;
  title: string;
  template: AssessmentTemplate;
  status: string;
  questionCount: number;
  createdAt: string;
};

export type BuilderWorkspace = {
  book: BuilderBookDto;
  units: BuilderUnitDto[];
  selectedUnitId: string | null;
  // Outcomes of the selected unit (empty until a unit is picked).
  outcomes: BuilderOutcomeDto[];
  builtAssessments: BuiltAssessmentSummaryDto[];
};

// Coverage summary — computed by computeCoverage, rendered live in the builder
// and recomputed verbatim in the audit center.
export type CoverageSummary = {
  questionCount: number;
  outcomesMeasured: number;
  outcomesTotal: number;
  outcomeCoveragePct: number;
  weightMeasured: number;
  weightTotal: number;
  blueprintAlignmentPct: number;
  difficultyMix: Record<number, number>;
};

export function computeCoverage(
  selected: { outcomeId: string; difficulty: number }[],
  unitOutcomes: { id: string; diagnosticWeight: number }[],
): CoverageSummary {
  const measuredIds = new Set(selected.map((q) => q.outcomeId));
  const weightTotal = unitOutcomes.reduce((s, o) => s + o.diagnosticWeight, 0);
  const weightMeasured = unitOutcomes
    .filter((o) => measuredIds.has(o.id))
    .reduce((s, o) => s + o.diagnosticWeight, 0);
  const difficultyMix: Record<number, number> = {};
  for (const q of selected) {
    difficultyMix[q.difficulty] = (difficultyMix[q.difficulty] ?? 0) + 1;
  }
  const outcomesTotal = unitOutcomes.length;
  return {
    questionCount: selected.length,
    outcomesMeasured: measuredIds.size,
    outcomesTotal,
    outcomeCoveragePct: outcomesTotal === 0 ? 0 : Math.round((measuredIds.size / outcomesTotal) * 100),
    weightMeasured,
    weightTotal,
    blueprintAlignmentPct: weightTotal === 0 ? 0 : Math.round((weightMeasured / weightTotal) * 100),
    difficultyMix,
  };
}

// Detail view of a built assessment (coverage view + gap preview).
export type AssessmentCoverageDetail = {
  assessment: {
    id: string;
    title: string;
    description: string | null;
    template: AssessmentTemplate;
    status: string;
    grade: number;
    subject: string;
    topic: string;
    timeLimitMinutes: number | null;
    createdAt: string;
  };
  questions: {
    id: string;
    sortOrder: number;
    points: number;
    outcomeCode: string;
    kind: string;
    difficulty: number;
    prompt: string;
  }[];
  coverage: CoverageSummary;
  gaps: {
    outcomeCode: string;
    outcomeTitle: string;
    failurePattern: string;
    recommendedIntervention: string;
    priority: number;
  }[];
};

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const builderUnitSchema = z.object({
  bookId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
});

export const buildAssessmentSchema = z.object({
  bookId: z.string().uuid(),
  unitId: z.string().uuid(),
  title: z.string().trim().min(3, "Title is required").max(120),
  description: z.string().trim().max(500).optional(),
  template: z.enum(["diagnostic", "practice", "reassessment"]),
  timeLimitMinutes: z.number().int().min(1).max(180).optional(),
  questionIds: z.array(z.string().uuid()).min(1, "Pick at least one question").max(50),
  publishNow: z.boolean(),
});

export const builtAssessmentSchema = z.object({
  assessmentId: z.string().uuid(),
});
