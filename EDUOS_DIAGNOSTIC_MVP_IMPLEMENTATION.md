# EduOS — ₹199 Diagnostic MVP Implementation

- **Date:** 2026-08-27
- **Scope:** Parent-facing purchase → diagnostic → gap report → ₹2,999 upgrade
- **Content:** Imported CBSE Class 10 Mathematics and Science only
- **Payment:** Razorpay live gateway — order created server-side, signature-verified checkout, and a signature-verified `payment.captured` / `payment.failed` webhook
- **Status:** Implemented and verified end to end in the preview environment

---

## 1. What shipped

The imported Class 10 curriculum is now purchasable by a parent with no account, no centre, and no staff involvement. A parent picks a subject and chapter group, pays ₹199, their child answers an outcome-mapped diagnostic, and the platform returns a ranked, outcome-level gap report with the intervention attached to each gap and a credited upgrade path to the ₹2,999 Board Success Plan.

Nothing new was invented for question selection or scoring: the paid path reuses the same blueprint allocation engine (`buildDiagnosticPlan`, largest-remainder on `diagnostic_weight`) and the same 70% gap threshold the centre product uses, so a parent's numbers and a centre's numbers cannot disagree.

---

## 2. Screens and routes

| # | Screen | Route | Auth | Purpose |
| --- | --- | --- | --- | --- |
| 1 | Diagnostic start / purchase | `/diagnostic` | Public | Sell; board→subject→chapter-group selector; sample of what the report contains; FAQ; ₹199 CTA repeated three times |
| 2 | Checkout | `/diagnostic/checkout/$orderRef` | Public, order-scoped | Child's first name + parent contact; Razorpay Checkout; provisions the learner and the diagnostic after verified capture |
| 3 | Diagnostic session | `/diagnostic/session/$token` | Token | One question per screen, phone-first, saved after every answer, resumable |
| 4 | Gap report / parent results | `/diagnostic/report/$token` | Token | Headline, band strip, ranked gaps, what is already secure, 12-week projection, upgrade block |
| 5 | Upgrade | `/upgrade/$token` | Token | ₹2,999 plan with the ₹199 credit applied; single CTA, no comparison table |

`/diagnostic` is in the sitemap and carries full metadata. Every token-scoped screen is `noindex`.

Authorisation on the parent path is a 32-character unguessable `access_token` minted per order, checked server-side on every call. The token is only returned once the order is paid.

---

## 3. Data flow

```text
/diagnostic
   selector (localStorage-persisted)
        │  startDiagnosticOrder({ bookId, unitId })
        ▼
parent_orders  status=created, amount_paise=19900 (server-set)
        │  verifyPayment (checkout signature) + /api/public/razorpay-webhook (payment.captured)
        ▼
parent_orders  status=paid, paid_at
parent_entitlements  kind=diagnostic_credit  (granted here, nowhere else)
        │  completeDiagnosticSetup({ child, parent contact })
        ▼
learners            (org = the book's org, is_demo=false)
assessments         kind=diagnostic, status=published, book_id+unit_id
assessment_question_map   ← buildDiagnosticPlan allocation
assessment_sessions status=in_progress
        │  saveDiagnosticAnswer  (per answer, resumable)
        ▼
submitDiagnosticRun
   ├─ server-side grading against question_bank.correct_answer
   ├─ assessment_sessions: status=submitted, score_pct, result=report JSON
   ├─ learning_gaps: one row per outcome below 70%
   └─ parent_entitlements: diagnostic_credit consumed_at set
        ▼
/diagnostic/report/$token   report JSON + upgradeOffer()
        │  startUpgradeOrder → payDiagnosticOrder
        ▼
parent_orders  purpose=board_success_plan, parent_order_id=<diagnostic>
parent_entitlements  kind=board_success_plan, expires_at=+365d
```

### Tables used

- `parent_orders` — one row per purchase (diagnostic or plan), carries the order ref, access token, server-set amount, curriculum selection, contact details, and the provisioned learner/assessment/session ids.
- `parent_entitlements` — the only record of what was bought. Written exclusively by the payment-confirmation path.
- Existing platform tables: `books`, `curriculum_units`, `assessment_outcomes`, `question_bank`, `assessments`, `assessment_question_map`, `assessment_sessions`, `learners`, `learning_gaps`, `book_events`.

No new schema was needed for the diagnostic itself — the parent path writes the same rows the centre path does, which is why the gaps it produces are immediately actionable by interventions, tutor, and reassessment.

---

## 4. Curriculum mapping

Only the validated Class 10 import is on sale. The catalogue query is derived, not hardcoded:

1. Find books that have `question_bank` rows with `source = 'import'` and `status = 'approved'`.
2. Keep those at `grade = 10` and not archived.
3. For each chapter group (`curriculum_units`), count active `assessment_outcomes` and their approved questions.
4. Publish only chapter groups with at least 5 approved questions; the sale size is `min(20, approved)`.

This means new imported content becomes purchasable automatically, and content that is archived or unapproved disappears from sale without a code change.

Question selection per order:

- Outcomes: all `status = 'active'` outcomes for the chosen book + unit.
- Allocation: `buildDiagnosticPlan({ template: 'diagnostic' })` — largest-remainder distribution of the question budget across `diagnostic_weight`, deterministic ordering, blueprint compliance recorded on the assessment description.
- The reassessment engine's fresh-item guarantee is untouched, so the improvement claim behind the ₹2,999 plan still holds on the paid path.

---

## 5. Diagnostic scoring

