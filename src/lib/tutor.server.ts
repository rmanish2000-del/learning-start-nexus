// Sprint 4: AI Tutor V1 — server-only engine.
// Builds the tutor context from the intervention plan, calls the Lovable AI
// Gateway (Gemini) for Socratic replies, and falls back to the static content
// library when the AI is unavailable. The tutor is a learning companion only:
// this module NEVER writes to mastery, assessments, evidence, gaps,
// recommendations, or interventions.

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  answersMatch,
  conceptContent,
  type ConceptContent,
  type PracticeItem,
} from "./tutor-content";

type Client = SupabaseClient<Database>;

export const TUTOR_MODEL = "google/gemini-3.7-flash";

export const TUTOR_ACTIONS = [
  "explain",
  "hint",
  "example",
  "reframe",
  "try_question",
  "try_answer",
  "socratic",
  "practice_question",
  "practice_answer",
] as const;

export type TutorAction = (typeof TUTOR_ACTIONS)[number];

export type TutorContext = {
  studentName: string;
  grade: number;
  subject: string;
  topic: string;
  concept: string;
  objective: string;
  mastery: number;
  interventionTitle: string | null;
  interventionActivity: string | null;
  gapSummary: string | null;
};

export type TutorReply = {
  reply: string;
  aiUsed: boolean;
  practiceCorrect: boolean | null;
};

// ---------------------------------------------------------------------------
// AI gateway call. Returns null on ANY failure — callers fall back to the
// static library. Never throws for gateway errors.
// ---------------------------------------------------------------------------

export async function callTutorAi(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<{ text: string; latencyMs: number } | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;
  const started = Date.now();
  try {
    const gateway = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: gateway(TUTOR_MODEL),
      system,
      messages,
      maxOutputTokens: 400,
      // A hung gateway must never strand the student on "Thinking…" —
      // abort and fall back to the static library instead.
      abortSignal: AbortSignal.timeout(30_000),
    });
    const trimmed = text.trim();
    if (!trimmed) return null;
    return { text: trimmed, latencyMs: Date.now() - started };
  } catch {
    return null;
  }
}

