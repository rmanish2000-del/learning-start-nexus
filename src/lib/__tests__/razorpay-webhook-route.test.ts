import { describe, expect, it, beforeAll, beforeEach, vi } from "vitest";
import { createHmac } from "crypto";

const WEBHOOK_SECRET = "test_webhook_secret";

const captureFromWebhook = vi.fn(async () => "captured" as const);
const failFromWebhook = vi.fn(async () => "failed" as const);

vi.mock("@/lib/parent-diagnostic.server", () => ({ captureFromWebhook, failFromWebhook }));

beforeAll(() => {
  process.env["RAZORPAY_KEY_ID"] = "rzp_test_abc123";
  process.env["RAZORPAY_KEY_SECRET"] = "test_key_secret";
  process.env["RAZORPAY_WEBHOOK_SECRET"] = WEBHOOK_SECRET;
});

beforeEach(() => {
  captureFromWebhook.mockClear();
  failFromWebhook.mockClear();
});

type Handler = (ctx: { request: Request }) => Promise<Response>;

async function post(body: unknown, signature?: string | null): Promise<Response> {
  const { Route } = await import("@/routes/api/public/razorpay-webhook");
  const handler = (Route.options as unknown as { server: { handlers: { POST: Handler } } }).server.handlers
    .POST;
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const headers = new Headers({ "content-type": "application/json" });
  const sig = signature === undefined ? createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex") : signature;
  if (sig) headers.set("x-razorpay-signature", sig);
  return handler({ request: new Request("http://localhost/api/public/razorpay-webhook", { method: "POST", headers, body: raw }) });
}

const captured = {
  event: "payment.captured",
  payload: { payment: { entity: { id: "pay_1", order_id: "order_diag" } } },
};

describe("razorpay webhook route", () => {
  it("rejects an unsigned request before touching the payload", async () => {
    const res = await post(captured, null);
    expect(res.status).toBe(401);
    expect(captureFromWebhook).not.toHaveBeenCalled();
  });

  it("rejects a request signed with the wrong secret", async () => {
    const raw = JSON.stringify(captured);
    const bad = createHmac("sha256", "wrong_secret").update(raw).digest("hex");
    const res = await post(captured, bad);
    expect(res.status).toBe(401);
    expect(captureFromWebhook).not.toHaveBeenCalled();
  });

  it("rejects a body altered after signing", async () => {
    const raw = JSON.stringify(captured);
    const sig = createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
    const res = await post(raw.replace("order_diag", "order_other"), sig);
    expect(res.status).toBe(401);
    expect(captureFromWebhook).not.toHaveBeenCalled();
  });

  it("captures a signed payment.captured event", async () => {
    const res = await post(captured);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, result: "captured" });
    expect(captureFromWebhook).toHaveBeenCalledWith({ providerOrderId: "order_diag", paymentId: "pay_1" });
  });

  it("records a signed payment.failed event with the gateway reason", async () => {
    const res = await post({
      event: "payment.failed",
      payload: {
        payment: { entity: { id: "pay_2", order_id: "order_diag", error_description: "Card declined" } },
      },
    });
    expect(res.status).toBe(200);
    expect(failFromWebhook).toHaveBeenCalledWith({
      providerOrderId: "order_diag",
      reason: "Card declined",
    });
  });

  it("acknowledges and ignores unrelated events", async () => {
    const res = await post({
      event: "refund.processed",
      payload: { payment: { entity: { id: "pay_3", order_id: "order_diag" } } },
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, ignored: "refund.processed" });
    expect(captureFromWebhook).not.toHaveBeenCalled();
    expect(failFromWebhook).not.toHaveBeenCalled();
  });

  it("ignores an event with no payment entity", async () => {
    const res = await post({ event: "payment.captured", payload: {} });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, ignored: "no-payment-entity" });
  });

  it("returns 400 on a signed but unparseable body", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
  });

  it("returns 500 so Razorpay retries when capture throws", async () => {
    captureFromWebhook.mockRejectedValueOnce(new Error("db down"));
    const res = await post(captured);
    expect(res.status).toBe(500);
  });
});
