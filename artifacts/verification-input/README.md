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
