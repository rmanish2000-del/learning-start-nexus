// Named-SME review workflow — server function boundary (reviewer/admin only).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callerOrgId, requireAnyRole } from "./admin.server";
import { fetchSmeReview, recordSmeDecision } from "./sme-review.server";

export const smeDecisionSchema = z.object({
  questionId: z.string().uuid(),
  action: z.enum(["verified", "rejected"]),
  reviewerName: z.string().trim().min(2).max(120),
  note: z.string().trim().max(1000).nullable().optional(),
});

export const getSmeReviewFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "reviewer"]);
    return fetchSmeReview(context.supabase);
  });

export const recordSmeDecisionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => smeDecisionSchema.parse(input))
  .handler(async ({ context, data }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "reviewer"]);
    const orgId = await callerOrgId(context.supabase, context.userId);
    // The reviewer's name is recorded inside the append-only note so the
    // decision is attributable to a named subject expert.
    const note = [`Named SME: ${data.reviewerName}`, data.note?.trim()]
      .filter(Boolean)
      .join(" — ");
    await recordSmeDecision(
      context.supabase,
      { orgId, userId: context.userId },
      { questionId: data.questionId, action: data.action, note },
    );
    return { ok: true };
  });
