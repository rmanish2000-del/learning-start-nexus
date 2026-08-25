// Sprint 6F: thin server-function wrappers for the diagnostic engine audit
// center.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAuditRole } from "./admin.server";
import { getCallerIdentity } from "./audit.server";
import {
  fetchEngineCounts,
  fetchEnginePolicies,
  fetchEngineSnapshot,
  runEngineProbes,
} from "./diagnostic-audit.server";

const READERS = ["admin", "educator", "reviewer"] as const;

export const getDiagnosticAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAuditRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await getCallerIdentity(context.supabase, context.userId);
    const [counts, policies, snapshot] = await Promise.all([
      fetchEngineCounts(context.supabase, supabaseAdmin),
      fetchEnginePolicies(context.supabase),
      fetchEngineSnapshot(context.supabase),
    ]);
    return { generatedAt: new Date().toISOString(), me, counts, policies, snapshot };
  });

export const runEngineProbesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAuditRole(context.supabase, context.userId);
    // Staff and reviewers both run probes — the write-gate probe adapts to the
    // caller's role (staff round-trip vs reviewer-must-fail).
    await requireAuditRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await getCallerIdentity(context.supabase, context.userId);
    const probes = await runEngineProbes(context.supabase, supabaseAdmin, me);
    return { generatedAt: new Date().toISOString(), me, probes };
  });
