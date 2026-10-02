import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callerOrgId, requireAnyRole } from "./admin.server";
import { approveCentreLeadSchema, learnerImportSchema } from "./centre-onboarding-shared";
import { requirePlatformOwner } from "./platform-owner.server";

// Approving an application creates a new organization and its first admin —
// a platform-level act, so only the platform owner may do it.
export const approveCentreLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => approveCentreLeadSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requirePlatformOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { approveCentreLeadImpl } = await import("./centre-onboarding.server");
    return approveCentreLeadImpl(supabaseAdmin, context.userId, data);
  });

export const importLearners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => learnerImportSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);
    const orgId = await callerOrgId(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { importLearnersImpl } = await import("./centre-onboarding.server");
    return importLearnersImpl(supabaseAdmin, {
      orgId,
      educatorId: context.userId,
      rows: data.rows,
    });
  });
