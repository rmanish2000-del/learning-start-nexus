// Pilot Evidence Foundation (P0) — pure, browser-safe contracts for:
//   M6 per-gap tutor logging (minutes, sessions, substantive interactions)
//   M7 CBSE competency question-type tagging
//   M8 reviewer verification + audit trail
// The evidence page prints these formulas verbatim so a reviewer can check
// the numbers by hand.

// ---------------------------------------------------------------------------
// M6 — tutor evidence per gap
// ---------------------------------------------------------------------------

export type TutorGapEvidence = {
  gapId: string;
  learnerId: string;
  learnerName: string;
  subject: string;
  topic: string;
  subtopic: string;
  severity: string;
  gapStatus: string;
  sessions: number;
  interactions: number;
  substantiveInteractions: number;
  tutorMinutes: number;
  firstAt: string | null;
  lastAt: string | null;
};

export type TutorEvidenceTotals = {
  gapsWithTutorEvidence: number;
  sessions: number;
  interactions: number;
  substantiveInteractions: number;
  tutorMinutes: number;
};

export const TUTOR_MINUTES_FORMULA: string[] = [
  "Tutor minutes: per session, sum the elapsed time between consecutive interactions, capping each interval at 5 minutes (idle guard), plus 1 minute for the opening interaction. Rounded up to whole minutes.",
  "Tutor sessions: distinct tutor sessions whose intervention traces back to the gap.",
  "Substantive interactions: any graded practice answer, or a tutor reply of at least 200 characters that is not a hint.",
  "Privacy: the conversation itself is never exposed to staff — only these aggregates, produced by a database function scoped to your organization.",
];

export function summariseTutorEvidence(rows: TutorGapEvidence[]): TutorEvidenceTotals {
  return {
    gapsWithTutorEvidence: rows.filter((r) => r.interactions > 0).length,
    sessions: rows.reduce((sum, r) => sum + r.sessions, 0),
    interactions: rows.reduce((sum, r) => sum + r.interactions, 0),
    substantiveInteractions: rows.reduce((sum, r) => sum + r.substantiveInteractions, 0),
    tutorMinutes: rows.reduce((sum, r) => sum + r.tutorMinutes, 0),
  };
}

// ---------------------------------------------------------------------------
// M7 — CBSE competency question types
// ---------------------------------------------------------------------------

export const CBSE_KINDS = [
  "case_study",
  "assertion_reason",
  "data_interpretation",
  "applied_mcq",
] as const;

export type CbseKind = (typeof CBSE_KINDS)[number];

export const CBSE_KIND_LABELS: Record<CbseKind, string> = {
  case_study: "Case Study",
  assertion_reason: "Assertion–Reason",
  data_interpretation: "Data Interpretation",
  applied_mcq: "Applied MCQ",
};

export const CBSE_KIND_RULES: Record<CbseKind, string> = {
  case_study:
    "A short real-world passage (stimulus) followed by questions that can only be answered from the passage.",
  assertion_reason:
    "Stimulus holds Assertion (A) and Reason (R); the four options are the standard CBSE A/R combinations.",
  data_interpretation:
    "Stimulus holds a small table or chart in text form; the question requires reading or computing from that data.",
  applied_mcq:
    "Multiple choice set in an unfamiliar, real-life situation — application, not recall.",
};

export const ASSERTION_REASON_OPTIONS = [
  "Both A and R are true and R is the correct explanation of A",
  "Both A and R are true but R is not the correct explanation of A",
  "A is true but R is false",
  "A is false but R is true",
];

/** Kinds that must carry a stimulus (passage / data / assertion-reason pair). */
export function requiresStimulus(kind: string): boolean {
  return kind === "case_study" || kind === "assertion_reason" || kind === "data_interpretation";
}

/** Kinds that are answered by picking one of a fixed option list. */
export function isOptionKind(kind: string): boolean {
  return (
    kind === "mcq" ||
    kind === "true_false" ||
    kind === "applied_mcq" ||
    kind === "assertion_reason" ||
    kind === "case_study" ||
    kind === "data_interpretation"
  );
}