function systemPrompt(ctx: TutorContext): string {
  return [
    `You are a warm, encouraging math tutor for ${ctx.studentName}, a Grade ${ctx.grade} student.`,
    `Subject: ${ctx.subject}. Topic: ${ctx.topic}. Concept being taught: ${ctx.concept}.`,
    `Current learning objective: ${ctx.objective}.`,
    `The student's current mastery index is ${ctx.mastery}%.`,
    ctx.interventionTitle
      ? `They are working on an educator-assigned intervention: "${ctx.interventionTitle}" — ${ctx.interventionActivity ?? ""}`
      : "They are doing extra practice.",
    ctx.gapSummary ? `Known gap: ${ctx.gapSummary}.` : "",
    "",
    "Teaching rules:",
    "- Use age-appropriate language for an 11-12 year old. Short sentences. Friendly tone.",
    "- Be Socratic: ask guiding questions like 'What do you think?' and 'Why do you think that?' — guide thinking instead of lecturing.",
    "- NEVER just hand over the answer to a question the student is trying. Give progressively stronger hints instead.",
    "- When a student answers correctly, praise specifically and ask a short follow-up to deepen understanding.",
    "- When a student answers incorrectly, be kind, point at the likely misconception, and guide them to retry.",
    "- Keep every reply under 120 words. Use simple fraction notation like 3/4.",
    "- Reply in plain text only: no markdown, no asterisks, no bullet symbols, no headings.",
    "- You are a learning companion only. You cannot change scores, assessments, or learning plans — never claim otherwise.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Fallback replies from the static library (deterministic).
// ---------------------------------------------------------------------------

function fallbackReplyText(
  content: ConceptContent,
  action: TutorAction,
  opts: {
    hintLevel: number;
    studentText?: string | undefined;
    activeItem?: PracticeItem | null | undefined;
    correct?: boolean | null | undefined;
  },
): string {
  switch (action) {
    case "explain":
      return content.explanation;
    case "reframe":
      return content.altExplanation;
    case "example":
      return content.example;
    case "hint": {
      const level = Math.min(Math.max(opts.hintLevel, 1), 3);
      return `Hint ${level} of 3: ${content.hints[level - 1] ?? content.hints[0]}`;
    }
    case "socratic": {
      const idx = Math.min(Math.max(opts.hintLevel - 1, 0), content.socratic.length - 1);
      return content.socratic[idx] ?? content.socratic[0] ?? "What do you think?";
    }
    case "try_question":
      return `Try this one — I'll wait for your answer:\n\n${content.tryQuestion.question}`;
    case "practice_question":
      return opts.activeItem
        ? `Practice question:\n\n${opts.activeItem.question}`
        : "Let's practice! Ask me for a question.";
    case "try_answer":
    case "practice_answer": {
      const item = opts.activeItem;
      if (!item) return "I couldn't find the question you're answering — ask me for a new one.";
      if (opts.correct) {
        return `That's correct — nice work! 🎉\n\n${item.solution}\n\nWant another one? Press Practice or Let me try.`;
      }
      return `Not quite — that's okay, mistakes are how we learn.\n\nHint: ${item.hint}\n\nHave another go, or ask me for a Hint or an Example.`;
    }
  }
}

// ---------------------------------------------------------------------------
// Reply generation: AI first (unless forceFallback), library as the net.
// ---------------------------------------------------------------------------

export async function generateTutorReply(
  ctx: TutorContext,
  action: TutorAction,
  opts: {
    hintLevel: number;
    studentText?: string | undefined;
    activeItem?: PracticeItem | null | undefined;
    correct?: boolean | null | undefined;
    history: { role: "user" | "assistant"; content: string }[];
    forceFallback?: boolean | undefined;
  },
): Promise<TutorReply> {
  const content = conceptContent(ctx.concept);

  // Question posing and grading are deterministic by design — the library owns
  // the questions and the answer checking, so practice is always gradable even
  // without the AI.
  if (action === "try_question" || action === "practice_question") {
    return {
      reply: fallbackReplyText(content, action, opts),
      aiUsed: false,
      practiceCorrect: null,
    };
  }

  const fallback = (): TutorReply => ({
    reply: fallbackReplyText(content, action, opts),
    aiUsed: false,
    practiceCorrect: opts.correct ?? null,
  });

  if (opts.forceFallback) return fallback();

  const actionInstruction: Record<TutorAction, string> = {
    explain: `Please explain "${ctx.concept}" to me in a way a Grade ${ctx.grade} student understands.`,
    hint: `I'm stuck on "${ctx.concept}". Give me hint number ${Math.min(opts.hintLevel, 3)} — help me think, but do NOT give me the answer.`,
    example: `Show me a worked example for "${ctx.concept}", step by step.`,
    reframe: `Explain "${ctx.concept}" in a completely different way than before.`,
    socratic: `Ask me a guiding question about "${ctx.concept}" — something like "what do you think?" that makes me reason it out.`,
    try_question: "", // handled above
    practice_question: "", // handled above
    try_answer: `The question was: "${opts.activeItem?.question ?? "unknown"}". My answer: "${opts.studentText ?? ""}". The correct answer is "${opts.activeItem?.answer ?? ""}" and I was ${opts.correct ? "CORRECT" : "WRONG"}. Respond appropriately: praise + follow-up if correct; kind guidance toward the misconception (without just restating the answer) if wrong.`,
    practice_answer: `The practice question was: "${opts.activeItem?.question ?? "unknown"}". My answer: "${opts.studentText ?? ""}". The correct answer is "${opts.activeItem?.answer ?? ""}" and I was ${opts.correct ? "CORRECT" : "WRONG"}. Respond appropriately: praise + follow-up if correct; kind guidance toward the misconception (without just restating the answer) if wrong.`,
  };

  const ai = await callTutorAi(systemPrompt(ctx), [
    ...opts.history.slice(-8),
    { role: "user", content: actionInstruction[action] },
  ]);

  if (!ai) return fallback();
  return { reply: ai.text, aiUsed: true, practiceCorrect: opts.correct ?? null };
}

// ---------------------------------------------------------------------------
// Data access — all through the caller's RLS-scoped client.
// ---------------------------------------------------------------------------

type SessionRow = Database["public"]["Tables"]["tutor_sessions"]["Row"];
type InteractionRow = Database["public"]["Tables"]["tutor_interactions"]["Row"];

export async function buildTutorContext(
  supabase: Client,
  session: SessionRow,
): Promise<TutorContext> {
  const { data: learner } = await supabase
    .from("learners")
    .select("full_name, grade, subject, mastery_score")
    .eq("id", session.learner_id)
    .maybeSingle();

  let interventionTitle: string | null = null;
  let interventionActivity: string | null = null;
  let gapSummary: string | null = null;

  if (session.intervention_id) {
    const { data: intervention } = await supabase
      .from("interventions")
      .select("title, activity, gap_id")
      .eq("id", session.intervention_id)
      .maybeSingle();
    interventionTitle = intervention?.title ?? null;
    interventionActivity = intervention?.activity ?? null;
    if (intervention?.gap_id) {
      const { data: gap } = await supabase
        .from("learning_gaps")
        .select("subtopic, gap_score_pct, severity")
        .eq("id", intervention.gap_id)
        .maybeSingle();
      if (gap) {
        gapSummary = `${gap.subtopic} at ${gap.gap_score_pct}% (${gap.severity} severity)`;
      }
    }
  }

  return {
    studentName: learner?.full_name ?? "student",
    grade: learner?.grade ?? 6,
    subject: session.subject,
    topic: session.topic,
    concept: session.concept,
    objective: session.objective,
    mastery: session.mastery_at_start,
    interventionTitle,
    interventionActivity,
    gapSummary,
  };
}

function interactionHistory(
  rows: InteractionRow[],
): { role: "user" | "assistant"; content: string }[] {
  const history: { role: "user" | "assistant"; content: string }[] = [];
  for (const row of rows) {
    if (row.request_text) history.push({ role: "user", content: row.request_text });
    history.push({ role: "assistant", content: row.response_text });
  }
  return history.slice(-8);
}

// Find the library item behind the most recent unanswered question.
function activePracticeItem(rows: InteractionRow[], concept: string): PracticeItem | null {
  const content = conceptContent(concept);
  const allItems = [content.tryQuestion, ...content.practice];
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (!row) continue;
    if (row.kind === "try_answer" || row.kind === "practice_answer") return null; // last question already answered
    if (row.kind === "try_question" || row.kind === "practice_question") {
      const match = allItems.find((item) => row.response_text.includes(item.question));
      return match ?? null;
    }
  }
  return null;
}

export async function performTutorAction(
  supabase: Client,
  userId: string,
  input: { sessionId: string; action: TutorAction; studentText?: string | undefined },
  opts: { forceFallback?: boolean | undefined } = {},
): Promise<{ interaction: InteractionRow; reply: TutorReply }> {
  const { data: session, error: sessionError } = await supabase
    .from("tutor_sessions")
    .select("*")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message);
  if (!session) throw new Error("Tutor session not found.");
  if (session.student_user_id !== userId) {
    throw new Error("You can only use your own tutor sessions.");
  }
  if (session.status !== "active") throw new Error("This tutor session has ended.");

  const { data: rows, error: rowsError } = await supabase
    .from("tutor_interactions")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });
  if (rowsError) throw new Error(rowsError.message);
  const interactions = rows ?? [];

  const ctx = await buildTutorContext(supabase, session);
  const content = conceptContent(session.concept);

  // Hint level = how many hints already given in this session (1..3).
  const hintCount = interactions.filter((r) => r.kind === "hint").length;
  const socraticCount = interactions.filter((r) => r.kind === "socratic").length;

  // Practice questions cycle deterministically through the concept's set.
  const practiceCount = interactions.filter((r) => r.kind === "practice_question").length;
  const nextPractice =
    content.practice[practiceCount % content.practice.length] ?? content.tryQuestion;

  let activeItem: PracticeItem | null = null;
  let correct: boolean | null = null;
  if (input.action === "try_answer" || input.action === "practice_answer") {
    if (!input.studentText?.trim()) throw new Error("Type your answer first.");
    activeItem = activePracticeItem(interactions, session.concept);
    if (!activeItem) throw new Error("No open question to answer — ask for a question first.");
    correct = answersMatch(input.studentText, activeItem.answer);
  }
  if (input.action === "practice_question") activeItem = nextPractice;
  if (input.action === "try_question") activeItem = content.tryQuestion;

  const reply = await generateTutorReply(ctx, input.action, {
    hintLevel: input.action === "socratic" ? socraticCount + 1 : hintCount + 1,
    studentText: input.studentText,
    activeItem,
    correct,
    history: interactionHistory(interactions),
    forceFallback: opts.forceFallback,
  });

  const requestLabel: Record<TutorAction, string> = {
    explain: "Explain this concept",
    hint: "Give me a hint",
    example: "Show me an example",
    reframe: "Explain it differently",
    try_question: "Let me try a question",
    try_answer: input.studentText ?? "",
    socratic: "Ask me a question",
    practice_question: "Start practice",
    practice_answer: input.studentText ?? "",
  };

  const { data: inserted, error: insertError } = await supabase
    .from("tutor_interactions")
    .insert({
      org_id: session.org_id,
      session_id: session.id,
      learner_id: session.learner_id,
      student_user_id: userId,
      kind: input.action,
      request_text: requestLabel[input.action] || null,
      response_text: reply.reply,
      ai_used: reply.aiUsed,
      practice_correct: reply.practiceCorrect,
    })
    .select("*")
    .single();
  if (insertError) throw new Error(insertError.message);

  const conceptsAccessed = session.concepts_accessed.includes(session.concept)
    ? session.concepts_accessed
    : [...session.concepts_accessed, session.concept];

  const { error: updateError } = await supabase
    .from("tutor_sessions")
    .update({
      interaction_count: session.interaction_count + 1,
      concepts_accessed: conceptsAccessed,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", session.id);
  if (updateError) throw new Error(updateError.message);

  return { interaction: inserted, reply };
}
