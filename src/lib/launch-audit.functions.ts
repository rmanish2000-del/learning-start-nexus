// Launch Readiness Audit — thin server-function wrappers. All logic lives in
// ./launch-audit.server.ts so module scope stays import/type/declaration only.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAuditRole } from "./admin.server";
import { getCallerIdentity } from "./audit.server";
import {
  fetchConsentOverview,
  fetchGateDecisions,
  fetchLaunchPolicySummary,
  fetchReviewerAccount,
  runLaunchProbes,
} from "./launch-audit.server";

export const getLaunchAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAuditRole(context.supabase, context.userId);
    const me = await getCallerIdentity(context.supabase, context.userId);
    const [consents, gateDecisions, reviewer, policySummary] = await Promise.all([
      fetchConsentOverview(context.supabase),
      fetchGateDecisions(context.supabase),
      fetchReviewerAccount(context.supabase),
      fetchLaunchPolicySummary(context.supabase),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      me,
      consents,
      gateDecisions,
      reviewer,
      policySummary,
    };
  });

export const runLaunchAuditProbes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAuditRole(context.supabase, context.userId);
    const me = await getCallerIdentity(context.supabase, context.userId);
    if (!me.orgId) throw new Error("No organization on your profile.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const probes = await runLaunchProbes(context.supabase, supabaseAdmin, me.orgId);
    return { generatedAt: new Date().toISOString(), probes };
  });
