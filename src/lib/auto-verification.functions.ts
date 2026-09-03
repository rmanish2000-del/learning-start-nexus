// Automated verification — server-function boundary (admin only for writes).

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callerOrgId, requireAnyRole } from "./admin.server";
import {
  applyAutoVerification,
  fetchAutoVerificationEvidence,
  previewAutoVerification,
} from "./auto-verification.server";

export const getAutoVerificationFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "reviewer"]);
    const [evidence, preview] = await Promise.all([
      fetchAutoVerificationEvidence(context.supabase),
      previewAutoVerification(context.supabase),
    ]);
    return {
      evidence,
      summary: preview.summary,
      verdicts: preview.verdicts.slice(0, 200),
    };
  });

export const runAutoVerificationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const orgId = await callerOrgId(context.supabase, context.userId);
    const { summary } = await applyAutoVerification(context.supabase, {
      orgId,
      userId: context.userId,
    });
    return summary;
  });
