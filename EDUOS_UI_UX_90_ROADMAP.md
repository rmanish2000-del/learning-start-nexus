# EduOS — UI/UX 9/10 Roadmap

- **Date:** 2026-08-26
- **Live app:** https://www.eduos.global
- **Redesign reference:** https://push-skier-80543376.figma.site/ (16 screens, as recorded in `EDUOS_UX_PHASE1_IMPLEMENTATION_PLAN.md`)
- **Status:** Planning only — no implementation in this pass.

## Inputs reviewed

| Input | Status | Notes |
| --- | --- | --- |
| Figma redesign | Reviewed (indirect) | Live Figma MCP is not connected to this workspace, so the redesign was read through the 16-screen record captured in the Phase 1 plan. Connect Lovable Desktop + Figma Dev Mode for live token/spec extraction. |
| UX Phase 1 Plan | Reviewed | `EDUOS_UX_PHASE1_IMPLEMENTATION_PLAN.md`, 19 items (UX-01…UX-19), Waves 1–5 + deferred. |
| Elite UX Audit | **Not available** | No copy of this document exists in the project or chat history. Items below marked *(assumed)* are inferred from the shipped product, not from that audit. |
| Grok Buyer Review | **Not available** | Same. Buyer-facing items below are inferred from pilot positioning (school/centre buyer, reviewer credibility, parent trust). |

Paste or upload the Elite UX Audit and Grok Buyer Review and this roadmap will be revised against their actual findings — the current version should be treated as the baseline, not the final scoring.

## Where the product stands today

Shipped from Phase 1: UX-07 (Verification hub), UX-02 (shared closure header), UX-01 (gap-first student home), UX-03 (educator gap heatmap), UX-04 (prioritised intervention queue), UX-14 (cohort progress).

Not yet shipped: the entire reviewer evidence flow (UX-05, UX-06, UX-15), the parent trust layer (UX-11, UX-12, UX-13), learner depth (UX-08, UX-09, UX-10), and everything deferred (UX-16…UX-19).

**Honest current score: ~6.5/10.** Information architecture and educator triage are now good. What holds the score down is (a) no external verification loop a buyer can watch end to end, (b) a parent portal that reports numbers rather than proof, (c) an inconsistent visual system across old and new screens, and (d) unfinished states — loading, empty, error, mobile — that make the product feel like an internal tool.

**What 9/10 requires:** every role can complete its primary job in one screen, every claim on screen is attributable to a verifier, the visual language is identical on every route, and the product survives a cold demo on a phone with an empty account.

## P0 — Blocks a 9/10 and blocks buyer confidence

| ID | Item | Role | Effort | Risk | Business impact |
| --- | --- | --- | --- | --- | --- |
| R-01 | Reviewer evidence queue with Approve / Query / Reject (UX-05) | Reviewer | L (1–2 wks) | Medium | **Critical** — external verification is the credibility spine of the pilot; without it the outcome claim is self-reported |
| R-02 | Verified-by attribution on every closure and evidence row (UX-06) | Parent, Student, Educator | S (≤2 d) | Low | **Critical** — converts "we say it closed" into "a named reviewer signed it off" |
| R-03 | Design-system pass: one token set, one card/table/badge/empty pattern across all 30+ routes | All | M (3–5 d) | Low | **High** — the single biggest perceived-quality lever; mixed styling reads as prototype |
| R-04 | State completeness: loading skeletons, empty states with a next action, typed error recovery on every data surface | All | M (3–5 d) | Low | **High** — a cold demo account currently shows blank cards, which kills first impressions |
| R-05 | Mobile pass on the four primary journeys (student home, parent outcomes, educator queue, reviewer queue) | All | M (3–5 d) | Medium | **High** — parents and students are phone-first; PWA install is already shipped and points at a desktop layout |
| R-06 | Parent outcomes header: closure, verified evidence, tutor minutes, trend (UX-11) | Parent | M (3–5 d) | Low | **High** — the parent screen is the retention and word-of-mouth surface for centres |
| R-07 | One canonical metric layer — closure rate, mastery, lift defined once and reused everywhere | All | S (≤2 d) | Medium | **High** — divergent numbers between `/dashboard`, `/outcome-proof` and `/parent` destroy trust instantly in a buyer demo |

