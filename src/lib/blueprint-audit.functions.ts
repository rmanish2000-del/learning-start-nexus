// Sprint 6C: thin server-function wrappers for the blueprint audit center.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { getCallerIdentity } from "./audit.server";
import {
  fetchBlueprintCounts,
  fetchBlueprintPolicies,
  fetchBlueprintSnapshot,
  runBlueprintProbes,
} from "./blueprint-audit.server";

const READERS = ["admin", "educator", "reviewer"] as const;

export const getBlueprintAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await getCallerIdentity(context.supabase, context.userId);
    const [counts, policies, snapshot] = await Promise.all([
      fetchBlueprintCounts(context.supabase, supabaseAdmin),
      fetchBlueprintPolicies(context.supabase),
      fetchBlueprintSnapshot(context.supabase),
    ]);
    return { generatedAt: new Date().toISOString(), me, counts, policies, snapshot };
  });

export const runBlueprintProbesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Staff and reviewers both run probes — the write-gate probe adapts to the
    // caller's role (staff round-trip vs reviewer-must-fail).
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await getCallerIdentity(context.supabase, context.userId);
    const probes = await runBlueprintProbes(context.supabase, supabaseAdmin, me);
    return { generatedAt: new Date().toISOString(), me, probes };
  });
