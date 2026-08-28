// Wave 0 — server-side catalogue, entitlement and pricing resolvers.
//
// Read-only foundation. These helpers are the only place the application will
// ever learn which class-subjects are commercially available, what a plan
// costs, and what a learner is entitled to. Wave 0 wires them behind existing
// behaviour: production still resolves to CBSE Class 10 Mathematics and
// Science at ₹199 / ₹2,999, because that is exactly what the catalogue says.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildPriceSnapshot,
  evaluateDiagnosticCredit,
  isCommerciallyAvailable,
  resolvePlan,
  resolveSubjectAccess,
  type Bundle,
  type CatalogueSubject,
  type CommercialStatus,
  type Entitlement,
  type EntitlementType,
  type PricePlan,
} from "./catalogue-shared";

export const LIVE_PLAN_CODES = {
  diagnostic: "CBSE-2026-27-C10-DIAGNOSTIC",
  annual: "CBSE-2026-27-C10-ANNUAL",
} as const;

type SubjectRow = {
  id: string;
  code: string;
  subject_key: string;
  display_name: string;
  version: number;
  supersedes_id: string | null;
  is_active: boolean;
  commercial_status: string;
  review_state: string;
  reviewer_name: string | null;
  reviewed_at: string | null;
  curriculum_approved: boolean;
  outcomes_reviewed: boolean;
  diagnostic_eligible: boolean;
  reassessment_ready: boolean;
  min_questions_per_outcome: number;
  diagnostic_target: number;
  diagnostic_minimum: number;
  chapter_group_marks: number;
  archived_at: string | null;
  catalogue_classes: { class_level: number } | null;
  catalogue_boards: { code: string } | null;
  catalogue_academic_years: { code: string } | null;
  catalogue_streams: { display_name: string } | null;
};

const SUBJECT_SELECT = `
  id, code, subject_key, display_name, version, supersedes_id, is_active,
  commercial_status, review_state, reviewer_name, reviewed_at,
  curriculum_approved, outcomes_reviewed, diagnostic_eligible, reassessment_ready,
  min_questions_per_outcome, diagnostic_target, diagnostic_minimum,
  chapter_group_marks, archived_at,
  catalogue_classes ( class_level ),
  catalogue_boards ( code ),
  catalogue_academic_years ( code ),
  catalogue_streams ( display_name )
`;

function toSubject(row: SubjectRow): CatalogueSubject {
  return {
    id: row.id,
    code: row.code,
    boardCode: row.catalogue_boards?.code ?? "CBSE",
    academicYear: row.catalogue_academic_years?.code ?? "",
    classLevel: row.catalogue_classes?.class_level ?? 0,
    streamLabel: row.catalogue_streams?.display_name ?? null,
    subjectKey: row.subject_key,
    displayName: row.display_name,
    version: row.version,
    supersedesId: row.supersedes_id,
    isActive: row.is_active,
    commercialStatus: row.commercial_status as CommercialStatus,
    reviewState: row.review_state as CatalogueSubject["reviewState"],
    reviewerName: row.reviewer_name,
    reviewedAt: row.reviewed_at,
    curriculumApproved: row.curriculum_approved,
    outcomesReviewed: row.outcomes_reviewed,
    diagnosticEligible: row.diagnostic_eligible,
    reassessmentReady: row.reassessment_ready,
    minQuestionsPerOutcome: row.min_questions_per_outcome,
    diagnosticTarget: row.diagnostic_target,
    diagnosticMinimum: row.diagnostic_minimum,
    chapterGroupMarks: row.chapter_group_marks,
    archivedAt: row.archived_at,
  };
}

/** Every catalogue entry, including drafts — staff/audit surfaces only. */
export async function fetchAllCatalogueSubjects(): Promise<CatalogueSubject[]> {
  const { data, error } = await supabaseAdmin.from("catalogue_subjects").select(SUBJECT_SELECT);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as SubjectRow[]).map(toSubject);
}

