# EduOS — UI/UX 9.0 Implementation Plan

- **Date:** 2026-08-26
- **Live app:** https://www.eduos.global
- **Status:** Recommendations only. No implementation in this pass.
- **Baseline:** ~6.5/10 (see `EDUOS_UI_UX_90_ROADMAP.md`). Wave 1 (UX-01, UX-02, UX-07) and Wave 2 educator tools (UX-03, UX-04, UX-14) are shipped.

## Verified current state of the public experience

| Route | Today |
| --- | --- |
| `/` | Redirects immediately to `/dashboard`. **There is no landing page.** A signed-out visitor lands on `/auth`. |
| `/auth` | Sign-in form (staff email / student handle + PIN). First and only impression for every prospect. |
| `/about` | Four pillars, "who it's for", demo-scope note. Text-only, no evidence, no CTA beyond sign-in. |
| `/privacy`, `/terms`, `/contact` | Plain legal chrome via `PublicPageLayout`. |

Consequence: a tutoring-centre owner, parent or reviewer arriving at eduos.global sees a login box. Every trust asset the product has already built — verified closures, mastery lift, reviewer audit trails, tutor safety rules — is behind authentication. This is the single largest cause of the gap between engine quality and perceived product quality, and the largest pilot-conversion leak.

Effort key: **S** ≤ 2 days · **M** 3–5 days · **L** 1–2 weeks (single implementer, includes verification).
Risk key: **Low** = presentation only · **Medium** = new read paths or shared metric changes · **High** = new write roles, tenancy or security posture.

---

# PART A — Landing page and trust layer

All Part A work is public, unauthenticated, and must be served from real or clearly-labelled representative data. Nothing here may invent testimonials, certifications or outcome statistics.

### A-01 · Landing Page V2 — `/` — **P0** · Effort M · Risk Low
- **Current:** `/` throws a redirect to `/dashboard`; the marketing surface does not exist.
- **Proposed:** A real route at `/` that renders the landing page for signed-out visitors and keeps the redirect to `/dashboard` only when a session marker is present. Structure: outcome-led hero ("Prove the gap closed, don't claim it"), one-line proof strip (closure rate, mastery lift, verified evidence count — from a public read-only snapshot, labelled as pilot data), then sections A-02…A-10 in order, then footer with the existing legal links.
- **Business value:** Creates the only surface where a pilot can be sold without a live demo call.
- **User value:** A prospect understands what EduOS does in under 20 seconds.
- **Effort:** M · **Risk:** Low (needs a narrow public read path if live numbers are used; static labelled figures are the zero-risk fallback).

### A-02 · "How EduOS Works" section — **P0** · Effort S · Risk Low
- **Current:** The loop is described only in `/about` prose and in the authenticated first-login dialog (`how-it-works.tsx`).
- **Proposed:** Reuse the same six-step vocabulary publicly, as three role lanes (Educator / Student / Parent) so each visitor sees their own job, not a generic diagram.
- **Business value:** Removes the "what is this exactly?" objection that kills first calls.
- **User value:** Self-identification in one glance.
- **Effort:** S · **Risk:** Low.

### A-03 · The closure loop visual — Diagnostic → Gap → Intervention → Tutor → Reassessment → Evidence — **P0** · Effort M · Risk Low
- **Current:** No visual representation anywhere public; the loop is the product's core differentiator and is invisible.
- **Proposed:** One horizontal stepper following a single named example learner through all six stages, each step showing the actual artefact type produced (diagnostic score → weak outcome → approved intervention → tutor session minutes → fresh-item reassessment → verified evidence row). Clicking a step expands a real, anonymised sample record.
- **Business value:** This is the proof that EduOS is a closed loop rather than another dashboard. It is the argument.
- **User value:** Shows cause and effect instead of feature lists.
- **Effort:** M · **Risk:** Low.

