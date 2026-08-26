// Razorpay webhook — the authoritative capture path.
//
// Public prefix: authenticated by the HMAC signature over the raw body, which
// is verified before anything is parsed or written. Handles payment.captured
// and payment.failed; every other event is acknowledged and ignored.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const { verifyWebhookSignature } = await import("@/lib/razorpay.server");

        if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: {
          event?: string;
          payload?: { payment?: { entity?: { id?: string; order_id?: string; error_description?: string } } };
        };
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const payment = event.payload?.payment?.entity;
        const providerOrderId = payment?.order_id;
        if (!providerOrderId || !payment?.id) {
          return Response.json({ ok: true, ignored: "no-payment-entity" });
        }

        const { captureFromWebhook, failFromWebhook } = await import("@/lib/parent-diagnostic.server");

        try {
          if (event.event === "payment.captured") {
            const result = await captureFromWebhook({ providerOrderId, paymentId: payment.id });
            return Response.json({ ok: true, result });
          }
          if (event.event === "payment.failed") {
            const result = await failFromWebhook({
              providerOrderId,
              reason: payment.error_description ?? "Payment failed at the gateway",
            });
            return Response.json({ ok: true, result });
          }
        } catch (error) {
          console.error("[razorpay-webhook]", event.event, error);
          // 500 so Razorpay retries; capture is idempotent.
          return new Response("Processing error", { status: 500 });
        }

        return Response.json({ ok: true, ignored: event.event ?? "unknown" });
      },
    },
  },
});
