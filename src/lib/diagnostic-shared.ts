// Sprint 6F: shared types, pure allocation math, and validation for the
// Curriculum-Driven Diagnostic Engine. Client-safe — no server-only imports.
//
// The SAME functions compute the live preview in the UI, persist generated
// diagnostics on the server, and re-derive expected results in the audit
// center — so the database can always be checked against the algorithm.
//
// Chain: Board → Grade → Subject → Book → Unit → Outcomes (weights) →
// approved bank questions. Generation only: no auto-assign, no auto
// interventions, no mastery changes.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export type DiagnosticTemplateKind = "diagnostic" | "reassessment";

export const DIAGNOSTIC_TEMPLATE_LABELS: Record<DiagnosticTemplateKind, string> = {
  diagnostic: "Diagnostic",
  reassessment: "Reassessment",
};

export const DIAGNOSTIC_TEMPLATE_DESCRIPTIONS: Record<DiagnosticTemplateKind, string> = {
  diagnostic:
    "First measurement of a unit. Questions are allocated across outcomes by blueprint weight (largest remainder), taken from the approved bank in deterministic order.",
  reassessment:
    "Post-intervention re-check of the same unit. Excludes the baseline diagnostic's questions whenever alternatives exist and prefers approved questions no assessment has used yet.",
};

// The rules, printed verbatim in the UI and audit center so the engine's
// behavior is independently verifiable.
export const ENGINE_RULES: string[] = [
  "Question allocation follows blueprint weights via largest-remainder rounding (ties break by outcome code).",
  "Only approved bank questions are ever selected — drafts are invisible to the engine.",
  "Within an outcome, questions are taken in deterministic order: difficulty ascending, then id.",
  "Reassessments exclude the baseline diagnostic's questions while alternatives exist, and prefer globally unused approved questions.",
  "Generation writes only the assessment header, its question map, and a book event — never assignments, interventions, gaps, or mastery.",
];

// ---------------------------------------------------------------------------
// Inputs to the planner
// ---------------------------------------------------------------------------

export type EngineQuestion = {
  id: string;
  kind: string;
  difficulty: number;
  prompt: string;
};

export type EngineOutcome = {
  id: string;
  code: string;
  title: string;
  category: string;
  bloomLevel: string;
  difficulty: number;
  diagnosticWeight: number;
  status: string;
  // Approved questions only, any order — the planner sorts them.
  questions: EngineQuestion[];
};

// ---------------------------------------------------------------------------
// Weight allocation — largest remainder, deterministic
// ---------------------------------------------------------------------------

