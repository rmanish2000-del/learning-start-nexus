# PR #9 safety review and founder checklists

Written 2026-10-03 by the Claude Code seat. **Status note:** the assignment that requested this
review calls it "pre-merge", but PR #9 was already merged into `main` at
`4b86de0fafe1372a7d9b180cca471e950d67e866` under the founder's earlier "execute the founder merge
decision" assignment (see `VERIFICATION_REPORT.md` §12). The review below therefore applies to the
merged diff, which is byte-identical to the PR head `41eef22f0dd3313e045b52a1199b8bce26ad21e0`.
No code, migration, staging or production state was touched by this review.

## 1. Every file changed by PR #9 (77 files) and what each can do to a database

| Area | Files | Executes against a database? | Review result |
|---|---|---|---|
| `supabase/migrations/20261003120000_staging_reconciliation_forward_only.sql` | 1 | **Yes** — the only file the platform can run | reviewed statement by statement (§2) |
| `scripts/db/generate-reconciliation-migration.py` | 1 | No (developer tool; output is the file above, regenerated deterministically) | no runtime effect |
| `scripts/db/reconciliation-dryrun/{run.ts, shim.sql, seed-staging.sql, staging-owner.sql, snapshot.sql, objects.sql}` | 6 | Only against a **disposable local** PostgreSQL reached via `PGHOST:PGPORT`; `objects.sql`/`snapshot.sql` are read-only catalog queries | no path to staging or production credentials |
| `src/lib/__tests__/staging-migration-reconciliation.test.ts` | 1 | No (asserts the 109 pre-existing migrations unchanged, the guard census, and runs the dry-run only when a local PG is reachable) | protective |
| `verification/staging-migration-reconciliation/**` | 63 | No (evidence, ledger copies, matrix, reports) | documentation |
| `.ai/*.json` (4), `CURRENT_ASSIGNMENT.md` | 5 | No | governance state |

No file in the PR touches application code, `package.json`, `bun.lock`, auth, routes or any of the
109 pre-existing migrations (`existing-migrations.sha256`, test-asserted).

## 2. The migration against each guarantee

| Guarantee | Mechanism in the file | Verified count / evidence |
|---|---|---|
| Replay safety (running the file 2+ times) | every statement idempotent: `IF NOT EXISTS`, `OR REPLACE`, `DO … IF NOT EXISTS (pg_policies / pg_trigger)`, `to_regclass` guards, `ON CONFLICT DO NOTHING` | second run identical on bare / main / staging shapes (`dryrun-results.json`) |
| Duplicate policy protection | 17 `pg_policies` guards; **0** unguarded `CREATE POLICY` | census in `VERIFICATION_REPORT.md` §11.2; PostgreSQL also rejects a duplicate policy name, so the failure mode would be an error, never a silent duplicate |
| Duplicate trigger protection | 16 `pg_trigger` guards; **0** unguarded `CREATE TRIGGER`; the only two `DROP TRIGGER IF EXISTS` are main's own removals, inside `to_regclass` guards | census |
| Duplicate function protection | 6 × `CREATE OR REPLACE FUNCTION`; signatures (args, return type) identical to the definitions already on staging for all 6 (`remediation_append_only`, `auto_verifications_immutable`, `automated_provisional_outcomes_append_only`, `automated_review_rollback_events_append_only`, `content_resolution_append_only` → `trigger`; `private.is_platform_owner` → `boolean`), so `OR REPLACE` cannot fail on a signature mismatch and can never create a second overload | signature parity check 2026-10-03 (this review) |
| Duplicate index protection | 14 × `CREATE [UNIQUE] INDEX IF NOT EXISTS`; **0** unguarded | census |
| View replacement safety | 3 × `CREATE OR REPLACE VIEW`; the two views that already exist on staging have **byte-identical bodies** (so no column-list change, which is the only way `OR REPLACE VIEW` fails); `production_release_pool` is new | body parity check 2026-10-03 (this review) |
| Duplicate migration-name scenarios | (a) new name `20261003120000` is absent from the 35-row ledger and from main; (b) the one existing same-name conflict `20260915161655` is left untouched on both sides and its staging content is a strict subset of main's `20260919175712`; (c) no staging-only name imported; (d) if the platform ever re-applied the name, the file is idempotent | ledger ∩ names computed in §11; matrix |
| Data preservation | no `DROP TABLE / TRUNCATE / DELETE / DROP COLUMN / UPDATE`; inserts `ON CONFLICT DO NOTHING` | rows byte-identical in all dry-runs (10 / 1 / 325) |
| Dependency completeness | all 32 `public.*` objects read by the file are created by it or evidenced on staging by applied SQL | cross-check §11.2 |

Residual risks (unchanged, outside the repository): platform apply semantics undocumented
(`BLK-PLATFORM-APPLY-SEMANTICS`); four ledger rows without SQL (`BLK-STAGING-4-UNKNOWN-MIGRATIONS`);
no staging backup confirmed yet; `pilot_leads.owner_notified_at / owner_notification_error`
presence unverified (guarded `ADD COLUMN IF NOT EXISTS`).

## 3. Repository-side change required?

**No. PR #9 is repository-complete.** Nothing in the migration, tooling, tests or evidence needs
to change for a safe staging apply. Every remaining item is a platform-owner or founder act.

## 4. Founder MERGE CHECKLIST (record — the merge is done)

