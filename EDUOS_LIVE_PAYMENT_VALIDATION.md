# EduOS Live Payment Validation

Date: 2026-08-26

## Gateway configuration

| Item | Expected | Observed | Status |
|---|---|---|---|
| `RAZORPAY_KEY_ID` | `rzp_live_…` | `rzp_test_…` (confirmed from the running server process) | **BLOCKED** |
| `RAZORPAY_KEY_SECRET` | live secret | set, paired with the test key id | **BLOCKED** |
| `RAZORPAY_WEBHOOK_SECRET` | live-mode webhook secret | set | Pending live pairing |
| Webhook endpoint | `/api/public/razorpay-webhook` | present, signature-verified before any state change | PASS |
| Events handled | `payment.captured`, `payment.failed` | both handled; unrelated events acknowledged and ignored | PASS |

The application code is mode-agnostic: `src/lib/razorpay.server.ts` reads
`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` at call time and derives the mode
from the key prefix (`razorpayMode()`), so switching to live requires **only**
replacing the two secret values plus the live-mode webhook secret. No code
change is needed. There are no separate `RAZORPAY_TEST_*` / `RAZORPAY_LIVE_*`
variables to migrate.

## Automated acceptance (test mode)

`vitest run` — **42/42 passing**, covering:

- Checkout handler signature verification: valid, wrong secret, tampered body.
- Webhook signature verification: unsigned rejected (401), wrong secret rejected, body altered after signing rejected.
- `payment.captured` → order marked paid, entitlement granted, diagnostic unlocked.
- `payment.failed` → order marked failed with the gateway reason, no entitlement.
- Idempotency: duplicate event ids recorded as duplicates, entitlements granted once.
- Retry semantics: handler throws → 500 so Razorpay retries.
- Ownership: orders and entitlements bound to `parent_user_id`; cross-account access denied.
- Unrelated events acknowledged without side effects.

## Live acceptance run — NOT EXECUTED

The live sequence (Parent account → ₹199 purchase → live payment → webhook →
entitlement → diagnostic unlock → report → logout/login persistence) cannot be
executed while the gateway is in test mode. Steps once live keys are supplied:

1. Save live `RAZORPAY_KEY_ID` (`rzp_live_…`) and its matching key secret.
2. In the Razorpay dashboard, create a **live-mode** webhook pointing at
   `https://www.eduos.global/api/public/razorpay-webhook`, subscribed to
   `payment.captured` and `payment.failed`; save its secret as
   `RAZORPAY_WEBHOOK_SECRET`.
3. Publish, then run one real ₹199 purchase from a parent account.
4. Verify in `/payment-audit`: order `paid`, webhook event `signature_valid`,
   entitlement granted, diagnostic unlocked, report reachable after logout/login.
5. Refund the acceptance payment from the Razorpay dashboard.

## Status

Live payment readiness: **BLOCKED — test-mode credentials still active.**