## P1 — Raises the score from "credible" to "polished"

| ID | Item | Role | Effort | Risk | Business impact |
| --- | --- | --- | --- | --- | --- |
| R-08 | Student loop journey timeline per gap (UX-08) | Student | M | Medium | Medium-high — makes the learning loop legible, which is the product's core story |
| R-09 | Subject mastery against an explicit 80% target (UX-09) | Student | S | Low | Medium — turns a percentage into a goal |
| R-10 | Student evidence portfolio with verification state (UX-10) | Student | S | Low | Medium |
| R-11 | Parent trends: baseline → now → target per subject (UX-13) | Parent | S | Low | Medium-high — the "is my child improving?" question, answered once |
| R-12 | Parent tutor log with linked gap and next session (UX-12) | Parent | M | Medium | Medium — justifies tutoring spend |
| R-13 | Educator verification status panel (UX-15) | Educator | S | Low | Medium — closes the educator side of the reviewer loop |
| R-14 | Navigation and page-title consistency: one breadcrumb model, no dead ends, back paths from every detail route | All | S | Low | Medium-high — dead ends were a recurring P0 defect class |
| R-15 | Accessibility baseline: WCAG AA contrast, focus rings, keyboard paths, labelled controls, non-colour-only status | All | M | Low | Medium-high — school and district buyers ask for this in procurement |
| R-16 | Performance budget on the three heaviest routes (heatmap, question bank, audit hub) | All | M | Medium | Medium — perceived speed is scored as quality |
| R-17 | Onboarding continuity: quick start, tour and help unified into one "where am I in setup" model | All | M | Medium | Medium — pilot centres self-serve instead of asking for support |

## P2 — Differentiation, after the score is secured

| ID | Item | Role | Effort | Risk | Business impact |
| --- | --- | --- | --- | --- | --- |
| R-18 | Gap XP levels and outcome-linked badges (UX-17) | Student | M | Medium | Medium — engagement upside, but only honest once verification is authoritative |
| R-19 | Reviewer closure validation with per-school compliance (UX-16) | Reviewer | L | High | Medium — needs a tenant-group model; district-scale, not pilot-scale |
| R-20 | Reviewer report library with generated downloads (UX-18) | Reviewer | L | Medium | Low-medium — largely duplicates existing audit exports |
| R-21 | Portal switcher in the header (UX-19) | All | S | High | Low — a security decision before a UX one |
| R-22 | Motion and micro-interaction layer (state transitions, closure celebration, queue reordering) | All | S | Low | Low-medium — cheap perceived-quality gain once R-03 lands |
| R-23 | Print/PDF-quality outcome pack for buyer meetings | Admin | M | Low | Medium — sales asset rather than product UX |

## Effort, risk and impact key

- **Effort:** S ≤ 2 days · M 3–5 days · L 1–2 weeks (single implementer, includes verification).
- **Risk:** Low = presentation only · Medium = new read paths, ranking rules or shared metric changes · High = new write roles, tenancy model or security posture.
- **Business impact:** judged against pilot success — gap closure rate, parent retention, reviewer defensibility and buyer conversion — not aesthetics.

## Suggested sequencing (no dates committed)

1. **Trust wave:** R-01, R-02, R-07 — the verification loop and one truthful set of numbers.
2. **Quality wave:** R-03, R-04, R-14 — one visual system, complete states, no dead ends.
3. **Audience wave:** R-06, R-05, R-11, R-13 — parent and mobile surfaces, now that claims are attributable.
4. **Depth wave:** R-08, R-09, R-10, R-13, R-15, R-16.
5. **Post-pilot:** everything in P2.

Trust before polish: a beautiful screen showing an unverified claim scores worse with a buyer than a plain screen showing a signed one.

## Assumptions and open questions

1. Pilot stays single-tenant per centre; district roll-up (R-19) is out of scope until a tenant-group model is agreed.
2. Reviewers remain write-restricted to verification records — never scores, mastery or evidence content.
3. The Figma redesign is directional, not binding, where it conflicts with the shipped data model.
4. No schema changes outside R-01 (`evidence_verifications`) and the verifier reference used by R-02.
5. *(Open)* Which findings in the Elite UX Audit and Grok Buyer Review are unaddressed here — supply both documents to close this gap.
