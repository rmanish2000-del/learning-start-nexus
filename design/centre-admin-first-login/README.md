# Centre Admin First-Login Design Package

**Priority:** P0  
**Role:** Centre Administrator  
**Accent colour:** `#2563EB` (Blue 600)  
**Status:** Design specification — DEPLOYMENT: NOT ALLOWED  

## What this package contains

| File | Purpose |
|---|---|
| `README.md` | This file — overview and delivery summary |
| `NAVIGATION_MATRIX.md` | Which nav items are visible per role |
| `ROUTE_STATE_MANIFEST.json` | Machine-readable route × state specification |
| `SAMPLE_WORKSPACE_SPEC.md` | Sample data strategy and removal flow |
| `ACCEPTANCE_CRITERIA.md` | P0/P1/P2/P3 acceptance criteria |
| `DESIGN_TOKENS.json` | Centre Admin design tokens (W3C DTCG format) |

## Security constraints (must be preserved in implementation)

- **Payment Settings** is completely absent from the DOM for all accounts except `rmanish2000@gmail.com`. Not conditionally hidden. Not returned as 403. Absent.
- **Sample data** is clearly labelled SAMPLE on every screen and export. Isolated from production. Never affects billing, compliance, or evidence. Removable in one action.
- **No real learner data** in any screen, design, or export.
- **Pricing** must match exactly: ₹0 / ₹199 / ₹2,999 / ₹2,800.

## First-login flow summary

1. Centre admin logs in for the first time after approval
2. Sees welcome banner (approval confirmed) + Quick Start nav item pinned at position 1
3. Setup checklist: 6 steps (account approved → centre profile → educator → learners → diagnostic → report)
4. At step 4, offered choice: add real learners OR explore with sample workspace
5. Quick Start nav item removed automatically when all 6 steps complete
