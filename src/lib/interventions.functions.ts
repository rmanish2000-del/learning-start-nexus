// Sprint 3 intervention workflow — thin server-function wrappers. All engine
// logic lives in ./interventions.server.ts; rules in ./intervention-shared.ts.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { requireAnyRole } from "./admin.server";
import {
  acceptRecommendationSchema,
  gapIdSchema,
  recommendationIdSchema,
  updateInterventionSchema,
} from "./schemas";
import { INTERVENTION_TRANSITIONS } from "./interventions.server";

// Staff: accept a suggested recommendation -> creates a planned intervention.
// Both writes run as the caller, so RLS itself enforces org + role scope.
export const acceptRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => acceptRecommendationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);

    const { data: rec, error } = await context.supabase
      .from("recommendations")
      .select("*")
      .eq("id", data.recommendationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!rec) throw new Error("Recommendation not found in your organization.");
    if (rec.status !== "suggested") {
      throw new Error(`This recommendation is already ${rec.status}.`);
    }

    const { error: recError } = await context.supabase
      .from("recommendations")
      .update({ status: "accepted" })
      .eq("id", rec.id);
    if (recError) throw new Error(recError.message);

    const { data: intervention, error: intError } = await context.supabase
      .from("interventions")
      .insert({
        org_id: rec.org_id,
        learner_id: rec.learner_id,
        recommendation_id: rec.id,
        gap_id: rec.gap_id,
        educator_id: context.userId,
        title: rec.title,
        activity: rec.activity,
        status: "planned",
        target_date: data.targetDate ?? null,
      })
      .select("id")
      .single();
    if (intError) throw new Error(intError.message);

    return { id: intervention.id };
  });

// Staff: dismiss a suggested recommendation (no intervention is created).
export const dismissRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => recommendationIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);
    const { data: rec, error } = await context.supabase
      .from("recommendations")
      .update({ status: "dismissed" })
      .eq("id", data.recommendationId)
      .eq("status", "suggested")
      .select("id");
    if (error) throw new Error(error.message);
    if (!rec || rec.length === 0) {
      throw new Error("Recommendation not found or already actioned.");
    }
    return { ok: true };
  });

// Staff: advance an intervention through its lifecycle
// (planned -> in_progress -> completed, or cancelled from an active state).
export const updateInterventionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInterventionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);

    const { data: current, error } = await context.supabase
      .from("interventions")
      .select("id, status")
      .eq("id", data.interventionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!current) throw new Error("Intervention not found in your organization.");

    const allowed = INTERVENTION_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(data.status)) {
      throw new Error(`Cannot move an intervention from ${current.status} to ${data.status}.`);
    }

    const now = new Date().toISOString();
    const patch: Database["public"]["Tables"]["interventions"]["Update"] = { status: data.status };
    if (data.status === "in_progress") patch.started_at = now;
    if (data.status === "completed") patch.completed_at = now;
    if (data.notes !== undefined) patch.notes = data.notes || null;

    const { error: updError } = await context.supabase
      .from("interventions")
      .update(patch)
      .eq("id", data.interventionId);
    if (updError) throw new Error(updError.message);
    return { ok: true };
  });

// Staff: dismiss a gap (staff override wins over future detection runs for
// the same subtopic) and dismiss its suggested recommendation if one exists.
export const dismissGap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => gapIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);

    const { data: gap, error } = await context.supabase
      .from("learning_gaps")
      .update({ status: "dismissed" })
      .eq("id", data.gapId)
      .eq("status", "open")
      .select("id, learner_id");
    if (error) throw new Error(error.message);
    if (!gap || gap.length === 0) throw new Error("Gap not found or already closed.");

    await context.supabase
      .from("recommendations")
      .update({ status: "dismissed" })
      .eq("gap_id", data.gapId)
      .eq("status", "suggested");

    return { ok: true };
  });

// Student: my accepted/planned/in-progress interventions ("focus plan").
export const getMyInterventions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: learner } = await context.supabase
      .from("learners")
      .select("id")
      .eq("student_user_id", context.userId)
      .maybeSingle();
    if (!learner) return [];
    const { data, error } = await context.supabase
      .from("interventions")
      .select("id, title, activity, status, target_date, started_at, completed_at, created_at")
      .eq("learner_id", learner.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });
