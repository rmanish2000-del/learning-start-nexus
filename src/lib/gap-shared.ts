// Sprint 6G: curriculum-aware gap detection — pure, browser-safe logic.
// A submitted diagnostic is scored per assessment outcome; each outcome's
// percentage lands in one of the org's mastery bands (Beginning / Developing /
// Proficient / Advanced), which maps to a Weak / Medium / Strong category and
// a deterministic risk level. Intervention recommendations come straight from
// the blueprint's intervention map. No AI, no writes: same inputs always
// produce the same analysis, and the audit center re-runs it verbatim.

import { z } from "zod";

import { normalizeAnswer } from "./assessment-shared";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export type GapBookDto = {
  id: string;
  title: string;
  board: string | null;
  grade: number;
  subject: string;
  status: string;
};

export type SubmittedSessionDto = {
  id: string;
  learnerId: string;
  learnerName: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentKind: string;
  submittedAt: string | null;
  scorePct: number | null;
  correctCount: number | null;
  totalCount: number | null;
};

export type MasteryBandDto = {
  id: string;
  label: string;
  minScore: number;
  maxScore: number;
  color: string;
  sortOrder: number;
};

export type InterventionRef = {
  failurePattern: string;
  recommendedIntervention: string;
  priority: number;
};

// One full traceability hop: Gap → Outcome → Learning Outcome → Topic →
// Chapter → Unit. An outcome may map to several learning outcomes.
export type TraceLink = {
  learningOutcomeId: string;
  learningOutcomeText: string;
  topicTitle: string;
  chapterTitle: string;
  unitTitle: string;
};

export type GapCategory = "weak" | "medium" | "strong";
export type RiskLevel = "high" | "medium" | "low";

export type OutcomeAnalysis = {
  outcomeId: string;
  code: string;
  title: string;
  bloomLevel: string;
  difficulty: number;
  weight: number;
  questionsTotal: number;
  questionsCorrect: number;
  pointsEarned: number;
  pointsTotal: number;
  pct: number | null;
  bandLabel: string | null;
  bandColor: string | null;
  bandRank: number; // 1 = lowest band in the mastery framework
  gapCategory: GapCategory;
  riskScore: number; // diagnostic weight × outcome difficulty (curriculum weighting)
  riskLevel: RiskLevel;
  interventions: InterventionRef[];
  traces: TraceLink[];
};

export type GapAnalysis = {
  session: {
    id: string;
    assessmentTitle: string;
    assessmentKind: string;
    status: string;
    submittedAt: string | null;
  };
  learner: { id: string; fullName: string; grade: number; masteryScore: number };
  book: { id: string; title: string; board: string | null; grade: number; subject: string };
  unit: { id: string; title: string } | null;
  levels: MasteryBandDto[];
  rows: OutcomeAnalysis[];
  totals: {
    questions: number;
    correct: number;
    scorePct: number;
    bandLabel: string | null;
    bandColor: string | null;
  };
  counts: { weak: number; medium: number; strong: number };
  learnerView: { strengths: string[]; growthAreas: string[]; priorityAreas: string[] };
};

// ---------------------------------------------------------------------------
// Deterministic rules — rendered verbatim by the dashboard and audit center.
// ---------------------------------------------------------------------------

export const SCORING_RULES: string[] = [
  "Grading: numeric answers match with tolerance 0.0001; text answers match case- and punctuation-insensitively; blank answers are always incorrect",
  "Per outcome: raw score = correct questions / total questions mapped to that outcome; percentage = round(100 × correct / total)",
  "Points are reported for reference; the percentage is question-count based so every mapped question weighs equally",
];

export const CATEGORY_RULES: string[] = [
  "Each outcome percentage falls into exactly one mastery band from the org's configured framework (ordered by sort order)",
  "Band rank 1 (lowest band, e.g. Beginning) → Weak outcome",
  "Band rank 2 (e.g. Developing) → Medium outcome",
  "Band rank 3 and above (e.g. Proficient, Advanced) → Strong outcome",
  "A percentage outside every configured band is treated as the lowest band",
];

export const RISK_RULES: string[] = [
  "Curriculum weighting: risk score = diagnostic weight × outcome difficulty (same weighting as the Diagnostic Engine)",
  "Benchmark = mean risk score across the outcomes measured by this diagnostic",
  "Strong outcomes → Low risk",
  "Medium outcomes → Medium risk when risk score ≥ 0.9 × benchmark, otherwise Low",
  "Weak outcomes → High risk when risk score ≥ 0.9 × benchmark, otherwise Medium",
];

// ---------------------------------------------------------------------------
// Grading (kind-agnostic over the question bank)
// ---------------------------------------------------------------------------

export function gradeBankAnswer(correctAnswer: string, given: string | undefined): boolean {
  if (!given || !given.trim()) return false;
  const g = Number(given);
  const c = Number(correctAnswer);
  if (Number.isFinite(g) && Number.isFinite(c)) return Math.abs(g - c) < 0.0001;
  return normalizeAnswer(given) === normalizeAnswer(correctAnswer);
}

// ---------------------------------------------------------------------------
// Band / category / risk derivation
// ---------------------------------------------------------------------------

export function bandForScore(
  levels: MasteryBandDto[],
  pct: number,
): { band: MasteryBandDto | null; rank: number } {
  const idx = levels.findIndex((l) => pct >= l.minScore && pct <= l.maxScore);
  return { band: idx >= 0 ? levels[idx] : null, rank: idx >= 0 ? idx + 1 : 0 };
}

