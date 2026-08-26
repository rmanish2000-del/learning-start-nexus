# EduOS — Parent Monetization v1

- **Date:** 2026-08-26
- **Live app:** https://www.eduos.global
- **Status:** Design and implementation plan. No implementation in this pass.
- **Payment provider:** Razorpay (existing merchant account, INR only)
- **Funnel goal:** ₹199 Diagnostic → ₹2,999 Board Success Plan (annual)

---

## 0. Why this exists

EduOS already proves the loop — Diagnostic → Gap → Intervention → AI Tutor → Reassessment → Verified evidence. Every part of that loop is currently free and reachable only through a tutoring centre. This plan opens a **direct-to-parent** path that monetises the one thing parents already pay for elsewhere and EduOS does better: a rigorous, curriculum-mapped diagnosis of exactly where their child is losing marks, followed by a paid year of closing those gaps.

Two products only. No tiers, no add-ons, no credits.

| Product | Price | Billing | What it is |
| --- | --- | --- | --- |
| **Diagnostic** | ₹199 | One-time | One full curriculum-mapped diagnostic for one child in one subject, plus the outcome-level gap report |
| **Board Success Plan** | ₹2,999 | Annual (auto-renew) | Unlimited diagnostics and reassessments, AI Tutor, intervention plan, fortnightly parent reports, evidence portfolio — one child, all subjects, one board year |

₹199 is deliberately priced as an impulse, not a decision: below a single tuition class in every Indian metro. It exists to buy the parent's attention and to hand EduOS an evidence artefact that makes the ₹2,999 obvious.

---

## 1. ₹199 Diagnostic Flow

### 1.1 End-to-end flow

```text
Landing / ad / centre referral
      ↓
/diagnostic                       Purchase page — pick board, grade, subject
      ↓
Razorpay Checkout (₹199, one-time order)
      ↓
Webhook: payment.captured  →  entitlement: diagnostic_credit (1)
      ↓
/diagnostic/setup                 Child's first name + parent email/phone (account created here, not before)
      ↓
/diagnostic/session/$sessionId    20–25 curriculum-mapped items, resumable
      ↓
Server scoring (existing engine)  →  outcome-level mastery + gaps
      ↓
/diagnostic/report/$reportId      Results page (see §3)
      ↓
Upgrade CTA → ₹2,999 Board Success Plan
```

### 1.2 Rules

- **Pay before account.** The parent pays as a guest; the account is created from the Razorpay contact details on `payment.captured`. Asking for a signup before ₹199 roughly halves conversion in this category.
- **One credit = one diagnostic session** for one child in one subject. The credit is consumed when the session is *submitted*, not when it starts, so an abandoned attempt is resumable and does not burn the purchase.
- **Credit never expires** in v1. Support cost of expiry disputes exceeds the revenue it protects.
- **Refund posture:** full refund on request within 7 days if the diagnostic was never submitted; no refund after the report is generated (the artefact has been delivered). Stated on the purchase page, not buried in Terms.
- **Assessment content** is the existing curriculum-driven diagnostic engine (largest-remainder outcome allocation, blueprint compliance). Nothing new is built for question selection.
- **Reassessment items are held back.** The engine already guarantees zero question overlap between diagnostic and reassessment; that guarantee is what makes the ₹2,999 lift claim defensible, so it must hold on the paid path too.

### 1.3 Screens

| Screen | Route | Purpose |
| --- | --- | --- |
| Purchase | `/diagnostic` | Sell and take payment (§2) |
| Setup | `/diagnostic/setup` | Child name, grade confirm, parent contact; creates the account |
| Session | `/diagnostic/session/$sessionId` | The diagnostic itself; resumable, one question per screen on mobile |
| Scoring interstitial | inline | "Scoring against 18 CBSE outcomes…" — 3–6s, sets up perceived rigour |
| Report | `/diagnostic/report/$reportId` | The product (§3) |
| Upgrade | `/upgrade` | Plan purchase (§5, §8) |

---

## 2. Diagnostic Purchase Page — `/diagnostic`

Public, unauthenticated, phone-first. This page has one job: convert a cold parent to ₹199 in under 90 seconds.

### Structure

