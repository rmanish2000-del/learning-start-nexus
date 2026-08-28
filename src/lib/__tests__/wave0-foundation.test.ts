// Wave 0 foundation — catalogue, versioning, learner selections, entitlements,
// pricing and commercial-readiness gates. Pure-domain tests: no I/O.

import { describe, expect, it } from "vitest";

import {
  activeVersionFor,
  addSelection,
  availableSubjects,
  buildPriceSnapshot,
  canActivateCommercially,
  canBeDiagnosticReady,
  canonicalSubjectCode,
  evaluateCommercialReadiness,
  evaluateDiagnosticCredit,
  expireDueEntitlements,
  isCommerciallyAvailable,
  isStructurallyValidSelection,
  renewEntitlement,
  resolvePlan,
  resolveSubjectAccess,
  subjectByIdForHistory,
  type CatalogueSubject,
  type Entitlement,
  type LearnerScope,
  type PricePlan,
} from "../catalogue-shared";

const NOW = new Date("2026-08-28T00:00:00.000Z");

function subject(over: Partial<CatalogueSubject> = {}): CatalogueSubject {
  return {
    id: over.id ?? "sub-maths",
    code: "CBSE-2026-27-C10-MAT",
    boardCode: "CBSE",
    academicYear: "2026-27",
    classLevel: 10,
    streamLabel: null,
    subjectKey: "Mathematics",
    displayName: "Mathematics",
    version: 1,
    supersedesId: null,
    isActive: true,
    commercialStatus: "purchasable",
    reviewState: "approved",
    reviewerName: "Named Expert",
    reviewedAt: NOW.toISOString(),
    curriculumApproved: true,
    outcomesReviewed: true,
    diagnosticEligible: true,
    reassessmentReady: true,
    minQuestionsPerOutcome: 1,
    diagnosticTarget: 20,
    diagnosticMinimum: 5,
    chapterGroupMarks: 20,
    archivedAt: null,
    ...over,
  };
}

function entitlement(over: Partial<Entitlement> = {}): Entitlement {
  return {
    id: "e1",
    learnerId: "L1",
    orgId: null,
    catalogueSubjectId: "sub-maths",
    bundleId: null,
    classLevel: 10,
    entitlementType: "subject_annual",
    sponsorType: "parent",
    status: "active",
    startsAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2027-08-01T00:00:00.000Z",
    creditAmountPaise: null,
    creditConsumedAt: null,
    sourceOrderId: "o1",
    ...over,
  };
}

function plan(over: Partial<PricePlan> = {}): PricePlan {
  return {
    id: "p1",
    code: "CBSE-2026-27-C10-ANNUAL",
    planType: "class_bundle",
    currency: "INR",
    classLevel: 10,
    catalogueSubjectId: null,
    bundleId: null,
    amountPaise: 299_900,
    taxMode: "inactive",
    taxPercent: 0,
    validityDays: 365,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    isActive: true,
    ...over,
  };
}

// 1 — hierarchy and canonical codes
describe("catalogue hierarchy", () => {
  it("builds unique canonical codes per board/year/class/subject", () => {
    const codes = [
      canonicalSubjectCode({ board: "CBSE", academicYear: "2026-27", classLevel: 10, subjectKey: "Mathematics" }),
      canonicalSubjectCode({ board: "CBSE", academicYear: "2026-27", classLevel: 10, subjectKey: "Science" }),
      canonicalSubjectCode({ board: "CBSE", academicYear: "2026-27", classLevel: 9, subjectKey: "Mathematics" }),
      canonicalSubjectCode({ board: "CBSE", academicYear: "2027-28", classLevel: 10, subjectKey: "Mathematics" }),
    ];
    expect(codes[0]).toBe("CBSE-2026-27-C10-MAT");
    expect(new Set(codes).size).toBe(codes.length);
  });
});

// 2 & 3 — academic-year isolation and historical preservation
describe("academic-year versioning", () => {
  const v1 = subject({ id: "v1", version: 1, commercialStatus: "retired", isActive: false });
  const v2 = subject({ id: "v2", version: 2 });
  const nextYear = subject({ id: "v3", academicYear: "2027-28", version: 1 });

  it("offers only the active version for the selected year", () => {
    const active = activeVersionFor([v1, v2, nextYear], {
      academicYear: "2026-27",
      classLevel: 10,
      subjectKey: "Mathematics",
    });
    expect(active?.id).toBe("v2");
  });

  it("isolates academic years", () => {
    expect(
      activeVersionFor([v1, v2], { academicYear: "2027-28", classLevel: 10, subjectKey: "Mathematics" }),
    ).toBeNull();
  });

  it("keeps superseded versions readable for historical reports", () => {
    expect(subjectByIdForHistory([v1, v2], "v1")?.version).toBe(1);
    expect(availableSubjects([v1, v2])).toHaveLength(1);
  });
});

