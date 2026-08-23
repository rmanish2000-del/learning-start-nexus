// Sprint 2 audit closure — thin server-function wrappers. All logic lives in
// ./audit.server.ts so module scope stays import/type/declaration only.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import {
  fetchAuditChain,
  fetchBuildProofCounts,
  fetchPolicyAudit,
  getCallerIdentity,
  runCrossOrgTests,
} from "./audit.server";

// Live policy registry, read from the database catalog (pg_policies) through
// the rls_policy_audit view — never from application code.
export const getRlsPolicyAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await getCallerIdentity(context.supabase, context.userId);
    const policies = await fetchPolicyAudit(context.supabase);
    return { generatedAt: new Date().toISOString(), me, policies };
  });

// Cross-organization test runner. Staff only: it executes real read/insert/
// update attempts against rows owned by ANOTHER organization and returns the
// verbatim database responses.
export const runCrossOrgTestRunner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);
    const me = await getCallerIdentity(context.supabase, context.userId);
    if (!me.orgId) throw new Error("Your account is not linked to an organization.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tests = await runCrossOrgTests(context.supabase, supabaseAdmin, me.orgId);
    return { generatedAt: new Date().toISOString(), me, tests };
  });

// Full audit chain for the most recently submitted assessment visible to the
// caller: assessment → responses → server scoring → learner assessment
// record → learner evidence record, with IDs and timestamps.
export const getAssessmentAuditReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);
    const me = await getCallerIdentity(context.supabase, context.userId);
    const chain = await fetchAuditChain(context.supabase);
    return { generatedAt: new Date().toISOString(), me, chain };
  });

// Build-proof counts: caller-visible (RLS applies) vs global (service role).
export const getAssessmentBuildProof = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await getCallerIdentity(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { counts, submittedVisible, submittedGlobal } = await fetchBuildProofCounts(
      context.supabase,
      supabaseAdmin,
    );
    const policies = await fetchPolicyAudit(context.supabase);
    return {
      generatedAt: new Date().toISOString(),
      me,
      counts,
      submittedVisible,
      submittedGlobal,
      policies,
    };
  });
