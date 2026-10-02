import { describe, expect, it } from "vitest";

import {
  CENTRE_SETUP_STEP_KEYS,
  centreProfileSchema,
  deriveCentreSetup,
  isCentreProfileComplete,
  type CentreSetupSignals,
} from "../centre-setup-shared";

const fresh: CentreSetupSignals = {
  orgName: "Meridian Coaching Centre",
  orgEmail: null,
  orgPhone: null,
  educatorCount: 0,
  realLearnerCount: 0,
  sampleLearnerCount: 0,
  sessionCount: 0,
  submittedSessionCount: 0,
  reportReviewedAt: null,
};

describe("deriveCentreSetup", () => {
  it("a freshly approved centre has only step 1 done and a zero-data checklist", () => {
    const s = deriveCentreSetup(fresh);
    expect(s.steps.map((x) => x.key)).toEqual([...CENTRE_SETUP_STEP_KEYS]);
    expect(s.steps.map((x) => x.done)).toEqual([true, false, false, false, false, false]);
    expect(s.doneCount).toBe(1);
    expect(s.complete).toBe(false);
    expect(s.sampleActive).toBe(false);
    // Later steps say why they cannot be actioned yet instead of going blank.
    expect(s.steps[4]?.blockedHint).toBe("Add a learner first");
    expect(s.steps[5]?.blockedHint).toBe("Waiting for a submitted diagnostic");
    // Step 4 offers the sample path.
    expect(s.steps[3]?.sampleOption).toBe(true);
  });

  it("the sample workspace satisfies the learners step but is reported separately", () => {
    const s = deriveCentreSetup({ ...fresh, sampleLearnerCount: 5 });
    expect(s.steps[3]?.done).toBe(true);
    expect(s.sampleActive).toBe(true);
    expect(s.realLearnerCount).toBe(0);
    expect(s.steps[4]?.blockedHint).toBeUndefined();
  });

  it("completes only when every step is done, including the server-recorded report review", () => {
    const almost = deriveCentreSetup({
      ...fresh,
      orgEmail: "hello@meridian.test",
      orgPhone: "+91 98765 43210",
      educatorCount: 1,
      realLearnerCount: 3,
      sessionCount: 2,
      submittedSessionCount: 1,
    });
    expect(almost.doneCount).toBe(5);
    expect(almost.complete).toBe(false);
    expect(almost.steps[5]?.blockedHint).toBeUndefined();

    const done = deriveCentreSetup({
      ...fresh,
      orgEmail: "hello@meridian.test",
      orgPhone: "+91 98765 43210",
      educatorCount: 1,
      realLearnerCount: 3,
      sessionCount: 2,
      submittedSessionCount: 1,
      reportReviewedAt: "2026-10-02T04:00:00Z",
    });
    expect(done.complete).toBe(true);
    expect(done.doneCount).toBe(6);
  });

  it("every step always carries an actionable route and label", () => {
    for (const step of deriveCentreSetup(fresh).steps) {
      expect(step.to.startsWith("/")).toBe(true);
      expect(step.ctaLabel.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(10);
    }
  });
});

describe("centre profile", () => {
  it("is complete only with a name, contact email and phone", () => {
    expect(isCentreProfileComplete({ orgName: "A", orgEmail: "a@b.c", orgPhone: "123" })).toBe(true);
    expect(isCentreProfileComplete({ orgName: "A", orgEmail: " ", orgPhone: "123" })).toBe(false);
    expect(isCentreProfileComplete({ orgName: "", orgEmail: "a@b.c", orgPhone: "123" })).toBe(false);
  });

  it("validates the profile form server-side", () => {
    expect(centreProfileSchema.safeParse({ name: "Meridian", email: "x@y.z", phone: "9876543210" }).success).toBe(true);
    expect(centreProfileSchema.safeParse({ name: "M", email: "x@y.z", phone: "9876543210" }).success).toBe(false);
    expect(centreProfileSchema.safeParse({ name: "Meridian", email: "not-an-email", phone: "9876543210" }).success).toBe(false);
  });
});
