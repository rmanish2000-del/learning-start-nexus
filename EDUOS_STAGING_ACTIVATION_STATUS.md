# EduOS Staging Activation — Status Report

Date: 2026-08-30 · Authority: Application Authority · Repository: `learning-start-nexus`
Canonical HEAD: `7854bcdd509afd3e76f30d03fa13c1b09e888823` · Worktree: clean
Production: **unchanged, not deployed, not altered**

## Verdict

**STAGING_SANDBOX: NOT_READY**

The staging *support layer* is complete and verified in this repository. The
staging *environment* does not exist yet: the target project `eduos-staging` is
not present in this workspace, so there is no isolated backend to migrate, seed,
configure or deploy to.

## Step-by-step outcome

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Canonical starting SHA incl. roadmap commit | PASS | `7854bcdd509afd3e76f30d03fa13c1b09e888823` (`7854bcd` "Set up staging sandbox mode", parent `b3dfa3a`, base `ff43729`). Worktree clean. |
| 2 | Confirm `VITE_APP_ENV=staging` | BLOCKED (correct here) | This project is production: no `APP_ENV`/`VITE_APP_ENV` set, `.env` has none — so `APP_ENV` resolves to `production`. The flag belongs in the staging project, which does not exist. |
| 3 | Staging banner + `noindex, nofollow` | PASS (behaviour proven) | Production-mode render at `:8080`: 0 matches for banner text or `noindex`. Staging-mode render (`VITE_APP_ENV=staging`, `:8099`): `<meta name="robots" content="noindex, nofollow"/>` present and ribbon text "internal test data only · payments run in test mode · no real money" present in SSR HTML. |
| 4 | Apply migrations to isolated staging backend | NOT RUN | No staging backend exists. 60 migrations in `supabase/migrations/` are ready and are carried by a remix. |
| 5 | Verify DB / Auth / Storage / secrets isolation | NOT RUN | Cannot verify a backend that has not been provisioned. |
| 6 | Razorpay Test Mode configuration | NOT RUN | Test keys must be entered in the *staging* app's Payment Settings (encrypted at rest). They must never be pasted into this project, chat, Git or a report. |
| 7 | Staging test webhook | NOT RUN | Target URL is unknown until the staging project has a URL. |
| 8 | Payment success / failure / abandonment / duplicate-webhook tests | NOT RUN live | Covered by 9 automated route tests at HEAD (signature rejection, tampered body, `payment.captured`, `payment.failed`, unrelated event, missing entity, retry-on-throw). Live gateway exercise still pending. |
| 9 | Staging-user seeder | NOT RUN | `scripts/staging/seed-staging-users.ts` refuses to run outside `APP_ENV=staging` — by design. |
| 10 | Test-user inventory + secure reset/access | PASS (documented) | `STAGING_ENVIRONMENT.md`: 10 labelled accounts on `@staging.eduos.test`; credentials generated at seed time into git-ignored `.staging-credentials.local.json`; `--reset` deletes and recreates only that domain. No password, PIN or secret appears in Git, reports or chat. |
| 11 | Automated tests / typecheck / build / browser UAT | PARTIAL PASS | 274/274 vitest, typecheck clean, production build clean. Browser UAT limited to the environment-separation surface; full journey UAT requires the staging deployment. |
| 12 | Parent / student / educator / reviewer / admin journeys | NOT RUN in staging | Last verified in production smoke test at SHA `70d7bcd66ad4ddbd35b7d1f72eeee2be46753132`. Re-running them against production would violate the "synthetic data only" rule of this assignment. |

## Isolation guarantees already enforced in code

- `src/lib/environment.ts` — single switch, fails safe to `production`; 3 unit tests.
- `src/routes/__root.tsx` — `noindex, nofollow` and the ribbon on every non-production page.
- `src/lib/payment-credentials.server.ts` — an `rzp_live_…` key is rejected outside production, so a sandbox physically cannot charge a real card.
- `scripts/staging/seed-staging-users.ts` — staging-only guard plus `@staging.eduos.test` scope.

## The one blocker

A second, isolated backend (database + Auth + Storage + secret store) cannot be
provisioned from inside this project, and no `eduos-staging` project exists in
the workspace. Founder action, in order:

1. Remix `learning-start-nexus` and name it **eduos-staging**.
2. Set `VITE_APP_ENV=staging`; confirm the amber ribbon.
3. Let the 60 migrations apply to the new backend (no production data is copied).
4. Enter the Razorpay **test** key id / key secret / webhook secret in the
   staging app's Payment Settings.
5. Add the Razorpay test webhook at
   `https://<staging-url>/api/public/razorpay-webhook` (`payment.captured`,
   `payment.failed`).
6. Run `bun scripts/staging/seed-staging-users.ts`.

Steps 4–9 and 12 of this assignment then execute end to end in one pass.

## Migration and translation status

- Migrations: 60 files, none added or altered this turn; nothing pending against production.
- Translations: none — EduOS is English-only; the `t()` identity seam is untouched.

## Rollback

Nothing to roll back: this turn added one report file and made no functional,
schema or deployment change. To remove the whole staging layer, revert to
`fe81ac97abd9e332460d28f452c9851ecbed4479`; every staging change is additive and
inert while `VITE_APP_ENV` is unset.
