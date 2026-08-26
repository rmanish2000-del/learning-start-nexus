# EduOS — UX Phase 1 Implementation Plan

- **Live app reviewed:** https://www.eduos.global
- **Redesign reviewed:** https://push-skier-80543376.figma.site/
- **Date:** 2026-08-26
- **Portals reviewed:** Student, Parent, Educator, Reviewer
- **Redesign screens read (16):** Student → My Gaps; Student → Journey; Student → Mastery; Student → Gap XP; Student → Evidence; Parent → Outcomes; Parent → Evidence; Parent → Tutor; Parent → Trends; Educator → Gap Heatmap; Educator → Interventions; Educator → Cohort; Educator → Verification; Reviewer → Evidence Queue; Reviewer → Closure Validation; Reviewer → Reports
- **In-app report:** `/ux-phase1-plan` (admin and reviewer only)

Optimised for student outcomes, parent trust, educator efficiency, reviewer evidence flow and pilot success — not aesthetics. Screens absent from the redesign are recorded as "No redesign reference"; no designs were invented.

## Summary

### P0 (7)

| ID | Change | Role | Effort | Risk |
| --- | --- | --- | --- | --- |
| UX-01 | Student home becomes a gap-first screen with one highest-priority action | Student | M | Low |
| UX-02 | Gap closure counter on every role's first screen | All roles | S | Low |
| UX-03 | Educator class gap heatmap (student × subject) | Educator | M | Low |
| UX-04 | Prioritised intervention queue with days-in-phase and inline act/log | Educator | M | Medium |
| UX-05 | Reviewer evidence queue with status filters and decision actions | Reviewer | L | Medium |
| UX-06 | Verified-by attribution on every closure (Educator vs Reviewer) | Parent | S | Low |
| UX-07 | Collapse 15 audit links into a single Verification hub | All roles | S | Low |

### P1 (9)

| ID | Change | Role | Effort | Risk |
| --- | --- | --- | --- | --- |
| UX-08 | Student loop journey timeline per gap | Student | M | Medium |
| UX-09 | Subject mastery against an explicit 80% target | Student | S | Low |
| UX-10 | Student evidence portfolio with verification state | Student | S | Low |
| UX-11 | Parent outcomes header: closure, verified evidence, tutor minutes, trend | Parent | M | Low |
| UX-12 | Parent tutor log with linked gap and next scheduled session | Parent | M | Medium |
| UX-13 | Parent trends: baseline → now → target with point gain per subject | Parent | S | Low |
| UX-14 | Educator cohort view: subject mastery distribution and term closures | Educator | S | Low |
| UX-15 | Educator verification status panel | Educator | S | Low |
| UX-16 | Reviewer closure validation with per-school compliance rates | Reviewer | L | High |

### P2 (3)

| ID | Change | Role | Effort | Risk |
| --- | --- | --- | --- | --- |
| UX-17 | Gap XP levels and outcome-linked badges | Student | M | Medium |
| UX-18 | Reviewer report library with generated downloads | Reviewer | L | Medium |
| UX-19 | Portal switcher in the header | All roles | S | High |

## Recommended implementation order

### Wave 1 — Outcome visibility — Week 1

Items: UX-07, UX-02, UX-01

Nav cleanup is a one-day change that makes every demo readable. The shared closure header then reuses metrics that already exist, and the student gap-first screen turns visibility into action. No schema changes, so nothing blocks.

### Wave 2 — Educator efficiency — Week 2

Items: UX-03, UX-04

Heatmap plus prioritised queue is the largest saving in educator time per closed gap, and both are read-side only.

### Wave 3 — Evidence flow — Weeks 3–4

Items: UX-05, UX-06, UX-15

The reviewer queue introduces the only new write path; verified-by attribution and the educator status panel land immediately after so the loop is visible end to end.

### Wave 4 — Parent trust — Week 5

Items: UX-11, UX-13, UX-12

Once verification is authoritative, parent screens can claim verified outcomes truthfully. Tutor scheduling is the only part that may slip.

### Wave 5 — Learner depth — Week 6

Items: UX-08, UX-09, UX-10, UX-14

Journey, mastery targets, portfolio and cohort distribution deepen the story without changing the operating model.

### Deferred — needs a decision, not a sprint — Post-pilot

Items: UX-16, UX-17, UX-18, UX-19

District compliance needs a tenant-group model, XP needs verification to be authoritative first, reports duplicate existing audit exports, and portal switching is a security decision rather than a UX one.

## Detailed changes

### UX-01 — Student home becomes a gap-first screen with one highest-priority action

**Priority:** P0 · **Role:** Student · **Redesign reference:** Student → My Gaps

**Current state.** /home opens with a greeting, a getting-started checklist, an assessments card, a focus plan and a mastery card. Gaps are not the organising unit; the learner must infer what to do next from five competing cards.

**Proposed state.** Gap-first layout: a single 'Highest priority — do this now' banner with a Start action, then active gaps sorted by urgency, each showing subject, current loop stage (Diagnostic / Gap / Intervention / Tutor / Reassessment / Evidence), current mastery, days in phase and one recommended action.

**Business value.** Pilot success is judged on gap closure rate. Making the next action unambiguous is the single largest lever on learner throughput per week.

**User value.** The learner never has to decide what to work on; one tap from login to the right activity.

**Engineering effort.** Medium (3–5 days) — Reorders and re-renders existing data (learning_gaps, recommendations, interventions, mastery). No new pipeline.

**Risk.** Low — Presentation-layer change on one route; existing cards can be retained lower on the page during pilot.

**Components affected.** src/routes/_authenticated/home.tsx, new PriorityActionCard, new GapQueueList, new LoopStageStepper

**Screens affected.** /home

**Database impact.** None. learning_gaps, recommendations, interventions, mastery_history already carry every field shown.

**API impact.** Extend the existing student read server fn to return gaps ordered by urgency with the resolved next action. No new endpoint.

### UX-02 — Gap closure counter on every role's first screen

**Priority:** P0 · **Role:** All roles · **Redesign reference:** Student → My Gaps header; Parent → Outcomes header; Educator → Gap Heatmap header

**Current state.** Closure counts exist only inside /outcome-proof and /pilot-evidence. Students, parents and educators see mastery percentages but never 'X of Y gaps closed'.

**Proposed state.** A consistent header strip on /home, /parent and /dashboard: gaps closed of total, closure rate this term, active gaps needing action, and the trend direction — the same four numbers everywhere so roles can talk to each other.

**Business value.** One shared outcome vocabulary across learner, parent, educator and reviewer; makes pilot reporting self-evident rather than exported.

**User value.** Every user can answer 'are we winning?' in under two seconds.

**Engineering effort.** Small (≤2 days) — Reuses the closure maths already implemented for the outcome dashboard.

**Risk.** Low — Read-only aggregate; must reuse existing metric definitions so numbers cannot diverge between screens.

**Components affected.** new OutcomeHeaderStrip, src/lib/outcome-dashboard-shared.ts, home.tsx, parent.tsx, dashboard.tsx

**Screens affected.** /home, /parent, /dashboard

**Database impact.** None.

**API impact.** Reuse getOutcomeDashboard aggregates; add a lightweight per-role summary selector.

### UX-03 — Educator class gap heatmap (student × subject)

**Priority:** P0 · **Role:** Educator · **Redesign reference:** Educator → Gap Heatmap

**Current state.** /dashboard shows roster health and intervention outcomes as lists; /gap-analysis analyses one learner or outcome set at a time. There is no single view of the whole class.

**Proposed state.** A matrix of learners × subjects with gap counts, density banding (0 / 1–2 / 3–4 / 5–7 / 8+), per-student risk chips (On track / At risk / Critical), row and column totals, and click-through from any cell to the filtered learner view.

**Business value.** Educator time is the scarcest pilot resource; triage across a class in one screen instead of per-learner navigation.

