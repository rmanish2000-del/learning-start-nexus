// Razorpay gateway adapter — server only.
//
// Owns exactly three things: creating a gateway order, verifying the
// checkout handler signature, and verifying the webhook signature. It holds
// no product logic; entitlements are granted by parent-diagnostic.server.ts.

import { createHmac, timingSafeEqual } from "crypto";

import { resolveRazorpayCredentials } from "./payment-credentials.server";

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

async function credentials(): Promise<{ keyId: string; keySecret: string; webhookSecret: string | null }> {
  const resolved = await resolveRazorpayCredentials();
  if (!resolved) throw new Error("Payments are not configured.");
  return { keyId: resolved.keyId, keySecret: resolved.keySecret, webhookSecret: resolved.webhookSecret };
}

export async function razorpayKeyId(): Promise<string> {
  return (await credentials()).keyId;
}

export async function razorpayMode(): Promise<"test" | "live"> {
  return (await credentials()).keyId.startsWith("rzp_live_") ? "live" : "test";
}

export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const { keyId, keySecret } = await credentials();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes ?? {},
      payment_capture: 1,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => null)) as
    | (RazorpayOrder & { error?: { description?: string } })
    | null;
  if (!res.ok || !body?.id) {
    console.error("[razorpay] order create failed", res.status, body?.error?.description);
    if (res.status === 401) {
      throw new Error(
        "Payments are not live yet: the gateway rejected the configured keys. An admin can fix this on the Payment Settings page.",
      );
    }
    throw new Error("The payment gateway could not start this order. Please try again.");
  }

  return { id: body.id, amount: body.amount, currency: body.currency, status: body.status };
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Verifies the signature returned by Razorpay Checkout to the browser. */
export async function verifyCheckoutSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<boolean> {
  const { keySecret } = await credentials();
  const expected = createHmac("sha256", keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");
  return safeEqualHex(expected, input.signature);
}

/** Verifies the `X-Razorpay-Signature` header over the raw webhook body. */
export async function verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = await resolveRazorpayCredentials()
    .then((c) => c?.webhookSecret ?? process.env["RAZORPAY_WEBHOOK_SECRET"] ?? null)
    .catch(() => process.env["RAZORPAY_WEBHOOK_SECRET"] ?? null);
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
