// Sprint 6G audit center: server functions. Thin wrappers — runtime logic
// lives in gap-audit.server.ts.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getGapAudit, runGapProbes } from "./gap-audit.server";

export const getGapAuditFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getGapAudit(context.supabase, context.userId));

export const runGapProbesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getCallerIdentity } = await import("./audit.server");
    const me = await getCallerIdentity(context.supabase, context.userId);
    return runGapProbes(context.supabase, me);
  });
