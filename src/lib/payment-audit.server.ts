// Payment Audit dashboard — server-only readers.
//
// Read-only. Rows are read with the service-role client *after* the caller has
// been verified as admin/reviewer, because parent_orders is admin-read only,
// and are projected to non-PII shapes (no contact name, email, or phone).

import {
  auditEntitlements,
  computePaymentMetrics,
  type EntitlementAuditRow,
  type EntitlementLite,
  type OrderLite,
  type PaymentMetric,
  type WebhookEventLite,
} from "./payment-audit-shared";

export type PaymentAuditData = {
  metrics: PaymentMetric[];
  entitlementAudit: EntitlementAuditRow[];
  recentOrders: OrderLite[];
  recentEvents: WebhookEventLite[];
  generatedAt: string;
  allEntitlementsOk: boolean;
};

export async function getPaymentAudit(): Promise<PaymentAuditData> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [ordersRes, entitlementsRes, eventsRes] = await Promise.all([
    supabaseAdmin
      .from("parent_orders")
      .select(
        "id, order_ref, purpose, status, amount_paise, provider_order_id, provider_payment_ref, parent_order_id, paid_at, failure_reason, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("parent_entitlements")
      .select("id, order_id, kind, granted_at, consumed_at")
      .limit(1000),
    supabaseAdmin
      .from("payment_webhook_events")
      .select(
        "id, event_id, event_type, provider_order_id, signature_valid, is_duplicate, outcome, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (entitlementsRes.error) throw new Error(entitlementsRes.error.message);
  if (eventsRes.error) throw new Error(eventsRes.error.message);

  const orders: OrderLite[] = (ordersRes.data ?? []).map((o) => ({
    id: o.id,
    orderRef: o.order_ref,
    purpose: o.purpose,
    status: o.status,
    amountPaise: o.amount_paise,
    providerOrderId: o.provider_order_id ?? null,
    providerPaymentRef: o.provider_payment_ref ?? null,
    parentOrderId: o.parent_order_id ?? null,
    paidAt: o.paid_at ?? null,
    failureReason: o.failure_reason ?? null,
    createdAt: o.created_at,
  }));

  const entitlements: EntitlementLite[] = (entitlementsRes.data ?? []).map((e) => ({
    id: e.id,
    orderId: e.order_id,
    kind: e.kind,
    grantedAt: e.granted_at ?? null,
    consumedAt: e.consumed_at ?? null,
  }));

  const events: WebhookEventLite[] = (eventsRes.data ?? []).map((e) => ({
    id: e.id,
    eventId: e.event_id ?? null,
    eventType: e.event_type,
    providerOrderId: e.provider_order_id ?? null,
    signatureValid: e.signature_valid,
    isDuplicate: e.is_duplicate,
    outcome: e.outcome,
    createdAt: e.created_at,
  }));

  const entitlementAudit = auditEntitlements(orders, entitlements);

  return {
    metrics: computePaymentMetrics(orders, entitlements, events),
    entitlementAudit,
    recentOrders: orders.slice(0, 25),
    recentEvents: events.slice(0, 25),
    generatedAt: new Date().toISOString(),
    allEntitlementsOk: entitlementAudit.every((r) => r.ok),
  };
}
