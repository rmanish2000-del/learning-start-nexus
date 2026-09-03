// Automated question verification — server assembly.
//
// Reads and writes run through the caller's RLS client. Automated approval is
// recorded as verification_tier = 'eduos_automated' on the question and as an
// append-only row in question_auto_verifications. No human reviewer identity is
// ever written for an automated decision.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  AUTO_CHECK_IDS,
  AUTO_VERIFICATION_ENGINE_VERSION,
  AUTO_VERIFIED_LABEL,
  verifyCorpus,
  type AutoCheckId,
  type AutoVerificationItem,
  type AutoVerificationRunSummary,
  type AutoVerificationVerdict,
} from "./auto-verification-shared";
import { NCERT_OVERLAP_CANDIDATES, SME_SUBJECTS, type SmeSubject } from "./sme-review-shared";

type Client = SupabaseClient<Database>;

const BOOK_TITLE_BY_SUBJECT: Record<SmeSubject, string> = {
  Mathematics: "NCERT Class 10 Mathematics (CBSE)",
  Science: "NCERT Class 10 Science (CBSE)",
};

const contaminatedRefs = new Set(NCERT_OVERLAP_CANDIDATES.map((c) => c.externalRef));

async function loadDrafts(supabase: Client): Promise<AutoVerificationItem[]> {
  const { data: books, error: bookError } = await supabase
    .from("books")
    .select("id, title")
    .in("title", Object.values(BOOK_TITLE_BY_SUBJECT));
  if (bookError) throw new Error(bookError.message);

  const subjectByBook = new Map<string, SmeSubject>();
  for (const subject of SME_SUBJECTS) {
    const match = (books ?? []).find((b) => b.title === BOOK_TITLE_BY_SUBJECT[subject]);
    if (match) subjectByBook.set(match.id, subject);
  }
  const ids = [...subjectByBook.keys()];
  if (!ids.length) return [];

  const { data: rows, error } = await supabase
    .from("question_bank")
    .select(
      "id, book_id, outcome_id, external_ref, kind, difficulty, prompt, stimulus, options, correct_answer, explanation",
    )
    .in("book_id", ids)
    // The unverified corpus is defined by verification state, not by status:
    // part of it sits at status 'approved' but was never verified.
    .in("status", ["draft", "approved"])
    .eq("verification_state", "unverified")
    .order("external_ref", { ascending: true });
  if (error) throw new Error(error.message);

  const all = rows ?? [];
  const outcomeIds = [...new Set(all.map((q) => q.outcome_id))];
  const { data: outcomes } = outcomeIds.length
    ? await supabase.from("assessment_outcomes").select("id, code, title, unit_id").in("id", outcomeIds)
    : { data: [] as never[] };
  const outcomeById = new Map((outcomes ?? []).map((o) => [o.id, o]));

  const unitIds = [...new Set((outcomes ?? []).map((o) => o.unit_id))];
  const { data: units } = unitIds.length
    ? await supabase.from("curriculum_units").select("id, title").in("id", unitIds)
    : { data: [] as never[] };
  const unitById = new Map((units ?? []).map((u) => [u.id, u.title]));

  return all.map((q) => {
    const outcome = outcomeById.get(q.outcome_id);
    const rawOptions = q.options;
    const options = Array.isArray(rawOptions)
      ? rawOptions.map((o) => (typeof o === "string" ? o : String((o as { text?: string })?.text ?? o)))
      : null;
    return {
      id: q.id,
      externalRef: q.external_ref,
      subject: subjectByBook.get(q.book_id) ?? "Mathematics",
      kind: q.kind,
      difficulty: q.difficulty,
      prompt: q.prompt,
      stimulus: q.stimulus,
      options,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      outcomeCode: outcome?.code ?? null,
      unitTitle: (outcome && unitById.get(outcome.unit_id)) ?? null,
      chapterTitle: outcome?.title ?? null,
    } satisfies AutoVerificationItem;
  });
}

function summarise(runId: string, verdicts: AutoVerificationVerdict[]): AutoVerificationRunSummary {
  const bySubject = SME_SUBJECTS.map((subject) => {
    const rows = verdicts.filter((v) => v.subject === subject);
    return {
      subject,
      evaluated: rows.length,
      autoApproved: rows.filter((v) => v.outcome === "auto_approved").length,
      quarantined: rows.filter((v) => v.outcome === "quarantined").length,
    };
  });

  const byFailedCheck = AUTO_CHECK_IDS.map((checkId: AutoCheckId) => ({
    checkId,
    items: verdicts.filter((v) =>
      v.checks.some((c) => c.checkId === checkId && c.verdict !== "pass"),
    ).length,
  })).filter((r) => r.items > 0);

  return {
    runId,
    engineVersion: AUTO_VERIFICATION_ENGINE_VERSION,
    ranAt: new Date().toISOString(),
    evaluated: verdicts.length,
    autoApproved: verdicts.filter((v) => v.outcome === "auto_approved").length,
    quarantined: verdicts.filter((v) => v.outcome === "quarantined").length,
    bySubject,
    byFailedCheck,
  };
}

