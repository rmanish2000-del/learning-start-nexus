// Sprint 6D: server-only helpers for the Question Bank Engine. Every
// read/write runs through the caller's RLS-scoped client, so org isolation
// and the staff/reviewer role split are enforced by database policies, not
// app code. AI generation writes DRAFT questions only — no assessments are
// assembled automatically in this sprint.

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type {
  BatchGenerationReport,
  BatchOutcomeResult,
  OutcomeBankDto,
  QuestionBankUnitDto,
  QuestionBankWorkspace,
  QuestionDto,
  QuestionKind,
  QuestionStatus,
} from "./question-bank-shared";
import {
  ASSERTION_REASON_OPTIONS,
  CBSE_KIND_RULES,
  isOptionKind,
  requiresStimulus,
  type CbseKind,
} from "./pilot-evidence-shared";

type Client = SupabaseClient<Database>;

export const QUESTION_MODEL = "google/gemini-3.7-flash";

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
    stimulus: row.stimulus,
    verificationState: (row.verification_state ?? "unverified") as
      | "unverified"
      | "verified"
      | "rejected",
    verifiedAt: row.verified_at,
    verificationNote: row.verification_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Workspace: units → outcomes → questions, with coverage counts
// ---------------------------------------------------------------------------

export async function fetchQuestionBankWorkspace(
  supabase: Client,
  bookId: string,
): Promise<QuestionBankWorkspace> {
  const [bookRes, unitsRes, outcomesRes, questionsRes] = await Promise.all([
    supabase.from("books").select("id, title, board, grade, subject, status").eq("id", bookId).maybeSingle(),
    supabase.from("curriculum_units").select("id, title, position").eq("book_id", bookId).order("position"),
    supabase.from("assessment_outcomes").select("*").eq("book_id", bookId).order("code"),
    supabase
      .from("question_bank")
      .select("*")
      .eq("book_id", bookId)
      .order("created_at", { ascending: true }),
  ]);

  if (bookRes.error) throw new Error(bookRes.error.message);
  if (!bookRes.data) throw new Error("Book not found in your organization.");
  for (const r of [unitsRes, outcomesRes, questionsRes]) {
    if (r.error) throw new Error(r.error.message);
  }

  const questionsByOutcome = new Map<string, QuestionDto[]>();
  for (const q of questionsRes.data ?? []) {
    const list = questionsByOutcome.get(q.outcome_id) ?? [];
    list.push(mapQuestion(q));
    questionsByOutcome.set(q.outcome_id, list);
  }

  const outcomesByUnit = new Map<string, OutcomeBankDto[]>();
  for (const o of outcomesRes.data ?? []) {
    const questions = questionsByOutcome.get(o.id) ?? [];
    const byDifficulty: Record<number, number> = {};
    for (const q of questions) {
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] ?? 0) + 1;
    }
    const dto: OutcomeBankDto = {
      id: o.id,
      code: o.code,
      title: o.title,
      bloomLevel: o.bloom_level,
      difficulty: o.difficulty,
      diagnosticWeight: o.diagnostic_weight,
      questionTypes: asStringArray(o.question_types),
      questions,
      counts: {
        total: questions.length,
        approved: questions.filter((q) => q.status === "approved").length,
        draft: questions.filter((q) => q.status === "draft").length,
        byDifficulty,
      },
    };
    const list = outcomesByUnit.get(o.unit_id) ?? [];
    list.push(dto);
    outcomesByUnit.set(o.unit_id, list);
  }

  const units: QuestionBankUnitDto[] = (unitsRes.data ?? []).map((u) => ({
    id: u.id,
    title: u.title,
    position: u.position,
    outcomes: outcomesByUnit.get(u.id) ?? [],
  }));

  const allQuestions = questionsRes.data ?? [];
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
      outcomes: outcomesRes.data?.length ?? 0,
      outcomesWithQuestions: (outcomesRes.data ?? []).filter(
        (o) => (questionsByOutcome.get(o.id) ?? []).length > 0,
      ).length,
      questions: allQuestions.length,
      approved: allQuestions.filter((q) => q.status === "approved").length,
    },
  };
}

// ---------------------------------------------------------------------------
// AI generation: outcome → draft questions (answer key + explanation always)
// ---------------------------------------------------------------------------