1. **Hero** — "Find out exactly where your child is losing marks. ₹199." Sub: "A 25-question curriculum diagnostic, mapped to every CBSE learning outcome in the chapter. You get the report in 20 minutes."
2. **Selector, above the fold** — Board → Grade → Subject, three taps, cascading off the existing curriculum tables. Price stays fixed at ₹199 regardless of selection; no configurator anxiety.
3. **What you get** — four items with the actual artefact next to each: outcome-level mastery bands (Weak / Developing / Secure / Strong), the named gaps in priority order, the recommended intervention for each gap, a shareable PDF.
4. **Sample report** — inline anonymised sample, the same artefact from the public landing page. This is the single highest-leverage block on the page.
5. **Why it is not a quiz** — three lines: curriculum-mapped to the child's board and chapter, scored server-side against outcomes not topics, reassessment uses fresh items so improvement cannot be faked.
6. **Price block + CTA** — ₹199, one-time, no auto-renew, no card stored. Primary button: **"Start the diagnostic — ₹199"**. Secondary text link: "See a sample report".
7. **Trust row** — Razorpay-secured, UPI/cards/netbanking, data stays in India, no marketing calls, refund line.
8. **FAQ** — 6 answers: how long it takes, who supervises, can it be done on a phone, what if my child scores badly, is the ₹199 adjusted against the plan (yes — see §8), what happens to the data.

### Conversion notes

- CTA repeats three times: hero, after the sample report, after the FAQ.
- No navigation chrome except the logo — every outbound link is a leak.
- The board/grade/subject selection is persisted in `localStorage` **before** checkout opens, so a dropped payment can be resumed with one tap.

---

## 3. Diagnostic Results Page — `/diagnostic/report/$reportId`

The report is the product *and* the sales pitch for the plan. It must be honest enough that a parent trusts it, and specific enough that inaction feels irresponsible.

### Sections, in order

1. **Headline** — "Aarav is Secure on 11 of 18 outcomes in Fractions." One sentence, no score-out-of-100 shaming.
2. **Mastery band strip** — the four bands with counts, colour *and* label (accessibility: never colour-only).
3. **The gaps, ranked** — each gap card carries: the outcome in plain parent language, the questions missed, the misconception the engine inferred, the marks at risk in the board exam, and the recommended intervention. Ranked by exam weight × severity, worst first.
4. **What good looks like** — the same chapter's Secure outcomes, so the report reads as a diagnosis, not a verdict.
5. **The 12-week closure projection** — for the ranked gaps, what the loop would do: interventions, tutor practice, reassessment on fresh items, expected mastery lift band. Framed as *the plan*, explicitly labelled a projection based on pilot cohort medians, never as a promise.
6. **Conversion block** — "Close these 7 gaps this year — ₹2,999" with the ₹199 credit visibly deducted (**"You pay ₹2,800"**). Secondary: "Email me this report" / "Download PDF".
7. **Share** — WhatsApp share of the PDF. Parent-to-parent sharing is the cheapest acquisition channel in this market; the shared PDF footer carries a `/diagnostic` link.

### Rules

- Every number on the report uses the canonical metric layer (`closure-shared.ts` vocabulary). A number that disagrees with the in-app figure later destroys the relationship.
- No projection is shown as a guaranteed outcome. Band language only ("typically +25 to +45 points of mastery").
- The report remains permanently accessible to the parent even if they never upgrade. Withdrawing it would be the wrong trade for a ₹199 purchase.

---

## 4. Parent Conversion Journey

```text
D0   Ad / referral / centre share      →  /diagnostic
D0   Pays ₹199                         →  account created, credit granted
D0   Child completes diagnostic        →  report delivered (target: same session)
D0   Report page                       →  upgrade CTA #1  (peak intent — the gaps are on screen)
D0+1h Email + WhatsApp: report PDF     →  upgrade CTA #2
D2   Email: "What we'd do about gap 1" →  shows the actual intervention + tutor sample
D5   Free taste: one AI Tutor session on the top gap, unlocked for 48h → CTA #3
D7   Email: reassessment offer — "See if that one session moved the needle"
D10  Final: ₹199 credit expiry reminder (credit toward the plan expires D30, not the diagnostic itself)
D30  Dormant → quarterly re-diagnostic nudge
```

### The D5 free tutor session is the core mechanic

The report proves the diagnosis; the tutor session proves the *remedy*. Parents convert on evidence that something is being done, not on a list of problems. One scoped Socratic session on the single top gap, consent-gated exactly as in the product today, is the highest-yield conversion asset available and costs one AI call.

### Conversion assumptions (planning baseline — to be replaced with measured data)

| Step | Assumption | Basis |
| --- | --- | --- |
| Purchase page → paid | 4–8% | Typical low-ticket Indian edtech landing page with a visible sample artefact |
| Paid → diagnostic submitted | 75% | Pay-first filters intent hard; loss is scheduling, not interest |
| Submitted → report viewed | 95% | Report opens automatically |
| Report viewed → upgrade (D0, on-page) | 6–10% | Peak-intent moment |
| Full 30-day window → upgrade | 12–18% | With the D5 tutor unlock; 6–9% without it |
| Annual plan renewal (Y2) | 55–65% | Board-year cohorts churn on exam completion; renewal depends on grade progression |

