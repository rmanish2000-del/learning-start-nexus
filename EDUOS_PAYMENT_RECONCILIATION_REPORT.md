# EduOS Payment Reconciliation Report

**Last verified:** 2026-08-27 (UTC)
**Evidence source:** Razorpay live API (`/v1/orders`, `/v1/webhooks`),
`parent_orders`, `parent_entitlements`, `payment_webhook_events`.
No secret value is printed anywhere in this report.

---

## Task 2 — Razorpay live configuration

| Check | Result | Evidence |
|---|---|---|
| Active Key ID begins `rzp_live_` | **PASS** | key prefix read at runtime: `rzp_live_` |
| Credential source | **Runtime environment secrets** (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`); `payment_credentials` (AES-256-GCM) is the optional admin-managed override | `resolveRazorpayCredentials()` |
| Live webhook secret configured | **PASS** | `secret_exists: true` on the live webhook; app-side secret present |
| Webhook URL | **PASS** | `https://www.eduos.global/api/public/razorpay-webhook`, `service: api-live`, `active: true`, `disabled_at: 0` |
| `payment.captured` enabled | **PASS** | `true` |
| `payment.failed` enabled | **PASS** | `true` |
| App secret ↔ Razorpay secret correspond | **PASS** | live delivery for `order_TUVH2GeGsjER9J` was logged with `signature_valid = true` and captured — only possible if the secrets match |

All other webhook events are disabled; the handler acknowledges and ignores them.

---

## Task 3A — Earth Patel ₹2,800 order

Order `EDUMTAGBX9J255246` (`6bfa0d32…`), purpose `board_success_plan`.

| Question | Answer |
|---|---|
| Is ₹2,800 = ₹2,999 − ₹199 credit? | **Yes.** `amount_paise = 280000`; `parent_order_id` points at the paid ₹199 order `3762d229…`, i.e. the credit was applied |
| Razorpay order status | `created` — `amount_paid: 0`, `amount_due: 280000`, **`attempts: 0`** |
| Payment status | **No payment exists.** `/v1/orders/order_TUVJUiWVV6SHEA/payments` → `count: 0` |
| Gateway failure code / description | **None.** Razorpay never saw an attempt |
| Application failure reason | `Checkout dismissed by the parent` |
| Webhook history | No webhook for this order — correct, nothing happened at the gateway |
| Entitlement state | No `board_success_plan` entitlement for this parent — correct |
| Is the ₹199 credit still available? | The ₹199 credit was **granted and consumed** by the diagnostic (`granted_at 18:51:25`, `consumed_at 18:52:25`). It remains linked to the upgrade as the ₹199 discount, so a retry is still priced at ₹2,800 |

**Classification: legitimate abandoned checkout, no money moved, no defect.**
The order was not marked paid and must not be.

---

## Task 3B — Orders stuck at `created`

| Order | Parent | Amount | Created | Gateway order | Classification |
|---|---|---|---|---|---|
| `EDUMTAF5T4VB9B4CE` | `fffffff1-…0001` (seeded demo parent) | ₹199 | 2026-08-26 18:20 | none | **Abandoned before the gateway** — the parent left the page between order creation and Razorpay order creation |
| `EDUMTAF5298D2486F` | `fffffff1-…0001` (seeded demo parent) | ₹199 | 2026-08-26 18:19 | none | **Abandoned before the gateway** (duplicate attempt 35 s earlier) |

Neither is "captured but unreconciled": both have `provider_order_id = NULL`, so
no Razorpay order and therefore no possible capture. Not an application defect —
but the absence of expiry handling was a gap, because abandoned rows looked
pending forever.

### Reconciliation / expiry handling added

- `parent_orders.status` now also accepts `expired`.
- New `public.expire_stale_parent_orders(older_than interval default '24 hours')`
  — `SECURITY DEFINER`, executable only by the service role. It moves orders that
  are `created`, have **no** gateway order and **no** `paid_at` and are older than
  the interval to `expired` with an explanatory reason. It can never touch a
  paid, failed or gateway-backed order.
- Run once at 12 h: **2 rows expired** (the two above).

---

## Payment integrity checks

| Check | Result |
|---|---|
| Every `paid` order has exactly one entitlement | PASS (4 paid / 4 entitlements) |
| Any entitlement without a paid order | none |
| Any `failed`/`expired` order with an entitlement | none |
| Duplicate captures for one gateway order | none — webhook log shows one `captured` per `provider_order_id` |
| Unsigned or wrongly signed deliveries accepted | none — rejects are logged as `rejected-signature` |
| Live capture proven end to end | `order_TUVH2GeGsjER9J` → `pay_TUVHXukFzrd20x` → entitlement → diagnostic consumed |

Three older `sim_…` orders are simulator fixtures from acceptance testing, not
real money.
