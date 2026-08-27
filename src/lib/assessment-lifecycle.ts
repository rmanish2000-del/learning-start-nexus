// Assessment lifecycle — the single source of truth for status, allowed
// actions and publish gates.
//
// PRODUCT LAW: creating, publishing and assigning are three separate
// operations. Nothing is published because the user clicked "Create".
// Every new assessment begins as DRAFT.

export const ASSESSMENT_STATES = [
  "draft",
  "ready_for_review",
  "published",
  "assigned",
  "archived",
] as const;
export type AssessmentState = (typeof ASSESSMENT_STATES)[number];

export const STATE_LABELS: Record<AssessmentState, string> = {
  draft: "Draft",
  ready_for_review: "Ready for review",
  published: "Published",
  assigned: "Assigned",
  archived: "Archived",
};

// Stored status + assignment count → one authoritative display state.
export function resolveState(input: {
  status: string | null | undefined;
  archivedAt?: string | null;
  assignedCount?: number;
}): AssessmentState {
  if (input.archivedAt) return "archived";
  const status = (input.status ?? "draft").toLowerCase();
  if (status === "archived") return "archived";
  if (status === "published") return (input.assignedCount ?? 0) > 0 ? "assigned" : "published";
  if (status === "ready_for_review") return "ready_for_review";
  return "draft";
}

export type ActionKey =
  | "edit"
  | "review"
  | "delete"
  | "preview"
  | "assign"
  | "duplicate"
  | "archive"
  | "view-assignment"
  | "view-progress";

export const ACTION_LABELS: Record<ActionKey, string> = {
  edit: "Edit",
  review: "Review",
  delete: "Delete draft",
  preview: "Preview",
  assign: "Assign to learner",
  duplicate: "Duplicate",
  archive: "Archive",
  "view-assignment": "View assignment",
  "view-progress": "View progress",
};

export function actionsFor(state: AssessmentState): ActionKey[] {
  switch (state) {
    case "draft":
    case "ready_for_review":
      return ["edit", "review", "delete"];
    case "published":
      return ["preview", "assign", "duplicate", "archive"];
    case "assigned":
      return ["view-assignment", "view-progress", "preview", "duplicate"];
    case "archived":
      return ["preview", "duplicate"];
  }
}

// Why an action is unavailable — never show a mute disabled control.
export function unavailableReason(action: ActionKey, state: AssessmentState): string | null {
  if (actionsFor(state).includes(action)) return null;
  if (action === "assign")
    return state === "archived"
      ? "This assessment is archived. Duplicate it to assign a fresh copy."
      : "Only published assessments can be assigned. Review and publish it first.";
  if (action === "review") return "This assessment is already published — reviewing applies to drafts.";
  if (action === "delete") return "Published assessments cannot be deleted; archive them instead.";
  return `Not available while the assessment is ${STATE_LABELS[state]}.`;
}

// ---------------------------------------------------------------------------
// Publish gates
// ---------------------------------------------------------------------------

export const MIN_QUESTIONS = 5;

export const SUPPORTED_SCOPE = {
  board: "CBSE",
  grade: 10,
  subjects: ["Mathematics", "Science"],
};

export type PublishCheckInput = {
  title: string | null;
  subject: string | null;
  grade: number | null;
  board: string | null;
  questionCount: number;
  unverifiedCount: number;
  duplicateCount: number;
  timeLimitMinutes: number | null;
  legacy: boolean;
};

export type PublishGate = { code: string; message: string };

// Returns the exact reason for every blocked publication. Empty = publishable.
export function publishBlockers(input: PublishCheckInput): PublishGate[] {
  const blockers: PublishGate[] = [];
  if (!input.title || input.title.trim().length < 3)
    blockers.push({ code: "title", message: "A title of at least 3 characters is required." });
  if (input.questionCount === 0)
    blockers.push({ code: "no-questions", message: "No questions are selected." });
  else if (input.questionCount < MIN_QUESTIONS)
    blockers.push({
      code: "min-questions",
      message: `At least ${MIN_QUESTIONS} questions are required (currently ${input.questionCount}).`,
    });
  if (input.unverifiedCount > 0)
    blockers.push({
      code: "unverified",
      message: `${input.unverifiedCount} question(s) are not approved/verified.`,
    });
  if (input.duplicateCount > 0)
    blockers.push({
      code: "duplicates",
      message: `${input.duplicateCount} duplicate question(s) violate assessment policy.`,
    });
  if (!input.subject)
    blockers.push({ code: "subject", message: "Subject metadata is missing." });
  if (input.legacy)
    blockers.push({
      code: "scope",
      message:
        "Legacy content (Grade 6 · Fractions) is outside the active CBSE Class 10 scope and cannot be published.",
    });
  else if (
    input.subject &&
    (input.grade !== SUPPORTED_SCOPE.grade || !SUPPORTED_SCOPE.subjects.includes(input.subject))
  )
    blockers.push({
      code: "scope",
      message: `Curriculum scope is unsupported. Active scope is CBSE Class ${SUPPORTED_SCOPE.grade} ${SUPPORTED_SCOPE.subjects.join(" and ")}.`,
    });
  if (!input.timeLimitMinutes)
    blockers.push({ code: "duration", message: "An estimated duration is required." });
  return blockers;
}

// Legacy pilot content must never appear in active creation/assignment flows.
export function isLegacyContent(input: {
  grade: number | null | undefined;
  subject?: string | null;
  topic?: string | null;
  bookId?: string | null;
  isDemo?: boolean | null;
}): boolean {
  if (input.isDemo) return true;
  if ((input.grade ?? 0) !== SUPPORTED_SCOPE.grade) return true;
  if (input.subject && !SUPPORTED_SCOPE.subjects.includes(input.subject)) return true;
  return false;
}
