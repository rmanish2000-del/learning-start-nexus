// Payment validation framework — pure, dependency-free domain logic shared by
// the Payment Audit dashboard and the acceptance test suite.
//
// Observability only: nothing here writes, and no payment behaviour depends on
// these functions.

export type OrderLite = {
  id: string;
  orderRef: string;
  purpose: string;
  status: string;
  amountPaise: number;
  providerOrderId: string | null;
  providerPaymentRef: string | null;
  parentOrderId: string | null;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
};

export type EntitlementLite = {
  id: string;
  orderId: string;
  kind: string;
  grantedAt: string | null;
  consumedAt: string | null;
};

export type WebhookEventLite = {
  id: string;
  eventId: string | null;
  eventType: string;
  providerOrderId: string | null;
  signatureValid: boolean;
  isDuplicate: boolean;
  outcome: string;
  createdAt: string;
};

export type PaymentMetric = {
  key: string;
  label: string;
  value: number;
  hint: string;
};

export function countDuplicateWebhookEvents(events: WebhookEventLite[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const e of events) {
    const key = e.eventId ?? `${e.eventType}:${e.providerOrderId ?? ""}:${e.id}`;
    if (seen.has(key)) duplicates += 1;
    else seen.add(key);
  }
  return duplicates;
}

export function computePaymentMetrics(
  orders: OrderLite[],
  entitlements: EntitlementLite[],
  events: WebhookEventLite[],
): PaymentMetric[] {
  const paid = orders.filter((o) => o.status === "paid");
  const failed = orders.filter((o) => o.status === "failed");
  const pending = orders.filter((o) => o.status !== "paid" && o.status !== "failed");

  return [
    {
      key: "orders_created",
      label: "Orders created",
      value: orders.length,
      hint: "Rows in parent_orders (₹199 diagnostic + ₹2,999 plan).",
    },
    {
      key: "payments_captured",
      label: "Payments captured",
      value: paid.length,
      hint: "Orders marked paid after a verified signature.",
    },
    {
      key: "payments_failed",
      label: "Payments failed",
      value: failed.length,
      hint: "Declined, cancelled, or signature-rejected checkouts.",
    },
    {
      key: "payments_pending",
      label: "Pending payments",
      value: pending.length,
      hint: "Created or in-checkout, never captured or failed.",
    },
    {
      key: "webhook_events",
      label: "Webhook events received",
      value: events.length,
      hint: "Every payment webhook logged after signature verification.",
    },
    {
      key: "webhook_duplicates",
      label: "Duplicate webhook events",
      value: countDuplicateWebhookEvents(events),
      hint: "Replays of a gateway event id already processed — must grant nothing twice.",
    },
    {
      key: "entitlements_granted",
      label: "Entitlements granted",
      value: entitlements.length,
      hint: "Diagnostic credits + Board Success Plan grants.",
    },
    {
      key: "credits_applied",
      label: "Upgrade credits applied",
      value: entitlements.filter((e) => e.kind === "diagnostic_credit" && e.consumedAt).length,
      hint: "₹199 diagnostic credits consumed by a Board Success Plan purchase.",
    },
  ];
}

// --- Entitlement audit -----------------------------------------------------

export type EntitlementAuditRow = {
  orderRef: string;
  purpose: string;
  status: string;
  amountPaise: number;
  paymentExists: boolean;
  orderExists: boolean;
  entitlementExists: boolean;
  grantedOnce: boolean;
  entitlementCount: number;
  kind: string | null;
  creditApplied: boolean | null;
  ok: boolean;
  issues: string[];
};

export function expectedEntitlementKind(purpose: string): string {
  return purpose === "diagnostic" ? "diagnostic_credit" : "board_success_plan";
}

/**
 * For every paid purchase, verify: payment exists, order exists, entitlement
 * exists, and the entitlement was granted exactly once.
 */
export function auditEntitlements(
  orders: OrderLite[],
  entitlements: EntitlementLite[],
): EntitlementAuditRow[] {
  return orders
    .filter((o) => o.status === "paid")
    .map((order) => {
      const kind = expectedEntitlementKind(order.purpose);
      const mine = entitlements.filter((e) => e.orderId === order.id && e.kind === kind);
      const paymentExists = Boolean(order.providerPaymentRef) && Boolean(order.paidAt);
      const orderExists = Boolean(order.providerOrderId);
      const entitlementExists = mine.length > 0;
      const grantedOnce = mine.length === 1;

      const issues: string[] = [];
      if (!paymentExists) issues.push("No gateway payment reference recorded against a paid order.");
      if (!orderExists) issues.push("No gateway order id recorded — order was never created at the gateway.");
      if (!entitlementExists) issues.push(`Paid order has no ${kind} entitlement.`);
      if (mine.length > 1) issues.push(`Entitlement granted ${mine.length} times (must be exactly once).`);

      let creditApplied: boolean | null = null;
      if (kind === "board_success_plan" && order.parentOrderId) {
        const credit = entitlements.find(
          (e) => e.orderId === order.parentOrderId && e.kind === "diagnostic_credit",
        );
        creditApplied = Boolean(credit?.consumedAt);
        if (credit && !credit.consumedAt) {
          issues.push("₹199 credit was discounted on this invoice but never consumed.");
        }
      }

      return {
        orderRef: order.orderRef,
        purpose: order.purpose,
        status: order.status,
        amountPaise: order.amountPaise,
        paymentExists,
        orderExists,
        entitlementExists,
        grantedOnce,
        entitlementCount: mine.length,
        kind,
        creditApplied,
        ok: issues.length === 0,
        issues,
      };
    });
}

export type AcceptanceScenario = {
  id: string;
  title: string;
  expectation: string;
};

/** The ten acceptance scenarios the automated suite must cover. */
export const ACCEPTANCE_SCENARIOS: AcceptanceScenario[] = [
  { id: "A", title: "New user purchase", expectation: "Order is created as pending with a gateway order id and no entitlement." },
  { id: "B", title: "Successful payment", expectation: "Verified signature captures the order and grants exactly one entitlement." },
  { id: "C", title: "Failed payment", expectation: "Order is marked failed with the gateway reason; no entitlement." },
  { id: "D", title: "Cancelled payment", expectation: "Abandoned checkout is recorded as failed and can be retried." },
  { id: "E", title: "Duplicate webhook", expectation: "Replayed payment.captured grants nothing twice." },
  { id: "F", title: "Delayed webhook", expectation: "Webhook arriving after browser verification is a no-op." },
  { id: "G", title: "Refresh during checkout", expectation: "Re-opening checkout reuses the same gateway order, never a second one." },
  { id: "H", title: "Logout and login after payment", expectation: "Access token still resolves the paid order and its entitlement." },
  { id: "I", title: "Resume diagnostic", expectation: "Paid order keeps its session; capture never resets progress." },
  { id: "J", title: "Upgrade with ₹199 credit", expectation: "Plan grant issued and the diagnostic credit is consumed once." },
];
