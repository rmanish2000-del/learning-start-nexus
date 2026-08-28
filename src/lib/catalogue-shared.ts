// Wave 0 — curriculum catalogue, versioning, entitlement and pricing
// foundation. Pure, client-safe and deterministic: every rule below is decided
// here so the server, the tests and (later) the UI agree on one answer.
//
// Wave 0 ships the *foundation only*. Nothing here activates a new class, a new
// subject or a new price: production remains CBSE Class 10 Mathematics and
// Science at ₹199 / ₹2,999, and every helper defaults to refusing anything that
// has not passed the full commercial gate.

// ---------------------------------------------------------------------------
// Canonical identifiers
// ---------------------------------------------------------------------------

export const SUBJECT_KEY_CODES: Record<string, string> = {
  Mathematics: "MAT",
  Science: "SCI",
  Physics: "PHY",
  Chemistry: "CHE",
  Biology: "BIO",
  "Social Science": "SST",
  English: "ENG",
  "English Core": "ENGC",
  "Computer Applications": "CAP",
  "Information Technology": "IT",
  "Computer Science": "CS",
};

/** `CBSE-2026-27-C10-MAT` — stable, human-readable, unique per version family. */
export function canonicalSubjectCode(input: {
  board: string;
  academicYear: string;
  classLevel: number;
  subjectKey: string;
}): string {
  const key =
    SUBJECT_KEY_CODES[input.subjectKey] ??
    input.subjectKey
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  return `${input.board.toUpperCase()}-${input.academicYear}-C${input.classLevel}-${key}`;
}

// ---------------------------------------------------------------------------
// Catalogue model
// ---------------------------------------------------------------------------

export const COMMERCIAL_STATUSES = [
  "draft",
  "content_review",
  "pilot",
  "purchasable",
  "retired",
] as const;
export type CommercialStatus = (typeof COMMERCIAL_STATUSES)[number];

export type CatalogueSubject = {
  id: string;
  code: string;
  boardCode: string;
  academicYear: string;
  classLevel: number;
  streamLabel: string | null;
  subjectKey: string;
  displayName: string;
  version: number;
  supersedesId: string | null;
  isActive: boolean;
  commercialStatus: CommercialStatus;
  reviewState: "unreviewed" | "in_review" | "approved";
  reviewerName: string | null;
  reviewedAt: string | null;
  curriculumApproved: boolean;
  outcomesReviewed: boolean;
  diagnosticEligible: boolean;
  reassessmentReady: boolean;
  minQuestionsPerOutcome: number;
  diagnosticTarget: number;
  diagnosticMinimum: number;
  chapterGroupMarks: number;
  archivedAt: string | null;
};

/**
 * The single test every selector must apply. Draft, content-review, pilot,
 * retired, inactive and archived entries are invisible everywhere: free check,
 * diagnostic catalogue, assessment creation, learner plans, checkout, sitemap.
 */
export function isCommerciallyAvailable(subject: CatalogueSubject): boolean {
  return (
    subject.commercialStatus === "purchasable" && subject.isActive && subject.archivedAt === null
  );
}

export function availableSubjects(subjects: CatalogueSubject[]): CatalogueSubject[] {
  return subjects.filter(isCommerciallyAvailable);
}

/**
 * Version isolation: only one live version is offered for a given
 * board+year+class+subject, but superseded versions stay readable so historical
 * assessments and reports keep resolving their original curriculum reference.
 */
export function activeVersionFor(
  subjects: CatalogueSubject[],
  key: { academicYear: string; classLevel: number; subjectKey: string },
): CatalogueSubject | null {
  const family = subjects.filter(
    (s) =>
      s.academicYear === key.academicYear &&
      s.classLevel === key.classLevel &&
      s.subjectKey === key.subjectKey &&
      isCommerciallyAvailable(s),
  );
  if (family.length === 0) return null;
  return family.reduce((best, s) => (s.version > best.version ? s : best));
}

