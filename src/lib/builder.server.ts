// Sprint 6E: server-only helpers for the curriculum-driven Assessment Builder.
// Every read/write runs through the caller's RLS-scoped client, so org
// isolation and the staff/reviewer split are enforced by database policies.
// Construction only — nothing here assigns, generates questions, or grades.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { QuestionDto, QuestionKind, QuestionStatus } from "./question-bank-shared";
import type {
  AssessmentCoverageDetail,
  AssessmentTemplate,
  BuilderBookDto,
  BuilderOutcomeDto,
  BuilderWorkspace,
  BuiltAssessmentSummaryDto,
} from "./builder-shared";
import { computeCoverage, type buildAssessmentSchema } from "./builder-shared";
import type { z } from "zod";

type Client = SupabaseClient<Database>;
type BuildInput = z.infer<typeof buildAssessmentSchema>;
type Ctx = { orgId: string; userId: string };

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

type QuestionRow = Database["public"]["Tables"]["question_bank"]["Row"];

function mapQuestion(row: QuestionRow): QuestionDto {
  return {
    id: row.id,
    outcomeId: row.outcome_id,
    kind: row.kind as QuestionKind,
    difficulty: row.difficulty,
    prompt: row.prompt,
    options: row.options === null ? null : asStringArray(row.options),
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    status: row.status as QuestionStatus,
    source: row.source as "ai" | "manual",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Book cascade (Board → Grade → Subject → book)
// ---------------------------------------------------------------------------

export async function fetchBuilderBooks(supabase: Client): Promise<BuilderBookDto[]> {
  const { data, error } = await supabase
    .from("books")
    .select("id, title, board, grade, subject, status")
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

// ---------------------------------------------------------------------------
// Builder workspace: units, outcomes with bank stats, built assessments
// ---------------------------------------------------------------------------

export async function fetchBuilderWorkspace(
  supabase: Client,
  bookId: string,
  unitId?: string,
): Promise<BuilderWorkspace> {
  const [bookRes, unitsRes, outcomesRes, questionsRes, mapsRes, builtRes] = await Promise.all([
    supabase.from("books").select("id, title, board, grade, subject, status").eq("id", bookId).maybeSingle(),
    supabase.from("curriculum_units").select("id, title, position").eq("book_id", bookId).order("position"),
    supabase.from("assessment_outcomes").select("*").eq("book_id", bookId).order("code"),
    supabase.from("question_bank").select("*").eq("book_id", bookId).order("created_at", { ascending: true }),
    supabase.from("intervention_map").select("assessment_outcome_id, failure_pattern, recommended_intervention, priority").eq("book_id", bookId),
    supabase
      .from("assessments")
      .select("id, title, kind, status, created_at")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false }),
  ]);

  if (bookRes.error) throw new Error(bookRes.error.message);
  if (!bookRes.data) throw new Error("Book not found in your organization.");
  for (const r of [unitsRes, outcomesRes, questionsRes, mapsRes, builtRes]) {
    if (r.error) throw new Error(r.error.message);
  }

  const units = unitsRes.data ?? [];
  const selectedUnitId = unitId && units.some((u) => u.id === unitId) ? unitId : (units[0]?.id ?? null);

  const questionsByOutcome = new Map<string, QuestionDto[]>();
  for (const q of questionsRes.data ?? []) {
    const list = questionsByOutcome.get(q.outcome_id) ?? [];
    list.push(mapQuestion(q));
    questionsByOutcome.set(q.outcome_id, list);
  }
  const interventionsByOutcome = new Map<string, BuilderOutcomeDto["interventions"]>();
  for (const m of mapsRes.data ?? []) {
    const list = interventionsByOutcome.get(m.assessment_outcome_id) ?? [];
    list.push({
      failurePattern: m.failure_pattern,
      recommendedIntervention: m.recommended_intervention,
      priority: m.priority,
    });
    interventionsByOutcome.set(m.assessment_outcome_id, list);
  }

  const outcomes: BuilderOutcomeDto[] = (outcomesRes.data ?? [])
    .filter((o) => o.unit_id === selectedUnitId)
    .map((o) => {
      const questions = questionsByOutcome.get(o.id) ?? [];
      const byDifficulty: Record<number, number> = {};
      const byKind: Record<string, number> = {};
      for (const q of questions) {
        byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] ?? 0) + 1;
        byKind[q.kind] = (byKind[q.kind] ?? 0) + 1;
      }
      return {
        id: o.id,
        code: o.code,
        title: o.title,
        category: o.category,
        bloomLevel: o.bloom_level,
        difficulty: o.difficulty,
        diagnosticWeight: o.diagnostic_weight,
        questionTypes: asStringArray(o.question_types),
        questions,
        counts: {
          total: questions.length,
          approved: questions.filter((q) => q.status === "approved").length,
          byDifficulty,
          byKind,
        },
        interventions: interventionsByOutcome.get(o.id) ?? [],
      };
    });

  // Built assessments with question counts.
  const builtRows = builtRes.data ?? [];
  const builtIds = builtRows.map((a) => a.id);
  const countByAssessment = new Map<string, number>();
  if (builtIds.length > 0) {
    const { data: mapRows, error: mapError } = await supabase
      .from("assessment_question_map")
      .select("assessment_id")
      .in("assessment_id", builtIds);
    if (mapError) throw new Error(mapError.message);
    for (const row of mapRows ?? []) {
      countByAssessment.set(row.assessment_id, (countByAssessment.get(row.assessment_id) ?? 0) + 1);
    }
  }
  const builtAssessments: BuiltAssessmentSummaryDto[] = builtRows.map((a) => ({
    id: a.id,
    title: a.title,
    template: a.kind as AssessmentTemplate,
    status: a.status,
    questionCount: countByAssessment.get(a.id) ?? 0,
    createdAt: a.created_at,
  }));

  return {
    book: {
      id: bookRes.data.id,
      title: bookRes.data.title,
      board: bookRes.data.board,
      grade: bookRes.data.grade,
      subject: bookRes.data.subject,
      status: bookRes.data.status,
    },
    units,
    selectedUnitId,
    outcomes,
    builtAssessments,
  };
}

