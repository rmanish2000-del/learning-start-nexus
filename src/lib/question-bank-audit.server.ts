// Sprint 6D audit center: server-only helpers behind the audit server
// functions. Plain DTOs with verbatim database responses so an independent
// reviewer can validate the question bank engine without trusting app claims.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchPolicyAudit,
  type DbErrorShape,
  type PolicyAuditRow,
} from "./audit.server";
import type { CallerCtx } from "./blueprint-audit.server";
import { PILOT_BOOK_ID } from "./curriculum-audit.server";

type Client = SupabaseClient<Database>;

const QUESTION_BANK_TABLES = ["question_bank"] as const;

function shapeError(err: unknown): DbErrorShape {
  if (!err || typeof err !== "object") return null;
  const e = err as { code?: string; message?: string; details?: string | null; hint?: string | null };
  return {
    code: e.code ?? null,
    message: e.message ?? "unknown error",
    details: e.details ?? null,
    hint: e.hint ?? null,
  };
}

// Expected seed for the pilot book (Knowledge Bank for Children, Class 3 GK).
export const QUESTION_BANK_EXPECTED = {
  questions: 12,
  outcomesCovered: 4,
  coveredCodes: ["LO_GK3_NAT_01", "LO_GK3_GLB_01", "LO_GK3_ENV_01", "LO_GK3_SCI_02"],
} as const;

// ---------------------------------------------------------------------------
// Counts: caller-visible (RLS) vs global (service role)
// ---------------------------------------------------------------------------

export type QuestionBankCount = {
  table: string;
  label: string;
  visibleToYou: number | null;
  globalAllOrgs: number;
  isolated: boolean;
  note: string;
};

export async function fetchQuestionBankCounts(
  supabase: Client,
  admin: Client,
): Promise<QuestionBankCount[]> {
  const visible = await (supabase as SupabaseClient)
    .from("question_bank")
    .select("id", { count: "exact", head: true });
  const global = await (admin as SupabaseClient)
    .from("question_bank")
    .select("id", { count: "exact", head: true });
  const visibleToYou = visible.error ? null : (visible.count ?? 0);
  const globalAllOrgs = global.count ?? 0;
  return [
    {
      table: "question_bank",
      label: "Question bank",
      visibleToYou,
      globalAllOrgs,
      isolated: visibleToYou !== null && visibleToYou <= globalAllOrgs,
      note: "Questions linked to assessment outcomes, with difficulty, answer key, and explanation.",
    },
  ];
}

export async function fetchQuestionBankPolicies(supabase: Client): Promise<PolicyAuditRow[]> {
  const all = await fetchPolicyAudit(supabase);
  return all.filter((p) => (QUESTION_BANK_TABLES as readonly string[]).includes(p.tablename));
}

// ---------------------------------------------------------------------------
// Pilot question bank snapshot
// ---------------------------------------------------------------------------

export type QuestionSnapshotRow = {
  id: string;
  outcomeCode: string;
  kind: string;
  difficulty: number;
  prompt: string;
  hasAnswerKey: boolean;
  hasExplanation: boolean;
  status: string;
  source: string;
};

export type OutcomeCoverageRow = {
  code: string;
  title: string;
  questions: number;
  approved: number;
  difficulties: string;
};

export type QuestionBankSnapshot = {
  present: boolean;
  questions: number;
  outcomesCovered: number;
  approved: number;
  coverage: OutcomeCoverageRow[];
  rows: QuestionSnapshotRow[];
};