const generatedQuestionSchema = z.object({
  kind: z.enum([
    "mcq",
    "true_false",
    "fill_blank",
    "short_answer",
    "case_study",
    "assertion_reason",
    "data_interpretation",
    "applied_mcq",
  ]),
  stimulus: z.string().max(1500).nullable().optional(),
  difficulty: z.number().int().min(1).max(5),
  prompt: z.string().min(5).max(500),
  options: z.array(z.string().min(1).max(200)).max(8).nullable(),
  correct_answer: z.string().min(1).max(600),
  explanation: z.string().min(5).max(800),
});

const generationResultSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1).max(6),
});

type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI response contained no JSON object.");
  return JSON.parse(raw.slice(start, end + 1));
}

async function callQuestionAi(
  system: string,
  prompt: string,
): Promise<{ questions: GeneratedQuestion[]; latencyMs: number }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this workspace (missing API key).");
  const started = Date.now();
  const gateway = createLovableAiGatewayProvider(apiKey);
  try {
    const { object } = await generateObject({
      model: gateway(QUESTION_MODEL),
      schema: generationResultSchema,
      system,
      prompt,
    });
    return { questions: object.questions, latencyMs: Date.now() - started };
  } catch {
    // Some gateway models do not support structured outputs; fall back to a
    // plain text completion and parse/validate the JSON ourselves.
    const { text } = await generateText({
      model: gateway(QUESTION_MODEL),
      system: `${system}\n\nRespond with JSON only, shaped as {"questions":[{"kind":"...","stimulus":null,"difficulty":1,"prompt":"...","options":["..."]|null,"correct_answer":"...","explanation":"..."}]}. No prose, no markdown fences.`,
      prompt,
    });
    const parsed = generationResultSchema.parse(extractJson(text));
    return { questions: parsed.questions, latencyMs: Date.now() - started };
  }
}


// Zod dumps its raw issue JSON into `message`; turn that into one readable
// sentence so batch reports stay legible.
function describeGenerationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return issue
      ? `the AI returned an invalid question (${issue.path.join(".") || "response"}: ${issue.message})`
      : "the AI returned an invalid question";
  }
  const message = error instanceof Error ? error.message : "unknown AI error";
  if (message.trimStart().startsWith("[") || message.trimStart().startsWith("{")) {
    return "the AI returned a question that failed validation";
  }
  return message;
}