**Unit economics at the mid case** (100 purchase-page visitors, 6% → 6 diagnostics = ₹1,194; 15% of 6 upgrade ≈ 0.9 plans = ₹2,520 net of credit). Blended revenue ≈ **₹3,714 per 100 visitors ≈ ₹37 per visitor**. This is the number that sets the paid-acquisition ceiling: CAC must stay under ~₹25 per visitor for the funnel to fund itself, otherwise the funnel is a referral/centre channel only. **Do not buy paid traffic until the first 200 diagnostics have produced a measured upgrade rate.**

### Guardrails

- No dark patterns: no fake scarcity, no countdown timers, no "your child is behind" fear copy. The gap list is alarming enough when it is true, and this audience talks to each other.
- Maximum 6 lifecycle messages in 30 days across all channels combined.
- Every message carries one-tap unsubscribe; WhatsApp only to numbers that opted in at checkout.

---

## 5. ₹2,999 Board Success Plan

### What the parent buys

One child, one board year, all subjects available for that grade:

- Unlimited diagnostics and reassessments (fresh items guaranteed on every reassessment)
- Full gap analysis with intervention plan, refreshed as gaps close
- AI Tutor, unlimited, scoped to approved interventions, consent-gated
- Fortnightly parent report — gaps detected, gaps closed, mastery lift, tutor minutes
- Evidence portfolio with verifier attribution
- Priority support

### Pricing rationale

₹2,999/year is ~₹250/month — under one hour of home tuition per month in a Tier-2 city, and comfortably inside a parent's discretionary decision without a spousal conversation. It is deliberately not ₹4,999: the goal in v1 is *volume of proven outcomes*, which is the asset that makes the centre business and any later price increase defensible.

### Billing

- **Annual, auto-renewing**, via Razorpay Subscriptions.
- **₹199 credited** against the first year when the parent upgrades within 30 days of the diagnostic → first charge ₹2,800, renewals at ₹2,999. Implemented as a one-time Razorpay offer/discount on the first invoice, never as a separate refund.
- **Cancel anytime**, access runs to the paid period end. No pro-rata refunds; stated plainly at checkout.
- **Second child:** ₹2,499 (sibling price) — same plan, separate subscription. Sold from inside the app, not on the public page.
- **GST** at the prevailing rate on education-technology SaaS; the displayed price is inclusive, invoice shows the split.

---

## 6. Razorpay Integration Design

Uses the existing Razorpay merchant account. All money-touching logic is server-side; the browser never sees a secret and never decides entitlement.

### 6.1 Objects to create in the Razorpay dashboard

| Object | Purpose |
| --- | --- |
| Plan `eduos_board_success_annual` | ₹2,999, yearly interval |
| Plan `eduos_board_success_annual_sibling` | ₹2,499, yearly interval |
| Offer `eduos_diag_credit_199` | ₹199 off first invoice, single use |
| Webhook endpoint | Points at `/api/public/razorpay-webhook` |

### 6.2 Server surfaces (all new)

| Surface | Type | Responsibility |
| --- | --- | --- |
| `createDiagnosticOrder` | server function | Creates a ₹199 Razorpay **Order**, returns `order_id` + public key. Amount is server-set; the client cannot pass a price. |
| `createPlanSubscription` | server function | Creates a Razorpay **Subscription** against the annual plan, applies the ₹199 offer when the caller holds an unredeemed, unexpired diagnostic credit |
| `/api/public/razorpay-webhook` | public server route | The only writer of entitlements. Verifies `X-Razorpay-Signature` (HMAC-SHA256 over the raw body, `timingSafeEqual`) before parsing |
| `getEntitlements` | server function | Reads the caller's current entitlement state for the UI |
| `cancelSubscription` | server function | Calls Razorpay cancel-at-cycle-end, mirrors state locally |
| `/api/public/razorpay-webhook` replay guard | — | `razorpay_event_id` unique column; duplicate deliveries are acknowledged with 200 and ignored |

### 6.3 Webhook events consumed

| Event | Action |
| --- | --- |
| `payment.captured` (order = diagnostic) | Create/attach parent account, grant `diagnostic_credit`, send report-access link |
| `payment.failed` | Log attempt; trigger the abandoned-checkout recovery email |
| `subscription.activated` | Grant `board_success_plan` entitlement, mark the ₹199 credit redeemed |
| `subscription.charged` | Extend `current_period_end` |
| `subscription.pending` / `subscription.halted` | Mark payment-problem state, in-app banner + email, keep access for a 7-day grace window |
| `subscription.cancelled` | Set access end at `current_period_end`; do not revoke immediately |
| `refund.processed` | Revoke the matching entitlement |

