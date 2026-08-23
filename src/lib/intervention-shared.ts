// Sprint 3: deterministic gap detection + recommendation rule book.
// Browser-safe pure functions — no server-only imports. The audit center
// renders this rule book verbatim so reviewers can verify determinism.

import type { ResultEntry } from "./assessment-shared";

export const GAP_THRESHOLD_PCT = 70;
export const HIGH_SEVERITY_BELOW_PCT = 50;

export type GapSeverity = "high" | "medium";

export type SubtopicStat = {
  subtopic: string;
  total: number;
  correct: number;
  pct: number;
  severity: GapSeverity | null; // null = at/above threshold, not a gap
};

// Severity ladder: < 50% = high, 50–69% = medium, >= 70% = no gap.
export function severityFor(pct: number): GapSeverity | null {
  if (pct < HIGH_SEVERITY_BELOW_PCT) return "high";
  if (pct < GAP_THRESHOLD_PCT) return "medium";
  return null;
}

// Aggregate a scored breakdown into per-subtopic accuracy. Pure: same input
// always yields the same output, in stable (sorted) order.
export function computeSubtopicStats(breakdown: ResultEntry[]): SubtopicStat[] {
  const bySubtopic = new Map<string, { total: number; correct: number }>();
  for (const entry of breakdown) {
    const bucket = bySubtopic.get(entry.subtopic) ?? { total: 0, correct: 0 };
    bucket.total += 1;
    if (entry.correct) bucket.correct += 1;
    bySubtopic.set(entry.subtopic, bucket);
  }
  return [...bySubtopic.entries()]
    .map(([subtopic, { total, correct }]) => {
      const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
      return { subtopic, total, correct, pct, severity: severityFor(pct) };
    })
    .sort((a, b) => a.subtopic.localeCompare(b.subtopic));
}

export type RecommendationRule = {
  ruleId: string;
  subtopic: string;
  severity: GapSeverity;
  priority: 1 | 2; // 1 = high severity (act first), 2 = medium
  title: string;
  activity: string;
};

// The deterministic rule book: (subtopic, severity) -> intervention template.
// Every recommendation row stores the rule_id that produced it.
export const RECOMMENDATION_RULES: RecommendationRule[] = [
  // Equivalence
  {
    ruleId: "EQV-HIGH",
    subtopic: "Equivalence",
    severity: "high",
    priority: 1,
    title: "Reteach: equivalent fractions",
    activity:
      "One-on-one reteach of equivalent fractions using area models and number lines, followed by 6 guided simplification problems.",
  },
  {
    ruleId: "EQV-MED",
    subtopic: "Equivalence",
    severity: "medium",
    priority: 2,
    title: "Guided practice: equivalent fractions",
    activity:
      "10-item guided practice set on simplifying and finding equivalent fractions with immediate feedback.",
  },
  // Compare & order
  {
    ruleId: "CMP-HIGH",
    subtopic: "Compare & order",
    severity: "high",
    priority: 1,
    title: "Reteach: comparing fractions",
    activity:
      "One-on-one reteach of comparing fractions with common denominators and number-line placement, followed by 6 guided comparison problems.",
  },
  {
    ruleId: "CMP-MED",
    subtopic: "Compare & order",
    severity: "medium",
    priority: 2,
    title: "Guided practice: comparing fractions",
    activity:
      "10-item guided practice set on comparing and ordering fractions with immediate feedback.",
  },
  // Add & subtract
  {
    ruleId: "ADD-HIGH",
    subtopic: "Add & subtract",
    severity: "high",
    priority: 1,
    title: "Reteach: adding & subtracting fractions",
    activity:
      "One-on-one reteach of unlike-denominator addition and subtraction, followed by 6 guided problems.",
  },
  {
    ruleId: "ADD-MED",
    subtopic: "Add & subtract",
    severity: "medium",
    priority: 2,
    title: "Guided practice: adding & subtracting fractions",
    activity:
      "10-item guided practice set on adding and subtracting fractions with unlike denominators.",
  },
  // Multiply & divide
  {
    ruleId: "MUL-HIGH",
    subtopic: "Multiply & divide",
    severity: "high",
    priority: 1,
    title: "Reteach: multiplying & dividing fractions",
    activity:
      "One-on-one reteach of fraction multiplication and division using area models, followed by 6 guided problems.",
  },
  {
    ruleId: "MUL-MED",
    subtopic: "Multiply & divide",
    severity: "medium",
    priority: 2,
    title: "Guided practice: multiplying & dividing fractions",
    activity:
      "10-item guided practice set on multiplying and dividing fractions, including fraction-of-a-quantity problems.",
  },
  // Fraction of a quantity
  {
    ruleId: "FQ-HIGH",
    subtopic: "Fraction of a quantity",
    severity: "high",
    priority: 1,
    title: "Reteach: fraction of a quantity",
    activity:
      "One-on-one reteach of finding a fraction of a quantity with bar models, followed by 6 guided problems.",
  },
  {
    ruleId: "FQ-MED",
    subtopic: "Fraction of a quantity",
    severity: "medium",
    priority: 2,
    title: "Guided practice: fraction of a quantity",
    activity: "10-item guided practice set on fraction-of-a-quantity word problems.",
  },
  // Decimals & mixed numbers
  {
    ruleId: "DM-HIGH",
    subtopic: "Decimals & mixed numbers",
    severity: "high",
    priority: 1,
    title: "Reteach: decimals & mixed numbers",
    activity:
      "One-on-one reteach of fraction–decimal conversion and mixed numbers, followed by 6 guided problems.",
  },
  {
    ruleId: "DM-MED",
    subtopic: "Decimals & mixed numbers",
    severity: "medium",
    priority: 2,
    title: "Guided practice: decimals & mixed numbers",
    activity:
      "10-item guided practice set converting between fractions, decimals, and mixed numbers.",
  },
];

// Rule lookup. Unknown subtopics fall back to a generic template so any future
// subtopic still maps deterministically.
export function ruleFor(subtopic: string, severity: GapSeverity): RecommendationRule {
  const exact = RECOMMENDATION_RULES.find(
    (r) => r.subtopic === subtopic && r.severity === severity,
  );
  if (exact) return exact;
  return severity === "high"
    ? {
        ruleId: "GEN-HIGH",
        subtopic,
        severity,
        priority: 1,
        title: `Reteach: ${subtopic}`,
        activity: `One-on-one reteach of ${subtopic}, followed by 6 guided problems.`,
      }
    : {
        ruleId: "GEN-MED",
        subtopic,
        severity,
        priority: 2,
        title: `Guided practice: ${subtopic}`,
        activity: `10-item guided practice set on ${subtopic} with immediate feedback.`,
      };
}

// Rationale text is generated deterministically from the gap numbers.
export function rationaleFor(gap: {
  subtopic: string;
  items_total: number;
  items_correct: number;
  gap_score_pct: number;
}): string {
  return `Gap detected: ${gap.items_correct}/${gap.items_total} correct (${gap.gap_score_pct}%) on ${gap.subtopic}; threshold is ${GAP_THRESHOLD_PCT}%.`;
}

export const GAP_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  addressed: "Addressed",
  dismissed: "Dismissed",
};

export const RECOMMENDATION_STATUS_LABELS: Record<string, string> = {
  suggested: "Suggested",
  accepted: "Accepted",
  dismissed: "Dismissed",
};

export const INTERVENTION_STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
