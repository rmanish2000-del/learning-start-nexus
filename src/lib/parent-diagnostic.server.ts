// ₹199 Diagnostic MVP — server-only implementation.
//
// The parent journey is unauthenticated by design (pay first, account after),
// so every read and write here runs through the service-role client and is
// authorised by a single unguessable per-order access token. Nothing on this
// path trusts a client-supplied price, question list, or entitlement.
//
// Payment is SIMULATED in this MVP: `confirmDiagnosticPayment` stands in for
// the Razorpay `payment.captured` webhook and is the only writer of
// entitlements. Swapping in the real webhook means replacing that one call
// site — the entitlement, provisioning, and scoring code is unchanged.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildDiagnosticPlan, type EngineOutcome } from "./diagnostic-shared";
import {
  DIAGNOSTIC_QUESTION_MINIMUM,
  DIAGNOSTIC_QUESTION_TARGET,
  PRICING,
  buildDiagnosticReport,
  upgradeOffer,
  withMarksAtRisk,
  type DiagnosticReport,
  type GradedItem,
  type UpgradeOffer,
} from "./parent-diagnostic-shared";

const NO_ROWS = ["00000000-0000-4000-8000-000000000000"];

function token(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "").slice(0, 32);
}

function orderRef(): string {
  return `EDU${Date.now().toString(36).toUpperCase()}${token().slice(0, 6).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Catalogue — imported Class 10 content only
// ---------------------------------------------------------------------------

export type CatalogUnit = {
  unitId: string;
  title: string;
  outcomes: number;
  approvedQuestions: number;
  questionCount: number;
};

export type CatalogSubject = {
  bookId: string;
  board: string;
  grade: number;
  subject: string;
  bookTitle: string;
  units: CatalogUnit[];
};

export async function fetchDiagnosticCatalog(): Promise<CatalogSubject[]> {
  // Only books whose bank was produced by the validated Class 10 import.
  const { data: imported, error: impError } = await supabaseAdmin
    .from("question_bank")
    .select("book_id")
    .eq("source", "import")
    .eq("status", "approved");
  if (impError) throw new Error(impError.message);
  const importedBookIds = [...new Set((imported ?? []).map((r) => r.book_id))];
  if (importedBookIds.length === 0) return [];

  const { data: books, error: bookError } = await supabaseAdmin
    .from("books")
    .select("id, title, board, grade, subject, archived_at")
    .in("id", importedBookIds)
    .eq("grade", 10)
    .is("archived_at", null);
  if (bookError) throw new Error(bookError.message);
  const bookIds = (books ?? []).map((b) => b.id);
  if (bookIds.length === 0) return [];

  const [unitsRes, outcomesRes, questionsRes] = await Promise.all([
    supabaseAdmin
      .from("curriculum_units")
      .select("id, book_id, title, position")
      .in("book_id", bookIds)
      .order("position"),
    supabaseAdmin
      .from("assessment_outcomes")
      .select("id, unit_id, book_id")
      .in("book_id", bookIds)
      .eq("status", "active"),
    supabaseAdmin
      .from("question_bank")
      .select("id, outcome_id")
      .in("book_id", bookIds)
      .eq("status", "approved"),
  ]);
  if (unitsRes.error) throw new Error(unitsRes.error.message);
  if (outcomesRes.error) throw new Error(outcomesRes.error.message);
  if (questionsRes.error) throw new Error(questionsRes.error.message);

  const approvedByOutcome = new Map<string, number>();
  for (const q of questionsRes.data ?? []) {
    approvedByOutcome.set(q.outcome_id, (approvedByOutcome.get(q.outcome_id) ?? 0) + 1);
  }
  const outcomesByUnit = new Map<string, string[]>();
  for (const o of outcomesRes.data ?? []) {
    const list = outcomesByUnit.get(o.unit_id) ?? [];
    list.push(o.id);
    outcomesByUnit.set(o.unit_id, list);
  }

  return (books ?? [])
    .map((b) => {
      const units = (unitsRes.data ?? [])
        .filter((u) => u.book_id === b.id)
        .map((u) => {
          const outcomeIds = outcomesByUnit.get(u.id) ?? [];
          const approved = outcomeIds.reduce((s, id) => s + (approvedByOutcome.get(id) ?? 0), 0);
          return {
            unitId: u.id,
            title: u.title,
            outcomes: outcomeIds.length,
            approvedQuestions: approved,
            questionCount: Math.min(DIAGNOSTIC_QUESTION_TARGET, approved),
          };
        })
        .filter((u) => u.approvedQuestions >= DIAGNOSTIC_QUESTION_MINIMUM);
      return {
        bookId: b.id,
        board: b.board ?? "CBSE",
        grade: b.grade,
        subject: b.subject,
        bookTitle: b.title,
        units,
      };
    })
    .filter((b) => b.units.length > 0)
    .sort((a, b) => (a.subject < b.subject ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type PublicOrder = {
  orderRef: string;
  purpose: string;
  status: string;
  amountPaise: number;
  board: string | null;
  grade: number | null;
  subject: string | null;
  unitTitle: string | null;
  childFirstName: string | null;
  accessToken: string | null;
  hasSession: boolean;
  paidAt: string | null;
};

type OrderRow = {
  id: string;
  order_ref: string;
  access_token: string;
  purpose: string;
  status: string;
  amount_paise: number;
  board: string | null;
  grade: number | null;
  subject: string | null;
  book_id: string | null;
  unit_id: string | null;
  child_first_name: string | null;
  contact_email: string | null;
  org_id: string | null;
  learner_id: string | null;
  assessment_id: string | null;
  session_id: string | null;
  parent_order_id: string | null;
  paid_at: string | null;
};

async function loadOrderByRef(ref: string): Promise<OrderRow> {
  const { data, error } = await supabaseAdmin
    .from("parent_orders")
    .select(
      "id, order_ref, access_token, purpose, status, amount_paise, board, grade, subject, book_id, unit_id, child_first_name, contact_email, org_id, learner_id, assessment_id, session_id, parent_order_id, paid_at",
    )
    .eq("order_ref", ref)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Order not found.");
  return data as OrderRow;
}

async function loadOrderByToken(accessToken: string): Promise<OrderRow> {
  const { data, error } = await supabaseAdmin
    .from("parent_orders")
    .select(
      "id, order_ref, access_token, purpose, status, amount_paise, board, grade, subject, book_id, unit_id, child_first_name, contact_email, org_id, learner_id, assessment_id, session_id, parent_order_id, paid_at",
    )
    .eq("access_token", accessToken)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This diagnostic link is not valid.");
  return data as OrderRow;
}

async function unitTitle(unitId: string | null): Promise<string | null> {
  if (!unitId) return null;
  const { data } = await supabaseAdmin.from("curriculum_units").select("title").eq("id", unitId).maybeSingle();
  return data?.title ?? null;
}

async function toPublicOrder(row: OrderRow): Promise<PublicOrder> {
  return {
    orderRef: row.order_ref,
    purpose: row.purpose,
    status: row.status,
    amountPaise: row.amount_paise,
    board: row.board,
    grade: row.grade,
    subject: row.subject,
    unitTitle: await unitTitle(row.unit_id),
    childFirstName: row.child_first_name,
    accessToken: row.status === "paid" ? row.access_token : null,
    hasSession: row.session_id != null,
    paidAt: row.paid_at,
  };
}

export async function createDiagnosticOrder(input: {
  bookId: string;
  unitId: string;
  utm?: Record<string, string> | undefined;
}): Promise<PublicOrder> {
  const { data: book, error: bookError } = await supabaseAdmin
    .from("books")
    .select("id, org_id, board, grade, subject, archived_at")
    .eq("id", input.bookId)
    .maybeSingle();
  if (bookError) throw new Error(bookError.message);
  if (!book || book.archived_at) throw new Error("That subject is not available.");
  if (book.grade !== 10) throw new Error("Only Class 10 diagnostics are on sale.");

  const { data: unit, error: unitError } = await supabaseAdmin
    .from("curriculum_units")
    .select("id, title")
    .eq("id", input.unitId)
    .eq("book_id", input.bookId)
    .maybeSingle();
  if (unitError) throw new Error(unitError.message);
  if (!unit) throw new Error("That chapter group is not available.");

  const { data, error } = await supabaseAdmin
    .from("parent_orders")
    .insert({
      order_ref: orderRef(),
      access_token: token(),
      purpose: "diagnostic",
      // Price is server-set. The client cannot pass an amount.
      amount_paise: PRICING.diagnosticPaise,
      status: "created",
      board: book.board ?? "CBSE",
      grade: book.grade,
      subject: book.subject,
      book_id: book.id,
      unit_id: unit.id,
      org_id: book.org_id,
      utm: input.utm ?? {},
    })
    .select(
      "id, order_ref, access_token, purpose, status, amount_paise, board, grade, subject, book_id, unit_id, child_first_name, contact_email, org_id, learner_id, assessment_id, session_id, parent_order_id, paid_at",
    )
    .single();
  if (error) throw new Error(error.message);
  return toPublicOrder(data as OrderRow);
}

export async function getOrder(ref: string): Promise<PublicOrder> {
  return toPublicOrder(await loadOrderByRef(ref));
}

// Stand-in for the Razorpay `payment.captured` webhook. Idempotent: a replay
// grants nothing twice.
export async function confirmDiagnosticPayment(input: {
  orderRef: string;
  outcome: "success" | "failure";
}): Promise<PublicOrder> {
  const row = await loadOrderByRef(input.orderRef);

  if (input.outcome === "failure") {
    if (row.status === "created") {
      await supabaseAdmin.from("parent_orders").update({ status: "failed" }).eq("id", row.id);
    }
    return toPublicOrder(await loadOrderByRef(input.orderRef));
  }

  if (row.status !== "paid") {
    const paidAt = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("parent_orders")
      .update({
        status: "paid",
        paid_at: paidAt,
        provider: "simulated",
        provider_payment_ref: `sim_${token().slice(0, 12)}`,
      })
      .eq("id", row.id)
      .eq("status", "created");
    if (error) throw new Error(error.message);

    const kind = row.purpose === "diagnostic" ? "diagnostic_credit" : "board_success_plan";
    const { data: existing } = await supabaseAdmin
      .from("parent_entitlements")
      .select("id")
      .eq("order_id", row.id)
      .eq("kind", kind)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("parent_entitlements").insert({
        order_id: row.id,
        learner_id: row.learner_id,
        kind,
        granted_at: paidAt,
        expires_at:
          kind === "board_success_plan" ? new Date(Date.now() + 365 * 86_400_000).toISOString() : null,
      });
    }

    if (kind === "board_success_plan" && row.parent_order_id) {
      // The ₹199 credit was applied to this invoice — burn it.
      const { data: credit } = await supabaseAdmin
        .from("parent_entitlements")
        .select("id, consumed_at")
        .eq("order_id", row.parent_order_id)
        .eq("kind", "diagnostic_credit")
        .maybeSingle();
      if (credit && !credit.consumed_at) {
        await supabaseAdmin
          .from("parent_entitlements")
          .update({ consumed_at: paidAt })
          .eq("id", credit.id)
          .is("consumed_at", null);
      }
    }
  }

  return toPublicOrder(await loadOrderByRef(input.orderRef));
}

// ---------------------------------------------------------------------------
// Provisioning: learner + curriculum-mapped diagnostic + session
// ---------------------------------------------------------------------------

async function generateParentDiagnostic(row: OrderRow, learnerName: string): Promise<{
  assessmentId: string;
  questionCount: number;
}> {
  const bookId = row.book_id!;
  const unitId = row.unit_id!;

  const [bookRes, unitRes, outcomesRes, questionsRes] = await Promise.all([
    supabaseAdmin.from("books").select("id, grade, subject").eq("id", bookId).single(),
    supabaseAdmin.from("curriculum_units").select("id, title").eq("id", unitId).single(),
    supabaseAdmin
      .from("assessment_outcomes")
      .select("id, code, title, category, bloom_level, difficulty, diagnostic_weight, status")
      .eq("book_id", bookId)
      .eq("unit_id", unitId)
      .eq("status", "active")
      .order("code"),
    supabaseAdmin
      .from("question_bank")
      .select("id, outcome_id, kind, difficulty, prompt")
      .eq("book_id", bookId)
      .eq("status", "approved"),
  ]);
  if (outcomesRes.error) throw new Error(outcomesRes.error.message);
  if (questionsRes.error) throw new Error(questionsRes.error.message);

  const byOutcome = new Map<string, EngineOutcome["questions"]>();
  for (const q of questionsRes.data ?? []) {
    const list = byOutcome.get(q.outcome_id) ?? [];
    list.push({ id: q.id, kind: q.kind, difficulty: q.difficulty, prompt: q.prompt });
    byOutcome.set(q.outcome_id, list);
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
    questions: byOutcome.get(o.id) ?? [],
  }));

  const available = outcomes.reduce((s, o) => s + o.questions.length, 0);
  const total = Math.min(DIAGNOSTIC_QUESTION_TARGET, available);
  if (total < DIAGNOSTIC_QUESTION_MINIMUM) {
    throw new Error("This chapter group does not have enough approved questions yet.");
  }

  // Same blueprint allocation as the centre-side engine: largest remainder on
  // diagnostic_weight, deterministic question order.
  const plan = buildDiagnosticPlan({ template: "diagnostic", outcomes, totalQuestions: total });

  const { data: assessment, error: aError } = await supabaseAdmin
    .from("assessments")
    .insert({
      org_id: row.org_id!,
      title: `${unitRes.data!.title} — Parent Diagnostic (${learnerName})`,
      description: `₹199 parent diagnostic generated from blueprint weights. Order ${row.order_ref}. Coverage ${plan.compliance.actualCoveragePct}%.`,
      subject: bookRes.data!.subject,
      topic: unitRes.data!.title,
      grade: bookRes.data!.grade,
      kind: "diagnostic",
      status: "published",
      book_id: bookId,
      unit_id: unitId,
    })
    .select("id")
    .single();
  if (aError) throw new Error(aError.message);

  const rows = plan.plannedQuestionIds.map((id, i) => ({
    assessment_id: assessment.id,
    question_id: id,
    sort_order: i + 1,
    points: 1,
  }));
  const { error: mapError } = await supabaseAdmin.from("assessment_question_map").insert(rows);
  if (mapError) {
    await supabaseAdmin.from("assessments").delete().eq("id", assessment.id);
    throw new Error(mapError.message);
  }

  await supabaseAdmin.from("book_events").insert({
    org_id: row.org_id!,
    book_id: bookId,
    event: "parent_diagnostic_generated",
    detail: { orderRef: row.order_ref, assessmentId: assessment.id, questions: rows.length },
  });

  return { assessmentId: assessment.id, questionCount: rows.length };
}

export async function setupDiagnostic(input: {
  orderRef: string;
  childFirstName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
}): Promise<{ accessToken: string }> {
  const row = await loadOrderByRef(input.orderRef);
  if (row.status !== "paid") throw new Error("This order has not been paid yet.");
  if (row.session_id) return { accessToken: row.access_token };
  if (!row.book_id || !row.unit_id || !row.org_id) throw new Error("This order is missing its curriculum selection.");

  // The account is created here, from the contact details captured at payment.
  const { data: learner, error: lError } = await supabaseAdmin
    .from("learners")
    .insert({
      org_id: row.org_id,
      full_name: input.childFirstName,
      handle: `pd-${row.access_token.slice(0, 10)}`,
      grade: row.grade ?? 10,
      subject: row.subject ?? "Mathematics",
      status: "active",
      mastery_score: 0,
      focus_note: `Parent-purchased diagnostic (${row.order_ref}).`,
      is_demo: false,
    })
    .select("id")
    .single();
  if (lError) throw new Error(lError.message);

  const generated = await generateParentDiagnostic(row, input.childFirstName);

  const { data: session, error: sError } = await supabaseAdmin
    .from("assessment_sessions")
    .insert({
      org_id: row.org_id,
      assessment_id: generated.assessmentId,
      learner_id: learner.id,
      status: "in_progress",
      answers: {},
      current_position: 0,
      started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (sError) throw new Error(sError.message);

  const { error: uError } = await supabaseAdmin
    .from("parent_orders")
    .update({
      child_first_name: input.childFirstName,
      contact_name: input.parentName,
      contact_email: input.parentEmail,
      contact_phone: input.parentPhone,
      learner_id: learner.id,
      assessment_id: generated.assessmentId,
      session_id: session.id,
    })
    .eq("id", row.id);
  if (uError) throw new Error(uError.message);

  await supabaseAdmin
    .from("parent_entitlements")
    .update({ learner_id: learner.id })
    .eq("order_id", row.id)
    .is("learner_id", null);

  return { accessToken: row.access_token };
}

// ---------------------------------------------------------------------------
// Running the diagnostic
// ---------------------------------------------------------------------------

type BankQuestion = {
  id: string;
  outcome_id: string;
  kind: string;
  difficulty: number;
  prompt: string;
  stimulus: string | null;
  options: unknown;
  correct_answer: string;
  explanation: string;
};

async function loadQuestions(assessmentId: string): Promise<{
  questions: BankQuestion[];
  outcomes: Map<string, { code: string; title: string; weight: number; strategy: string }>;
}> {
  const { data: map, error } = await supabaseAdmin
    .from("assessment_question_map")
    .select("sort_order, question_bank(id, outcome_id, kind, difficulty, prompt, stimulus, options, correct_answer, explanation)")
    .eq("assessment_id", assessmentId)
    .order("sort_order");
  if (error) throw new Error(error.message);

  const questions = (map ?? []).map((r) => r.question_bank as unknown as BankQuestion);
  const outcomeIds = [...new Set(questions.map((q) => q.outcome_id))];
  const [outcomesRes, mapRes] = await Promise.all([
    supabaseAdmin
      .from("assessment_outcomes")
      .select("id, code, title, diagnostic_weight")
      .in("id", outcomeIds.length > 0 ? outcomeIds : NO_ROWS),
    supabaseAdmin
      .from("intervention_map")
      .select("assessment_outcome_id, recommended_intervention, priority")
      .in("assessment_outcome_id", outcomeIds.length > 0 ? outcomeIds : NO_ROWS)
      .order("priority"),
  ]);
  if (outcomesRes.error) throw new Error(outcomesRes.error.message);

  const strategyByOutcome = new Map<string, string>();
  for (const r of mapRes.data ?? []) {
    if (!strategyByOutcome.has(r.assessment_outcome_id)) {
      strategyByOutcome.set(r.assessment_outcome_id, r.recommended_intervention);
    }
  }

  const outcomes = new Map(
    (outcomesRes.data ?? []).map((o) => [
      o.id,
      {
        code: o.code,
        title: o.title,
        weight: o.diagnostic_weight,
        strategy:
          strategyByOutcome.get(o.id) ??
          "Re-teach the outcome with worked examples, then re-check on fresh items.",
      },
    ]),
  );

  return { questions, outcomes };
}

export type RunQuestion = {
  id: string;
  kind: string;
  prompt: string;
  stimulus: string | null;
  options: string[] | null;
  outcomeCode: string;
};

export type DiagnosticRun = {
  order: PublicOrder;
  childFirstName: string;
  subject: string;
  unitTitle: string;
  status: string;
  currentPosition: number;
  answers: Record<string, string>;
  questions: RunQuestion[];
};

export async function loadRun(accessToken: string): Promise<DiagnosticRun> {
  const row = await loadOrderByToken(accessToken);
  if (!row.session_id || !row.assessment_id) throw new Error("This diagnostic has not been set up yet.");

  const { data: session, error } = await supabaseAdmin
    .from("assessment_sessions")
    .select("id, status, answers, current_position")
    .eq("id", row.session_id)
    .single();
  if (error) throw new Error(error.message);

  const { questions, outcomes } = await loadQuestions(row.assessment_id);

  return {
    order: await toPublicOrder(row),
    childFirstName: row.child_first_name ?? "Your child",
    subject: row.subject ?? "",
    unitTitle: (await unitTitle(row.unit_id)) ?? "",
    status: session.status,
    currentPosition: session.current_position,
    answers: (session.answers as Record<string, string>) ?? {},
    // Answers and explanations never leave the server before submission.
    questions: questions.map((q) => ({
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      stimulus: q.stimulus,
      options: (q.options as string[] | null) ?? null,
      outcomeCode: outcomes.get(q.outcome_id)?.code ?? "—",
    })),
  };
}

export async function saveRunAnswer(input: {
  token: string;
  questionId: string;
  answer: string;
  position: number;
}): Promise<{ saved: true }> {
  const row = await loadOrderByToken(input.token);
  if (!row.session_id) throw new Error("This diagnostic has not been set up yet.");

  const { data: session, error } = await supabaseAdmin
    .from("assessment_sessions")
    .select("id, status, answers")
    .eq("id", row.session_id)
    .single();
  if (error) throw new Error(error.message);
  if (session.status === "submitted") throw new Error("This diagnostic has already been submitted.");

  const answers = { ...((session.answers as Record<string, string>) ?? {}), [input.questionId]: input.answer };
  const { error: uError } = await supabaseAdmin
    .from("assessment_sessions")
    .update({ answers, current_position: input.position, last_activity_at: new Date().toISOString() })
    .eq("id", session.id);
  if (uError) throw new Error(uError.message);
  return { saved: true };
}

// ---------------------------------------------------------------------------
// Scoring + gap analysis
// ---------------------------------------------------------------------------

function isCorrect(given: string | undefined, expected: string): boolean {
  if (given == null) return false;
  return given.trim().toLowerCase() === expected.trim().toLowerCase();
}

export async function submitRun(accessToken: string): Promise<{ accessToken: string }> {
  const row = await loadOrderByToken(accessToken);
  if (!row.session_id || !row.assessment_id) throw new Error("This diagnostic has not been set up yet.");

  const { data: session, error } = await supabaseAdmin
    .from("assessment_sessions")
    .select("id, status, answers")
    .eq("id", row.session_id)
    .single();
  if (error) throw new Error(error.message);
  if (session.status === "submitted") return { accessToken };

  const answers = (session.answers as Record<string, string>) ?? {};
  const { questions, outcomes } = await loadQuestions(row.assessment_id);

  const graded: GradedItem[] = questions.map((q) => {
    const meta = outcomes.get(q.outcome_id);
    return {
      questionId: q.id,
      outcomeId: q.outcome_id,
      code: meta?.code ?? "—",
      title: meta?.title ?? "Outcome",
      weight: meta?.weight ?? 0,
      interventionStrategy: meta?.strategy ?? "",
      prompt: q.prompt,
      correct: isCorrect(answers[q.id], q.correct_answer),
      answered: answers[q.id] != null && answers[q.id] !== "",
    };
  });

  const report = withMarksAtRisk(buildDiagnosticReport(graded));
  const submittedAt = new Date().toISOString();

  const { error: uError } = await supabaseAdmin
    .from("assessment_sessions")
    .update({
      status: "submitted",
      submitted_at: submittedAt,
      score_pct: report.scorePct,
      correct_count: report.correctQuestions,
      total_count: report.totalQuestions,
      result: JSON.parse(JSON.stringify(report)),
      last_activity_at: submittedAt,
    })
    .eq("id", session.id)
    .neq("status", "submitted");
  if (uError) throw new Error(uError.message);

  // Persist the gaps so the rest of the platform (interventions, tutor,
  // reassessment) sees exactly what the parent was shown.
  if (report.gaps.length > 0 && row.learner_id && row.org_id) {
    await supabaseAdmin.from("learning_gaps").insert(
      report.gaps.map((g) => ({
        org_id: row.org_id!,
        learner_id: row.learner_id!,
        session_id: session.id,
        subject: row.subject ?? "",
        topic: (report.outcomes.find((o) => o.outcomeId === g.outcomeId)?.title ?? g.title).slice(0, 200),
        subtopic: `${g.code} — ${g.title}`.slice(0, 200),
        items_total: g.questionsTotal,
        items_correct: g.questionsTotal - g.questionsMissed,
        gap_score_pct: g.pct,
        severity: g.severity === "moderate" ? "medium" : g.severity,
        status: "open",
        detected_at: submittedAt,
        first_detected_at: submittedAt,
      })),
    );
  }

  // The credit is consumed at submission, never at start — an abandoned
  // attempt stays resumable.
  await supabaseAdmin
    .from("parent_entitlements")
    .update({ consumed_at: submittedAt })
    .eq("order_id", row.id)
    .eq("kind", "diagnostic_credit")
    .is("consumed_at", null);

  await supabaseAdmin
    .from("learners")
    .update({ mastery_score: report.scorePct })
    .eq("id", row.learner_id ?? "");

  return { accessToken };
}

export type ParentReport = {
  order: PublicOrder;
  childFirstName: string;
  subject: string;
  unitTitle: string;
  submitted: boolean;
  report: DiagnosticReport | null;
  offer: UpgradeOffer;
  planPurchased: boolean;
  planOrderRef: string | null;
};

export async function loadReport(accessToken: string): Promise<ParentReport> {
  const row = await loadOrderByToken(accessToken);
  if (!row.session_id) throw new Error("This diagnostic has not been set up yet.");

  const { data: session, error } = await supabaseAdmin
    .from("assessment_sessions")
    .select("id, status, result")
    .eq("id", row.session_id)
    .single();
  if (error) throw new Error(error.message);

  const [{ data: credit }, { data: planOrders }] = await Promise.all([
    supabaseAdmin
      .from("parent_entitlements")
      .select("consumed_at")
      .eq("order_id", row.id)
      .eq("kind", "diagnostic_credit")
      .maybeSingle(),
    supabaseAdmin
      .from("parent_orders")
      .select("order_ref, status")
      .eq("parent_order_id", row.id)
      .eq("purpose", "board_success_plan"),
  ]);

  const paidPlan = (planOrders ?? []).find((o) => o.status === "paid") ?? null;

  return {
    order: await toPublicOrder(row),
    childFirstName: row.child_first_name ?? "Your child",
    subject: row.subject ?? "",
    unitTitle: (await unitTitle(row.unit_id)) ?? "",
    submitted: session.status === "submitted",
    report: (session.result as unknown as DiagnosticReport | null) ?? null,
    // The credit reduces the first invoice only inside the 30-day window and
    // only while it is unredeemed — computed here, re-computed before charge.
    offer: upgradeOffer({
      diagnosticPaidAt: row.paid_at,
      creditConsumed: paidPlan != null,
      now: new Date(),
    }),
    planPurchased: paidPlan != null,
    planOrderRef: paidPlan?.order_ref ?? null,
  };
}

// ---------------------------------------------------------------------------
// Upgrade — ₹2,999 Board Success Plan
// ---------------------------------------------------------------------------

export async function createUpgradeOrder(accessToken: string): Promise<PublicOrder> {
  const row = await loadOrderByToken(accessToken);
  if (row.purpose !== "diagnostic") throw new Error("Upgrade must start from a diagnostic order.");

  const { data: existing } = await supabaseAdmin
    .from("parent_orders")
    .select("order_ref, status")
    .eq("parent_order_id", row.id)
    .eq("purpose", "board_success_plan");
  const paid = (existing ?? []).find((o) => o.status === "paid");
  if (paid) return getOrder(paid.order_ref);

  // Amount is derived server-side from the offer rules — never from the page.
  // No paid plan exists at this point (we returned above), so the ₹199 credit
  // is unredeemed; only the 30-day window can withdraw it.
  const offer = upgradeOffer({ diagnosticPaidAt: row.paid_at, creditConsumed: false });

  const { data, error } = await supabaseAdmin
    .from("parent_orders")
    .insert({
      order_ref: orderRef(),
      access_token: token(),
      purpose: "board_success_plan",
      amount_paise: offer.firstInvoicePaise,
      status: "created",
      board: row.board,
      grade: row.grade,
      subject: row.subject,
      book_id: row.book_id,
      unit_id: row.unit_id,
      org_id: row.org_id,
      learner_id: row.learner_id,
      child_first_name: row.child_first_name,
      contact_email: row.contact_email,
      parent_order_id: row.id,
    })
    .select(
      "id, order_ref, access_token, purpose, status, amount_paise, board, grade, subject, book_id, unit_id, child_first_name, contact_email, org_id, learner_id, assessment_id, session_id, parent_order_id, paid_at",
    )
    .single();
  if (error) throw new Error(error.message);
  return toPublicOrder(data as OrderRow);
}

export async function loadUpgradeView(accessToken: string): Promise<ParentReport> {
  return loadReport(accessToken);
}
