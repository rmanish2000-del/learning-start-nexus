// ₹199 Diagnostic MVP — pure, client-safe domain layer.
//
// Everything in this file is deterministic and free of I/O so the same code
// computes the parent-facing report in the browser, the persisted result on
// the server, and the numbers quoted on the upgrade page. No pricing or
// entitlement decision is ever taken from client input: these constants are
// the single source of truth and the server re-reads them on every call.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Pricing — paise, server-authoritative
// ---------------------------------------------------------------------------

export const PRICING = {
  diagnosticPaise: 19_900, // ₹199 one-time
  planPaise: 299_900, // ₹2,999 / year
  creditPaise: 19_900, // ₹199 credited against year one
  creditWindowDays: 30,
} as const;

export function formatInr(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: rupees % 1 === 0 ? 0 : 2 })}`;
}

// Marks a single chapter group typically carries in the board paper. Blueprint
// weights sum to 100 *within* a chapter group, so this is the right
// denominator — expressing them against the whole 80-mark paper would
// overstate every gap. Always presented as an estimate.
export const CHAPTER_GROUP_MARKS = 20;

export const DIAGNOSTIC_QUESTION_TARGET = 20;
export const DIAGNOSTIC_QUESTION_MINIMUM = 5;

// ---------------------------------------------------------------------------
// Mastery bands — colour is never the only signal; the label always ships
// ---------------------------------------------------------------------------

export type MasteryBand = "weak" | "developing" | "secure" | "strong";

export const BAND_LABELS: Record<MasteryBand, string> = {
  weak: "Weak",
  developing: "Developing",
  secure: "Secure",
  strong: "Strong",
};

export const BAND_ORDER: MasteryBand[] = ["weak", "developing", "secure", "strong"];

export function bandFor(pct: number): MasteryBand {
  if (pct < 40) return "weak";
  if (pct < 60) return "developing";
  if (pct < 80) return "secure";
  return "strong";
}

// A gap is any outcome the learner did not hold at 70% — the same threshold
// the centre-side gap engine uses, so parent and staff numbers agree.
export const GAP_THRESHOLD_PCT = 70;

export type GapSeverity = "high" | "moderate" | "low";

export function severityFor(pct: number): GapSeverity {
  if (pct < 40) return "high";
  if (pct < 60) return "moderate";
  return "low";
}

// ---------------------------------------------------------------------------
// Scoring — outcome-level, curriculum-mapped
// ---------------------------------------------------------------------------

export type GradedItem = {
  questionId: string;
  outcomeId: string;
  code: string;
  title: string;
  weight: number; // blueprint diagnostic_weight (%)
  interventionStrategy: string;
  prompt: string;
  correct: boolean;
  answered: boolean;
};

export type OutcomeResult = {
  outcomeId: string;
  code: string;
  title: string;
  weight: number;
  total: number;
  correct: number;
  pct: number;
  band: MasteryBand;
};

export type GapCard = {
  outcomeId: string;
  code: string;
  title: string;
  weight: number;
  pct: number;
  band: MasteryBand;
  severity: GapSeverity;
  questionsMissed: number;
  questionsTotal: number;
  marksAtRisk: number;
  intervention: string;
  priorityScore: number;
};

export type DiagnosticReport = {
  totalQuestions: number;
  answeredQuestions: number;
  correctQuestions: number;
  scorePct: number;
  outcomes: OutcomeResult[];
  bandCounts: Record<MasteryBand, number>;
  secureOutcomes: OutcomeResult[];
  gaps: GapCard[];
  marksAtRiskTotal: number;
};

export function buildDiagnosticReport(items: GradedItem[]): DiagnosticReport {
  const byOutcome = new Map<string, GradedItem[]>();
  for (const item of items) {
    const list = byOutcome.get(item.outcomeId) ?? [];
    list.push(item);
    byOutcome.set(item.outcomeId, list);
  }

  const outcomes: OutcomeResult[] = [...byOutcome.values()]
    .map((group) => {
      const head = group[0]!;
      const total = group.length;
      const correct = group.filter((g) => g.correct).length;
      const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
      return {
        outcomeId: head.outcomeId,
        code: head.code,
        title: head.title,
        weight: head.weight,
        total,
        correct,
        pct,
        band: bandFor(pct),
      };
    })
    .sort((a, b) => (a.code < b.code ? -1 : 1));

  const bandCounts: Record<MasteryBand, number> = { weak: 0, developing: 0, secure: 0, strong: 0 };
  for (const o of outcomes) bandCounts[o.band]++;

  const strategyByOutcome = new Map(items.map((i) => [i.outcomeId, i.interventionStrategy]));

  // Blueprint weights are not guaranteed to sum to 100 across the outcomes we
  // actually assessed, so marks at risk are expressed as each outcome's share
  // of the assessed weight — the totals can never exceed the chapter group.
  const assessedWeight = outcomes.reduce((s, o) => s + o.weight, 0) || 1;

  const gaps: GapCard[] = outcomes
    .filter((o) => o.pct < GAP_THRESHOLD_PCT)
    .map((o) => ({
      outcomeId: o.outcomeId,
      code: o.code,
      title: o.title,
      weight: o.weight,
      pct: o.pct,
      band: o.band,
      severity: severityFor(o.pct),
      questionsMissed: o.total - o.correct,
      questionsTotal: o.total,
      marksAtRisk: Math.max(1, Math.round((o.weight / assessedWeight) * CHAPTER_GROUP_MARKS)),
      intervention: strategyByOutcome.get(o.outcomeId) ?? "Targeted re-teach followed by a fresh-item re-check.",
      priorityScore: o.weight * (100 - o.pct),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore || (a.code < b.code ? -1 : 1));

  const total = items.length;
  const correct = items.filter((i) => i.correct).length;

  return {
    totalQuestions: total,
    answeredQuestions: items.filter((i) => i.answered).length,
    correctQuestions: correct,
    scorePct: total === 0 ? 0 : Math.round((correct / total) * 100),
    outcomes,
    bandCounts,
    secureOutcomes: outcomes.filter((o) => o.pct >= GAP_THRESHOLD_PCT),
    gaps,
    marksAtRiskTotal: 0,
  };
}

export function withMarksAtRisk(report: DiagnosticReport): DiagnosticReport {
  return { ...report, marksAtRiskTotal: report.gaps.reduce((s, g) => s + g.marksAtRisk, 0) };
}

// The projection shown on the report. Deliberately a band, never a promise.
export function closureProjection(): { weeks: number; liftLow: number; liftHigh: number } {
  return { weeks: 12, liftLow: 25, liftHigh: 45 };
}

// ---------------------------------------------------------------------------
// Upgrade trigger logic — one function, consulted by the report page, the
// /upgrade page, and the server before it charges anything.
// ---------------------------------------------------------------------------

export type UpgradeOffer = {
  listPaise: number;
  creditPaise: number;
  firstInvoicePaise: number;
  creditApplied: boolean;
  creditExpiresAt: string | null;
  daysLeft: number;
};

export function upgradeOffer(args: {
  diagnosticPaidAt: string | null;
  creditConsumed: boolean;
  now?: Date;
}): UpgradeOffer {
  const now = args.now ?? new Date();
  const base: UpgradeOffer = {
    listPaise: PRICING.planPaise,
    creditPaise: 0,
    firstInvoicePaise: PRICING.planPaise,
    creditApplied: false,
    creditExpiresAt: null,
    daysLeft: 0,
  };
  if (!args.diagnosticPaidAt || args.creditConsumed) return base;

  const paidAt = new Date(args.diagnosticPaidAt);
  const expires = new Date(paidAt.getTime() + PRICING.creditWindowDays * 86_400_000);
  if (now >= expires) return base;

  const daysLeft = Math.max(1, Math.ceil((expires.getTime() - now.getTime()) / 86_400_000));
  return {
    listPaise: PRICING.planPaise,
    creditPaise: PRICING.creditPaise,
    firstInvoicePaise: PRICING.planPaise - PRICING.creditPaise,
    creditApplied: true,
    creditExpiresAt: expires.toISOString(),
    daysLeft,
  };
}

// Should the report page surface the upgrade block, and how hard?
export function upgradeTrigger(report: DiagnosticReport): {
  show: boolean;
  headline: string;
  reason: "gaps_found" | "all_secure";
} {
  if (report.gaps.length > 0) {
    return {
      show: true,
      headline: `Close ${report.gaps.length} ${report.gaps.length === 1 ? "gap" : "gaps"} this year`,
      reason: "gaps_found",
    };
  }
  return {
    show: true,
    headline: "Keep this level through the board year",
    reason: "all_secure",
  };
}

// ---------------------------------------------------------------------------
// Entitlement resolver — pure, no I/O
// ---------------------------------------------------------------------------

export type EntitlementRow = {
  kind: "diagnostic_credit" | "board_success_plan";
  granted_at: string;
  consumed_at: string | null;
  expires_at: string | null;
};

export type Capabilities = {
  canRunDiagnostic: boolean;
  hasPlan: boolean;
  unlimitedDiagnostics: boolean;
  aiTutor: "none" | "taste" | "unlimited";
  reassessment: boolean;
  fortnightlyReport: boolean;
};

export function resolveCapabilities(rows: EntitlementRow[], now: Date = new Date()): Capabilities {
  const live = rows.filter((r) => !r.expires_at || new Date(r.expires_at) > now);
  const hasPlan = live.some((r) => r.kind === "board_success_plan" && !r.consumed_at);
  const credit = live.some((r) => r.kind === "diagnostic_credit" && !r.consumed_at);
  return {
    canRunDiagnostic: hasPlan || credit,
    hasPlan,
    unlimitedDiagnostics: hasPlan,
    aiTutor: hasPlan ? "unlimited" : credit || rows.length > 0 ? "taste" : "none",
    reassessment: hasPlan,
    fortnightlyReport: hasPlan,
  };
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const createDiagnosticOrderSchema = z.object({
  learnerId: z.string().uuid(),
  bookId: z.string().uuid(),
  unitId: z.string().uuid(),
  utm: z.record(z.string(), z.string()).optional(),
});

export const orderRefSchema = z.object({ orderRef: z.string().min(8).max(64) });

export const verifyPaymentSchema = z.object({
  orderRef: z.string().min(8).max(64),
  razorpayOrderId: z.string().min(4).max(80),
  razorpayPaymentId: z.string().min(4).max(80),
  signature: z.string().min(16).max(256),
});

export const paymentFailureSchema = z.object({
  orderRef: z.string().min(8).max(64),
  reason: z.string().trim().min(1).max(300).default("Payment not completed"),
});

// Setup carries no identity fields any more: the parent account and the
// student profile are established before the order exists.
export const setupDiagnosticSchema = z.object({
  orderRef: z.string().min(8).max(64),
});

export const tokenSchema = z.object({ token: z.string().min(16).max(64) });

export const answerSchema = z.object({
  token: z.string().min(16).max(64),
  questionId: z.string().uuid(),
  answer: z.string().max(500),
  position: z.number().int().min(0).max(200),
});

export const createUpgradeOrderSchema = z.object({ token: z.string().min(16).max(64) });
