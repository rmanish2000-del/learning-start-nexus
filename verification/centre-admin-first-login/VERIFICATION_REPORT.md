# Centre-admin first login — independent verification

| | |
|---|---|
| Verdict | **REJECT** |
| Tested commit | `666108db2c875a1150d58f968725cf6b9c44a26a` (`main`, "Fixed duplicate migration file", gpt-engineer-app[bot], 2026-10-01 17:11 UTC) |
| Lovable commit batch reviewed | `437f60a` → `666108d` (5 commits; changes: `package.json`, `bun.lock`, `src/integrations/supabase/previewAuthStorage.ts`, one migration file reduced to a no-op) |
| Verifier | Claude Code, cloud session, 2026-10-02 |
| Method | Static review of application code, server functions and SQL migrations at the tested commit; git-history secret scan. No production database, production URL or dependency install was reachable (see Limitations). |
| Deployment | None performed. Nothing merged. |

Evidence grades: **Verified** = observed directly in the repository at the tested commit. **Reported** = stated by a prior document in the repository, not re-observed. **Blocked** = could not be tested from this environment.

## Summary of results

| # | Requirement | Result | Grade |
|---|---|---|---|
| 1 | Razorpay settings restricted server-side exclusively to `rmanish2000@gmail.com` | **FAIL** | Verified |
| 2 | Centre admins cannot see or invoke platform-owner functions | **FAIL** | Verified |
| 3 | Every visible centre-admin route renders useful data or an actionable state | PASS (static) | Verified (code), not rendered |
| 4 | Fresh centre onboarding works from approval through first diagnostic | Code path intact; not re-executed | Reported (prior live run) |
| 5 | Sample data is labelled, isolated, removable and excluded from real reporting | **PARTIAL FAIL** | Verified |
| 6 | RLS prevents cross-organization access | **FAIL** (two findings) | Verified |
| 7 | No secrets or personal data in Git, logs or sample records | PASS | Verified |
| 8 | Desktop/mobile navigation and accessibility pass | Not fully testable; static review finds minor gaps | Blocked / Verified (static) |
| 9 | Production SHA exactly matches the verified commit | **UNVERIFIED** | Blocked |

## Findings

### F1 — CRITICAL · Any centre admin controls the platform's Razorpay keys (Req 1, 2)

There is no platform-owner identity anywhere in the code. The only privilege boundary is the global `admin` role in `public.user_roles`, and **every approved centre's first admin is created with that same role**:

- `src/lib/centre-onboarding.server.ts:72-74` — `approveCentreLeadImpl` upserts `{ user_id, role: "admin" }` for the new centre admin.
- `src/lib/payment-settings.functions.ts` — all six Razorpay server functions (`getPaymentSettingsFn`, `savePaymentSettingsFn`, `clearPaymentSettingsFn`, `listPaymentAuditFn`, `testPaymentSettingsFn`, `getWebhookStatusFn`) gate only on `requireAnyRole(..., ["admin"])`.
- `src/lib/admin.server.ts:9-30` — `requireAnyRole` checks `user_roles` for the caller; no email, org or owner check exists.
- `grep -rn "rmanish2000@gmail.com" src supabase` → no matches. `grep -rni "platform.owner|platformOwner|superadmin"` → no matches.
- `src/components/app-shell.tsx:50-52` — "Payment Settings", "Pilot Access" and "Feedback" nav items are shown to `roles: ["admin"]`, i.e. to every centre admin.

Consequence: a centre admin (or anyone who obtains a centre-admin credential, including the one-time password shown on screen at approval) can read the masked Razorpay status, **replace or clear the platform's live Razorpay key pair and webhook secret**, and run a live credential test. Payment credentials are a single global row (`payment_credentials.id = 'razorpay'`), so this redirects every family's payment on the platform. The existing `EDUOS_PAYMENT_SETTINGS_SECURITY_AUDIT.md` (row 3) treats "admin only" as sufficient; that assumption held only while there was one organization.

### F2 — HIGH · Centre admins can invoke other platform-owner functions and read cross-tenant PII (Req 2, 6)

All gated on the same `admin` role, and none scoped to the caller's organization:

