# EduOS — Class 10 (CBSE) 2026–27 Rebuild and 326-Item Draft Question-Bank Build Report

Status: **CLASS_10_REBUILD: PASS (DRAFT, REVIEW_PENDING)**
Academic year: **2026–27** | Board: **CBSE** | Class: **10**
Subjects: Mathematics (041/241), Science (086)
Deterministic build stamp: `2026-08-29T00:00:00.000Z`

---

## 1. What was done

1. A rollback snapshot of all Class 10 content was taken before any write.
2. The pilot-only Mathematics book was retired from the active 2026–27 scope.
3. 326 original draft items were authored, validated and loaded into the question bank.
4. The rebuilt structure was written to a single canonical curriculum map.

No learner data, evidence, mastery history or payment data was read, modified or exported.

## 2. Pre-rebuild snapshot (rollback point)

`audit-data/class10/rollback/class10-pre-rebuild-snapshot.json`
`audit-data/class10/rollback/MANIFEST.json`

| Table | Rows captured |
| --- | --- |
| books | 4 |
| curriculum_units | 15 |
| curriculum_chapters | 30 |
| curriculum_topics | 66 |
| curriculum_outcomes | 75 |
| assessment_outcomes | 83 |
| outcome_map | 75 |
| question_bank | 269 |

SHA-256 `baf41bb5512003bf12f0c68d03d5dd763bedfa82776a290d9bf9118e18fba410` (478,665 bytes).
Uploader/creator/verifier user ids and storage paths are redacted. The snapshot is a rollback artefact only — it is never read by the application.

## 3. Pilot content disposition

The pilot Mathematics book (`CBSE Class 10 Mathematics — Meridian Pilot`) and its
questions are no longer part of the active 2026–27 scope:

- book marked `archived` (`archived_at` set)
- its questions marked `retired`, so they can never be selected for a current diagnostic
- nothing deleted; the change is reversible and learner history is untouched

Full rationale: `EDUOS_CLASS_10_PILOT_UNIT_DISPOSITION.md`.

## 4. Rebuilt active structure

`EDUOS_CLASS_10_FINAL_CURRICULUM_MAP.json`

| Subject | Book | Units | Chapters | Official requirements | Unmapped |
| --- | --- | --- | --- | --- | --- |
| Mathematics | NCERT Class 10 Mathematics (CBSE) | 7 | 14 | 38 | 0 |
| Science | NCERT Class 10 Science (CBSE) | 5 | 13 | 46 | 0 |

All 84 verified official requirements resolve to a live unit and assessment outcome.

## 5. The 326 new items

| Metric | Mathematics | Science | Total |
| --- | --- | --- | --- |
| Items authored | 235 | 91 | **326** |
| Diagnostic pool | — | — | 125 |
| Reassessment pool | — | — | 201 |
| Distinct outcomes covered | — | — | 26 |

Formats: short answer 145, MCQ 63, assertion–reason 38, case study 36, true/false 25,
data interpretation 17, fill in the blank 2.
Difficulty: L1 27, L2 126, L3 137, L4 36.

Every item is original wording, authored against the syllabus requirement rather than
copied from any textbook, past paper or third-party bank. Every numeric answer is
computed in code, not typed in by hand.

### Validation (`EDUOS_CLASS_10_VALIDATION_RESULTS.json`)

| Check | Result |
| --- | --- |
| Items validated | 326 |
| Numeric claims independently recomputed | 192 |
| Errors | 0 |
| Duplicates / near-duplicates | 0 / 0 |
| Excluded-content leakage | 0 |
| Markup or source contamination | 0 |
| Diagnostic/reassessment pool separation breaches | 0 |
| Items requiring human numeric arbitration | 0 |

## 6. Database state after load

| Subject | Approved (existing) | New drafts | Verification state of new items |
| --- | --- | --- | --- |
| Mathematics | 60 | 235 | `unverified` |
| Science | 181 | 91 | `unverified` |

All 326 new rows carry a stable `external_ref` of the form
`C10-2627-<MATH|SCI>-REQ###-<DIAG|REASS>-###`, so re-running the load cannot
create duplicates and every item is traceable back to its official requirement.

**No new item is approved.** Draft items are not selectable by live diagnostics or
reassessments until a subject expert approves them.

## 7. Review queues

`EDUOS_CLASS_10_REVIEW_QUEUE.json` — every item sits in `REVIEW_PENDING`, grouped by
subject, unit and outcome for subject-expert sign-off.

The Science book remains `processed` (not approved). Machine gates now pass for it;
approval remains a human decision and is deliberately not automated here.

## 8. Verification run

- `bunx vitest run` — **256 tests passed / 19 files**
- TypeScript typecheck — clean
- Production build — clean

## 9. Standing status

| Item | Status |
| --- | --- |
| Class 10 structure 2026–27 | REBUILT, ACTIVE |
| Class 10 question depth | 326 new items authored, **DRAFT** |
| Class 10 compliance | **SOURCE_PENDING → machine gates PASS, expert review outstanding** |
| Class 9 | HOLD |
| Class 12 | NOT STARTED |
| Commercial readiness | Blocked pending subject-expert approval of the 326 drafts |
