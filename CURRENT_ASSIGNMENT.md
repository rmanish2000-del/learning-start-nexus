# EduOS — Current Assignment

**Last verified:** 2026-10-03 (UTC) · **Canonical branch:** `main` · **Verified head:** `9c90805ccb5a50c3717acfd6a1b1428f0f763150`
**Machine-readable mirror (authoritative on conflict):** `.ai/CURRENT_TASK.json`
**Evidence source:** founder assignment to the Claude Code seat, 2026-10-03 (P0 canonical security hotfix).

This file holds **only** the active assignment. Completed assignments live in
`.ai/CURRENT_TASK.json` → `history` with a git coordinate to their full text.

---

## Governing rules (permanent, inherited by every chat)

`EDUOS_PROJECT_OPERATING_SYSTEM.md` §11 (Founder Non-Execution, M365 Copilot continuity
ownership, English assignments / Hindi chat), §12 (Business-Value-First) and §13 (AI
governance). `AGENTS.md` carries the same rules for every seat. `bun run ai:check` must pass
before any handoff.

---

## Active assignment

**Id:** `ASG-2026-10-03-004`
**Title:** P0 canonical security hotfix — `/auth?next=` open redirect
**Received:** 2026-10-03 · **Priority:** P0 SECURITY · **Owner:** Claude Code · **Continuity owner:** M365 Copilot
**Status:** in progress — fix delivered on branch `security/open-redirect-canonical-fix` (PR against `main`); merge withheld for independent review (founder act).

### Business value

Moves the verified open-redirect fix from staging into canonical GitHub before any production
deployment. The signed-in flow on `main` @ `9c90805` sends an already-signed-in user to an
external origin for 8 of the 16 supplied `next` variants (reproduced:
`verification/open-redirect-canonical/REPRODUCTION_main-9c90805.txt`).

### Input (verified)

`EDUOS_OPEN_REDIRECT_FIX.zip`, 3818627 bytes, SHA-256
`7834334c57035bd8c8352edf4717561c758fa78767aab302102d83f0b5148b4d` — registry `ART-0010`;
text members committed under `verification/open-redirect-canonical/handoff/`.

### Root cause

`/auth` `validateSearch` omitted a rejected `next`. TanStack Router (router-core 1.171.34,
`router.js` 683–686) builds a match's search as `{ ...parentSearch, ...strictSearch }`, so the
raw value survived into `Route.useSearch()` and `window.location.replace(search.next)` used it.

### Scope

In: `src/lib/return-path.ts` (the one canonical sanitizer, replaces `src/lib/auth-return.ts`),
`src/routes/auth.tsx` (validator always sets `next`; both redirects re-sanitize),
`src/lib/__tests__/return-path.test.ts` + `return-path-route.test.ts`, evidence, registries.
Out: merge, deployment, global 401/403 remediation (recorded as `BLK-AUTHZ-401-SERVER-FN` and
`BLK-AUTHZ-403-ROLE-FN`).

### Steps

| # | Action | Executor | Status |
|---|---|---|---|
| S1 | Input gate (identity, SHA256SUMS 32/32, required paths, secret scan) | Claude Code | done |
| S2 | Reproduce the signed-in open redirect on `main` | Claude Code | done |
| S3 | One sanitizer, validator root-cause fix, re-sanitize at both redirects, 16-variant tests in both flows | Claude Code | done |
| S4 | Gates, commit, push, PR against `main` (no merge) | Claude Code | done |
| S5 | Independent review and merge decision | Founder (irreversible decision) | pending |

### Permissions

Deployment: **not in scope, no permission.** Merge: **not allowed in this assignment.**

### Blockers

`BLK-AUTHZ-401-SERVER-FN`, `BLK-AUTHZ-403-ROLE-FN` (new, separate assignments) plus the open
items in `.ai/BLOCKER_REGISTRY.json`.

### Rollback

Close the PR or revert the hotfix commit. **Rolling back re-opens the signed-in open redirect.**

### Next gate

Founder review and merge of the hotfix PR; then Lovable executes `ASG-2026-10-03-002`
(production SHA verification) and a separate assignment addresses the 401/403 status codes.