// 4 & 5 — nullable stream + explicit subject selection, PCM/PCB/PCMB
describe("learner subject selections", () => {
  const phy = subject({ id: "phy", classLevel: 11, subjectKey: "Physics" });
  const che = subject({ id: "che", classLevel: 11, subjectKey: "Chemistry" });
  const mat = subject({ id: "mat11", classLevel: 11, subjectKey: "Mathematics" });
  const bio = subject({ id: "bio", classLevel: 11, subjectKey: "Biology" });
  const available = [phy, che, mat, bio];

  function scopeWith(ids: string[], streamLabel: string | null = null): LearnerScope {
    return ids.reduce<LearnerScope>(
      (acc, id) => addSelection(acc, { learnerId: "L1", catalogueSubjectId: id, source: "parent" }),
      { learnerId: "L1", classLevel: 11, streamLabel, selections: [] },
    );
  }

  it("supports multiple subjects with no stream label", () => {
    const scope = scopeWith(["phy", "che", "mat"]);
    expect(scope.streamLabel).toBeNull();
    expect(scope.selections).toHaveLength(3);
  });

  it.each([
    ["PCM", ["phy", "che", "mat"]],
    ["PCB", ["phy", "che", "bio"]],
    ["PCMB", ["phy", "che", "mat", "bio"]],
  ])("supports %s structurally", (label, ids) => {
    const scope = scopeWith(ids, label);
    expect(isStructurallyValidSelection(scope, available)).toBe(true);
    expect(scope.selections).toHaveLength(ids.length);
  });

  it("is a set — the same subject cannot be selected twice", () => {
    expect(scopeWith(["phy", "phy"]).selections).toHaveLength(1);
  });
});

// 6, 7, 8, 9 — entitlement resolution
describe("entitlement resolution", () => {
  it("grants access from a subject entitlement", () => {
    expect(
      resolveSubjectAccess({
        learnerId: "L1",
        catalogueSubjectId: "sub-maths",
        entitlements: [entitlement()],
        at: NOW,
      }),
    ).not.toBeNull();
  });

  it("grants access from a bundle that contains the subject", () => {
    const e = entitlement({ entitlementType: "class_bundle", catalogueSubjectId: null, bundleId: "b1" });
    const bundles = [{ id: "b1", code: "C10", classId: null, classLevel: 10, memberSubjectIds: ["sub-maths", "sub-sci"] }];
    expect(resolveSubjectAccess({ learnerId: "L1", catalogueSubjectId: "sub-sci", entitlements: [e], bundles, at: NOW })).not.toBeNull();
    expect(resolveSubjectAccess({ learnerId: "L1", catalogueSubjectId: "sub-eng", entitlements: [e], bundles, at: NOW })).toBeNull();
  });

  it("resolves grandfathered whole-class access", () => {
    const legacy = entitlement({ entitlementType: "class_bundle", catalogueSubjectId: null, bundleId: null, classLevel: 10 });
    expect(
      resolveSubjectAccess({ learnerId: "L1", catalogueSubjectId: "sub-sci", classLevel: 10, entitlements: [legacy], at: NOW }),
    ).not.toBeNull();
  });

  it("honours parent-purchased and centre-sponsored sources alike", () => {
    const centre = entitlement({ entitlementType: "centre_sponsored", sponsorType: "centre", orgId: "org-1" });
    const found = resolveSubjectAccess({ learnerId: "L1", catalogueSubjectId: "sub-maths", entitlements: [centre], at: NOW });
    expect(found?.sponsorType).toBe("centre");
  });

  it("never leaks another learner's entitlement", () => {
    expect(
      resolveSubjectAccess({ learnerId: "L2", catalogueSubjectId: "sub-maths", entitlements: [entitlement()], at: NOW }),
    ).toBeNull();
  });

  it("expires and renews", () => {
    const expired = entitlement({ expiresAt: "2026-08-01T00:00:00.000Z" });
    expect(resolveSubjectAccess({ learnerId: "L1", catalogueSubjectId: "sub-maths", entitlements: [expired], at: NOW })).toBeNull();
    expect(expireDueEntitlements([expired], NOW)[0].status).toBe("expired");

    const renewed = renewEntitlement(expired, 365, NOW);
    expect(resolveSubjectAccess({ learnerId: "L1", catalogueSubjectId: "sub-maths", entitlements: [renewed], at: NOW })).not.toBeNull();
  });
});

// 10 & 11 — diagnostic credit
describe("diagnostic credit (D5)", () => {
  const credit = entitlement({
    id: "c1",
    entitlementType: "diagnostic_credit",
    catalogueSubjectId: "sub-maths",
    creditAmountPaise: 19_900,
    startsAt: "2026-08-20T00:00:00.000Z",
    expiresAt: null,
  });

  it("applies once and yields the ₹2,800 upgrade", () => {
    const decision = evaluateDiagnosticCredit({ plan: plan(), learnerId: "L1", credit, creditSubjectId: "sub-maths", at: NOW });
    expect(decision.eligible).toBe(true);
    expect(decision.creditPaise).toBe(19_900);
    expect(decision.payablePaise).toBe(280_000);
  });

  it("cannot be applied a second time", () => {
    const used = { ...credit, creditConsumedAt: "2026-08-21T00:00:00.000Z" };
    expect(evaluateDiagnosticCredit({ plan: plan(), learnerId: "L1", credit: used, at: NOW }).reason).toBe("already_applied");
  });

  it("requires the same learner", () => {
    expect(evaluateDiagnosticCredit({ plan: plan(), learnerId: "L2", credit, at: NOW }).reason).toBe("different_learner");
  });

  it("requires a qualifying plan and a qualifying subject", () => {
    expect(
      evaluateDiagnosticCredit({ plan: plan({ planType: "subject_diagnostic" }), learnerId: "L1", credit, at: NOW }).reason,
    ).toBe("plan_not_qualifying");
    expect(
      evaluateDiagnosticCredit({
        plan: plan(),
        learnerId: "L1",
        credit,
        planSubjectIds: ["sub-sci"],
        creditSubjectId: "sub-maths",
        at: NOW,
      }).reason,
    ).toBe("subject_not_in_plan");
  });
});

