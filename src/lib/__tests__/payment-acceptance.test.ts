// Payment Acceptance Test Suite — scenarios A–J.
//
// Drives the real capture path (parent-diagnostic.server) against an in-memory
// service-role client, with real HMAC signatures. Only the gateway HTTP call
// (createRazorpayOrder) is stubbed. Every scenario also re-runs the entitlement
// audit invariants: payment exists, order exists, entitlement exists, granted
// once.

import { describe, expect, it, beforeAll, beforeEach, vi } from "vitest";
import { createHmac } from "crypto";

import { createFakeSupabase, type Db, type Row } from "./fake-supabase";
import { auditEntitlements, type EntitlementLite, type OrderLite } from "../payment-audit-shared";

const KEY_SECRET = "test_key_secret";
const db: Db = {};

vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return createFakeSupabase(db);
  },
}));

const createRazorpayOrder = vi.fn(async () => ({ id: `order_gw_${++gwCounter}` }));
let gwCounter = 0;

vi.mock("../razorpay.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../razorpay.server")>();
  return { ...actual, createRazorpayOrder };
});

const DIAG_ORDER = "11111111-1111-4111-8111-111111111111";
const PLAN_ORDER = "22222222-2222-4222-8222-222222222222";
// Identity-first: every order belongs to a parent auth user and a student.
const PARENT_USER = "33333333-3333-4333-8333-333333333333";
const OTHER_USER = "44444444-4444-4444-8444-444444444444";

beforeAll(() => {
  process.env["RAZORPAY_KEY_ID"] = "rzp_test_abc123";
  process.env["RAZORPAY_KEY_SECRET"] = KEY_SECRET;
  process.env["RAZORPAY_WEBHOOK_SECRET"] = "test_webhook_secret";
});