export function deriveCategory(rank: number): GapCategory {
  if (rank <= 1) return "weak";
  if (rank === 2) return "medium";
  return "strong";
}

export function deriveRisk(category: GapCategory, riskScore: number, benchmark: number): RiskLevel {
  if (category === "strong") return "low";
  const atOrAbove = riskScore >= benchmark * 0.9;
  if (category === "medium") return atOrAbove ? "medium" : "low";
  return atOrAbove ? "high" : "medium";
}

// ---------------------------------------------------------------------------
// The analyzer. Pure: identical inputs always produce identical outputs.
// ---------------------------------------------------------------------------

export type AnalysisQuestion = {
  id: string;
  outcomeId: string;
  correctAnswer: string;
  points: number;
  sortOrder: number;
};

export type AnalysisOutcome = {
  id: string;
  code: string;
  title: string;
  bloomLevel: string;
  difficulty: number;
  weight: number;
};

export type AnalysisInput = {
  levels: MasteryBandDto[];
  outcomes: AnalysisOutcome[];
  questions: AnalysisQuestion[];
  answers: Record<string, string>;
  interventionsByOutcome: Record<string, InterventionRef[]>;
  tracesByOutcome: Record<string, TraceLink[]>;
};

export const GAP_CATEGORY_ORDER: Record<GapCategory, number> = { weak: 0, medium: 1, strong: 2 };

export function scoreQuestions(
  questions: AnalysisQuestion[],
  answers: Record<string, string>,
): { correct: number; total: number; scorePct: number } {
  const total = questions.length;
  const correct = questions.filter((q) => gradeBankAnswer(q.correctAnswer, answers[q.id])).length;
  return { correct, total, scorePct: total === 0 ? 0 : Math.round((correct / total) * 100) };
}

export function buildOutcomeAnalyses(input: AnalysisInput): {
  rows: OutcomeAnalysis[];
  counts: { weak: number; medium: number; strong: number };
} {
  const byOutcome = new Map<string, AnalysisQuestion[]>();
  for (const q of input.questions) {
    const list = byOutcome.get(q.outcomeId) ?? [];
    list.push(q);
    byOutcome.set(q.outcomeId, list);
  }

  // Only outcomes actually measured by this diagnostic.
  const measured = input.outcomes.filter((o) => (byOutcome.get(o.id) ?? []).length > 0);

  const benchmark =
    measured.length === 0
      ? 0
      : measured.reduce((sum, o) => sum + o.weight * o.difficulty, 0) / measured.length;

  const rows: OutcomeAnalysis[] = measured.map((o) => {
    const qs = (byOutcome.get(o.id) ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
    const graded = qs.map((q) => gradeBankAnswer(q.correctAnswer, input.answers[q.id]));
    const questionsCorrect = graded.filter(Boolean).length;
    const pointsTotal = qs.reduce((sum, q) => sum + q.points, 0);
    const pointsEarned = qs.reduce((sum, q, i) => sum + (graded[i] ? q.points : 0), 0);
    const pct = qs.length === 0 ? null : Math.round((questionsCorrect / qs.length) * 100);
    const { band, rank } = pct === null ? { band: null, rank: 0 } : bandForScore(input.levels, pct);
    const gapCategory = deriveCategory(rank);
    const riskScore = o.weight * o.difficulty;
    return {
      outcomeId: o.id,
      code: o.code,
      title: o.title,
      bloomLevel: o.bloomLevel,
      difficulty: o.difficulty,
      weight: o.weight,
      questionsTotal: qs.length,
      questionsCorrect,
      pointsEarned,
      pointsTotal,
      pct,
      bandLabel: band?.label ?? null,
      bandColor: band?.color ?? null,
      bandRank: rank,
      gapCategory,
      riskScore,
      riskLevel: deriveRisk(gapCategory, riskScore, benchmark),
      interventions: input.interventionsByOutcome[o.id] ?? [],
      traces: input.tracesByOutcome[o.id] ?? [],
    };
  });

  rows.sort(
    (a, b) =>
      GAP_CATEGORY_ORDER[a.gapCategory] - GAP_CATEGORY_ORDER[b.gapCategory] ||
      b.weight - a.weight ||
      a.code.localeCompare(b.code),
  );

  return {
    rows,
    counts: {
      weak: rows.filter((r) => r.gapCategory === "weak").length,
      medium: rows.filter((r) => r.gapCategory === "medium").length,
      strong: rows.filter((r) => r.gapCategory === "strong").length,
    },
  };
}

// ---------------------------------------------------------------------------
// Learner view — student-friendly regrouping of the same rows.
// ---------------------------------------------------------------------------

export function buildLearnerView(rows: OutcomeAnalysis[]): {
  strengths: string[];
  growthAreas: string[];
  priorityAreas: string[];
} {
  return {
    strengths: rows.filter((r) => r.gapCategory === "strong").map((r) => r.title),
    growthAreas: rows.filter((r) => r.gapCategory === "medium").map((r) => r.title),
    priorityAreas: rows.filter((r) => r.gapCategory === "weak").map((r) => r.title),
  };
}

export const LEARNER_VIEW_COPY = {
  strengthsTitle: "Strengths",
  strengthsHint: "You're already confident here — keep it up!",
  growthTitle: "Growth areas",
  growthHint: "Almost there — a little more practice will lock these in.",
  priorityTitle: "Priority areas",
  priorityHint: "These come first in your next sessions with your educator.",
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const GAP_CATEGORY_LABELS: Record<GapCategory, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const gapBookSchema = z.object({ bookId: z.string().uuid() });
export const gapSessionSchema = z.object({ sessionId: z.string().uuid() });