### A-04 · Parent trust section — **P0** · Effort S · Risk Low
- **Current:** Parent value lives entirely inside `/parent`, invisible pre-signup. Parents are the retention and word-of-mouth surface for centres.
- **Proposed:** Answer the three parent questions on the public page: what my child is stuck on, what was done about it, whether it worked — each illustrated with an anonymised sample. Include consent posture plainly: tutor access requires guardian consent, consent is reviewable and withdrawable.
- **Business value:** Centres sell EduOS to parents; give them the asset to do it.
- **User value:** Answers "is my money working?" before signup.
- **Effort:** S · **Risk:** Low.

### A-05 · AI tutor safety section — **P0** · Effort S · Risk Low
- **Current:** Safety guarantees (Socratic only, scoped to approved interventions, never writes scores or evidence, consent-gated, static fallback library) are implemented and audited but stated nowhere public.
- **Proposed:** A short, explicit boundaries panel: what the tutor can do, what it structurally cannot do, and what happens if the model is unavailable. State only what the code enforces.
- **Business value:** Pre-empts the single most common school and district objection to AI.
- **User value:** Parents and educators learn the limits before they are asked to trust it.
- **Effort:** S · **Risk:** Low.

### A-06 · Sample outcome evidence section — **P0** · Effort M · Risk Medium
- **Current:** Outcome evidence exists at `/outcome-proof` and `/pilot-evidence` behind auth.
- **Proposed:** A public, read-only, anonymised sample of one complete evidence chain: baseline score, gap detected, intervention, tutor minutes, reassessment on fresh items, mastery lift, verifier attribution. Served from a fixed anonymised snapshot, not a live tenant query.
- **Business value:** Converts the outcome claim from marketing copy to inspectable artefact.
- **User value:** Reviewers and buyers can assess rigour without an account.
- **Effort:** M · **Risk:** Medium — must guarantee no learner-identifiable data leaves the tenant.

### A-07 · Sample parent report section — **P1** · Effort S · Risk Low
- **Current:** No shareable parent artefact exists publicly or as a download.
- **Proposed:** One full anonymised parent report rendered inline, with a download option, using the same layout the live `/parent` surface will use after R-06.
- **Business value:** Gives centre sales a leave-behind.
- **User value:** Sets expectations for what the family actually receives.
- **Effort:** S · **Risk:** Low.

### A-08 · Tutoring-centre benefits section — **P1** · Effort S · Risk Low
- **Current:** Centre-operator value (educator hours saved, retention evidence, defensible reporting) is nowhere stated.
- **Proposed:** Three operator outcomes tied to shipped capability: triage time (gap heatmap), prioritised action (intervention queue), retention proof (parent outcomes + verified evidence). No unverified ROI numbers.
- **Business value:** Speaks to the actual buyer, who is the centre owner, not the teacher.
- **User value:** Makes the purchase justifiable internally.
- **Effort:** S · **Risk:** Low.

### A-09 · Pilot program CTA — **P0** · Effort S · Risk Low
- **Current:** The only public action is "Sign in". There is no way for an interested centre to start anything.
- **Proposed:** One primary CTA repeated at hero, after the evidence section and in the footer: "Apply for the pilot" → short qualified form (centre name, contact, learner count, board/grades, timeline) persisted to a pilot-leads table with admin-only RLS and an admin review view. Secondary CTA: "See a sample outcome report" (A-06 anchor). Sign-in demotes to a header text link.
- **Business value:** Without this the landing page cannot convert; this is the conversion mechanism itself.
- **User value:** A clear, low-commitment next step.
- **Effort:** S · **Risk:** Low (new table plus grants and admin-only policies).

### A-10 · FAQ — **P1** · Effort S · Risk Low
- **Current:** Objections are handled ad hoc in calls.
- **Proposed:** 8–12 answers covering data ownership and residency, consent and withdrawal, what the AI tutor may not do, curriculum/board coverage, how mastery lift is calculated, reviewer access, pricing posture, pilot length and exit. Marked up as FAQ JSON-LD for search.
- **Business value:** Deflects repeat sales questions and earns FAQ rich results.
- **User value:** Answers before they have to ask.
- **Effort:** S · **Risk:** Low.

