import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { publishBlockers } from "./assessment-lifecycle";
import {
  assessmentIdSchema,
  assignAssessmentSchema,
  createAssessmentSchema,
  saveProgressSchema,
  sessionIdSchema,
} from "./schemas";
import {
  createAssessmentDraft,
  fetchAssessmentItems,
  getMyOrgId,
  getOwnedSession,
  scoreSession,
  stripAnswers,
} from "./assessments.server";
import { applyGapDetection } from "./interventions.server";
import { finalizeOutcomesForSession } from "./outcomes.server";

// Staff: create a diagnostic from item-bank items (all writes via caller's
// RLS-scoped client — policies enforce org isolation and staff role).
export const createAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createAssessmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);
    const orgId = await getMyOrgId(context.supabase, context.userId);

    // The Grade 6 pilot item bank is archived and read-only; building from it
    // would produce an assessment that can never clear the active-scope gate.
    if (!data.questionIds?.length && data.itemIds?.length) {
      throw new Error(
        "The legacy Grade 6 item bank is archived and read-only. Build assessments from the CBSE Class 10 curriculum question bank.",
      );
    }

    // Idempotency is request-scoped, never title-scoped: two intentional
    // creates with the same title are two distinct drafts. Only a retry of the
    // very same request (same clientRequestId) collapses, enforced by the
    // unique (org_id, client_request_id) index inside createAssessmentDraft.
    const created = await createAssessmentDraft(
      context.supabase,
      { orgId, userId: context.userId },
      {
        title: data.title,
        description: data.description,
        timeLimitMinutes: data.timeLimitMinutes,
        bookId: data.bookId,
        unitId: data.unitId,
        questionIds: data.questionIds,
        clientRequestId: data.clientRequestId,
      },
    );

    return { id: created.id, status: "draft" as const, deduped: created.deduped };
  });

// Staff: explicit publication. Every gate is re-checked server-side; a blocked
// publish leaves the assessment as a draft with its questions intact.
export const publishAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assessmentIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);

    const { data: assessment } = await context.supabase
      .from("assessments")
      .select("id, title, subject, grade, book_id, status, time_limit_minutes, archived_at")
      .eq("id", data.assessmentId)
      .maybeSingle();
    if (!assessment) throw new Error("Assessment not found in your organization.");
    if (assessment.status === "published") {
      return { ok: true, status: "published" as const, alreadyPublished: true, blockers: [] };
    }
    if (assessment.archived_at) throw new Error("Archived assessments cannot be published.");

    const [{ data: qMap }, { data: iMap }] = await Promise.all([
      context.supabase
        .from("assessment_question_map")
        .select("question_id, question_bank(verification_state)")
        .eq("assessment_id", data.assessmentId),
      context.supabase
        .from("assessment_item_map")
        .select("item_id")
        .eq("assessment_id", data.assessmentId),
    ]);

    const curriculum = qMap ?? [];
    const legacyItems = iMap ?? [];
    const ids = curriculum.length > 0
      ? curriculum.map((r) => r.question_id)
      : legacyItems.map((r) => r.item_id);
    const unverified = curriculum.filter(
      (r) =>
        ((r.question_bank as unknown as { verification_state?: string } | null)?.verification_state ??
          "unverified") !== "verified",
    ).length;
    const duplicates = ids.length - new Set(ids).size;

    const blockers = publishBlockers({
      title: assessment.title,
      subject: assessment.subject,
      grade: assessment.grade,
      board: null,
      questionCount: ids.length,
      unverifiedCount: curriculum.length > 0 ? unverified : legacyItems.length,
      duplicateCount: duplicates,
      timeLimitMinutes: assessment.time_limit_minutes,
      legacy: curriculum.length === 0,
    });
    if (blockers.length > 0) {
      return { ok: false, status: "draft" as const, alreadyPublished: false, blockers };
    }

    const { error } = await context.supabase
      .from("assessments")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("id", data.assessmentId)
      .eq("status", "draft");
    if (error) throw new Error(error.message);

    // Audit event for the publication decision.
    if (assessment.book_id) {
      await context.supabase.from("book_events").insert({
        org_id: await getMyOrgId(context.supabase, context.userId),
        book_id: assessment.book_id,
        actor_id: context.userId,
        event: "assessment_published",
        detail: { assessment_id: data.assessmentId, questions: ids.length },
      });
    }

    return { ok: true, status: "published" as const, alreadyPublished: false, blockers: [] };
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
    // Sprint 6R: subject/topic come from the assessment itself (curriculum
    // pipeline assessments carry the book's subject and the unit title).
    const subject = session.assessments.subject;
    const topic = session.assessments.topic;
    await supabaseAdmin.from("learner_assessments").insert({
      learner_id: session.learner_id,
      title: session.assessments.title,
      subject,
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

    // Sprint 3: deterministic gap detection + recommendation generation run
    // server-side on every submission (idempotent — safe to re-run). For
    // curriculum assessments the breakdown subtopics ARE outcome codes, so
    // gaps land per-outcome and feed the Sprint 6C intervention map.
    const gapSummary = await applyGapDetection(supabaseAdmin, {
      orgId: session.org_id,
      learnerId: session.learner_id,
      sessionId: session.id,
      subject,
      topic,
      breakdown: scoring.breakdown,
    });

    // Sprint 5: if this submission is a reassessment tied to an intervention,
    // finalize the pending outcome — mastery lift, confidence, and status are
    // computed deterministically from the stored rows.
    const outcomes = await finalizeOutcomesForSession(supabaseAdmin, {
      orgId: session.org_id,
      learnerId: session.learner_id,
      sessionId: session.id,
      interventionId: session.intervention_id ?? null,
      scorePct: scoring.scorePct,
      totalCount: scoring.totalCount,
      breakdown: scoring.breakdown,
      assessmentTitle: session.assessments.title,
    });

    return {
      scorePct: scoring.scorePct,
      correctCount: scoring.correctCount,
      totalCount: scoring.totalCount,
      breakdown: scoring.breakdown,
      gapSummary,
      outcomes,
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