### 6.4 Data model (new tables, `public` schema)

All follow the project's mandatory order: `CREATE TABLE` → `GRANT` → `ENABLE ROW LEVEL SECURITY` → policies.

- `parent_orders` — `id, razorpay_order_id, razorpay_payment_id, amount_paise, currency, status, purpose ('diagnostic'), board, grade, subject, contact_email, contact_phone, profile_id, created_at`
- `parent_subscriptions` — `id, profile_id, learner_id, razorpay_subscription_id, plan_code, status, current_period_end, cancel_at_period_end, created_at`
- `parent_entitlements` — `id, profile_id, learner_id, kind ('diagnostic_credit' | 'board_success_plan'), source_order_id, source_subscription_id, granted_at, consumed_at, expires_at`
- `payment_events` — `id, razorpay_event_id UNIQUE, event_type, payload jsonb, processed_at` (audit + idempotency)

RLS: a parent reads only rows where `profile_id = auth.uid()`; **no role may INSERT or UPDATE entitlements from the client** — writes are `service_role` only, from the webhook handler. Admins read all via the existing `private.has_role` helper. `anon` gets no grants on any of these tables; the guest-checkout order row is written server-side.

### 6.5 Security invariants

1. Price is never accepted from the client — always looked up server-side from a plan/product constant.
2. Entitlement is granted **only** by a signature-verified webhook, never by the browser redirect. The redirect is a UX convenience; if the webhook has not landed yet the report page shows "confirming payment" and polls.
3. Webhook secret and key secret live in project secrets, read inside handlers.
4. Every entitlement change is written to `payment_events` with the originating Razorpay event id.
5. No card data ever touches EduOS — Razorpay Checkout only.

---

## 7. Feature Entitlements

One entitlement resolver, consulted by every gated surface. No component checks a subscription row directly.

| Capability | Anonymous | Diagnostic (₹199) | Board Success (₹2,999) |
| --- | --- | --- | --- |
| Public landing, sample report | ✅ | ✅ | ✅ |
| Run a diagnostic | — | 1 (per credit) | Unlimited |
| Outcome-level gap report | — | ✅ (that diagnostic) | ✅ (all) |
| Intervention plan | Preview only | Read-only, top gap named | ✅ Full, actionable |
| AI Tutor | — | 1 session, 48h, top gap only (D5 unlock) | Unlimited, all approved interventions |
| Reassessment (fresh items) | — | — | ✅ |
| Mastery lift tracking | — | — | ✅ |
| Fortnightly parent report | — | — | ✅ |
| Evidence portfolio + verifier attribution | — | — | ✅ |
| Multi-subject | — | Purchased subject only | All subjects for the grade |

### Implementation shape

- `src/lib/entitlements.ts` — pure resolver: `(entitlementRows, now) => Capabilities`. Browser-safe, unit-testable, no I/O.
- `src/lib/entitlements.functions.ts` — server function returning the caller's capabilities.
- **Server-side enforcement is mandatory.** Every gated server function re-resolves capability before doing work; the UI gate is presentation only. A hidden button is not a paywall.
- Locked surfaces render the *real* component in a disabled state with a one-line upgrade prompt — never a blank page. A parent must be able to see what they are not getting.
- Centre-provisioned learners (the existing B2B path) are entitled through their organization and must never be shown a parent paywall. The resolver checks org entitlement first.

---

## 8. Upgrade Flow — `/upgrade`

```text
Trigger (report CTA · locked feature · lifecycle email · in-app banner)
      ↓
/upgrade                     Plan page, child pre-selected, ₹199 credit shown applied
      ↓
createPlanSubscription       Server creates subscription + applies offer
      ↓
Razorpay Checkout (₹2,800 first invoice, then ₹2,999/yr)
      ↓
subscription.activated       Entitlement granted, credit marked redeemed
      ↓
/upgrade/welcome             "Here's the plan for Aarav's 7 gaps" → straight into the intervention queue
```

### Screen: `/upgrade`

- Above the fold: the child's actual gap count and the outcomes at risk — this parent's data, not generic marketing.
- Price line: ~~₹2,999~~ **₹2,800 for year one** · ₹199 diagnostic credit applied · renews at ₹2,999/yr · cancel anytime.
- What changes today: three concrete unlocks (unlimited tutor on these 7 gaps, reassessment on fresh items, fortnightly report).
- Objection row: cancel anytime · no card stored by EduOS · data deleted on request · sibling plan ₹2,499.
- Single primary CTA. No plan comparison table — there is only one plan.

