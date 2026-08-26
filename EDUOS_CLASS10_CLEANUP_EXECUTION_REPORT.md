# EduOS Class 10 Launch Cleanup — Execution Report

Date: 2026-08-27 (UTC)
Scope: execute the approved actions in `EDUOS_CLASS10_CLEANUP_PLAN.md`.
Goal: a clean baseline for **CBSE Class 10 Mathematics** and **CBSE Class 10 Science**.
No new content was imported.

---

## 1. Rollback foundation (built first)

A private `archive` schema was created and revoked from the Data API, so it is
invisible to the app and to every client role.

| Object | Purpose |
| --- | --- |
| `archive.cleanup_runs` | One row per cleanup run (label, started/finished, counts) |
| `archive.deleted_rows` | Full JSON snapshot of every deleted row, with table name |
| `archive.flag_changes` | Before/after values for every flag change (`is_demo`, `archived_at`, `status`) |
| `archive.rollback_cleanup(p_label)` | `SECURITY DEFINER` routine that restores all deleted rows and reverts all flag changes for a run, in one transaction |

Run label: `class10_baseline_2026_08`.

**How to roll back:** run `select archive.rollback_cleanup('class10_baseline_2026_08');`
through a migration. It re-inserts deleted rows and reverts flags; it is
idempotent and reports the number of rows restored.

## 2. Schema additions

- `public.books.status` constraint extended with `'archived'`.
- `is_demo boolean not null default false` and `archived_at timestamptz` added to
  `books`, `assessments`, `learners`.

## 3. Archived (kept, not deleted)

| Item | Count | Action |
| --- | --- | --- |
| Book "Knowledge Bank for Children" (Grade 3 GK pilot) | 1 | `status = 'archived'`, `is_demo = true` |
| Fractions pilot assessments (Grade 6) | 7 | `archived_at` set, `is_demo = true` |
| Demo learners (Grades 4–8) | 14 | `is_demo = true` |
| Assessments belonging to the archived pack | all | `is_demo = true` |

Curriculum trees, blueprint outcomes, question bank rows, sessions, gaps and
outcome evidence for archived content were **left intact** so every audit centre
keeps its evidence chain.

## 4. Deleted (snapshotted first)

| Item | Rows |
| --- | --- |
| Probe / temporary assessments (`zz builder probe temp`, etc.) | 4 |
| "Audit probe" learning gap + dependent interventions and recommendations | 3 |
| Duplicate `question_bank` rows (earliest `created_at` kept) | 5 |
| Orphaned map / dependent rows removed with the above | 18 |
| **Total rows snapshotted to `archive.deleted_rows`** | **30** |
| Flag changes snapshotted to `archive.flag_changes` | 26 |

`assessment_question_map.sort_order` was re-sequenced to a dense 1..N per
affected assessment.

## 5. Application changes

- `fetchBuilderBooks` (`src/lib/builder.server.ts`) and `fetchGapBooks`
  (`src/lib/gap.server.ts`) now exclude `status = 'archived'` books, so archived
  demo packs cannot be selected in commercial surfaces.
- `BOOK_STATUS_LABELS` gained `archived: "Archived (demo)"` so the Curriculum
  library still shows the pack with an honest label.
- Audit centres are unaffected: they resolve fixtures by explicit ID.

## 6. Audit-integrity fixes found during verification

Two audit probes were failing for reasons unrelated to the cleanup, and both are
now fixed so the verification centres stay trustworthy:

- **Gap analysis audit** compared caller-visible counts against *hardcoded*
  expected numbers and a stale organization name, so it drifted every time new
  content was generated. It now derives the expectation live from the
  service-role count of the caller's own organization: a probe passes only when
  the caller sees exactly their own org's rows and nothing more.
- **Assessment builder audit** counted `assessment_question_map` using a
  non-existent `id` column, which surfaced as a false "denied (RLS)" failure.

## 7. Verified baseline

| Check | Result |
| --- | --- |
| Active (non-archived) books | 1 — CBSE Class 10 Science, Chapter 1 |
| Active assessments | 1 |
| Class 10 questions in bank | 44 |
| Orphaned curriculum / map rows | 0 |
| Curriculum audit | 9 probes pass, 0 fail |
| Gap analysis audit | 7 probes pass, 0 fail |
| Assessment builder audit | 3 probes pass, 0 fail |
| Question bank / blueprint / diagnostic engine audits | pass, 0 fail |

Baseline is clean and ready for Class 10 Mathematics and Science content import.