| Function | File | Cross-tenant effect |
|---|---|---|
| `approveCentreLead` | `src/lib/centre-onboarding.functions.ts:7-15` | Any centre admin can approve any pending application and create new organizations and admin accounts. |
| `pilot_leads` SELECT policy | `supabase/migrations/20260826105210_…sql` ("Admins can read pilot applications", `USING (private.has_role(auth.uid(),'admin'))`) and `src/routes/_authenticated/admin.tsx:536-545` | Every centre admin sees every applicant centre's name, contact name, email, phone and notes. |
| `listPilotGrants`, `grantPilotAccess` | `src/lib/pilot-access.server.ts` (uses `supabaseAdmin`, no org filter; `resolveParent` searches all auth users) | Every centre admin sees every parent email platform-wide and can grant free access to any family. |
| `listFeedback` | `src/lib/feedback.server.ts:148-157` (`supabaseAdmin`, no org filter) | Every centre admin reads all feedback incl. `contact_email` from every organization. |
| `getPaymentAudit` | `src/lib/payment-audit.server.ts:25-47` (admin/reviewer) | Every centre admin and reviewer sees all parent orders and webhook events platform-wide (no emails in the selected columns, but order refs, amounts and payment ids). |

`listStaffUsers` and the learner/assessment tables are correctly org-scoped (`callerOrgId`, `private.current_org_id()`); the leak is confined to the platform-level tables above.

### F3 — HIGH · Self-service sign-up can claim `educator` or `reviewer` and lands in the first organization (Req 6)

`public.handle_new_user()` (latest definition `supabase/migrations/20260826183935_…sql:23-27`) writes a `user_roles` row for any `signup_role IN ('parent','student','educator','reviewer')` taken from `raw_user_meta_data`, which the public `supabase.auth.signUp` call controls from the browser. The profile's `org_id` is set to `(SELECT id FROM organizations ORDER BY created_at LIMIT 1)` — the first (founder's) organization. The app only ever sends `signup_role: "parent"` (`src/routes/auth.tsx:199`), but nothing server-side prevents a crafted sign-up with `signup_role: "educator"`, which yields an educator account inside the first organization with read access to its learners, profiles and assessments. `reviewer` likewise grants read access to every audit surface. Email confirmation is still required, but that is not a tenancy control.

### F4 — MEDIUM · Sample data (Req 5)

- Labelled: `is_demo` exists on `books`, `assessments`, `learners` (`20260826113615_…sql`) and the legacy pilot learner carries `focus_note = 'INTERNAL PILOT — non-production test learner.'` (`20260829072416_…sql`). ✅
- Isolated / removable: demo rows live in the first organization alongside real data; there is no removal path or flag on sessions, gaps, evidence or outcomes. ⚠️
- Excluded from reporting: the flag is honoured only in `src/lib/assessments.server.ts:219-239` (assignment eligibility) and `src/routes/_authenticated/assessments.tsx:137`. `grep -rn is_demo src/lib/outcomes.server.ts outcome-dashboard.server.ts educator-board.server.ts pilot-evidence.server.ts gap.server.ts` → **no matches**: outcome, cohort, pilot-evidence and gap reporting do not exclude demo learners. ❌
- No sample/starter data is created for a fresh centre (confirmed: no `is_demo: true` writes in `src/`), so a new centre has nothing to remove — but also nothing to start from (see Req 4).

### F5 — LOW · Lovable commit content (Req 9 context)

- `supabase/migrations/20260915161655_…sql` was reduced to `SELECT 1;` with a comment that `20260919175712_…sql` creates the same schema. Verified: the deleted body is a strict prefix of `20260919175712` (that file adds further statements). On a database where `20260915161655` had already run, `20260919175712` would have failed on `CREATE TABLE` unless applied with the duplicate removed; whether production's migration history is consistent could not be checked (Blocked).
- `previewAuthStorage.ts` change only affects Lovable preview-host auth brokering (allow-listed platform plumbing, not user-facing).
- `package.json`: `@tanstack/react-router` 1.170.18→1.170.41, `react-start` 1.168.32→1.168.60, `router-plugin` 1.168.23→1.168.42, `@lovable.dev/vite-tanstack-config` pinned 2.23.1; dependency list reordered. No application code change.

