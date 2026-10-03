# Canonical migration reconciliation with the real staging schema — forward-only

**Seat:** Claude Code · **Date:** 2026-10-03 (UTC) · **Assignment:** `ASG-2026-10-03-006`
**Canonical base:** `main` @ `5bf25fb554067560ec3b7dd5aa09380f90f82888` (fetched, clean worktree) · **Branch:** `reconcile/staging-migrations`
**Deployment / live database execution / staging sync / merge:** none performed

## Result: PASS (reassessed 2026-10-03 with the staging ledger, §10) — migration unchanged and confirmed correct; merge recommended under founder decision; staging apply only with explicit permission and a backup

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

## 10. Reassessment with the staging ledger (`EDUOS_STAGING_LEDGER_SCHEMA_EVIDENCE_v2.zip`, ART-0012)

**Package:** 38118 B, SHA-256 `5b377c79f25034b004261b55d1d9fe502735ddbca8b6cfca4b7a45015c8f2a6f`; `SHA256SUMS` 38/38; 35 ledger rows, 31 with SQL byte-verified by MD5; founder email redacted by the producer. Committed under `ledger-evidence/`.

### 10.1 Ledger contents vs the assumptions used in PR #9

| PR #9 assumption | Ledger fact | Effect on PR #9 |
|---|---|---|
| Staging applied the **full** `20260915161655` | present in ledger; statement byte-identical to the handoff copy (8394 chars, 7 tables) | confirmed — the same-name conflict is real; main's placeholder will never be applied on staging (name already recorded) |
| `20260919175712/175907/195620/195651`, `20261002045629/050000/050331` not applied on staging | all seven **absent** from the ledger | confirmed — exactly the set whose effects the reconciliation migration re-asserts |
| `question_commercial_release`, `production_release_pool`, `founder_access_denials` absent | `object-check.md`: all three ABSENT | confirmed — created by the migration (`IF NOT EXISTS` / `CREATE OR REPLACE VIEW`, `security_invoker` applied once the view exists) |
| All 14 tables of `20260919175712` exist (disputed in §2) | `table-check.csv`: 14/14 present, RLS on. Provenance from main's own history: 7 from `20260915161655` (staging version), 3 from `20260915180432`, 4 from `20260915181935` — both shared versions byte-identical between ledger and main | dispute resolved; `IF NOT EXISTS` is a no-op for all 14 on staging |
| `is_platform_owner()` confirmed-email + PR #5 policies present | present (ledger `20261002052550`; definition matches) | `CREATE OR REPLACE` yields the identical body; policy guards are no-ops |
| `pilot_leads.owner_notified_at / owner_notification_error` (from `20261002045629`) | not covered by `object-check.md`; `20261002052550` does not add them | unverified; guarded `ADD COLUMN IF NOT EXISTS` handles both cases |
| 10 / 1 / 325 rows | `count-check.json`: 10 / 1 / 325 | matches the seeded dry-run shape |

Every shared version (21) between ledger and main is byte-identical except `20260915161655` — no second same-name conflict exists.

### 10.2 What the ledger reveals about the platform's apply policy

The ledger holds 35 rows against 110 names on main. Ninety-five older main names were never applied on staging (the pre-remix history plus `20260905074149`, `20260905094512/094600/094734`, `20260919*`, `20261002045629/050000/050331`), yet newer versions (`20260915161655` … `20261002052550`) were applied afterwards. The platform therefore did **not** replay older missing names when applying newer ones. The content of 14 of those older names reached staging through the alignment migration `20260904172759` ("Part 2: canonical production migrations, applied in order") and three through byte-identical renamed copies.

Consequence: `20261003120000_staging_reconciliation_forward_only.sql` is newer than every ledger row and is the single migration the platform would apply next. It was designed for precisely this state and is a no-op where staging already matches main. The policy itself is undocumented — `BLK-PLATFORM-APPLY-SEMANTICS` asks Lovable Cloud to confirm it before any apply, with a backup taken first.

### 10.3 New residual

Four staging-only ledger rows (`20260901040820`, `20260903053903`, `20260903145457`, `20260903171759`) have no exported SQL (MD5 + length only). They predate `20260904172759`, which dropped the staging-only pilot objects, so they are probably superseded — inferred, not verified (`BLK-STAGING-4-UNKNOWN-MIGRATIONS`). They do not affect the reconciliation migration's guards.