export async function generateQuestions(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: { outcomeId: string; count: number; style?: CbseKind | "auto" | undefined },
): Promise<{ inserted: number; aiUsed: boolean; latencyMs: number | null }> {
  // Load the outcome + book through the caller's RLS client — a cross-org or
  // non-staff caller simply sees nothing here.
  const { data: outcome, error: outcomeError } = await supabase
    .from("assessment_outcomes")
    .select("*")
    .eq("id", input.outcomeId)
    .maybeSingle();
  if (outcomeError) throw new Error(outcomeError.message);
  if (!outcome) throw new Error("Outcome not found in your organization.");

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, grade, subject")
    .eq("id", outcome.book_id)
    .maybeSingle();
  if (bookError) throw new Error(bookError.message);
  if (!book) throw new Error("Book not found in your organization.");

  // Curriculum context: the learning outcomes mapped to this outcome.
  const { data: maps } = await supabase
    .from("outcome_map")
    .select("curriculum_outcome_id")
    .eq("assessment_outcome_id", outcome.id);
  const loIds = (maps ?? []).map((m) => m.curriculum_outcome_id);
  let loTexts: string[] = [];
  if (loIds.length > 0) {
    const { data: los } = await supabase
      .from("curriculum_outcomes")
      .select("text")
      .in("id", loIds);
    loTexts = (los ?? []).map((l) => l.text);
  }

  const questionTypes = asStringArray(outcome.question_types);
  const baseKinds = [
    "mcq",
    "true_false",
    "fill_blank",
    "short_answer",
    "case_study",
    "assertion_reason",
    "data_interpretation",
    "applied_mcq",
  ];
  const allowedKinds = questionTypes.filter((t) => baseKinds.includes(t));
  const style = input.style && input.style !== "auto" ? input.style : null;
  const kindInstruction = style
    ? `Every question must be of kind "${style}". ${CBSE_KIND_RULES[style]}`
    : allowedKinds.length > 0
      ? `Use only these question kinds: ${allowedKinds.join(", ")}.`
      : `Use only these question kinds: ${baseKinds.join(", ")}.`;

  const system = [
    `You write assessment questions for a Grade ${book.grade} ${book.subject} book ("${book.title}").`,
    "Every question must test exactly the given assessment outcome — nothing else.",
    kindInstruction,
    "Rules:",
    "- Age-appropriate language for the grade. Short, unambiguous prompts.",
    "- MCQ: exactly 4 options, exactly one correct; the answer key must match one option verbatim.",
    "- true_false: options are exactly [\"True\", \"False\"] and the answer key is \"True\" or \"False\".",
    "- fill_blank: the prompt contains exactly one blank shown as ______; the answer key is the missing word or short phrase.",
    "- short_answer: the answer key is a model answer or an 'Any one of:' list an educator can mark against.",
    "- Every question needs an explanation: 1–2 sentences teaching why the answer key is correct.",
    "- Difficulty 1–5: 1 recall of a single fact, 5 multi-step reasoning. Spread difficulties across the set.",
    // M7: CBSE competency-based types.
    `- case_study: put a 2–4 sentence real-life passage in "stimulus"; the prompt asks something answerable only from that passage; 4 options, one correct.`,
    `- assertion_reason: "stimulus" contains exactly two lines — "Assertion (A): ..." and "Reason (R): ..."; the options MUST be exactly ${JSON.stringify(ASSERTION_REASON_OPTIONS)} and the answer key must match one of them verbatim.`,
    `- data_interpretation: "stimulus" contains a small plain-text table or list of values; the prompt requires reading or computing from that data; 4 options, one correct.`,
    "- applied_mcq: an unfamiliar real-life situation inside the prompt; 4 options, one correct; tests application, not recall.",
    "- stimulus must be null for mcq, true_false, fill_blank and short_answer.",
  ].join("\n");

  const prompt = [
    `Assessment outcome ${outcome.code}: "${outcome.title}".`,
    `Bloom level: ${outcome.bloom_level}. Target difficulty: ${outcome.difficulty} of 5.`,
    loTexts.length > 0
      ? `Mapped learning outcomes:\n${loTexts.map((t) => `- ${t}`).join("\n")}`
      : "No mapped learning outcomes; rely on the outcome title.",
    `Write ${input.count} new questions for this outcome.`,
  ].join("\n");

  let questions: GeneratedQuestion[];
  let latencyMs: number;
  try {
    const result = await callQuestionAi(system, prompt);
    questions = result.questions;
    latencyMs = result.latencyMs;
  } catch (error) {
    // Surface the gateway failure verbatim — never silently fall back to
    // made-up questions.
    throw new Error(`Question generation failed: ${describeGenerationError(error)}`);
  }

  // Validate + normalize before insert. MCQ answer keys must match an option.
  const cleaned = questions.map((q) => {
    const options =
      q.kind === "true_false"
        ? ["True", "False"]
        : q.kind === "assertion_reason"
          ? ASSERTION_REASON_OPTIONS
          : isOptionKind(q.kind)
            ? (q.options ?? [])
            : null;
    if (isOptionKind(q.kind) && q.kind !== "true_false" && q.kind !== "assertion_reason") {
      if (!options || options.length < 2) {
        throw new Error("AI returned a choice question without options — please retry generation.");
      }
      if (!options.some((o) => o.trim().toLowerCase() === q.correct_answer.trim().toLowerCase())) {
        throw new Error("AI returned a question whose answer key matches no option — please retry.");
      }
    }
    if (requiresStimulus(q.kind) && !q.stimulus?.trim()) {
      throw new Error(
        `AI returned a ${q.kind} question without a stimulus passage — please retry generation.`,
      );
    }
    return {
      org_id: ctx.orgId,
      book_id: book.id,
      outcome_id: outcome.id,
      kind: q.kind,
      difficulty: q.difficulty,
      prompt: q.prompt.trim(),
      stimulus: requiresStimulus(q.kind) ? (q.stimulus?.trim() ?? null) : null,
      options,
      correct_answer: q.correct_answer.trim(),
      explanation: q.explanation.trim(),
      status: "draft" as const,
      source: "ai" as const,
      created_by: ctx.userId,
    };
  });

  const { error: insertError } = await supabase.from("question_bank").insert(cleaned);
  if (insertError) throw new Error(insertError.message);

  await supabase.from("book_events").insert({
    org_id: ctx.orgId,
    book_id: book.id,
    actor_id: ctx.userId,
    event: "questions_generated",
    detail: { outcomeId: outcome.id, code: outcome.code, count: cleaned.length, latencyMs },
  });

  return { inserted: cleaned.length, aiUsed: true, latencyMs };
}