// ---------------------------------------------------------------------------
// Build: validate every question against the curriculum chain, then insert
// the assessment + question map. Draft or published — never assigned.
// ---------------------------------------------------------------------------

export async function buildAssessment(
  supabase: Client,
  ctx: Ctx,
  input: BuildInput,
): Promise<{ assessmentId: string }> {
  const [bookRes, unitRes, questionsRes] = await Promise.all([
    supabase.from("books").select("id, title, grade, subject").eq("id", input.bookId).maybeSingle(),
    supabase
      .from("curriculum_units")
      .select("id, title")
      .eq("id", input.unitId)
      .eq("book_id", input.bookId)
      .maybeSingle(),
    supabase.from("question_bank").select("*").in("id", input.questionIds),
  ]);
  if (bookRes.error) throw new Error(bookRes.error.message);
  if (!bookRes.data) throw new Error("Book not found in your organization.");
  if (unitRes.error) throw new Error(unitRes.error.message);
  if (!unitRes.data) throw new Error("Unit not found in this book.");
  if (questionsRes.error) throw new Error(questionsRes.error.message);

  const questions = questionsRes.data ?? [];
  if (questions.length !== input.questionIds.length) {
    throw new Error("Some selected questions were not found in your organization.");
  }
  const wrongBook = questions.filter((q) => q.book_id !== input.bookId);
  if (wrongBook.length > 0) throw new Error("Every question must come from the selected book's bank.");
  const notApproved = questions.filter((q) => q.status !== "approved");
  if (notApproved.length > 0) {
    throw new Error(
      `Only approved questions can be built into an assessment — ${notApproved.length} selected question(s) are still drafts.`,
    );
  }

  // Outcome alignment: every question's outcome must belong to the chosen unit.
  const outcomeIds = [...new Set(questions.map((q) => q.outcome_id))];
  const { data: outcomeRows, error: outcomeError } = await supabase
    .from("assessment_outcomes")
    .select("id, unit_id")
    .in("id", outcomeIds);
  if (outcomeError) throw new Error(outcomeError.message);
  const offUnit = (outcomeRows ?? []).filter((o) => o.unit_id !== input.unitId);
  if ((outcomeRows ?? []).length !== outcomeIds.length || offUnit.length > 0) {
    throw new Error("Every question's outcome must belong to the selected unit.");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("assessments")
    .insert({
      org_id: ctx.orgId,
      created_by: ctx.userId,
      title: input.title,
      description: input.description ?? null,
      subject: bookRes.data.subject,
      topic: unitRes.data.title,
      grade: bookRes.data.grade,
      kind: input.template,
      status: input.publishNow ? "published" : "draft",
      time_limit_minutes: input.timeLimitMinutes ?? null,
      book_id: input.bookId,
      unit_id: input.unitId,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const orderById = new Map(input.questionIds.map((id, i) => [id, i + 1]));
  const mapRows = questions.map((q) => ({
    assessment_id: inserted.id,
    question_id: q.id,
    sort_order: orderById.get(q.id)!,
    points: 1,
  }));
  const { error: mapError } = await supabase.from("assessment_question_map").insert(mapRows);
  if (mapError) {
    // Roll back the header so a failed build leaves no half-built assessment.
    await supabase.from("assessments").delete().eq("id", inserted.id);
    throw new Error(mapError.message);
  }

  await supabase.from("book_events").insert({
    org_id: ctx.orgId,
    book_id: input.bookId,
    actor_id: ctx.userId,
    event: "assessment_built",
    detail: {
      assessmentId: inserted.id,
      title: input.title,
      template: input.template,
      unitId: input.unitId,
      questions: questions.length,
      outcomes: outcomeIds.length,
      status: input.publishNow ? "published" : "draft",
    },
  });

  return { assessmentId: inserted.id };
}

// ---------------------------------------------------------------------------
// Coverage view for a built assessment (+ gap coverage preview)
// ---------------------------------------------------------------------------

export async function fetchAssessmentCoverage(
  supabase: Client,
  assessmentId: string,
): Promise<AssessmentCoverageDetail> {
  const { data: assessment, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", assessmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!assessment) throw new Error("Assessment not found in your organization.");
  if (!assessment.book_id || !assessment.unit_id) {
    throw new Error("This assessment was not built from the curriculum builder.");
  }

  const [mapRes, unitOutcomesRes] = await Promise.all([
    supabase
      .from("assessment_question_map")
      .select("question_id, sort_order, points")
      .eq("assessment_id", assessmentId)
      .order("sort_order"),
    supabase
      .from("assessment_outcomes")
      .select("id, code, title, diagnostic_weight")
      .eq("unit_id", assessment.unit_id)
      .order("code"),
  ]);
  if (mapRes.error) throw new Error(mapRes.error.message);
  if (unitOutcomesRes.error) throw new Error(unitOutcomesRes.error.message);

  const mapRows = mapRes.data ?? [];
  const questionIds = mapRows.map((m) => m.question_id);
  const { data: questionRows, error: qError } = await supabase
    .from("question_bank")
    .select("id, outcome_id, kind, difficulty, prompt")
    .in("id", questionIds.length > 0 ? questionIds : ["00000000-0000-0000-0000-000000000000"]);
  if (qError) throw new Error(qError.message);

  const outcomeById = new Map((unitOutcomesRes.data ?? []).map((o) => [o.id, o]));
  const questionById = new Map((questionRows ?? []).map((q) => [q.id, q]));

  const questions = mapRows.flatMap((m) => {
    const q = questionById.get(m.question_id);
    if (!q) return [];
    return [
      {
        id: q.id,
        sortOrder: m.sort_order,
        points: m.points,
        outcomeCode: outcomeById.get(q.outcome_id)?.code ?? "(outcome removed)",
        kind: q.kind,
        difficulty: q.difficulty,
        prompt: q.prompt,
      },
    ];
  });

  const coverage = computeCoverage(
    mapRows.flatMap((m) => {
      const q = questionById.get(m.question_id);
      return q ? [{ outcomeId: q.outcome_id, difficulty: q.difficulty }] : [];
    }),
    (unitOutcomesRes.data ?? []).map((o) => ({ id: o.id, diagnosticWeight: o.diagnostic_weight })),
  );

  const measuredOutcomeIds = [
    ...new Set((questionRows ?? []).map((q) => q.outcome_id)),
  ];
  const { data: interventions, error: iError } = await supabase
    .from("intervention_map")
    .select("assessment_outcome_id, failure_pattern, recommended_intervention, priority")
    .in(
      "assessment_outcome_id",
      measuredOutcomeIds.length > 0 ? measuredOutcomeIds : ["00000000-0000-0000-0000-000000000000"],
    )
    .order("priority");
  if (iError) throw new Error(iError.message);

  const gaps = (interventions ?? []).map((m) => {
    const o = outcomeById.get(m.assessment_outcome_id);
    return {
      outcomeCode: o?.code ?? "(outcome removed)",
      outcomeTitle: o?.title ?? "",
      failurePattern: m.failure_pattern,
      recommendedIntervention: m.recommended_intervention,
      priority: m.priority,
    };
  });

  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      template: assessment.kind as AssessmentTemplate,
      status: assessment.status,
      grade: assessment.grade,
      subject: assessment.subject,
      topic: assessment.topic,
      timeLimitMinutes: assessment.time_limit_minutes,
      createdAt: assessment.created_at,
    },
    questions,
    coverage,
    gaps,
  };
}