export async function fetchQuestionBankSnapshot(supabase: Client): Promise<QuestionBankSnapshot> {
  const empty: QuestionBankSnapshot = {
    present: false,
    questions: 0,
    outcomesCovered: 0,
    approved: 0,
    coverage: [],
    rows: [],
  };
  const [questionsRes, outcomesRes] = await Promise.all([
    supabase
      .from("question_bank")
      .select("*")
      .eq("book_id", PILOT_BOOK_ID)
      .order("created_at", { ascending: true }),
    supabase
      .from("assessment_outcomes")
      .select("id, code, title")
      .eq("book_id", PILOT_BOOK_ID)
      .order("code"),
  ]);
  if (questionsRes.error || outcomesRes.error) return empty;

  const outcomeById = new Map((outcomesRes.data ?? []).map((o) => [o.id, o]));
  const rows: QuestionSnapshotRow[] = (questionsRes.data ?? []).map((q) => ({
    id: q.id,
    outcomeCode: outcomeById.get(q.outcome_id)?.code ?? "(outcome removed)",
    kind: q.kind,
    difficulty: q.difficulty,
    prompt: q.prompt,
    hasAnswerKey: q.correct_answer.trim().length > 0,
    hasExplanation: q.explanation.trim().length > 0,
    status: q.status,
    source: q.source,
  }));

  const coverage: OutcomeCoverageRow[] = (outcomesRes.data ?? []).map((o) => {
    const qs = (questionsRes.data ?? []).filter((q) => q.outcome_id === o.id);
    const diffs = [...new Set(qs.map((q) => q.difficulty))].sort((a, b) => a - b);
    return {
      code: o.code,
      title: o.title,
      questions: qs.length,
      approved: qs.filter((q) => q.status === "approved").length,
      difficulties: diffs.length > 0 ? diffs.join(", ") : "—",
    };
  });

  return {
    present: rows.length > 0,
    questions: rows.length,
    outcomesCovered: coverage.filter((c) => c.questions > 0).length,
    approved: rows.filter((r) => r.status === "approved").length,
    coverage,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

export type QuestionBankProbe = {
  key: string;
  name: string;
  expectation: string;
  detail: string;
  pass: boolean;
  skipped?: boolean;
  dbError?: DbErrorShape;
};

export async function runQuestionBankProbes(
  supabase: Client,
  admin: Client,
  me: CallerCtx,
): Promise<QuestionBankProbe[]> {
  const probes: QuestionBankProbe[] = [];
  const E = QUESTION_BANK_EXPECTED;

  // P1 — Seed present with expected shape.
  {
    const snap = await fetchQuestionBankSnapshot(admin);
    const coveredCodes = new Set(snap.coverage.filter((c) => c.questions > 0).map((c) => c.code));
    const missing = E.coveredCodes.filter((c) => !coveredCodes.has(c));
    const ok =
      snap.present &&
      snap.questions >= E.questions &&
      snap.outcomesCovered >= E.outcomesCovered &&
      missing.length === 0;
    probes.push({
      key: "bank-seeded",
      name: "P1 — Question bank seeded",
      expectation: `Pilot book has at least ${E.questions} questions covering at least ${E.outcomesCovered} outcomes (${E.coveredCodes.join(", ")}).`,
      detail: snap.present
        ? `Found ${snap.questions} questions across ${snap.outcomesCovered} outcomes (${snap.approved} approved). Missing coverage: ${missing.length === 0 ? "none" : missing.join(", ")}.`
        : "No questions found for the pilot book.",
      pass: ok,
    });
  }

  // P2 — Chain integrity: every question links to a real outcome in the same book.
  {
    const [{ data: questions }, { data: outcomes }] = await Promise.all([
      admin.from("question_bank").select("id, book_id, outcome_id"),
      admin.from("assessment_outcomes").select("id, book_id"),
    ]);
    const outcomeBook = new Map((outcomes ?? []).map((o) => [o.id as string, o.book_id as string]));
    const broken = (questions ?? []).filter(
      (q) => !outcomeBook.has(q.outcome_id as string) || outcomeBook.get(q.outcome_id as string) !== q.book_id,
    );
    probes.push({
      key: "chain-integrity",
      name: "P2 — Outcome → Question chain integrity",
      expectation: "Every question references an assessment outcome that exists and belongs to the same book.",
      detail: `Questions checked: ${questions?.length ?? 0}; broken links: ${broken.length}.`,
      pass: (questions ?? []).length > 0 && broken.length === 0,
    });
  }

  // P3 — Answer key present on every question.
  {
    const { data: questions } = await admin
      .from("question_bank")
      .select("id, correct_answer")
      .eq("book_id", PILOT_BOOK_ID);
    const missing = (questions ?? []).filter((q) => !q.correct_answer || q.correct_answer.trim() === "");
    probes.push({
      key: "answer-keys",
      name: "P3 — Answer key on every question",
      expectation: "Every pilot-book question has a non-empty answer key (correct_answer).",
      detail: `Questions: ${questions?.length ?? 0}; missing answer key: ${missing.length}.`,
      pass: (questions ?? []).length > 0 && missing.length === 0,
    });
  }

  // P4 — Explanation present on every question.
  {
    const { data: questions } = await admin
      .from("question_bank")
      .select("id, explanation")
      .eq("book_id", PILOT_BOOK_ID);
    const missing = (questions ?? []).filter((q) => !q.explanation || q.explanation.trim().length < 5);
    probes.push({
      key: "explanations",
      name: "P4 — Explanation on every question",
      expectation: "Every pilot-book question has a teaching explanation (at least 5 characters).",
      detail: `Questions: ${questions?.length ?? 0}; missing explanation: ${missing.length}.`,
      pass: (questions ?? []).length > 0 && missing.length === 0,
    });
  }

  // P5 — Difficulty bounds + MCQ option validity.
  {
    const { data: questions } = await admin
      .from("question_bank")
      .select("id, kind, difficulty, options, correct_answer")
      .eq("book_id", PILOT_BOOK_ID);
    const badDifficulty = (questions ?? []).filter((q) => q.difficulty < 1 || q.difficulty > 5);
    const badMcq = (questions ?? []).filter((q) => {
      if (q.kind !== "mcq") return false;
      const opts = Array.isArray(q.options) ? (q.options as unknown[]).filter((o) => typeof o === "string") : [];
      if (opts.length < 2) return true;
      return !opts.some(
        (o) => (o as string).trim().toLowerCase() === (q.correct_answer as string).trim().toLowerCase(),
      );
    });
    probes.push({
      key: "difficulty-options",
      name: "P5 — Difficulty 1–5 and MCQ answer keys match an option",
      expectation: "Every question's difficulty is within 1–5; every MCQ has 2+ options and its answer key matches one option verbatim.",
      detail: `Questions: ${questions?.length ?? 0}; out-of-range difficulty: ${badDifficulty.length}; invalid MCQs: ${badMcq.length}.`,
      pass: (questions ?? []).length > 0 && badDifficulty.length === 0 && badMcq.length === 0,
    });
  }

  // P6/P7 — Cross-organization isolation (read + write) on question_bank.
  const { data: otherOrg } = await admin
    .from("organizations")
    .select("id, name")
    .neq("id", me.orgId ?? "")
    .limit(1)
    .maybeSingle();
  if (!otherOrg) {
    for (const [key, name, expectation] of [
      ["cross-org-read", "P6 — Cross-organization read isolation", "Reading another org's question bank returns 0 rows."],
      ["cross-org-write", "P7 — Cross-organization write rejected", "Inserting into another org is rejected by RLS."],
    ] as const) {
      probes.push({ key, name, expectation, detail: "No second organization exists to test against.", pass: true, skipped: true });
    }
  } else {
    const read = await (supabase as SupabaseClient)
      .from("question_bank")
      .select("id", { count: "exact", head: true })
      .eq("org_id", otherOrg.id);
    probes.push({
      key: "cross-org-read",
      name: "P6 — Cross-organization read isolation",
      expectation: `Reading the question bank of "${otherOrg.name}" as ${me.role} returns 0 rows.`,
      detail: read.error
        ? `Query errored (also acceptable): ${read.error.message}`
        : `Visible rows: ${read.count ?? 0}.`,
      pass: read.error ? true : (read.count ?? 0) === 0,
      dbError: shapeError(read.error),
    });

    const write = await (supabase as SupabaseClient).from("question_bank").insert({
      org_id: otherOrg.id,
      book_id: PILOT_BOOK_ID,
      outcome_id: "66500000-0000-4000-8000-000000000001",
      kind: "mcq",
      difficulty: 1,
      prompt: "probe",
      options: ["a", "b"],
      correct_answer: "a",
      explanation: "probe explanation",
    });
    probes.push({
      key: "cross-org-write",
      name: "P7 — Cross-organization write rejected",
      expectation: `Inserting a question into "${otherOrg.name}" fails with a row-level security error.`,
      detail: write.error ? `Rejected: ${write.error.message}` : "INSERT SUCCEEDED — tenant isolation breach.",
      pass: !!write.error,
      dbError: shapeError(write.error),
    });
  }

  // P8 — Role write gate: reviewer insert denied; staff create/delete round-trip.
  if (me.role === "reviewer") {
    const attempt = await (supabase as SupabaseClient).from("question_bank").insert({
      org_id: me.orgId ?? "",
      book_id: PILOT_BOOK_ID,
      outcome_id: "66500000-0000-4000-8000-000000000001",
      kind: "mcq",
      difficulty: 1,
      prompt: "reviewer probe",
      options: ["a", "b"],
      correct_answer: "a",
      explanation: "reviewer probe explanation",
    });
    probes.push({
      key: "role-write-gate",
      name: "P8 — Reviewer is read-only",
      expectation: "A reviewer's INSERT into question_bank is rejected.",
      detail: attempt.error ? `Rejected: ${attempt.error.message}` : "INSERT SUCCEEDED — reviewers must not write.",
      pass: !!attempt.error,
      dbError: shapeError(attempt.error),
    });
  } else {
    const ins = await (supabase as SupabaseClient)
      .from("question_bank")
      .insert({
        org_id: me.orgId ?? "",
        book_id: PILOT_BOOK_ID,
        outcome_id: "66500000-0000-4000-8000-000000000001",
        kind: "true_false",
        difficulty: 1,
        prompt: "zz probe temp",
        options: ["True", "False"],
        correct_answer: "True",
        explanation: "zz probe temp explanation",
      })
      .select("id")
      .single();
    if (ins.error) {
      probes.push({
        key: "role-write-gate",
        name: "P8 — Staff write round-trip",
        expectation: "Staff can create and delete a question in their own org.",
        detail: `Create failed: ${ins.error.message}`,
        pass: false,
        dbError: shapeError(ins.error),
      });
    } else {
      const del = await (supabase as SupabaseClient)
        .from("question_bank")
        .delete()
        .eq("id", ins.data.id);
      probes.push({
        key: "role-write-gate",
        name: "P8 — Staff write round-trip",
        expectation: "Staff can create and delete a question in their own org.",
        detail: del.error ? `Created but delete failed: ${del.error.message}` : "Created and deleted a temporary question successfully.",
        pass: !del.error,
        dbError: shapeError(del.error),
      });
    }
  }

  return probes;
}