function baseOrder(overrides: Row): Row {
  return {
    access_token: "tok",
    purpose: "diagnostic",
    status: "created",
    amount_paise: 19900,
    board: "CBSE",
    grade: 10,
    subject: "Mathematics",
    book_id: null,
    unit_id: null,
    child_first_name: "Aarav",
    contact_email: "p@example.com",
    org_id: "org_1",
    parent_user_id: PARENT_USER,
    learner_id: "learner_1",
    assessment_id: "assessment_1",
    session_id: "session_1",
    parent_order_id: null,
    paid_at: null,
    provider: "razorpay",
    provider_order_id: null,
    provider_payment_ref: null,
    failure_reason: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function seed() {
  for (const key of Object.keys(db)) delete db[key];
  gwCounter = 0;
  createRazorpayOrder.mockClear();
  db["parent_orders"] = [
    baseOrder({ id: DIAG_ORDER, order_ref: "EDUDIAG1", access_token: "tok_diag" }),
  ];
  db["parent_entitlements"] = [];
}

function seedPlanOrder(withCredit: boolean) {
  (db["parent_orders"] ??= []).push(
    baseOrder({
      id: PLAN_ORDER,
      order_ref: "EDUPLAN1",
      access_token: "tok_plan",
      purpose: "board_success_plan",
      amount_paise: withCredit ? 280000 : 299900,
      parent_order_id: withCredit ? DIAG_ORDER : null,
      provider_order_id: "order_plan",
    }),
  );
}

const orders = () => db["parent_orders"] ?? [];
const entitlements = () => db["parent_entitlements"] ?? [];
const orderByRef = (ref: string) => orders().find((o) => o["order_ref"] === ref)!;

const api = () => import("../parent-diagnostic.server");

function signCheckout(razorpayOrderId: string, paymentId: string): string {
  return createHmac("sha256", KEY_SECRET).update(`${razorpayOrderId}|${paymentId}`).digest("hex");
}

/** Runs the entitlement audit over current db state. */
function audit() {
  const o: OrderLite[] = orders().map((r) => ({
    id: r["id"] as string,
    orderRef: r["order_ref"] as string,
    purpose: r["purpose"] as string,
    status: r["status"] as string,
    amountPaise: r["amount_paise"] as number,
    providerOrderId: (r["provider_order_id"] as string | null) ?? null,
    providerPaymentRef: (r["provider_payment_ref"] as string | null) ?? null,
    parentOrderId: (r["parent_order_id"] as string | null) ?? null,
    paidAt: (r["paid_at"] as string | null) ?? null,
    failureReason: (r["failure_reason"] as string | null) ?? null,
    createdAt: r["created_at"] as string,
  }));
  const e: EntitlementLite[] = entitlements().map((r) => ({
    id: r["id"] as string,
    orderId: r["order_id"] as string,
    kind: r["kind"] as string,
    grantedAt: (r["granted_at"] as string | null) ?? null,
    consumedAt: (r["consumed_at"] as string | null) ?? null,
  }));
  return auditEntitlements(o, e);
}

function expectAuditClean() {
  const rows = audit();
  for (const row of rows) expect({ ref: row.orderRef, issues: row.issues }).toEqual({
    ref: row.orderRef,
    issues: [],
  });
  return rows;
}

/** Completes a browser checkout for an order ref, returning the payment id. */
async function payThroughCheckout(ref: string, paymentId: string) {
  const { startRazorpayCheckout, verifyRazorpayCheckout } = await api();
  const intent = await startRazorpayCheckout(ref, PARENT_USER);
  const gatewayOrderId = intent.razorpayOrderId!;
  await verifyRazorpayCheckout({
    orderRef: ref,
    razorpayOrderId: gatewayOrderId,
    razorpayPaymentId: paymentId,
    signature: signCheckout(gatewayOrderId, paymentId),
    userId: PARENT_USER,
  });
  return { gatewayOrderId, paymentId };
}

beforeEach(seed);

describe("A. New user purchase", () => {
  it("creates a pending order with a gateway order id and no entitlement", async () => {
    const { startRazorpayCheckout } = await api();
    const intent = await startRazorpayCheckout("EDUDIAG1", PARENT_USER);

    expect(intent.amountPaise).toBe(19900);
    expect(intent.currency).toBe("INR");
    expect(intent.mode).toBe("test");
    expect(intent.razorpayOrderId).toBeTruthy();
    expect(orderByRef("EDUDIAG1")["status"]).toBe("created");
    expect(orderByRef("EDUDIAG1")["provider_order_id"]).toBe(intent.razorpayOrderId);
    expect(entitlements()).toHaveLength(0);
    expect(audit()).toHaveLength(0); // nothing paid yet
  });
});

describe("B. Successful payment", () => {
  it("captures the order on a valid signature and grants exactly one entitlement", async () => {
    await payThroughCheckout("EDUDIAG1", "pay_ok");

    const order = orderByRef("EDUDIAG1");
    expect(order["status"]).toBe("paid");
    expect(order["paid_at"]).toBeTruthy();
    expect(order["provider_payment_ref"]).toBe("pay_ok");
    expect(entitlements()).toHaveLength(1);
    expect(entitlements()[0]!["kind"]).toBe("diagnostic_credit");

    const rows = expectAuditClean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      paymentExists: true,
      orderExists: true,
      entitlementExists: true,
      grantedOnce: true,
      ok: true,
    });
  });

  it("rejects a forged signature and grants nothing", async () => {
    const { startRazorpayCheckout, verifyRazorpayCheckout } = await api();
    const intent = await startRazorpayCheckout("EDUDIAG1", PARENT_USER);

    await expect(
      verifyRazorpayCheckout({
        userId: PARENT_USER,
        orderRef: "EDUDIAG1",
        razorpayOrderId: intent.razorpayOrderId!,
        razorpayPaymentId: "pay_forged",
        signature: "deadbeef",
      }),
    ).rejects.toThrow(/could not be verified/i);

    expect(orderByRef("EDUDIAG1")["status"]).toBe("failed");
    expect(entitlements()).toHaveLength(0);
  });
});

describe("C. Failed payment", () => {
  it("marks the order failed with the gateway reason and grants nothing", async () => {
    const { startRazorpayCheckout, failFromWebhook } = await api();
    const intent = await startRazorpayCheckout("EDUDIAG1", PARENT_USER);
    const result = await failFromWebhook({
      providerOrderId: intent.razorpayOrderId!,
      reason: "Card declined by issuing bank",
    });

    expect(result).toBe("failed");
    expect(orderByRef("EDUDIAG1")["status"]).toBe("failed");
    expect(orderByRef("EDUDIAG1")["failure_reason"]).toBe("Card declined by issuing bank");
    expect(entitlements()).toHaveLength(0);
    expect(audit()).toHaveLength(0);
  });
});

