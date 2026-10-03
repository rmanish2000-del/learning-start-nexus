# EduOS staging reconciliation handoff (for Claude Code)
Read-only export. Nothing was changed, published or deployed.
- drift/: code-drift-71.txt (exact list), code-drift-full.diff, precheck report
- migrations/main-only (13), staging-only (8), conflict (main + staging-applied of 20260915161655), MIGRATION_MATRIX.md
- schema-evidence/schema-state.txt: live staging read-only inspection (row counts, columns, policies; no row contents)
- verification/PRIOR_VERIFICATION_REPORT.md
- STAGING_FINGERPRINT.txt
- RECONCILIATION_NOTES_NON_AUTHORITATIVE.md
- MANIFEST.json, SHA256SUMS.txt
PR #5 staging versions: migrations/staging-only/20261002052435_* and 20261002052550_*.
Earlier staging-only: 20260904172759_*, 20260905045134_*, 20260905084252_*, 20260905100552/100631/100711_*.
