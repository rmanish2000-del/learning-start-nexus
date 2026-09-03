# EduOS — Class 10 (CBSE, 2026-27) Draft Question Validation Report

**Mode:** draft-review preparation. Read-only against the database. **No question was promoted to approved or verified.** No question was authored. No certification claim is made.

**Reproduce:**

```
bun run scripts/class10/sme-review-prepare.ts                  # validation + SME queues
bun run scripts/class10/sme-review-prepare.ts --contamination  # + NCERT verbatim check
```

**Machine output:** `content/compliance/class-10-2026-27.draft-validation.json`

## 1. Reconciliation — all 326 drafts accounted for exactly once

| Check | Result |
|---|---|
| Register items (`EDUOS_CLASS_10_FINAL_QUESTION_REGISTER.json`) | 326 |
| Live `question_bank` drafts (Class 10 books, not archived) | 326 |
| Distinct `external_ref` values in the database | 326 |
| Null `external_ref` | 0 |
| Register-only / database-only | 0 / 0 |
| MD5 of the sorted `external_ref` list, register vs database | `a5f7e8857e9fe16b518db1379f8cdc98` — **identical** |
| Drafts already mapped into an assessment | 0 |

Every row is `status='draft'`, `verification_state='unverified'`. Snapshot: `content/compliance/class-10-2026-27.draft-db-snapshot.json`.

**Subject split (kept separate throughout):** Mathematics **235**, Science **91**, total **326**.

Excluded from the 326 by design, and not part of any SME queue: 15 retired and 28 archived draft items belonging to archived pilot books.

## 2. Validation checks executed per item

| Check | What it enforces | Severity when it fires |
|---|---|---|
| `SYLLABUS_MAPPING` / `SYLLABUS_SOURCE_REF` | at least one official requirement id + an official source reference | BLOCKER |
| `CURRICULUM_MAPPING` | unit, chapter, topic, outcome and atom ids all present | BLOCKER |
| `ATOM_STATUS` | atom is `MAPPED` | WARNING |
| `OPTION_COUNT` / `OPTION_DUPLICATE` / `ANSWER_NOT_IN_OPTIONS` | option-based items are answerable and unambiguous | BLOCKER |
| `ANSWER_EMPTY` / `EXPLANATION_EMPTY` / `EXPLANATION_THIN` | answer and explanation consistency | BLOCKER / WARNING |
| `NUMERIC_CHECK` | recomputes the declared numeric assertion (`gcd`, `lcm`, `sum`, `product`) | BLOCKER on disagreement, WARNING when not machine-checkable |
| `NOTATION_*` | unicode superscripts, ×/÷, unicode minus, vulgar fractions, smart quotes, raw LaTeX, double spaces | WARNING |
| `RUBRIC_MISSING` / `RUBRIC_MARKS` | multi-part kinds carry an explicit scoring rule and more than one mark | BLOCKER / WARNING |
| `STIMULUS_MISSING` / `STIMULUS_EMBEDDED` | case-study and data-interpretation items have a context | BLOCKER / WARNING |
| `POOL_INVALID` | pool is one of `DIAGNOSTIC`, `REASSESSMENT`, `FRESH_REASSESSMENT` | BLOCKER |

## 3. Results

**Blockers: 0. Warnings: 242.**

| Check | Mathematics | Science | Total | Severity |
|---|---:|---:|---:|---|
| `NUMERIC_CHECK` (declared assertion outside the four machine-checkable functions) | 158 | 26 | 184 | WARNING |
| `STIMULUS_EMBEDDED` (context inside the prompt, not a separate field) | 40 | 13 | 53 | WARNING |
| `RUBRIC_MARKS` (short-answer item carrying 1 mark) | 5 | 0 | 5 | WARNING |

- Every one of the 326 items carries a complete unit → chapter → topic → outcome → atom chain and at least one official requirement id with a source reference. There is no item without traceable curriculum mapping.
- Every machine-checkable numeric assertion agreed with the stored answer; none disagreed.
- Every option-based item has a correct answer present exactly once among distinct options.
- No un-normalised notation was found: the corpus already uses ASCII `^`, `x`, `-` and straight quotes.

### Item kinds

| Kind | Mathematics | Science |
|---|---:|---:|
| short_answer | 102 | 43 |
| mcq | 44 | 19 |
| assertion_reason | 26 | 12 |
| case_study | 25 | 11 |
| true_false | 21 | 4 |
| data_interpretation | 15 | 2 |
| fill_blank | 2 | 0 |

## 4. Duplicate and near-duplicate analysis

Method: prompts normalised (lowercase, unicode folded, punctuation stripped, whitespace collapsed), exact-match grouping plus token-set Jaccard within each subject at threshold 0.85.

| Result | Count |
|---|---|
| Exact duplicate groups | **0** |
| Near-duplicate pairs ≥ 0.85 | **1** |

