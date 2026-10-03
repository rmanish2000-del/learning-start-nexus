# EduOS — Current Assignment

**Last verified:** 2026-10-03 (UTC) · **Canonical branch:** `main` · **Verified head:** `4b86de0fafe1372a7d9b180cca471e950d67e866`
**Machine-readable mirror (authoritative on conflict):** `.ai/CURRENT_TASK.json`
**Evidence source:** founder assignment to the Claude Code seat, 2026-10-03 (canonical migration reconciliation).

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

**Id:** `ASG-2026-10-03-007`
**Title:** Staging apply readiness for `20261003120000` (apply-policy confirmation and pre-apply evidence; no apply)
**Received:** 2026-10-03 · **Priority:** P0 · **Owner:** Lovable · **Continuity owner:** M365 Copilot
**Status:** planned — waits on the Drive INBOX assignment to the Lovable seat.

### Business value

Unblocks a safe, single-migration staging apply that brings staging to canonical main's schema
without touching the 10 feedback rows, 1 remediation snapshot and 325 remediation actions.

### Objective

Satisfy preconditions P2–P5 of
`verification/staging-migration-reconciliation/POST_MERGE_STAGING_EXECUTION_PLAN.md`: written
apply-policy confirmation (only versions newer than ledger row `20261002052550` are executed),
export of the four SQL-less ledger rows, staging backup identifier, pre-apply read-only snapshot.
**Do not apply the migration.** P1 (explicit founder permission) is a separate founder act.

### Steps

| # | Action | Executor | Status |
|---|---|---|---|
| S1 | Answer `BLK-PLATFORM-APPLY-SEMANTICS` in writing | Lovable | planned |
| S2 | Export the four SQL-less ledger rows (read-only) | Lovable | planned |
| S3 | Record staging backup / restore-point identifier | Lovable | planned |
| S4 | Pre-apply read-only snapshot (`objects.sql`, counts 10 / 1 / 325) | Lovable | planned |
| S5 | Founder grants explicit staging apply permission or declines (G1: irreversible decision) | Founder | planned |

### Completed predecessor (record)

`ASG-2026-10-03-006` — DONE. PR #9 merged into `main` at
`4b86de0fafe1372a7d9b180cca471e950d67e866` (founder merge decision, 2026-10-03). Migration NOT
applied anywhere. Milestone `RECONCILIATION-2026-10-03`. Full record:
`.ai/CURRENT_TASK.json` → `history`, and `verification/staging-migration-reconciliation/VERIFICATION_REPORT.md` §§1–12.
