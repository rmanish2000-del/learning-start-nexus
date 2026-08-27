// Free Learning Check — server-only implementation.
//
// Product law: the parent starts the check and reads the preview; the learner
// answers it from the Student workspace. Both sides are enforced here, not in
// the UI. Only approved AND verified questions are ever used, so a preview is
// real learner evidence, never a simulation.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  FREE_CHECK_QUESTION_COUNT,
  type FreeCheckPreview,
  type FreeCheckRun,
  type FreeCheckStatus,
  type FreeCheckSubject,
} from "./free-check-shared";
import { GAP_THRESHOLD_PCT } from "./parent-diagnostic-shared";

type CheckRow = {
  id: string;
  org_id: string;
  learner_id: string;
  parent_user_id: string;
  subject: string;
  book_id: string;
  unit_id: string;
  unit_title: string;
  question_ids: string[];
  answers: Record<string, string>;
  current_position: number;
  status: "in_progress" | "submitted";
  score_pct: number | null;
  correct_count: number | null;
  total_count: number | null;
  result: unknown;
  submitted_at: string | null;
};

const CHECK_COLUMNS =
  "id, org_id, learner_id, parent_user_id, subject, book_id, unit_id, unit_title, question_ids, answers, current_position, status, score_pct, correct_count, total_count, result, submitted_at";

type QuestionRow = {
  id: string;
  outcome_id: string;
  kind: string;
  prompt: string;
  stimulus: string | null;
  options: unknown;
  correct_answer: string;
};

type OutcomeRow = {
  id: string;
  code: string;
  title: string;
  unit_id: string;
  intervention_strategy: string | null;
};

// ---------------------------------------------------------------------------
// Selection: a deterministic, verified-only five-question pool
// ---------------------------------------------------------------------------

async function pickPool(subject: FreeCheckSubject): Promise<{
  bookId: string;
  orgId: string;
  unitId: string;
  unitTitle: string;
  questionIds: string[];
}> {
  const { data: book, error: bError } = await supabaseAdmin
    .from("books")
    .select("id, org_id, subject, grade, archived_at")
    .eq("grade", 10)
    .eq("subject", subject)
    .is("archived_at", null)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (bError) throw new Error(bError.message);
  if (!book) throw new Error(`No Class 10 ${subject} content pack is available yet.`);

  const [outcomesRes, questionsRes] = await Promise.all([
    supabaseAdmin
      .from("assessment_outcomes")
      .select("id, code, title, unit_id, intervention_strategy")
      .eq("book_id", book.id)
      .eq("status", "active")
      .order("code"),
    supabaseAdmin
      .from("question_bank")
      .select("id, outcome_id")
      .eq("book_id", book.id)
      .eq("status", "approved")
      // Free preview honours the same pilot content gate as the paid diagnostic.
      .eq("verification_state", "verified")
      .order("id"),
  ]);
  if (outcomesRes.error) throw new Error(outcomesRes.error.message);
  if (questionsRes.error) throw new Error(questionsRes.error.message);

  const outcomes = (outcomesRes.data ?? []) as OutcomeRow[];
  const byOutcome = new Map<string, string[]>();
  for (const q of questionsRes.data ?? []) {
    const list = byOutcome.get(q.outcome_id) ?? [];
    list.push(q.id);
    byOutcome.set(q.outcome_id, list);
  }

  const byUnit = new Map<string, OutcomeRow[]>();
  for (const o of outcomes) {
    const list = byUnit.get(o.unit_id) ?? [];
    list.push(o);
    byUnit.set(o.unit_id, list);
  }

  let best: { unitId: string; outcomes: OutcomeRow[]; count: number } | null = null;
  for (const [unitId, list] of byUnit) {
    const count = list.reduce((sum, o) => sum + (byOutcome.get(o.id)?.length ?? 0), 0);
    if (count >= FREE_CHECK_QUESTION_COUNT && (!best || count > best.count)) {
      best = { unitId, outcomes: list, count };
    }
  }
  if (!best) throw new Error(`The Class 10 ${subject} pack has no verified chapter group yet.`);

  // Round-robin across outcomes so five questions cover as many skills as the
  // chapter group allows — the same coverage instinct as the paid blueprint.
  const ordered = [...best.outcomes].sort((a, b) => a.code.localeCompare(b.code));
  const picked: string[] = [];
  for (let round = 0; picked.length < FREE_CHECK_QUESTION_COUNT && round < 20; round += 1) {
    for (const o of ordered) {
      const list = byOutcome.get(o.id) ?? [];
      const id = list[round];
      if (id) picked.push(id);
      if (picked.length === FREE_CHECK_QUESTION_COUNT) break;
    }
  }

  const { data: unit } = await supabaseAdmin
    .from("curriculum_units")
    .select("title")
    .eq("id", best.unitId)
    .maybeSingle();

  return {
    bookId: book.id,
    orgId: book.org_id,
    unitId: best.unitId,
    unitTitle: unit?.title ?? "Chapter group",
    questionIds: picked,
  };
}

