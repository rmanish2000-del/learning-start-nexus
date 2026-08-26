// Payment observability — append-only webhook event log.
//
// Purely diagnostic: every write is best-effort and wrapped, so logging can
// never change or fail the payment path it observes.

export type WebhookLogInput = {
  eventId: string | null;
  eventType: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  signatureValid: boolean;
  outcome: string;
};

/** Records one webhook delivery, flagging replays of an event id already seen. */
export async function logWebhookEvent(input: WebhookLogInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let isDuplicate = false;
    if (input.eventId) {
      const { data } = await supabaseAdmin
        .from("payment_webhook_events")
        .select("id")
        .eq("event_id", input.eventId)
        .limit(1);
      isDuplicate = Boolean(data && data.length > 0);
    }

    let orderId: string | null = null;
    if (input.providerOrderId) {
      const { data } = await supabaseAdmin
        .from("parent_orders")
        .select("id")
        .eq("provider_order_id", input.providerOrderId)
        .maybeSingle();
      orderId = (data as { id: string } | null)?.id ?? null;
    }

    await supabaseAdmin.from("payment_webhook_events").insert({
      provider: "razorpay",
      event_id: input.eventId,
      event_type: input.eventType,
      provider_order_id: input.providerOrderId,
      provider_payment_id: input.providerPaymentId,
      order_id: orderId,
      signature_valid: input.signatureValid,
      is_duplicate: isDuplicate,
      outcome: input.outcome,
    });
  } catch (error) {
    console.error("[payment-observability] failed to log webhook event", error);
  }
}
