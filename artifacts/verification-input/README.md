# EduOS Class 10 verification input package

Read-only export of the Engine v1.0.0 cohort, regenerated directly from the
EduOS production database. Every query is SELECT-only. No application code,
migration, configuration, question record, verification state, pool eligibility
or production row was modified, and nothing was deployed.

- Export timestamp (UTC): 2026-09-09T16:29:07.059196+00:00
- Board / class / session: CBSE, Class 10, 2026-27
- Subjects: Mathematics and Science
- Cohort: every `question_bank` row that has a `question_auto_verifications`
  record (Engine v1.0.0)

## Current record counts (actual, not forced)

| Metric | Historical | Current |
| --- | --- | --- |
| Total records in cohort | 329 | 329 |
| Automated approvals | 123 | 123 |
| Held (quarantined) | 206 | 206 |
| Legacy structurally verified (Class 10 Maths + Science) | 210 | 210 |
| Legacy structurally verified (all subjects, database-wide) | — | 213 |
| Held rows still carrying `status = approved` | 150 | 150 |
| Science records missing `external_ref` | 3 | 3 |

The only variance is the legacy figure: a database-wide query returns 213
because three further legacy verified rows belong to a "General Knowledge" book
outside the Class 10 Mathematics/Science cohort. Scoped to the cohort the
figure is 210. Both are reported with their definitions in
`EDUOS_EXPORT_COUNT_RECONCILIATION.json`; nothing was forced.

## Production query definitions

```sql
-- cohort
select count(*) from question_auto_verifications av
  join question_bank q on q.id = av.question_id;
-- automated approvals / held
select outcome, count(*) from question_auto_verifications group by 1;
-- legacy structural verification (scoped by books.subject)
select b.subject, count(*) from question_bank q join books b on b.id = q.book_id
 where q.verification_state = 'verified'
   and coalesce(q.verification_tier,'') <> 'eduos_automated' group by 1;
-- held rows still approved
select count(*) from question_auto_verifications av
  join question_bank q on q.id = av.question_id
 where av.outcome = 'quarantined' and q.status = 'approved';
-- rows missing external_ref
select count(*) from question_auto_verifications av
  join question_bank q on q.id = av.question_id where q.external_ref is null;
```

The full item-export query is reproduced in `EXPORT_MANIFEST.json`.

## Files

| File | Contents | Records |
| --- | --- | --- |
| `EDUOS_RAW_329_ITEM_EXPORT.json` | full item records with content, mapping, status and engine evidence | 329 |
| `EDUOS_ENGINE_V1_SPEC.json` | Engine v1.0.0 checks, thresholds, approval logic, schemas | 9 checks |
| `EDUOS_OFFICIAL_SOURCE_REGISTER.json` | frozen source registry, source verification, missing sources, sha256 manifest | 4 sections |
| `EDUOS_CURRICULUM_CROSSWALK.json` | requirement / outcome / unit / book / source mapping plus frozen repository crosswalk | 27 |
| `EDUOS_POOL_METADATA.json` | intended pool, active status, assessment usage, free/paid eligibility | 329 |
| `EDUOS_VERIFICATION_EVIDENCE.json` | engine run, per-item evidence, named-SME decisions, legacy structural batch | 329 + 3 + 210 |
| `EDUOS_EXISTING_QUALITY_REPORTS.json` | check tallies, duplicate / contamination / pool-separation / ambiguity findings | 16 |
| `EDUOS_EXPORT_COUNT_RECONCILIATION.json` | expected vs actual counts, query definitions, regeneration record | 6 metrics |
| `EXPORT_MANIFEST.json` | file list, record counts, null-field documentation, sha256 | — |
| `SHA256SUMS.txt` | sha256 of every other file in the package | — |

## Null and unavailable fields (documented, never invented)

- `requirement_id` — no such column exists; parsed from the `external_ref`
  token `REQnnn` in the crosswalk, `null` in the item export.
- `intended_pool` — no such column exists; derived from the `external_ref`
  tokens `-DIAG-` / `-REASS-`, `UNKNOWN` where absent.
- `external_ref` — null for exactly 3 Science items.
- Item version — no version column on `question_bank`; `created_at` /
  `updated_at` are supplied instead.
