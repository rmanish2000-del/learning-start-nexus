# EduOS — Account & Purchase Ownership Audit

Audit only. No code was modified.

## 1. Answers to the questions

**A. Can a user purchase without an account?**
Yes. The entire ₹199 diagnostic purchase and the ₹2,999 upgrade run fully anonymous. No sign-in, no sign-up, no session is required at any point.

**B. If yes, how is the purchase linked to a future account?**
It is not. There is no mechanism today that links a paid order to an auth user. Ownership is proved only by possession of a random `access_token` in the URL (`/diagnostic/session/:token`, `/diagnostic/report/:token`, `/upgrade/:token`). `parent_orders` has no `parent_user_id` column, and nothing in the code writes a `parent_learner_links` row from a payment.

**C. If no, where is sign up enforced?**
Nowhere. `/auth` offers only two sign-in tabs (Staff email+password, Student handle+6-digit PIN). There is no self-service sign-up route, no `supabase.auth.signUp` call anywhere in the app, and no email invite after payment. Accounts exist only when an admin creates them (`createStaffUser`, `createLearner` → `supabaseAdmin.auth.admin.createUser`).

**D. Complete first-time parent journey (as built today)**
1. Lands on `/` (public landing, EN/HI).
2. `/diagnostic` — picks board/grade/subject/chapter group; selection cached in `localStorage`.
3. `startDiagnosticOrder` (unauthenticated server fn) inserts a `parent_orders` row: `status='created'`, server-set ₹199, fresh `order_ref` + `access_token`.
4. `/diagnostic/checkout/:orderRef` — collects child first name, parent name, email, phone in local component state only (nothing persisted yet).
5. `createPaymentIntent` → Razorpay checkout → `verifyPayment` (HMAC verified server-side); the `payment.captured` webhook re-confirms. `markOrderPaid` sets `status='paid'` and inserts a `parent_entitlements` row of kind `diagnostic_credit` with `learner_id = NULL`.
6. `completeDiagnosticSetup` → `setupDiagnostic`: creates a `learners` row (handle `pd-<token prefix>`), generates the assessment, creates an `assessment_sessions` row, writes contact details onto the order, and back-fills `parent_entitlements.learner_id`.
7. Parent is redirected to `/diagnostic/session/:token`, then `/diagnostic/report/:token`.
8. Upgrade: `/upgrade/:token` → `createUpgradeOrder` inserts a child order (`purpose='board_success_plan'`, `parent_order_id` = diagnostic order) → payment → `board_success_plan` entitlement, and the ₹199 credit is marked consumed.

At no point does an auth user exist for this parent. The learner created in step 6 has `student_user_id = NULL` and no `parent_learner_links` row.

## 2. Current flow — surface by surface

| Surface | State today |
| --- | --- |
| Sign up | Does not exist. No route, no `signUp` call, no invite email. |
| Login | `/auth` — staff (email/password) and student (handle + PIN). No parent tab. |
| Parent account creation | Admin-only: `createStaffUser` provisions the auth user; a separate admin action assigns the `parent` role and calls `linkParentToLearner`. Not reachable by the paying parent. |
| Student profile creation | Two paths: (a) admin `createLearner` → auth user with handle/PIN; (b) `setupDiagnostic` → learner row **without** any auth user. |
| Anonymous visitor handling | First-class: all seven parent-journey server functions are unauthenticated and identify the caller solely by `orderRef` or `access_token`. |
| Purchase ownership | Bearer-token ownership. `parent_orders` has no owning user. Anyone with the link is the owner. |
| Entitlement ownership | `parent_entitlements` is keyed by `order_id` and (after setup) `learner_id`. No user reference. |
| Upgrade ownership | Inherited from the diagnostic order's `access_token`; same bearer model, same credit rules re-derived server-side. |
| Parent portal `/parent` | Requires an authenticated `parent`-role user and reads only `parent_learner_links`. A paying parent can never reach their own child here. |

## 3. Gaps

**G1 — Purchase is orphaned from identity (critical).**
There is no path from a paid order to an account. The paying parent can never sign in, and support cannot restore access without hand-editing the database.

**G2 — Access is a permanent bearer link (critical).**
`access_token` never expires and is not bound to a device, email, or session. Forwarding the WhatsApp/email link transfers full access to the report and to the upgrade purchase flow. The report is also shareable by design (`navigator.share`), which compounds this.

**G3 — Link loss = access loss (high).**
Nothing emails the report link. If the parent closes the tab, the only recovery is browser history. `contact_email` is captured but never used.

