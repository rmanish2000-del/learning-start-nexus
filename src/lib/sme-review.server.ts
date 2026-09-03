// Named-SME review workflow — server assembly.
// Every read runs through the caller's RLS client, so organization isolation
// is enforced by the database. Nothing here creates or auto-approves content.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  NCERT_OVERLAP_CANDIDATES,
  NEAR_DUPLICATE_PAIRS,
  SME_EXPECTED_QUEUE,
  SME_SUBJECTS,
  type SmeAuditEvent,
  type SmeDecision,
  type SmeQueueItem,
  type SmeQueueSummary,
  type SmeSubject,
} from "./sme-review-shared";

type Client = SupabaseClient<Database>;

// The two Class 10 (2026-27) source books that hold the 326 drafts.
const BOOK_TITLE_BY_SUBJECT: Record<SmeSubject, string> = {
  Mathematics: "NCERT Class 10 Mathematics (CBSE)",
  Science: "NCERT Class 10 Science (CBSE)",
};

const overlapRefs = new Set(NCERT_OVERLAP_CANDIDATES.map((c) => c.externalRef));
const nearDupPartner = new Map<string, string>();
for (const pair of NEAR_DUPLICATE_PAIRS) {
  nearDupPartner.set(pair.a, pair.b);
  nearDupPartner.set(pair.b, pair.a);
}

async function bookIds(supabase: Client): Promise<Map<SmeSubject, string>> {
  const { data, error } = await supabase
    .from("books")
    .select("id, title")
    .in("title", Object.values(BOOK_TITLE_BY_SUBJECT));
  if (error) throw new Error(error.message);

  const map = new Map<SmeSubject, string>();
  for (const subject of SME_SUBJECTS) {
    const match = (data ?? []).find((b) => b.title === BOOK_TITLE_BY_SUBJECT[subject]);
    if (match) map.set(subject, match.id);
  }
  return map;
}

export async function fetchSmeReview(supabase: Client): Promise<{
  summaries: SmeQueueSummary[];
  total: number;
  reconciled: boolean;
  items: SmeQueueItem[];
  trail: SmeAuditEvent[];
}> {
  const books = await bookIds(supabase);
  const ids = [...books.values()];
  const subjectByBook = new Map([...books.entries()].map(([s, id]) => [id, s]));

  const { data: rows, error } = ids.length
    ? await supabase
        .from("question_bank")
        .select(
          "id, book_id, outcome_id, external_ref, kind, difficulty, prompt, stimulus, correct_answer, explanation, status, verification_state",
        )
        .in("book_id", ids)
        .order("external_ref", { ascending: true })
    : { data: [], error: null };
  if (error) throw new Error(error.message);

  const all = rows ?? [];
  const outcomeIds = [...new Set(all.map((q) => q.outcome_id))];
  const { data: outcomes } = outcomeIds.length
    ? await supabase
        .from("assessment_outcomes")
        .select("id, code, title, unit_id")
        .in("id", outcomeIds)
    : { data: [] as never[] };
  const outcomeById = new Map((outcomes ?? []).map((o) => [o.id, o]));

  const unitIds = [...new Set((outcomes ?? []).map((o) => o.unit_id))];
  const { data: units } = unitIds.length
    ? await supabase.from("curriculum_units").select("id, title").in("id", unitIds)
    : { data: [] as never[] };
  const unitTitleById = new Map((units ?? []).map((u) => [u.id, u.title]));

  const summaries: SmeQueueSummary[] = SME_SUBJECTS.map((subject) => {
    const bookId = books.get(subject);
    const subjectRows = all.filter((q) => q.book_id === bookId);
    const drafts = subjectRows.filter(
      (q) => q.status === "draft" && q.verification_state === "unverified",
    ).length;
    const approved = subjectRows.filter(
      (q) => q.verification_state === "verified" && q.external_ref?.startsWith("C10-2627"),
    ).length;
    const rejected = subjectRows.filter((q) => q.verification_state === "rejected").length;
    const expected = SME_EXPECTED_QUEUE[subject];
    return {
      subject,
      expected,
      drafts,
      approved,
      rejected,
      reconciled: drafts + approved + rejected === expected,
    };
  });

  const items: SmeQueueItem[] = all
    .filter((q) => q.status === "draft" && q.verification_state === "unverified")
    .map((q) => {
      const outcome = outcomeById.get(q.outcome_id);
      const ref = q.external_ref;
      return {
        id: q.id,
        externalRef: ref,
        subject: (subjectByBook.get(q.book_id ?? "") ?? "Mathematics") as SmeSubject,
        unitTitle: (outcome && unitTitleById.get(outcome.unit_id)) ?? "—",
        outcomeCode: outcome?.code ?? "—",
        outcomeTitle: outcome?.title ?? "Outcome",
        kind: q.kind,
        difficulty: q.difficulty,
        prompt: q.prompt,
        stimulus: q.stimulus,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        status: q.status,
        verificationState: q.verification_state ?? "unverified",
        overlapCandidate: !!ref && overlapRefs.has(ref),
        nearDuplicateOf: (ref && nearDupPartner.get(ref)) || null,
      };
    });

  const questionIds = all.map((q) => q.id);
  const { data: events } = questionIds.length
    ? await supabase
        .from("question_verifications")
        .select(
          "id, question_id, action, note, reviewer_id, reviewer_qualification, decision_basis, created_at",
        )
        .in("question_id", questionIds)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] as never[] };

  const reviewerIds = [...new Set((events ?? []).map((e) => e.reviewer_id))];
  const { data: profiles } = reviewerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [] as never[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const refById = new Map(all.map((q) => [q.id, q.external_ref]));

  const trail: SmeAuditEvent[] = (events ?? []).map((e) => ({
    id: e.id,
    questionId: e.question_id,
    externalRef: refById.get(e.question_id) ?? null,
    action: e.action as SmeAuditEvent["action"],
    note: e.note,
    reviewerName: nameById.get(e.reviewer_id) ?? "Reviewer",
    reviewerQualification: e.reviewer_qualification ?? "",
    decisionBasis: e.decision_basis ?? "",
    createdAt: e.created_at,
  }));

  const total = summaries.reduce((sum, s) => sum + s.expected, 0);
  return {
    summaries,
    total,
    reconciled: summaries.every((s) => s.reconciled),
    items,
    trail,
  };
}

// One decision, one item. Bulk writes are rejected by the database.
export async function recordSmeDecision(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: {
    questionId: string;
    action: SmeDecision;
    note: string | null;
    reviewerQualification: string;
    decisionBasis: string;
  },
): Promise<void> {
  const { error } = await supabase.from("question_verifications").insert({
    org_id: ctx.orgId,
    question_id: input.questionId,
    reviewer_id: ctx.userId,
    action: input.action,
    note: input.note?.trim() || null,
    reviewer_qualification: input.reviewerQualification.trim(),
    decision_basis: input.decisionBasis.trim(),
  });
  if (error) throw new Error(error.message);
}
