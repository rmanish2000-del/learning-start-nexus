// Sprint 6B: thin server-function wrappers for the curriculum audit center.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAuditRole } from "./admin.server";
import { getCallerIdentity } from "./audit.server";
import {
  fetchBookEvents,
  fetchCurriculumCounts,
  fetchCurriculumPolicies,
  fetchPilotSnapshot,
  runCurriculumProbes,
} from "./curriculum-audit.server";


export const getCurriculumAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAuditRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await getCallerIdentity(context.supabase, context.userId);
    const [counts, policies, pilot, events] = await Promise.all([
      fetchCurriculumCounts(context.supabase, supabaseAdmin),
      fetchCurriculumPolicies(context.supabase),
      fetchPilotSnapshot(context.supabase),
      fetchBookEvents(context.supabase),
    ]);
    return { generatedAt: new Date().toISOString(), me, counts, policies, pilot, events };
  });

export const runCurriculumProbesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAuditRole(context.supabase, context.userId);
    // Staff and reviewers both run probes — the write-gate probe adapts to the
    // caller's role (staff round-trip vs reviewer-must-fail).
    await requireAuditRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await getCallerIdentity(context.supabase, context.userId);
    const probes = await runCurriculumProbes(context.supabase, supabaseAdmin, me);
    return { generatedAt: new Date().toISOString(), me, probes };
  });
