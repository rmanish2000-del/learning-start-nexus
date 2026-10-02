# Centre-admin first login — implementation evidence

Branch `claude/gallant-gauss-jqipny`, based on canonical `main` at `78c5717` (design package). Design input: `design/centre-admin-first-login/` (commit `78c571708eaed55b00efd5f3c626cab7d6707e35`). Follows the REJECT verdict in `VERIFICATION_REPORT.md` (tested `666108d`).

Evidence grades: **Verified** = observed in this environment. **Reported** = stated elsewhere. **Blocked** = not testable here.

## Part A — payment security (Verified)

| Control | Where |
|---|---|
| Platform-owner identity, server side, from verified JWT claims (`supabase.auth.getClaims`) | `src/lib/platform-owner.server.ts` (`requirePlatformOwner`), default `rmanish2000@gmail.com`, override `PLATFORM_OWNER_EMAIL` |
| Payment settings (6 fns), payment audit, pilot access (4), pilot invitations (3), feedback review (3), centre approval → owner only | `payment-settings.functions.ts`, `payment-audit.functions.ts`, `pilot-access.functions.ts`, `pilot-invitations.functions.ts`, `feedback.functions.ts`, `centre-onboarding.functions.ts` |
| `pilot_leads` SELECT/UPDATE policies → `private.is_platform_owner()` | migration `20261002050000_centre_admin_first_login.sql` §1 |
| Self-service sign-up may only claim `parent`; staff/student/reviewer/admin roles only for service-role-provisioned (pre-confirmed) accounts | migration §2 (`handle_new_user`) |
| Owner-only routes redirect non-owners; audit surfaces owner + reviewer | `src/routes/_authenticated/route.tsx` |

Lovable "temporary-repository Part A bundle": **not found** — not in Drive (AGENT-REPORTS, INBOX, evidence-parts), not in any repository available to this session (`list_repos` returns only `learning-start-nexus`), no reference in the design package. Part A was therefore implemented from the verification findings; bundle provenance is unresolved (fail condition for deployment, see below).

## Parts B–F (Verified in code and tests)

- **B — capability navigation.** `canSeeNavItem` in `app-shell.tsx`: `ownerOnly` items are absent from the DOM for every non-owner; `ownerAlso` lets the owner see reviewer-only audit entries. Active link carries `aria-current="page"`; skip-to-content link added to the authenticated shell.
- **C — first-login checklist.** `centre-setup-shared.ts` derives six steps from live organization data plus the server-side `centre_setup_progress` row; `getCentreSetupFn` records completion. Quick Start is pinned first in Workspace until complete, then leaves the main navigation (still reachable under Support).
- **D — route states.** Dashboard renders "Your centre is ready → Begin setup" for an empty centre and a SAMPLE notice when the workspace is loaded; Learners shows a SAMPLE badge/banner; Settings gains a centre-profile form (all-or-nothing save) and the Sample Workspace card; the checklist shows loading skeletons, error + retry and blocked-step hints.
- **E — SAMPLE workspace.** `is_sample` on `learners`, `assessments`, `assessment_sessions`; `create_sample_workspace` / `remove_sample_workspace` are SECURITY DEFINER, service-role only, single transaction; `sample_workspace_events` is append-only and records the acting user; generated names are "Learner A–E (SAMPLE)", assessment titles start with "SAMPLE ·"; excluded at the data layer from `outcome-dashboard.server.ts`, `educator-board.server.ts`, `pilot-evidence.server.ts` and from dashboard numbers.
- **F — safe provisioning.** Approval is owner-only; the applications card renders for the owner only; learner import remains scoped to the caller's organization.

## Gates (Verified, this environment)

| Gate | Result |
|---|---|
| `vitest run` | **480/480 passed, 44 files** (new: `platform-owner-capability`, `centre-setup`, `sample-workspace`; updated: `payment-credential-access`, `pilot-invitations`) |
| `eslint` (changed files, prettier rule off) | 0 errors, 3 pre-existing-style `react-refresh` warnings |
| `prettier` | new files formatted; repository-wide lint remains red with pre-existing formatting errors (8,257 before this change) |
| `tsc --noEmit` | 86 errors on this branch vs 82 on base `78c5717`; same four error codes (TS2322/2339/7006/7053), all the pre-existing `_authenticated` route-context inference failure at shifted lines; **0 errors in new files** |
| `bun run build` (`LOVABLE_SANDBOX=1`, Lovable's layout) | success; PWA `generateSW` **245 precache entries, 0 disallowed** |
| Dependencies | installed from the public npm registry with the lockfile's own versions and integrity hashes (Lovable's private mirror is unreachable here); `bun.lock` and `package.json` unchanged |

Dependency bumps from the Lovable batch (`@tanstack/*`, `@lovable.dev/vite-tanstack-config` 2.23.1) were **kept**: a rebuild with the previous versions behaved identically here, so a revert could not be validated as necessary.

## Not verified here (Blocked)

- No browser run against a database: the Lovable-Cloud Supabase project and `www.eduos.global` are unreachable from this session, and the server bundle is a Cloudflare Worker (not runnable under Node). Live checks still owed before release: owner vs centre-admin sign-in on `/payment-settings`; `pilot_leads` RLS with a centre-admin JWT; sample create → every screen labelled → remove → zero rows left; a fresh zero-data organization end to end; existing Razorpay checkout/webhook flow.
- Migration `20261002050000` has not been applied to any database yet; it runs on the next Lovable sync of `main`.
- No staging run, no production deployment, no production SHA (deployment is a Lovable publish — a founder action — and the fail conditions are not all cleared).
