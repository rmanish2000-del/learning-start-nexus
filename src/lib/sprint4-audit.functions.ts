// Sprint 4 audit center — thin server-function wrappers. All logic lives in
// ./sprint4-audit.server.ts so module scope stays import/type/declaration only.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { getCallerIdentity } from "./audit.server";
import {
  fetchSprint4Counts,
  fetchTutorPolicies,
  fetchTutorSessionAggregates,
  runSprint4Probes,
  TUTOR_BOUNDARIES,
  TUTOR_LIBRARY_SUMMARY,
} from "./sprint4-audit.server";
import { TUTOR_MODEL } from "./tutor.server";

// Audit overview: caller identity, RLS-scoped counts vs global, live tutor
// policies, session aggregates (no conversation content), and the static
// boundary + fallback-library contract.
export const getSprint4Audit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await getCallerIdentity(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [counts, policies, sessions] = await Promise.all([
      fetchSprint4Counts(context.supabase, supabaseAdmin),
      fetchTutorPolicies(context.supabase),
      fetchTutorSessionAggregates(context.supabase),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      me,
      counts,
      policies,
      sessions,
      boundaries: TUTOR_BOUNDARIES,
      library: TUTOR_LIBRARY_SUMMARY,
      aiModel: TUTOR_MODEL,
    };
  });

// Live probes: role enforcement, conversation privacy, cross-org isolation,
// fallback coverage, AI gateway status, and the end-to-end boundary harness.
// Staff only — probes attempt privileged operations and read global counts.
export const runSprint4ProbesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);
    const me = await getCallerIdentity(context.supabase, context.userId);
    if (!me.orgId) throw new Error("Your account is not linked to an organization.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const probes = await runSprint4Probes(context.supabase, supabaseAdmin, me.orgId);
    return { generatedAt: new Date().toISOString(), me, probes };
  });
