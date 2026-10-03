# Migration matrix (main @ 5bf25fb5 vs staging project files / live staging schema)

| Main file | Staging file | Relation | Live staging state |
|---|---|---|---|
| 20260905094512_e751e25d | 20260905100552_b81b51d9 | Byte-identical, renamed | Applied (private.book_org_id exists) |
| 20260905094600_656c92f5 | 20260905100631_02e41e98 | Byte-identical, renamed | Applied (catalogue_public_subjects view absent) |
| 20260905094734_2e06710e | 20260905100711_04ffe976 | Byte-identical, renamed | Applied (grant) |
| 20260915161655_88fec6b0 (no-op `SELECT 1`) | same name, full remediation DDL | CONFLICT, same name different content | Staging applied the full version; remediation tables hold data |
| 20260919175712_8a16e7d2 | — | Main-only; creates 14 tables | All 14 tables ALREADY EXIST on staging, so a plain replay would fail |
| 20260919175907_a6cec947 | — | Main-only; data insert into question_pool_exclusions | Unknown whether equivalent rows exist |
| 20260919195620_b30e9647 | — | Main-only; creates question_commercial_release | NOT present on staging |
| 20260919195651_fdde1774 | — | Main-only; view security_invoker | see schema-state.txt (production_release_pool) |
| 20261002045357 / 045439 / 050123 | — | Main-only no-op placeholders for drafts | Nothing to apply |
| 20261002045629_be60915e | — | Main-only; founder_access_denials | NOT present on staging |
| 20261002050000_centre_admin_first_login | 20261002052550_298225aa (PR #5 hardened) | Same purpose, different files | PR #5 tables present on staging |
| 20261002050331_7ac11e74 | (inside 20261002052550) | is_platform_owner confirmed-email | Staging version applied |
| — | 20261002052435_b60cb0a3 | Staging-only no-op (`SELECT 1`) | Nothing |
| — | 20260904172759_ab478d85 | Staging-only "align to production 84311d07": drops staging-only tables | pilot_journey absent (applied) |
| — | 20260905045134_835adc31 | Staging-only; tutor_evidence_by_gap redefinition | Applied (assumed; function present via earlier main files too) |
| — | 20260905084252_0db76c42 | Staging-only; creates feedback_submissions | Table exists with 10 rows; main creates it in 20260905074149 (shared name, both sides) |

Live applied-migration history could not be read (no permission), so "Applied" is inferred from objects in the schema, not from the migration log.
