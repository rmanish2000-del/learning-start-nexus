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
    // RLS (consents_insert) restricts this to staff who manage the learner.
    const { data: row, error } = await context.supabase
      .from("guardian_consents")
      .insert({
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
