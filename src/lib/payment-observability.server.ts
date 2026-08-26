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

export type WebhookStatus = {
  lastEvent: {
    eventId: string | null;
    eventType: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    signatureValid: boolean;
    isDuplicate: boolean;
    outcome: string;
    createdAt: string;
  } | null;
  lastVerified: { createdAt: string; eventType: string } | null;
  lastRejected: { createdAt: string; eventType: string } | null;
  totals: { received: number; verified: number; rejected: number; duplicates: number };
};

/** Latest webhook delivery plus verification counters, for the admin status panel. */
export async function getWebhookStatus(): Promise<WebhookStatus> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_webhook_events")
    .select(
      "event_id, event_type, provider_order_id, provider_payment_id, signature_valid, is_duplicate, outcome, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = data ?? [];
  const map = (r: (typeof rows)[number]) => ({
    eventId: r.event_id ?? null,
    eventType: r.event_type,
    providerOrderId: r.provider_order_id ?? null,
    providerPaymentId: r.provider_payment_id ?? null,
    signatureValid: r.signature_valid,
    isDuplicate: r.is_duplicate,
    outcome: r.outcome,
    createdAt: r.created_at,
  });

  const verified = rows.filter((r) => r.signature_valid);
  const rejected = rows.filter((r) => !r.signature_valid);
  const first = rows[0];
  const firstVerified = verified[0];
  const firstRejected = rejected[0];

  return {
    lastEvent: first ? map(first) : null,
    lastVerified: firstVerified
      ? { createdAt: firstVerified.created_at, eventType: firstVerified.event_type }
      : null,
    lastRejected: firstRejected
      ? { createdAt: firstRejected.created_at, eventType: firstRejected.event_type }
      : null,
    totals: {
      received: rows.length,
      verified: verified.length,
      rejected: rejected.length,
      duplicates: rows.filter((r) => r.is_duplicate).length,
    },
  };
}