// ---------------------------------------------------------------------------
// Parent side
// ---------------------------------------------------------------------------

/** One attempt per learner per subject. Re-calling returns the same check. */
export async function startFreeCheck(input: {
  parentUserId: string;
  learnerId: string;
  subject: FreeCheckSubject;
}): Promise<FreeCheckPreview> {
  const { assertStudentOwned } = await import("./parent-account.server");
  await assertStudentOwned(input.parentUserId, input.learnerId);

  const existing = await findCheck(input.learnerId, input.subject);
  if (existing) return buildPreview(existing);

  const pool = await pickPool(input.subject);
  const { data, error } = await supabaseAdmin
    .from("free_learning_checks")
    .insert({
      org_id: pool.orgId,
      learner_id: input.learnerId,
      parent_user_id: input.parentUserId,
      subject: input.subject,
      book_id: pool.bookId,
      unit_id: pool.unitId,
      unit_title: pool.unitTitle,
      question_ids: pool.questionIds,
      answers: {},
      current_position: 0,
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .select(CHECK_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return buildPreview(data as unknown as CheckRow);
}

/** Parent-facing status of both pilot subjects for one of their learners. */
export async function loadFreeCheckStatus(
  parentUserId: string,
  learnerId: string,
): Promise<FreeCheckStatus[]> {
  const { assertStudentOwned } = await import("./parent-account.server");
  await assertStudentOwned(parentUserId, learnerId);

  const { data, error } = await supabaseAdmin
    .from("free_learning_checks")
    .select(CHECK_COLUMNS)
    .eq("learner_id", learnerId);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as CheckRow[];

  const subjects: FreeCheckSubject[] = ["Mathematics", "Science"];
  const out: FreeCheckStatus[] = [];
  for (const subject of subjects) {
    const row = rows.find((r) => r.subject === subject) ?? null;
    out.push({
      subject,
      available: row === null,
      check: row ? await buildPreview(row) : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Learner side — answering is learner-only, always
// ---------------------------------------------------------------------------

async function findCheck(learnerId: string, subject: string): Promise<CheckRow | null> {
  const { data, error } = await supabaseAdmin
    .from("free_learning_checks")
    .select(CHECK_COLUMNS)
    .eq("learner_id", learnerId)
    .eq("subject", subject)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as CheckRow) ?? null;
}

async function loadCheckRow(checkId: string): Promise<CheckRow> {
  const { data, error } = await supabaseAdmin
    .from("free_learning_checks")
    .select(CHECK_COLUMNS)
    .eq("id", checkId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("That learning check could not be found.");
  return data as unknown as CheckRow;
}

/**
 * Answer ownership. Only the learner's own authenticated student session may
 * read the question paper or write an answer — a parent session is refused
 * here, on the server, whatever the UI offers.
 */
async function assertLearnerSession(
  row: CheckRow,
  userId: string,
): Promise<{ fullName: string }> {
  const { data: learner, error } = await supabaseAdmin
    .from("learners")
    .select("id, full_name, student_user_id")
    .eq("id", row.learner_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!learner) throw new Error("That student profile could not be found.");
  if (!learner.student_user_id || learner.student_user_id !== userId) {
    throw new Error(
      `Only ${learner.full_name} can answer this learning check. Ask them to sign in as a student.`,
    );
  }
  return { fullName: learner.full_name };
}

export async function loadFreeCheckRun(checkId: string, userId: string): Promise<FreeCheckRun> {
  const row = await loadCheckRow(checkId);
  const learner = await assertLearnerSession(row, userId);
  const { questions, outcomes } = await loadCheckQuestions(row);

  return {
    checkId: row.id,
    learnerName: learner.fullName,
    subject: row.subject,
    unitTitle: row.unit_title,
    status: row.status,
    currentPosition: row.current_position,
    answers: row.answers ?? {},
    questions: questions.map((q) => ({
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      stimulus: q.stimulus,
      options: (q.options as string[] | null) ?? null,
      outcomeCode: outcomes.get(q.outcome_id)?.code ?? "—",
    })),
  };
}

export async function saveFreeCheckAnswer(input: {
  checkId: string;
  questionId: string;
  answer: string;
  position: number;
  userId: string;
}): Promise<{ saved: true }> {
  const row = await loadCheckRow(input.checkId);
  await assertLearnerSession(row, input.userId);
  if (row.status === "submitted") throw new Error("This learning check is already complete.");
  if (!row.question_ids.includes(input.questionId)) throw new Error("That question is not part of this check.");

  const answers = { ...(row.answers ?? {}), [input.questionId]: input.answer };
  const { error } = await supabaseAdmin
    .from("free_learning_checks")
    .update({ answers, current_position: input.position })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  return { saved: true };
}

export async function submitFreeCheck(
  checkId: string,
  userId: string,
): Promise<{ checkId: string }> {
  const row = await loadCheckRow(checkId);
  await assertLearnerSession(row, userId);
  if (row.status === "submitted") return { checkId };

  const { questions, outcomes } = await loadCheckQuestions(row);
  const answers = row.answers ?? {};
  const graded = questions.map((q) => ({
    questionId: q.id,
    outcomeId: q.outcome_id,
    code: outcomes.get(q.outcome_id)?.code ?? "—",
    title: outcomes.get(q.outcome_id)?.title ?? "Skill",
    strategy: outcomes.get(q.outcome_id)?.intervention_strategy ?? null,
    correct: (answers[q.id] ?? "").trim().toLowerCase() === q.correct_answer.trim().toLowerCase(),
  }));

  const correctCount = graded.filter((g) => g.correct).length;
  const scorePct = graded.length === 0 ? 0 : Math.round((correctCount / graded.length) * 100);

  const { error } = await supabaseAdmin
    .from("free_learning_checks")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      score_pct: scorePct,
      correct_count: correctCount,
      total_count: graded.length,
      result: { graded },
    })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  return { checkId };
}

async function loadCheckQuestions(row: CheckRow): Promise<{
  questions: QuestionRow[];
  outcomes: Map<string, OutcomeRow>;
}> {
  const { data, error } = await supabaseAdmin
    .from("question_bank")
    .select("id, outcome_id, kind, prompt, stimulus, options, correct_answer")
    .in("id", row.question_ids);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as QuestionRow[];
  const ordered = row.question_ids
    .map((id) => rows.find((q) => q.id === id))
    .filter((q): q is QuestionRow => !!q);

  const outcomeIds = [...new Set(ordered.map((q) => q.outcome_id))];
  const { data: outcomeRows } = await supabaseAdmin
    .from("assessment_outcomes")
    .select("id, code, title, unit_id, intervention_strategy")
    .in("id", outcomeIds);

  return {
    questions: ordered,
    outcomes: new Map(((outcomeRows ?? []) as unknown as OutcomeRow[]).map((o) => [o.id, o])),
  };
}

// ---------------------------------------------------------------------------
// Preview assembly (parent-facing, deliberately limited)
// ---------------------------------------------------------------------------

async function buildPreview(row: CheckRow): Promise<FreeCheckPreview> {
  const { data: learner } = await supabaseAdmin
    .from("learners")
    .select("full_name")
    .eq("id", row.learner_id)
    .maybeSingle();

  const graded =
    (row.result as { graded?: { code: string; title: string; strategy: string | null; correct: boolean }[] } | null)
      ?.graded ?? [];

  const skills = graded.map((g) => ({ code: g.code, title: g.title, correct: g.correct }));
  const possibleGaps = graded
    .filter((g) => !g.correct)
    .map((g) => ({ code: g.code, title: g.title }));
  const sample = graded.find((g) => !g.correct && g.strategy) ?? graded.find((g) => !g.correct) ?? null;

  return {
    checkId: row.id,
    learnerId: row.learner_id,
    learnerName: learner?.full_name ?? "Your child",
    subject: row.subject,
    unitTitle: row.unit_title,
    status: row.status,
    totalQuestions: row.question_ids.length,
    answeredCount: Object.values(row.answers ?? {}).filter((v) => v !== "").length,
    scorePct: row.score_pct,
    correctCount: row.correct_count,
    skills,
    possibleGaps,
    sampleRecommendation: sample
      ? (sample.strategy ??
        `Re-teach “${sample.title}” with two worked examples, then re-check with three practice questions.`)
      : null,
    submittedAt: row.submitted_at,
  };
}

/** Free-check runs the signed-in learner still has to finish. */
export async function listLearnerFreeChecks(
  learnerId: string,
): Promise<{ checkId: string; subject: string; unitTitle: string; status: string; answered: number; total: number; scorePct: number | null }[]> {
  const { data, error } = await supabaseAdmin
    .from("free_learning_checks")
    .select(CHECK_COLUMNS)
    .eq("learner_id", learnerId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as CheckRow[]).map((r) => ({
    checkId: r.id,
    subject: r.subject,
    unitTitle: r.unit_title,
    status: r.status,
    answered: Object.values(r.answers ?? {}).filter((v) => v !== "").length,
    total: r.question_ids.length,
    scorePct: r.score_pct,
  }));
}

export const FREE_CHECK_GAP_THRESHOLD_PCT = GAP_THRESHOLD_PCT;
