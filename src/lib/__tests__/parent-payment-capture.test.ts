import { describe, expect, it, beforeEach, vi } from "vitest";
import { createFakeSupabase, type Db, type Row } from "./fake-supabase";

const db: Db = {};

vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return createFakeSupabase(db);
  },
}));

const DIAG_ORDER = "11111111-1111-4111-8111-111111111111";
const PLAN_ORDER = "22222222-2222-4222-8222-222222222222";

function seed() {
  for (const key of Object.keys(db)) delete db[key];
  db["parent_orders"] = [
    {
      id: DIAG_ORDER,
      order_ref: "EDUDIAG1",
      access_token: "tok_diag",
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
      learner_id: "learner_1",
      assessment_id: null,
      session_id: null,
      parent_order_id: null,
      paid_at: null,
      provider_order_id: "order_diag",
      provider_payment_ref: null,
      failure_reason: null,
    },
  ];
  db["parent_entitlements"] = [];
  db["curriculum_units"] = [];
}

function orders(): Row[] {
  return db["parent_orders"] ?? [];
}
function entitlements(): Row[] {
  return db["parent_entitlements"] ?? [];
}

async function api() {
  return await import("../parent-diagnostic.server");
}

beforeEach(() => {
  seed();
});

describe("payment.captured handling", () => {
  it("marks the order paid and grants exactly one diagnostic credit", async () => {
    const { captureFromWebhook } = await api();
    const result = await captureFromWebhook({ providerOrderId: "order_diag", paymentId: "pay_1" });

    expect(result).toBe("captured");
    const order = orders()[0]!;
    expect(order["status"]).toBe("paid");
    expect(order["paid_at"]).toBeTruthy();
    expect(order["provider"]).toBe("razorpay");
    expect(order["provider_payment_ref"]).toBe("pay_1");
    expect(entitlements()).toHaveLength(1);
    expect(entitlements()[0]!["kind"]).toBe("diagnostic_credit");
    expect(entitlements()[0]!["order_id"]).toBe(DIAG_ORDER);
  });

  it("is idempotent — a replayed webhook grants nothing twice", async () => {
    const { captureFromWebhook } = await api();
    await captureFromWebhook({ providerOrderId: "order_diag", paymentId: "pay_1" });
    const paidAt = orders()[0]!["paid_at"];
    await captureFromWebhook({ providerOrderId: "order_diag", paymentId: "pay_1" });
    await captureFromWebhook({ providerOrderId: "order_diag", paymentId: "pay_duplicate" });

    expect(entitlements()).toHaveLength(1);
    expect(orders()[0]!["paid_at"]).toBe(paidAt);
    expect(orders()[0]!["provider_payment_ref"]).toBe("pay_1");
  });

  it("ignores an unknown gateway order without writing anything", async () => {
    const { captureFromWebhook } = await api();
    const result = await captureFromWebhook({ providerOrderId: "order_unknown", paymentId: "pay_x" });

    expect(result).toBe("ignored");
    expect(orders()[0]!["status"]).toBe("created");
    expect(entitlements()).toHaveLength(0);
  });
});

describe("payment.failed handling", () => {
  it("marks the order failed with the gateway reason and grants nothing", async () => {
    const { failFromWebhook } = await api();
    const result = await failFromWebhook({ providerOrderId: "order_diag", reason: "Card declined" });

    expect(result).toBe("failed");
    expect(orders()[0]!["status"]).toBe("failed");
    expect(orders()[0]!["failure_reason"]).toBe("Card declined");
    expect(entitlements()).toHaveLength(0);
  });

  it("never downgrades an already paid order", async () => {
    const { captureFromWebhook, failFromWebhook } = await api();
    await captureFromWebhook({ providerOrderId: "order_diag", paymentId: "pay_1" });
    await failFromWebhook({ providerOrderId: "order_diag", reason: "Late failure event" });

    expect(orders()[0]!["status"]).toBe("paid");
    expect(orders()[0]!["failure_reason"]).toBeNull();
    expect(entitlements()).toHaveLength(1);
  });

  it("ignores a failure for an unknown gateway order", async () => {
    const { failFromWebhook } = await api();
    expect(await failFromWebhook({ providerOrderId: "nope", reason: "x" })).toBe("ignored");
  });
});

describe("upgrade capture", () => {
  function seedPlanOrder() {
    orders().push({
      id: PLAN_ORDER,
      order_ref: "EDUPLAN1",
      access_token: "tok_plan",
      purpose: "board_success_plan",
      status: "created",
      amount_paise: 280000,
      board: "CBSE",
      grade: 10,
      subject: "Mathematics",
      book_id: null,
      unit_id: null,
      child_first_name: "Aarav",
      contact_email: "p@example.com",
      org_id: "org_1",
      learner_id: "learner_1",
      assessment_id: null,
      session_id: null,
      parent_order_id: DIAG_ORDER,
      paid_at: null,
      provider_order_id: "order_plan",
      provider_payment_ref: null,
      failure_reason: null,
    });
  }

  it("grants the plan entitlement and consumes the ₹199 credit", async () => {
    const { captureFromWebhook } = await api();
    await captureFromWebhook({ providerOrderId: "order_diag", paymentId: "pay_1" });
    seedPlanOrder();
    await captureFromWebhook({ providerOrderId: "order_plan", paymentId: "pay_2" });

    const plan = entitlements().find((e) => e["kind"] === "board_success_plan");
    const credit = entitlements().find((e) => e["kind"] === "diagnostic_credit");

    expect(plan).toBeTruthy();
    expect(plan!["expires_at"]).toBeTruthy();
    expect(credit!["consumed_at"]).toBeTruthy();
    expect(entitlements()).toHaveLength(2);
  });

  it("does not double-grant the plan on webhook replay", async () => {
    const { captureFromWebhook } = await api();
    seedPlanOrder();
    await captureFromWebhook({ providerOrderId: "order_plan", paymentId: "pay_2" });
    await captureFromWebhook({ providerOrderId: "order_plan", paymentId: "pay_2" });

    expect(entitlements().filter((e) => e["kind"] === "board_success_plan")).toHaveLength(1);
  });
});
