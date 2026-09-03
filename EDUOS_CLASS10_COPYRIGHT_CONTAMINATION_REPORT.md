# EduOS — Class 10 (2026-27) NCERT Copyright Contamination Report

**Reproduce:** `bun run scripts/class10/sme-review-prepare.ts --contamination`
**Machine output:** `content/compliance/class-10-2026-27.draft-validation.json` (`copyrightContamination`)

## Method

12-token verbatim shingle overlap against 27 official NCERT Class X chapter PDFs (jemh1, jesc1). The NCERT chapter PDFs are fetched live from `ncert.nic.in` at check time, text-extracted, and reduced to overlapping 12-token shingles. Each draft item's stimulus + prompt + explanation is shingled the same way and tested for any exact shingle match.

| Metric | Value |
|---|---|
| NCERT reference corpus | 27 official Class X chapter PDFs (`jemh1` 01-14, `jesc1` 01-13) |
| Distinct NCERT 12-token shingles | 148,391 |
| Draft items checked | 326 |
| Items with a verbatim 12-token overlap | **4** |

## Flagged items

| Item | Subject | Matched span |
|---|---|---|
| `C10-2627-MATH-REQ024-DIAG-004` | Mathematics | "tower casts a shadow 28 m long. find the height of the" |
| `C10-2627-MATH-REQ022-DIAG-009` | Mathematics | "find the coordinates of the points of trisection of the line segment" |
| `C10-2627-MATH-REQ032-DIAG-001` | Mathematics | "the angle of elevation of the top of a tower from a" |
| `C10-2627-MATH-REQ034-REASS-005` | Mathematics | "cm subtends a right angle at the centre. find the area of" |

## Assessment

All flagged spans are conventional problem-stem phrasing common to the topic (shadow-and-tower trigonometry, trisection of a line segment) rather than NCERT expository prose. The check is deliberately conservative: a 12-token exact match is reported without judging intent.

**No item is cleared or withdrawn automatically.** Each flagged item is carried into the Mathematics SME queue for an explicit rewrite-or-accept decision. No Science item matched.

## Limitation

Verbatim-span detection cannot detect paraphrase-level derivation. Only the named subject expert can judge whether an item is substantively original.
