// Thin server-function wrappers for the Pilot Evidence Foundation (M6/M7/M8).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callerOrgId, requireAnyRole } from "./admin.server";
import {
  fetchCbseCoverage,
  fetchCohortMetrics,
  fetchTutorEvidence,
  fetchVerificationQueue,
  recordQuestionVerification,
} from "./pilot-evidence.server";

export const verifyQuestionSchema = z.object({
  questionId: z.string().uuid(),
  action: z.enum(["verified", "rejected"]),
  note: z.string().trim().max(500).nullable().optional(),
});

export const getPilotEvidenceFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator", "reviewer"]);
    const [tutor, coverage, verification, cohort] = await Promise.all([
      fetchTutorEvidence(context.supabase),
      fetchCbseCoverage(context.supabase),
      fetchVerificationQueue(context.supabase),
      fetchCohortMetrics(context.supabase),
    ]);
    return { tutor, coverage, verification, cohort };
  });

export const verifyQuestionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => verifyQuestionSchema.parse(input))
  .handler(async ({ context, data }) => {
    // Reviewers and admins only — the database policy enforces the same rule.
    await requireAnyRole(context.supabase, context.userId, ["admin", "reviewer"]);
    const orgId = await callerOrgId(context.supabase, context.userId);
    await recordQuestionVerification(
      context.supabase,
      { orgId, userId: context.userId },
      { questionId: data.questionId, action: data.action, note: data.note ?? null },
    );
    return { ok: true };
  });