describe("D. Cancelled payment", () => {
  it("records the abandoned checkout and still allows a later successful retry", async () => {
    const { recordRazorpayFailure } = await api();
    await recordRazorpayFailure({ orderRef: "EDUDIAG1", reason: "Checkout closed by parent", userId: PARENT_USER });
    expect(orderByRef("EDUDIAG1")["status"]).toBe("failed");
    expect(entitlements()).toHaveLength(0);

    await payThroughCheckout("EDUDIAG1", "pay_retry");
    expect(orderByRef("EDUDIAG1")["status"]).toBe("paid");
    expect(orderByRef("EDUDIAG1")["failure_reason"]).toBeNull();
    expect(entitlements()).toHaveLength(1);
    expectAuditClean();
  });
});

describe("E. Duplicate webhook", () => {
  it("grants nothing twice when payment.captured is replayed", async () => {
    const { captureFromWebhook } = await api();
    const { gatewayOrderId } = await payThroughCheckout("EDUDIAG1", "pay_ok");
    const paidAt = orderByRef("EDUDIAG1")["paid_at"];

    await captureFromWebhook({ providerOrderId: gatewayOrderId, paymentId: "pay_ok" });
    await captureFromWebhook({ providerOrderId: gatewayOrderId, paymentId: "pay_ok" });

    expect(entitlements()).toHaveLength(1);
    expect(orderByRef("EDUDIAG1")["paid_at"]).toBe(paidAt);
    expect(expectAuditClean()[0]!.entitlementCount).toBe(1);
  });
});

describe("F. Delayed webhook", () => {
  it("is a no-op when it lands after the browser already verified the payment", async () => {
    const { captureFromWebhook, failFromWebhook } = await api();
    const { gatewayOrderId } = await payThroughCheckout("EDUDIAG1", "pay_ok");

    expect(await captureFromWebhook({ providerOrderId: gatewayOrderId, paymentId: "pay_ok" })).toBe(
      "captured",
    );
    // A stale failure event must never downgrade a captured order.
    await failFromWebhook({ providerOrderId: gatewayOrderId, reason: "Late failure event" });

    expect(orderByRef("EDUDIAG1")["status"]).toBe("paid");
    expect(orderByRef("EDUDIAG1")["failure_reason"]).toBeNull();
    expect(entitlements()).toHaveLength(1);
    expectAuditClean();
  });
});

describe("G. Refresh during checkout", () => {
  it("reuses the same gateway order instead of creating a second one", async () => {
    const { startRazorpayCheckout } = await api();
    const first = await startRazorpayCheckout("EDUDIAG1", PARENT_USER);
    const second = await startRazorpayCheckout("EDUDIAG1", PARENT_USER);
    const third = await startRazorpayCheckout("EDUDIAG1", PARENT_USER);

    expect(second.razorpayOrderId).toBe(first.razorpayOrderId);
    expect(third.razorpayOrderId).toBe(first.razorpayOrderId);
    expect(createRazorpayOrder).toHaveBeenCalledTimes(1);
    expect(orders()).toHaveLength(1);
    expect(entitlements()).toHaveLength(0);
  });

  it("does not re-open a gateway order once the payment is captured", async () => {
    const { startRazorpayCheckout } = await api();
    await payThroughCheckout("EDUDIAG1", "pay_ok");
    const after = await startRazorpayCheckout("EDUDIAG1", PARENT_USER);

    expect(after.status).toBe("paid");
    expect(after.razorpayOrderId).toBeNull();
    expect(createRazorpayOrder).toHaveBeenCalledTimes(1);
    expect(entitlements()).toHaveLength(1);
  });
});

describe("H. Logout and login after payment", () => {
  it("still resolves the paid order and its entitlement from the access token", async () => {
    await payThroughCheckout("EDUDIAG1", "pay_ok");

    // A new "session": fresh module import, order fetched by its public ref.
    vi.resetModules();
    const { getOrder } = await api();
    const view = await getOrder("EDUDIAG1", PARENT_USER);

    expect(view.status).toBe("paid");
    expect(view.accessToken).toBe("tok_diag");
    expect(entitlements()).toHaveLength(1);
    expectAuditClean();
  });
});

