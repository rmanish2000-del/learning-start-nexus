# EduOS — Class 10 Pilot Unit Disposition (2026–27 Rebuild)

Decision date: 2026-08-29
Scope: CBSE Class 10 Mathematics and Science, academic year 2026–27

## 1. What counted as pilot content

| Artefact | Origin | Why it is not 2026–27 content |
| --- | --- | --- |
| Book: `CBSE Class 10 Mathematics — Meridian Pilot` | Meridian centre pilot upload | Centre-specific pilot upload, never mapped to the verified official 2026–27 requirement set |
| Unit: `Unit 1 — Number Systems` | that book | `suggested` status, superseded by the NCERT Mathematics unit of the same scope |
| Unit: `Unit 2 — Algebra` | that book | `suggested` status, superseded by the NCERT Mathematics unit of the same scope |

Earlier reviews described "Trigonometric Identities" and "Mensuration" as pilot units.
That reading was wrong and has been corrected: both are genuine CBSE 2026–27
Mathematics units inside the approved NCERT book and remain **active**.

## 2. Disposition applied

- The pilot book is `archived` with `archived_at` set, so it no longer appears in
  curriculum selectors, upload lists or diagnostic sources.
- Its questions are `retired`, so the selection logic cannot draw them into a
  current-session diagnostic or reassessment.
- Nothing is deleted. Rows, prior learner answers, evidence and mastery history are
  preserved exactly as they were.
- The action is a two-statement reversal (`status` back to `processed`, questions back
  to `draft`) if the founder ever wants the pilot data live again.

## 3. Content out of Class 10 scope entirely

| Artefact | Disposition |
| --- | --- |
| `Knowledge Bank for Children` (Grade 3, General Knowledge) | Already archived in an earlier cleanup; untouched by this rebuild |
| `NCERT Science — Class 10, Chapter 1: Chemical Reactions and Equations` (standalone) | Already archived; superseded by the full NCERT Science book |

## 4. Active 2026–27 structure after disposition

| Subject | Book | Units | Chapters |
| --- | --- | --- | --- |
| Mathematics | NCERT Class 10 Mathematics (CBSE) — `approved` | 7 | 14 |
| Science | NCERT Class 10 Science (CBSE) — `processed`, expert approval outstanding | 5 | 13 |

Canonical machine-readable form: `EDUOS_CLASS_10_FINAL_CURRICULUM_MAP.json`.

## 5. Guarantees

- No 2026–27 diagnostic can serve pilot-derived items.
- No official 2026–27 requirement lost its mapping as a result of this disposition
  (Mathematics 38/38, Science 46/46 still mapped).
- The pre-rebuild snapshot in `audit-data/class10/rollback/` restores the previous
  state in full if required.
