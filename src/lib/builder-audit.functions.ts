// Sprint 6E: thin server-function wrappers for the assessment builder audit
// center.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { getCallerIdentity } from "./audit.server";
import {
  fetchBuilderCounts,
  fetchBuilderPolicies,
  fetchBuilderSnapshot,
  runBuilderProbes,
} from "./builder-audit.server";

const READERS = ["admin", "educator", "reviewer"] as const;

export const getBuilderAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await getCallerIdentity(context.supabase, context.userId);
    const [counts, policies, snapshot] = await Promise.all([
      fetchBuilderCounts(context.supabase, supabaseAdmin),
      fetchBuilderPolicies(context.supabase),
      fetchBuilderSnapshot(context.supabase),
    ]);
    return { generatedAt: new Date().toISOString(), me, counts, policies, snapshot };
  });

export const runBuilderProbesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Staff and reviewers both run probes — the write-gate probe adapts to the
    // caller's role (staff round-trip vs reviewer-must-fail).
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await getCallerIdentity(context.supabase, context.userId);
    const probes = await runBuilderProbes(context.supabase, supabaseAdmin, me);
    return { generatedAt: new Date().toISOString(), me, probes };
  });
