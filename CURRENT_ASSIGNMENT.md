---
# EduOS — Current Assignment

**Last verified:** 2026-08-27 (UTC)
**Evidence source:** the founder's active request in this Lovable thread.

This file holds **only** the active assignment. When it is complete, replace the contents with the next assignment — do not append history.

---

## Active assignment

**Title:** Founder Retest of the Consolidated Production Release
**Received:** 2026-08-27
**Priority:** P0 Release Acceptance
**Status:** Awaiting founder execution — no new development package until this retest returns a verdict.

### Release under test

| Item | Value |
|---|---|
| Canonical branch | `main` |
| Last functional commit | `92ac129d6e62b70bdd382db7a5aa8fdccadfe24c` |
| Deployed production HEAD | `e73bbb047889fe3e8043be90e56e833f068a04dc` |
| Production URL | https://www.eduos.global |
| Rollback | `54baba6d79f0f227b44ef3140d2720f026551b0c` (pre-consolidation `e03ce27`) |

### Objective

The founder executes the retest package end to end on production and returns a
single verdict. Development stays frozen until that verdict exists.

### Scope of the retest

A. Parent signup → Parent Portal → add learner → handle and PIN issued, copy/print/reset work.
B. Free Learning Check → handoff → learner signs in separately → answers → parent sees preview.
C. ₹199 live diagnostic → one entitlement → handoff → learner completes → parent report → ₹199 credit and ₹2,800 upgrade shown.
D. Gap opens → automatic direct-parent plan → intervention → AI Tutor actionable state → fresh reassessment → evidence chain.
E. Centre separation — direct-parent learners change no Brightpath centre total, heatmap, queue, assignment or evidence metric.
F. Assessment lifecycle — Create → Save Draft → Review → explicit Publish → explicit Assign; modals safe at 100/125/150/200% zoom and on mobile, tablet and desktop widths.

Detailed steps: `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md` §9 (A–K) and
`EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md` §12.

### Verdict format

`FOUNDER_RETEST: PASS` with production URL, deployed full SHA, parent and learner used,
order/entitlement references, diagnostic and report references, and non-blocking issues —
then independent read-only verification and the five-family controlled pilot.

`FOUNDER_RETEST: FAIL` with the **first** failing step only: role, route, expected, actual,
screenshot or error, related record IDs. Fix that step alone, then root cause → fix →
full regression → commit → full SHA → clean tree → publish → production verification → retest.

### Known open items (non-blocking)

- Human subject-matter review of the 210 verified questions during the pilot.
- Coordinate Geometry needs 2+ more verified questions to unlock (3 of 5).
- P1: `profiles.phone` readable org-wide by any member — product decision pending.
- No build-SHA endpoint yet; deployment identity still needs bundle probing.
- Apex `eduos.global` still awaiting DNS; `www.eduos.global` is live.

### Update protocol

The Lovable agent replaces this file at the start of each new assignment; the
founder confirms completion before it is replaced.

---

## Continuity file locations (verified 2026-08-27)

| File | Path |
|---|---|
| Operating rules | `EDUOS_PROJECT_OPERATING_SYSTEM.md` (repository root) |
| Release verification | `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md` (repository root) |
| Session bootstrap | `EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md` (repository root) |
| Status / decisions / architecture / sequence | `PROJECT_STATUS.md`, `PRODUCT_DECISIONS.md`, `TECHNICAL_STATE.md`, `ROADMAP.md` |

Both located files are tracked at the repository root on `main`. The retest scope
above is unchanged.


---

## 2026-08-28 06:0x UTC — Assessment lifecycle regression closed (Issues 1 and 2)

- Canonical branch: `main`.
- Issue 1: new assessments no longer inherit hardcoded Grade 6 metadata; scope is derived from the selected CBSE Class 10 book and unit, so drafts stay active and can publish.
- Issue 2: title + two-minute-window deduplication removed. Assessment creation is now idempotent per `clientRequestId`, enforced by a partial unique index on `public.assessments (org_id, client_request_id)`. Two intentional creates with the same title are two separate drafts; a retry of one request returns the draft it already created. No staff content can be silently discarded.
- Migration: `20260828055655_*.sql` (additive nullable column + partial unique index).
- Tests: 97/97 Vitest passing; typecheck clean; production build clean.
- Public-experience release work preserved and unchanged.
- Reports: `EDUOS_ASSESSMENT_LIFECYCLE_REGRESSION_REPORT.md`, `EDUOS_FINAL_PUBLIC_EXPERIENCE_RELEASE_REPORT.md` (section 13).
- Rollback reference: `9e0e2b166d20b3c605dfcd32f733cb9aaa3d7829`.

**Status:** Complete. Next gate: pilot monitoring; no open assessment-lifecycle defects.

---

## Continuity update — 2026-08-28: Figma-to-Production Visual Parity Audit

- Founder visual acceptance: **OPEN**
- Parity audit: **COMPLETED** (documentation + preview evidence only) — see `EDUOS_FIGMA_PRODUCTION_PARITY_AUDIT.md`
- Implementation direction: **NONE APPROVED**
- Next gate: founder selects Option A, B, C or D
- CODE_CHANGED: NO · DEPLOYED: NO · Test baseline re-run: 97/97 passing

---

## 2026-08-28 — Figma-Informed Public Visual Refinement (Direction B) — CURRENT

- Approved direction: Recommendation B (refine production toward verified Figma composition; evergreen + Geist retained; Option B dark identity NOT adopted).
- Refined: public navigation chrome (64px bar, padded nav, CTA elevation), hero composition and hierarchy, new dark illustrative product-preview card (marketing-only ink tokens), four-step process stat row (process facts only, no statistics), problem-section transition/elevation.
- Deliberately unchanged (no Figma evidence): How EduOS Works, Parents, Centres, Schools, Trust, Pricing, FAQ, Free Learning Check form, footer architecture, About and Contact bodies.
- Product truth unchanged: India/INR, CBSE Class 10 Mathematics and Science, Rs199 diagnostic, Rs2,999 annual plan, Rs199 credit / Rs2,800 upgrade, all routes and backend behaviour.
- Verification: 97/97 Vitest, typecheck clean, production build success, no console errors, no horizontal overflow at 390/768/1280/1440, single H1, dark theme verified.
- Report: EDUOS_FIGMA_REFINEMENT_RELEASE_REPORT.md
- Rollback reference (pre-release): 1fcae5f27ae75e73657e4f8affbd889ef94d9d1a (code-only; no schema changes).
- Known limitation: Figma source covers ~1.5 sections and is a Figma Make code instance, so exact token extraction and full-site parity are not possible.
- Next founder acceptance gate: visual acceptance of the refined public hero, product preview and problem section on https://www.eduos.global.
