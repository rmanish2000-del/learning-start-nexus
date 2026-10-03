# EduOS — Current Assignment

**Last verified:** 2026-10-03 (UTC) · **Canonical branch:** `main` · **Verified head:** `b634d11aa5e82c64b92261728df71348958069d6`
**Machine-readable mirror (authoritative on conflict):** `.ai/CURRENT_TASK.json`
**Evidence source:** founder assignment to the Claude Code seat, 2026-10-03 (canonical integration and independent verification).

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

**Id:** `ASG-2026-10-03-003`
**Title:** MPBSE, accessibility, branding and deep-link staging work — canonical integration and independent verification
**Received:** 2026-10-03 · **Priority:** P0 · **Owner:** Claude Code · **Continuity owner:** M365 Copilot
**Status:** in progress — integration delivered on branch `feat/mpbse-a11y-canonical` (PR #7); founder decision received 2026-10-03: MPBSE panel English-only (GV-013 Hindi exception rejected); merge authorised after gates.

### Business value

Moves the verified staging work (MPBSE paper registry and board surface, timed-attempt
persistence with account isolation, accessibility fixes, EduOS-only branding check, safe
`/exam-pattern` deep-link return) into the canonical repository with complete provenance and
no unrelated changes.

### Input (verified)

`EDUOS_MPBSE_CANONICAL_HANDOFF.zip`, 716174 bytes, SHA-256
`290f51a170329344a13b541f1e651c9f13c3e56ae4e069d65a585f6f9105940f` — registry `ART-0009`;
text members committed under `verification/mpbse-a11y-canonical/handoff/`.

### Scope

In: the 19 handoff paths, applied from `changes.patch` file by file; regression tests for the
return-path sanitizer, deep-link wiring, attempt-storage cleanup and MPBSE practice staying
disabled; verification evidence; registry updates.
Out: merge, staging or production deployment, database or migration changes, dependency
upgrades, `app-shell.tsx` changes beyond the three role-label colour lines.

### Steps

| # | Action | Executor | Status |
|---|---|---|---|
| S1 | Input availability gate (ZIP identity, SHA256SUMS, manifest, 19 files, patch vs files/, secret scan) | Claude Code | done |
| S2 | Apply `changes.patch` to main file by file; reject `files/` deltas that regress canonical controls | Claude Code | done |
| S3 | Add missing regression tests | Claude Code | done |
| S4 | Run vitest, tsc, lint (changed files), build, `ai:check`, secret scan | Claude Code | done |
| S5 | Commit, push, open PR against `main` | Claude Code | done |
| S6 | Founder decision applied: MPBSE panel English-only, Hindi strings/toggle removed, test exception removed | Claude Code | done |
| S7 | Re-run gates, push, independent diff review, merge PR #7 (founder-authorised) | Claude Code | pending |

### Permissions

Deployment: **not in scope, no permission.** Merge: founder-authorised for PR #7 in the 2026-10-03 correction-and-merge assignment, executed by Claude Code only after every gate passes.

### Blockers

`BLK-MPBSE-HINDI-RATIFICATION` closed (English-only retained by founder decision). Open items in
`.ai/BLOCKER_REGISTRY.json` (production SHA verification by Lovable, PDF branch, roadmap case
collision, OAuth client, PR #4 decision).

### Rollback

Close the PR or revert the integration commit on the branch. No schema, data or deployment
change.

### Next gate

Merge of PR #7 after gates, then Lovable executes `ASG-2026-10-03-002`
(`docs/ai/examples/assignment.example.json`: verify the deployed production SHA and close
`BLK-PRODUCTION-SHA`).
