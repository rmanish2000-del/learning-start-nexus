// Sprint 6G: server-only fetchers for curriculum-aware gap detection.
// Reads run through the caller's RLS-scoped client, so organization isolation
// and the staff/reviewer split are enforced by database policies. The
// analyzer itself is the pure function in gap-shared.ts. Read-only — nothing
// here assigns interventions, creates gaps, or touches mastery.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  bandForScore,
  buildLearnerView,
  buildOutcomeAnalyses,
  scoreQuestions,
  type AnalysisInput,
  type GapAnalysis,
  type GapBookDto,
  type InterventionRef,
  type MasteryBandDto,
  type SubmittedSessionDto,
  type TraceLink,
} from "./gap-shared";

type Client = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Books + submitted diagnostics
// ---------------------------------------------------------------------------

export async function fetchGapBooks(supabase: Client): Promise<GapBookDto[]> {
  const { data, error } = await supabase
    .from("books")
    .select("id, title, board, grade, subject, status")
    .neq("status", "archived")
    .order("title");
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    board: b.board,
    grade: b.grade,
    subject: b.subject,
    status: b.status,
  }));
}

export async function fetchGapSessions(
  supabase: Client,
  bookId: string,
): Promise<{ book: GapBookDto | null; sessions: SubmittedSessionDto[] }> {
  const { data: bookRow, error: bookErr } = await supabase
    .from("books")
    .select("id, title, board, grade, subject, status")
    .eq("id", bookId)
    .maybeSingle();
  if (bookErr) throw new Error(bookErr.message);
  const book: GapBookDto | null = bookRow
    ? {
        id: bookRow.id,
        title: bookRow.title,
        board: bookRow.board,
        grade: bookRow.grade,
        subject: bookRow.subject,
        status: bookRow.status,
      }
    : null;

  const { data: assessments, error: aErr } = await supabase
    .from("assessments")
    .select("id, title, kind")
    .eq("book_id", bookId);
  if (aErr) throw new Error(aErr.message);
  const assessmentById = new Map((assessments ?? []).map((a) => [a.id, a]));
  const assessmentIds = (assessments ?? []).map((a) => a.id);
  if (assessmentIds.length === 0) return { book, sessions: [] };

  const { data: sessions, error: sErr } = await supabase
    .from("assessment_sessions")
    .select("id, learner_id, assessment_id, status, score_pct, correct_count, total_count, submitted_at")
    .in("assessment_id", assessmentIds)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });
  if (sErr) throw new Error(sErr.message);

  const learnerIds = [...new Set((sessions ?? []).map((s) => s.learner_id))];
  const learnerNames = new Map<string, string>();
  if (learnerIds.length > 0) {
    const { data: learners, error: lErr } = await supabase
      .from("learners")
      .select("id, full_name")
      .in("id", learnerIds);
    if (lErr) throw new Error(lErr.message);
    for (const l of learners ?? []) learnerNames.set(l.id, l.full_name);
  }

  return {
    book,
    sessions: (sessions ?? []).map((s) => ({
      id: s.id,
      learnerId: s.learner_id,
      learnerName: learnerNames.get(s.learner_id) ?? "Unknown learner",
      assessmentId: s.assessment_id,
      assessmentTitle: assessmentById.get(s.assessment_id)?.title ?? "Unknown assessment",
      assessmentKind: assessmentById.get(s.assessment_id)?.kind ?? "diagnostic",
      submittedAt: s.submitted_at,
      scorePct: s.score_pct,
      correctCount: s.correct_count,
      totalCount: s.total_count,
    })),
  };
}

// ---------------------------------------------------------------------------
// Full analysis assembly — shared by the dashboard and the audit probes so
// both compute from exactly the same rows.
// ---------------------------------------------------------------------------

export type AssembledSession = {
  session: {
    id: string;
    orgId: string;
    assessmentId: string;
    learnerId: string;
    status: string;
    submittedAt: string | null;
    scorePct: number | null;
    correctCount: number | null;
    totalCount: number | null;
  };
  assessment: { id: string; title: string; kind: string; bookId: string; unitId: string | null };
  learner: { id: string; fullName: string; grade: number; masteryScore: number } | null;
  book: { id: string; title: string; board: string | null; grade: number; subject: string } | null;
  unit: { id: string; title: string } | null;
  input: AnalysisInput;
};

