# EduOS — Current Assignment

**Last verified:** 2026-10-03 (UTC) · **Canonical branch:** `main` · **Verified head:** `5bf25fb554067560ec3b7dd5aa09380f90f82888`
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

**Id:** `ASG-2026-10-03-006`
**Title:** Canonical migration reconciliation with the real staging schema (forward-only)
**Received:** 2026-10-03 · **Priority:** P0 SECURITY / DATA INTEGRITY · **Owner:** Claude Code · **Continuity owner:** M365 Copilot
**Status:** PARTIAL — forward-only migration delivered and proven on disposable databases (branch `reconcile/staging-migrations`, draft PR against `main`); the staging applied-migration ledger is unverified, so the PR is not merge-ready.

### Business value

Makes canonical main safely compatible with the staging schema without rewriting applied
migrations or risking the 10 feedback rows, 1 remediation snapshot and 325 remediation
actions that exist on staging.

### Input (verified)

`EDUOS_STAGING_RECONCILIATION_HANDOFF.zip`, 84242 bytes, SHA-256
`bd4527c3358464e72b3a6f8131555a71485837e21b5d82ece4f79ac56dc83bd4` — registry `ART-0011`;
all 32 members committed under `verification/staging-migration-reconciliation/handoff/`.

### Scope

In: one new migration `supabase/migrations/20261003120000_staging_reconciliation_forward_only.sql`
(generated from main's own migrations by `scripts/db/generate-reconciliation-migration.py`),
the dry-run harness `scripts/db/reconciliation-dryrun/`, the test
`src/lib/__tests__/staging-migration-reconciliation.test.ts`, evidence and registries.
Out: merge, deployment, any live database execution, staging sync, modifying/renaming/deleting
any applied migration, importing staging-only migration names into main.

### Steps

| # | Action | Executor | Status |
|---|---|---|---|
| S1 | Input gate (identity, 32/32 sums, manifest, drift, 13+8 migrations, conflict, 3 pairs, schema evidence, secrets) | Claude Code | done |
| S2 | Independent audit of the matrix (hash-confirmed pairs; 14-vs-7 table discrepancy recorded) | Claude Code | done |
| S3 | Generate the forward-only idempotent migration; no DROP TABLE / TRUNCATE / DELETE / DROP COLUMN | Claude Code | done |
| S4 | Dry-run on disposable PostgreSQL 16: bare, main-shaped (no-op), staging-shaped (rows preserved, idempotent) | Claude Code | done |
| S5 | Gates, commit, push, draft PR against `main` | Claude Code | done |
| S6 | Attach the staging applied-migration ledger and the seven-table check | Lovable | pending |
| S7 | Decide ledger marking with the Cloud owner; founder merge decision | Founder (irreversible decision) | pending |

### Permissions

Deployment: **not allowed.** Database execution: **not allowed.** Merge: **not allowed in this assignment.**

### Blockers

`BLK-MIGRATION-LEDGER-UNVERIFIED`, `BLK-STAGING-7-TABLES-UNVERIFIED` (Lovable), plus the open
items in `.ai/BLOCKER_REGISTRY.json`.

### Rollback

Close the PR or delete the single new migration file; nothing has been applied anywhere.

### Next gate

Lovable attaches the staging ledger export (read-only) and the seven-table check; then the
founder decides on ledger marking and the merge.
