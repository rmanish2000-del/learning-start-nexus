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
- Open defect logged, not fixed: homepage FAQ still claims Hindi support (`src/routes/index.tsx`). Requires a separate approved copy fix.

**Next gate:** founder approval of the expansion architecture (decisions D1–D9). Classes 9–12 stay unsupported until each class-subject passes its own release gate.
