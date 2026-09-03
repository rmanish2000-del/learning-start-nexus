# EduOS — Class 10 (2026-27) Diagnostic / Reassessment Pool Allocation Report

**Reproduce:** `bun run scripts/class10/sme-review-prepare.ts`
**Machine output:** `content/compliance/class-10-2026-27.draft-validation.json` (`poolAllocation`)

## Allocation

| Subject | Total drafts | DIAGNOSTIC | REASSESSMENT | FRESH_REASSESSMENT | Reassessment total | Pools disjoint |
|---|---:|---:|---:|---:|---:|---|
| Mathematics | 235 | 95 | 0 | 140 | 140 | yes |
| Science | 91 | 30 | 0 | 61 | 61 | yes |
| **Total** | **326** | **125** | **0** | **201** | **201** | **yes** |

## Rules enforced

1. Every item carries exactly one pool designation. Any other value is a blocker; **0** items failed.
2. `FRESH_REASSESSMENT` marks reassessment-pool items authored fresh so a reassessment can never re-serve a diagnostic item.
3. No `external_ref` appears in both the diagnostic and the reassessment pool. Overlap count: **0**.
4. The pools are never combined in this preparation, in the SME queues, or in the register.

## Residual risk

One lexical near-duplicate pair spans the two pools (`C10-2627-MATH-REQ001-DIAG-012` / `C10-2627-MATH-REQ001-REASS-013`, similarity 0.909). The identifiers are disjoint but the content is close enough that a reassessment could feel like a repeat. It is queued for a Mathematics SME decision.

Platform-level note, unchanged by this work: `src/lib/builder.server.ts` enforces disjointness at assessment-build time; there is no runtime item-level exclusion of previously seen items. The reassessment reserve check in the compliance validator therefore still reports `reassessment_reserve_available: not verified` for both subjects, and will until the drafts are SME-approved.

## Status

All 326 items remain `status='draft'`, `verification_state='unverified'`. No pool was rebalanced and no item was promoted.