### A-11 · Public SEO and social baseline — **P1** · Effort S · Risk Low
- **Current:** `/` carries meta but redirects instantly, so it cannot rank. No landing OG image; no organisation JSON-LD.
- **Proposed:** Unique title/description per public route, single H1 per page, absolute OG/Twitter image on the landing route once a real hero asset exists, Organization + SoftwareApplication + FAQ JSON-LD, sitemap entries for every public route.
- **Business value:** Inbound discovery for "tutoring centre gap analysis / CBSE diagnostic" intent.
- **Effort:** S · **Risk:** Low.

---

# PART B — Premium UX/UI review

Benchmarked against Linear (density and speed), Stripe (documentation-grade clarity and trust), Notion (calm hierarchy), Duolingo (motivation loop), Khan Academy (mastery legibility).

### B-01 · Visual hierarchy — **gap: significant** — P0 · Effort M · Risk Low
- **Current:** Routes were built sprint by sprint, so card weight, heading scale and emphasis differ between `/dashboard`, `/gap-analysis`, `/question-bank` and the 15 audit centres. Everything on a page carries similar visual weight, so nothing leads.
- **Proposed:** One page template: page title + one-line purpose, one primary metric band, one primary action, then supporting cards at reduced weight. Exactly one visual "loudest thing" per screen.
- **Business value:** Perceived quality is dominated by consistency, not beauty. **User value:** Faster orientation. **Effort:** M · **Risk:** Low.

### B-02 · Information hierarchy — **gap: significant** — P0 · Effort M · Risk Medium
- **Current:** The same concepts (closure rate, mastery, lift) are computed and presented in several places with different framing. Wave 1's `closure-shared.ts` fixed this for three routes only.
- **Proposed:** Extend the canonical metric layer to every surface that shows a number, with a shared definition tooltip on each metric. One definition, one formula, one label, everywhere.
- **Business value:** Divergent numbers in a buyer demo are fatal. **User value:** Numbers become learnable. **Effort:** M · **Risk:** Medium.

### B-03 · Cognitive load — **gap: significant** — P0 · Effort M · Risk Low
- **Current:** Audit and workspace screens present long dense tables with no default focus; 30+ routes exist. Linear's rule — the screen answers one question — is not met.
- **Proposed:** Every screen declares its question in a subtitle and defaults to the answering view (worst-first, needs-action-first). Secondary detail moves behind progressive disclosure.
- **Business value:** Directly drives educator efficiency. **User value:** Less scanning, more acting. **Effort:** M · **Risk:** Low.

### B-04 · Dashboard clarity — **gap: moderate** — P1 · Effort M · Risk Low
- **Current:** Wave 2 improved educator triage materially (heatmap, cohort, queue), but the dashboard still stacks cards without a stated "today" narrative.
- **Proposed:** Lead with a one-sentence status line ("3 learners need action today; closure is up 4 points this term"), then the heatmap, then the queue. Khan-style mastery targets shown against an explicit 80% line.
- **Effort:** M · **Risk:** Low.

### B-05 · Typography — **gap: minor** — P1 · Effort S · Risk Low
- **Current:** Geist is set, but the type scale is applied inconsistently; numeric metrics are not tabular, so figures jitter between rows.
- **Proposed:** Fix a 6-step scale, apply tabular numerals to every metric, cap measure at ~72ch on prose surfaces.
- **Effort:** S · **Risk:** Low.

### B-06 · Spacing and density — **gap: moderate** — P1 · Effort S · Risk Low
- **Current:** Card padding and section rhythm vary per route; some audit pages are cramped while marketing-ish pages are loose.
- **Proposed:** One spacing scale, two density modes (workspace dense, reading comfortable) chosen per route type.
- **Effort:** S · **Risk:** Low.

### B-07 · Interaction patterns — **gap: moderate** — P1 · Effort M · Risk Low
- **Current:** Actions are mostly full-page or inline-button; no optimistic feedback, no consistent confirmation or undo, keyboard support is incidental.
- **Proposed:** One action grammar: optimistic update, toast with undo where reversible, explicit confirm only where destructive. Add a command palette (⌘K) over routes, learners and gaps — the single highest perceived-speed feature in Linear-class tools.
- **Effort:** M · **Risk:** Low.

