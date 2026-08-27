// Gap-Closure Loop — authoritative learner operating mode.
// DIRECT_PARENT learners are owned by a parent account: no centre membership,
// no educator, and excluded from every centre aggregate. CENTRE_MANAGED
// learners belong to a tenant and follow educator assignment/approval rules.
// The mode is a stored column (learners.learner_mode); it is never inferred
// from a nullable educator field.

export const LEARNER_MODES = ["direct_parent", "centre_managed"] as const;
export type LearnerMode = (typeof LEARNER_MODES)[number];

export const CENTRE_MODE: LearnerMode = "centre_managed";
export const DIRECT_MODE: LearnerMode = "direct_parent";

export function isDirectParent(mode: string | null | undefined): boolean {
  return mode === DIRECT_MODE;
}

export function learnerModeLabel(mode: string | null | undefined): string {
  return isDirectParent(mode) ? "Direct learner" : "Centre learner";
}

// Never use "Across your centre" for direct-parent records.
export function aggregateScopeLabel(mode: LearnerMode): string {
  return mode === DIRECT_MODE ? "Across direct (parent-managed) learners" : "Across your centre";
}

// Lifecycle for a single plan item / intervention.
export const INTERVENTION_STAGES = [
  "pending",
  "available",
  "in_progress",
  "completed",
  "ready_for_reassessment",
  "verified",
  "needs_more_support",
] as const;
export type InterventionStage = (typeof INTERVENTION_STAGES)[number];

export const STAGE_LABELS: Record<InterventionStage, string> = {
  pending: "Pending",
  available: "Ready to start",
  in_progress: "In progress",
  completed: "Completed",
  ready_for_reassessment: "Ready for reassessment",
  verified: "Verified — gap closed",
  needs_more_support: "Needs more support",
};

// Maps the stored intervention.status vocabulary onto the lifecycle above.
export function stageFor(input: {
  interventionStatus: string | null | undefined;
  gapStatus: string | null | undefined;
  planExists: boolean;
}): InterventionStage {
  if (input.gapStatus === "addressed") return "verified";
  if (!input.planExists || !input.interventionStatus) return "pending";
  switch (input.interventionStatus) {
    case "planned":
      return "available";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "ready_for_reassessment";
    case "verified":
      return "verified";
    default:
      return "available";
  }
}

// Tutor unlock is a single deterministic decision, shared by server and UI.
export type TutorGate =
  | { unlocked: true; reason: null }
  | { unlocked: false; reason: string; nextStep: string };

export function tutorGate(input: {
  authenticated: boolean;
  consentGranted: boolean;
  consentRequired: boolean;
  planExists: boolean;
  interventionAvailable: boolean;
  entitled: boolean;
}): TutorGate {
  if (!input.authenticated)
    return { unlocked: false, reason: "You are signed out.", nextStep: "Sign in to continue." };
  if (input.consentRequired && !input.consentGranted)
    return {
      unlocked: false,
      reason: "Guardian consent for the AI Tutor is not on file.",
      nextStep: "Ask your parent to give consent in the Parent Portal.",
    };
  if (!input.entitled)
    return {
      unlocked: false,
      reason: "This learner has no active AI Tutor entitlement.",
      nextStep: "Activate the annual plan to unlock tutor practice.",
    };
  if (!input.planExists)
    return {
      unlocked: false,
      reason: "Your study plan is being prepared.",
      nextStep: "Finish your diagnostic — the plan is generated right after it is scored.",
    };
  if (!input.interventionAvailable)
    return {
      unlocked: false,
      reason: "No intervention is active for this gap yet.",
      nextStep: "Open your plan and start the first focus area.",
    };
  return { unlocked: true, reason: null };
}
