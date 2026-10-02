// Centre setup checklist + sample workspace — RPC surface.
//
// All functions are centre-admin only and scoped to the caller's organization
// (resolved through the caller's own RLS-scoped session, never from input).

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callerOrgId, requireAnyRole } from "./admin.server";
import { centreProfileSchema } from "./centre-setup-shared";

export const getCentreSetupFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const orgId = await callerOrgId(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getCentreSetup } = await import("./centre-setup.server");
    return getCentreSetup(supabaseAdmin, orgId);
  });

export const updateCentreProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => centreProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const orgId = await callerOrgId(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { updateCentreProfile } = await import("./centre-setup.server");
    await updateCentreProfile(supabaseAdmin, orgId, data);
    return { ok: true as const };
  });

export const markReportReviewedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const orgId = await callerOrgId(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { markReportReviewed } = await import("./centre-setup.server");
    await markReportReviewed(supabaseAdmin, orgId);
    return { ok: true as const };
  });

export const createSampleWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const orgId = await callerOrgId(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createSampleWorkspace } = await import("./centre-setup.server");
    return createSampleWorkspace(supabaseAdmin, orgId, context.userId);
  });

export const removeSampleWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const orgId = await callerOrgId(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { removeSampleWorkspace } = await import("./centre-setup.server");
    return removeSampleWorkspace(supabaseAdmin, orgId, context.userId);
  });
