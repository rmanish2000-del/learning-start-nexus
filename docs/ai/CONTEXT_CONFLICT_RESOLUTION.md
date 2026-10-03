# Context Conflict Resolution

**Scope:** contradictions between continuity documents, registries, chat and production.
**Enforced by:** `scripts/ai/check-context-conflicts.ts`; resolutions live in
`.ai/DECISION_REGISTRY.json` → `conflict_resolutions`.

## 1. Principle

A seat never resolves a conflict by picking the reading it likes. It stops the dependent
step, names both sources, applies the authority order (Context Engineering Standard §2) and
records the resolution. If the resolution changes product truth (scope, pricing, language,
roles, money), the founder ratifies it.

## 2. Conflicts found in the 2026-10-03 audit and their resolutions

| Id                              | Sources                                                                                                               | Conflict                                                                    | Resolution                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `CX-PRODUCT-LANGUAGE`           | PRODUCT_DECISIONS row 20, PROJECT_STATUS §5, ROADMAP "Hindi v1", TECHNICAL_STATE debt 6 vs PROJECT_STATUS §1b, D9, G5 | Hindi parent journey described as live vs English-only product              | **GV-003**: English-only. Earlier rows are historical.                                                                                      |
| `CX-DEPLOYED-SHA`               | OS, handoff package, PROJECT_STATUS, PRODUCT_DECISIONS, TECHNICAL_STATE, ROADMAP, CURRENT_ASSIGNMENT                  | Six-plus different "deployed production" SHAs                               | **GV-006**: all `reported`; `CURRENT_STATE.production` is the only current claim and is `blocked` until verified via `/api/public/version`. |
| `CX-OS-FILE-EXISTS`             | handoff §2 note, PROJECT_STATUS 2026-08-27 note                                                                       | "Operating-system file does not exist"                                      | **GV-007**: it exists since 2026-08-27.                                                                                                     |
| `CX-DEPLOY-PERMISSION`          | OS §9 item 8, handoff §14 item 8 vs PRODUCT_DECISIONS row 23, founder standing instruction "Deployment NOT ALLOWED"   | "Publish when appropriate" vs founder-only publishing                       | **GV-004**: explicit permission only.                                                                                                       |
| `CX-FOUNDER-ACTION`             | roadmap.md staging and OAuth items vs G1                                                                              | Founder execution items                                                     | **GV-005**: staging remix → Lovable; OAuth client → legitimate credential exception (BLK-OAUTH-CLIENT).                                     |
| `CX-CURRENT-ASSIGNMENT-HISTORY` | CURRENT_ASSIGNMENT.md                                                                                                 | File held four completed assignments despite the "only the active one" rule | **GV-010**: one task in `CURRENT_TASK.json`; history preserved at the base-SHA coordinate.                                                  |
| `CX-DUPLICATE-ROADMAP`          | ROADMAP.md, roadmap.md                                                                                                | Case-colliding files                                                        | **GV-011**: ROADMAP.md canonical; roadmap.md historical; rename is a founder decision (BLK-ROADMAP-CASE).                                   |
| `CX-TEST-COUNT-DRIFT`           | all continuity docs                                                                                                   | 14 different "N/N tests" totals                                             | **GV-006**: historical; `CURRENT_STATE.gates` is current.                                                                                   |

Also recorded, not a conflict: the founder's seat preferences name Claude Code as default
execution owner while the continuity set names M365 Copilot as continuity owner. These are
compatible roles (GV-005).

## 3. Adding a new conflict class

1. Add a narrow detection rule to `detectConflicts()` in
   `scripts/ai/check-context-conflicts.ts` with a `CX-` id.
2. Add a test in `src/lib/__tests__/ai-governance.test.ts` showing it fails without a
   resolution and passes with one.
3. Add the decision to `DECISION_REGISTRY.json` and the id to `conflict_resolutions`.
4. Mark the losing text in the documents with `[SUPERSEDED YYYY-MM-DD: see GV-nnn]`. Never
   delete it.

## 4. Superseding without deleting

The marker format is `**[SUPERSEDED YYYY-MM-DD: reason / pointer]**` on its own line or at
the start of the affected paragraph. `check-context-conflicts.ts` ignores lines carrying the
marker when deciding what a document currently claims, so a properly marked section stops
counting as a live claim while remaining readable history.