**User value.** Immediately shows who and which subject to intervene on today.

**Engineering effort.** Medium (3–5 days) — One aggregate query plus a matrix component; drill-in targets already exist.

**Risk.** Low — Read-only. Watch performance on large rosters — aggregate server-side, not in the browser.

**Components affected.** new GapHeatmap, new RiskBadge, src/lib/gap.server.ts, dashboard.tsx or /gap-analysis

**Screens affected.** /dashboard, /gap-analysis, /learners

**Database impact.** None for the matrix. Optional index on learning_gaps(org_id, learner_id, subject, status) for roster-scale reads.

**API impact.** New read server fn getClassGapMatrix (RLS-scoped to the educator's assigned learners).

### UX-04 — Prioritised intervention queue with days-in-phase and inline act/log

**Priority:** P0 · **Role:** Educator · **Redesign reference:** Educator → Interventions

**Current state.** /interventions lists active interventions and detected gaps without urgency ranking, without days-in-phase, and with actions one navigation step away.

**Proposed state.** A numbered queue sorted by urgency (mastery, stage, days stalled), each row showing learner, gap, stage, days in phase and mastery, with inline Log and Act buttons, plus a one-line 'N students need action today' summary above the list.

**Business value.** Reduces stalled interventions — the main cause of unclosed gaps in a pilot term.

**User value.** Turns a list into a worklist the educator can clear.

**Engineering effort.** Medium (3–5 days) — Ranking function plus inline actions over existing intervention mutations.

**Risk.** Medium — Ranking must be deterministic and explainable, otherwise educators distrust the order. Ship the rule text next to the list.

**Components affected.** src/routes/_authenticated/interventions.tsx, new InterventionQueueRow, src/lib/intervention-shared.ts

**Screens affected.** /interventions, /dashboard

**Database impact.** None — days-in-phase derives from existing timestamps. Add stage_entered_at only if phase changes are not currently timestamped.

**API impact.** Extend interventions read fn with ranking + days-in-phase; reuse existing log/act mutations.

### UX-05 — Reviewer evidence queue with status filters and decision actions

**Priority:** P0 · **Role:** Reviewer · **Redesign reference:** Reviewer → Evidence Queue

**Current state.** Reviewers land on /launch-audit and read audit centres. Evidence review is possible only for questions (question_verifications); there is no learner-evidence queue and no approve / query / reject decision path.

**Proposed state.** A queue of submitted evidence (learner, school, subject, type, timestamp, score) with counts for Pending / Approved / Query raised / Rejected, status filters, a detail pane, and three decisions: Approve, Raise query, Reject — each writing an auditable record.

**Business value.** External verification is the credibility spine of the pilot; without a queue the evidence flow is manual and unprovable.

**User value.** Reviewer works a single inbox to zero instead of hunting across audit pages.

**Engineering effort.** Large (1–2 weeks) — New table, new server fns, new screen, new RLS policies, plus notification of the educator on query/reject.

**Risk.** Medium — Writes by a role that is read-only today. Must keep reviewer writes confined to verification records — never to scores, mastery or evidence content.

**Components affected.** new /evidence-queue route, new EvidenceQueueList, new EvidenceDecisionPanel, src/lib/verification.functions.ts

**Screens affected.** new reviewer queue, /launch-audit, /parent (verified-by attribution)

**Database impact.** New table evidence_verifications (evidence_id, reviewer_id, decision, note, decided_at, org_id) with GRANTs and RLS; reviewer role gains INSERT on it only.

**API impact.** New server fns: listEvidenceQueue, decideEvidence (requireAnyRole reviewer/admin). Existing evidence reads unchanged.

### UX-06 — Verified-by attribution on every closure (Educator vs Reviewer)

**Priority:** P0 · **Role:** Parent · **Redesign reference:** Parent → Outcomes / Evidence; Student → Evidence; Educator → Verification

**Current state.** Closures and evidence show status and score but not who verified them. Parents cannot distinguish a teacher-marked item from an externally validated one.

**Proposed state.** Every closure and evidence row shows 'Verified by Educator' or 'Verified by Reviewer' with the date, and pending items are explicitly labelled 'Awaiting verification'.

**Business value.** Parent trust and pilot defensibility both rest on the difference between internal and external validation.

**User value.** Parents see proof, not claims; educators see what is still awaiting external sign-off.

**Engineering effort.** Small (≤2 days) — Rendering plus a verifier reference; small once UX-05 lands.

**Risk.** Low — Depends on UX-05 for reviewer decisions; educator verification can ship first.

**Components affected.** new VerifiedByBadge, parent.tsx, home.tsx, new educator verification panel

**Screens affected.** /parent, /home, /dashboard

**Database impact.** learner_evidence gains verified_by (uuid) and verified_role, or these are read from evidence_verifications introduced in UX-05.

**API impact.** Evidence read fns return verifier identity and role; no new endpoint.

### UX-07 — Collapse 15 audit links into a single Verification hub

**Priority:** P0 · **Role:** All roles · **Redesign reference:** Every portal in the redesign uses 3–5 nav items

**Current state.** The sidebar System group carries 15 audit/verification entries. Even for admins the navigation reads as internal scaffolding rather than a product.

**Proposed state.** One 'Verification' entry opening a hub that indexes every audit centre by sprint/domain. Deep links keep working. Workspace nav drops to the redesign's small item count for all roles.

**Business value.** Pilot demos and reviewer onboarding stop being derailed by internal QA surfaces.

**User value.** Navigation is scannable; audits remain one click from the hub.

**Engineering effort.** Small (≤2 days) — Nav config change plus an index page listing the existing routes.

**Risk.** Low — Pure navigation; no route removal, so bookmarks and audit evidence links survive.

**Components affected.** src/components/app-shell.tsx, new /verification hub index

**Screens affected.** All authenticated screens (sidebar)

**Database impact.** None.

**API impact.** None.

### UX-08 — Student loop journey timeline per gap

**Priority:** P1 · **Role:** Student · **Redesign reference:** Student → Journey

**Current state.** The six-stage loop exists in the data but is never shown as a sequence. Learners see activities, not a story of how a gap gets closed.

**Proposed state.** A vertical timeline per unit/gap: Diagnostic → Gap Detection → Intervention → Tutor → Reassessment → Evidence, each entry dated with its outcome, the current stage marked 'In progress', and future stages shown as locked with their unlock condition.

**Business value.** Demonstrates the EduOS loop to every stakeholder inside the product instead of in a deck.

**User value.** Learners see progress and understand why the next step is locked.

**Engineering effort.** Medium (3–5 days) — Cross-table event assembly (assessments, gaps, interventions, tutor sessions, reassessments, evidence) into one ordered feed.

**Risk.** Medium — Timeline correctness depends on consistent timestamps across five tables; needs a deterministic assembler with tests.

**Components affected.** new GapJourneyTimeline, new src/lib/journey.server.ts, home.tsx

**Screens affected.** /home, /learners/$learnerId (educator view of same timeline)

**Database impact.** None if all stage events are timestamped; otherwise add gap_stage_events.

**API impact.** New read fn getGapJourney(gapId).

### UX-09 — Subject mastery against an explicit 80% target

**Priority:** P1 · **Role:** Student · **Redesign reference:** Student → Mastery

**Current state.** Mastery renders as a trend chart without a target line; a percentage alone gives no sense of sufficiency.

**Proposed state.** Per subject: current mastery, active gap count, topics mastered, and a bar with a marked target threshold, labelled 'based on verified assessments only'.

**Business value.** Anchors the pilot to a stated mastery standard rather than relative improvement.

**User value.** Learner knows how far they are from 'good enough' per subject.

**Engineering effort.** Small (≤2 days) — Chart/bar rendering over existing mastery data; the threshold becomes an org setting.

**Risk.** Low — Target must be configurable per organisation, not hardcoded.

**Components affected.** new SubjectMasteryBar, src/components/mastery-chart.tsx, home.tsx, parent.tsx

**Screens affected.** /home, /parent

**Database impact.** organizations gains mastery_target_pct (default 80).

**API impact.** Mastery read fns return the org target alongside scores.

### UX-10 — Student evidence portfolio with verification state

**Priority:** P1 · **Role:** Student · **Redesign reference:** Student → Evidence

**Current state.** Evidence is visible to staff and reviewers; the learner has no portfolio view of their own verified work.

**Proposed state.** Counters for verified / pending / total, then a list of evidence items with type, date, score and verification state.

**Business value.** Evidence becomes motivating output for the learner, increasing completion of reassessments.

**User value.** The learner sees a growing record of proven work.

**Engineering effort.** Small (≤2 days) — New read view over learner_evidence with student-scoped RLS.

**Risk.** Low — Must expose only the learner's own rows; verify with a cross-learner probe.

**Components affected.** new EvidencePortfolio, home.tsx

**Screens affected.** /home

**Database impact.** learner_evidence SELECT policy for the owning student (verify current policy before adding).

**API impact.** New read fn getMyEvidence.

### UX-11 — Parent outcomes header: closure, verified evidence, tutor minutes, trend

**Priority:** P1 · **Role:** Parent · **Redesign reference:** Parent → Outcomes

**Current state.** /parent leads with consent and a mastery chart; outcome totals are secondary and tutor minutes are not surfaced at all.

**Proposed state.** Header row: gaps closed of total, still open, closure rate, verified evidence count, tutor minutes this term, overall mastery, and trend direction — then active gaps with stage and days, then verified closures.

**Business value.** Parent trust is the retention lever for a paid pilot; activity metrics do not build it, verified outcomes do.

**User value.** A parent understands their child's position in 10 seconds without interpretation.

**Engineering effort.** Medium (3–5 days) — Mostly assembly; tutor minutes per gap already exist via the tutor evidence view.

**Risk.** Low — Must stay strictly scoped to linked children (parent_learner_links) — already enforced, retest after the change.

**Components affected.** parent.tsx, OutcomeHeaderStrip (from UX-02), src/lib/outcome-dashboard.server.ts

**Screens affected.** /parent

**Database impact.** None — tutor_evidence_by_gap and mastery_history cover it.

**API impact.** Extend the parent read fn with the tutor-minutes and closure aggregates.

### UX-12 — Parent tutor log with linked gap and next scheduled session

**Priority:** P1 · **Role:** Parent · **Redesign reference:** Parent → Tutor

**Current state.** Tutor sessions are not shown to parents; tutor time is invisible outside pilot evidence pages.

**Proposed state.** Totals (minutes this term, sessions completed of planned, gaps supported), a session list with tutor, date, duration and outcome, and a 'Next session' card naming the linked gap and the reassessment that follows.

**Business value.** Directly justifies tutoring spend with gap-linked minutes — the clearest commercial proof point in the pilot.

**User value.** Parents see what tutoring bought, and what happens next.

**Engineering effort.** Medium (3–5 days) — Read view is straightforward; scheduling is the new part.

**Risk.** Medium — Only ship 'Next session' if scheduling data is real. Without a scheduling model the card must be omitted, not faked.

**Components affected.** new TutorSessionLog, parent.tsx, src/lib/tutor.server.ts

**Screens affected.** /parent

**Database impact.** tutor_sessions gains scheduled_at and educator_id for planned sessions (completed-session reads need no change).

**API impact.** New read fn getChildTutorLog; scheduling mutation only if the schedule feature is approved.

### UX-13 — Parent trends: baseline → now → target with point gain per subject

**Priority:** P1 · **Role:** Parent · **Redesign reference:** Parent → Trends

**Current state.** A mastery-over-time chart without a baseline marker, target marker or stated gain.

**Proposed state.** Per subject: diagnostic baseline, current verified mastery, target, gain in percentage points, open gap count — plus a plain-language 'subjects needing attention' note derived from the same numbers.

**Business value.** Mastery lift is the headline pilot metric; showing it per subject makes renewal conversations concrete.

**User value.** Parents see movement, not just a level.

**Engineering effort.** Small (≤2 days) — Baseline is the first diagnostic score already stored in mastery_history.

**Risk.** Low — The attention note must be rule-derived and deterministic, never model-generated.

**Components affected.** new SubjectTrendRow, parent.tsx, src/lib/outcome-shared.ts

**Screens affected.** /parent

**Database impact.** None.

**API impact.** Extend the parent trends read fn with baseline and delta fields.

### UX-14 — Educator cohort view: subject mastery distribution and term closures

**Priority:** P1 · **Role:** Educator · **Redesign reference:** Educator → Cohort

**Current state.** Class-level aggregates live in /outcome-proof, which is framed as an executive dashboard rather than a teaching tool.

**Proposed state.** Class average mastery, total active gaps, gaps closed this term, and a per-subject bar list ordered worst-first with gap counts.

**Business value.** Lets a centre manager compare classes and spot subject-level curriculum problems, not just learner problems.

**User value.** Educator sees which subject is dragging the class.

**Engineering effort.** Small (≤2 days) — Aggregates already computed for the outcome dashboard.

**Risk.** Low — None material; read-only.

**Components affected.** new CohortDistribution, dashboard.tsx, src/lib/outcome-dashboard.server.ts

**Screens affected.** /dashboard

**Database impact.** None.

**API impact.** Reuse existing centre aggregates with a subject breakdown.

### UX-15 — Educator verification status panel

**Priority:** P1 · **Role:** Educator · **Redesign reference:** Educator → Verification

**Current state.** Educators cannot see where their submitted evidence sits in the reviewer's queue.

**Proposed state.** A panel listing submitted items with learner, subject, type, date and state (Verified / In review / Pending), plus the rule statement that closures are only confirmed on reviewer validation.

**Business value.** Closes the loop between submission and external validation, raising verification throughput.

**User value.** Educator knows what is blocked on the reviewer and what needs resubmission.

**Engineering effort.** Small (≤2 days) — Read view over the UX-05 verification records.

**Risk.** Low — Depends on UX-05.

**Components affected.** new VerificationStatusPanel, dashboard.tsx

**Screens affected.** /dashboard

**Database impact.** Reads evidence_verifications from UX-05.

**API impact.** New read fn listMySubmittedEvidence.

### UX-16 — Reviewer closure validation with per-school compliance rates

**Priority:** P1 · **Role:** Reviewer · **Redesign reference:** Reviewer → Closure Validation

**Current state.** No closure-validation step exists; audit centres prove system behaviour, not per-school evidence compliance.

**Proposed state.** An explanation of what closure validation means, then a per-school list showing verified / pending / total submissions with a compliance percentage and a below-threshold warning.

**Business value.** Gives a district or chain buyer the oversight view that justifies multi-site rollout.

**User value.** Reviewer targets site visits at the schools that are actually behind.

**Engineering effort.** Large (1–2 weeks) — Multi-school comparison crosses the current single-organisation RLS model; needs a district scope before it can be truthful with real data.

**Risk.** High — Do NOT widen tenant isolation to build this. It requires an explicit district/tenant-group model with its own policies — a scoped design task, not a UI change.

**Components affected.** new ClosureValidation screen, src/lib/verification.functions.ts, RLS policies

**Screens affected.** new reviewer screen

**Database impact.** New districts / org_groups table plus reviewer scope mapping, with GRANTs and RLS. Significant.

**API impact.** New district-scoped read fns; every one needs a cross-district denial probe.

### UX-17 — Gap XP levels and outcome-linked badges

**Priority:** P2 · **Role:** Student · **Redesign reference:** Student → Gap XP

**Current state.** No gamification. Motivation depends entirely on the mastery chart.

**Proposed state.** XP earned only for verified gap closures and high reassessment scores, a level indicator, and badges tied to closure outcomes — with the rule stated on screen that content completion and logins earn nothing.

**Business value.** Potential engagement lift, but it is not what the pilot is measured on.

**User value.** Recognition for closing gaps rather than for time spent.

**Engineering effort.** Medium (3–5 days) — New ledger table, award rules, badge assets and an audit view of awards.

**Risk.** Medium — Any XP that can be earned without a verified closure corrupts the outcome narrative. Ship only after UX-05/UX-06 make verification authoritative.

**Components affected.** new XpLedger, new BadgeGrid, new src/lib/xp.server.ts

**Screens affected.** /home

**Database impact.** New tables xp_events and badge_awards with GRANTs and RLS; awards written server-side only.

**API impact.** Award hook on verified closure; new read fn getMyXp.

### UX-18 — Reviewer report library with generated downloads

**Priority:** P2 · **Role:** Reviewer · **Redesign reference:** Reviewer → Reports

**Current state.** /pilot-evidence and the audit centres are printable but there is no report library with ready/pending/scheduled states.

**Proposed state.** A list of standard reports (closure summary, intervention effectiveness, compliance audit, at-risk cohort) with status, date and download.

**Business value.** Useful for a district sale; not required for pilot evidence, which the audit centres already cover.

**User value.** Reviewer exports without asking anyone.

**Engineering effort.** Large (1–2 weeks) — Report generation, storage of artefacts, and a scheduling concept.

**Risk.** Medium — Generated files must inherit tenant scope; a mis-scoped export leaks across organisations.

**Components affected.** new ReportLibrary, report generation server fns, storage bucket

**Screens affected.** new reviewer screen

**Database impact.** New table generated_reports plus a storage bucket with org-scoped paths.

**API impact.** New generate/list/download fns, all org-scoped.

### UX-19 — Portal switcher in the header

**Priority:** P2 · **Role:** All roles · **Redesign reference:** Every portal → 'Switch Portal'

**Current state.** Role is fixed by the signed-in account; the context bar already shows role, organisation and educator.

**Proposed state.** Keep as-is for real users. Optionally a demo-only switcher for admins to preview each portal — never a way to assume another role's data.

**Business value.** Demo convenience only.

**User value.** Minimal; the prototype needs it because it has no login.

**Engineering effort.** Small (≤2 days) — Presentation-only preview toggle if built at all.

**Risk.** High — A literal implementation is a privilege-escalation surface. Recommendation: do not build role switching; if a preview is needed it must render sample data, never another user's records.

**Components affected.** src/components/app-shell.tsx

**Screens affected.** All authenticated screens (header)

**Database impact.** None.

**API impact.** None — must not touch role resolution.

## No redesign reference

| Live screen | Note |
| --- | --- |
| `/auth (sign-in, staff + student PIN)` | Prototype starts after login — keep current implementation unchanged. |
| `/learners and /learners/$learnerId (5-tab learner profile)` | Educator drill-in target exists in Figma only as a heatmap cell click; the destination screen is not designed. |
| `/curriculum, /curriculum-audit` | Curriculum intake and tree view absent from the prototype. |
| `/assessment-blueprint, /question-bank, /assessment-builder, /diagnostic-engine` | Authoring pipeline absent from the prototype. |
| `/gap-analysis (current staff gap workspace)` | Redesign shows a heatmap instead, but does not design the existing analytic drill-downs. |
| `/assessments, /assignments, /session/$id, /assessment/$id` | Assessment delivery and assignment flows absent. |
| `/tutor/$sessionId (AI Tutor chat)` | Referenced as a loop stage only; no tutor chat screen designed. |
| `/admin, /settings` | Provisioning, roles, consent admin, appearance — absent. |
| `/quick-start, /help` | Onboarding and help surfaces absent. |
| `/pilot-evidence, /outcome-proof` | Reviewer Reports tab is adjacent but is a download list, not these dashboards. |
| `All 15 *-audit / verification centres` | Absent — the prototype has no internal QA surface at all. |