- Official CBSE / NCERT checksums — only the two subject syllabus PDFs are
  checksummed; every other source record remains `PENDING_CONFIRMATION`.
- Reviewer, learner and account identifiers are deliberately excluded.

## Data-provenance limitations

- Pool intent and requirement identifiers are reconstructed from reference
  codes, not from authoritative columns.
- Named-SME evidence is limited to 3 recorded decisions; the held corpus has
  not been signed off by named subject-matter experts.
- The legacy 210-item structural batch predates Engine v1.0.0 and carries no
  automated evidence.
- Official source confirmation for the 2026-27 session remains pending.

## Downstream use

Intended for Claude Code to perform paid-pool verification analysis. The
package is evidence only. It must NOT be imported directly into the production
database; any remediation output must re-enter through the normal reviewed
verification workflow.


---

## Artifact delivery (repository copy)

This directory is the canonical delivery location for the package described
above. The copy of this README inside the ZIP is identical except for this
final section.

- Path: `artifacts/verification-input/EDUOS_GEMINI_INPUT_PACKAGE.zip`
- Size: **153382 bytes**
- SHA-256: **`4029077de1acbdd59dc07f04a8d4d71b72b7881cb3a9d9e76e0a669a20636fe5`**
- Entries: 11 files (8 data JSON, `EXPORT_MANIFEST.json`, `README.md`, `SHA256SUMS.txt`)

### Per-file checksums (inside the ZIP)

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `EDUOS_RAW_329_ITEM_EXPORT.json` | 1357717 | `518150d148854991f9719a6cf9cc872a1fac22aac0ddfb14d389d86344a4ffcb` |
| `EDUOS_ENGINE_V1_SPEC.json` | 5400 | `31d6ed50e643cea4611d5e012148902c51b8a703ed5b53f7b84dc2117801bc66` |
| `EDUOS_OFFICIAL_SOURCE_REGISTER.json` | 69608 | `617bb61c956134a42fb757c3b1ba3553f0fb4d5263cbb383c6a57fcd68f83437` |
| `EDUOS_CURRICULUM_CROSSWALK.json` | 51158 | `52cd874db1c13ec7f5444e6dd3e68033ebf29738728ae21618569eb4087ea0ba` |
| `EDUOS_POOL_METADATA.json` | 159809 | `6d137a582db450f9e8509608d07303118b85da0662e596d9878130c0d83fd14f` |
| `EDUOS_VERIFICATION_EVIDENCE.json` | 907218 | `bcfab510f5a8e4fbc29775fb3c01d88a1b0d52e30d918cf588a6f97361fbc7ba` |
| `EDUOS_EXISTING_QUALITY_REPORTS.json` | 6808 | `3798e3dcd1e472f030f84f37638e4dc4d058896c1e7f3bfa63b4b6f90550bd94` |
| `EDUOS_EXPORT_COUNT_RECONCILIATION.json` | 6675 | `7b4c1f5937ffd19a5d3b24e552b500c5adb09322ca55813989825f49813a6c6c` |
| `README.md` | 4978 | `efecaab44497082916f671bb8791a13688e7c5bb507ea5ce8bbaa2edded83a3e` |
| `SHA256SUMS.txt` | 949 | `aa1d419cf15052c94acefdd1433b55f72672c490c7d295cc26bb3990ad86e929` |

### Validation performed on these exact bytes

- ZIP CRC test passed (`unzip -t`), no truncation.
- Extracted files are byte-identical to the generated sources (`diff -r`).
- Internal `SHA256SUMS.txt` verifies against every extracted file.
- All 10 JSON documents parse; 329 records, 329 unique database ids.
- Export id set equals the live production id set exactly (0 missing, 0 extra).
- Secret / personal-data scan: no tokens, keys, credentials, emails, phone
  numbers, learner, reviewer, account or payment data.

### Read-only confirmation

Regeneration used SELECT statements only. No production row, verification
state, pool eligibility, migration, configuration or application file was
changed, and no deployment to production or staging occurred.

### Rollback

Revert the commit that adds `artifacts/verification-input/`. Nothing else in
the application depends on these files.