### Rules

- The credit banner disappears after day 30; the page then reads ₹2,999 with no false discount.
- Failed payment → in-app banner + email, 7-day grace with full access, then read-only (never delete a child's evidence).
- Post-upgrade lands in the *work*, not a receipt. The receipt is emailed.

---

## 9. Conversion Tracking

### Event taxonomy (server-emitted where money is involved; client events are advisory only)

| Event | Emitted from | Key properties |
| --- | --- | --- |
| `diag_page_view` | client | source, board/grade/subject |
| `diag_selector_complete` | client | board, grade, subject |
| `diag_checkout_opened` | server fn | order_id |
| `diag_paid` | webhook | order_id, amount |
| `diag_session_started` | server | session_id |
| `diag_session_submitted` | server | session_id, duration |
| `diag_report_viewed` | server | report_id, gaps_count |
| `diag_report_shared` | client | channel |
| `tutor_taste_unlocked` / `tutor_taste_used` | server | gap_id |
| `upgrade_page_view` | client | trigger source |
| `upgrade_checkout_opened` | server fn | subscription_id |
| `plan_activated` | webhook | subscription_id, first_invoice_amount |
| `plan_cancelled` / `plan_renewed` / `payment_failed` | webhook | subscription_id, reason |

### Funnel report

An admin-only `/monetization` view (reviewer read-only), showing, per weekly cohort: visitors → paid diagnostics → submitted → report viewed → upgraded, with step conversion, median time-to-upgrade, revenue, and refund/chargeback rate. Every figure derived from `payment_events` and the entitlement tables, never from client analytics, so revenue in the dashboard always reconciles with Razorpay.

### Attribution

`utm_*` captured on first touch into `localStorage`, persisted onto `parent_orders` at checkout. First-touch only in v1; multi-touch is not worth the complexity at this volume.

### Success criteria for v1 (first 90 days)

| Metric | Target | Kill/fix threshold |
| --- | --- | --- |
| Purchase page → paid | ≥ 4% | < 2% → the page or the price is wrong, not the traffic |
| Paid → report viewed | ≥ 70% | < 50% → the diagnostic is too long or too hard to schedule |
| Report → upgrade (30d) | ≥ 12% | < 6% → the report is not making the remedy feel urgent; test the D5 tutor unlock first |
| Refund rate | < 3% | > 8% → expectation mismatch on the purchase page |
| Payment failure rate | < 10% | > 20% → checkout/method mix problem |

---

## 10. Build sequence

| Phase | Scope | Effort | Risk |
| --- | --- | --- | --- |
| **P1** | Data model + Razorpay orders + webhook + entitlement resolver (no UI) | M | High — money and RLS; must be verified before any UI ships |
| **P2** | `/diagnostic` purchase page, guest checkout, account creation on capture | M | Medium |
| **P3** | Paid diagnostic session + `/diagnostic/report/$reportId` | M | Low — reuses the existing engine end to end |
| **P4** | Subscriptions, `/upgrade`, credit offer, entitlement gating across surfaces | M | High |
| **P5** | Lifecycle messaging (email + WhatsApp), D5 tutor unlock | S | Medium |
| **P6** | `/monetization` funnel dashboard | S | Low |

**Do not ship P2 before P1 is verified**, including: a replayed webhook grants nothing twice, a forged signature is rejected, a client-supplied amount is ignored, and no client role can write an entitlement row.

### Open decisions needing a call before build

1. **Who is the seller of record** — EduOS entity, GST registration and invoicing series for B2C.
2. **Refund SLA and who approves** — needs an owner, not a policy paragraph.
3. **Centre conflict** — if a centre already pays for a learner, the parent must never be charged. Resolver handles it, but the commercial rule (does the centre get a referral share on parent plans?) is a business decision.
4. **WhatsApp sending** — requires a BSP and template approval; assume 2–3 weeks lead time if lifecycle messaging on WhatsApp is in scope for v1.
5. **Data-protection posture under the DPDP Act** for a direct-to-parent product with a minor as the data subject — consent is currently modelled for centre-mediated access, and direct parent signup changes the guardian-consent flow.

---

**Guardrail held throughout:** nothing in this plan sells a claim the engine cannot evidence. The ₹199 buys a real curriculum-mapped diagnosis, the ₹2,999 buys a loop that measures its own results on fresh items, and every projection shown to a parent is labelled as a projection.
