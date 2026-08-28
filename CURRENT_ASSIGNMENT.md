---
# EduOS — Current Assignment

**Last verified:** 2026-08-28 (UTC)
**Evidence source:** the founder's active request in this Lovable thread.

This file holds **only** the active assignment. When it is complete, replace the contents with the next assignment — do not append history.

---

## Active assignment

**Title:** Post-Visual-Acceptance English-Only Release, Security Scan and Controlled-Pilot Readiness Gate
**Received:** 2026-08-28
**Priority:** P0 Release Hardening and Product-Language Simplification
**Status:** Complete — verdict returned.

### Founder decision

EduOS supports **English only** at this stage. The Hindi language toggle and the
Hindi dictionary are removed; no user-facing mechanism can switch the app out of
English. The generic `t()` seam is retained as an English identity function.

### Outcome

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