### B-08 · Accessibility — **gap: significant** — P0 · Effort M · Risk Low
- **Current:** Status is frequently colour-only (heatmap bands, risk chips), focus rings are inconsistent, several icon-only controls lack labels, contrast is unverified in dark mode.
- **Proposed:** WCAG AA pass: contrast audit both themes, visible focus on every interactive element, text or shape paired with every colour-coded status, labelled controls, keyboard path through the four primary journeys.
- **Business value:** School and district procurement asks for this in writing. **Effort:** M · **Risk:** Low.

### B-09 · Mobile UX — **gap: significant** — P0 · Effort M · Risk Medium
- **Current:** PWA install is shipped and points at a desktop-first layout. Wide tables (heatmap, question bank, audit grids) overflow; parents and students are phone-first.
- **Proposed:** Mobile pass on the four primary journeys — student home, parent outcomes, educator queue, reviewer queue. Tables become stacked cards below `md`; primary action is thumb-reachable; navigation collapses to a bottom bar for student/parent roles.
- **Business value:** The parent trust surface is only ever seen on a phone. **Effort:** M · **Risk:** Medium.

### B-10 · Trust design — **gap: significant** — P0 · Effort S–L · Risk Medium
- **Current:** Claims render as plain numbers with no attribution. Verification exists as a separate hub rather than as an attribute of each claim. Stripe's pattern — every assertion carries its provenance inline — is absent.
- **Proposed:** "Verified by <reviewer>, <date>" attribution on every closure and evidence row, with an unverified state that is visibly distinct rather than silently identical. Backed by the reviewer evidence queue (Approve / Query / Reject).
- **Business value:** Converts self-reported outcomes into signed ones — the credibility spine of the pilot. **Effort:** S for attribution, L for the reviewer queue · **Risk:** Medium.

### B-11 · Empty, loading and error states — **gap: significant** — P0 · Effort M · Risk Low
- **Current:** `QueryError` and `EmptyState` exist but are applied unevenly; a cold demo account shows blank cards on several routes.
- **Proposed:** Every data surface gets a skeleton, an empty state with a concrete next action, and a typed error with a retry. Verified by walking every route with a freshly seeded empty account.
- **Business value:** Cold demos are where pilots are won or lost. **Effort:** M · **Risk:** Low.

### Biggest gaps preventing 9/10, in order
1. No public product experience at all (Part A).
2. Claims are not attributable to a verifier (B-10).
3. Visual and metric inconsistency across 30+ routes (B-01, B-02).
4. Incomplete states on cold accounts (B-11).
5. Desktop-only layouts on phone-first audiences (B-09).
6. Accessibility baseline unmet for procurement (B-08).

---

# PART C — UX Phase 2 prioritisation

Wave 1 (navigation cleanup, shared closure header, gap-first student home) and the educator Wave (heatmap, intervention queue, cohort progress) are shipped. The next three waves are sequenced by business impact, not by effort.

## Wave 2 — Public trust and conversion · target ~2 weeks · **all P0**
| Item | Why now |
| --- | --- |
| A-01 Landing Page V2 | Nothing else in Part A can ship without it |
| A-02 How EduOS Works | Comprehension precedes trust |
| A-03 Closure loop visual | The core differentiator, currently invisible |
| A-05 AI tutor safety | Cheapest objection-killer available |
| A-09 Pilot CTA + leads capture | Without it the page cannot convert |
| A-04 Parent trust section | Parents drive centre retention |
| A-06 Sample outcome evidence | Makes the outcome claim inspectable |

**Exit criterion:** a centre owner who has never spoken to us can understand the loop, see one verified outcome chain, and apply for the pilot — on a phone.

## Wave 3 — Verification and consistency · target ~2 weeks · **P0 with one P1**
| Item | Why now |
| --- | --- |
| B-10 / R-01 Reviewer evidence queue (Approve / Query / Reject) | The credibility spine |
| B-10 / R-02 Verified-by attribution on every closure and evidence row | Turns claims into signed claims |
| B-02 / R-07 Canonical metric layer everywhere | Divergent numbers destroy demos |
| B-01 / R-03 Design-system pass across all routes | Largest perceived-quality lever |
| B-11 / R-04 State completeness on every data surface | Survives cold demos |
| B-04 Dashboard "today" narrative (P1) | Cheap once B-01 lands |

