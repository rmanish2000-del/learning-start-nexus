# Post-merge staging execution plan — `20261003120000_staging_reconciliation_forward_only.sql`

Status: **PLAN ONLY.** Written 2026-10-03 after PR #9 merged into `main` at
`4b86de0fafe1372a7d9b180cca471e950d67e866`. Nothing in this plan has been executed.
Staging and production were not accessed, nothing was deployed, no migration was run.

## 0. Preconditions (all must hold before step 1)

| # | Precondition | Owner | Evidence required |
|---|---|---|---|
| P1 | Founder grants `deployment.permission: "explicit"` for **staging only**, naming this migration, in a Drive INBOX assignment (GV-004) | founder | assignment file_id |
| P2 | `BLK-PLATFORM-APPLY-SEMANTICS` answered: Lovable Cloud confirms it applies **only** versions newer than the last ledger row `20261002052550`, i.e. exactly `20261003120000`, and never replays the 89 ledger-absent older names (27 are UNSAFE_RERUN — see `MIGRATION_DISPOSITION_MATRIX.md`) | lovable | written confirmation registered in `.ai/ARTIFACT_REGISTRY.json` |
| P3 | Staging backup / point-in-time restore point taken and its identifier recorded | lovable | backup id + timestamp |
| P4 | Pre-apply read-only snapshot: run `scripts/db/reconciliation-dryrun/objects.sql` and `count-check` (`feedback_submissions`, `remediation_snapshots`, `remediation_actions` = 10 / 1 / 325 expected) | lovable | output file in Drive AGENT-REPORTS |
| P5 | Confirm the staging project is connected to `main` at `4b86de0f…` or later (the migration file must be present in the synced tree) | lovable | synced SHA |

If any precondition fails: **stop**, register the blocker, return to M365 Copilot. Do not apply.

## 1. Apply (single migration, single run)

1. Apply **only** `supabase/migrations/20261003120000_staging_reconciliation_forward_only.sql` to staging through the platform's migration runner. Do not mark any other version as applied. Do not run any `20260919*` or `20261002*` main-only file.
2. Expected outcome (from the staging-shaped dry-run, `dryrun-results.json`): ~30 objects added — `question_commercial_release`, `founder_access_denials`, the 7 remaining remediation/automation tables' missing policies/triggers/indexes where absent, views `production_release_pool` (+ `security_invoker=on`), `pilot_leads.owner_notified_at / owner_notification_error`; `is_platform_owner()` replaced with the confirmed-email body; exclusions/work-item rows inserted at most once. **No row deleted or modified**; only removals are the two delete-blocking triggers main itself drops.
3. If the runner reports an error: do not retry blindly. Capture the failing statement, leave the database as is (every statement is idempotent, so a partial run is safe to resume after diagnosis), register a blocker, return to M365 Copilot.

## 2. Post-apply read-only verification (same session, before anything else)

| Check | Expected |
|---|---|
| ledger `supabase_migrations.schema_migrations` | 36 rows; new row `20261003120000`; no other row added or changed |
| `objects.sql` | matches `dryrun-results.json` staging scenario "after" object list |
| counts | `feedback_submissions` 10, `remediation_snapshots` 1, `remediation_actions` 325 (unchanged) |
| `question_pool_exclusions` / `remediation_work_items` | rows from `20260919175907` present exactly once (`ON CONFLICT` keys) |
| `private.is_platform_owner()` | confirmed-email body (`auth.users`, `email_confirmed_at IS NOT NULL`) |
| `pg_policies` on `pilot_leads` | the two "Platform owner …" policies exist exactly once each |
| `production_release_pool` | exists, `security_invoker = on` |
| idempotency (optional) | re-run the same file once: zero object changes, counts unchanged |

Record the outputs in Drive AGENT-REPORTS and register them (ART-00xx). Update `.ai/CURRENT_STATE.json` → `database.staging_ledger` and `verification/staging-migration-reconciliation/VERIFICATION_REPORT.md` §12 with the applied evidence (grade `verified` only from these outputs).

## 3. Rollback procedure

- **Before apply:** nothing to roll back; the merge changed the repository only. To withdraw the change from `main`, open a revert PR of merge commit `4b86de0f…` (`git revert -m 1 4b86de0f`) — never rewrite history.
- **After apply, migration succeeded but unwanted:** restore the P3 backup (platform-owner act, founder permission), then open the revert PR above so the file does not re-apply. Alternatively leave the schema (it is a superset; nothing was removed except two triggers main also removes) and only revert the ledger row with the platform owner's tooling.
- **After apply, migration failed mid-way:** no restore needed for data (no data-destructive statements exist); diagnose the failing statement, fix forward with a *new* migration name, never edit `20261003120000` once it is in any ledger.

## 4. Out of scope (unchanged)

Production: NOT READY (`BLK-PRODUCTION-SHA` open). No production action may follow from this plan without a separate founder assignment.