describe("I. Resume diagnostic", () => {
  it("keeps the provisioned session on the order across capture and replays", async () => {
    const { captureFromWebhook } = await api();
    const { gatewayOrderId } = await payThroughCheckout("EDUDIAG1", "pay_ok");
    await captureFromWebhook({ providerOrderId: gatewayOrderId, paymentId: "pay_ok" });

    const order = orderByRef("EDUDIAG1");
    expect(order["session_id"]).toBe("session_1");
    expect(order["assessment_id"]).toBe("assessment_1");
    expect(order["learner_id"]).toBe("learner_1");
    expect(entitlements()).toHaveLength(1);
  });
});

describe("J. Upgrade with ₹199 credit", () => {
  it("grants the plan once and consumes the diagnostic credit exactly once", async () => {
    const { captureFromWebhook } = await api();
    await payThroughCheckout("EDUDIAG1", "pay_ok");
    seedPlanOrder(true);

    await captureFromWebhook({ providerOrderId: "order_plan", paymentId: "pay_plan" });
    await captureFromWebhook({ providerOrderId: "order_plan", paymentId: "pay_plan" }); // replay

    const plan = entitlements().filter((e) => e["kind"] === "board_success_plan");
    const credit = entitlements().find((e) => e["kind"] === "diagnostic_credit")!;

    expect(plan).toHaveLength(1);
    expect(plan[0]!["expires_at"]).toBeTruthy();
    expect(credit["consumed_at"]).toBeTruthy();
    expect(orderByRef("EDUPLAN1")["amount_paise"]).toBe(280000);

    const rows = expectAuditClean();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.orderRef === "EDUPLAN1")!.creditApplied).toBe(true);
  });

  it("charges full price and applies no credit when the plan is bought standalone", async () => {
    const { captureFromWebhook } = await api();
    seedPlanOrder(false);
    await captureFromWebhook({ providerOrderId: "order_plan", paymentId: "pay_plan" });

    const rows = expectAuditClean();
    expect(orderByRef("EDUPLAN1")["amount_paise"]).toBe(299900);
    expect(rows.find((r) => r.orderRef === "EDUPLAN1")!.creditApplied).toBeNull();
    expect(entitlements()).toHaveLength(1);
  });
});

describe("Entitlement audit invariants", () => {
  it("flags a paid order with no entitlement", () => {
    const rows = auditEntitlements(
      [
        {
          id: "o1",
          orderRef: "EDUX",
          purpose: "diagnostic",
          status: "paid",
          amountPaise: 19900,
          providerOrderId: "order_1",
          providerPaymentRef: "pay_1",
          parentOrderId: null,
          paidAt: "now",
          failureReason: null,
          createdAt: "now",
        },
      ],
      [],
    );
    expect(rows[0]!.ok).toBe(false);
    expect(rows[0]!.entitlementExists).toBe(false);
  });

  it("flags an entitlement granted twice", () => {
    const rows = auditEntitlements(
      [
        {
          id: "o1",
          orderRef: "EDUX",
          purpose: "diagnostic",
          status: "paid",
          amountPaise: 19900,
          providerOrderId: "order_1",
          providerPaymentRef: "pay_1",
          parentOrderId: null,
          paidAt: "now",
          failureReason: null,
          createdAt: "now",
        },
      ],
      [
        { id: "e1", orderId: "o1", kind: "diagnostic_credit", grantedAt: "now", consumedAt: null },
        { id: "e2", orderId: "o1", kind: "diagnostic_credit", grantedAt: "now", consumedAt: null },
      ],
    );
    expect(rows[0]!.grantedOnce).toBe(false);
    expect(rows[0]!.ok).toBe(false);
  });
});

describe("K. Purchase ownership", () => {
  it("refuses checkout for an anonymous caller and for a different account", async () => {
    const { startRazorpayCheckout, getOrder } = await api();

    await expect(startRazorpayCheckout("EDUDIAG1", null)).rejects.toThrow(/Sign in with the account/);
    await expect(startRazorpayCheckout("EDUDIAG1", OTHER_USER)).rejects.toThrow(/Sign in with the account/);
    await expect(getOrder("EDUDIAG1", OTHER_USER)).rejects.toThrow(/Sign in with the account/);

    // Nothing was created at the gateway and no entitlement was granted.
    expect(createRazorpayOrder).not.toHaveBeenCalled();
    expect(entitlements()).toHaveLength(0);
  });

  it("stamps the owning parent account on the entitlement it grants", async () => {
    await payThroughCheckout("EDUDIAG1", "pay_owner");
    expect(entitlements()[0]!["parent_user_id"]).toBe(PARENT_USER);
  });
});
