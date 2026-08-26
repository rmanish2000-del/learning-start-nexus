import { describe, expect, it, beforeAll } from "vitest";
import { createHmac } from "crypto";

const KEY_ID = "rzp_test_abc123";
const KEY_SECRET = "test_key_secret";
const WEBHOOK_SECRET = "test_webhook_secret";

beforeAll(() => {
  process.env["RAZORPAY_KEY_ID"] = KEY_ID;
  process.env["RAZORPAY_KEY_SECRET"] = KEY_SECRET;
  process.env["RAZORPAY_WEBHOOK_SECRET"] = WEBHOOK_SECRET;
});

async function mod() {
  return await import("../razorpay.server");
}

describe("checkout signature verification", () => {
  it("accepts a signature computed over order_id|payment_id", async () => {
    const { verifyCheckoutSignature } = await mod();
    const razorpayOrderId = "order_123";
    const razorpayPaymentId = "pay_456";
    const signature = createHmac("sha256", KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    expect(verifyCheckoutSignature({ razorpayOrderId, razorpayPaymentId, signature })).toBe(true);
  });

  it("rejects a tampered payment id", async () => {
    const { verifyCheckoutSignature } = await mod();
    const signature = createHmac("sha256", KEY_SECRET).update("order_123|pay_456").digest("hex");
    expect(
      verifyCheckoutSignature({
        razorpayOrderId: "order_123",
        razorpayPaymentId: "pay_EVIL",
        signature,
      }),
    ).toBe(false);
  });

  it("rejects a signature made with the wrong secret", async () => {
    const { verifyCheckoutSignature } = await mod();
    const signature = createHmac("sha256", "not_the_secret").update("order_123|pay_456").digest("hex");
    expect(
      verifyCheckoutSignature({
        razorpayOrderId: "order_123",
        razorpayPaymentId: "pay_456",
        signature,
      }),
    ).toBe(false);
  });

  it("rejects an empty or truncated signature", async () => {
    const { verifyCheckoutSignature } = await mod();
    const good = createHmac("sha256", KEY_SECRET).update("order_123|pay_456").digest("hex");
    for (const signature of ["", good.slice(0, 10)]) {
      expect(
        verifyCheckoutSignature({
          razorpayOrderId: "order_123",
          razorpayPaymentId: "pay_456",
          signature,
        }),
      ).toBe(false);
    }
  });
});

describe("webhook signature verification", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } });

  it("accepts the HMAC over the exact raw body", async () => {
    const { verifyWebhookSignature } = await mod();
    const signature = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    expect(verifyWebhookSignature(body, signature)).toBe(true);
  });

  it("rejects when the body was modified after signing", async () => {
    const { verifyWebhookSignature } = await mod();
    const signature = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    expect(verifyWebhookSignature(body.replace("pay_1", "pay_2"), signature)).toBe(false);
  });

  it("rejects a missing signature header", async () => {
    const { verifyWebhookSignature } = await mod();
    expect(verifyWebhookSignature(body, null)).toBe(false);
  });
});

describe("gateway mode", () => {
  it("reports test mode for an rzp_test key", async () => {
    const { razorpayMode, razorpayKeyId } = await mod();
    expect(razorpayKeyId()).toBe(KEY_ID);
    expect(razorpayMode()).toBe("test");
  });
});
