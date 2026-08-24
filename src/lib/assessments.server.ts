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
