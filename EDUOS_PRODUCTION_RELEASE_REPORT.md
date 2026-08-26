# EduOS — Production Release Report

- **Production URL:** https://www.eduos.global (also https://learning-start-nexus.lovable.app)
- **Deployment timestamp:** 2026-08-26 17:03 UTC (22:33 IST)
- **Release version:** Pilot Release 1.0 (post Sprint 6R + Parent Monetization + Identity-First Purchase + Hindi v1)
- **Change policy for this release:** no new features, no redesign. One security fix applied (see §4).

---

## 1. Enabled modules

| # | Module | Surface | Status |
| --- | --- | --- | --- |
| 1 | Parent authentication | `/auth?tab=parent` (default tab) | Live |
| 2 | Student profiles | `/diagnostic`, `/parent` | Live |
| 3 | ₹199 Diagnostic | `/diagnostic` | Live |
| 4 | Razorpay payments | `/diagnostic/checkout/:orderRef` | Live (test keys — see §5) |
| 5 | Diagnostic sessions | `/diagnostic/session/:token` | Live |
| 6 | Gap reports | `/diagnostic/report/:token` | Live |
| 7 | Parent portal | `/parent` | Live |
| 8 | Upgrade flow (₹2,999, ₹199 credited) | `/upgrade/:token` | Live |
| 9 | Hindi experience | Language toggle, all parent surfaces | Live |
| 10 | Payment audit | `/payment-audit` | Live, admin/reviewer only |

Staff, educator and audit surfaces remain deployed but are role-gated and are not part of the parent pilot journey.

---

## 2. Pre-release checks

| Check | Result | Evidence |
| --- | --- | --- |
| Parent signup visible from landing page | Pass | Header **Create Account**, hero, pricing block and footer CTAs |
| Parent login visible | Pass | Header **Sign In**; `/auth` defaults to `tab=parent`, `mode=signin` |
| Student creation enforced | Pass | `createDiagnosticOrder` rejects unless a student owned by the caller is selected |
| Purchase guard active | Pass | Four conditions: authenticated + parent profile + student exists + student selected |
| Razorpay configuration active | Partial | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` all present; key is a **test-mode** key |
| Webhook configured | Pass | `POST /api/public/razorpay-webhook`, HMAC-verified before parsing; every delivery logged to the webhook event log |
| Entitlement ownership active | Pass | `parent_orders` / `parent_entitlements` carry `parent_user_id` + `learner_id` with RLS scoped to `auth.uid()` |
| Resume diagnostics working | Pass | Parent portal "Your purchases" card: Resume / View report / Upgrade |
| Reports loading | Pass | `/diagnostic/report/:token` returns 200 behind the owner check |
| Hindi ↔ English switching | Pass | `LanguageProvider` + persisted selection; English fallback for any missing key |
| Automated test suite | Pass | `vitest`: 42 tests, 4 files, all passing |
| Route smoke test | Pass | `/`, `/diagnostic`, `/about` → 200; `/auth` → redirect as designed |

---

## 3. Success-criteria journey (unassisted)

```
Landing (/)
  → Create Account            /auth?tab=parent&mode=signup
  → Create Student            /diagnostic (name, class, board)
  → Pay ₹199                  /diagnostic/checkout/<orderRef> (Razorpay)
  → Complete Diagnostic       /diagnostic/session/<token>
  → View Report               /diagnostic/report/<token>
  → Upgrade                   /upgrade/<token> (₹2,999 less ₹199 credit)
```
Two clicks from landing to an authenticated parent account; five to a paid diagnostic start.

---

## 4. Security state at release

- Fixed in this release: the `organizations` update policy previously allowed any admin to edit **any** organization. It is now scoped to the admin's own organization in both the USING and WITH CHECK clauses.
- Remaining (accepted, warning level): one linter warning about a `SECURITY DEFINER` function executable by signed-in users — this is the org-scoping helper in the restricted `private` schema and is required for RLS to work without recursion.
- No critical findings open at deploy time.

---

## 5. Known limitations

1. **Razorpay is running with test-mode keys.** Real money will not be captured until `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are replaced with live credentials and the live webhook secret is set in the Razorpay dashboard for `https://www.eduos.global/api/public/razorpay-webhook`. Everything else in the payment path is production code.
2. Mobile numbers are collected but not OTP-verified.
3. Legacy pre-identity orders (if any exist) have no `parent_user_id` and are not reachable from the parent portal; they need a manual claim.
4. Hindi covers the parent journey; SEO metadata, JSON-LD and staff/audit surfaces remain English.
5. Content catalogue is Class 10 Mathematics and Science only; Grade 3 content is archived.
6. Upgrade fulfilment (Board Success Plan delivery) is entitlement-based; the coaching workflow itself is manual during the pilot.

---

## 6. Rollback procedure

1. **Instant rollback of the site:** open the project's version history and restore the last known-good version, then publish again. Published frontend reverts within ~1 minute.
2. **Stop new purchases without a redeploy:** remove or rotate `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. Order creation then fails closed with "Payments are not configured" before any gateway order exists — no orphan orders or entitlements.
3. **Database:** schema changes are forward-only migrations. To revert the policy change in §4, re-create the previous `organizations` update policy. Payment tables must not be rolled back destructively — `parent_orders`, `parent_entitlements` and `payment_webhook_events` are the financial record of truth.
4. **Webhook:** disable the Razorpay webhook endpoint in the Razorpay dashboard to halt capture processing; deliveries retry automatically and capture is idempotent, so re-enabling replays safely.
5. **Verification after rollback:** run `bunx vitest run` (expect 42 passing) and check `/payment-audit` for unprocessed webhook events.
