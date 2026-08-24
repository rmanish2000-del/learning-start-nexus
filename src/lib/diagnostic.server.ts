// Sprint 6F: server-only helpers for the Curriculum-Driven Diagnostic Engine.
// Every read/write runs through the caller's RLS-scoped client, so org
// isolation and the staff/reviewer split are enforced by database policies.
// Generation only — nothing here assigns, creates interventions, or touches
// mastery.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { DiagnosticWorkspace, EngineOutcome, generateDiagnosticSchema } from "./diagnostic-shared";
import { buildDiagnosticPlan } from "./diagnostic-shared";
import type { z } from "zod";

type Client = SupabaseClient<Database>;
type GenerateInput = z.infer<typeof generateDiagnosticSchema>;
type Ctx = { orgId: string; userId: string };

const NO_ROWS = ["00000000-0000-4000-8000-000000000000"];

// ---------------------------------------------------------------------------
// Workspace: book, units, active outcomes with approved questions, usage,
// baseline diagnostics, and previously generated assessments.
// ---------------------------------------------------------------------------

export async function fetchDiagnosticWorkspace(
  supabase: Client,
  bookId: string,
  unitId?: string,
): Promise<DiagnosticWorkspace> {
  const [bookRes, unitsRes, outcomesRes, questionsRes, assessmentsRes] = await Promise.all([
    supabase.from("books").select("id, title, board, grade, subject, status").eq("id", bookId).maybeSingle(),
    supabase.from("curriculum_units").select("id, title, position").eq("book_id", bookId).order("position"),
    supabase
      .from("assessment_outcomes")
      .select("id, unit_id, code, title, category, bloom_level, difficulty, diagnostic_weight, status")
      .eq("book_id", bookId)
      .order("code"),
    supabase
      .from("question_bank")
      .select("id, outcome_id, kind, difficulty, prompt")
      .eq("book_id", bookId)
      .eq("status", "approved"),
    supabase
      .from("assessments")
      .select("id, title, kind, status, unit_id, created_at")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false }),
  ]);

  if (bookRes.error) throw new Error(bookRes.error.message);
  if (!bookRes.data) throw new Error("Book not found in your organization.");
  for (const r of [unitsRes, outcomesRes, questionsRes, assessmentsRes]) {
    if (r.error) throw new Error(r.error.message);
  }

  const units = unitsRes.data ?? [];
  const selectedUnitId = unitId && units.some((u) => u.id === unitId) ? unitId : (units[0]?.id ?? null);

  const assessments = assessmentsRes.data ?? [];
  const assessmentIds = assessments.map((a) => a.id);
  const { data: mapRows, error: mapError } = await supabase
    .from("assessment_question_map")
    .select("assessment_id, question_id")
    .in("assessment_id", assessmentIds.length > 0 ? assessmentIds : NO_ROWS);
  if (mapError) throw new Error(mapError.message);

  const questionIdsByAssessment = new Map<string, string[]>();
  const usedQuestionIds = new Set<string>();
  const countByAssessment = new Map<string, number>();
  for (const m of mapRows ?? []) {
    usedQuestionIds.add(m.question_id);
    countByAssessment.set(m.assessment_id, (countByAssessment.get(m.assessment_id) ?? 0) + 1);
    const list = questionIdsByAssessment.get(m.assessment_id) ?? [];
    list.push(m.question_id);
    questionIdsByAssessment.set(m.assessment_id, list);
  }

  const approvedByOutcome = new Map<string, EngineOutcome["questions"]>();
  for (const q of questionsRes.data ?? []) {
    const list = approvedByOutcome.get(q.outcome_id) ?? [];
    list.push({ id: q.id, kind: q.kind, difficulty: q.difficulty, prompt: q.prompt });
    approvedByOutcome.set(q.outcome_id, list);
  }

  const outcomes: EngineOutcome[] = (outcomesRes.data ?? [])
    .filter((o) => o.unit_id === selectedUnitId && o.status === "active")
    .map((o) => ({
      id: o.id,
      code: o.code,
      title: o.title,
      category: o.category,
      bloomLevel: o.bloom_level,
      difficulty: o.difficulty,
      diagnosticWeight: o.diagnostic_weight,
      status: o.status,
      questions: approvedByOutcome.get(o.id) ?? [],
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
    usedQuestionIds: [...usedQuestionIds],
    diagnostics: assessments
      .filter((a) => a.kind === "diagnostic")
      .map((a) => ({
        id: a.id,
        title: a.title,
        unitId: a.unit_id,
        questionIds: questionIdsByAssessment.get(a.id) ?? [],
      })),
    generated: assessments
      .filter((a) => a.kind === "diagnostic" || a.kind === "reassessment")
      .map((a) => ({
        id: a.id,
        title: a.title,
        kind: a.kind,
        status: a.status,
        questionCount: countByAssessment.get(a.id) ?? 0,
        createdAt: a.created_at,
      })),
  };
}

// ---------------------------------------------------------------------------
// Generate: recompute the plan server-side from live blueprint weights and
// the approved bank, then persist assessment + map + book event. Never
// trusts client-computed question lists.
// ---------------------------------------------------------------------------

export async function generateDiagnostic(
  supabase: Client,
  ctx: Ctx,
  input: GenerateInput,
): Promise<{ assessmentId: string; questionCount: number }> {
  const [bookRes, unitRes, outcomesRes, questionsRes] = await Promise.all([
    supabase.from("books").select("id, title, grade, subject").eq("id", input.bookId).maybeSingle(),
    supabase
      .from("curriculum_units")
      .select("id, title")
      .eq("id", input.unitId)
      .eq("book_id", input.bookId)
      .maybeSingle(),
    supabase
      .from("assessment_outcomes")
      .select("id, code, title, category, bloom_level, difficulty, diagnostic_weight, status")
      .eq("book_id", input.bookId)
      .eq("unit_id", input.unitId)
      .eq("status", "active")
      .order("code"),
    supabase
      .from("question_bank")
      .select("id, outcome_id, kind, difficulty, prompt")
      .eq("book_id", input.bookId)
      .eq("status", "approved"),
  ]);
  if (bookRes.error) throw new Error(bookRes.error.message);
  if (!bookRes.data) throw new Error("Book not found in your organization.");
  if (unitRes.error) throw new Error(unitRes.error.message);
  if (!unitRes.data) throw new Error("Unit not found in this book.");
  if (outcomesRes.error) throw new Error(outcomesRes.error.message);
  if (questionsRes.error) throw new Error(questionsRes.error.message);

  // Usage across the book's assessments (+ baseline exclusion for re-tests).
  const { data: bookAssessments, error: aError } = await supabase
    .from("assessments")
    .select("id, kind, book_id, unit_id")
    .eq("book_id", input.bookId);
  if (aError) throw new Error(aError.message);
  const bookAssessmentIds = (bookAssessments ?? []).map((a) => a.id);
  const { data: mapRows, error: mError } = await supabase
    .from("assessment_question_map")
    .select("assessment_id, question_id")
    .in("assessment_id", bookAssessmentIds.length > 0 ? bookAssessmentIds : NO_ROWS);
  if (mError) throw new Error(mError.message);

  const usedQuestionIds = new Set((mapRows ?? []).map((m) => m.question_id));
  const excludeQuestionIds = new Set<string>();
  if (input.template === "reassessment") {
    if (!input.baselineAssessmentId) {
      throw new Error("Pick a baseline diagnostic to reassess against.");
    }
    const baseline = (bookAssessments ?? []).find((a) => a.id === input.baselineAssessmentId);
    if (!baseline || baseline.kind !== "diagnostic") {
      throw new Error("Baseline must be a diagnostic built from this book.");
    }
    if (baseline.unit_id !== input.unitId) {
      throw new Error("Baseline diagnostic must belong to the selected unit.");
    }
    for (const m of mapRows ?? []) {
      if (m.assessment_id === input.baselineAssessmentId) excludeQuestionIds.add(m.question_id);
    }
  }

  const approvedByOutcome = new Map<string, EngineOutcome["questions"]>();
  for (const q of questionsRes.data ?? []) {
    const list = approvedByOutcome.get(q.outcome_id) ?? [];
    list.push({ id: q.id, kind: q.kind, difficulty: q.difficulty, prompt: q.prompt });
    approvedByOutcome.set(q.outcome_id, list);
  }

  const outcomes: EngineOutcome[] = (outcomesRes.data ?? []).map((o) => ({
    id: o.id,
    code: o.code,
    title: o.title,
    category: o.category,
    bloomLevel: o.bloom_level,
    difficulty: o.difficulty,
    diagnosticWeight: o.diagnostic_weight,
    status: o.status,
    questions: approvedByOutcome.get(o.id) ?? [],
  }));

  const plan = buildDiagnosticPlan({
    template: input.template,
    outcomes,
    totalQuestions: input.totalQuestions,
    excludeQuestionIds,
    usedQuestionIds,
  });

  if (plan.plannedQuestionIds.length === 0) {
    throw new Error(
      "No approved questions available for this unit's outcomes — approve questions in the Question Bank first.",
    );
  }

  const defaultTitle = `${unitRes.data.title} — Unit ${input.template === "diagnostic" ? "Diagnostic" : "Reassessment"} (Auto)`;
  const weightSummary = plan.outcomes.map((p) => `${p.code}:${p.weight}%→${p.actualQuestions}q`).join(", ");

  const { data: inserted, error: insertError } = await supabase
    .from("assessments")
    .insert({
      org_id: ctx.orgId,
      created_by: ctx.userId,
      title: input.title ?? defaultTitle,
      description: `Generated by the Diagnostic Engine. Weight allocation: ${weightSummary}. Reused questions: ${plan.reusedCount}.`,
      subject: bookRes.data.subject,
      topic: unitRes.data.title,
      grade: bookRes.data.grade,
      kind: input.template,
      status: input.publishNow ? "published" : "draft",
      book_id: input.bookId,
      unit_id: input.unitId,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const orderById = new Map(plan.plannedQuestionIds.map((id, i) => [id, i + 1]));
  const rows = plan.plannedQuestionIds.map((id) => ({
    assessment_id: inserted.id,
    question_id: id,
    sort_order: orderById.get(id)!,
    points: 1,
  }));
  const { error: mapInsertError } = await supabase.from("assessment_question_map").insert(rows);
  if (mapInsertError) {
    await supabase.from("assessments").delete().eq("id", inserted.id);
    throw new Error(mapInsertError.message);
  }

  await supabase.from("book_events").insert({
    org_id: ctx.orgId,
    book_id: input.bookId,
    actor_id: ctx.userId,
    event: "diagnostic_generated",
    detail: {
      assessmentId: inserted.id,
      unitId: input.unitId,
      engine: "sprint-6f",
      template: input.template,
      baselineAssessmentId: input.baselineAssessmentId ?? null,
      totalQuestions: input.totalQuestions,
      plannedQuestions: plan.plannedQuestionIds.length,
      allocation: Object.fromEntries(plan.outcomes.map((p) => [p.code, p.actualQuestions])),
      weights: Object.fromEntries(plan.outcomes.map((p) => [p.code, p.weight])),
      reusedQuestions: plan.reusedCount,
      uncoveredOutcomes: plan.uncovered.map((u) => u.code),
      method: "largest_remainder",
    },
  });

  return { assessmentId: inserted.id, questionCount: plan.plannedQuestionIds.length };
}