## Requirement-by-requirement evidence

**Req 3 — centre-admin routes.** Static count of empty/error-state handling per route under `src/routes/_authenticated/` (grep for `EmptyState|No … yet|QueryError|isError`): dashboard 2/3, learners 4/4, assessments 3/0, interventions 1/0, assignments 1/5, curriculum 3/0, question-bank 4/0, assessment-builder 2/0, diagnostic-engine 3/0, gap-analysis 3/0, outcome-proof 3/7, pilot-evidence 4/3, admin 4/10, feedback-review 2/0, pilot-access 2/0, payment-settings 2/0, auto-verification 1/2, assessment-blueprint 3/0, settings 0/0 (form page), verification 0/1. Dashboard renders "No learners yet — add your first learner from the Learners screen." (`dashboard.tsx:410`); learners uses `EmptyState` + `LearnerImportDialog`. Routes were not rendered in a browser (Blocked), so "useful data" is asserted from code only.

**Req 4 — onboarding.** Chain exists and is server-gated: public form → `pilot_leads` (anon INSERT with length checks) → `approveCentreLead` (admin) creates org + admin user (`email_confirm: true`, temp password returned once to the UI, never logged) → `importLearners` (admin/educator, org from caller) re-homes profiles to the importing org → curriculum/blueprint/question-bank/diagnostic generation → assignment → student session. `CENTRE_ONBOARDING_LIVE_VERIFICATION.md` reports this executed end-to-end on an earlier commit (Meridian test centre), with the note that a fresh centre starts with an empty content library and must build curriculum before its first diagnostic. Not re-executed here (Blocked: no database/app access).

