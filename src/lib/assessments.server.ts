// Server-only helpers for the assessment engine. Never imported by client code.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  scoreItems,
  summarizeBreakdown,
  type Assessment,
  type ItemKind,
  type AssessmentSession,
  type ResultEntry,
  type RunnerQuestion,
} from "./assessment-shared";
import { isLegacyContent, SUPPORTED_SCOPE } from "./assessment-lifecycle";

type Client = SupabaseClient<Database>;

const NO_ROWS = ["00000000-0000-4000-8000-000000000000"];

export type SessionWithMeta = AssessmentSession & {
  learners: { student_user_id: string | null };
  assessments: Pick<
    Assessment,
    "title" | "subject" | "topic" | "grade" | "kind" | "time_limit_minutes" | "status"
  > & { book_id: string | null; unit_id: string | null };
  // Sprint 5: reassessment sessions link back to the intervention they close.
  intervention_id?: string | null;
};

export async function getMyOrgId(supabase: Client, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("org_id").eq("id", userId).single();
  if (!data?.org_id) throw new Error("Your account is not linked to an organization.");
  return data.org_id;
}

// Verify the session belongs to a learner whose student account IS the caller.
// Runs as the caller: session RLS already limits students to their own rows;
// the inner join on learners makes the ownership check explicit.
export async function getOwnedSession(
  supabase: Client,
  userId: string,
  sessionId: string,
): Promise<SessionWithMeta> {
  const { data, error } = await supabase
    .from("assessment_sessions")
    .select(
      "*, learners!inner(student_user_id), assessments(title, subject, topic, grade, kind, time_limit_minutes, status, book_id, unit_id)",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Assessment session not found.");
  const session = data as unknown as SessionWithMeta;
  if (session.learners.student_user_id !== userId) {
    throw new Error("This assessment is not assigned to you.");
  }
  return session;
}

// ---------------------------------------------------------------------------
// Item loading. Both assessment_items and question_bank are staff-only at the
// database level (answer keys live on the row), so items are fetched with the
// service role AFTER the caller has been authorized for the specific
// session/assessment (see assessments.functions.ts).
//
// Sprint 6R: dual-read. Curriculum-pipeline assessments carry their questions
// in assessment_question_map → question_bank (subtopic = outcome code, so gap
// detection lands per-outcome). Legacy Sprint 2 assessments still resolve via
// assessment_item_map → assessment_items. The question map wins when present.
// ---------------------------------------------------------------------------

type BankRow = {
  id: string;
  outcome_id: string;
  kind: string;
  difficulty: number;
  prompt: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
};

export async function fetchAssessmentItems(assessmentId: string): Promise<RunnerQuestion[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: qMap, error: qError } = await supabaseAdmin
    .from("assessment_question_map")
    .select("sort_order, points, question_bank(*)")
    .eq("assessment_id", assessmentId)
    .order("sort_order");
  if (qError) throw new Error(qError.message);

  if ((qMap ?? []).length > 0) {
    const rows = qMap ?? [];
    const outcomeIds = [...new Set(rows.map((r) => (r.question_bank as unknown as BankRow).outcome_id))];
    const { data: outcomes, error: oError } = await supabaseAdmin
      .from("assessment_outcomes")
      .select("id, code")
      .in("id", outcomeIds.length > 0 ? outcomeIds : NO_ROWS);
    if (oError) throw new Error(oError.message);
    const codeById = new Map((outcomes ?? []).map((o) => [o.id, o.code]));
    return rows.map((row) => {
      const q = row.question_bank as unknown as BankRow;
      return {
        id: q.id,
        subtopic: codeById.get(q.outcome_id) ?? "General",
        difficulty: q.difficulty,
        kind: q.kind as ItemKind,
        prompt: q.prompt,
        options: (q.options as string[] | null) ?? null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        sort_order: row.sort_order,
        points: row.points,
      };
    });
  }

  const { data, error } = await supabaseAdmin
    .from("assessment_item_map")
    .select("sort_order, points, assessment_items(*)")
    .eq("assessment_id", assessmentId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const item = row.assessment_items as unknown as {
      id: string;
      subtopic: string;
      difficulty: number;
      kind: string;
      prompt: string;
      options: unknown;
      correct_answer: string;
      explanation: string | null;
    };
    return {
      id: item.id,
      subtopic: item.subtopic,
      difficulty: item.difficulty,
      kind: item.kind as ItemKind,
      prompt: item.prompt,
      options: (item.options as string[] | null) ?? null,
      correct_answer: item.correct_answer,
      explanation: item.explanation,
      sort_order: row.sort_order,
      points: row.points,
    };
  });
}

// Strip answers before a session is submitted: students never receive
// correct_answer or explanation while taking an assessment.
export function stripAnswers(items: RunnerQuestion[]): Omit<RunnerQuestion, "correct_answer" | "explanation">[] {
  return items.map(({ correct_answer: _c, explanation: _e, ...rest }) => rest);
}

export type ScoringOutcome = {
  scorePct: number;
  correctCount: number;
  totalCount: number;
  breakdown: ResultEntry[];
  evidenceNote: string;
};

