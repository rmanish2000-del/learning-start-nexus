// Sprint 3 audit center — thin server-function wrappers. All logic lives in
// ./sprint3-audit.server.ts so module scope stays import/type/declaration only.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { fetchPolicyAudit, getCallerIdentity } from "./audit.server";
import {
  fetchSprint3Chain,
  fetchSprint3Counts,
  fetchSprint3Rows,
  runDetectionProbe,
  runSprint3CrossOrgTests,
  runWorkflowProbe,
  SPRINT3_TABLES,
} from "./sprint3-audit.server";
import {
  GAP_THRESHOLD_PCT,
  HIGH_SEVERITY_BELOW_PCT,
  RECOMMENDATION_RULES,
} from "./intervention-shared";

// Live Sprint 3 audit data: caller-visible rows vs global counts, the
// deterministic rule book, the live policy registry, and one full
// gap -> recommendation -> intervention chain.
export const getSprint3Audit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await getCallerIdentity(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [counts, rows, chain, policiesAll] = await Promise.all([
      fetchSprint3Counts(context.supabase, supabaseAdmin),
      fetchSprint3Rows(context.supabase),
      fetchSprint3Chain(context.supabase),
      fetchPolicyAudit(context.supabase),
    ]);

    const policies = policiesAll.filter((p) =>
      (SPRINT3_TABLES as readonly string[]).includes(p.tablename),
    );

    return {
      generatedAt: new Date().toISOString(),
      me,
      counts,
      gaps: rows.gaps,
      recommendations: rows.recommendations,
      interventions: rows.interventions,
      chain,
      policies,
      ruleBook: {
        gapThresholdPct: GAP_THRESHOLD_PCT,
        highSeverityBelowPct: HIGH_SEVERITY_BELOW_PCT,
        rules: RECOMMENDATION_RULES,
      },
    };
  });

// Staff-only probes: (1) gap-detection idempotency/determinism on the latest
// submitted session, (2) end-to-end intervention workflow walk, (3) cross-org
// denial probes against the Sprint 3 tables.
export const runSprint3Probes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);
    const me = await getCallerIdentity(context.supabase, context.userId);
    if (!me.orgId) throw new Error("Your account is not linked to an organization.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [detection, workflow, crossOrg] = await Promise.all([
      runDetectionProbe(context.supabase, supabaseAdmin, me.orgId),
      runWorkflowProbe(context.supabase, supabaseAdmin, me.orgId, context.userId),
      runSprint3CrossOrgTests(context.supabase, supabaseAdmin, me.orgId),
    ]);

    return { generatedAt: new Date().toISOString(), detection, workflow, crossOrg };
  });