/** Historical reference lookup — never filtered by commercial status. */
export function subjectByIdForHistory(
  subjects: CatalogueSubject[],
  id: string,
): CatalogueSubject | null {
  return subjects.find((s) => s.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Commercial readiness gate (architecture §8)
// ---------------------------------------------------------------------------

export type ReadinessInput = {
  subject: CatalogueSubject;
  /** Verified + approved question counts, per unit. */
  verifiedQuestionsByUnit: Record<string, number>;
  /** Outcomes carrying non-zero blueprint weight and their verified coverage. */
  weightedOutcomeCoverage: Record<string, number>;
  /** Fresh reassessment items, disjoint from the diagnostic pool, per unit. */
  reassessmentQuestionsByUnit: Record<string, number>;
  subjectExpertSignOff: string | null;
  hasActivePricing: boolean;
};

export type ReadinessResult = { ready: boolean; blockers: string[] };

export function evaluateCommercialReadiness(input: ReadinessInput): ReadinessResult {
  const s = input.subject;
  const blockers: string[] = [];

  if (!s.curriculumApproved) blockers.push("curriculum_not_approved");
  if (!s.outcomesReviewed) blockers.push("outcomes_not_reviewed");
  if (s.reviewState !== "approved") blockers.push("catalogue_review_incomplete");

  const units = Object.keys(input.verifiedQuestionsByUnit);
  if (units.length === 0) blockers.push("no_units");
  for (const unit of units) {
    if ((input.verifiedQuestionsByUnit[unit] ?? 0) < s.diagnosticTarget) {
      blockers.push(`insufficient_verified_questions:${unit}`);
    }
    if ((input.reassessmentQuestionsByUnit[unit] ?? 0) < s.diagnosticTarget) {
      blockers.push(`insufficient_reassessment_inventory:${unit}`);
    }
  }
  for (const [outcome, count] of Object.entries(input.weightedOutcomeCoverage)) {
    if (count < s.minQuestionsPerOutcome) blockers.push(`outcome_uncovered:${outcome}`);
  }
  if (!input.subjectExpertSignOff) blockers.push("missing_subject_expert_sign_off");
  if (!input.hasActivePricing) blockers.push("no_active_pricing");

  return { ready: blockers.length === 0, blockers };
}

/** A subject may only be flipped to `purchasable` when every gate passes. */
export function canActivateCommercially(input: ReadinessInput): boolean {
  return evaluateCommercialReadiness(input).ready;
}

/** Diagnostic eligibility requires reviewed content — never draft content. */
export function canBeDiagnosticReady(subject: CatalogueSubject): boolean {
  return (
    subject.curriculumApproved &&
    subject.outcomesReviewed &&
    subject.reviewState === "approved" &&
    subject.commercialStatus !== "draft"
  );
}

// ---------------------------------------------------------------------------
// Learner subject selections
// ---------------------------------------------------------------------------

export type LearnerSelection = {
  learnerId: string;
  catalogueSubjectId: string;
  source: "parent" | "centre" | "system";
};

export type LearnerScope = {
  learnerId: string;
  classLevel: number;
  /** Navigation label only (PCM / Science / …). Never an entitlement input. */
  streamLabel: string | null;
  selections: LearnerSelection[];
};

/** Selections are a set: adding the same subject twice is a no-op. */
export function addSelection(scope: LearnerScope, selection: LearnerSelection): LearnerScope {
  if (scope.selections.some((s) => s.catalogueSubjectId === selection.catalogueSubjectId)) {
    return scope;
  }
  return { ...scope, selections: [...scope.selections, selection] };
}

export function selectedSubjectIds(scope: LearnerScope): string[] {
  return scope.selections.map((s) => s.catalogueSubjectId);
}

/**
 * PCM / PCB / PCMB are simply subject sets — the stream label never constrains
 * them, so every combination is structurally possible.
 */
export function isStructurallyValidSelection(
  scope: LearnerScope,
  available: CatalogueSubject[],
): boolean {
  const byId = new Map(available.map((s) => [s.id, s]));
  return scope.selections.every((sel) => {
    const subject = byId.get(sel.catalogueSubjectId);
    return Boolean(subject) && subject!.classLevel === scope.classLevel;
  });
}

// ---------------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------------

export const ENTITLEMENT_TYPES = [
  "subject_diagnostic",
  "subject_annual",
  "class_bundle",
  "selected_subject_bundle",
  "diagnostic_credit",
  "centre_sponsored",
] as const;
export type EntitlementType = (typeof ENTITLEMENT_TYPES)[number];

export type Entitlement = {
  id: string;
  learnerId: string;
  orgId: string | null;
  catalogueSubjectId: string | null;
  bundleId: string | null;
  classLevel: number | null;
  entitlementType: EntitlementType;
  sponsorType: "parent" | "centre";
  status: "active" | "consumed" | "expired" | "revoked";
  startsAt: string;
  expiresAt: string | null;
  creditAmountPaise: number | null;
  creditConsumedAt: string | null;
  sourceOrderId: string | null;
};

export type Bundle = {
  id: string;
  code: string;
  classId: string | null;
  classLevel: number | null;
  memberSubjectIds: string[];
};

export function isEntitlementLive(e: Entitlement, at: Date = new Date()): boolean {
  if (e.status !== "active") return false;
  if (new Date(e.startsAt).getTime() > at.getTime()) return false;
  if (e.expiresAt && new Date(e.expiresAt).getTime() <= at.getTime()) return false;
  return true;
}

/**
 * The one resolver every access gate uses. A learner may work on a catalogue
 * subject when a live entitlement names it directly, or names a bundle that
 * contains it, or covers the whole class the subject belongs to.
 */
export function resolveSubjectAccess(input: {
  learnerId: string;
  catalogueSubjectId: string;
  classLevel?: number | null;
  entitlements: Entitlement[];
  bundles?: Bundle[];
  at?: Date;
}): Entitlement | null {
  const at = input.at ?? new Date();
  const bundles = new Map((input.bundles ?? []).map((b) => [b.id, b]));
  for (const e of input.entitlements) {
    if (e.learnerId !== input.learnerId) continue;
    if (e.entitlementType === "diagnostic_credit") continue;
    if (!isEntitlementLive(e, at)) continue;
    if (e.catalogueSubjectId === input.catalogueSubjectId) return e;
    if (e.bundleId) {
      const bundle = bundles.get(e.bundleId);
      if (bundle?.memberSubjectIds.includes(input.catalogueSubjectId)) return e;
    }
    if (
      e.entitlementType === "class_bundle" &&
      e.catalogueSubjectId === null &&
      e.bundleId === null &&
      input.classLevel != null &&
      e.classLevel === input.classLevel
    ) {
      // Grandfathered Class 10 Board Success Plan: whole-class access.
      return e;
    }
  }
  return null;
}

export function expireDueEntitlements(entitlements: Entitlement[], at: Date = new Date()): Entitlement[] {
  return entitlements.map((e) =>
    e.status === "active" && e.expiresAt && new Date(e.expiresAt).getTime() <= at.getTime()
      ? { ...e, status: "expired" as const }
      : e,
  );
}

export function renewEntitlement(e: Entitlement, days: number, at: Date = new Date()): Entitlement {
  return {
    ...e,
    status: "active",
    startsAt: at.toISOString(),
    expiresAt: new Date(at.getTime() + days * 86_400_000).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export type PricePlan = {
  id: string;
  code: string;
  planType:
    | "subject_diagnostic"
    | "subject_annual"
    | "class_bundle"
    | "selected_subject_bundle"
    | "centre_contract";
  currency: "INR";
  classLevel: number | null;
  catalogueSubjectId: string | null;
  bundleId: string | null;
  amountPaise: number;
  taxMode: "inactive" | "inclusive" | "exclusive";
  taxPercent: number;
  validityDays: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
};

export function isPlanLive(plan: PricePlan, at: Date = new Date()): boolean {
  if (!plan.isActive) return false;
  if (new Date(plan.effectiveFrom).getTime() > at.getTime()) return false;
  if (plan.effectiveTo && new Date(plan.effectiveTo).getTime() <= at.getTime()) return false;
  return true;
}

/** Latest effective live plan for a code. Inactive or future plans never win. */
export function resolvePlan(
  plans: PricePlan[],
  code: string,
  at: Date = new Date(),
): PricePlan | null {
  const live = plans.filter((p) => p.code === code && isPlanLive(p, at));
  if (live.length === 0) return null;
  return live.reduce((best, p) =>
    new Date(p.effectiveFrom).getTime() > new Date(best.effectiveFrom).getTime() ? p : best,
  );
}

// Credit rule D5: one eligible ₹199 diagnostic credit, same learner, qualifying
// subject plan or bundle, applied at most once.
export const CREDIT_QUALIFYING_PLAN_TYPES = [
  "subject_annual",
  "class_bundle",
  "selected_subject_bundle",
] as const;

export type CreditDecision = {
  eligible: boolean;
  creditPaise: number;
  payablePaise: number;
  reason: string | null;
};

export function evaluateDiagnosticCredit(input: {
  plan: PricePlan;
  learnerId: string;
  credit: Entitlement | null;
  /** Subjects the target plan grants; empty means whole-class. */
  planSubjectIds?: string[];
  creditSubjectId?: string | null;
  windowDays?: number;
  at?: Date;
}): CreditDecision {
  const at = input.at ?? new Date();
  const none = (reason: string | null): CreditDecision => ({
    eligible: false,
    creditPaise: 0,
    payablePaise: input.plan.amountPaise,
    reason,
  });

  const credit = input.credit;
  if (!credit) return none("no_credit");
  if (credit.entitlementType !== "diagnostic_credit") return none("not_a_credit");
  if (credit.learnerId !== input.learnerId) return none("different_learner");
  if (credit.creditConsumedAt) return none("already_applied");
  if (credit.status !== "active") return none("credit_not_active");
  if (
    !(CREDIT_QUALIFYING_PLAN_TYPES as readonly string[]).includes(input.plan.planType)
  ) {
    return none("plan_not_qualifying");
  }
  const planSubjects = input.planSubjectIds ?? [];
  if (planSubjects.length > 0 && input.creditSubjectId) {
    if (!planSubjects.includes(input.creditSubjectId)) return none("subject_not_in_plan");
  }
  const windowDays = input.windowDays ?? 30;
  const grantedAt = new Date(credit.startsAt).getTime();
  if (at.getTime() - grantedAt > windowDays * 86_400_000) return none("credit_window_elapsed");

  const creditPaise = Math.min(credit.creditAmountPaise ?? 0, input.plan.amountPaise);
  return {
    eligible: creditPaise > 0,
    creditPaise,
    payablePaise: input.plan.amountPaise - creditPaise,
    reason: creditPaise > 0 ? null : "zero_credit",
  };
}

// ---------------------------------------------------------------------------
// Immutable order snapshot
// ---------------------------------------------------------------------------

export type PriceSnapshot = {
  planCode: string;
  planType: string;
  currency: "INR";
  listPricePaise: number;
  creditPaise: number;
  discountPaise: number;
  taxMode: string;
  taxPaise: number;
  payablePaise: number;
  capturedAt: string;
};

export function buildPriceSnapshot(input: {
  plan: PricePlan;
  credit?: CreditDecision | null;
  discountPaise?: number;
  at?: Date;
}): PriceSnapshot {
  const at = input.at ?? new Date();
  const creditPaise = input.credit?.eligible ? input.credit.creditPaise : 0;
  const discountPaise = input.discountPaise ?? 0;
  const payablePaise = Math.max(0, input.plan.amountPaise - creditPaise - discountPaise);
  // D6: tax rules are configured but inactive — no tax is ever computed today.
  const taxPaise = input.plan.taxMode === "inactive" ? 0 : 0;
  return Object.freeze({
    planCode: input.plan.code,
    planType: input.plan.planType,
    currency: "INR" as const,
    listPricePaise: input.plan.amountPaise,
    creditPaise,
    discountPaise,
    taxMode: input.plan.taxMode,
    taxPaise,
    payablePaise,
    capturedAt: at.toISOString(),
  });
}