export async function assembleAnalysisInput(
  supabase: Client,
  sessionId: string,
): Promise<AssembledSession> {
  const { data: session, error: sErr } = await supabase
    .from("assessment_sessions")
    .select(
      "id, org_id, assessment_id, learner_id, status, answers, score_pct, correct_count, total_count, submitted_at",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (sErr) throw new Error(sErr.message);
  if (!session) throw new Error("Session not found or not visible to your organization.");
  if (session.status !== "submitted") {
    throw new Error("Only submitted sessions can be analyzed for gaps.");
  }

  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("id, title, kind, book_id, unit_id")
    .eq("id", session.assessment_id)
    .maybeSingle();
  if (aErr) throw new Error(aErr.message);
  if (!assessment?.book_id) {
    throw new Error("This assessment is not linked to a curriculum book.");
  }

  const [mapRes, outcomesRes, levelsRes, interventionsRes, outcomeMapsRes, learnerRes, bookRes] =
    await Promise.all([
      supabase
        .from("assessment_question_map")
        .select("question_id, points, sort_order")
        .eq("assessment_id", assessment.id)
        .order("sort_order"),
      supabase
        .from("assessment_outcomes")
        .select("id, code, title, bloom_level, difficulty, diagnostic_weight, unit_id, status")
        .eq("book_id", assessment.book_id),
      supabase
        .from("mastery_levels")
        .select("id, label, min_score, max_score, color, sort_order")
        .eq("org_id", session.org_id)
        .order("sort_order"),
      supabase
        .from("intervention_map")
        .select("assessment_outcome_id, failure_pattern, recommended_intervention, priority")
        .eq("book_id", assessment.book_id)
        .order("priority"),
      supabase
        .from("outcome_map")
        .select("assessment_outcome_id, curriculum_outcome_id")
        .eq("book_id", assessment.book_id),
      supabase
        .from("learners")
        .select("id, full_name, grade, mastery_score")
        .eq("id", session.learner_id)
        .maybeSingle(),
      supabase
        .from("books")
        .select("id, title, board, grade, subject")
        .eq("id", assessment.book_id)
        .maybeSingle(),
    ]);
  for (const res of [mapRes, outcomesRes, levelsRes, interventionsRes, outcomeMapsRes]) {
    if (res.error) throw new Error(res.error.message);
  }
  if (learnerRes.error) throw new Error(learnerRes.error.message);
  if (bookRes.error) throw new Error(bookRes.error.message);

  const mapRows = mapRes.data ?? [];
  const questionIds = mapRows.map((m) => m.question_id);
  const { data: questions, error: qErr } =
    questionIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("question_bank")
          .select("id, outcome_id, correct_answer")
          .in("id", questionIds);
  if (qErr) throw new Error(qErr.message);
  const questionById = new Map((questions ?? []).map((q) => [q.id, q]));

  // Curriculum traceability: assessment outcome → learning outcome → topic →
  // chapter → unit.
  const loIds = [...new Set((outcomeMapsRes.data ?? []).map((m) => m.curriculum_outcome_id))];
  const { data: los, error: loErr } =
    loIds.length === 0
      ? { data: [], error: null }
      : await supabase.from("curriculum_outcomes").select("id, topic_id, text").in("id", loIds);
  if (loErr) throw new Error(loErr.message);

  const { data: topics, error: tErr } = await supabase
    .from("curriculum_topics")
    .select("id, chapter_id, title")
    .eq("book_id", assessment.book_id);
  if (tErr) throw new Error(tErr.message);
  const { data: chapters, error: cErr } = await supabase
    .from("curriculum_chapters")
    .select("id, unit_id, title")
    .eq("book_id", assessment.book_id);
  if (cErr) throw new Error(cErr.message);
  const { data: units, error: uErr } = await supabase
    .from("curriculum_units")
    .select("id, title")
    .eq("book_id", assessment.book_id);
  if (uErr) throw new Error(uErr.message);

  const loById = new Map((los ?? []).map((l) => [l.id, l]));
  const topicById = new Map((topics ?? []).map((t) => [t.id, t]));
  const chapterById = new Map((chapters ?? []).map((c) => [c.id, c]));
  const unitById = new Map((units ?? []).map((u) => [u.id, u]));

  const tracesByOutcome: Record<string, TraceLink[]> = {};
  for (const m of outcomeMapsRes.data ?? []) {
    const lo = loById.get(m.curriculum_outcome_id);
    if (!lo) continue;
    const topic = topicById.get(lo.topic_id);
    const chapter = topic ? chapterById.get(topic.chapter_id) : undefined;
    const unit = chapter ? unitById.get(chapter.unit_id) : undefined;
    const list = tracesByOutcome[m.assessment_outcome_id] ?? [];
    list.push({
      learningOutcomeId: lo.id,
      learningOutcomeText: lo.text,
      topicTitle: topic?.title ?? "—",
      chapterTitle: chapter?.title ?? "—",
      unitTitle: unit?.title ?? "—",
    });
    tracesByOutcome[m.assessment_outcome_id] = list;
  }

  const interventionsByOutcome: Record<string, InterventionRef[]> = {};
  for (const im of interventionsRes.data ?? []) {
    const list = interventionsByOutcome[im.assessment_outcome_id] ?? [];
    list.push({
      failurePattern: im.failure_pattern,
      recommendedIntervention: im.recommended_intervention,
      priority: im.priority,
    });
    interventionsByOutcome[im.assessment_outcome_id] = list;
  }

  const answers: Record<string, string> =
    session.answers && typeof session.answers === "object" && !Array.isArray(session.answers)
      ? Object.fromEntries(
          Object.entries(session.answers as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
        )
      : {};

  const unitRow = assessment.unit_id ? (unitById.get(assessment.unit_id) ?? null) : null;

  return {
    session: {
      id: session.id,
      orgId: session.org_id,
      assessmentId: session.assessment_id,
      learnerId: session.learner_id,
      status: session.status,
      submittedAt: session.submitted_at,
      scorePct: session.score_pct,
      correctCount: session.correct_count,
      totalCount: session.total_count,
    },
    assessment: {
      id: assessment.id,
      title: assessment.title,
      kind: assessment.kind,
      bookId: assessment.book_id,
      unitId: assessment.unit_id,
    },
    learner: learnerRes.data
      ? {
          id: learnerRes.data.id,
          fullName: learnerRes.data.full_name,
          grade: learnerRes.data.grade,
          masteryScore: learnerRes.data.mastery_score,
        }
      : null,
    book: bookRes.data
      ? {
          id: bookRes.data.id,
          title: bookRes.data.title,
          board: bookRes.data.board,
          grade: bookRes.data.grade,
          subject: bookRes.data.subject,
        }
      : null,
    unit: unitRow ? { id: unitRow.id, title: unitRow.title } : null,
    input: {
      levels: (levelsRes.data ?? []).map(
        (l): MasteryBandDto => ({
          id: l.id,
          label: l.label,
          minScore: l.min_score,
          maxScore: l.max_score,
          color: l.color,
          sortOrder: l.sort_order,
        }),
      ),
      outcomes: (outcomesRes.data ?? [])
        .filter((o) => assessment.unit_id === null || o.unit_id === assessment.unit_id)
        .map((o) => ({
          id: o.id,
          code: o.code,
          title: o.title,
          bloomLevel: o.bloom_level,
          difficulty: o.difficulty,
          weight: o.diagnostic_weight,
        })),
      questions: mapRows
        .map((m) => {
          const q = questionById.get(m.question_id);
          if (!q) return null;
          return {
            id: q.id,
            outcomeId: q.outcome_id,
            correctAnswer: q.correct_answer,
            points: m.points,
            sortOrder: m.sort_order,
          };
        })
        .filter((q): q is NonNullable<typeof q> => q !== null),
      answers,
      interventionsByOutcome,
      tracesByOutcome,
    },
  };
}

export async function fetchGapAnalysis(supabase: Client, sessionId: string): Promise<GapAnalysis> {
  const a = await assembleAnalysisInput(supabase, sessionId);
  const { rows, counts } = buildOutcomeAnalyses(a.input);
  const totals = scoreQuestions(a.input.questions, a.input.answers);
  const { band } = bandForScore(a.input.levels, totals.scorePct);

  return {
    session: {
      id: a.session.id,
      assessmentTitle: a.assessment.title,
      assessmentKind: a.assessment.kind,
      status: a.session.status,
      submittedAt: a.session.submittedAt,
    },
    learner: a.learner ?? {
      id: a.session.learnerId,
      fullName: "Unknown learner",
      grade: 0,
      masteryScore: 0,
    },
    book: a.book ?? { id: a.assessment.bookId, title: "Unknown book", board: null, grade: 0, subject: "" },
    unit: a.unit,
    levels: a.input.levels,
    rows,
    totals: {
      questions: totals.total,
      correct: totals.correct,
      scorePct: totals.scorePct,
      bandLabel: band?.label ?? null,
      bandColor: band?.color ?? null,
    },
    counts,
    learnerView: buildLearnerView(rows),
  };
}
