import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import {
  assignAssessmentSchema,
  createAssessmentSchema,
  saveProgressSchema,
  sessionIdSchema,
} from "./schemas";
import {
  fetchAssessmentItems,
  getMyOrgId,
  getOwnedSession,
  scoreSession,
  stripAnswers,
} from "./assessments.server";

// Staff: create a diagnostic from item-bank items (all writes via caller's
// RLS-scoped client — policies enforce org isolation and staff role).
export const createAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createAssessmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);
    const orgId = await getMyOrgId(context.supabase, context.userId);

    // RLS scopes this read to the caller's org bank; a count mismatch means
    // the caller referenced items outside their org.
    const { data: items } = await context.supabase
      .from("assessment_items")
      .select("id")
      .in("id", data.itemIds);
    if ((items ?? []).length !== data.itemIds.length) {
      throw new Error("Some items were not found in your item bank.");
    }

    const { data: created, error } = await context.supabase
      .from("assessments")
      .insert({
        org_id: orgId,
        created_by: context.userId,
        title: data.title,
        description: data.description || null,
        subject: "Mathematics",
        topic: "Fractions",
        grade: 6,
        kind: "diagnostic",
        status: data.publishNow ? "published" : "draft",
        time_limit_minutes: data.timeLimitMinutes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const rows = data.itemIds.map((itemId, i) => ({
      assessment_id: created.id,
      item_id: itemId,
      sort_order: i + 1,
    }));
    const { error: mapError } = await context.supabase.from("assessment_item_map").insert(rows);
    if (mapError) throw new Error(mapError.message);

    return { id: created.id };
  });

// Staff: assign a published assessment to learners (creates one session per
// learner; re-assigning the same assessment to the same learner is a no-op).
export const assignAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assignAssessmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);
    const orgId = await getMyOrgId(context.supabase, context.userId);

    const { data: assessment } = await context.supabase
      .from("assessments")
      .select("id, status")
      .eq("id", data.assessmentId)
      .maybeSingle();
    if (!assessment) throw new Error("Assessment not found in your organization.");
    if (assessment.status !== "published") {
      throw new Error("Only published assessments can be assigned.");
    }

    // RLS read: educators only see their own learners, admins the whole org.
    const { data: learners } = await context.supabase
      .from("learners")
      .select("id")
      .in("id", data.learnerIds);
    const found = new Set((learners ?? []).map((l) => l.id));
    if (data.learnerIds.some((id) => !found.has(id))) {
      throw new Error("Some learners are not available to you.");
    }

    const rows = data.learnerIds.map((learnerId) => ({
      org_id: orgId,
      assessment_id: data.assessmentId,
      learner_id: learnerId,
      assigned_by: context.userId,
      status: "assigned",
      due: data.dueDate || null,
    }));
    const { error } = await context.supabase
      .from("assessment_sessions")
      .upsert(rows, { onConflict: "assessment_id,learner_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);

    return { ok: true, assigned: data.learnerIds.length };
  });

// Student: load own session with questions. Correct answers and explanations
// are stripped until the session is submitted.
export const getStudentSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sessionIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const session = await getOwnedSession(context.supabase, context.userId, data.sessionId);
    const items = await fetchAssessmentItems(session.assessment_id);
    const submitted = session.status === "submitted";
    const { learners: _l, assessments, ...rest } = session;
    return {
      session: rest,
      assessment: assessments,
      questions: submitted ? items : stripAnswers(items),
    };
  });

// Student: autosave progress (resume support). Answers are stored server-side;
// scoring always reads the stored answers, never the client payload.
export const saveSessionProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveProgressSchema.parse(input))
  .handler(async ({ data, context }) => {
    const session = await getOwnedSession(context.supabase, context.userId, data.sessionId);
    if (session.status === "submitted") {
      throw new Error("This assessment has already been submitted.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("assessment_sessions")
      .update({
        answers: data.answers,
        current_position: data.currentPosition,
        status: "in_progress",
        started_at: session.started_at ?? now,
        last_activity_at: now,
      })
      .eq("id", session.id);
    if (error) throw new Error(error.message);
    return { ok: true, savedAt: now };
  });

// Student: submit and auto-score. Generates the assessment record and an
// evidence entry (subtopic strengths/gaps) on the learner profile.
export const submitAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sessionIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const session = await getOwnedSession(context.supabase, context.userId, data.sessionId);
    if (session.status === "submitted") {
      return {
        scorePct: session.score_pct ?? 0,
        correctCount: session.correct_count ?? 0,
        totalCount: session.total_count ?? 0,
        breakdown: session.result ?? [],
      };
    }

    const items = await fetchAssessmentItems(session.assessment_id);
    const scoring = scoreSession(
      items,
      (session.answers as Record<string, string>) ?? {},
      session.assessments.title,
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const { error } = await supabaseAdmin
      .from("assessment_sessions")
      .update({
        status: "submitted",
        score_pct: scoring.scorePct,
        correct_count: scoring.correctCount,
        total_count: scoring.totalCount,
        result: scoring.breakdown,
        started_at: session.started_at ?? now,
        last_activity_at: now,
        submitted_at: now,
      })
      .eq("id", session.id);
    if (error) throw new Error(error.message);

    // Evidence generation: assessment record + evidence entry on the learner.
    await supabaseAdmin.from("learner_assessments").insert({
      learner_id: session.learner_id,
      title: session.assessments.title,
      subject: "Mathematics",
      taken_on: today,
      score: scoring.scorePct,
      status: "completed",
    });
    await supabaseAdmin.from("learner_evidence").insert({
      learner_id: session.learner_id,
      title: `${session.assessments.title} — auto-scored`,
      kind: "assessment",
      note: scoring.evidenceNote,
      recorded_on: today,
    });

    return {
      scorePct: scoring.scorePct,
      correctCount: scoring.correctCount,
      totalCount: scoring.totalCount,
      breakdown: scoring.breakdown,
    };
  });

export const getMyAssessmentSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: learner } = await context.supabase
      .from("learners")
      .select("id")
      .eq("student_user_id", context.userId)
      .maybeSingle();
    if (!learner) return [];
    const { data, error } = await context.supabase
      .from("assessment_sessions")
      .select("id, status, score_pct, due, last_activity_at, assessments(title, topic, time_limit_minutes)")
      .eq("learner_id", learner.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });
