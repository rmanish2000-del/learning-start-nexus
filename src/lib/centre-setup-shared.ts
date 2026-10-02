// Centre setup checklist — pure derivation shared by the server function and
// its tests. Step completion is always computed from live organization data
// plus the server-side centre_setup_progress row; nothing is inferred from
// browser storage.

import { z } from "zod";

export const CENTRE_SETUP_STEP_KEYS = [
  "account-approved",
  "centre-profile",
  "first-educator",
  "learners-or-sample",
  "assign-diagnostic",
  "review-report",
] as const;

export type CentreSetupStepKey = (typeof CENTRE_SETUP_STEP_KEYS)[number];

export type CentreSetupSignals = {
  orgName: string | null;
  orgEmail: string | null;
  orgPhone: string | null;
  educatorCount: number;
  realLearnerCount: number;
  sampleLearnerCount: number;
  sessionCount: number;
  submittedSessionCount: number;
  reportReviewedAt: string | null;
};

export type CentreSetupStep = {
  key: CentreSetupStepKey;
  n: number;
  title: string;
  description: string;
  done: boolean;
  to: string;
  ctaLabel: string;
  /** Step 4 offers the sample workspace as an alternative path. */
  sampleOption?: boolean;
  /** Shown when the step cannot be actioned yet. */
  blockedHint?: string;
};

export type CentreSetupState = {
  steps: CentreSetupStep[];
  doneCount: number;
  complete: boolean;
  sampleActive: boolean;
  sampleLearnerCount: number;
  realLearnerCount: number;
};

export function isCentreProfileComplete(
  s: Pick<CentreSetupSignals, "orgName" | "orgEmail" | "orgPhone">,
): boolean {
  return Boolean(s.orgName?.trim()) && Boolean(s.orgEmail?.trim()) && Boolean(s.orgPhone?.trim());
}

export function deriveCentreSetup(s: CentreSetupSignals): CentreSetupState {
  const profileDone = isCentreProfileComplete(s);
  const educatorDone = s.educatorCount > 0;
  const learnersDone = s.realLearnerCount > 0 || s.sampleLearnerCount > 0;
  const diagnosticDone = s.sessionCount > 0;
  const reportDone = Boolean(s.reportReviewedAt);

  const steps: CentreSetupStep[] = [
    {
      key: "account-approved",
      n: 1,
      title: "Account approved",
      description: "Your centre application was approved and this admin account was created.",
      done: true,
      to: "/dashboard",
      ctaLabel: "Open dashboard",
    },
    {
      key: "centre-profile",
      n: 2,
      title: "Complete your centre profile",
      description: "Add the centre's contact email and phone so families and EduOS can reach you.",
      done: profileDone,
      to: "/settings",
      ctaLabel: "Complete profile",
    },
    {
      key: "first-educator",
      n: 3,
      title: "Add your first educator",
      description:
        "Create an educator account. Educators run diagnostics and interventions day to day.",
      done: educatorDone,
      to: "/admin",
      ctaLabel: "Add educator",
    },
    {
      key: "learners-or-sample",
      n: 4,
      title: "Add learners or explore with the sample workspace",
      description:
        "Import your roster (CSV) or add learners one by one — or load the labelled SAMPLE workspace to explore first.",
      done: learnersDone,
      to: "/learners",
      ctaLabel: "Add learners",
      sampleOption: true,
    },
    {
      key: "assign-diagnostic",
      n: 5,
      title: "Assign a diagnostic",
      description:
        "Assign a published diagnostic to a learner. They see it on their home screen instantly.",
      done: diagnosticDone,
      to: "/assessments",
      ctaLabel: "Open assessments",
      ...(learnersDone ? {} : { blockedHint: "Add a learner first" }),
    },
    {
      key: "review-report",
      n: 6,
      title: "Review your first report",
      description: "Open the outcome report for a submitted diagnostic, then mark this step done.",
      done: reportDone,
      to: "/outcome-proof",
      ctaLabel: "Open reports",
      ...(s.submittedSessionCount > 0 ? {} : { blockedHint: "Waiting for a submitted diagnostic" }),
    },
  ];

  const doneCount = steps.filter((x) => x.done).length;
  return {
    steps,
    doneCount,
    complete: doneCount === steps.length,
    sampleActive: s.sampleLearnerCount > 0,
    sampleLearnerCount: s.sampleLearnerCount,
    realLearnerCount: s.realLearnerCount,
  };
}

export const centreProfileSchema = z.object({
  name: z.string().trim().min(2, "Centre name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(6, "Enter a phone number").max(40),
  tagline: z.string().trim().max(160).optional(),
  website: z.string().trim().max(200).optional(),
});

export type CentreProfileInput = z.infer<typeof centreProfileSchema>;
