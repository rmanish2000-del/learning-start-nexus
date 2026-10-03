# MPBSE / accessibility staging release — independent verification

| | |
|---|---|
| Verdict | **REJECT** (canonical `main` does not contain the staging implementation; it cannot be released as "the staging build") |
| Tested commit | `fa5fcde09323096a715e8307fc5114b210ae198f` (canonical `main`, 2026-10-02, "design: MPBSE paper practice board selector handoff") |
| Verifier | Claude Code, cloud session, 2026-10-03 |
| Deployment | none; nothing merged |

Grades: **Verified** = observed here. **Reported** = stated by staging / Lovable, not reproducible here. **Blocked** = not testable from this environment.

## Summary

| # | Check | Result | Grade |
|---|---|---|---|
| 1 | Only confirmed `rmanish2000@gmail.com` has platform-owner capabilities | PASS | Verified (code + tests) |
| 2 | Pilot invitations / pilot access functions server-protected | PASS | Verified |
| 3 | Unauthorized roles denied via UI, direct URL, server call | PASS (UI + URL + server, by code); no live browser run | Verified (static) / Blocked (live) |
| 4 | Saved attempts account-isolated on shared devices | PASS for canonical (attempts are server-side only); staging's local timed-attempt store **does not exist on main** | Verified / N/A |
| 5 | Sign-out removes local attempt data | PASS for canonical (no local attempt data; query cache + session marker cleared); staging behaviour not present | Verified / N/A |
| 6 | MPBSE and CBSE accessibility checks | CBSE: static checks pass; **MPBSE: no MPBSE UI exists on main** | Verified / FAIL (absent) |
| 7 | Direct Exam Pattern links after cold load | Route registered and guarded; no browser run | Verified (static) / Blocked (live) |
| 8 | MPBSE practice disabled until original questions + expert approval | PASS by absence: no MPBSE practice code, data or route on main | Verified |
| 9 | Canonical commit matches staging implementation | **FAIL** | Verified (fingerprint + assets) |
| 10 | Tests, typecheck, lint, build, RLS, secret scan | PASS | Verified |

## Evidence

### 1–3. Platform-owner capability and role denial
- `src/lib/platform-owner-shared.ts`: `PLATFORM_OWNER_EMAIL = "rmanish2000@gmail.com"`; `isPlatformOwnerUser` requires exact email **and** `email_confirmed_at`. No configurable override (`platform-owner.server.ts` contains no `process.env`).
- `src/lib/platform-owner.server.ts`: `isPlatformOwner` re-validates with `supabase.auth.getUser()`, rejects a user id that differs from the caller, and `requirePlatformOwner` throws a generic `Response("Forbidden", 403)` after logging `{actor_id, operation}` to `founder_access_denials`.
- Server gates (`requirePlatformOwner` call sites): `payment-settings.functions.ts` ×6 handlers, `payment-audit.functions.ts` ×1, `pilot-access.functions.ts` ×4 (list/grant/extend/revoke), `pilot-invitations.functions.ts` ×3 (create/list/revoke), `feedback.functions.ts` ×4 via `assertAdmin`, `centre-onboarding.functions.ts` (`approveCentreLead`).
- Database: `private.is_platform_owner()` (migration `20261002050331`) checks `auth.users.email` + `email_confirmed_at`; `pilot_leads` SELECT/UPDATE policies use it (migration `20261002050000`).
- Direct URL: `src/routes/_authenticated/route.tsx:61-66` redirects any non-owner off `PLATFORM_OWNER_PATHS` (`/payment-settings`, `/pilot-access`, `/feedback-review`, `/payment-audit`) before any role logic; audit paths need owner or reviewer (line 98); students/parents/reviewers are fenced to their allowed lists.
- UI: `src/lib/nav-visibility.ts` — `ownerOnly` items render only for the confirmed owner; `app-shell.tsx` flags Payment Settings, Pilot Access, Feedback, Payment Audit as `ownerOnly`.
- Tests: `platform-owner-capability.test.ts`, `unconfirmed-owner.test.ts` (unconfirmed owner denied; mismatched user id denied), `payment-credential-access.test.ts`, `pilot-invitations.test.ts` — all green in the run below.

### 4–5. Attempt data and sign-out
- Exam-pattern (PYQ) attempts live only in `public.pyq_practice_sessions` (RLS: `pyq_sessions_*` policies, learner-scoped) via `pyq.server.ts` (`.eq("student_user_id", userId)`, `.eq("learner_id", learner.id)`). `exam-pattern.tsx` keeps answers in React state only; `grep localStorage|sessionStorage` over `src/lib/pyq*.ts` and the route → none.
- Sign-out (`user-menu.tsx:handleSignOut`): cancels and clears the TanStack Query cache, clears the session marker, calls `supabase.auth.signOut()` (which removes the Supabase auth entry from storage), navigates to `/auth`. `__root.tsx` also clears the marker on `SIGNED_OUT`.
- The staging note "mobile timed-attempt reload / submit / history" describes a local attempt store that **is not in canonical** (see 9).

