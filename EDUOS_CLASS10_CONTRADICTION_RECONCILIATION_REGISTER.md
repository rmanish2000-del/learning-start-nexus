# Contradiction Reconciliation Register — Cowork Class 10 Certification Review Package

Input: `20260902_141808Z_COWORK_CLASS10CERTIFICATIONREVIEWPACKAGE.md` (C-01 … C-12).
Reconciled at canonical HEAD `8b58bd61449c04236caed1f9a230eec72fbbbcaf` against the current
repository and live database on 2026-09-02T17:40Z. Superseded evidence commit
`916614a399b8a2786cf26a93827d077120dd3bad` was **not** relied upon.

Classification key: **VALID** = still true now · **RESOLVED** = current evidence answers it ·
**STALE** = true only of the superseded export · **UNSUPPORTED** = not reproducible.

| ID | Claude's contradiction | Classification | Current evidence |
| --- | --- | --- | --- |
| C-01 | Evidence pinned to `916614a3…`, not canonical HEAD | **STALE** | All figures in the corrected package are recomputed at `8b58bd61…` from the repository and live database. The stale export is discarded, so the identity defect no longer attaches to any figure presented. |
| C-02 | Mathematics verdict split 24/2/12 vs recomputed 27/2/9 | **STALE** | Neither split exists in current evidence. The current Mathematics verdict is a single validator result: `FAIL`, 7 failing checks, all 7 units SHORTFALL on verified depth. No row/header disagreement is reproducible. |
| C-03 | "9 of 10 Math units failed" overstated vs 5 failing rows | **STALE** | Current Mathematics unit set is exactly **7** units (Meridian pilot units archived). **7 of 7** fail the 40-verified threshold. The 10-unit frame no longer exists. |
| C-04 | Pool arithmetic does not close (Math U2 131/137, U5 30/19, Sci U1 152/96, U2 90/38) | **RESOLVED** | Every unit reconciles exactly now: Mathematics 7 × 40 = 280; Science 96+40+40+40+40 = 256; total 536. JSON ↔ CSV: 12 rows, zero field mismatches. Zero delta on every unit. |
| C-05 | Gap register enumerates 10 rows against a total of 34 | **RESOLVED** | Current register enumerates **all 16** rows (GAP-MAT-001…007, GAP-SCI-008…016) with no residual count. The 34-figure is not reproducible. |
| C-06 | Three conflicting authoring volumes (164/132, 84/92, 77/200) | **RESOLVED** | Single authoritative figure: deficit = Σ max(0, 40 − verified) = Mathematics **235**, Science **91**, total **326** — exactly equal to the existing draft corpus. No new authoring required; the work is review and promotion. |
| C-07 | Trigonometry Unit V may exclude Heights and Distances | **RESOLVED** | Crosswalk MAT-U5 maps both *Introduction to Trigonometry* and *Some Applications of Trigonometry* (`mapped: true`). Unit V pool is 40 items, 6 verified. No exclusion. |
| C-08 | Science Unit I marked ready while containing an unmapped Metals chapter | **RESOLVED** | SCI-U1 chapter *Metals and Non-metals* is `mapped: true`. Repository-wide `unmappedOfficialRequirements: 0`, `officialRequirementsMapped: 84`. No "ready" label masks a zero-coverage chapter. |
| C-09 | Science verdicts derive from an unapproved book | **VALID** | Science book status is still `processed`, not `approved`. Recorded as BLOCKING gap **GAP-SCI-009** and checklist SC-03. Science remains NOT_CERTIFIED on this ground alone. |
| C-10 | "Verified" used without an evidenced basis | **RESOLVED** | Approval and verification are separately recorded and separately queryable: Mathematics 45 approved+verified / 235 draft; Science 165 approved+verified / 91 draft; approved-but-unverified = 0; verified-but-not-approved = 0. The term is now evidenced. |
| C-11 | Sequencing conflict — mass authoring proposed against `SOURCE_PENDING` | **VALID** | Overall status is still `SOURCE_PENDING`: five required source types absent for both subjects. Mitigated in part — the 326 items already exist as drafts, so the sequenced next step is source confirmation plus SME review, not new authoring against an unconfirmed source. |
| C-12 | Meridian units 8 and 9 both in and out of scope | **RESOLVED** | Meridian pilot book and its questions are archived and excluded from active inventory. Active Mathematics scope is 7 units / 280 items. Scope boundary is unambiguous. |

## Summary

| Classification | Count | IDs |
| --- | --- | --- |
| VALID (still blocking) | 2 | C-09, C-11 |
| RESOLVED | 7 | C-04, C-05, C-06, C-07, C-08, C-10, C-12 |
| STALE | 3 | C-01, C-02, C-03 |
| UNSUPPORTED | 0 | — |

Claude's standing consequence ("C-01, C-04 and C-05 each independently prevent certification") no
longer holds: all three are stale or resolved. Certification is nevertheless still blocked, on
different and reproducible grounds — the five missing official source types, the unapproved Science
book, verified-depth shortfalls in 11 of 12 units, the unexercised Class 10 reassessment leg, and
the complete absence of named SME review evidence for either subject.

Both subjects remain **NOT_CERTIFIED**.