Scoring is server-side only. Correct answers and explanations are never sent to the browser before submission — `loadRun` returns prompt, stimulus, options, and outcome code, nothing else.

| Step | Rule |
| --- | --- |
| Item grading | Case- and whitespace-insensitive exact match against `question_bank.correct_answer`; unanswered counts as incorrect |
| Outcome mastery | `correct / total` per outcome, rounded |
| Bands | Weak < 40 · Developing 40–59 · Secure 60–79 · Strong 80+ — always rendered with the label, never colour alone |
| Gap | Any outcome below **70%** — the same threshold the centre gap engine uses |
| Severity | high < 40 · moderate 40–59 · low 60–69 |
| Gap ranking | `weight × (100 − pct)`, worst first |
| Marks at risk | Outcome's share of the *assessed* weight × ~20 marks per chapter group; labelled an estimate, never a prediction |
| Projection | 12 weeks, +25 to +45 mastery points, explicitly labelled a pilot-median projection |

The scored report is persisted onto `assessment_sessions.result`, so the parent's report and any later internal view read the same object rather than recomputing.

All of this lives in `src/lib/parent-diagnostic-shared.ts` — pure, no I/O, unit-testable, and shared verbatim between the server and the report UI.

---

## 6. Upgrade trigger logic

`upgradeOffer()` is the single decision point, consulted by the report page, the upgrade page, and the server before an amount is written:

- The ₹199 credit applies only when the diagnostic is paid, the credit is unredeemed, and `now < paid_at + 30 days`.
- Inside the window, year one is **₹2,800**; renewal is quoted at ₹2,999.
- Outside it, the page shows ₹2,999 with **no struck-through price** — no false discount.
- `upgradeTrigger()` decides the headline: gaps found → "Close N gaps this year"; nothing below threshold → "Keep this level through the board year". The upgrade block is never hidden, because a parent should always be able to see what they are not getting.
- A second purchase is impossible: `createUpgradeOrder` returns the existing paid plan order instead of minting a new one, and the report/upgrade pages switch to an "already active" state.

`resolveCapabilities()` maps entitlement rows to capabilities (diagnostics, tutor, reassessment, fortnightly report) as the resolver every future gated surface should consult.

---

## 7. Money-path invariants held

1. **Price is never accepted from the client.** Both the ₹199 and the plan amount are read from `PRICING` on the server; the checkout pages send no amount at all.
2. **Entitlements have exactly one writer** — the payment-confirmation path. The browser cannot grant anything, and `parent_entitlements` has no client-role write policy.
3. **Replays grant nothing twice.** Payment confirmation is guarded by a status transition (`created → paid`) and an existing-entitlement check; a repeated call returns the same order unchanged.
4. **The credit is consumed at submission, not at start** — an abandoned attempt stays resumable and does not burn the purchase.
5. **The report survives non-conversion.** It stays permanently reachable on the parent's link whether or not they upgrade.
6. **No card data touches EduOS.** The MVP collects none, and the live flow will hand off to the provider's checkout.

---

## 8. Verified in the preview environment

| Check | Result |
| --- | --- |
| Catalogue lists only imported Class 10 Maths and Science | Pass |
| ₹199 order created with server-set amount | Pass |
| Capture (checkout signature or webhook) grants exactly one `diagnostic_credit` | Pass |
| Learner + assessment + question map + session provisioned from the order | Pass |
| Diagnostic answered end to end, answers persisted per question | Pass |
| Server-side scoring produced outcome-level bands and ranked gaps | Pass |
| `learning_gaps` rows written for every outcome below 70% | Pass |
| Report shows credited upgrade price ₹2,800 with days remaining | Pass |
| Upgrade purchase activates the plan and marks the credit redeemed | Pass |
| Re-visiting the upgrade page after purchase shows "already active", no second order | Pass |
| Typecheck clean, no browser console errors across the whole funnel | Pass |

---

## 9. What this MVP deliberately does not do

- **Razorpay is live in the code path.** `startRazorpayCheckout` creates the gateway order (amount read from the stored order, never the page), the browser pays through Razorpay Checkout, and `verifyRazorpayCheckout` verifies the `order_id|payment_id` HMAC before `markOrderPaid` grants entitlements. `/api/public/razorpay-webhook` verifies `X-Razorpay-Signature` over the raw body and calls the same idempotent capture for `payment.captured`; `payment.failed` marks the order failed with the gateway reason.
- **Secrets:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (backend env). The key id reaches the browser only through the per-order payment intent.
- **Webhook URL to configure in Razorpay:** `https://www.eduos.global/api/public/razorpay-webhook` (events: `payment.captured`, `payment.failed`).
- Diagnostic, scoring, reporting, and upgrade-offer logic are unchanged; only the capture path was replaced.
- **No parent login yet.** Access is by link. A password-backed account and portal linking are the natural next step, and the learner row is already provisioned to attach to.
- **No lifecycle messaging.** The D0–D30 email/WhatsApp sequence and the D5 free tutor unlock from the monetization plan are not built.
- **No entitlement gating on the authenticated app yet.** `resolveCapabilities()` exists and is correct, but the in-app surfaces still follow the centre entitlement model; centre-provisioned learners must never see a parent paywall when that gating is added.
- **No PDF export.** The report prints cleanly from the browser; a generated PDF and WhatsApp share of that file are not implemented.

---

**Guardrail held:** every number a parent sees comes from the same engine and the same thresholds the centre product uses, and every forward-looking figure on the report is labelled a projection.
