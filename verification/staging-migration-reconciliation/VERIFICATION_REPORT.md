# Canonical migration reconciliation with the real staging schema — forward-only

**Seat:** Claude Code · **Date:** 2026-10-03 (UTC) · **Assignment:** `ASG-2026-10-03-006`
**Canonical base:** `main` @ `5bf25fb554067560ec3b7dd5aa09380f90f82888` (fetched, clean worktree) · **Branch:** `reconcile/staging-migrations`
**Deployment / live database execution / staging sync / merge:** none performed

## Result: PARTIAL — migration delivered and proven on disposable databases; the applied-migration ledger of staging remains unverified, so the PR is a draft, not merge-ready

## 1. Attachment verification

| Check | Result |
|---|---|
| `EDUOS_STAGING_RECONCILIATION_HANDOFF.zip` | 84242 B, SHA-256 `bd4527c3358464e72b3a6f8131555a71485837e21b5d82ece4f79ac56dc83bd4` ✔ |
| `SHA256SUMS.txt` / `MANIFEST.json` | 32/32 OK / 32 entries |
| Secret scan | 0 findings (only `GRANT … TO service_role` SQL) |
| Required evidence | 71-file code drift (`drift/code-drift-71.txt`, 4069-line diff), 13 main-only, 8 staging-only, both `20260915161655` versions, 3 byte-identical pairs, `schema-evidence/schema-state.txt` — all present |

Every text member is committed under `handoff/`; the 8 staging-only migrations and the staging-applied `20260915161655` are under `handoff/staging-history/` (evidence only, **not** under `supabase/migrations/`).

## 2. Independent audit of the matrix

| Claim | Independent check | Verdict |
|---|---|---|
| 13 main-only migrations | each byte-identical to the file in `supabase/migrations/` (cmp) | confirmed |
| 8 staging-only migrations | none present in `supabase/migrations/` | confirmed |
| 3 byte-identical renamed pairs (`20260905094512/094600/094734` = `20260905100552/100631/100711`) | sha256 equal | confirmed |
| Same name, different content `20260915161655` | main: 215-byte `SELECT 1` placeholder; staging: full remediation DDL (7 tables) | confirmed |
| "All 14 tables from main `20260919175712` already exist on staging" | staging's applied `20260915161655` creates **7** tables; `schema-state.txt` inspects only 2 of them; the other 7 (`automated_review_imports`, `automated_provisional_outcomes`, `automated_review_rollback_events`, `question_marking_specs`, `question_content_revisions`, `curriculum_source_register`, `question_originality_checks`) are **unverified** | discrepancy → `BLK-STAGING-7-TABLES-UNVERIFIED` |
| Three unlabelled main-only placeholders (`20261002045357/045439/050123`) | byte-identical no-ops (`SELECT 1`) | confirmed |
| `feedback_submissions` 10 rows, `remediation_snapshots` 1, `remediation_actions` 325 | from `schema-state.txt` (Lovable read-only inspection) | reported |
| Applied-migration ledger | not readable by the handoff author; not accessible from this seat | **unverified** → `BLK-MIGRATION-LEDGER-UNVERIFIED` |

## 3. Reconciliation matrix (what the new migration does per item)

