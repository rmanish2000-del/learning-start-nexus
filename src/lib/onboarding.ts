// Sprint 5B — role-based onboarding primitives.
// Progress flags are stored per-browser in localStorage (dismissals, seen tours,
// celebrated milestones); the underlying step completion is always derived from
// live server data, so checklists reflect reality across devices.

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  done: boolean;
  /** Link target for the step's call-to-action. */
  to?: string;
  /** Explicit action key handled by the page (scroll, open dialog, launch tutor). */
  action?: string;
  ctaLabel?: string;
  /** Shown instead of a CTA when the step can't be actioned right now. */
  blockedHint?: string;
}

const PREFIX = "eduos_onboarding";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getOnboardingFlag(key: string): boolean {
  const s = storage();
  if (!s) return false;
  try {
    return s.getItem(`${PREFIX}:${key}`) === "1";
  } catch {
    return false;
  }
}

export function setOnboardingFlag(key: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(`${PREFIX}:${key}`, "1");
  } catch {
    /* storage unavailable */
  }
}

export function clearOnboardingFlag(key: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(`${PREFIX}:${key}`);
  } catch {
    /* storage unavailable */
  }
}

export const tourSeenKey = (tourId: string) => `tour-seen:${tourId}`;
export const stepFlagKey = (role: string, step: string) => `step:${role}:${step}`;
export const celebratedKey = (role: string) => `celebrated:${role}`;

// ---------------------------------------------------------------------------
// Completion state & safe reset (Sprint 5B bug fix)
// ---------------------------------------------------------------------------

/** Every guided tour in the app. */
export const ALL_TOUR_IDS = ["educator-dashboard", "student-home", "parent-portal"] as const;

/** The home tour for each role (reviewers have no tour — audit-only). */
export const ROLE_TOUR_ID: Record<string, string | undefined> = {
  admin: "educator-dashboard",
  educator: "educator-dashboard",
  student: "student-home",
  parent: "parent-portal",
  reviewer: undefined,
};

const ALL_ROLES = ["admin", "educator", "student", "parent", "reviewer"] as const;

/**
 * True once any role's onboarding has been completed (and celebrated/dismissed)
 * in this browser. Used to suppress forced tour auto-starts after completion —
 * a finished user must never see the onboarding modal or an unprompted tour.
 */
export function hasCompletedOnboarding(): boolean {
  return ALL_ROLES.some((r) => getOnboardingFlag(celebratedKey(r)));
}

/**
 * Mark onboarding as fully complete for a role: celebration is recorded and
 * every tour is marked seen, so nothing auto-fires again on login or refresh.
 */
export function markOnboardingComplete(role: string): void {
  setOnboardingFlag(celebratedKey(role));
  for (const id of ALL_TOUR_IDS) setOnboardingFlag(tourSeenKey(id));
}

export const tourReplayKey = (tourId: string) => `tour-replay:${tourId}`;

/** Per-role flag for the first-login "How EduOS Works" intro dialog. */
export const introSeenKey = (role: string) => `intro-seen:${role}`;

/** Event dispatched to open the "How EduOS Works" intro on demand. */
export const SHOW_INTRO_EVENT = "eduos:show-intro";

export function requestIntro(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SHOW_INTRO_EVENT));
}

/**
 * Safe reset for testing/support: re-arms the role's guided tour so it replays
 * once on the next visit to the role's home page. Deliberately does NOT clear
 * the completion flag — "Restart Tour" replays the tour, it must not bring
 * back the completion celebration. Returns the tour id (undefined for roles
 * without a tour).
 */
export function resetOnboarding(role: string): string | undefined {
  const tourId = ROLE_TOUR_ID[role];
  if (tourId) {
    clearOnboardingFlag(tourSeenKey(tourId));
    setOnboardingFlag(tourReplayKey(tourId));
  }
  return tourId;
}

/** Event dispatched to (re)start a guided tour from anywhere (e.g. context help). */
export const START_TOUR_EVENT = "eduos:start-tour";

export function requestTour(tourId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(START_TOUR_EVENT, { detail: tourId }));
}

// ---------------------------------------------------------------------------
// Context help content per page
// ---------------------------------------------------------------------------

export interface ContextHelpContent {
  title: string;
  tips: string[];
  tourId?: string;
}

export const CONTEXT_HELP: Record<string, ContextHelpContent> = {
  "/dashboard": {
    title: "Educator dashboard",
    tips: [
      "The checklist walks you through your first week: add a learner, assign an assessment, approve an intervention, then review outcomes.",
      "Needs attention lists learners with open gaps or pending interventions — start there each morning.",
      "Stats update live as students submit assessments.",
    ],
    tourId: "educator-dashboard",
  },
  "/learners": {
    title: "Learners",
    tips: [
      "Add learners here, then open a profile to see assessments, gaps, interventions and outcomes in one place.",
      "Each learner profile has tabs for the full learning journey — evidence is never edited, only appended.",
    ],
  },
  "/assessments": {
    title: "Assessments",
    tips: [
      "Assign a published diagnostic to a learner — they see it on their home screen immediately.",
      "Scores under 70% automatically open a learning gap with a recommended intervention.",
    ],
  },
  "/interventions": {
    title: "Interventions",
    tips: [
      "Recommendations arrive from gap detection. Approving one creates an intervention the student can see.",
      "Approved interventions unlock the AI Tutor for that learner — the tutor only works within approved scope.",
    ],
  },
  "/home": {
    title: "Student home",
    tips: [
      "Work top to bottom: finish your diagnostic, review your focus plan, then practice with the AI Tutor.",
      "The AI Tutor needs guardian consent — ask a parent to approve it if the button is locked.",
      "Your mastery ring fills as you complete reassessments.",
    ],
    tourId: "student-home",
  },
  "/parent": {
    title: "Parent portal",
    tips: [
      "Record consent first — it unlocks the AI Tutor for your child. Assessments and plans work either way.",
      "Progress shows live mastery, recent assessment scores and active interventions. Everything is read-only.",
    ],
    tourId: "parent-portal",
  },
};
