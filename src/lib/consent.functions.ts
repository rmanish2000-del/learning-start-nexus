import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { guardianConsentSchema, withdrawConsentSchema } from "@/lib/schemas";
import { requireAnyRole } from "./admin.server";

export const getLearnerConsent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { learnerId: string }) => input)
  .handler(async ({ data, context }) => {
    const { getConsentStatus, listConsentHistory } = await import("@/lib/consent.server");
    const [status, history] = await Promise.all([
      getConsentStatus(context.supabase, data.learnerId),
      listConsentHistory(context.supabase, data.learnerId),
    ]);
    return { ...status, history };
  });

export const recordGuardianConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => guardianConsentSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Staff record consent on a guardian's behalf; a linked parent records
    // their own. RLS (consents_insert / consents_parent_insert) is the real
    // boundary — this check gives a clear error instead of a raw RLS failure.
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator", "parent"]);
    // Look up the learner for the org_id stamp; RLS (consents_insert) then
    // restricts the write to staff who manage this learner.
    const { data: learner, error: learnerError } = await context.supabase
      .from("learners")
      .select("org_id")
      .eq("id", data.learnerId)
      .single();
    if (learnerError) throw learnerError;
    if (!learner.org_id) throw new Error("Learner is not attached to an organization");
    const { data: row, error } = await context.supabase
      .from("guardian_consents")
      .insert({
        org_id: learner.org_id,
        learner_id: data.learnerId,
        parent_name: data.parentName,
        parent_email: data.parentEmail,
        parent_mobile: data.parentMobile,
        consent_date: data.consentDate,
        consent_version: data.consentVersion,
        recorded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, consentId: row.id };
  });

// Withdrawal is an append-only event: a new row with action = 'withdrawn'.
// Nothing is deleted, so the consent trail stays fully auditable.
export const withdrawGuardianConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => withdrawConsentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator", "parent"]);

    const { getConsentStatus } = await import("@/lib/consent.server");
    const status = await getConsentStatus(context.supabase, data.learnerId);
    if (!status.latest) throw new Error("There is no consent on file to withdraw.");
    if (!status.hasConsent) throw new Error("Consent has already been withdrawn.");

    const { data: learner, error: learnerError } = await context.supabase
      .from("learners")
      .select("org_id")
      .eq("id", data.learnerId)
      .single();
    if (learnerError) throw learnerError;
    if (!learner.org_id) throw new Error("Learner is not attached to an organization");

    const today = new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase.from("guardian_consents").insert({
      org_id: learner.org_id,
      learner_id: data.learnerId,
      parent_name: status.latest.parentName,
      parent_email: status.latest.parentEmail,
      parent_mobile: status.latest.parentMobile,
      consent_date: today,
      consent_version: data.reason
        ? `${status.latest.consentVersion} (withdrawn: ${data.reason})`
        : `${status.latest.consentVersion} (withdrawn)`,
      action: "withdrawn",
      recorded_by: context.userId,
    });
    if (error) throw error;
    return { ok: true as const };
  });
