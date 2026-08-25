// Sprint 5 audit center — thin server-function wrappers. All logic lives in
// ./sprint5-audit.server.ts so module scope stays import/type/declaration only.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAuditRole } from "./admin.server";
import { getCallerIdentity } from "./audit.server";
import {
  fetchOutcomePolicies,
  fetchSprint5Counts,
  fetchVisibleOutcomes,
  OUTCOME_FORMULA_SUMMARY,
  runSprint5Probes,
} from "./sprint5-audit.server";

// Audit overview: caller identity, RLS-scoped counts vs global, live outcome
// policies, the visible outcome list, and the deterministic formula contract.
export const getSprint5Audit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAuditRole(context.supabase, context.userId);
    const me = await getCallerIdentity(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [counts, policies, outcomes] = await Promise.all([
      fetchSprint5Counts(context.supabase, supabaseAdmin),
      fetchOutcomePolicies(context.supabase),
      fetchVisibleOutcomes(context.supabase),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      me,
      counts,
      policies,
      outcomes,
      formula: OUTCOME_FORMULA_SUMMARY,
    };
  });

// Live probes: outcome recomputation, bank separation, mastery proof,
// evidence chain, cross-org isolation, demo story readiness, policy registry.
// Staff only — probes attempt privileged operations and read global counts.
export const runSprint5ProbesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAuditRole(context.supabase, context.userId);
    const me = await getCallerIdentity(context.supabase, context.userId);
    if (!me.orgId) throw new Error("Your account is not linked to an organization.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const probes = await runSprint5Probes(context.supabase, supabaseAdmin, me.orgId);
    return { generatedAt: new Date().toISOString(), me, probes };
  });
