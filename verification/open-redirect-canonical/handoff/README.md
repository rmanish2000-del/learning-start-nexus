# P0 open-redirect fix (`/auth?next=`)

Base: internal 629af78. Fix commit: d36eaef. Live staging build: index-oE0w6V3R.js / styles-CEoXcQt9.css.

## Root cause
`/auth` validateSearch omitted a rejected `next` key. TanStack Router merges validated output over the raw
search (`{...raw, ...validated}`), so the rejected raw value survived and `window.location.replace(search.next)`
sent already-signed-in users to external origins.

## Fix
- `src/lib/return-path.ts`: canonical `sanitizeReturnPath()` (rejects protocol-relative, absolute, backslash,
  control/whitespace chars, and up to 3 rounds of percent-decoded variants; resolves against a fixed origin and
  returns pathname+search+hash only).
- `src/routes/auth.tsx`: validateSearch always sets `next` (sanitised or `undefined`, overriding the raw value);
  both redirect sites re-sanitise immediately before `window.location.replace`.
- `src/lib/__tests__/return-path.test.ts`: 23 cases.

## Apply
`git apply changes.patch` (or copy `files/` at repo-relative paths), then `bunx vitest run`.

## Rollback
`git apply -R changes.patch`, or republish the previous staging version (index-Dq4iOv43.js). Rolling back re-opens the vulnerability.

## Retraction
Earlier evidence (EDUOS_MPBSE_CANONICAL_HANDOFF.zip, TEST_EVIDENCE.md) stated the `//evil.com` return link was
"confirmed on the preview" after sign-in. That was incorrect: the signed-in case was not tested and was exploitable.
This package supersedes that claim.

## Known separate defects (not fixed here)
1. Signed-out calls to protected server functions return HTTP 200 with an "Unauthorized" error body, not 401.
2. Centre-admin server functions called by educator/parent/reviewer return HTTP 200 with
   "You do not have permission" instead of 403. Founder-only functions do return real HTTP 403.
