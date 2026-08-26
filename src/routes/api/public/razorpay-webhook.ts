// Razorpay webhook — the authoritative capture path.
//
// Public prefix: authenticated by the HMAC signature over the raw body, which
// is verified before anything is parsed or written. Handles payment.captured
// and payment.failed; every other event is acknowledged and ignored.
//
// Every delivery is also written to the payment webhook event log. Logging is
// best-effort and never affects the response or the capture itself.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const eventId = request.headers.get("x-razorpay-event-id");
        const { verifyWebhookSignature } = await import("@/lib/razorpay.server");
        const { logWebhookEvent } = await import("@/lib/payment-observability.server");

        if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"))) {
          await logWebhookEvent({
            eventId,
            eventType: "unverified",
            providerOrderId: null,
            providerPaymentId: null,
            signatureValid: false,
            outcome: "rejected-signature",
          });
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
          await logWebhookEvent({
            eventId,
            eventType: event.event ?? "unknown",
            providerOrderId: providerOrderId ?? null,
            providerPaymentId: payment?.id ?? null,
            signatureValid: true,
            outcome: "ignored-no-payment-entity",
          });
          return Response.json({ ok: true, ignored: "no-payment-entity" });
        }

        const { captureFromWebhook, failFromWebhook } = await import("@/lib/parent-diagnostic.server");

        try {
          if (event.event === "payment.captured") {
            const result = await captureFromWebhook({ providerOrderId, paymentId: payment.id });
            await logWebhookEvent({
              eventId,
              eventType: event.event,
              providerOrderId,
              providerPaymentId: payment.id,
              signatureValid: true,
              outcome: result,
            });
            return Response.json({ ok: true, result });
          }
          if (event.event === "payment.failed") {
            const result = await failFromWebhook({
              providerOrderId,
              reason: payment.error_description ?? "Payment failed at the gateway",
            });
            await logWebhookEvent({
              eventId,
              eventType: event.event,
              providerOrderId,
              providerPaymentId: payment.id,
              signatureValid: true,
              outcome: result,
            });
            return Response.json({ ok: true, result });
          }
        } catch (error) {
          console.error("[razorpay-webhook]", event.event, error);
          await logWebhookEvent({
            eventId,
            eventType: event.event ?? "unknown",
            providerOrderId,
            providerPaymentId: payment.id,
            signatureValid: true,
            outcome: "error",
          });
          // 500 so Razorpay retries; capture is idempotent.
          return new Response("Processing error", { status: 500 });
        }

        await logWebhookEvent({
          eventId,
          eventType: event.event ?? "unknown",
          providerOrderId,
          providerPaymentId: payment.id,
          signatureValid: true,
          outcome: "ignored-unhandled-event",
        });
        return Response.json({ ok: true, ignored: event.event ?? "unknown" });
      },
    },
  },
});