/** Dry run: evaluates the drafts and changes nothing. */
export async function previewAutoVerification(supabase: Client): Promise<{
  summary: AutoVerificationRunSummary;
  verdicts: AutoVerificationVerdict[];
}> {
  const items = await loadDrafts(supabase);
  const verdicts = verifyCorpus(items, contaminatedRefs);
  return { summary: summarise("preview", verdicts), verdicts };
}

/** Applies the engine: promotes auto-approved items, records every verdict. */
export async function applyAutoVerification(
  supabase: Client,
  ctx: { orgId: string; userId: string },
): Promise<{ summary: AutoVerificationRunSummary; verdicts: AutoVerificationVerdict[] }> {
  const items = await loadDrafts(supabase);
  const verdicts = verifyCorpus(items, contaminatedRefs);
  const runId = crypto.randomUUID();

  for (const verdict of verdicts) {
    if (verdict.outcome === "auto_approved") {
      const { error } = await supabase
        .from("question_bank")
        .update({
          status: "approved",
          verification_state: "verified",
          verification_tier: "eduos_automated",
          verification_note: `${AUTO_VERIFIED_LABEL} — automated deterministic verification v${AUTO_VERIFICATION_ENGINE_VERSION}. Not a named-SME certification.`,
          verified_at: new Date().toISOString(),
        })
        .eq("id", verdict.questionId)
        .eq("status", "draft");
      if (error) throw new Error(error.message);
    }

    const { error: logError } = await supabase.from("question_auto_verifications").insert({
      org_id: ctx.orgId,
      question_id: verdict.questionId,
      run_id: runId,
      engine_version: AUTO_VERIFICATION_ENGINE_VERSION,
      outcome: verdict.outcome,
      confidence: verdict.confidence,
      checks: JSON.parse(JSON.stringify(verdict.checks)) as Database["public"]["Tables"]["question_auto_verifications"]["Row"]["checks"],
      created_by: ctx.userId,
    });
    if (logError) throw new Error(logError.message);
  }

  return { summary: summarise(runId, verdicts), verdicts };
}

/** Evidence view: what the engine has already decided, straight from the log. */
export async function fetchAutoVerificationEvidence(supabase: Client): Promise<{
  totals: { autoApproved: number; quarantined: number; runs: number };
  latest: Array<{
    id: string;
    questionId: string;
    externalRef: string | null;
    outcome: string;
    confidence: number;
    createdAt: string;
  }>;
  tiers: { namedSme: number; eduosAutomated: number; unverifiedDrafts: number };
}> {
  const { data: log, error } = await supabase
    .from("question_auto_verifications")
    .select("id, question_id, run_id, outcome, confidence, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const rows = log ?? [];

  const questionIds = [...new Set(rows.map((r) => r.question_id))];
  const { data: questions } = questionIds.length
    ? await supabase.from("question_bank").select("id, external_ref").in("id", questionIds)
    : { data: [] as never[] };
  const refById = new Map((questions ?? []).map((q) => [q.id, q.external_ref]));

  const { data: tierRows } = await supabase
    .from("question_bank")
    .select("verification_tier, status, verification_state")
    .not("external_ref", "is", null);
  const tiersSource = tierRows ?? [];

  return {
    totals: {
      autoApproved: rows.filter((r) => r.outcome === "auto_approved").length,
      quarantined: rows.filter((r) => r.outcome === "quarantined").length,
      runs: new Set(rows.map((r) => r.run_id)).size,
    },
    latest: rows.slice(0, 50).map((r) => ({
      id: r.id,
      questionId: r.question_id,
      externalRef: refById.get(r.question_id) ?? null,
      outcome: r.outcome,
      confidence: Number(r.confidence),
      createdAt: r.created_at,
    })),
    tiers: {
      namedSme: tiersSource.filter((q) => q.verification_tier === "named_sme").length,
      eduosAutomated: tiersSource.filter((q) => q.verification_tier === "eduos_automated").length,
      unverifiedDrafts: tiersSource.filter(
        (q) => q.status === "draft" && q.verification_state === "unverified",
      ).length,
    },
  };
}
