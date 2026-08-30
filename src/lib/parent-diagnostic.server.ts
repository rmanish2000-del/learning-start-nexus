// ₹199 Diagnostic MVP — server-only implementation.
//
// The parent journey is identity-first: a parent signs up, adds a student
// profile, and only then can an order be created. Every read and write runs
// through the service-role client but is authorised against the caller's
// auth user id — the per-order access token is a convenience handle, never
// the authorisation. Nothing on this path trusts a client-supplied price,
// question list, or entitlement.
//
// Payment runs on Razorpay. `markOrderPaid` is the only writer of
// entitlements and is reached by two idempotent paths: the signature-verified
// checkout handler and the signature-verified `payment.captured` webhook.

import { isSubjectPurchasable } from "./catalogue.server";
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

const ORDER_COLUMNS =
  "id, order_ref, access_token, purpose, status, amount_paise, board, grade, subject, book_id, unit_id, child_first_name, contact_email, contact_name, contact_phone, org_id, parent_user_id, learner_id, assessment_id, session_id, parent_order_id, paid_at";

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
      .eq("status", "approved")
      // Pilot content gate: a paid diagnostic may only ever show questions that
      // passed review. Unverified questions are invisible to the paid catalog.
      .eq("verification_state", "verified"),
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
  contact_name: string | null;
  contact_phone: string | null;
  org_id: string | null;
  parent_user_id: string | null;
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
      ORDER_COLUMNS,
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
      ORDER_COLUMNS,
    )
    .eq("access_token", accessToken)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This diagnostic link is not valid.");
  return data as OrderRow;
}

/**
 * Purchase ownership. Orders created by the identity-first flow always carry
 * parent_user_id; the caller must be that user. Legacy pre-migration orders
 * have no owner and stay reachable by their access token alone.
 */
function assertOrderOwner(row: OrderRow, userId: string | null): void {
  if (row.parent_user_id == null) return;
  if (row.parent_user_id !== userId) {
    throw new Error("Sign in with the account that bought this diagnostic.");
  }
}

/**
 * Answer ownership — the other half of the product law. The parent owns the
 * purchase and the report; the learner owns the attempt. Only the learner's own
 * authenticated student session may read the question paper or write an answer.
 * Enforced here so no client route, hidden button or direct RPC call can bypass
 * it, and a parent session is refused even though it owns the order.
 */
async function assertLearnerAnswerer(row: OrderRow, userId: string | null): Promise<{ fullName: string; handle: string }> {
  if (!row.learner_id) throw new Error("This diagnostic is not linked to a student profile yet.");
  const { data: learner, error } = await supabaseAdmin
    .from("learners")
    .select("id, full_name, handle, student_user_id")
    .eq("id", row.learner_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!learner) throw new Error("That student profile could not be found.");
  if (!userId || !learner.student_user_id || learner.student_user_id !== userId) {
    // Privacy: the learner's name may only be echoed back to the parent who
    // owns the order. Anyone else — another family's student, a stranger with
    // the link — gets a message that discloses nothing about the child.
    const ownerViewing = row.parent_user_id != null && row.parent_user_id === userId;
    throw new Error(
      ownerViewing
        ? `Only ${learner.full_name} can answer this diagnostic. Ask them to sign in as a student with their handle and PIN.`
        : "This diagnostic can only be answered by the student it was bought for. Ask them to sign in with their handle and PIN.",
    );
  }

  return { fullName: learner.full_name, handle: learner.handle };
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
  userId: string;
  learnerId: string;
  bookId: string;
  unitId: string;
  utm?: Record<string, string> | undefined;
}): Promise<PublicOrder> {
  // ---- Purchase guard: authenticated + parent + student + selected student
  const { assertStudentOwned, parentProfileExists } = await import("./parent-account.server");
  if (!(await parentProfileExists(input.userId))) {
    throw new Error("Complete your parent details before buying.");
  }
  await assertStudentOwned(input.userId, input.learnerId);

  const { data: learner, error: learnerError } = await supabaseAdmin
    .from("learners")
    .select("id, full_name")
    .eq("id", input.learnerId)
    .maybeSingle();
  if (learnerError) throw new Error(learnerError.message);
  if (!learner) throw new Error("That student profile could not be found.");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, phone")
    .eq("id", input.userId)
    .maybeSingle();

  const { data: book, error: bookError } = await supabaseAdmin
    .from("books")
    .select("id, org_id, board, grade, subject, archived_at, catalogue_subject_id")
    .eq("id", input.bookId)
    .maybeSingle();
  if (bookError) throw new Error(bookError.message);
  if (!book || book.archived_at) throw new Error("That subject is not available.");
  if (book.grade !== 10) throw new Error("Only Class 10 diagnostics are on sale.");
  // Wave 0: the catalogue is now the authority on what may be sold. The
  // explicit Class 10 guard above is kept deliberately — this check can only
  // ever refuse more, never less.
  if (
    book.catalogue_subject_id &&
    !(await isSubjectPurchasable(book.catalogue_subject_id))
  ) {
    throw new Error("That subject is not available.");
  }

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
      parent_user_id: input.userId,
      learner_id: learner.id,
      child_first_name: learner.full_name,
      contact_name: profile?.full_name ?? null,
      contact_phone: profile?.phone ?? null,
      utm: input.utm ?? {},
    })
    .select(ORDER_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toPublicOrder(data as OrderRow);
}

