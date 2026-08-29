---
# EduOS — Current Assignment

**Last verified:** 2026-08-29 (UTC)
**Evidence source:** the founder's active request in this Lovable thread.

This file holds **only** the active assignment. When it is complete, replace the contents with the next assignment — do not append history.

---

## Active assignment

**Title:** Class 10 Compliance Certification & Launch Readiness Gate
**Received:** 2026-08-29
**Priority:** P0 Launch Critical Path
**Status:** Complete — verdicts returned.

### Verdicts

| Item | Result |
|---|---|
| Requirements verified | 84 / 84 |
| Mathematics (041) | **NOT_COMPLIANT** — 7 failing gate checks |
| Science (086) | **NOT_COMPLIANT** — 9 failing gate checks |
| Overall compliance status | `SOURCE_PENDING` |
| Journey / pricing / security | PASS |
| Launch gate | **CONTROLLED PILOT ONLY — external launch withheld** |
| Tests · typecheck · build | 256 / 256 · clean · clean |
| Security scan | 0 critical, 1 pre-existing accepted warning |
| Deployed | No — no runtime behaviour changed |

Launch blockers LB-1 … LB-7 and non-blocking items NB-1 … NB-5 are recorded in
`EDUOS_CLASS10_2026_27_COMPLIANCE_CERTIFICATION.md`. Six of the seven blockers
clear with one act: a named subject-expert review approving the 326 rebuilt items.

### Next gate

Subject-expert review of the 326 rebuilt Class 10 items and the Science source
book. No Class 9, 11 or 12 work, no pricing expansion and no new features until
Class 10 receives a compliance certificate.

### Superseded

The 2026-08-28 English-Only Release assignment below is **complete and superseded**.

### Outcome (2026-08-28 — English-only release, superseded)

| Item | Result |
|---|---|
| English-only release | PASS |
| Functional journeys (public + parent) | PASS |
| Responsive 390 / 768 / 1280 / 1440 | PASS |
| Tests | 105 / 105 passing |
| Typecheck / build | clean |
| Security scan critical findings | 0 (1 accepted warning) |
| Database RLS gaps | 0 (1 intentional policy-less table) |
| **Pilot verdict** | **READY_FOR_FIVE_FAMILY_PILOT** |
| Deployed | **YES** — https://www.eduos.global, HEAD `d874fb4b0b5973cdef42301ad6021a3d0e20f349` |

Evidence: `EDUOS_POST_VISUAL_ACCEPTANCE_PILOT_GATE.md`.

### Next gate

Founder-controlled five-family pilot preparation and sales-enablement foundation.
No pilot invitations and no sales material have been issued.

---

## 2026-08-28 — Classes 9–12 Curriculum, Entitlement and Pricing Architecture Audit — CURRENT

**Priority:** P0 Expansion Foundation · **Status:** Complete — architecture delivered, awaiting founder approval.

- Founder has **deferred the five-family pilot**; curriculum expansion is now under architecture review.
- Production remains **English-only, CBSE Class 10 Mathematics and Science**.
- **No new classes or subjects are commercially available.** No selector activated, no curriculum imported.
- **Pricing unchanged:** ₹199 diagnostic, ₹2,999 annual plan, ₹199 credit (₹2,800 upgrade). All candidate expansion prices are founder-approval hypotheses only.
- Audit is documentation-only: no application code changed, no migration applied, no deployment.
- Deliverable: `EDUOS_CLASSES_9_12_EXPANSION_ARCHITECTURE.md` (constraint map, target schema, additive migration plan, content pipeline, JSON schemas, subject requirements, entitlement and pricing architecture, UX impact, release gates, copyright register, waves, testing, rollback, founder decisions).
- Open defect closed under D9: the homepage FAQ no longer claims Hindi support; it states the interface is English only (`src/routes/index.tsx`).