| A | B | Similarity | Note |
|---|---|---|---|
| `C10-2627-MATH-REQ001-DIAG-012` | `C10-2627-MATH-REQ001-REASS-013` | 0.909 | Cross-pool pair (diagnostic vs reassessment). Must be differentiated by the Mathematics SME or one of the two withdrawn, otherwise a reassessment can echo the diagnostic item. |

## 5. NCERT copyright-contamination check

Method: 12-token verbatim shingle overlap between each item's stimulus + prompt + explanation and the text of **all 27 official NCERT Class X chapter PDFs** (`jemh1`, `jesc1`), extracted at check time. Corpus: 148,391 distinct NCERT shingles.

| Result | Count |
|---|---|
| Items checked | 326 |
| Items with a 12-token verbatim overlap | **4** (all Mathematics) |

| Item | Matched 12-token span |
|---|---|
| `C10-2627-MATH-REQ024-DIAG-004` | "tower casts a shadow 28 m long. find the height of the" |
| `C10-2627-MATH-REQ022-DIAG-009` | "find the coordinates of the points of trisection of the line segment" |
| `C10-2627-MATH-REQ032-DIAG-001` | "the angle of elevation of the top of a tower from a" |
| `C10-2627-MATH-REQ034-REASS-005` | "the angle of elevation of the top of a tower from a" |

These are conventional problem-stem phrasings rather than expository text, but they are flagged in the Mathematics SME queue for a rewrite decision. No Science item matched.

## 6. Diagnostic / reassessment pool allocation

| Subject | Total | DIAGNOSTIC | REASSESSMENT | FRESH_REASSESSMENT | Reassessment total | Pools disjoint |
|---|---:|---:|---:|---:|---:|---|
| Mathematics | 235 | 95 | 0 | 140 | 140 | yes |
| Science | 91 | 30 | 0 | 61 | 61 | yes |
| **Total** | **326** | **125** | **0** | **201** | **201** | **yes** |

`FRESH_REASSESSMENT` denotes reassessment-pool items authored fresh so they can never repeat a diagnostic item. No `external_ref` appears in both pools. The pools are **not** combined anywhere in this preparation. The one near-duplicate pair in section 4 is the only cross-pool similarity risk and is queued for SME resolution.

Note carried forward as a known platform limitation: `src/lib/builder.server.ts` enforces pool disjointness at build time; there is no runtime item-level exclusion of previously seen items. That is unchanged by this work.

## 7. SME review queues

| File | Subject | Rows |
|---|---|---:|
| `EDUOS_CLASS10_MATHS_SME_REVIEW_QUEUE.csv` | Mathematics | 235 |
| `EDUOS_CLASS10_SCIENCE_SME_REVIEW_QUEUE.csv` | Science | 91 |

Each row carries the full mapping chain, the official requirement ids and source reference, the item content, the pool, the current status (`draft / unverified`), the automated blocker and warning codes, and six empty SME columns: decision, correction, comment, name, qualification, signature date.

## 8. Remaining SME decisions and sign-off requirements

**Mathematics SME (named, qualified, must sign each decision)**

1. Accept / correct / reject each of the 235 items.
2. Resolve the near-duplicate pair `REQ001-DIAG-012` vs `REQ001-REASS-013`.
3. Rule on the 4 NCERT verbatim-overlap items: rewrite or accept as conventional phrasing.
4. Confirm the 5 one-mark short-answer items are correctly weighted.
5. Confirm the 158 non-machine-checkable numeric assertions by hand.

**Science SME (named, qualified, must sign each decision)**

1. Accept / correct / reject each of the 91 items.
2. Confirm the 26 non-machine-checkable numeric assertions by hand.
3. **Approve the Science source book.** `NCERT Class 10 Science (CBSE)` is still `processed`, not `approved`; the CURRICULUM gate fails on this alone. It stays unapproved until a named Science SME signs.

**Both**

- Sign-off must record reviewer name, qualification and timestamp; the REVIEW gate currently fails on `named_reviewer`, `review_timestamp` and `review_decision` for both subjects.
- Only after signed decisions are recorded may any item move from `draft`/`unverified`. Nothing in this run performs that move.

## 9. Limitations and unresolved risks

- Verified depth remains far below the 40-per-unit target for most units; SME approval of these drafts is necessary but not sufficient to close the QUESTION gate.
- The SOURCE gate cannot close until CBSE publishes the 2026-27 sample papers and marking schemes (see `EDUOS_CLASS10_MISSING_OFFICIAL_SOURCES_REPORT.md`).
- Contamination detection is verbatim-span based; it does not detect paraphrase-level derivation, which only a human SME can judge.
- Near-duplicate detection is lexical; conceptually equivalent items with different wording are not flagged.
