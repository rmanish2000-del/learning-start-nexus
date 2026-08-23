// Server-only helpers for the assessment engine. Never imported by client code.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  scoreItems,
  summarizeBreakdown,
  type Assessment,
  type AssessmentItem,
  type AssessmentSession,
  type ResultEntry,
} from "./assessment-shared";

type Client = SupabaseClient<Database>;

export type SessionWithMeta = AssessmentSession & {
  learners: { student_user_id: string | null };
  assessments: Pick<Assessment, "title" | "topic" | "grade" | "kind" | "time_limit_minutes" | "status">;
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
    .select("*, learners!inner(student_user_id), assessments(title, topic, grade, kind, time_limit_minutes, status)")
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

// Privileged item fetch: items (and their correct answers) are staff-only at
// the database level. Callers MUST authorize the user before calling this.
export async function fetchAssessmentItems(
  assessmentId: string,
): Promise<(AssessmentItem & { sort_order: number; points: number })[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("assessment_item_map")
    .select("sort_order, points, assessment_items(*)")
    .eq("assessment_id", assessmentId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const item = row.assessment_items as unknown as AssessmentItem;
    return { ...item, sort_order: row.sort_order, points: row.points };
  });
}

// Strip answers before a session is submitted: students never receive
// correct_answer or explanation while taking an assessment.
export function stripAnswers(
  items: (AssessmentItem & { sort_order: number; points: number })[],
): Omit<AssessmentItem, "correct_answer" | "explanation">[] {
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
  items: { id: string; subtopic: string; kind: "mcq" | "numeric"; correct_answer: string }[],
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