**Founder decisions received 2026-08-28:** D1 approved (database-driven catalogue) · D2 approved
(academic-year versioning from CBSE 2026–27) · D3 approved (Classes 9–10 core, Classes 11–12 Science
including English Core) · D4 approved for architecture only (prices unapproved) · D5 approved (one
eligible ₹199 credit, same learner, qualifying subject or bundle, once) · D6 approved for
configuration (tax inactive until accounting approval) · D7 approved (named subject-expert sign-off
before commercial activation) · D8 approved for architecture (centre pricing per active learner/year)
· D9 fixed now (English-only FAQ correction shipped).

---

## 2026-08-28 — Wave 0 Preparation Gate — CURRENT

**Priority:** P0 Expansion Foundation · **Status:** Complete — baseline committed and published.

- Architecture audit and continuity documents committed; D1–D9 recorded in
  `EDUOS_CLASSES_9_12_EXPANSION_ARCHITECTURE.md` §14.
- Only code change: the homepage FAQ Hindi correction. No schema, migration, content import,
  class/subject activation, pricing change, or new selector.
- Production remains English-only, CBSE Class 10 Mathematics and Science, pricing unchanged.

**Next gate:** Wave 0 catalogue, versioning, entitlement and pricing-foundation implementation.

---

## 2026-08-28 — Wave 0 Curriculum Catalogue, Entitlement and Pricing Foundation — CURRENT

**Priority:** P0 Expansion Foundation · **Status:** Complete — implemented, tested and deployed.

- Additive migration only; no destructive statement, no data loss, no price change.
- Catalogue, academic-year versioning, learner subject selections, entitlements and configurable pricing are live
  as structure; commercial scope remains CBSE Class 10 Mathematics and Science.
- Classes 9, 11, 12, all streams, bundles and candidate prices are inactive and invisible.
- Tests 135 passing; typecheck and production build clean; no new security or RLS finding.
- Evidence: `EDUOS_WAVE_0_FOUNDATION_IMPLEMENTATION_REPORT.md`.
- Rollback: `48548b420c601f8bcaf11a47c6853a55ebfb5526`.

**Next gate:** Wave 1 — Class 9 Mathematics and Science content preparation.

---

## 2026-08-28 11:44 UTC — Wave 0 Production Closeout

- Canonical branch: `main` (working branch `edit/edt-09c92cdc`, canonical tree).
- Wave 0 application commit: `e38a303b361ec1848c12ce7e490a8e0a7945f528` — "Implemented Wave 0 foundation".
- Deployed production commit: `e6e34008bd264b1533707180428d860dda76a6f9` (Wave 0 + P0 profile-org RLS hardening migration `20260828114401_*.sql`).
- Deployment: https://www.eduos.global — LIVE, HTTP 200, verified 2026-08-28 ~11:47 UTC.
- Tests 135/135 (13 files) · typecheck clean · production build clean · worktree clean.
- Migrations committed: `20260828112426_*` (Wave 0 additive) and `20260828114401_*` (profiles org_id self-assignment fix). Translations: none required (English-only).
- Security: the critical finding "any user can join any organization" (pre-existing profiles INSERT/UPDATE policy allowing self-assigned `org_id`) was found during the closeout scan and fixed: self-insert must have `org_id IS NULL`, self-update must keep `org_id` unchanged, admins remain scoped to their own org. Rescan: 0 critical, warnings only.
- Database: Wave 0 migration applied; 2 purchasable subjects; 1 active class (Class 10); 0 active streams; 0 orphan catalogue links; 0 duplicate canonical codes; 5 legacy entitlements grandfathered; RLS active on every new table; order amounts unchanged (19 900 / 280 000 paise); active plans 19 900 / 299 900 paise.
- Production verification: ₹199, ₹2,999, ₹2,800, CBSE Class 10 Mathematics and Science all present; Classes 9/11/12, Commerce, Humanities and all streams absent from public surfaces; English-only copy intact.
- Rollback: code `48548b420c601f8bcaf11a47c6853a55ebfb5526`; both migrations are additive/policy-only and require no data rollback.
- Next gate: Wave 1 — Class 9 Mathematics and Science content preparation (not started).