- [x] Base `main` = `5bf25fb5…`; head `41eef22f…`; `mergeable_state` clean; no CI checks configured, local gates green (ai:check, tests, tsc, build on the earlier head).
- [x] Exactly one new migration file; 109 existing migrations byte-preserved (test-asserted).
- [x] 0 unguarded CREATE TABLE / INDEX / POLICY / TRIGGER; functions `OR REPLACE` with identical signatures; views `OR REPLACE` with identical bodies.
- [x] No data-destructive statement; inserts `ON CONFLICT DO NOTHING`.
- [x] Three disposable dry-runs: bare, main-shaped (no-op), staging-shaped (rows byte-identical, idempotent).
- [x] Ledger reassessment (§10) and line-by-line review (§11) both PASS; disposition matrix published.
- [x] Merge method: merge commit; history untouched. Merge commit `4b86de0fafe1372a7d9b180cca471e950d67e866`.
- [x] Post-merge state recorded (`41db83fe9a7d5ed31f22448b83195a72076f896a`): milestone `RECONCILIATION-2026-10-03`, task history, next task ASG-2026-10-03-007.
- [ ] *(Founder, separate decision)* Grant or withhold explicit **staging apply** permission — this is not implied by the merge.

## 5. STAGING EXECUTION CHECKLIST (Lovable seat; founder gate first; nothing executed yet)

Gate (founder):
- [ ] G1 Explicit staging apply permission in a Drive INBOX assignment, naming `20261003120000` only (`deployment.permission: "explicit"`, environment `staging`).

Preconditions (Lovable, all evidence to Drive AGENT-REPORTS + `.ai/ARTIFACT_REGISTRY.json`):
- [ ] E1 Written confirmation of apply semantics: the platform executes **only** versions newer than ledger row `20261002052550` and will **not** replay any of the 89 ledger-absent older names (27 are UNSAFE_RERUN — `MIGRATION_DISPOSITION_MATRIX.md`). If it would replay them: **STOP**.
- [ ] E2 Staging backup / restore-point taken; identifier and timestamp recorded.
- [ ] E3 Pre-apply read-only snapshot: `scripts/db/reconciliation-dryrun/objects.sql` output + counts `feedback_submissions`=10, `remediation_snapshots`=1, `remediation_actions`=325; ledger row count = 35.
- [ ] E4 Staging project synced to `main` at or after `4b86de0f…` (file present in the synced tree).
- [ ] E5 Optional: export the four SQL-less ledger rows (`BLK-STAGING-4-UNKNOWN-MIGRATIONS`).

Apply (Lovable):
- [ ] A1 Apply `20261003120000_staging_reconciliation_forward_only.sql` **once**, alone. Do not mark any other version applied; do not run any `20260919*` / `20261002*` main-only file.
- [ ] A2 On any error: stop, capture the failing statement, do not retry blindly (the file is resumable), register a blocker, return to M365 Copilot.

Post-apply read-only verification (Lovable, same session):
- [ ] V1 Ledger = 36 rows; only `20261003120000` added.
- [ ] V2 `objects.sql` output matches the staging scenario "after" list in `dryrun-results.json` (≈30 objects added; only removals = the two delete-blocking triggers main also drops).
- [ ] V3 Counts unchanged: 10 / 1 / 325.
- [ ] V4 `question_pool_exclusions` / `remediation_work_items` rows from `20260919175907` present exactly once.
- [ ] V5 `private.is_platform_owner()` body = confirmed-email check; `pg_policies` on `pilot_leads` shows each "Platform owner …" policy exactly once.
- [ ] V6 `production_release_pool` exists with `security_invoker = on`; `question_commercial_release`, `founder_access_denials` exist with RLS on.
- [ ] V7 Optional idempotency proof: re-run the same file once → zero object changes, counts unchanged.
- [ ] V8 Evidence filed; `.ai/CURRENT_STATE.json` → `database.staging_ledger` and `VERIFICATION_REPORT.md` updated by the Claude Code seat (grade `verified` only from V1–V7 outputs).

## 6. STAGING ROLLBACK CHECKLIST

Before apply (repository only):
- [ ] R1 Nothing to roll back on any database.
- [ ] R2 To withdraw the change from `main`: open a revert PR of the merge commit (`git revert -m 1 4b86de0fafe1372a7d9b180cca471e950d67e866`); founder merges. **Never** force-push, rebase, amend or delete published history.

After a successful apply that must be undone:
- [ ] R3 Founder permission for restore (irreversible decision).
- [ ] R4 Platform owner restores the E2 backup / restore point; verify counts 10 / 1 / 325 and ledger = 35 rows afterwards.
- [ ] R5 Open the R2 revert PR so the file cannot re-apply on the next sync.
- [ ] R6 Alternative (preferred when nothing is broken): keep the schema — it is a strict superset of the previous staging schema except for the two triggers main also removes — and revert only the ledger row with platform tooling, if the row must go.

After a failed (partial) apply:
- [ ] R7 No data restore needed: the file contains no data-destructive statement, and every executed statement is idempotent, so the database is in a valid intermediate state.
- [ ] R8 Diagnose the failing statement; fix forward with a **new** migration name; never edit `20261003120000` once it appears in any ledger.
- [ ] R9 Record the failure and the fix-forward plan in `.ai/BLOCKER_REGISTRY.json` and Drive AGENT-REPORTS.

## 7. Final recommendation

PR #9 is repository-complete; no further code change. Merge is done. Staging apply: proceed only
through the §5 gate and preconditions; production: NOT READY (`BLK-PRODUCTION-SHA` open).