// ---------------------------------------------------------------------------
// CBSE Competency Quality Upgrade — the quality bar each competency type must
// clear. These rules are used by the generator prompt, by the post-generation
// quality gate, and are printed in the UI so reviewers can check the contract.
// ---------------------------------------------------------------------------

export const COMPETENCY_QUALITY_RULES: Record<CbseKind, string[]> = {
  case_study: [
    "Stimulus is an original real-world scenario (named person/place, a situation, concrete numbers or observations) — never a paraphrase of textbook prose.",
    "Answering requires at least two reasoning steps: read the scenario, then apply the concept to it.",
    "The answer must not be quotable verbatim from the passage.",
  ],
  assertion_reason: [
    "Assertion and Reason must both be complete standalone statements about a cause and its effect.",
    "The Reason must be a candidate causal explanation of the Assertion — never a restatement or an unrelated fact.",
    "Across a set, vary which of the four CBSE combinations is correct; do not always pick option 1.",
  ],
  data_interpretation: [
    "Stimulus is a table, graph description, or experimental observation log with at least three labelled data points.",
    "The question requires comparing, computing, trending, or identifying the controlled/changed variable — not reading a single cell.",
    "Units and variable names must be explicit in the stimulus.",
  ],
  applied_mcq: [
    "The situation must be novel — not an example used in the textbook or in the outcome text.",
    "Tests transfer: the learner applies the concept to a different context, appliance, organism, or everyday event.",
    "Distractors must be plausible misconceptions, not obviously wrong options.",
  ],
};

const RECALL_OPENERS =
  /^\s*(what is|what are|define|name the|state the|list the|who discovered|when was)\b/i;

function countNumbers(text: string): number {
  return (text.match(/\d+(\.\d+)?/g) ?? []).length;
}

/**
 * Deterministic quality gate for competency questions. Returns a list of
 * human-readable issues; an empty list means the question clears the bar.
 */
export function competencyQualityIssues(q: {
  kind: string;
  prompt: string;
  stimulus?: string | null | undefined;
  options?: string[] | null | undefined;
}): string[] {
  const issues: string[] = [];
  const stimulus = (q.stimulus ?? "").trim();
  const prompt = q.prompt.trim();

  if (q.kind === "case_study") {
    if (stimulus.length < 180) issues.push("case study scenario is too thin (needs a real 3–5 sentence situation)");
    if ((stimulus.match(/[.!?]/g) ?? []).length < 3) issues.push("case study scenario needs at least three sentences");
    if (RECALL_OPENERS.test(prompt)) issues.push("case study question is direct recall, not applied reasoning");
  }

  if (q.kind === "assertion_reason") {
    if (!/assertion\s*\(a\)\s*:/i.test(stimulus) || !/reason\s*\(r\)\s*:/i.test(stimulus)) {
      issues.push("assertion–reason stimulus must contain 'Assertion (A):' and 'Reason (R):' lines");
    }
    const a = stimulus.split(/reason\s*\(r\)\s*:/i)[0]?.replace(/assertion\s*\(a\)\s*:/i, "").trim() ?? "";
    const r = stimulus.split(/reason\s*\(r\)\s*:/i)[1]?.trim() ?? "";
    if (a.length < 25 || r.length < 25) issues.push("assertion and reason must both be complete statements");
    if (a && r && a.toLowerCase() === r.toLowerCase()) issues.push("reason merely restates the assertion");
  }

  if (q.kind === "data_interpretation") {
    if (countNumbers(stimulus) < 3) issues.push("data stimulus needs at least three data values");
    if (stimulus.length < 80) issues.push("data stimulus is too small to interpret");
    if (RECALL_OPENERS.test(prompt)) issues.push("data question is recall, not interpretation");
  }

  if (q.kind === "applied_mcq") {
    if (prompt.length < 90) issues.push("applied MCQ needs a described novel situation, not a one-line recall prompt");
    if (RECALL_OPENERS.test(prompt)) issues.push("applied MCQ opens as a recall question");
    const opts = q.options ?? [];
    if (opts.length !== 4) issues.push("applied MCQ needs exactly four options");
  }

  return issues;
}