### 6–8. MPBSE / CBSE
- `grep -rli mpbse src` → **no matches**. The only MPBSE content on main is `design/mpbse-paper-practice/` (spec, filter JSON, content rules). No board selector, no MPBSE registry, no 21-entry registry, no 9 official links, no Maths Basic/Standard split in code.
- Therefore MPBSE practice is disabled by absence (8 PASS), and MPBSE accessibility, Hindi-default MPBSE views and mobile MPBSE views cannot be verified on main (6 FAIL-absent).
- Language: `src/lib/i18n/context.tsx` is English-only and actively **removes** any stored Hindi preference (`clearStoredLanguagePreference`, `document.documentElement.lang = "en"`). A "Hindi default + English switch" does not exist on main.
- CBSE Exam Pattern (`/exam-pattern`): route present in `routeTree.gen.ts` (13 references), student-allowed, guarded by `_authenticated` `beforeLoad`; a cold load resolves auth then renders — static only, no browser run (Blocked).
- Accessibility (static, changed files): skip-to-content link and `aria-current="page"` in `app-shell.tsx`; no unlabelled `size="icon"` buttons in the changed routes; `<html lang="en">`. No axe/Lighthouse run (Blocked).

### 9. Canonical vs staging
- Source fingerprint (`scripts/release-fingerprint.mjs`) on `fa5fcde` = `d064be7f74d802cb0a5a92c93089f1e158b76152fee0f9bc450b7f0c8d076434` (547 files), identical to the value recorded in `EDUOS_RELEASE_FINGERPRINT_EVIDENCE.md` at `8e9827a`. Canonical is internally consistent.
- Staging fingerprint supplied: `styles-CPFiICLa.css`, `auth-jF9Ybvtc.js`, Lovable version `dfca4e92…`. Canonical build (`LOVABLE_SANDBOX=1 bun run build`) emits `styles-DMtY-X8K.css` and `auth-BNA1a8FE.js`. **Mismatch.** Combined with the absence of any MPBSE/Hindi/local-attempt code, canonical `main` is a different implementation from the staging release.
- The `EDUOS_MPBSE_A11Y_EXPORT.zip` (1,630,453 B, SHA-256 `7fe13c42…6374`) that would carry staging's `changes.patch` was never received (not in uploads, Drive, or any branch/PR).

### 10. Gates (this environment, `fa5fcde`)
| Gate | Result |
|---|---|
| `vitest run` | **488/488, 46 files** |
| `tsc --noEmit` | **0 errors** |
| `eslint` (files changed since `df272a6`, prettier rule off) | 0 problems |
| `bun run build` (Lovable layout) | success; PWA precache 247 entries |
| RLS | no new migrations since `df272a6`; existing policy tests green; `pyq_practice_sessions`, `pilot_leads`, `founder_access_denials` policies reviewed |
| Secret scan | `git grep` on HEAD for live Razorpay keys, `sb_secret_`, service-role JWTs, AWS keys, private keys → none (test fixtures/placeholders only); tracked `.env` holds public client config only (`env-secret-guard` test green) |
| Branding | no vendor branding in user-facing `src/**/*.tsx` outside allow-listed runtime integrations (`no-platform-branding` test green) |

## Failed checks
- **9 — canonical ≠ staging.** `main` has no MPBSE board selector, registry, Hindi default, local timed-attempt store or the staging asset fingerprint.
- **6 — MPBSE accessibility** cannot pass on main because the surface does not exist.

## Limitations
- No browser, database or staging access from this session: live 403s, cold-load navigation, mobile layouts and axe runs are not reproduced here; those remain staging-Reported.
- Asset-hash comparison assumes staging built from the same toolchain; the source-level absence of MPBSE code is the decisive evidence, not the hash alone.

## Production blockers
1. The staging implementation is not in GitHub. Until the staging ZIP (`changes.patch`) is delivered, checksum-verified and reviewed file by file (especially `app-shell.tsx`), nothing MPBSE/a11y-related can be promoted from canonical.
2. `DB-BASELINE-001` remains open (fresh-replay not supported) — accepted technical debt, not a blocker for this release, but it must stay recorded.

## Rollback recommendation
No rollback needed: canonical `main` at `fa5fcde` is a verified, self-consistent state (gates green, owner controls intact). Do **not** publish staging to production from Lovable until its source is in canonical `main` and re-verified; if staging was already published, the safe rollback is to republish the build whose `/api/public/version` fingerprint equals `d064be7f74d8…`.
