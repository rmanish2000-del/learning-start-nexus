# EDUOS_STAGING_LEDGER_SCHEMA_EVIDENCE (v2) — PARTIAL
Read-only. Staging only. Re-verified 2026-10-03 ~13:40 UTC.

- Ledger: 35 rows. Columns: version, statements, name, created_by, idempotency_key, rollback (all NULL). No applied-timestamp or checksum column.
- Full SQL text: included for 31/35 rows under statements/, each confirmed byte-identical to the ledger by MD5 (20261002052550 then had the founder email redacted).
- 4 rows only as MD5 + length (too large to export exactly through the read tool): 20260901040820, 20260903053903, 20260903145457, 20260903171759.
- Target versions in ledger: 20260915161655, 20261002052550. NOT in ledger: 20260919175712, 20260919175907, 20260919195620, 20260919195651, 20261002045629, 20261002050000, 20261002050331.
- 14 tables expected from 20260919175712: all present, RLS on. That presence is NOT proof the migration was applied — the ledger shows it wasn't.
- Absent: question_commercial_release, production_release_pool, founder_access_denials. Present: private.is_platform_owner() (confirmed-email check) and PR #5 policies. See object-check.md.
- Counts: feedback_submissions 10, remediation_snapshots 1, remediation_actions 325.
Nothing changed, deployed, repaired or migrated.