export async function getOrder(ref: string, userId: string | null = null): Promise<PublicOrder> {
  const row = await loadOrderByRef(ref);
  assertOrderOwner(row, userId);
  return toPublicOrder(row);
}

// ---------------------------------------------------------------------------
// Payment capture — Razorpay
// ---------------------------------------------------------------------------

// The single writer of entitlements. Idempotent: a replayed webhook or a
// double-clicked checkout grants nothing twice.
async function markOrderPaid(row: OrderRow, providerPaymentRef: string): Promise<void> {
  if (row.status === "paid") return;

  const paidAt = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("parent_orders")
    .update({
      status: "paid",
      paid_at: paidAt,
      provider: "razorpay",
      provider_payment_ref: providerPaymentRef,
      failure_reason: null,
    })
    .eq("id", row.id)
    .neq("status", "paid");
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
      parent_user_id: row.parent_user_id,
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

async function markOrderFailed(row: OrderRow, reason: string): Promise<void> {
  if (row.status === "paid") return;
  await supabaseAdmin
    .from("parent_orders")
    .update({ status: "failed", provider: "razorpay", failure_reason: reason.slice(0, 300) })
    .eq("id", row.id)
    .neq("status", "paid");
}

async function loadOrderByProviderOrderId(providerOrderId: string): Promise<OrderRow | null> {
  const { data, error } = await supabaseAdmin
    .from("parent_orders")
    .select(
      ORDER_COLUMNS,
    )
    .eq("provider_order_id", providerOrderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as OrderRow | null) ?? null;
}

export type CheckoutIntent = {
  orderRef: string;
  status: string;
  keyId: string;
  razorpayOrderId: string | null;
  amountPaise: number;
  currency: "INR";
  mode: "test" | "live";
  description: string;
};

/** Creates (or reuses) the Razorpay order this checkout session will pay. */
export async function startRazorpayCheckout(ref: string, userId: string | null = null): Promise<CheckoutIntent> {
  const { createRazorpayOrder, razorpayKeyId, razorpayMode } = await import("./razorpay.server");
  const row = await loadOrderByRef(ref);
  assertOrderOwner(row, userId);
  if (row.parent_user_id == null || row.learner_id == null) {
    throw new Error("This order is not linked to an account and a student.");
  }

  const description =
    row.purpose === "diagnostic"
      ? `Class ${row.grade ?? 10} ${row.subject ?? ""} diagnostic`.trim()
      : "Board Success Plan — one child, one board year";

  if (row.status === "paid") {
    return {
      orderRef: row.order_ref,
      status: row.status,
      keyId: await razorpayKeyId(),
      razorpayOrderId: null,
      amountPaise: row.amount_paise,
      currency: "INR",
      mode: await razorpayMode(),
      description,
    };
  }

  const { data: current } = await supabaseAdmin
    .from("parent_orders")
    .select("provider_order_id")
    .eq("id", row.id)
    .maybeSingle();

  let providerOrderId = current?.provider_order_id ?? null;
  if (!providerOrderId) {
    // Amount always comes from the stored order, never from the page.
    const created = await createRazorpayOrder({
      amountPaise: row.amount_paise,
      receipt: row.order_ref,
      notes: { order_ref: row.order_ref, purpose: row.purpose },
    });
    providerOrderId = created.id;
    const { error } = await supabaseAdmin
      .from("parent_orders")
      .update({ provider: "razorpay", provider_order_id: providerOrderId, status: "created" })
      .eq("id", row.id)
      .neq("status", "paid");
    if (error) throw new Error(error.message);
  }

  return {
    orderRef: row.order_ref,
    status: row.status,
    keyId: await razorpayKeyId(),
    razorpayOrderId: providerOrderId,
    amountPaise: row.amount_paise,
    currency: "INR",
    mode: await razorpayMode(),
    description,
  };
}

/** Verifies the browser-side checkout signature and captures the order. */
export async function verifyRazorpayCheckout(input: {
  orderRef: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
  userId?: string | null;
}): Promise<PublicOrder> {
  const { verifyCheckoutSignature } = await import("./razorpay.server");
  const row = await loadOrderByRef(input.orderRef);
  assertOrderOwner(row, input.userId ?? null);

  const matched = await loadOrderByProviderOrderId(input.razorpayOrderId);
  if (!matched || matched.id !== row.id) throw new Error("This payment does not belong to that order.");

  if (!(await verifyCheckoutSignature(input))) {
    await markOrderFailed(row, "Signature verification failed");
    throw new Error("Payment could not be verified.");
  }

  await markOrderPaid(row, input.razorpayPaymentId);
  return toPublicOrder(await loadOrderByRef(input.orderRef));
}

/** Records a checkout the parent abandoned or the gateway declined. */
export async function recordRazorpayFailure(input: {
  orderRef: string;
  reason: string;
  userId?: string | null;
}): Promise<PublicOrder> {
  const row = await loadOrderByRef(input.orderRef);
  assertOrderOwner(row, input.userId ?? null);
  await markOrderFailed(row, input.reason);
  return toPublicOrder(await loadOrderByRef(input.orderRef));
}

// --- Webhook entry points (called only after signature verification) -------

export async function captureFromWebhook(input: {
  providerOrderId: string;
  paymentId: string;
}): Promise<"captured" | "ignored"> {
  const row = await loadOrderByProviderOrderId(input.providerOrderId);
  if (!row) return "ignored";
  await markOrderPaid(row, input.paymentId);
  return "captured";
}

export async function failFromWebhook(input: {
  providerOrderId: string;
  reason: string;
}): Promise<"failed" | "ignored"> {
  const row = await loadOrderByProviderOrderId(input.providerOrderId);
  if (!row) return "ignored";
  await markOrderFailed(row, input.reason);
  return "failed";
}


// ---------------------------------------------------------------------------
// Provisioning: learner + curriculum-mapped diagnostic + session
// ---------------------------------------------------------------------------

async function generateParentDiagnostic(row: OrderRow, _learnerName: string): Promise<{
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
      .eq("status", "approved")
      // Pilot content gate: no unverified question may enter a paid diagnostic.
      .eq("verification_state", "verified"),
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
      // Never embed a child's name: published diagnostics are reused by the
      // self-serve start path, which would show one family's name to another.
      title: `${unitRes.data!.title} — Parent Diagnostic (${row.order_ref})`,

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
  userId: string;
}): Promise<{ accessToken: string }> {
  const row = await loadOrderByRef(input.orderRef);
  assertOrderOwner(row, input.userId);
  if (row.status !== "paid") throw new Error("This order has not been paid yet.");
  if (row.session_id) return { accessToken: row.access_token };
  if (!row.book_id || !row.unit_id || !row.org_id) throw new Error("This order is missing its curriculum selection.");
  if (!row.learner_id) throw new Error("This order is not linked to a student profile.");

  // The student profile already exists — it was required before checkout.
  const { data: learner, error: lError } = await supabaseAdmin
    .from("learners")
    .select("id, full_name")
    .eq("id", row.learner_id)
    .maybeSingle();
  if (lError) throw new Error(lError.message);
  if (!learner) throw new Error("That student profile could not be found.");

  const generated = await generateParentDiagnostic(row, learner.full_name);

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
      child_first_name: learner.full_name,
      assessment_id: generated.assessmentId,
      session_id: session.id,
    })
    .eq("id", row.id);
  if (uError) throw new Error(uError.message);

  await supabaseAdmin
    .from("parent_entitlements")
    .update({ learner_id: learner.id, parent_user_id: row.parent_user_id })
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

