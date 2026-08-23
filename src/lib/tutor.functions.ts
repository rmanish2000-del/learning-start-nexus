// Sprint 4: AI Tutor V1 — thin server-function wrappers.
// All logic lives in ./tutor.server.ts; module scope here stays
// import/type/declaration only.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  launchTutorSchema,
  tutorActionSchema,
  tutorSessionIdSchema,
} from "./schemas";
import { performTutorAction, type TutorAction } from "./tutor.server";

// Student launches (or resumes) the tutor session for one of their
// interventions. The intervention must belong to the caller's learner row —
// enforced by RLS on interventions plus an explicit ownership check.
export const launchTutorSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => launchTutorSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: learner, error: learnerError } = await supabase
      .from("learners")
      .select("id, org_id, subject, mastery_score")
      .eq("student_user_id", userId)
      .maybeSingle();
    if (learnerError) throw new Error(learnerError.message);
    if (!learner) throw new Error("No learner profile is linked to your account.");
    if (!learner.org_id) throw new Error("Your learner profile isn't linked to an organization.");

    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("id, learner_id, title, activity, gap_id")
      .eq("id", data.interventionId)
      .maybeSingle();
    if (interventionError) throw new Error(interventionError.message);
    if (!intervention || intervention.learner_id !== learner.id) {
      throw new Error("That intervention isn't assigned to you.");
    }

    // Resume the existing active session for this intervention if there is one.
    const { data: existing } = await supabase
      .from("tutor_sessions")
      .select("id")
      .eq("learner_id", learner.id)
      .eq("intervention_id", intervention.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return { sessionId: existing.id, resumed: true };

    // Concept comes from the linked gap's subtopic when available.
    let concept = intervention.title.replace(/^(Reteach|Guided practice):\s*/i, "");
    let topic = learner.subject;
    if (intervention.gap_id) {
      const { data: gap } = await supabase
        .from("learning_gaps")
        .select("subtopic, topic")
        .eq("id", intervention.gap_id)
        .maybeSingle();
      if (gap) {
        concept = gap.subtopic;
        topic = gap.topic;
      }
    }

    const { data: session, error: insertError } = await supabase
      .from("tutor_sessions")
      .insert({
        org_id: learner.org_id,
        learner_id: learner.id,
        intervention_id: intervention.id,
        student_user_id: userId,
        subject: learner.subject,
        topic,
        concept,
        objective: intervention.activity,
        mastery_at_start: learner.mastery_score,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    return { sessionId: session.id, resumed: false };
  });

// Load a session plus its interactions. RLS scopes both: students see their
// own conversation; staff see the session aggregate and zero interactions.
export const getTutorSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => tutorSessionIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: session, error } = await supabase
      .from("tutor_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Tutor session not found.");

    const { data: interactions, error: interactionsError } = await supabase
      .from("tutor_interactions")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    if (interactionsError) throw new Error(interactionsError.message);

    let interventionTitle: string | null = null;
    if (session.intervention_id) {
      const { data: intervention } = await supabase
        .from("interventions")
        .select("title")
        .eq("id", session.intervention_id)
        .maybeSingle();
      interventionTitle = intervention?.title ?? null;
    }

    return { session, interactions: interactions ?? [], interventionTitle };
  });

// One tutor turn: explain / hint / example / reframe / try / socratic /
// practice. Students only, own sessions only (checked in performTutorAction).
export const tutorAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => tutorActionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const result = await performTutorAction(context.supabase, context.userId, {
      sessionId: data.sessionId,
      action: data.action as TutorAction,
      studentText: data.studentText,
    });
    return {
      interaction: result.interaction,
      aiUsed: result.reply.aiUsed,
      practiceCorrect: result.reply.practiceCorrect,
    };
  });
