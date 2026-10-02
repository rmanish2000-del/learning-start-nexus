// Gap-Closure Loop — browser-safe DTOs and pure helpers for the gap detail
// view. No Supabase imports here: the audit centre and the UI both reuse it.

import type { InterventionStage } from "./learner-mode";

export type GapViewerRole = "platform_admin" | "centre_staff" | "parent" | "learner";

export type GapEvidenceItem = {
  itemId: string;
  prompt: string | null;
  learnerAnswer: string;
  expectedAnswer: string;
  explanation: string | null;
  correct: boolean;
};

export type GapDetailView = {
  gapId: string;
  learnerId: string;
  learnerName: string;
  learnerMode: "direct_parent" | "centre_managed";
  viewerRole: GapViewerRole;
  // Human-readable concept first; the outcome code is optional metadata.
  concept: string;
  outcomeCode: string;
  subject: string | null;
  topic: string | null;
  severity: string;
  masteryPct: number;
  itemsCorrect: number;
  itemsTotal: number;
  status: string;
  stage: InterventionStage;
  detectedAt: string;
  sourceSessionId: string | null;
  sourceAssessmentTitle: string | null;
  evidence: GapEvidenceItem[];
  recommendation: { id: string; title: string; activity: string; rationale: string | null } | null;
  intervention: { id: string; title: string; activity: string; status: string } | null;
  nextAction: { label: string; kind: "start" | "continue" | "reassess" | "wait" | "view"; hint: string };
  planStatus: "none" | "preparing" | "ready" | "awaiting_educator";
  generatedAt: string;
};

export type GapAccess =
  | { allowed: true; role: GapViewerRole }
  | { allowed: false; reason: string };

// Explicit, explainable authorisation. Centre staff never reach direct-parent
// learners; a direct parent never reaches centre operational records.
export function resolveGapAccess(input: {
  isPlatformAdmin: boolean;
  isCentreStaff: boolean;
  sameOrg: boolean;
  isParentOfLearner: boolean;
  isTheLearner: boolean;
  learnerMode: "direct_parent" | "centre_managed";
}): GapAccess {
  if (input.isTheLearner) return { allowed: true, role: "learner" };
  if (input.isParentOfLearner) return { allowed: true, role: "parent" };
  if (input.isPlatformAdmin) return { allowed: true, role: "platform_admin" };
  if (input.isCentreStaff) {
    if (input.learnerMode === "direct_parent")
      return {
        allowed: false,
        reason:
          "This is a direct (parent-managed) learner. Centre staff cannot open direct-parent gaps.",
      };
    if (!input.sameOrg)
      return { allowed: false, reason: "This learner belongs to another centre." };
    return { allowed: true, role: "centre_staff" };
  }
  return { allowed: false, reason: "You do not have permission to view this gap." };
}

export function nextActionFor(input: {
  stage: InterventionStage;
  planStatus: GapDetailView["planStatus"];
  role: GapViewerRole;
}): GapDetailView["nextAction"] {
  if (input.planStatus === "awaiting_educator")
    return {
      label: "Awaiting educator assignment",
      kind: "wait",
      hint: "A centre admin must assign an educator before interventions are released.",
    };
  if (input.planStatus === "preparing")
    return { label: "Study plan is being prepared", kind: "wait", hint: "Finish the diagnostic to generate the plan." };
  switch (input.stage) {
    case "available":
      return { label: "Start intervention", kind: "start", hint: "Work through the activity, then practise with the AI Tutor." };
    case "in_progress":
      return { label: "Continue intervention", kind: "continue", hint: "Pick up where you left off." };
    case "completed":
    case "ready_for_reassessment":
      return { label: "Take reassessment", kind: "reassess", hint: "Fresh questions on the same outcome — the original diagnostic is never reused." };
    case "verified":
      return { label: "View evidence", kind: "view", hint: "Mastery was proved by reassessment; the gap is closed." };
    case "needs_more_support":
      return { label: "Repeat intervention", kind: "start", hint: "Mastery was not reached — revise and try a fresh reassessment." };
    default:
      return { label: "Study plan is being prepared", kind: "wait", hint: "Your plan is generated automatically after scoring." };
  }
}

// Parent- and learner-facing text never exposes internal IDs as the label.
export function parentSafeSummary(view: GapDetailView): string {
  return `${view.learnerName} scored ${view.masteryPct}% on “${view.concept}”. ${view.nextAction.hint}`;
}
