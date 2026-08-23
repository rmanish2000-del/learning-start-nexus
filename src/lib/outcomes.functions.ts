// Sprint 5 outcome proof — thin server-function wrappers. All engine logic
// lives in ./outcomes.server.ts; formulas in ./outcome-shared.ts.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { learnerIdSchema, outcomeIdSchema } from "./schemas";
import {
  fetchOrgOutcomeSummary,
  fetchOutcomeReport,
  fetchOutcomesForLearner,
} from "./outcomes.server";

// Staff: all outcomes for a learner (RLS scopes to the caller's org/roster).
export const getLearnerOutcomes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => learnerIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);
    return fetchOutcomesForLearner(context.supabase, data.learnerId);
  });

// Student: my own outcomes (before/after/progress view).
export const getMyOutcomes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: learner } = await context.supabase
      .from("learners")
      .select("id")
      .eq("student_user_id", context.userId)
      .maybeSingle();
    if (!learner) return [];
    return fetchOutcomesForLearner(context.supabase, learner.id);
  });

// Staff or owning student: the full evidence chain for one outcome.
export const getOutcomeReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => outcomeIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const report = await fetchOutcomeReport(context.supabase, data.outcomeId);
    if (!report) throw new Error("Outcome not found or not visible to you.");
    return report;
  });

// Staff: organization outcome summary for the dashboard.
export const getOrgOutcomeSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);
    return fetchOrgOutcomeSummary(context.supabase);
  });