| Item | Disposition in `20261003120000_staging_reconciliation_forward_only.sql` |
|---|---|
| 3 byte-identical renamed pairs | nothing to apply (content already on both sides); names untouched |
| `20260915161655` conflict | main's placeholder preserved byte-for-byte; staging's full version never copied into main; the 7 tables it created are re-asserted `IF NOT EXISTS` (no-op on staging, creates them where absent) |
| main `20260919175712` (14 tables + hardening) | every `CREATE TABLE/INDEX` → `IF NOT EXISTS`; policies/triggers created only when absent; functions `CREATE OR REPLACE`; views `CREATE OR REPLACE`; grants/revokes guarded on relation existence; the two `DROP TRIGGER IF EXISTS` (delete-blocking triggers main itself removes) kept — triggers, not data |
| main `20260919175907` exclusions / work-item inserts | kept verbatim (`ON CONFLICT DO NOTHING`) |
| main `20260919195620` `question_commercial_release` + `production_release_pool` | `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE VIEW` |
| main `20260919195651` `security_invoker` | applied only if the view exists |
| main `20261002045629` `founder_access_denials` + `pilot_leads` columns | already `IF NOT EXISTS`; `ALTER TABLE` guarded |
| main `20261002050331` `is_platform_owner()` confirmed-email | `CREATE OR REPLACE` (identical semantics to staging's hardened PR #5 version) |
| staging PR #5 hardened `20261002052550` | owner policies on `pilot_leads` ensured present (no drop/recreate); `handle_new_user`, sample-workspace and setup-progress functions are already on main via `20261002050000` — not re-applied |
| staging `20260904172759` (drops staging-only tables/columns) | **excluded**: destructive and only meaningful on staging, where it is already applied |
| staging `20260905045134` (`tutor_evidence_by_gap` wrapper) | **excluded**: would replace main's function body with a wrapper whose target (`private.tutor_evidence_by_gap`) is not guaranteed on main; both histories expose the same public signature |
| staging `20260905084252` (`feedback_submissions`) | byte-identical to main `20260905074149`; no action (grants re-asserted, guarded) |
| staging `20261002052435` | no-op placeholder; nothing |

No applied migration was modified, renamed, reordered or deleted (`existing-migrations.sha256`: 109/109 unchanged, asserted by test). No staging-only filename was imported.

## 4. Dry-runs (disposable PostgreSQL 16.14, `scripts/db/reconciliation-dryrun/`)

Harness: a Supabase-shaped shim (roles, `auth.users`/`uid()`/`jwt()`, `private` helpers, FK targets). Fresh replay of all 109 migrations is formally waived (`docs/tech-debt/DB-BASELINE-001.md`), so the scenarios build the relevant slice of each history. Evidence: `dryrun-results.json`.

| Scenario | Setup | Result |
|---|---|---|
| **bare** | shim only | migration succeeds from nothing; 52 objects created; second run identical (idempotent); nothing removed |
| **main-shaped** | shim + main `20260919175712/175907/195620/195651`, `20261002045629/050331`, owner policies, seeded rows | **no object added, none removed**; 10 / 1 / 325 rows byte-identical before and after both runs |
| **staging-shaped** | shim + staging-applied `20260915161655` (full) + hardened owner check + seeded 10 feedback / 1 snapshot / 325 actions + 1 quarantined question | 30 objects added (the 9 missing tables, 3 views, columns, policies, triggers); `security_invoker=on`; confirmed-email owner check; **10 / 1 / 325 rows byte-identical**; exclusions insert acted exactly once (3 rows, 1 work item) and did not duplicate on the second run; only removals = the two delete-blocking triggers main itself drops |

Same-name conflict handling: main's `20260915161655` stays the 215-byte placeholder; the test suite asserts it and asserts no staging name entered `supabase/migrations/`.

## 5. Automated tests — `src/lib/__tests__/staging-migration-reconciliation.test.ts`

- 109 existing migrations present and byte-identical to the committed manifest; the only new file is the reconciliation, ordered last on both histories.
- Same-name conflict left alone; no staging-only name imported.
- Migration regenerates deterministically from `scripts/db/generate-reconciliation-migration.py`; contains no `DROP TABLE/TRUNCATE/DELETE/DROP COLUMN/DROP SCHEMA`; every table/index `IF NOT EXISTS`; every policy/trigger guarded; views `CREATE OR REPLACE`; every insert `ON CONFLICT DO NOTHING`; the only `DROP`s are the two trigger removals.
- Live dry-run (bare / main-shaped / staging-shaped, idempotency, row preservation, same-name handling) runs when a PostgreSQL is reachable at `PGHOST:PGPORT` (default `127.0.0.1:54329`) and is skipped otherwise — the committed `dryrun-results.json` is the recorded run.

## 6. Unresolved migration-ledger risk

The platform's applied-migration ledger for staging could not be read. Consequences:

1. The reconciliation migration itself is **safe regardless of the ledger** (every step is guarded; proven on three shapes).
2. It **cannot** make staging replay main's older names: if the platform next tries to apply `20260919175712` on staging, that file still contains unguarded `CREATE TABLE`s and would fail or be skipped depending on the ledger. Making those names "applied" on staging is a ledger operation only the Cloud owner can perform.
3. Whether the second 7 tables exist on staging is unverified (the migration handles both cases).

Both are registered: `BLK-MIGRATION-LEDGER-UNVERIFIED`, `BLK-STAGING-7-TABLES-UNVERIFIED`. Until (1) the ledger export is attached and (2) the seven-table check is done, this PR is a **draft**.

## 7. Gates

See the PR body / handoff for the observed values: `bun run ai:check`, `bunx vitest run`, `bunx tsc --noEmit -p tsconfig.json`, changed-file eslint, `LOVABLE_SANDBOX=1 bun run build`, secret scan, dry-runs (bare / main-shaped / staging-shaped) with data-preservation assertions.

## 8. Limitations

- Dry-runs use a shim, not a restored staging backup; `remediation_actions` rows are synthetic (325), `feedback_submissions` synthetic (10).
- Lovable's internal commits are not on GitHub; the staging history is known only from the handoff copies.
- The disposable PostgreSQL ran under `/tmp/pgtest-cluster` as an unprivileged user because the sandbox scratchpad path is not traversable by that user.

## 9. Rollback

Close the PR, or delete `supabase/migrations/20261003120000_staging_reconciliation_forward_only.sql` (plus `scripts/db/`, the test and this folder). Nothing has been applied to any database; nothing was deployed.
