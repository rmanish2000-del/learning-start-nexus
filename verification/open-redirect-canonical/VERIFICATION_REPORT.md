# P0 canonical security hotfix — `/auth?next=` open redirect

**Seat:** Claude Code · **Date:** 2026-10-03 (UTC) · **Assignment:** `ASG-2026-10-03-004`
**Canonical base:** `main` @ `9c90805ccb5a50c3717acfd6a1b1428f0f763150` (fetched; clean worktree; contains merged PR #7 whose integration head was `7324d530d019bf48b92df31cdbd623061d20d244`)
**Working branch:** `security/open-redirect-canonical-fix` · **Merge:** not performed · **Staging / production:** not deployed, not modified

## Result: PASS (fix delivered; merge withheld for independent review)

## 1. Attachment verification

| Check | Result |
|---|---|
| Name / size / SHA-256 | `EDUOS_OPEN_REDIRECT_FIX.zip`, 3818627 B, `7834334c57035bd8c8352edf4717561c758fa78767aab302102d83f0b5148b4d` ✔ |
| `SHA256SUMS.txt` | 32/32 OK |
| Required paths | `files/src/lib/return-path.ts`, `files/src/lib/__tests__/return-path.test.ts`, `files/src/routes/auth.tsx`, `changes.patch`, `evidence/` (live-matrix.json, run.py, 24 screenshots) — all present |
| Secret scan | 0 findings |
| Provenance | Lovable internal base `629af78`, fix commit `d36eaef` (not on GitHub); `changes.patch` does **not** apply to `main` because PR #7 already introduced `src/lib/auth-return.ts`; the supplied `files/` were reconciled by hand |

Text members (README, sums, patch, live matrix, runner, supplied sanitizer) are committed under
`verification/open-redirect-canonical/handoff/`. Screenshots are identified by hash only.

## 2. Reproduction on merged main (`9c90805`)

Root cause (confirmed in `node_modules/@tanstack/router-core/dist/esm/router.js` lines 683–686,
version 1.171.34): a match's search is `{ ...parentSearch, ...strictSearch }`. The pre-fix
`/auth` validator returned `{}` for a rejected `next`, so the **raw** value survived into
`Route.useSearch()` and both redirect sites executed `window.location.replace(search.next)`.

`REPRODUCTION_main-9c90805.txt` replays main's validator and the router merge over the 16
supplied variants: **8/16 reach an external origin** for a signed-in user
(`//evil.com`, `https://evil.com`, `/\evil.com`, `\\evil.com`, `/\/evil.com`, `\/evil.com`,
`//\evil.com`, `/\t/evil.com`); 7 resolve to same-origin paths; 1 (`/\%2Fevil.com`) is
unparseable. Lovable's live staging matrix (`handoff/live-matrix.json`) shows all 16 SAFE after
the staging fix.

## 3. Sanitizer consolidation decision

Exactly one sanitizer remains: **`src/lib/return-path.ts`** (Lovable's path name, adopted).
`src/lib/auth-return.ts` (added by PR #7) is deleted; no other module defines or imports a
return-path helper (`grep sanitizeReturnPath src` → `return-path.ts`, `auth.tsx`, tests only).

Implementation = Lovable's `looksExternal` + bounded 3-round percent-decoding + fixed-origin URL
resolution, with two deliberate differences:

1. Plain space is **not** treated as a control character (Lovable's `\s` would have rejected
   every query string with an encoded space, e.g. `/learners?q=a%20b`). Tab, CR, LF and all
   other `\u0000–\u001f`/`\u007f` are rejected.
2. The resolved form must equal the input (`out === raw`), so browser-normalised values
   (`/.//evil.com`, `/../../evil.com`) are rejected outright rather than rewritten.

`validatedReturnPath(search)` always returns `{ next: sanitizeReturnPath(search.next) }`, so
the key is explicitly **replaced** (never omitted) in `validateSearch`; both redirect sites call
`sanitizeReturnPath(search.next)` again immediately before `window.location.replace`.

## 4. Changed paths

- `src/lib/return-path.ts` (new, canonical) · `src/lib/auth-return.ts` (deleted)
- `src/routes/auth.tsx` — import; `AuthSearch.next?: string | undefined`; `...validatedReturnPath(search)`; two `const target = sanitizeReturnPath(search.next)` redirects. No formatting changes (file left as on `main`).
- `src/lib/__tests__/return-path.test.ts` (new) · `src/lib/__tests__/auth-return-route.test.ts` → `return-path-route.test.ts` (updated)
- `verification/open-redirect-canonical/**`, `.ai/{ARTIFACT_REGISTRY,BLOCKER_REGISTRY,CURRENT_STATE,CURRENT_TASK}.json`, `CURRENT_ASSIGNMENT.md`

Untouched (verified by `git diff origin/main`): `src/start.ts` (`/lovable/` bypass), `src/routes/_authenticated/route.tsx` (owner controls), `src/lib/platform-owner*.ts`, `src/components/mpbse-papers.tsx` (English-only).

## 5. Redirect matrix (automated, `return-path.test.ts`)

| Variant | Sanitizer | Signed-in (router merge + fixed validator) | Signed-out (gate-encoded, decoded on /auth) |
|---|---|---|---|
| `//evil.com` | rejected | `next` → `undefined` | rejected |
| `https://evil.com` | rejected | `undefined` | rejected |
| `/\evil.com` | rejected | `undefined` | rejected |
| `\\evil.com` | rejected | `undefined` | rejected |
| `/\/evil.com` | rejected | `undefined` | rejected |
| `\/evil.com` | rejected | `undefined` | rejected |
| `//\evil.com` | rejected | `undefined` | rejected |
| `/\t/evil.com` | rejected | `undefined` | rejected |
| `/%2F%2Fevil.com` | rejected | `undefined` | rejected |
| `%2F%2Fevil.com` | rejected | `undefined` | rejected |
| `https%3A%2F%2Fevil.com` | rejected | `undefined` | rejected |
| `/%5Cevil.com` | rejected | `undefined` | rejected |
| `/%2F\evil.com` | rejected | `undefined` | rejected |
| `/\%2Fevil.com` | rejected | `undefined` | rejected |
| `/%5C/evil.com` | rejected | `undefined` | rejected |
| `/%252F%252Fevil.com` | rejected | `undefined` | rejected |
| extra: `/\n/evil.com`, `/\r\n/evil.com`, `/\u0000/evil.com`, `/.//evil.com`, `/../../evil.com`, `javascript:`, `JAVASCRIPT:`, `data:`, ` /exam-pattern`, `evil.com`, `exam-pattern`, `""`, 3000-char path, non-strings | rejected | — | — |
| kept: `/exam-pattern`, `/exam-pattern?board=cbse#papers`, `/parent?tab=report&x=1#gaps`, `/diagnostic/checkout/abc`, `/learners?q=a%20b` | unchanged | kept | round-trips through the gate encoding |

The pre-fix behaviour is also pinned as a test ("reproduces the defect"), so a regression to an
omitting validator fails the suite.

## 6. Gates (observed on the branch)

| Gate | Result |
|---|---|
| `bun run ai:check` | PASS (0 errors) |
| `bunx vitest run` | **640 passed / 52 files** (main: 562 / 51) — includes English-only, owner-capability, unconfirmed-owner, security-headers, vendor-branding, no-platform-branding |
| `bunx tsc --noEmit -p tsconfig.json` | 0 errors |
| eslint (changed files) | `return-path.ts`, both test files clean; `auth.tsx` carries 21 pre-existing prettier findings (main: 22) outside the touched hunks |
| `LOVABLE_SANDBOX=1 bun run build` | success, 254 precache entries |
| Secret scan (archive + diff) | 0 |
| `/lovable/` bypass regression | `src/start.ts` identical to main; bypass present |
| Owner-route regression | `route.tsx`, `platform-owner*.ts` identical to main; tests green |
| English-only | `english-only.test.ts` green; `mpbse-papers.tsx` identical to main |
| Complete redirect matrix | 86 tests in the two return-path suites, all green |

## 7. Authorization-status defects (recorded, not fixed here)

From `handoff/live-matrix.json` (staging, reported by Lovable):

- **`BLK-AUTHZ-401-SERVER-FN`** — signed-out calls to 11 protected server functions return HTTP 200 with body `Unauthorized: No authorization header provided` instead of 401. Data is not exposed.
- **`BLK-AUTHZ-403-ROLE-FN`** — centre-admin functions called by educator/parent/reviewer return HTTP 200 with `You do not have permission` instead of 403. Founder-only functions already return a real 403 (`requirePlatformOwner`).

Both are owned by Claude Code as separate assignments; this hotfix was not expanded into global error handling.

## 8. Limitations

- The live staging matrix and screenshots are Lovable-reported; this seat cannot reach staging and verified the fix through code-level reproduction and unit tests.
- Lovable's base and fix commits are not on GitHub; provenance rests on the ZIP identity and the reconciled diff.
- Repo-wide `bun run lint` remains red from pre-existing formatting.

## 9. Rollback

Close the PR or `git revert <hotfix commit>` on the branch. **Rolling back re-opens the signed-in open redirect on canonical main.** Nothing was deployed to staging or production.

## 10. Handoff

Ownership returned to M365 Copilot. Next founder act: independent review and merge decision on the hotfix PR.
