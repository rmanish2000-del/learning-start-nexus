# EduOS Class 10 Controlled Import — Execution Report

Status: **COMPLETE — both packs imported and validated**

## Preparation (schema)

- `question_bank.source` check constraint extended to allow `import`.
- `question_bank.external_ref` column added with a unique index → import is idempotent (re-running the script cannot duplicate atoms).
- No production rows altered outside the new import.

## Stage 1 — Mathematics import

Book: **NCERT Mathematics — Class 10** (`1ab1e104-8ecb-465e-a5f0-d9bd94641623`)

| Entity | Count |
|---|---|
| Units | 7 |
| Chapters | 14 |
| Assessment outcomes | 15 |
| Question-bank atoms | 45 |
| Dependency edges (concept graph) | 7 |

## Stage 2 — Mathematics validation

- Diagnostic weight totals = 100% for every chapter (largest-remainder allocation).
- Every outcome resolves to a chapter → unit → book; no orphans.
- Every atom has `kind`, `correct_answer`, `explanation`, `difficulty`.
- Dependency graph acyclic; all parent/child IDs resolve.

## Stage 3 — Science import

Book: **NCERT Science — Class 10** (`9a9ee914-468e-4ef2-9269-eab8c9ba85a8`)

| Entity | Count |
|---|---|
| Units | 5 |
| Chapters | 13 |
| Assessment outcomes | 55 |
| Question-bank atoms | 165 |
| Dependency edges | 9 |

## Stage 4 — Science validation

Same four checks as Stage 2 — all pass. Weight totals = 100% per chapter.

## Audit centers re-verified after import

| Audit center | Result |
|---|---|
| Curriculum Audit | 7/7 probes PASS, 0 FAIL |
| Gap Analysis Audit | 7/7 probes PASS, 0 FAIL |
| Assessment Builder Audit | 3/3 probes PASS, 0 FAIL |

Cross-organization isolation and RLS write-denial probes continue to pass with the new content in place.

## Notes

- Both books are org-scoped to Brightpath Learning and appear in `/curriculum`, `/builder`, and gap-analysis book pickers.
- Archived Grade 3 fixtures remain archived; legacy pinned audit fixtures untouched, so historical evidence pages still reproduce.
- Rollback: `archive.rollback_cleanup()` still available for the earlier cleanup; the two imported books can be removed by book ID if ever needed.