### 10.4 Blocker disposition

- `BLK-MIGRATION-LEDGER-UNVERIFIED` — **closed**: ledger obtained and reconciled line by line.
- `BLK-STAGING-7-TABLES-UNVERIFIED` — **closed**: 14/14 present with provenance.
- `BLK-PLATFORM-APPLY-SEMANTICS` — **open** (narrow): confirm "newer-than-last-row only" before applying to staging.
- `BLK-STAGING-4-UNKNOWN-MIGRATIONS` — **open** (informational).

### 10.5 Decision

- PR #9 remains **correct without any migration change**; this reassessment adds evidence and registry updates only.
- Recommendation: **MERGE PR #9** (founder decision; merge is a founder act).
- Staging deployment readiness: **READY, conditional** — apply `20261003120000` to staging only under explicit founder permission, after a staging backup, after Lovable confirms the apply policy, and with a post-apply read-only check that the three absent objects now exist and the 10 / 1 / 325 counts are unchanged. Production: not in scope.

## 11. Line-by-line review of PR #9 against the ledger (P0 data-integrity review, 2026-10-03)

Scope: every statement of `20261003120000_staging_reconciliation_forward_only.sql` (167 top-level statements, 123 of them `DO` guards) against the 35 ledger rows, all 110 migration files on the branch (109 on main + the new one; the assignment's "104" is not a count this repository produces), `table-check.csv` (14 tables), `object-check.md`, and the four ledger rows without exported SQL. Full matrix: `MIGRATION_DISPOSITION_MATRIX.md` / `.json` (one row per file).

Input 3 of the assignment ("Lovable migration-behavior report, latest") carried no addressable coordinate and was not found in Drive `AGENT-REPORTS` or `INBOX`; its only content available here is the assignment's own sentence (apply semantics UNKNOWN; project history contradicts documentation). It is graded *reported* and recorded as `BLK-LOVABLE-BEHAVIOR-REPORT-COORDINATE`. Nothing below depends on it beyond treating apply semantics as unknown, which this review already does.

### 11.1 The eight named migrations

| Version | Disposition | Verified basis |
|---|---|---|
| `20260915161655` | SAFE_NOOP (main file) / applied (ledger) | main file is `SELECT 1`; the ledger row holds staging's 49-statement version, and **every one of those 49 statements is normalised-identical to a statement in main's `20260919175712`** (strict subset). No divergent definition exists. |
| `20260919175712` | **UNSAFE_RERUN** | 14 unguarded `CREATE TABLE`; all 14 present on staging (`table-check.csv`). Plain replay fails at statement 1. PR #9 re-expresses all 142 statements guarded. |
| `20260919175907` | SAFE_RERUN | 3 × `INSERT … ON CONFLICT DO NOTHING`; `question_bank`, `question_auto_verifications`, `question_pool_exclusions`, `remediation_work_items` all referenced or created by ledger-applied SQL, so they exist on staging. Verbatim in PR #9. |
| `20260919195620` | SAFE_CREATE | `question_commercial_release`, policy, trigger, 2 indexes, view `production_release_pool` all ABSENT (`object-check.md`). Unguarded, so single-run only; PR #9 carries it guarded. |
| `20260919195651` | SAFE_RERUN | `ALTER VIEW … SET (security_invoker = on)` is idempotent; PR #9 applies it only when the view exists. |
| `20261002045629` | SAFE_CREATE / SAFE_RERUN | fully guarded; `founder_access_denials` ABSENT; `pilot_leads` columns unverified but `ADD COLUMN IF NOT EXISTS`. |
| `20261002050000` | **UNSAFE_RERUN** | unguarded `CREATE POLICY "Platform owner reads/updates pilot applications"`; both present on staging (`object-check.md`). Staging's `20261002052550` is a strict superset of this file (diff: confirmed-email owner check, `DROP POLICY IF EXISTS` before create, no other difference). Correctly **excluded** from PR #9; its policies appear there DO-guarded and its functions are not re-issued. |
| `20261002050331` | SAFE_RERUN | `CREATE OR REPLACE FUNCTION private.is_platform_owner()` with confirmed-email semantics equal to staging's (`trim` vs `coalesce`). In PR #9. |

### 11.2 What PR #9 already protects against

| Risk | Protection in PR #9 | Verified how |
|---|---|---|
| duplicate migration names | adds exactly one new name `20261003120000`, absent from the ledger (35 rows) and from main; touches no existing file (`existing-migrations.sha256`, 109 entries, asserted by test) | ledger.json ∩ branch names computed in this review |
| duplicated PR #5 behaviour | `20261002050000` not included; `is_platform_owner()` issued once via `CREATE OR REPLACE` (replaces, never duplicates); the two owner policies and the sample-workspace objects are only `DO … IF NOT EXISTS (pg_policies …)` | statement census: 0 unguarded `CREATE POLICY`, 0 unguarded `CREATE TRIGGER` |
| 14 existing tables | 16 × `CREATE TABLE IF NOT EXISTS`; definitions byte-equal to the applied staging statements for the 7 shared tables | §10.1 and the 49-statement subset check above |
| existing policies | 17 `pg_policies` guards; 0 unguarded `CREATE POLICY` | census |
| existing indexes | 14 × `CREATE [UNIQUE] INDEX IF NOT EXISTS`, 0 unguarded | census |
| existing triggers | 16 `pg_trigger` guards; the only `DROP TRIGGER IF EXISTS` are the two delete-blocking triggers main itself removes, each inside a `to_regclass` guard | census; dry-run removals list |
| missing dependencies | every `public.*` object the migration reads (32 names) is either created by it or referenced by a ledger-applied statement (exists on staging) | reference cross-check in this review |

### 11.3 Could merging PR #9 ever cause …

- **Replay risk.** Merging changes the repository only. The matrix shows 27 main-only files are UNSAFE_RERUN and 22 UNKNOWN on staging; **this is true of main today, with or without PR #9**, and PR #9 cannot remove it (published migrations are never rewritten). If the platform ever replays *all* ledger-absent versions in order, it fails at `20260823082320` (`CREATE TABLE organizations`) before reaching anything from PR #9. If it applies only versions newer than the last ledger row (`20261002052550`), the only candidate is `20261003120000`, which is safe. The ledger evidence (95 older names skipped while newer ones applied) supports the second behaviour; Lovable reports it as unknown. PR #9 neither increases nor reduces this risk.
- **Duplicate policies.** No: every `CREATE POLICY` is name-guarded; PostgreSQL also rejects a duplicate policy name on the same table, so the failure mode would be an error, not a duplicate.
- **Duplicate ownership checks.** No: one `CREATE OR REPLACE FUNCTION private.is_platform_owner()`; result is a single function with confirmed-email semantics on both shapes.
- **Migration failure.** Not from this file on the three proven shapes (bare, main, staging). Residual: objects created by the four ledger rows without SQL are unknown, but PR #9 never alters or drops an existing object, so an unexpected extra object cannot make it fail; an unexpected *missing* object is excluded by the dependency cross-check.
- **Partial application.** Every statement is idempotent, so an interrupted run followed by a re-run converges (second run proven identical in `dryrun-results.json`).

### 11.4 Result

**PASS.** No code change required. Recommendation: **MERGE NOW** (founder act; no deploy, no staging apply, no ledger write in this assignment). Staging apply stays READY-conditional on explicit permission, backup, confirmation of apply semantics (`BLK-PLATFORM-APPLY-SEMANTICS`), and read-only post-apply checks.

## 12. Merge record (founder merge decision executed 2026-10-03)

- PR #9 merged into `main` by the Claude Code seat under the founder's explicit "Execute the founder merge decision" assignment (merge method: merge commit; history untouched).
- Merge commit: `4b86de0fafe1372a7d9b180cca471e950d67e866` (parents `5bf25fb554067560ec3b7dd5aa09380f90f82888` and `41eef22f0dd3313e045b52a1199b8bce26ad21e0`). Diff vs base: 77 files, +8471/−76; `supabase/migrations/` gains exactly one file; the 109 pre-existing migrations unchanged (`existing-migrations.sha256`).
- Verified: `git pull origin main` → HEAD `4b86de0f…`, worktree clean (0 entries in `git status --short`).
- Milestone `RECONCILIATION-2026-10-03` recorded in `.ai/CURRENT_STATE.json`.
- Not done: no deployment, no publish, no migration run, no staging or production access. Staging execution remains a plan: `POST_MERGE_STAGING_EXECUTION_PLAN.md`.