export type CbseCoverageRow = {
  kind: string;
  label: string;
  cbse: boolean;
  total: number;
  approved: number;
  verified: number;
};

// ---------------------------------------------------------------------------
// M8 — reviewer verification
// ---------------------------------------------------------------------------

export type VerificationState = "unverified" | "verified" | "rejected";

export const VERIFICATION_LABELS: Record<VerificationState, string> = {
  unverified: "Not verified",
  verified: "Verified",
  rejected: "Rejected",
};

export type VerificationEvent = {
  id: string;
  questionId: string;
  questionPrompt: string;
  action: "verified" | "rejected";
  note: string | null;
  reviewerId: string;
  reviewerName: string;
  createdAt: string;
};

export type VerifiableQuestion = {
  id: string;
  outcomeCode: string;
  outcomeTitle: string;
  kind: string;
  kindLabel: string;
  cbse: boolean;
  difficulty: number;
  prompt: string;
  stimulus: string | null;
  correctAnswer: string;
  explanation: string;
  status: string;
  verificationState: VerificationState;
  verifiedByName: string | null;
  verifiedAt: string | null;
  verificationNote: string | null;
};

export const VERIFICATION_RULES: string[] = [
  "Only reviewers and admins can record a verification — enforced by a database policy, not by hiding the button.",
  "Verifying stamps the question with the reviewer's identity (verified by) and timestamp (verified on).",
  "Every verification is written to an append-only log: no update or delete grant exists on the trail for any signed-in role.",
];

// ---------------------------------------------------------------------------
// Cohort metrics — pilot-level participation and score distributions
// ---------------------------------------------------------------------------

export type ScoreBand = {
  label: string;
  min: number;
  max: number;
  count: number;
};

export const SCORE_BANDS: readonly { label: string; min: number; max: number }[] = [
  { label: "Beginning (0–49)", min: 0, max: 49 },
  { label: "Developing (50–69)", min: 50, max: 69 },
  { label: "Proficient (70–84)", min: 70, max: 84 },
  { label: "Advanced (85–100)", min: 85, max: 100 },
];

/** Bucket a list of percentage scores into the four mastery bands. */
export function bandScores(scores: number[]): ScoreBand[] {
  return SCORE_BANDS.map((band) => ({
    ...band,
    count: scores.filter((s) => s >= band.min && s <= band.max).length,
  }));
}

export function meanScore(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

export type CohortMetrics = {
  /** Learners on the roster in this organization. */
  cohortSize: number;
  /** Learners with at least one assigned assessment. */
  learnersAssigned: number;
  /** Learners who submitted at least one assessment. */
  learnersCompleted: number;
  assigned: number;
  submitted: number;
  inProgress: number;
  /** Started but idle for more than the dropout window, or never started past due. */
  droppedOut: number;
  completionRatePct: number;
  dropoutRatePct: number;
  baseline: { scores: number[]; bands: ScoreBand[]; mean: number | null };
  reassessment: { scores: number[]; bands: ScoreBand[]; mean: number | null };
  meanLift: number | null;
};

/** Sessions idle this long (or never started, past due) count as dropped out. */
export const DROPOUT_IDLE_DAYS = 14;

export const COHORT_FORMULAS: string[] = [
  "Cohort size: learners on the roster in your organization.",
  "Completion rate: submitted assessment sessions ÷ all assigned sessions.",
  `Dropout rate: sessions started but idle for more than ${DROPOUT_IDLE_DAYS} days, or assigned and never started past their due date, ÷ all assigned sessions.`,
  "Baseline distribution: score of the first submitted diagnostic per learner-outcome, bucketed into the four mastery bands.",
  "Reassessment distribution: score of the matching reassessment for the same learner-outcome, same bands.",
  "Mean lift: mean reassessment score − mean baseline score, over outcomes that have both.",
];