/** The only list any selector, checkout or public claim may use. */
export async function fetchPurchasableSubjects(classLevel?: number): Promise<CatalogueSubject[]> {
  const all = await fetchAllCatalogueSubjects();
  return all
    .filter(isCommerciallyAvailable)
    .filter((s) => classLevel == null || s.classLevel === classLevel);
}

/** Historical resolution — a report keeps its original curriculum version. */
export async function fetchSubjectById(id: string): Promise<CatalogueSubject | null> {
  const { data, error } = await supabaseAdmin
    .from("catalogue_subjects")
    .select(SUBJECT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSubject(data as unknown as SubjectRow) : null;
}

export async function isSubjectPurchasable(id: string | null): Promise<boolean> {
  if (!id) return false;
  const subject = await fetchSubjectById(id);
  return Boolean(subject && isCommerciallyAvailable(subject));
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export async function fetchPricePlans(): Promise<PricePlan[]> {
  const { data, error } = await supabaseAdmin.from("price_plans").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id as string,
    code: p.code as string,
    planType: p.plan_type as PricePlan["planType"],
    currency: "INR" as const,
    classLevel: null,
    catalogueSubjectId: (p.catalogue_subject_id as string | null) ?? null,
    bundleId: (p.bundle_id as string | null) ?? null,
    amountPaise: p.amount_paise as number,
    taxMode: p.tax_mode as PricePlan["taxMode"],
    taxPercent: Number(p.tax_percent ?? 0),
    validityDays: p.validity_days as number,
    effectiveFrom: p.effective_from as string,
    effectiveTo: (p.effective_to as string | null) ?? null,
    isActive: p.is_active as boolean,
  }));
}

export async function resolveLivePlan(code: string, at = new Date()): Promise<PricePlan | null> {
  return resolvePlan(await fetchPricePlans(), code, at);
}

export async function fetchBundles(): Promise<Bundle[]> {
  const { data, error } = await supabaseAdmin.from("price_bundles").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({
    id: b.id as string,
    code: b.code as string,
    classId: (b.class_id as string | null) ?? null,
    classLevel: null,
    memberSubjectIds: (b.member_subject_ids as string[] | null) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------------

export async function fetchLearnerEntitlements(learnerId: string): Promise<Entitlement[]> {
  const { data, error } = await supabaseAdmin
    .from("entitlements")
    .select("*")
    .eq("learner_id", learnerId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    id: e.id as string,
    learnerId: e.learner_id as string,
    orgId: (e.org_id as string | null) ?? null,
    catalogueSubjectId: (e.catalogue_subject_id as string | null) ?? null,
    bundleId: (e.bundle_id as string | null) ?? null,
    classLevel: (e.class_level as number | null) ?? null,
    entitlementType: e.entitlement_type as EntitlementType,
    sponsorType: e.sponsor_type as "parent" | "centre",
    status: e.status as Entitlement["status"],
    startsAt: e.starts_at as string,
    expiresAt: (e.expires_at as string | null) ?? null,
    creditAmountPaise: (e.credit_amount_paise as number | null) ?? null,
    creditConsumedAt: (e.credit_consumed_at as string | null) ?? null,
    sourceOrderId: (e.source_order_id as string | null) ?? null,
  }));
}

export async function learnerHasSubjectAccess(input: {
  learnerId: string;
  catalogueSubjectId: string;
  classLevel?: number | null;
}): Promise<boolean> {
  const [entitlements, bundles] = await Promise.all([
    fetchLearnerEntitlements(input.learnerId),
    fetchBundles(),
  ]);
  return (
    resolveSubjectAccess({
      learnerId: input.learnerId,
      catalogueSubjectId: input.catalogueSubjectId,
      classLevel: input.classLevel ?? null,
      entitlements,
      bundles,
    }) !== null
  );
}

export { buildPriceSnapshot, evaluateDiagnosticCredit };
