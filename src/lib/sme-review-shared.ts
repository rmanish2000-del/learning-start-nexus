// Named-SME review workflow — shared contract (browser-safe).
//
// Scope: the 326 existing Class 10 (2026-27) draft items only. This module
// never creates content and never approves anything; it describes the queue
// and the advisory candidate flags a named subject expert must rule on.

export const SME_SUBJECTS = ["Mathematics", "Science"] as const;
export type SmeSubject = (typeof SME_SUBJECTS)[number];

// Expected draft queue sizes, reconciled against the question bank at runtime.
export const SME_EXPECTED_QUEUE: Record<SmeSubject, number> = {
  Mathematics: 235,
  Science: 91,
};

export const SME_EXPECTED_TOTAL = 326;

export const SME_DECISIONS = [
  "verified",
  "rejected",
  "remediation_required",
  "cannot_assess",
] as const;
export type SmeDecision = (typeof SME_DECISIONS)[number];

// Only "verified" is an approval. Every other outcome leaves the item a draft.
export const SME_APPROVAL_DECISION: SmeDecision = "verified";

export const SME_DECISION_LABELS: Record<SmeDecision, string> = {
  verified: "Approve",
  rejected: "Reject",
  remediation_required: "Remediation required",
  cannot_assess: "Cannot assess",
};

export function smeDecisionPromotes(action: SmeDecision): boolean {
  return action === SME_APPROVAL_DECISION;
}

export function smeSubjectFromSlug(slug: string): SmeSubject | null {
  const found = SME_SUBJECTS.find((s) => s.toLowerCase() === slug.toLowerCase());
  return found ?? null;
}

// Advisory candidates carried over from the draft validation run
// (content/compliance/class-10-2026-27.draft-validation.json). They are
// surfaced as candidates only — never auto-rejected, never auto-approved.
export type OverlapCandidate = {
  externalRef: string;
  subject: SmeSubject;
  matchedShingle: string;
};

export const NCERT_OVERLAP_CANDIDATES: OverlapCandidate[] = [
  {
    externalRef: "C10-2627-MATH-REQ024-DIAG-004",
    subject: "Mathematics",
    matchedShingle: "tower casts a shadow 28 m long. find the height of the",
  },
  {
    externalRef: "C10-2627-MATH-REQ022-DIAG-009",
    subject: "Mathematics",
    matchedShingle: "find the coordinates of the points of trisection of the line segment",
  },
  {
    externalRef: "C10-2627-MATH-REQ032-DIAG-001",
    subject: "Mathematics",
    matchedShingle: "the angle of elevation of the top of a tower from a",
  },
  {
    externalRef: "C10-2627-MATH-REQ034-REASS-005",
    subject: "Mathematics",
    matchedShingle: "cm subtends a right angle at the centre. find the area of",
  },
];

export type NearDuplicatePair = {
  a: string;
  b: string;
  similarity: number;
  subject: SmeSubject;
};

export const NEAR_DUPLICATE_PAIRS: NearDuplicatePair[] = [
  {
    a: "C10-2627-MATH-REQ001-DIAG-012",
    b: "C10-2627-MATH-REQ001-REASS-013",
    similarity: 0.909,
    subject: "Mathematics",
  },
];

export const SME_WORKFLOW_RULES = [
  "Reviewer or admin role only — every server function re-checks the role and the database policy enforces it independently.",
  "One decision at a time. There is no bulk approve, no select-all and no automatic promotion; the database rejects multi-row decision writes.",
  "Only an explicit APPROVE decision promotes a question into the approved, verified pool.",
  "A REJECT decision marks the item rejected and keeps it out of every paid diagnostic.",
  "REMEDIATION REQUIRED and CANNOT ASSESS record the reviewer's ruling and leave the item a draft.",
  "Reviewer name, qualification and decision basis are mandatory on every decision.",
  "The decision trail is append-only: recorded decisions cannot be edited or deleted, by anyone.",
  "Candidate flags (NCERT verbatim overlap, near-duplicate pairs) are advisory only and change nothing on their own.",
  "Both Class 10 subjects stay NOT_CERTIFIED, and the Science book stays unapproved, until named SME decisions land.",
] as const;

export type SmeQueueItem = {
  id: string;
  externalRef: string | null;
  subject: SmeSubject;
  unitTitle: string;
  outcomeCode: string;
  outcomeTitle: string;
  kind: string;
  difficulty: number;
  prompt: string;
  stimulus: string | null;
  correctAnswer: string;
  explanation: string | null;
  status: string;
  verificationState: string;
  overlapCandidate: boolean;
  nearDuplicateOf: string | null;
};

export type SmeAuditEvent = {
  id: string;
  questionId: string;
  externalRef: string | null;
  action: SmeDecision;
  note: string | null;
  reviewerName: string;
  reviewerQualification: string;
  decisionBasis: string;
  createdAt: string;
};

export type SmeQueueSummary = {
  subject: SmeSubject;
  expected: number;
  drafts: number;
  approved: number;
  rejected: number;
  reconciled: boolean;
};
