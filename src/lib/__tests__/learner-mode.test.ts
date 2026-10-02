// Role/mode acceptance tests for the Gap-Closure Loop.
// DIRECT_PARENT learners must never wait for an educator, and CENTRE_MANAGED
// learners must never be silently unlocked without a plan.

import { describe, expect, it } from "vitest";

import {
  aggregateScopeLabel,
  isDirectParent,
  learnerModeLabel,
  stageFor,
  tutorGate,
} from "@/lib/learner-mode";

describe("learner mode", () => {
  it("classifies modes from the stored column, not a nullable educator", () => {
    expect(isDirectParent("direct_parent")).toBe(true);
    expect(isDirectParent("centre_managed")).toBe(false);
    expect(isDirectParent(null)).toBe(false);
    expect(learnerModeLabel("direct_parent")).toBe("Direct learner");
  });

  it("never labels direct-parent aggregates as centre metrics", () => {
    expect(aggregateScopeLabel("direct_parent")).not.toMatch(/centre/i);
    expect(aggregateScopeLabel("centre_managed")).toMatch(/centre/i);
  });
});

describe("intervention lifecycle", () => {
  it("maps stored statuses onto human stages", () => {
    expect(stageFor({ interventionStatus: null, gapStatus: "open", planExists: false })).toBe(
      "pending",
    );
    expect(stageFor({ interventionStatus: "planned", gapStatus: "open", planExists: true })).toBe(
      "available",
    );
    expect(
      stageFor({ interventionStatus: "completed", gapStatus: "open", planExists: true }),
    ).toBe("ready_for_reassessment");
    expect(
      stageFor({ interventionStatus: "planned", gapStatus: "addressed", planExists: true }),
    ).toBe("verified");
  });
});

describe("tutor gate", () => {
  const base = {
    authenticated: true,
    consentGranted: true,
    consentRequired: true,
    planExists: true,
    interventionAvailable: true,
    entitled: true,
  };

  it("unlocks a direct-parent learner with an auto-generated plan", () => {
    expect(tutorGate(base).unlocked).toBe(true);
  });

  it("blocks with a named reason and next step when consent is missing", () => {
    const gate = tutorGate({ ...base, consentGranted: false });
    expect(gate.unlocked).toBe(false);
    if (!gate.unlocked) {
      expect(gate.reason).toMatch(/consent/i);
      expect(gate.nextStep).toMatch(/Parent Portal/i);
    }
  });

  it("blocks when no plan exists rather than showing an empty tutor", () => {
    const gate = tutorGate({ ...base, planExists: false });
    expect(gate.unlocked).toBe(false);
    if (!gate.unlocked) expect(gate.nextStep).toMatch(/diagnostic/i);
  });

  it("blocks unentitled learners", () => {
    expect(tutorGate({ ...base, entitled: false }).unlocked).toBe(false);
  });
});