export function scoreSession(
  items: { id: string; subtopic: string; kind: ItemKind; correct_answer: string }[],
  answers: Record<string, string>,
  assessmentTitle: string,
): ScoringOutcome {
  const { scorePct, correctCount, totalCount, breakdown } = scoreItems(items, answers);
  const { strong, needs } = summarizeBreakdown(breakdown);
  const parts = [`Scored ${scorePct}% (${correctCount}/${totalCount}) on ${assessmentTitle}.`];
  if (strong.length > 0) parts.push(`Strong: ${strong.join(", ")}.`);
  if (needs.length > 0) parts.push(`Needs work: ${needs.join(", ")}.`);
  return { scorePct, correctCount, totalCount, breakdown, evidenceNote: parts.join(" ") };
}

// ---------------------------------------------------------------------------
// Draft creation (P0 regression fix)
//
// Assessments used to be created with hardcoded legacy metadata
// (grade 6 / Mathematics / Fractions) taken from the archived pilot item bank.
// Every new assessment was therefore classified as legacy content, vanished
// from the active list and could never clear the active-scope publish gate.
//
// Creation now derives board, grade, subject and topic from the curriculum
// chain the questions actually belong to. Nothing here publishes or assigns.
// ---------------------------------------------------------------------------

export type CreateDraftInput = {
  title: string;
  description?: string | null | undefined;
  timeLimitMinutes?: number | null | undefined;
  bookId: string;
  unitId: string;
  questionIds: string[];
};

export async function createAssessmentDraft(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: CreateDraftInput,
): Promise<{ id: string; status: "draft" }> {
  if (new Set(input.questionIds).size !== input.questionIds.length) {
    throw new Error("The same question was selected more than once.");
  }

  // RLS scopes every read below to the caller's organization.
  const [bookRes, unitRes, questionRes] = await Promise.all([
    supabase
      .from("books")
      .select("id, board, grade, subject, is_demo, archived_at")
      .eq("id", input.bookId)
      .maybeSingle(),
    supabase
      .from("curriculum_units")
      .select("id, title, book_id")
      .eq("id", input.unitId)
      .eq("book_id", input.bookId)
      .maybeSingle(),
    supabase
      .from("question_bank")
      .select("id, book_id, outcome_id, status, verification_state")
      .in("id", input.questionIds),
  ]);

  const book = bookRes.data;
  if (!book) throw new Error("Curriculum book not found in your organization.");
  if (book.archived_at || book.is_demo) {
    throw new Error("Archived and demo content is read-only and cannot be built into assessments.");
  }
  if (isLegacyContent({ grade: book.grade, subject: book.subject, isDemo: book.is_demo })) {
    throw new Error(
      `Curriculum scope is unsupported. Active scope is CBSE Class ${SUPPORTED_SCOPE.grade} ${SUPPORTED_SCOPE.subjects.join(" and ")}.`,
    );
  }
  if (book.board && book.board !== SUPPORTED_SCOPE.board) {
    throw new Error(`Only ${SUPPORTED_SCOPE.board} content is in the active scope.`);
  }
  if (!unitRes.data) throw new Error("Unit not found in the selected book.");

  const questions = questionRes.data ?? [];
  if (questions.length !== input.questionIds.length) {
    throw new Error("Some selected questions were not found in your organization.");
  }
  if (questions.some((q) => q.book_id !== input.bookId)) {
    throw new Error("Every question must come from the selected book's bank.");
  }
  const unapproved = questions.filter(
    (q) => q.status !== "approved" || q.verification_state !== "verified",
  );
  if (unapproved.length > 0) {
    throw new Error(
      `${unapproved.length} selected question(s) are not approved and verified. Verify them in the question bank first.`,
    );
  }

  // Outcome alignment: every question must sit under the chosen unit.
  const outcomeIds = [...new Set(questions.map((q) => q.outcome_id))];
  const { data: outcomes } = await supabase
    .from("assessment_outcomes")
    .select("id, unit_id")
    .in("id", outcomeIds);
  const aligned = (outcomes ?? []).filter((o) => o.unit_id === input.unitId);
  if (aligned.length !== outcomeIds.length) {
    throw new Error("Every question's outcome must belong to the selected unit.");
  }

  const { data: created, error } = await supabase
    .from("assessments")
    .insert({
      org_id: ctx.orgId,
      created_by: ctx.userId,
      title: input.title,
      description: input.description || null,
      subject: book.subject,
      topic: unitRes.data.title,
      grade: book.grade,
      kind: "diagnostic",
      // PRODUCT LAW: creation never publishes and never assigns.
      status: "draft",
      time_limit_minutes: input.timeLimitMinutes ?? null,
      book_id: input.bookId,
      unit_id: input.unitId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (!created) throw new Error("The draft could not be created.");

  const { error: mapError } = await supabase.from("assessment_question_map").insert(
    input.questionIds.map((questionId, i) => ({
      assessment_id: created.id,
      question_id: questionId,
      sort_order: i + 1,
      points: 1,
    })),
  );
  if (mapError) {
    // A half-built assessment must never survive.
    await supabase.from("assessments").delete().eq("id", created.id);
    throw new Error(mapError.message);
  }

  return { id: created.id, status: "draft" };
}
