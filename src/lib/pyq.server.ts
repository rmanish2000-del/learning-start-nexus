// Exam-pattern practice — server logic.
//
// Learners practise EduOS's own approved question bank, sequenced by the mark
// weights observed in the officially retrieved 2023-2026 CBSE Class 10 papers.
// Past-paper question text is never stored or served: only pattern weights.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  PYQ_BLUEPRINT_COHORT,
  PYQ_PRACTICE_SIZE,
  PYQ_SUBJECTS,
  PYQ_TERM_2022_NOTE,
  PYQ_TIMED_MINUTES,
  PYQ_TIMED_SIZE,
  chapterForOutcomeCode,
  pyqChapters,
  pyqCohort,
  PYQ_INTELLIGENCE,
  scorePct,
  type PyqMode,
  type PyqPracticeItem,
  type PyqSessionSummary,
  type PyqSubject,
  type PyqWorkspace,
} from "./pyq-shared";

type Client = SupabaseClient<Database>;

type LearnerRow = { id: string; org_id: string | null; subject: string | null; grade: number | string | null };

export async function resolvePyqLearner(supabase: Client, userId: string): Promise<LearnerRow> {
  const { data, error } = await supabase
    .from("learners")
    .select("id, org_id, subject, grade")
    .eq("student_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("We couldn't find your learner profile. Please contact your centre.");
  return data;
}

export function normaliseSubject(value: string | null | undefined): PyqSubject {
  const found = PYQ_SUBJECTS.find((s) => (value ?? "").toLowerCase().includes(s.toLowerCase()));
  return found ?? "Mathematics";
}

type BankRow = {
  id: string;
  kind: string;
  difficulty: number;
  prompt: string;
  stimulus: string | null;
  options: unknown;
  correct_answer: string;
  explanation: string;
  verification_tier: string | null;
  assessment_outcomes: { code: string; title: string } | null;
};

const BANK_SELECT =
  "id, kind, difficulty, prompt, stimulus, options, correct_answer, explanation, verification_tier, assessment_outcomes!inner(code, title)";

// Only approved + verified items are ever practised, whichever tier verified them.
async function loadApproved(supabase: Client, subject: PyqSubject): Promise<BankRow[]> {
  const { data: books, error: bookError } = await supabase
    .from("books")
    .select("id, title")
    .ilike("title", `%${subject}%`);
  if (bookError) throw new Error(bookError.message);
  const bookIds = (books ?? []).map((b) => b.id);
  if (bookIds.length === 0) return [];

  const { data, error } = await supabase
    .from("question_bank")
    .select(BANK_SELECT)
    .in("book_id", bookIds)
    .eq("status", "approved")
    .eq("verification_state", "verified");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BankRow[];
}

function toItem(row: BankRow, reveal: boolean): PyqPracticeItem {
  const options = Array.isArray(row.options) ? (row.options as unknown[]).map(String) : null;
  return {
    id: row.id,
    chapter: chapterForOutcomeCode(row.assessment_outcomes?.code ?? "") ?? "Unmapped",
    outcomeCode: row.assessment_outcomes?.code ?? "",
    kind: row.kind,
    difficulty: row.difficulty,
    prompt: row.prompt,
    stimulus: row.stimulus,
    options,
    ...(reveal
      ? {
          correctAnswer: row.correct_answer,
          explanation: row.explanation,
          verificationTier: row.verification_tier,
        }
      : {}),
  };
}

function summarise(row: {
  id: string;
  subject: string;
  chapter: string | null;
  mode: string;
  status: string;
  score_pct: number | null;
  correct_count: number | null;
  total_count: number | null;
  started_at: string;
  submitted_at: string | null;
}): PyqSessionSummary {
  return {
    id: row.id,
    subject: row.subject,
    chapter: row.chapter,
    mode: row.mode as PyqMode,
    status: row.status as PyqSessionSummary["status"],
    scorePct: row.score_pct,
    correctCount: row.correct_count,
    totalCount: row.total_count,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
  };
}

export async function loadPyqWorkspace(
  supabase: Client,
  userId: string,
  subjectOverride?: PyqSubject | undefined,
): Promise<PyqWorkspace> {
  const learner = await resolvePyqLearner(supabase, userId);
  const subject = subjectOverride ?? normaliseSubject(learner.subject);
  const [approved, sessions] = await Promise.all([
    loadApproved(supabase, subject),
    supabase
      .from("pyq_practice_sessions")
      .select("id, subject, chapter, mode, status, score_pct, correct_count, total_count, started_at, submitted_at")
      .eq("learner_id", learner.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (sessions.error) throw new Error(sessions.error.message);

  const counts = new Map<string, number>();
  for (const row of approved) {
    const chapter = chapterForOutcomeCode(row.assessment_outcomes?.code ?? "");
    if (!chapter) continue;
    counts.set(chapter, (counts.get(chapter) ?? 0) + 1);
  }

  const history = (sessions.data ?? []).map(summarise);
  const weak = history
    .filter((s) => s.status === "submitted" && (s.scorePct ?? 100) < 60 && s.chapter)
    .map((s) => s.chapter as string);

  const cohort = pyqCohort();
  return {
    subject,
    cohort: PYQ_BLUEPRINT_COHORT,
    chapters: pyqChapters(subject),
    repeatedConcepts: cohort?.subjects[subject]?.repeatedConcepts ?? [],
    competencyMix: cohort?.subjects[subject]?.competencyMix ?? {},
    provenance: PYQ_INTELLIGENCE.provenance,
    cohortMeta: {
      years: cohort?.years ?? [],
      format: cohort?.format ?? "",
      papersAnalysed: cohort?.subjects[subject]?.papersAnalysed ?? 0,
    },
    termCohortNote: PYQ_TERM_2022_NOTE,
    availableByChapter: [...counts.entries()]
      .map(([chapter, available]) => ({ chapter, available }))
      .sort((a, b) => b.available - a.available),
    history,
    weakChapters: [...new Set(weak)],
  };
}

// Blueprint-weighted selection: chapters carrying more marks in the recent
// papers contribute proportionally more items, with a deterministic shuffle.
export function selectBlueprintItems(
  rows: BankRow[],
  subject: PyqSubject,
  size: number,
  chapter: string | null,
): BankRow[] {
  const byChapter = new Map<string, BankRow[]>();
  for (const row of rows) {
    const ch = chapterForOutcomeCode(row.assessment_outcomes?.code ?? "") ?? "Unmapped";
    if (chapter && ch !== chapter) continue;
    byChapter.set(ch, [...(byChapter.get(ch) ?? []), row]);
  }
  const pool = [...byChapter.values()].flat();
  if (chapter || pool.length <= size) return shuffle(pool).slice(0, size);

  const weights = new Map(pyqChapters(subject).map((c) => [c.chapter, c.markShare]));
  const ranked = [...byChapter.entries()].sort(
    (a, b) => (weights.get(b[0]) ?? 0) - (weights.get(a[0]) ?? 0),
  );
  const totalWeight = ranked.reduce((sum, [ch]) => sum + (weights.get(ch) ?? 0), 0);

  const picked: BankRow[] = [];
  for (const [ch, items] of ranked) {
    const share = totalWeight > 0 ? (weights.get(ch) ?? 0) / totalWeight : 1 / ranked.length;
    const quota = Math.max(1, Math.round(share * size));
    picked.push(...shuffle(items).slice(0, quota));
  }
  // Top up from anything unused so the learner always gets a full set.
  const chosen = new Set(picked.map((p) => p.id));
  for (const row of shuffle(pool)) {
    if (picked.length >= size) break;
    if (!chosen.has(row.id)) {
      picked.push(row);
      chosen.add(row.id);
    }
  }
  return shuffle(picked).slice(0, size);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export async function startPyqSession(
  supabase: Client,
  userId: string,
  input: { subject?: PyqSubject | undefined; chapter?: string | null; mode: PyqMode },
): Promise<{ sessionId: string; items: PyqPracticeItem[]; durationMinutes: number | null }> {
  const learner = await resolvePyqLearner(supabase, userId);
  const subject = input.subject ?? normaliseSubject(learner.subject);
  const size = input.mode === "timed_paper" ? PYQ_TIMED_SIZE : PYQ_PRACTICE_SIZE;
  const approved = await loadApproved(supabase, subject);
  const selected = selectBlueprintItems(approved, subject, size, input.chapter ?? null);
  if (selected.length === 0) {
    throw new Error("No verified questions are available for this selection yet.");
  }
  const durationMinutes = input.mode === "timed_paper" ? PYQ_TIMED_MINUTES : null;

  const { data, error } = await supabase
    .from("pyq_practice_sessions")
    .insert({
      org_id: learner.org_id!,
      learner_id: learner.id,
      subject,
      chapter: input.chapter ?? null,
      cohort: PYQ_BLUEPRINT_COHORT,
      mode: input.mode,
      duration_minutes: durationMinutes,
      items: selected.map((row) => row.id),
      total_count: selected.length,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  return {
    sessionId: data.id,
    items: selected.map((row) => toItem(row, false)),
    durationMinutes,
  };
}

export async function submitPyqSession(
  supabase: Client,
  userId: string,
  input: { sessionId: string; answers: Record<string, string> },
) {
  const learner = await resolvePyqLearner(supabase, userId);
  const { data: session, error } = await supabase
    .from("pyq_practice_sessions")
    .select("id, learner_id, items, status, subject")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!session || session.learner_id !== learner.id) {
    throw new Error("That practice session isn't available.");
  }
  if (session.status === "submitted") {
    throw new Error("This practice session has already been submitted.");
  }

  const ids = (session.items as unknown as string[]) ?? [];
  const { data: rows, error: rowError } = await supabase
    .from("question_bank")
    .select(BANK_SELECT)
    .in("id", ids);
  if (rowError) throw new Error(rowError.message);

  const bank = (rows ?? []) as unknown as BankRow[];
  const results = bank.map((row) => {
    const given = (input.answers[row.id] ?? "").trim();
    const correct = given.toLowerCase() === row.correct_answer.trim().toLowerCase();
    return { item: toItem(row, true), given, correct };
  });
  const correctCount = results.filter((r) => r.correct).length;
  const pct = scorePct(correctCount, results.length);

  const { error: updateError } = await supabase
    .from("pyq_practice_sessions")
    .update({
      answers: input.answers,
      status: "submitted",
      score_pct: pct,
      correct_count: correctCount,
      total_count: results.length,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", session.id);
  if (updateError) throw new Error(updateError.message);

  const byChapter = new Map<string, { correct: number; total: number }>();
  for (const r of results) {
    const entry = byChapter.get(r.item.chapter) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (r.correct) entry.correct += 1;
    byChapter.set(r.item.chapter, entry);
  }

  return {
    sessionId: session.id,
    scorePct: pct,
    correctCount,
    totalCount: results.length,
    results,
    chapterBreakdown: [...byChapter.entries()].map(([chapter, v]) => ({
      chapter,
      correct: v.correct,
      total: v.total,
      scorePct: scorePct(v.correct, v.total),
    })),
  };
}