export function allocateByWeight(
  outcomes: { id: string; code: string; diagnosticWeight: number }[],
  total: number,
): Map<string, number> {
  const result = new Map<string, number>();
  if (outcomes.length === 0 || total <= 0) return result;
  for (const o of outcomes) result.set(o.id, 0);

  const weightTotal = outcomes.reduce((s, o) => s + o.diagnosticWeight, 0);
  const rows = outcomes.map((o) => {
    const exact = weightTotal > 0 ? (o.diagnosticWeight / weightTotal) * total : total / outcomes.length;
    const floor = Math.floor(exact);
    return { id: o.id, code: o.code, floor, rem: exact - floor };
  });
  let assigned = rows.reduce((s, r) => s + r.floor, 0);
  for (const r of rows) result.set(r.id, r.floor);

  // Hand out the leftover seats by largest fractional remainder; ties by code.
  const order = [...rows].sort((a, b) => b.rem - a.rem || (a.code < b.code ? -1 : 1));
  let i = 0;
  while (assigned < total && order.length > 0) {
    const r = order[i % order.length]!;
    result.set(r.id, (result.get(r.id) ?? 0) + 1);
    assigned++;
    i++;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Gap prediction preview — deterministic, curriculum-weighting only (no AI,
// no learner data). riskScore = diagnosticWeight × outcome difficulty; bands
// are relative to the unit mean.
// ---------------------------------------------------------------------------

export type RiskBand = "high" | "watch" | "standard";

export type RiskRow = {
  outcomeId: string;
  code: string;
  title: string;
  weight: number;
  difficulty: number;
  riskScore: number;
  band: RiskBand;
};

export const RISK_BAND_LABELS: Record<RiskBand, string> = {
  high: "High risk",
  watch: "Watch",
  standard: "Standard",
};

export function predictRisks(
  outcomes: { id: string; code: string; title: string; diagnosticWeight: number; difficulty: number }[],
): RiskRow[] {
  if (outcomes.length === 0) return [];
  const rows = outcomes.map((o) => ({
    outcomeId: o.id,
    code: o.code,
    title: o.title,
    weight: o.diagnosticWeight,
    difficulty: o.difficulty,
    riskScore: o.diagnosticWeight * o.difficulty,
  }));
  const mean = rows.reduce((s, r) => s + r.riskScore, 0) / rows.length;
  return rows
    .map((r) => ({
      ...r,
      band: (r.riskScore >= mean * 1.1 ? "high" : r.riskScore >= mean * 0.9 ? "watch" : "standard") as RiskBand,
    }))
    .sort((a, b) => b.riskScore - a.riskScore || (a.code < b.code ? -1 : 1));
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

export type PlannedQuestion = EngineQuestion & { reused: boolean };

export type OutcomePlan = {
  outcomeId: string;
  code: string;
  title: string;
  weight: number;
  targetQuestions: number;
  actualQuestions: number;
  shortfall: number;
  difficultyMix: Record<number, number>;
  questions: PlannedQuestion[];
};

export type PlanCompliance = {
  targetCoveragePct: number;
  actualCoveragePct: number;
  coverageGapPct: number;
  outcomesMeasured: number;
  outcomesTargeted: number;
  weightMeasured: number;
  weightTotal: number;
};

export type DiagnosticPlan = {
  template: DiagnosticTemplateKind;
  totalQuestions: number;
  outcomes: OutcomePlan[];
  // Outcomes the engine cannot measure (no approved questions in the bank).
  uncovered: { outcomeId: string; code: string; title: string; weight: number }[];
  compliance: PlanCompliance;
  risks: RiskRow[];
  plannedQuestionIds: string[];
  reusedCount: number;
};

function sortBank(questions: EngineQuestion[]): EngineQuestion[] {
  return [...questions].sort((a, b) => a.difficulty - b.difficulty || (a.id < b.id ? -1 : 1));
}

export function buildDiagnosticPlan(args: {
  template: DiagnosticTemplateKind;
  outcomes: EngineOutcome[];
  totalQuestions: number;
  // Reassessment only: question ids of the baseline diagnostic.
  excludeQuestionIds?: Set<string>;
  // Question ids already mapped to any assessment of this book.
  usedQuestionIds?: Set<string>;
}): DiagnosticPlan {
  const { template, outcomes, totalQuestions } = args;
  const exclude = args.excludeQuestionIds ?? new Set<string>();
  const used = args.usedQuestionIds ?? new Set<string>();

  const coverable = outcomes.filter((o) => o.questions.length > 0);
  const uncovered = outcomes
    .filter((o) => o.questions.length === 0)
    .map((o) => ({ outcomeId: o.id, code: o.code, title: o.title, weight: o.diagnosticWeight }));

  const allocation = allocateByWeight(coverable, totalQuestions);

  const plannedQuestionIds: string[] = [];
  let reusedCount = 0;

  const outcomePlans: OutcomePlan[] = coverable.map((o) => {
    const target = allocation.get(o.id) ?? 0;
    const sorted = sortBank(o.questions);

    let picked: EngineQuestion[];
    if (template === "reassessment") {
      // Alternatives first: not in the baseline, unused anywhere preferred.
      const primary = sorted
        .filter((q) => !exclude.has(q.id))
        .sort((a, b) => {
          const au = used.has(a.id) ? 1 : 0;
          const bu = used.has(b.id) ? 1 : 0;
          return au - bu || a.difficulty - b.difficulty || (a.id < b.id ? -1 : 1);
        });
      picked = primary.slice(0, target);
      if (picked.length < target) {
        // Alternatives exhausted — fall back to baseline questions.
        const fallback = sorted.filter((q) => exclude.has(q.id) && !picked.some((p) => p.id === q.id));
        picked = [...picked, ...fallback.slice(0, target - picked.length)];
      }
    } else {
      picked = sorted.slice(0, target);
    }

    const planned: PlannedQuestion[] = picked.map((q) => {
      const reused = used.has(q.id) || exclude.has(q.id);
      if (reused) reusedCount++;
      return { ...q, reused };
    });
    for (const q of picked) plannedQuestionIds.push(q.id);

    const difficultyMix: Record<number, number> = {};
    for (const q of planned) {
      difficultyMix[q.difficulty] = (difficultyMix[q.difficulty] ?? 0) + 1;
    }

    return {
      outcomeId: o.id,
      code: o.code,
      title: o.title,
      weight: o.diagnosticWeight,
      targetQuestions: target,
      actualQuestions: planned.length,
      shortfall: target - planned.length,
      difficultyMix,
      questions: planned,
    };
  });

  const weightTotal = outcomes.reduce((s, o) => s + o.diagnosticWeight, 0);
  const weightMeasured = outcomePlans
    .filter((p) => p.actualQuestions > 0)
    .reduce((s, p) => s + p.weight, 0);
  const actualCoveragePct = weightTotal === 0 ? 0 : Math.round((weightMeasured / weightTotal) * 100);

  return {
    template,
    totalQuestions,
    outcomes: outcomePlans,
    uncovered,
    compliance: {
      targetCoveragePct: weightTotal === 0 ? 0 : 100,
      actualCoveragePct,
      coverageGapPct: weightTotal === 0 ? 0 : 100 - actualCoveragePct,
      outcomesMeasured: outcomePlans.filter((p) => p.actualQuestions > 0).length,
      outcomesTargeted: coverable.length,
      weightMeasured,
      weightTotal,
    },
    risks: predictRisks(outcomes),
    plannedQuestionIds,
    reusedCount,
  };
}

// ---------------------------------------------------------------------------
// Workspace DTOs
// ---------------------------------------------------------------------------

export type DiagnosticBookDto = {
  id: string;
  title: string;
  board: string | null;
  grade: number;
  subject: string;
  status: string;
};

export type GeneratedAssessmentDto = {
  id: string;
  title: string;
  kind: string;
  status: string;
  questionCount: number;
  createdAt: string;
};

export type DiagnosticWorkspace = {
  book: DiagnosticBookDto;
  units: { id: string; title: string; position: number }[];
  selectedUnitId: string | null;
  // Active outcomes of the selected unit with their approved questions.
  outcomes: EngineOutcome[];
  // Question ids already mapped to any assessment of this book.
  usedQuestionIds: string[];
  // Existing diagnostics of this book (baseline choices for reassessment),
  // each with their mapped question ids for the exclusion rule.
  diagnostics: { id: string; title: string; unitId: string | null; questionIds: string[] }[];
  generated: GeneratedAssessmentDto[];
};

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const diagnosticWorkspaceSchema = z.object({
  bookId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
});

export const generateDiagnosticSchema = z.object({
  bookId: z.string().uuid(),
  unitId: z.string().uuid(),
  template: z.enum(["diagnostic", "reassessment"]),
  totalQuestions: z.number().int().min(3).max(30),
  // Publishing requires a duration (assessment-lifecycle publish gate), so the
  // engine always stamps one; the caller may override it.
  timeLimitMinutes: z.number().int().min(5).max(180).optional(),
  baselineAssessmentId: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(120).optional(),
  publishNow: z.boolean(),
});