export async function loadRun(accessToken: string, userId: string | null = null): Promise<DiagnosticRun> {
  const row = await loadOrderByToken(accessToken);
  const learner = await assertLearnerAnswerer(row, userId);

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
    childFirstName: learner.fullName,

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
  userId?: string | null;
}): Promise<{ saved: true }> {
  const row = await loadOrderByToken(input.token);
  await assertLearnerAnswerer(row, input.userId ?? null);

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

export async function submitRun(accessToken: string, userId: string | null = null): Promise<{ accessToken: string }> {
  const row = await loadOrderByToken(accessToken);
  await assertLearnerAnswerer(row, userId);

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

export async function loadReport(accessToken: string, userId: string | null = null): Promise<ParentReport> {
  const row = await loadOrderByToken(accessToken);
  assertOrderOwner(row, userId);
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

export async function createUpgradeOrder(accessToken: string, userId: string | null = null): Promise<PublicOrder> {
  const row = await loadOrderByToken(accessToken);
  assertOrderOwner(row, userId);
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
      parent_user_id: row.parent_user_id,
      learner_id: row.learner_id,
      child_first_name: row.child_first_name,
      contact_email: row.contact_email,
      parent_order_id: row.id,
    })
    .select(
      ORDER_COLUMNS,
    )
    .single();
  if (error) throw new Error(error.message);
  return toPublicOrder(data as OrderRow);
}

export async function loadUpgradeView(
  accessToken: string,
  userId: string | null = null,
): Promise<ParentReport> {
  return loadReport(accessToken, userId);
}

// ---------------------------------------------------------------------------
// Parent handoff + learner completion
//
// After payment the parent lands on a handoff screen, never inside an
// answerable question session. The two views below are the only reads each
// side needs, and each is scoped to the role that owns it.
// ---------------------------------------------------------------------------

export type DiagnosticHandoff = {
  accessToken: string;
  orderRef: string;
  subject: string;
  unitTitle: string;
  learnerId: string;
  learnerName: string;
  learnerHandle: string;
  hasLogin: boolean;
  totalQuestions: number;
  answeredCount: number;
  status: "not_started" | "in_progress" | "submitted";
};

/** Parent-only. Shows what to hand over, and how far the learner has got. */
export async function loadHandoff(accessToken: string, userId: string): Promise<DiagnosticHandoff> {
  const row = await loadOrderByToken(accessToken);
  assertOrderOwner(row, userId);
  if (row.status !== "paid") throw new Error("This diagnostic has not been paid for yet.");
  if (!row.session_id || !row.assessment_id) throw new Error("This diagnostic has not been set up yet.");
  if (!row.learner_id) throw new Error("This diagnostic is not linked to a student profile.");

  const [{ data: learner }, { data: session }, { count }] = await Promise.all([
    supabaseAdmin
      .from("learners")
      .select("id, full_name, handle, student_user_id")
      .eq("id", row.learner_id)
      .maybeSingle(),
    supabaseAdmin
      .from("assessment_sessions")
      .select("status, answers")
      .eq("id", row.session_id)
      .maybeSingle(),
    supabaseAdmin
      .from("assessment_question_map")
      .select("question_id", { count: "exact", head: true })
      .eq("assessment_id", row.assessment_id),
  ]);

  const answers = (session?.answers as Record<string, string> | null) ?? {};
  const answeredCount = Object.values(answers).filter((v) => v !== "").length;
  const status: DiagnosticHandoff["status"] =
    session?.status === "submitted" ? "submitted" : answeredCount > 0 ? "in_progress" : "not_started";

  return {
    accessToken: row.access_token,
    orderRef: row.order_ref,
    subject: row.subject ?? "",
    unitTitle: (await unitTitle(row.unit_id)) ?? "",
    learnerId: row.learner_id,
    learnerName: learner?.full_name ?? "Your child",
    learnerHandle: learner?.handle ?? "",
    hasLogin: !!learner?.student_user_id,
    totalQuestions: count ?? 0,
    answeredCount,
    status,
  };
}

export type RunCompletion = {
  learnerName: string;
  subject: string;
  unitTitle: string;
  answeredCount: number;
  totalQuestions: number;
  submitted: boolean;
};

/**
 * Learner-only completion confirmation. The learner never sees the parent
 * report: the score and the recommendations belong on the parent's side.
 */
export async function loadRunCompletion(accessToken: string, userId: string): Promise<RunCompletion> {
  const row = await loadOrderByToken(accessToken);
  const learner = await assertLearnerAnswerer(row, userId);
  if (!row.session_id || !row.assessment_id) throw new Error("This diagnostic has not been set up yet.");

  const [{ data: session }, { count }] = await Promise.all([
    supabaseAdmin.from("assessment_sessions").select("status, answers").eq("id", row.session_id).maybeSingle(),
    supabaseAdmin
      .from("assessment_question_map")
      .select("question_id", { count: "exact", head: true })
      .eq("assessment_id", row.assessment_id),
  ]);
  const answers = (session?.answers as Record<string, string> | null) ?? {};

  return {
    learnerName: learner.fullName,
    subject: row.subject ?? "",
    unitTitle: (await unitTitle(row.unit_id)) ?? "",
    answeredCount: Object.values(answers).filter((v) => v !== "").length,
    totalQuestions: count ?? 0,
    submitted: session?.status === "submitted",
  };
}

/** Paid diagnostics waiting for the signed-in learner. */
export async function listLearnerDiagnostics(learnerId: string): Promise<
  {
    accessToken: string;
    subject: string;
    unitTitle: string;
    status: "not_started" | "in_progress" | "submitted";
    answeredCount: number;
    totalQuestions: number;
  }[]
> {
  const { data, error } = await supabaseAdmin
    .from("parent_orders")
    .select(ORDER_COLUMNS)
    .eq("learner_id", learnerId)
    .eq("purpose", "diagnostic")
    .eq("status", "paid")
    .not("session_id", "is", null)
    .order("created_at");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as OrderRow[];
  const out: {
    accessToken: string;
    subject: string;
    unitTitle: string;
    status: "not_started" | "in_progress" | "submitted";
    answeredCount: number;
    totalQuestions: number;
  }[] = [];

  for (const row of rows) {
    const [{ data: session }, { count }] = await Promise.all([
      supabaseAdmin.from("assessment_sessions").select("status, answers").eq("id", row.session_id!).maybeSingle(),
      supabaseAdmin
        .from("assessment_question_map")
        .select("question_id", { count: "exact", head: true })
        .eq("assessment_id", row.assessment_id!),
    ]);
    const answers = (session?.answers as Record<string, string> | null) ?? {};
    const answeredCount = Object.values(answers).filter((v) => v !== "").length;
    out.push({
      accessToken: row.access_token,
      subject: row.subject ?? "",
      unitTitle: (await unitTitle(row.unit_id)) ?? "",
      status: session?.status === "submitted" ? "submitted" : answeredCount > 0 ? "in_progress" : "not_started",
      answeredCount,
      totalQuestions: count ?? 0,
    });
  }
  return out;
}
