// Sprint 6D: thin server-function wrappers for the question bank audit center.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { getCallerIdentity } from "./audit.server";
import {
  fetchQuestionBankCounts,
  fetchQuestionBankPolicies,
  fetchQuestionBankSnapshot,
  runQuestionBankProbes,
} from "./question-bank-audit.server";

const READERS = ["admin", "educator", "reviewer"] as const;

export const getQuestionBankAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await getCallerIdentity(context.supabase, context.userId);
    const [counts, policies, snapshot] = await Promise.all([
      fetchQuestionBankCounts(context.supabase, supabaseAdmin),
      fetchQuestionBankPolicies(context.supabase),
      fetchQuestionBankSnapshot(context.supabase),
    ]);
    return { generatedAt: new Date().toISOString(), me, counts, policies, snapshot };
  });

export const runQuestionBankProbesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Staff and reviewers both run probes — the write-gate probe adapts to the
    // caller's role (staff round-trip vs reviewer-must-fail).
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await getCallerIdentity(context.supabase, context.userId);
    const probes = await runQuestionBankProbes(context.supabase, supabaseAdmin, me);
    return { generatedAt: new Date().toISOString(), me, probes };
  });