**Req 6 — RLS.** Org-scoped and correct at the tested commit: `organizations` SELECT (`id = caller's org`), `profiles`, `user_roles` (admin reads/manages only roles whose profile is in the caller's org), `learners` (SELECT/INSERT/UPDATE/DELETE on `org_id = private.current_org_id()`), assessment tables (audited by `rls_policy_audit` view and the cross-org test runner in `src/lib/audit.server.ts`). Failing: `pilot_leads` (global admin read), platform tables read via `supabaseAdmin` without org filter (F2), and the sign-up role/org assignment (F3).

**Req 7 — secrets and PII.** Tracked `.env` contains only `SUPABASE_PROJECT_ID`, `SUPABASE_URL` and the `sb_publishable_` key (public client config, as `.env.example` documents; guarded by `src/lib/__tests__/env-secret-guard.test.ts`). `git grep` on HEAD and `git log -p --all` for `rzp_live_…`, `sb_secret_…`, service-role JWTs, `LOVABLE_API_KEY=`, `RAZORPAY_KEY_SECRET=`, `CRON_SECRET=`, AWS keys and private-key blocks: only test fixtures and UI placeholders (`rzp_live_XXXXXXXXXXXX`, `rzp_live_abc123456` in a test). No `console.*` call logs passwords, emails, phones, tokens or secrets. Temporary passwords are returned to the approving admin's screen once and not persisted or logged. Razorpay secrets at rest are AES-256-GCM encrypted with an HKDF key derived from the service-role key and are never returned to the browser (masked status only). Stored demo/sample records contain no real personal data beyond the legacy pilot learner, which is flagged.

**Req 8 — navigation and accessibility.** Static: `<html lang="en">`; public layout has a "Skip to content" link, `nav aria-label="Primary"`/"Mobile", labelled menu toggle; app shell uses the sidebar's mobile `Sheet` via `useIsMobile` and a `SidebarTrigger`. Gaps: no skip link in the authenticated `AppShell`; 2 `<img>` without `alt`; ~10 `size="icon"` buttons without `aria-label`/`sr-only` text (`curriculum.tsx:537-557, 883`, `public-help.tsx:104`, `theme-toggle.tsx:13`, `calendar.tsx:156`, `sidebar.tsx:271`). No browser run was possible (Blocked), so viewport, focus-order and contrast were not measured.

**Req 9 — production SHA.** `https://www.eduos.global/api/public/health` returns only `{status, environment, time}` — it does not expose a commit SHA — and the host is unreachable from this environment (proxy 403). The Supabase project in `.env` (`egcsctawfpzhpodklsms`) is Lovable-Cloud-managed and is not among the projects visible to this session's Supabase connector, so neither the deployed build nor the live migration history could be read. **Unverified.**

## Gates

| Gate | Result |
|---|---|
| `bun install --frozen-lockfile` | Partial: 242 packages; ~460 tarball URLs in `bun.lock` point to `europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/…`, which returns 403 outside Lovable. Re-pointing to the public registry was not permitted in this session. |
| `bun run test` | Not run (vitest binary not installed). Prior report: 308/308 (Reported, `CURRENT_ASSIGNMENT.md`). |
| `bun run lint` | Red: 8,257 prettier/prettier formatting errors across the tree (pre-existing; files such as `src/start.ts`, `vite.config.ts` were not touched by the Lovable batch). |
| `tsc --noEmit` | Not meaningful (missing modules from the partial install). |
| `bun run build` | Failed on missing modules (partial install). |

## Failed tests

- Req 1: Razorpay settings reachable by any `admin`-role user; no owner restriction. **Fail.**
- Req 2: Centre admins can approve centres, read all pilot applications, grant/list pilot access platform-wide, read all feedback, read platform payment audit. **Fail.**
- Req 5: Demo learners not excluded from outcome/cohort/pilot-evidence/gap reporting; no removal path. **Fail (partial).**
- Req 6: `pilot_leads` readable by all admins; self-signup role escalation into the first organization. **Fail.**
- Req 9: Not verifiable. **Fail (unverified).**

## Vulnerabilities (ordered by severity)

1. **Platform payment-credential takeover by any centre admin** (F1). Impact: redirect or disrupt all platform payments; read masked key/mode/audit.
2. **Cross-tenant PII disclosure and privileged actions by any centre admin** (F2): applicant centres' contact details, all parent emails via pilot grants, all feedback contact emails, platform payment audit; ability to create organizations/admin accounts and grant free access to any family.
3. **Self-service role escalation** (F3): crafted sign-up metadata yields `educator`/`reviewer` inside the first organization.
4. **Demo data contaminates reporting** (F4).

## Limitations

- No execution: dependencies could not be installed (private npm mirror), so unit tests, typecheck, build, Playwright screenshots and accessibility tooling did not run. All findings are from source and SQL at the tested commit.
- No production access: `www.eduos.global` and the Lovable-Cloud Supabase project are unreachable from this session. Deployed SHA, live RLS state and live migration history are unverified.
- Screenshots: none could be produced. Evidence is file:line references above.
- Prior live-run claims (onboarding end-to-end, 308 tests) are Reported, not re-verified.

## Rollback recommendation

Do **not** promote or keep promoting `666108d` as the centre-admin-first-login release. The Lovable batch itself is low-risk (dependency bumps, preview-auth plumbing, migration no-op), so a code rollback of that batch fixes nothing; the blocking defects pre-date it. Recommended action instead:

1. **Immediately** restrict every platform-level server function (`payment-settings.functions.ts`, `centre-onboarding.functions.ts:approveCentreLead`, `pilot-access.functions.ts`, `pilot-invitations.functions.ts`, `feedback.functions.ts`, `payment-audit`) to a platform-owner identity (a dedicated `platform_owner` role row or an `PLATFORM_OWNER_USER_ID` secret compared against `context.userId`; never an email string in client code), and hide the corresponding nav items for non-owners. Scope `pilot_leads` reads the same way.
2. Until that ships, **do not approve any new centre** (every approval mints another global admin), and rotate the Razorpay key pair and webhook secret if any centre admin other than the founder currently exists in `user_roles`.
3. Restrict `handle_new_user` to `signup_role IN ('parent')` for self-service sign-ups (staff/student roles are only ever set via service-role `createUser`), and stop defaulting `org_id` to the first organization for self-service accounts.
4. Exclude `is_demo` learners/assessments from outcome, cohort, pilot-evidence and gap reporting.
5. Re-run this verification with database and production access (RLS cross-org runner, migration history, deployed SHA) before release.
