// Pilot Evidence Foundation (P0) — server-side assembly for M6/M7/M8.
// Every read runs through the caller's RLS client, so organization isolation
// is enforced by the database, not by these queries.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { KIND_LABELS, type QuestionKind } from "./question-bank-shared";
import {
  CBSE_KINDS,
  summariseTutorEvidence,
  type CbseCoverageRow,
  type TutorEvidenceTotals,
  type TutorGapEvidence,
  type VerifiableQuestion,
  type VerificationEvent,
  type VerificationState,
} from "./pilot-evidence-shared";

type Client = SupabaseClient<Database>;

function isCbse(kind: string): boolean {
  return (CBSE_KINDS as readonly string[]).includes(kind);
}

function kindLabel(kind: string): string {
  return KIND_LABELS[kind as QuestionKind] ?? kind;
}

// ---------------------------------------------------------------------------
// M6 — per-gap tutor evidence
// ---------------------------------------------------------------------------

export async function fetchTutorEvidence(
  supabase: Client,
): Promise<{ rows: TutorGapEvidence[]; totals: TutorEvidenceTotals }> {
  // Aggregates come from a security-definer function scoped to the caller's
  // organization; raw tutor_interactions stay private to the student.
  const { data: agg, error } = await supabase.rpc("tutor_evidence_by_gap");
  if (error) throw new Error(error.message);

  const aggRows = agg ?? [];
  const gapIds = aggRows.map((r) => r.gap_id);

  const [{ data: gaps }, { data: learners }] = await Promise.all([
    gapIds.length
      ? supabase
          .from("learning_gaps")
          .select("id, learner_id, subject, topic, subtopic, severity, status")
          .in("id", gapIds)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("learners").select("id, full_name"),
  ]);

  const gapById = new Map((gaps ?? []).map((g) => [g.id, g]));
  const learnerName = new Map((learners ?? []).map((l) => [l.id, l.full_name]));

  const rows: TutorGapEvidence[] = aggRows
    .map((r) => {
      const gap = gapById.get(r.gap_id);
      return {
        gapId: r.gap_id,
        learnerId: r.learner_id,
        learnerName: learnerName.get(r.learner_id) ?? "Learner",
        subject: gap?.subject ?? "—",
        topic: gap?.topic ?? "—",
        subtopic: gap?.subtopic ?? "—",
        severity: gap?.severity ?? "—",
        gapStatus: gap?.status ?? "—",
        sessions: Number(r.sessions ?? 0),
        interactions: Number(r.interactions ?? 0),
        substantiveInteractions: Number(r.substantive_interactions ?? 0),
        tutorMinutes: Number(r.tutor_minutes ?? 0),
        firstAt: r.first_at,
        lastAt: r.last_at,
      };
    })
    .sort((a, b) => b.tutorMinutes - a.tutorMinutes || a.learnerName.localeCompare(b.learnerName));

  return { rows, totals: summariseTutorEvidence(rows) };
}

// ---------------------------------------------------------------------------
// M7 — CBSE question-type coverage
// ---------------------------------------------------------------------------

export async function fetchCbseCoverage(supabase: Client): Promise<CbseCoverageRow[]> {
  const { data, error } = await supabase
    .from("question_bank")
    .select("kind, status, verification_state");
  if (error) throw new Error(error.message);

  const byKind = new Map<string, CbseCoverageRow>();
  const seed = (kind: string) => {
    if (!byKind.has(kind)) {
      byKind.set(kind, {
        kind,
        label: kindLabel(kind),
        cbse: isCbse(kind),
        total: 0,
        approved: 0,
        verified: 0,
      });
    }
    return byKind.get(kind)!;
  };

  // Always show the four CBSE competency types, even at zero.
  for (const k of CBSE_KINDS) seed(k);

  for (const row of data ?? []) {
    const entry = seed(row.kind);
    entry.total += 1;
    if (row.status === "approved") entry.approved += 1;
    if (row.verification_state === "verified") entry.verified += 1;
  }

  return [...byKind.values()].sort(
    (a, b) => Number(b.cbse) - Number(a.cbse) || a.label.localeCompare(b.label),
  );
}

// ---------------------------------------------------------------------------
// M8 — reviewer verification queue + audit trail
// ---------------------------------------------------------------------------

export async function fetchVerificationQueue(supabase: Client): Promise<{
  questions: VerifiableQuestion[];
  trail: VerificationEvent[];
}> {
  const [{ data: questions, error: qError }, { data: events, error: eError }] = await Promise.all([
    supabase
      .from("question_bank")
      .select("*")
      .order("verification_state", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("question_verifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (qError) throw new Error(qError.message);
  if (eError) throw new Error(eError.message);

  const outcomeIds = [...new Set((questions ?? []).map((q) => q.outcome_id))];
  const { data: outcomes } = outcomeIds.length
    ? await supabase.from("assessment_outcomes").select("id, code, title").in("id", outcomeIds)
    : { data: [] as never[] };
  const outcomeById = new Map((outcomes ?? []).map((o) => [o.id, o]));

  const reviewerIds = [
    ...new Set([
      ...(events ?? []).map((e) => e.reviewer_id),
      ...(questions ?? []).map((q) => q.verified_by).filter((v): v is string => !!v),
    ]),
  ];
  const { data: profiles } = reviewerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [] as never[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const promptById = new Map((questions ?? []).map((q) => [q.id, q.prompt]));

  return {
    questions: (questions ?? []).map((q) => ({
      id: q.id,
      outcomeCode: outcomeById.get(q.outcome_id)?.code ?? "—",
      outcomeTitle: outcomeById.get(q.outcome_id)?.title ?? "Outcome",
      kind: q.kind,
      kindLabel: kindLabel(q.kind),
      cbse: isCbse(q.kind),
      difficulty: q.difficulty,
      prompt: q.prompt,
      stimulus: q.stimulus,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      status: q.status,
      verificationState: (q.verification_state ?? "unverified") as VerificationState,
      verifiedByName: q.verified_by ? (nameById.get(q.verified_by) ?? "Reviewer") : null,
      verifiedAt: q.verified_at,
      verificationNote: q.verification_note,
    })),
    trail: (events ?? []).map((e) => ({
      id: e.id,
      questionId: e.question_id,
      questionPrompt: promptById.get(e.question_id) ?? "Question",
      action: e.action as "verified" | "rejected",
      note: e.note,
      reviewerId: e.reviewer_id,
      reviewerName: nameById.get(e.reviewer_id) ?? "Reviewer",
      createdAt: e.created_at,
    })),
  };
}

export async function recordQuestionVerification(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: { questionId: string; action: "verified" | "rejected"; note?: string | null },
): Promise<void> {
  // Append-only: the trigger on this table stamps question_bank with the
  // reviewer + timestamp. There is no update/delete path for the trail.
  const { error } = await supabase.from("question_verifications").insert({
    org_id: ctx.orgId,
    question_id: input.questionId,
    reviewer_id: ctx.userId,
    action: input.action,
    note: input.note?.trim() || null,
  });
  if (error) throw new Error(error.message);
}