**Exit criterion:** every number on screen has one definition and one source, and every closure names its verifier.

## Wave 4 — Audience depth, mobile and accessibility · target ~2 weeks · **P0/P1 mix**
| Item | Why now |
| --- | --- |
| B-09 / R-05 Mobile pass on the four primary journeys | Parent and student surfaces are phone-first |
| R-06 Parent outcomes header | Retention surface |
| R-11 / R-13 Parent trends and tutor log | Answers "is it working?" and "was it worth it?" |
| B-08 / R-15 Accessibility AA baseline | Procurement requirement |
| R-08 / R-09 / R-10 Student loop timeline, 80% mastery target, evidence portfolio | Makes the loop legible to the learner |
| A-07 / A-08 / A-10 / A-11 Parent report sample, centre benefits, FAQ, SEO | Completes the public layer |
| B-07 Interaction grammar + command palette (P1) | Perceived speed |

**Deferred to P2 (post-pilot):** gap XP and badges, per-school reviewer compliance roll-up, reviewer report library, portal switcher, motion layer, print/PDF outcome pack, performance budgets on the three heaviest routes.

---

# Top 10 changes that move EduOS from 6.5/10 to 9/10

| # | Change | Part | Priority | Effort | Risk | Why it moves the score |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Ship a real landing page at `/` instead of an instant redirect to login | A-01 | P0 | M | Low | Today the product has no public face at all; this is the largest single perceived-quality and conversion gap |
| 2 | Reviewer evidence queue with Approve / Query / Reject | B-10 | P0 | L | Medium | External verification is the difference between a claimed outcome and a proven one |
| 3 | "Verified by <reviewer>, <date>" on every closure and evidence row | B-10 | P0 | S | Low | Highest trust gain per hour of work in the whole plan |
| 4 | Publish the Diagnostic → Gap → Intervention → Tutor → Reassessment → Evidence loop publicly, with one real sample chain | A-03 + A-06 | P0 | M | Medium | Turns the core differentiator from a sentence into an inspectable artefact |
| 5 | One canonical metric layer — closure rate, mastery and lift defined once and reused everywhere | B-02 | P0 | M | Medium | Inconsistent numbers between routes end buyer conversations instantly |
| 6 | Design-system pass: one token set, one card / table / badge / empty pattern across all routes | B-01 | P0 | M | Low | Consistency, not decoration, is what reads as premium |
| 7 | State completeness — skeletons, actionable empty states, typed errors on every data surface | B-11 | P0 | M | Low | A cold demo account currently shows blank cards; this is where first impressions die |
| 8 | Mobile pass on student home, parent outcomes, educator queue and reviewer queue | B-09 | P0 | M | Medium | Parents and students are phone-first and the PWA already points at a desktop layout |
| 9 | Parent trust layer: public trust section plus the parent outcomes header, trends and tutor log | A-04 + R-06 + R-11 + R-13 | P0/P1 | M | Low | Parents are the retention and referral engine for tutoring centres |
| 10 | Pilot CTA with qualified lead capture, plus AI tutor safety and FAQ answering the standard objections | A-09 + A-05 + A-10 | P0/P1 | S | Low | Converts the new public trust surface into actual pilot applications |

**Scoring logic:** items 1, 4, 9 and 10 lift the public and parent experience from absent to credible (≈ +1.5). Items 2, 3 and 5 make every claim attributable and internally consistent (≈ +0.7). Items 6, 7 and 8 remove the prototype signals — mixed styling, blank states, desktop-only layouts (≈ +0.3). Accessibility (B-08) is the floor beneath a 9: without it the score is capped regardless of the rest.

**Guardrail held throughout:** no aesthetic redesign for its own sake. Every item above is justified by student outcomes, parent trust, educator efficiency, reviewer confidence, centre adoption or pilot conversion — and every public claim ships only with evidence the code already enforces.
