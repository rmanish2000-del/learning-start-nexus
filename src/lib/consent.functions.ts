import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { guardianConsentSchema } from "@/lib/schemas";

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
    // Look up the learner for the org_id stamp; RLS (consents_insert) then
    // restricts the write to staff who manage this learner.
    const { data: learner, error: learnerError } = await context.supabase
      .from("learners")
      .select("org_id")
      .eq("id", data.learnerId)
      .single();
    if (learnerError) throw learnerError;
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
