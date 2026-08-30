# EduOS Staging / Sandbox Environment

Authority: Application Authority · Repository: `learning-start-nexus` · EXTERNAL_USER_MODE: INTERNAL_ONLY

## Architecture decision

Staging is a **separate Lovable project** ("EduOS Staging"), created by remixing
this project. A remix produces its own backend, so every isolation requirement
is satisfied structurally rather than by convention:

| Concern | Production | Staging |
|---|---|---|
| URL | `https://www.eduos.global` | staging project URL (`*.lovable.app`) |
| Database | production backend | separate backend, separate Postgres |
| Auth | production user pool | separate user pool, no shared sessions |
| Storage | production `books` bucket | separate bucket in the staging backend |
| Secrets / env | production secret store | separate secret store |
| Razorpay | live mode (when enabled) | **test mode only — enforced in code** |
| Analytics / SEO | indexed | `noindex, nofollow` on every page |
| Data | real families | synthetic `@staging.eduos.test` accounts |

There is no configuration path by which staging can write to the production
database, Auth, Storage or payment records: the staging deployment only ever
receives its own project's connection variables.

## Code-level environment separation (in this repository)

| File | Purpose |
|---|---|
| `src/lib/environment.ts` | Single source of truth: `APP_ENV`, `IS_STAGING`, `IS_PRODUCTION`, `SHOULD_NOINDEX`. Reads `VITE_APP_ENV`; defaults to production. |
| `src/components/staging-banner.tsx` | Amber ribbon on every non-production page: "internal test data only · payments run in test mode · no real money". Renders nothing in production. |
| `src/routes/__root.tsx` | Mounts the ribbon and emits `robots: noindex, nofollow` outside production. |
| `src/lib/payment-credentials.server.ts` | Hard guard: an `rzp_live_…` key is **rejected** in any non-production environment; the gateway then reports "not configured" instead of charging a real card. |
| `scripts/staging/seed-staging-users.ts` | Seeds/resets the labelled test users. Refuses to run unless `APP_ENV=staging`; only touches `@staging.eduos.test`. |

Setting `VITE_APP_ENV=staging` in the staging project is the only switch needed.

## Founder setup steps (one time)

1. **Create the project.** Remix this project and name it `eduos-staging`. The
   remix gets its own database, Auth, Storage and secret store.
2. **Set the environment flag.** In the staging project add
   `VITE_APP_ENV=staging`. Confirm the amber ribbon appears on the preview.
3. **Apply migrations.** The remix carries `supabase/migrations/` (60 files);
   they are applied to the staging backend on first run. No production data is
   copied.
4. **Add Razorpay test credentials.** In the staging app, sign in as the
   staging admin and open **Payment Settings**. Enter the test-mode
   `rzp_test_…` key id, key secret and webhook secret there — they are stored
   encrypted (AES-256-GCM) in the staging database. Never paste them into chat,
   Git, or any report.
5. **Configure the Razorpay test webhook.** In the Razorpay dashboard, in
   **Test Mode**, add a webhook pointing at
   `https://<staging-url>/api/public/razorpay-webhook` with events
   `payment.captured` and `payment.failed`, and use the same webhook secret as
   step 4.
6. **Seed users.** Run `bun scripts/staging/seed-staging-users.ts` in the
   staging project. Credentials land in `.staging-credentials.local.json`
   (git-ignored) for founder retrieval.

## Test-user inventory

Login identifiers only. Passwords and PINs are generated per seed run and live
solely in the git-ignored `.staging-credentials.local.json`.

| Role | Login identifier | Intended journey |
|---|---|---|
| Admin | `admin@staging.eduos.test` | Org settings, payment settings, audit centres |
| Reviewer | `reviewer@staging.eduos.test` | Question verification queues |
| Educator | `educator@staging.eduos.test` | Assignments, gap board, interventions |
| Parent | `parent@staging.eduos.test` | Signup, add learner, free check, ₹199 diagnostic |
| Student | `student@staging.eduos.test` (app login uses handle + PIN) | Diagnostic, tutor, reassessment |
| Direct-parent learner | `parent-direct@staging.eduos.test` | Learner with no centre linkage |
| Centre-managed learner | `parent-centre@staging.eduos.test` | Learner owned by a centre roster |
| Unassigned / no role | `norole@staging.eduos.test` | Role-claim redirect behaviour |
| Expired entitlement | `expired@staging.eduos.test` | Paywall after entitlement lapse |
| Paid diagnostic | `paid@staging.eduos.test` | ₹199 paid, ₹199 credit, ₹2,800 upgrade |

Every account carries `internal_test_account: true` and
`exclude_from_analytics: true` in its user metadata.

**Reset a single account:** re-run the seed script; it rotates that account's
password in place.
**Full data reset:** `bun scripts/staging/seed-staging-users.ts --reset` —
deletes every `@staging.eduos.test` user (cascading their learners,
assessments, gaps, orders and entitlements) and recreates the inventory.

## Razorpay test-mode verification checklist

Run in staging after step 6. Record results in the UAT log, never the secrets.

- [ ] Key ID begins `rzp_test_` — Payment Settings shows mode **test** (masked id only).
- [ ] `Test connection` on Payment Settings returns success.
- [ ] Webhook signature validation: a body with a wrong signature returns `401`.
- [ ] ₹199 diagnostic purchase succeeds; entitlement granted; order `paid`.
- [ ] Payment failure event marks the order failed with a friendly reason.
- [ ] Abandoned checkout: order stays `created`, expires via `expire_stale_parent_orders`.
- [ ] Duplicate webhook delivery is idempotent — one entitlement, one paid order.
- [ ] ₹2,999 plan with the ₹199 credit charges ₹2,800 effective.
- [ ] Razorpay dashboard shows the payments under **Test Mode** only; no live entity, no real money.

## Promotion flow

```text
Build → Test (unit + integration + E2E + negative + RLS) → Deploy Staging
      → Full UAT (all 10 users, mobile + desktop) → Founder Approval
      → Promote the SAME verified commit SHA → Deploy Production
      → Production Smoke Test
```

Rules:
- Only a commit SHA that passed staging UAT may be deployed to production.
- Staging data, users, credentials and secrets are **never** promoted.
- Production keeps its own live Razorpay credentials; staging keys stay in
  the staging secret store.
- A production rollback is a redeploy of the previous verified SHA.

## Known limitations

- Creating the staging Lovable project itself is a founder action; it cannot be
  provisioned from inside this project.
- Curriculum and question content must be re-seeded in staging (the 326 Class 10
  drafts live in the production database; the generators under
  `scripts/class10/` reproduce them deterministically).
- The Class 10 corpus remains `NOT_COMPLIANT` pending subject-expert approval;
  staging does not change that gate.