// ---------------------------------------------------------------------------
// Batch generation: every outcome in a book (or one unit) in a single action
// ---------------------------------------------------------------------------

export async function batchGenerateQuestions(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: {
    bookId: string;
    unitId?: string | null | undefined;
    perOutcome: number;
    style?: CbseKind | "auto" | undefined;
    skipIfAtLeast?: number | undefined;
  },
): Promise<BatchGenerationReport> {
  const startedAt = new Date();
  const skipIfAtLeast = input.skipIfAtLeast ?? 0;

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title")
    .eq("id", input.bookId)
    .maybeSingle();
  if (bookError) throw new Error(bookError.message);
  if (!book) throw new Error("Book not found in your organization.");

  const { data: units, error: unitsError } = await supabase
    .from("curriculum_units")
    .select("id, title, position")
    .eq("book_id", input.bookId)
    .order("position");
  if (unitsError) throw new Error(unitsError.message);
  const unitTitleById = new Map((units ?? []).map((u) => [u.id, u.title]));

  let outcomeQuery = supabase
    .from("assessment_outcomes")
    .select("id, code, title, unit_id")
    .eq("book_id", input.bookId)
    .order("code");
  if (input.unitId) outcomeQuery = outcomeQuery.eq("unit_id", input.unitId);
  const { data: outcomes, error: outcomesError } = await outcomeQuery;
  if (outcomesError) throw new Error(outcomesError.message);
  if (!outcomes || outcomes.length === 0) {
    throw new Error("No assessment outcomes found — generate the blueprint outcomes first.");
  }

  // Existing coverage, so the report can prove what the batch changed.
  const outcomeIds = outcomes.map((o) => o.id);
  const { data: existing, error: existingError } = await supabase
    .from("question_bank")
    .select("id, outcome_id")
    .in("outcome_id", outcomeIds);
  if (existingError) throw new Error(existingError.message);
  const beforeByOutcome = new Map<string, number>();
  for (const q of existing ?? []) {
    beforeByOutcome.set(q.outcome_id, (beforeByOutcome.get(q.outcome_id) ?? 0) + 1);
  }
  const questionsBefore = existing?.length ?? 0;
  const withQuestionsBefore = outcomeIds.filter((id) => (beforeByOutcome.get(id) ?? 0) > 0).length;

  const results: BatchOutcomeResult[] = [];
  for (const outcome of outcomes) {
    const before = beforeByOutcome.get(outcome.id) ?? 0;
    const base = {
      outcomeId: outcome.id,
      code: outcome.code,
      title: outcome.title,
      unitTitle: unitTitleById.get(outcome.unit_id) ?? "—",
      before,
      requested: input.perOutcome,
    };
    if (skipIfAtLeast > 0 && before >= skipIfAtLeast) {
      results.push({ ...base, requested: 0, inserted: 0, status: "skipped", error: null, latencyMs: null });
      continue;
    }
    try {
      // Sequential on purpose: the gateway rate-limits per workspace, and a
      // partial failure must not take the whole batch down.
      const r = await generateQuestions(supabase, ctx, {
        outcomeId: outcome.id,
        count: input.perOutcome,
        style: input.style,
      });
      results.push({
        ...base,
        inserted: r.inserted,
        status: "generated",
        error: null,
        latencyMs: r.latencyMs,
      });
    } catch (error) {
      results.push({
        ...base,
        inserted: 0,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown generation error",
        latencyMs: null,
      });
    }
  }

  const inserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const questionsAfter = questionsBefore + inserted;
  const withQuestionsAfter = results.filter((r) => r.before + r.inserted > 0).length;
  const finishedAt = new Date();
  const total = outcomes.length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  const report: BatchGenerationReport = {
    bookTitle: book.title,
    unitTitle: input.unitId ? (unitTitleById.get(input.unitId) ?? null) : null,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    totals: {
      outcomes: total,
      generated: results.filter((r) => r.status === "generated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
      questionsInserted: inserted,
    },
    coverage: {
      outcomesWithQuestionsBefore: withQuestionsBefore,
      outcomesWithQuestionsAfter: withQuestionsAfter,
      coveragePctBefore: pct(withQuestionsBefore),
      coveragePctAfter: pct(withQuestionsAfter),
      questionsBefore,
      questionsAfter,
    },
    results,
  };

  await supabase.from("book_events").insert({
    org_id: ctx.orgId,
    book_id: book.id,
    actor_id: ctx.userId,
    event: "questions_batch_generated",
    detail: {
      unitId: input.unitId ?? null,
      perOutcome: input.perOutcome,
      style: input.style ?? "auto",
      totals: report.totals,
      coverage: report.coverage,
      failures: results.filter((r) => r.status === "failed").map((r) => ({ code: r.code, error: r.error })),
    },
  });

  return report;
}

// ---------------------------------------------------------------------------
// Manual CRUD + review workflow (staff only — enforced by RLS + role gate)
// ---------------------------------------------------------------------------

async function outcomeBook(
  supabase: Client,
  outcomeId: string,
): Promise<{ bookId: string }> {
  const { data, error } = await supabase
    .from("assessment_outcomes")
    .select("book_id")
    .eq("id", outcomeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Outcome not found in your organization.");
  return { bookId: data.book_id };
}

export async function createQuestion(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: {
    outcomeId: string;
    kind: QuestionKind;
    difficulty: number;
    prompt: string;
    stimulus?: string | null | undefined;
    options: string[] | null;
    correctAnswer: string;
    explanation: string;
  },
): Promise<void> {
  const { bookId } = await outcomeBook(supabase, input.outcomeId);
  const { error } = await supabase.from("question_bank").insert({
    org_id: ctx.orgId,
    book_id: bookId,
    outcome_id: input.outcomeId,
    kind: input.kind,
    difficulty: input.difficulty,
    prompt: input.prompt,
    stimulus: requiresStimulus(input.kind) ? (input.stimulus?.trim() || null) : null,
    options: isOptionKind(input.kind)
      ? input.kind === "assertion_reason"
        ? ASSERTION_REASON_OPTIONS
        : (input.options ?? [])
      : null,
    correct_answer: input.correctAnswer,
    explanation: input.explanation,
    status: "draft",
    source: "manual",
    created_by: ctx.userId,
  });
  if (error) throw new Error(error.message);
  await supabase.from("book_events").insert({
    org_id: ctx.orgId,
    book_id: bookId,
    actor_id: ctx.userId,
    event: "question_added",
    detail: { outcomeId: input.outcomeId, kind: input.kind },
  });
}

export async function updateQuestion(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: {
    questionId: string;
    kind: QuestionKind;
    difficulty: number;
    prompt: string;
    stimulus?: string | null | undefined;
    options: string[] | null;
    correctAnswer: string;
    explanation: string;
  },
): Promise<void> {
  const { data: row, error } = await supabase
    .from("question_bank")
    .update({
      kind: input.kind,
      difficulty: input.difficulty,
      prompt: input.prompt,
      stimulus: requiresStimulus(input.kind) ? (input.stimulus?.trim() || null) : null,
      options: isOptionKind(input.kind)
        ? input.kind === "assertion_reason"
          ? ASSERTION_REASON_OPTIONS
          : (input.options ?? [])
        : null,
      correct_answer: input.correctAnswer,
      explanation: input.explanation,
    })
    .eq("id", input.questionId)
    .select("book_id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("book_events").insert({
    org_id: ctx.orgId,
    book_id: row.book_id,
    actor_id: ctx.userId,
    event: "question_updated",
    detail: { questionId: input.questionId },
  });
}

export async function setQuestionStatus(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: { questionId: string; status: QuestionStatus },
): Promise<void> {
  const { data: row, error } = await supabase
    .from("question_bank")
    .update({ status: input.status })
    .eq("id", input.questionId)
    .select("book_id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("book_events").insert({
    org_id: ctx.orgId,
    book_id: row.book_id,
    actor_id: ctx.userId,
    event: `question_${input.status}`,
    detail: { questionId: input.questionId },
  });
}

export async function deleteQuestion(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  questionId: string,
): Promise<void> {
  const { data: row, error: readError } = await supabase
    .from("question_bank")
    .select("book_id")
    .eq("id", questionId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!row) throw new Error("Question not found in your organization.");
  const { error } = await supabase.from("question_bank").delete().eq("id", questionId);
  if (error) throw new Error(error.message);
  await supabase.from("book_events").insert({
    org_id: ctx.orgId,
    book_id: row.book_id,
    actor_id: ctx.userId,
    event: "question_deleted",
    detail: { questionId },
  });
}