// 12, 13, 14 — pricing
describe("pricing foundation", () => {
  it("resolves by effective date and prefers the latest live plan", () => {
    const older = plan({ id: "old", amountPaise: 199_900, effectiveFrom: "2025-01-01T00:00:00.000Z" });
    const current = plan({ id: "new", amountPaise: 299_900, effectiveFrom: "2026-01-01T00:00:00.000Z" });
    expect(resolvePlan([older, current], current.code, NOW)?.amountPaise).toBe(299_900);
  });

  it("never resolves an inactive or future plan", () => {
    expect(resolvePlan([plan({ isActive: false })], "CBSE-2026-27-C10-ANNUAL", NOW)).toBeNull();
    expect(resolvePlan([plan({ effectiveFrom: "2027-01-01T00:00:00.000Z" })], "CBSE-2026-27-C10-ANNUAL", NOW)).toBeNull();
    expect(resolvePlan([plan({ effectiveTo: "2026-02-01T00:00:00.000Z" })], "CBSE-2026-27-C10-ANNUAL", NOW)).toBeNull();
  });

  it("captures an immutable order snapshot with no tax while tax is inactive", () => {
    const snap = buildPriceSnapshot({
      plan: plan(),
      credit: { eligible: true, creditPaise: 19_900, payablePaise: 280_000, reason: null },
      at: NOW,
    });
    expect(snap).toMatchObject({ listPricePaise: 299_900, creditPaise: 19_900, payablePaise: 280_000, taxPaise: 0, currency: "INR" });
    expect(() => {
      (snap as unknown as { payablePaise: number }).payablePaise = 1;
    }).toThrow();
  });

  it("keeps live production prices unchanged", () => {
    expect(plan({ code: "CBSE-2026-27-C10-DIAGNOSTIC", amountPaise: 19_900 }).amountPaise).toBe(19_900);
    expect(plan().amountPaise).toBe(299_900);
  });
});

// 15, 16, 17 — commercial gates
describe("commercial readiness gates", () => {
  const readyInput = {
    subject: subject(),
    verifiedQuestionsByUnit: { u1: 24 },
    weightedOutcomeCoverage: { o1: 2, o2: 1 },
    reassessmentQuestionsByUnit: { u1: 20 },
    subjectExpertSignOff: "Dr Named Expert",
    hasActivePricing: true,
  };

  it("passes only when every gate passes", () => {
    expect(canActivateCommercially(readyInput)).toBe(true);
  });

  it("draft curriculum can never be purchased", () => {
    const draft = subject({ commercialStatus: "draft", isActive: false });
    expect(isCommerciallyAvailable(draft)).toBe(false);
    expect(availableSubjects([draft])).toHaveLength(0);
    expect(canActivateCommercially({ ...readyInput, subject: subject({ curriculumApproved: false }) })).toBe(false);
  });

  it("unreviewed content cannot become diagnostic-ready", () => {
    expect(canBeDiagnosticReady(subject({ outcomesReviewed: false }))).toBe(false);
    expect(canBeDiagnosticReady(subject({ reviewState: "in_review" }))).toBe(false);
    expect(canBeDiagnosticReady(subject())).toBe(true);
  });

  it("missing reassessment coverage blocks commercial readiness", () => {
    const result = evaluateCommercialReadiness({ ...readyInput, reassessmentQuestionsByUnit: { u1: 4 } });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("insufficient_reassessment_inventory:u1");
  });

  it("missing subject-expert sign-off blocks activation (D7)", () => {
    expect(
      evaluateCommercialReadiness({ ...readyInput, subjectExpertSignOff: null }).blockers,
    ).toContain("missing_subject_expert_sign_off");
  });

  it("no active pricing blocks activation", () => {
    expect(evaluateCommercialReadiness({ ...readyInput, hasActivePricing: false }).blockers).toContain("no_active_pricing");
  });

  it("archived or retired entries disappear from every selector", () => {
    expect(isCommerciallyAvailable(subject({ archivedAt: NOW.toISOString() }))).toBe(false);
    expect(isCommerciallyAvailable(subject({ commercialStatus: "retired" }))).toBe(false);
    expect(isCommerciallyAvailable(subject({ commercialStatus: "pilot" }))).toBe(false);
  });
});
