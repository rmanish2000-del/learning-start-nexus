# EduOS — Class 10 (2026-27) Draft Duplicate and Near-Duplicate Report

**Reproduce:** `bun run scripts/class10/sme-review-prepare.ts`
**Machine output:** `content/compliance/class-10-2026-27.draft-validation.json` (`duplicates`)

## Method

Prompts are normalised (lowercase, unicode quotes/dashes folded, punctuation stripped, whitespace collapsed). Exact duplicates are grouped by the normalised string. Near duplicates are token-set Jaccard comparisons **within each subject**, threshold **0.85**. All 326 draft items are compared; Mathematics and Science are never compared against each other.

## Results

| Metric | Value |
|---|---|
| Items compared | 326 |
| Exact duplicate groups | **0** |
| Near-duplicate pairs at or above threshold | **1** |

### Near-duplicate pairs

| A | B | Subject | Similarity | Cross-pool | Required action |
|---|---|---|---:|---|---|
| `C10-2627-MATH-REQ001-DIAG-012` | `C10-2627-MATH-REQ001-REASS-013` | Mathematics | 0.909 | yes | Subject SME differentiates or withdraws one item |

No item was edited, merged or withdrawn by this run. Every flagged pair is carried into the subject SME queue as a warning for a human decision.
