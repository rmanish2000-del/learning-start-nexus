// Sprint 6C: server-only helpers for the Assessment Blueprint Engine.
// Every read/write runs through the caller's RLS-scoped client, so org
// isolation and the staff/reviewer role split are enforced by database
// policies, not app code.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  levelForScore,
  projectMastery,
  type AssessmentOutcomeDto,
  type BlueprintUnitDto,
  type BlueprintWorkspace,
  type InterventionMappingDto,
  type LearnerOption,
  type MasteryLevelDto,
  type MasteryPreview,
  type OutcomeMappingDto,
  type ProjectionRow,
} from "./blueprint-shared";

type Client = SupabaseClient<Database>;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

// ---------------------------------------------------------------------------
// Blueprint workspace: units → assessment outcomes → mappings + interventions
// ---------------------------------------------------------------------------

export async function fetchBlueprintWorkspace(
  supabase: Client,
  bookId: string,
): Promise<BlueprintWorkspace> {
  const [bookRes, unitsRes, outcomesRes, mapsRes, interventionsRes, loRes, topicsRes, chaptersRes] =
    await Promise.all([
      supabase.from("books").select("id, title, board, grade, subject, status").eq("id", bookId).maybeSingle(),
      supabase.from("curriculum_units").select("id, title, position").eq("book_id", bookId).order("position"),
      supabase.from("assessment_outcomes").select("*").eq("book_id", bookId).order("code"),
      supabase.from("outcome_map").select("*").eq("book_id", bookId),
      supabase
        .from("intervention_map")
        .select("*")
        .eq("book_id", bookId)
        .order("priority"),
      supabase
        .from("curriculum_outcomes")
        .select("id, topic_id, text, status")
        .eq("book_id", bookId),
      supabase.from("curriculum_topics").select("id, chapter_id, title").eq("book_id", bookId),
      supabase.from("curriculum_chapters").select("id, title").eq("book_id", bookId),
    ]);

  if (bookRes.error) throw new Error(bookRes.error.message);
  if (!bookRes.data) throw new Error("Book not found in your organization.");
  for (const r of [unitsRes, outcomesRes, mapsRes, interventionsRes, loRes, topicsRes, chaptersRes]) {
    if (r.error) throw new Error(r.error.message);
  }

  const loById = new Map((loRes.data ?? []).map((o) => [o.id, o]));
  const topicById = new Map((topicsRes.data ?? []).map((t) => [t.id, t]));
  const chapterById = new Map((chaptersRes.data ?? []).map((c) => [c.id, c]));

  const mappingsByOutcome = new Map<string, OutcomeMappingDto[]>();
  for (const m of mapsRes.data ?? []) {
    const lo = loById.get(m.curriculum_outcome_id);
    const topic = lo ? topicById.get(lo.topic_id) : undefined;
    const chapter = topic ? chapterById.get(topic.chapter_id) : undefined;
    const list = mappingsByOutcome.get(m.assessment_outcome_id) ?? [];
    list.push({
      id: m.id,
      curriculumOutcomeId: m.curriculum_outcome_id,
      learningOutcomeText: lo?.text ?? "(learning outcome removed)",
      learningOutcomeStatus: lo?.status ?? "unknown",
      topicId: lo?.topic_id ?? "",
      topicTitle: topic?.title ?? "—",
      chapterTitle: chapter?.title ?? "—",
    });
    mappingsByOutcome.set(m.assessment_outcome_id, list);
  }

  const interventionsByOutcome = new Map<string, InterventionMappingDto[]>();
  for (const im of interventionsRes.data ?? []) {
    const list = interventionsByOutcome.get(im.assessment_outcome_id) ?? [];
    list.push({
      id: im.id,
      failurePattern: im.failure_pattern,
      recommendedIntervention: im.recommended_intervention,
      priority: im.priority,
    });
    interventionsByOutcome.set(im.assessment_outcome_id, list);
  }

  const outcomesByUnit = new Map<string, AssessmentOutcomeDto[]>();
  for (const o of outcomesRes.data ?? []) {
    const dto: AssessmentOutcomeDto = {
      id: o.id,
      code: o.code,
      title: o.title,
      category: o.category,
      bloomLevel: o.bloom_level,
      difficulty: o.difficulty,
      diagnosticWeight: o.diagnostic_weight,
      questionTypes: asStringArray(o.question_types),
      interventionStrategy: o.intervention_strategy,
      status: o.status,
      mappings: mappingsByOutcome.get(o.id) ?? [],
      interventions: interventionsByOutcome.get(o.id) ?? [],
    };
    const list = outcomesByUnit.get(o.unit_id) ?? [];
    list.push(dto);
    outcomesByUnit.set(o.unit_id, list);
  }

  const units: BlueprintUnitDto[] = (unitsRes.data ?? []).map((u) => {
    const outcomes = outcomesByUnit.get(u.id) ?? [];
    return {
      id: u.id,
      title: u.title,
      position: u.position,
      weightSum: outcomes.reduce((sum, o) => sum + o.diagnosticWeight, 0),
      outcomes,
    };
  });

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
    totals: {
      units: units.length,
      outcomes: outcomesRes.data?.length ?? 0,
      mappings: mapsRes.data?.length ?? 0,
      interventions: interventionsRes.data?.length ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Mastery framework (org-configurable bands; admin-only writes via RLS)
// ---------------------------------------------------------------------------

export async function fetchMasteryLevels(supabase: Client): Promise<MasteryLevelDto[]> {
  const { data, error } = await supabase
    .from("mastery_levels")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({
    id: l.id,
    label: l.label,
    minScore: l.min_score,
    maxScore: l.max_score,
    color: l.color,
    sortOrder: l.sort_order,
  }));
}

export async function updateMasteryLevel(
  supabase: Client,
  input: { levelId: string; minScore: number; maxScore: number },
): Promise<void> {
  const { error } = await supabase
    .from("mastery_levels")
    .update({ min_score: input.minScore, max_score: input.maxScore })
    .eq("id", input.levelId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Mastery preview (projection only — no reassignment, no writes)
// ---------------------------------------------------------------------------

export async function fetchLearnerOptions(supabase: Client): Promise<LearnerOption[]> {
  const { data, error } = await supabase
    .from("learners")
    .select("id, full_name, grade, subject, mastery_score")
    .neq("status", "paused")
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({
    id: l.id,
    fullName: l.full_name,
    grade: l.grade,
    subject: l.subject,
    masteryScore: l.mastery_score,
  }));
}

export async function fetchMasteryPreview(
  supabase: Client,
  input: { bookId: string; learnerId: string },
): Promise<MasteryPreview> {
  const [workspace, levels, learnerRes] = await Promise.all([
    fetchBlueprintWorkspace(supabase, input.bookId),
    fetchMasteryLevels(supabase),
    supabase
      .from("learners")
      .select("id, full_name, grade, subject, mastery_score")
      .eq("id", input.learnerId)
      .maybeSingle(),
  ]);
  if (learnerRes.error) throw new Error(learnerRes.error.message);
  if (!learnerRes.data) throw new Error("Learner not found in your organization.");

  const learner: LearnerOption = {
    id: learnerRes.data.id,
    fullName: learnerRes.data.full_name,
    grade: learnerRes.data.grade,
    subject: learnerRes.data.subject,
    masteryScore: learnerRes.data.mastery_score,
  };

  // Evidence: the learner's most recent scored record in the book's subject.
  // Book-level evidence applies to every mapped outcome of the book.
  const { data: evidenceRows } = await supabase
    .from("learner_assessments")
    .select("title, score, taken_on")
    .eq("learner_id", learner.id)
    .eq("subject", workspace.book.subject)
    .not("score", "is", null)
    .order("taken_on", { ascending: false })
    .limit(1);
  const evidence = evidenceRows?.[0] ?? null;
  const evidenceScore = evidence?.score ?? null;

  const flat = workspace.units.flatMap((u) =>
    u.outcomes.map((o) => ({ unitTitle: u.title, outcome: o })),
  );
  const projection = projectMastery(
    flat.map(({ outcome }) => ({
      outcomeId: outcome.id,
      weight: outcome.diagnosticWeight,
      evidenceScore,
    })),
    learner.masteryScore,
  );

  const rows: ProjectionRow[] = flat.map(({ unitTitle, outcome }) => {
    const projectedScore = projection.perOutcome.get(outcome.id) ?? learner.masteryScore;
    return {
      outcomeId: outcome.id,
      code: outcome.code,
      title: outcome.title,
      unitTitle,
      weight: outcome.diagnosticWeight,
      evidenceScore,
      projectedScore,
      projectedLevel: levelForScore(levels, projectedScore)?.label ?? "—",
    };
  });

  return {
    learner,
    bookSubject: workspace.book.subject,
    priorMastery: learner.masteryScore,
    evidenceScore,
    evidenceLabel: evidence ? `${evidence.title} (${evidence.taken_on ?? "date n/a"})` : null,
    rows,
    overall: projection.overall,
    overallLevel: levelForScore(levels, projection.overall),
    basis: projection.basis,
  };
}