**G4 — No sign-up route at all (high).**
Even a motivated parent cannot create an account. `/auth` shows only staff and student tabs.

**G5 — Learner is not a real student (medium).**
`setupDiagnostic` creates a learner with `student_user_id = NULL` and a synthetic handle. The child cannot log in, so the AI Tutor and reassessment loop the upgrade promises are unreachable without admin intervention.

**G6 — Guardian consent is bypassed (medium/compliance).**
Consent is recorded in `guardian_consents` only from the authenticated parent portal. A purchased diagnostic creates a minor's learner record with no consent row and no consent UI in the parent journey.

**G7 — Upgrade sells entitlements to nobody (high).**
`board_success_plan` grants a year of access attached to `order_id`/`learner_id`, but with no user able to sign in, the entitlement is unusable through the product UI.

**G8 — Org assignment is implicit (medium).**
The order inherits `org_id` from the selected book, so a direct-to-parent purchase silently lands inside whichever centre owns that content pack. Ownership and support responsibility for that learner are undefined.

**G9 — Duplicate-parent risk (low/medium).**
Repeat purchases from the same email create independent orders and independent learners; there is no dedupe on `contact_email`.

## 4. Recommended flow

Design principle: keep the frictionless purchase (do not gate payment behind sign-up), but make account creation the **immediate, mandatory step after successful payment**, and bind every artefact to that user.

**Recommended first-time parent journey**
1. `/` → `/diagnostic` → select chapter group. (unchanged)
2. `/diagnostic/checkout/:orderRef` — collect child name, parent name, email, phone. (unchanged)
3. Payment via Razorpay. (unchanged — still anonymous, no drop-off added)
4. **New: claim step.** On `status='paid'`, before provisioning, prompt the parent to set a password for the email they just paid with. Server-side: create the auth user (`admin.createUser`, email confirmed), assign the `parent` role, set `profiles.org_id` to the order's `org_id`, and stamp `parent_orders.parent_user_id`.
   - If the email already has an account, ask them to sign in instead, then attach the order to that user.
   - Allow "skip for now": keep the token link working, but show a persistent "Secure your report" banner and expire the unclaimed token in 30 days.
5. Provisioning (`setupDiagnostic`) runs as today, plus: insert `parent_learner_links(parent_user_id, learner_id)`, create the child's student auth user + handle/PIN, and record `guardian_consents` from an explicit consent checkbox shown at claim time.
6. Redirect to the session, then the report. The report is reachable both by token **and** from `/parent` for the signed-in owner.
7. Upgrade requires the signed-in owner (or the token plus a claim step), and the `board_success_plan` entitlement is written with `parent_user_id`.

**Schema changes implied**
- `parent_orders.parent_user_id uuid` (nullable until claimed) + index.
- `parent_entitlements.parent_user_id uuid`, back-filled from the order.
- `parent_orders.access_token_expires_at timestamptz` for unclaimed orders.
- RLS: parents select their own orders/entitlements via `parent_user_id = auth.uid()`; the token path stays server-side through the admin client only.

**Product changes implied**
- A `/auth` parent tab (email + password) and a `/claim/:token` route.
- Transactional email on payment success carrying the report link and the claim link (the email domain tooling is already available).
- Consent checkbox in the claim step, written to `guardian_consents` with the same permanent-history semantics as the portal.
- Admin view of unclaimed paid orders, so support can reconcile.

**Suggested priority**
P0: G1, G2, G7 (claim step + user-bound orders/entitlements + token expiry).
P1: G3, G4, G6 (receipt email, parent sign-in tab, consent at claim).
P2: G5, G8, G9 (student auth provisioning, explicit org ownership rule, email dedupe).

## 5. Verification method

Read-only review of: `src/lib/parent-diagnostic.server.ts`, `src/lib/parent-diagnostic.functions.ts`, `src/routes/diagnostic.index.tsx`, `src/routes/diagnostic.checkout.$orderRef.tsx`, `src/routes/diagnostic.report.$token.tsx`, `src/routes/upgrade.$token.tsx`, `src/routes/auth.tsx`, `src/routes/_authenticated/parent.tsx`, `src/lib/admin.functions.ts`, `src/lib/learners.functions.ts`, `src/lib/roles.ts`, plus the `parent_orders`, `parent_entitlements`, `parent_learner_links`, `learners`, and `guardian_consents` schemas. Codebase-wide searches confirmed zero occurrences of `signUp`, zero authentication middleware on the parent-journey server functions, and no write path from an order to `parent_learner_links`.
