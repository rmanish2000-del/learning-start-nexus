// UX Phase 1 implementation plan — single source of truth.
// Compares the live EduOS workspace (https://www.eduos.global) against the
// Figma UX redesign prototype (https://push-skier-80543376.figma.site/).
// Rendered by /ux-phase1-plan and exported to EDUOS_UX_PHASE1_IMPLEMENTATION_PLAN.md.
// Nothing here is invented: screens absent from the redesign are marked
// "No redesign reference".

export type Priority = "P0" | "P1" | "P2";
export type Effort = "S" | "M" | "L";
export type RiskLevel = "Low" | "Medium" | "High";

export type PlanItem = {
  id: string;
  title: string;
  priority: Priority;
  role: "Student" | "Parent" | "Educator" | "Reviewer" | "All roles";
  figmaRef: string;
  currentState: string;
  proposedState: string;
  businessValue: string;
  userValue: string;
  effort: Effort;
  effortNote: string;
  risk: RiskLevel;
  riskNote: string;
  components: string[];
  screens: string[];
  dbImpact: string;
  apiImpact: string;
};

export const PLAN_META = {
  liveApp: "https://www.eduos.global",
  figma: "https://push-skier-80543376.figma.site/",
  reviewedOn: "2026-08-26",
  portalsReviewed: ["Student", "Parent", "Educator", "Reviewer"],
  figmaScreens: [
    "Student → My Gaps",
    "Student → Journey",
    "Student → Mastery",
    "Student → Gap XP",
    "Student → Evidence",
    "Parent → Outcomes",
    "Parent → Evidence",
    "Parent → Tutor",
    "Parent → Trends",
    "Educator → Gap Heatmap",
    "Educator → Interventions",
    "Educator → Cohort",
    "Educator → Verification",
    "Reviewer → Evidence Queue",
    "Reviewer → Closure Validation",
    "Reviewer → Reports",
  ],
};

/** Live screens with no counterpart anywhere in the redesign prototype. */
export const NO_REDESIGN_REFERENCE: { screen: string; note: string }[] = [
  { screen: "/auth (sign-in, staff + student PIN)", note: "Prototype starts after login — keep current implementation unchanged." },
  { screen: "/learners and /learners/$learnerId (5-tab learner profile)", note: "Educator drill-in target exists in Figma only as a heatmap cell click; the destination screen is not designed." },
  { screen: "/curriculum, /curriculum-audit", note: "Curriculum intake and tree view absent from the prototype." },
  { screen: "/assessment-blueprint, /question-bank, /assessment-builder, /diagnostic-engine", note: "Authoring pipeline absent from the prototype." },
  { screen: "/gap-analysis (current staff gap workspace)", note: "Redesign shows a heatmap instead, but does not design the existing analytic drill-downs." },
  { screen: "/assessments, /assignments, /session/$id, /assessment/$id", note: "Assessment delivery and assignment flows absent." },
  { screen: "/tutor/$sessionId (AI Tutor chat)", note: "Referenced as a loop stage only; no tutor chat screen designed." },
  { screen: "/admin, /settings", note: "Provisioning, roles, consent admin, appearance — absent." },
  { screen: "/quick-start, /help", note: "Onboarding and help surfaces absent." },
  { screen: "/pilot-evidence, /outcome-proof", note: "Reviewer Reports tab is adjacent but is a download list, not these dashboards." },
  { screen: "All 15 *-audit / verification centres", note: "Absent — the prototype has no internal QA surface at all." },
];

export const PLAN_ITEMS: PlanItem[] = [
  // ---------------------------------------------------------------- P0
  {
    id: "UX-01",
    title: "Student home becomes a gap-first screen with one highest-priority action",
    priority: "P0",
    role: "Student",
    figmaRef: "Student → My Gaps",
    currentState:
      "/home opens with a greeting, a getting-started checklist, an assessments card, a focus plan and a mastery card. Gaps are not the organising unit; the learner must infer what to do next from five competing cards.",
    proposedState:
      "Gap-first layout: a single 'Highest priority — do this now' banner with a Start action, then active gaps sorted by urgency, each showing subject, current loop stage (Diagnostic / Gap / Intervention / Tutor / Reassessment / Evidence), current mastery, days in phase and one recommended action.",
    businessValue:
      "Pilot success is judged on gap closure rate. Making the next action unambiguous is the single largest lever on learner throughput per week.",
    userValue: "The learner never has to decide what to work on; one tap from login to the right activity.",
    effort: "M",
    effortNote: "Reorders and re-renders existing data (learning_gaps, recommendations, interventions, mastery). No new pipeline.",
    risk: "Low",
    riskNote: "Presentation-layer change on one route; existing cards can be retained lower on the page during pilot.",
    components: ["src/routes/_authenticated/home.tsx", "new PriorityActionCard", "new GapQueueList", "new LoopStageStepper"],
    screens: ["/home"],
    dbImpact: "None. learning_gaps, recommendations, interventions, mastery_history already carry every field shown.",
    apiImpact: "Extend the existing student read server fn to return gaps ordered by urgency with the resolved next action. No new endpoint.",
  },
  {
    id: "UX-02",
    title: "Gap closure counter on every role's first screen",
    priority: "P0",
    role: "All roles",
    figmaRef: "Student → My Gaps header; Parent → Outcomes header; Educator → Gap Heatmap header",
    currentState:
      "Closure counts exist only inside /outcome-proof and /pilot-evidence. Students, parents and educators see mastery percentages but never 'X of Y gaps closed'.",
    proposedState:
      "A consistent header strip on /home, /parent and /dashboard: gaps closed of total, closure rate this term, active gaps needing action, and the trend direction — the same four numbers everywhere so roles can talk to each other.",
    businessValue: "One shared outcome vocabulary across learner, parent, educator and reviewer; makes pilot reporting self-evident rather than exported.",
    userValue: "Every user can answer 'are we winning?' in under two seconds.",
    effort: "S",
    effortNote: "Reuses the closure maths already implemented for the outcome dashboard.",
    risk: "Low",
    riskNote: "Read-only aggregate; must reuse existing metric definitions so numbers cannot diverge between screens.",
    components: ["new OutcomeHeaderStrip", "src/lib/outcome-dashboard-shared.ts", "home.tsx", "parent.tsx", "dashboard.tsx"],
    screens: ["/home", "/parent", "/dashboard"],
    dbImpact: "None.",
    apiImpact: "Reuse getOutcomeDashboard aggregates; add a lightweight per-role summary selector.",
  },
  {
    id: "UX-03",
    title: "Educator class gap heatmap (student × subject)",
    priority: "P0",
    role: "Educator",
    figmaRef: "Educator → Gap Heatmap",
    currentState:
      "/dashboard shows roster health and intervention outcomes as lists; /gap-analysis analyses one learner or outcome set at a time. There is no single view of the whole class.",
    proposedState:
      "A matrix of learners × subjects with gap counts, density banding (0 / 1–2 / 3–4 / 5–7 / 8+), per-student risk chips (On track / At risk / Critical), row and column totals, and click-through from any cell to the filtered learner view.",
    businessValue: "Educator time is the scarcest pilot resource; triage across a class in one screen instead of per-learner navigation.",
    userValue: "Immediately shows who and which subject to intervene on today.",
    effort: "M",
    effortNote: "One aggregate query plus a matrix component; drill-in targets already exist.",
    risk: "Low",
    riskNote: "Read-only. Watch performance on large rosters — aggregate server-side, not in the browser.",
    components: ["new GapHeatmap", "new RiskBadge", "src/lib/gap.server.ts", "dashboard.tsx or /gap-analysis"],
    screens: ["/dashboard", "/gap-analysis", "/learners"],
    dbImpact: "None for the matrix. Optional index on learning_gaps(org_id, learner_id, subject, status) for roster-scale reads.",
    apiImpact: "New read server fn getClassGapMatrix (RLS-scoped to the educator's assigned learners).",
  },
  {
    id: "UX-04",
    title: "Prioritised intervention queue with days-in-phase and inline act/log",
    priority: "P0",
    role: "Educator",
    figmaRef: "Educator → Interventions",
    currentState:
      "/interventions lists active interventions and detected gaps without urgency ranking, without days-in-phase, and with actions one navigation step away.",
    proposedState:
      "A numbered queue sorted by urgency (mastery, stage, days stalled), each row showing learner, gap, stage, days in phase and mastery, with inline Log and Act buttons, plus a one-line 'N students need action today' summary above the list.",
    businessValue: "Reduces stalled interventions — the main cause of unclosed gaps in a pilot term.",
    userValue: "Turns a list into a worklist the educator can clear.",
    effort: "M",
    effortNote: "Ranking function plus inline actions over existing intervention mutations.",
    risk: "Medium",
    riskNote: "Ranking must be deterministic and explainable, otherwise educators distrust the order. Ship the rule text next to the list.",
    components: ["src/routes/_authenticated/interventions.tsx", "new InterventionQueueRow", "src/lib/intervention-shared.ts"],
    screens: ["/interventions", "/dashboard"],
    dbImpact: "None — days-in-phase derives from existing timestamps. Add stage_entered_at only if phase changes are not currently timestamped.",
    apiImpact: "Extend interventions read fn with ranking + days-in-phase; reuse existing log/act mutations.",
  },
  {
    id: "UX-05",
    title: "Reviewer evidence queue with status filters and decision actions",
    priority: "P0",
    role: "Reviewer",
    figmaRef: "Reviewer → Evidence Queue",
    currentState:
      "Reviewers land on /launch-audit and read audit centres. Evidence review is possible only for questions (question_verifications); there is no learner-evidence queue and no approve / query / reject decision path.",
    proposedState:
      "A queue of submitted evidence (learner, school, subject, type, timestamp, score) with counts for Pending / Approved / Query raised / Rejected, status filters, a detail pane, and three decisions: Approve, Raise query, Reject — each writing an auditable record.",
    businessValue: "External verification is the credibility spine of the pilot; without a queue the evidence flow is manual and unprovable.",
    userValue: "Reviewer works a single inbox to zero instead of hunting across audit pages.",
    effort: "L",
    effortNote: "New table, new server fns, new screen, new RLS policies, plus notification of the educator on query/reject.",
    risk: "Medium",
    riskNote: "Writes by a role that is read-only today. Must keep reviewer writes confined to verification records — never to scores, mastery or evidence content.",
    components: ["new /evidence-queue route", "new EvidenceQueueList", "new EvidenceDecisionPanel", "src/lib/verification.functions.ts"],
    screens: ["new reviewer queue", "/launch-audit", "/parent (verified-by attribution)"],
    dbImpact:
      "New table evidence_verifications (evidence_id, reviewer_id, decision, note, decided_at, org_id) with GRANTs and RLS; reviewer role gains INSERT on it only.",
    apiImpact: "New server fns: listEvidenceQueue, decideEvidence (requireAnyRole reviewer/admin). Existing evidence reads unchanged.",
  },
  {
    id: "UX-06",
    title: "Verified-by attribution on every closure (Educator vs Reviewer)",
    priority: "P0",
    role: "Parent",
    figmaRef: "Parent → Outcomes / Evidence; Student → Evidence; Educator → Verification",
    currentState:
      "Closures and evidence show status and score but not who verified them. Parents cannot distinguish a teacher-marked item from an externally validated one.",
    proposedState:
      "Every closure and evidence row shows 'Verified by Educator' or 'Verified by Reviewer' with the date, and pending items are explicitly labelled 'Awaiting verification'.",
    businessValue: "Parent trust and pilot defensibility both rest on the difference between internal and external validation.",
    userValue: "Parents see proof, not claims; educators see what is still awaiting external sign-off.",
    effort: "S",
    effortNote: "Rendering plus a verifier reference; small once UX-05 lands.",
    risk: "Low",
    riskNote: "Depends on UX-05 for reviewer decisions; educator verification can ship first.",
    components: ["new VerifiedByBadge", "parent.tsx", "home.tsx", "new educator verification panel"],
    screens: ["/parent", "/home", "/dashboard"],
    dbImpact: "learner_evidence gains verified_by (uuid) and verified_role, or these are read from evidence_verifications introduced in UX-05.",
    apiImpact: "Evidence read fns return verifier identity and role; no new endpoint.",
  },
  {
    id: "UX-07",
    title: "Collapse 15 audit links into a single Verification hub",
    priority: "P0",
    role: "All roles",
    figmaRef: "Every portal in the redesign uses 3–5 nav items",
    currentState:
      "The sidebar System group carries 15 audit/verification entries. Even for admins the navigation reads as internal scaffolding rather than a product.",
    proposedState:
      "One 'Verification' entry opening a hub that indexes every audit centre by sprint/domain. Deep links keep working. Workspace nav drops to the redesign's small item count for all roles.",
    businessValue: "Pilot demos and reviewer onboarding stop being derailed by internal QA surfaces.",
    userValue: "Navigation is scannable; audits remain one click from the hub.",
    effort: "S",
    effortNote: "Nav config change plus an index page listing the existing routes.",
    risk: "Low",
    riskNote: "Pure navigation; no route removal, so bookmarks and audit evidence links survive.",
    components: ["src/components/app-shell.tsx", "new /verification hub index"],
    screens: ["All authenticated screens (sidebar)"],
    dbImpact: "None.",
    apiImpact: "None.",
  },

  // ---------------------------------------------------------------- P1
  {
    id: "UX-08",
    title: "Student loop journey timeline per gap",
    priority: "P1",
    role: "Student",
    figmaRef: "Student → Journey",
    currentState:
      "The six-stage loop exists in the data but is never shown as a sequence. Learners see activities, not a story of how a gap gets closed.",
    proposedState:
      "A vertical timeline per unit/gap: Diagnostic → Gap Detection → Intervention → Tutor → Reassessment → Evidence, each entry dated with its outcome, the current stage marked 'In progress', and future stages shown as locked with their unlock condition.",
    businessValue: "Demonstrates the EduOS loop to every stakeholder inside the product instead of in a deck.",
    userValue: "Learners see progress and understand why the next step is locked.",
    effort: "M",
    effortNote: "Cross-table event assembly (assessments, gaps, interventions, tutor sessions, reassessments, evidence) into one ordered feed.",
    risk: "Medium",
    riskNote: "Timeline correctness depends on consistent timestamps across five tables; needs a deterministic assembler with tests.",
    components: ["new GapJourneyTimeline", "new src/lib/journey.server.ts", "home.tsx"],
    screens: ["/home", "/learners/$learnerId (educator view of same timeline)"],
    dbImpact: "None if all stage events are timestamped; otherwise add gap_stage_events.",
    apiImpact: "New read fn getGapJourney(gapId).",
  },
  {
    id: "UX-09",
    title: "Subject mastery against an explicit 80% target",
    priority: "P1",
    role: "Student",
    figmaRef: "Student → Mastery",
    currentState: "Mastery renders as a trend chart without a target line; a percentage alone gives no sense of sufficiency.",
    proposedState:
      "Per subject: current mastery, active gap count, topics mastered, and a bar with a marked target threshold, labelled 'based on verified assessments only'.",
    businessValue: "Anchors the pilot to a stated mastery standard rather than relative improvement.",
    userValue: "Learner knows how far they are from 'good enough' per subject.",
    effort: "S",
    effortNote: "Chart/bar rendering over existing mastery data; the threshold becomes an org setting.",
    risk: "Low",
    riskNote: "Target must be configurable per organisation, not hardcoded.",
    components: ["new SubjectMasteryBar", "src/components/mastery-chart.tsx", "home.tsx", "parent.tsx"],
    screens: ["/home", "/parent"],
    dbImpact: "organizations gains mastery_target_pct (default 80).",
    apiImpact: "Mastery read fns return the org target alongside scores.",
  },
  {
    id: "UX-10",
    title: "Student evidence portfolio with verification state",
    priority: "P1",
    role: "Student",
    figmaRef: "Student → Evidence",
    currentState: "Evidence is visible to staff and reviewers; the learner has no portfolio view of their own verified work.",
    proposedState: "Counters for verified / pending / total, then a list of evidence items with type, date, score and verification state.",
    businessValue: "Evidence becomes motivating output for the learner, increasing completion of reassessments.",
    userValue: "The learner sees a growing record of proven work.",
    effort: "S",
    effortNote: "New read view over learner_evidence with student-scoped RLS.",
    risk: "Low",
    riskNote: "Must expose only the learner's own rows; verify with a cross-learner probe.",
    components: ["new EvidencePortfolio", "home.tsx"],
    screens: ["/home"],
    dbImpact: "learner_evidence SELECT policy for the owning student (verify current policy before adding).",
    apiImpact: "New read fn getMyEvidence.",
  },
  {
    id: "UX-11",
    title: "Parent outcomes header: closure, verified evidence, tutor minutes, trend",
    priority: "P1",
    role: "Parent",
    figmaRef: "Parent → Outcomes",
    currentState: "/parent leads with consent and a mastery chart; outcome totals are secondary and tutor minutes are not surfaced at all.",
    proposedState:
      "Header row: gaps closed of total, still open, closure rate, verified evidence count, tutor minutes this term, overall mastery, and trend direction — then active gaps with stage and days, then verified closures.",
    businessValue: "Parent trust is the retention lever for a paid pilot; activity metrics do not build it, verified outcomes do.",
    userValue: "A parent understands their child's position in 10 seconds without interpretation.",
    effort: "M",
    effortNote: "Mostly assembly; tutor minutes per gap already exist via the tutor evidence view.",
    risk: "Low",
    riskNote: "Must stay strictly scoped to linked children (parent_learner_links) — already enforced, retest after the change.",
    components: ["parent.tsx", "OutcomeHeaderStrip (from UX-02)", "src/lib/outcome-dashboard.server.ts"],
    screens: ["/parent"],
    dbImpact: "None — tutor_evidence_by_gap and mastery_history cover it.",
    apiImpact: "Extend the parent read fn with the tutor-minutes and closure aggregates.",
  },
  {
    id: "UX-12",
    title: "Parent tutor log with linked gap and next scheduled session",
    priority: "P1",
    role: "Parent",
    figmaRef: "Parent → Tutor",
    currentState: "Tutor sessions are not shown to parents; tutor time is invisible outside pilot evidence pages.",
    proposedState:
      "Totals (minutes this term, sessions completed of planned, gaps supported), a session list with tutor, date, duration and outcome, and a 'Next session' card naming the linked gap and the reassessment that follows.",
    businessValue: "Directly justifies tutoring spend with gap-linked minutes — the clearest commercial proof point in the pilot.",
    userValue: "Parents see what tutoring bought, and what happens next.",
    effort: "M",
    effortNote: "Read view is straightforward; scheduling is the new part.",
    risk: "Medium",
    riskNote: "Only ship 'Next session' if scheduling data is real. Without a scheduling model the card must be omitted, not faked.",
    components: ["new TutorSessionLog", "parent.tsx", "src/lib/tutor.server.ts"],
    screens: ["/parent"],
    dbImpact: "tutor_sessions gains scheduled_at and educator_id for planned sessions (completed-session reads need no change).",
    apiImpact: "New read fn getChildTutorLog; scheduling mutation only if the schedule feature is approved.",
  },
  {
    id: "UX-13",
    title: "Parent trends: baseline → now → target with point gain per subject",
    priority: "P1",
    role: "Parent",
    figmaRef: "Parent → Trends",
    currentState: "A mastery-over-time chart without a baseline marker, target marker or stated gain.",
    proposedState:
      "Per subject: diagnostic baseline, current verified mastery, target, gain in percentage points, open gap count — plus a plain-language 'subjects needing attention' note derived from the same numbers.",
    businessValue: "Mastery lift is the headline pilot metric; showing it per subject makes renewal conversations concrete.",
    userValue: "Parents see movement, not just a level.",
    effort: "S",
    effortNote: "Baseline is the first diagnostic score already stored in mastery_history.",
    risk: "Low",
    riskNote: "The attention note must be rule-derived and deterministic, never model-generated.",
    components: ["new SubjectTrendRow", "parent.tsx", "src/lib/outcome-shared.ts"],
    screens: ["/parent"],
    dbImpact: "None.",
    apiImpact: "Extend the parent trends read fn with baseline and delta fields.",
  },
  {
    id: "UX-14",
    title: "Educator cohort view: subject mastery distribution and term closures",
    priority: "P1",
    role: "Educator",
    figmaRef: "Educator → Cohort",
    currentState: "Class-level aggregates live in /outcome-proof, which is framed as an executive dashboard rather than a teaching tool.",
    proposedState: "Class average mastery, total active gaps, gaps closed this term, and a per-subject bar list ordered worst-first with gap counts.",
    businessValue: "Lets a centre manager compare classes and spot subject-level curriculum problems, not just learner problems.",
    userValue: "Educator sees which subject is dragging the class.",
    effort: "S",
    effortNote: "Aggregates already computed for the outcome dashboard.",
    risk: "Low",
    riskNote: "None material; read-only.",
    components: ["new CohortDistribution", "dashboard.tsx", "src/lib/outcome-dashboard.server.ts"],
    screens: ["/dashboard"],
    dbImpact: "None.",
    apiImpact: "Reuse existing centre aggregates with a subject breakdown.",
  },
  {
    id: "UX-15",
    title: "Educator verification status panel",
    priority: "P1",
    role: "Educator",
    figmaRef: "Educator → Verification",
    currentState: "Educators cannot see where their submitted evidence sits in the reviewer's queue.",
    proposedState:
      "A panel listing submitted items with learner, subject, type, date and state (Verified / In review / Pending), plus the rule statement that closures are only confirmed on reviewer validation.",
    businessValue: "Closes the loop between submission and external validation, raising verification throughput.",
    userValue: "Educator knows what is blocked on the reviewer and what needs resubmission.",
    effort: "S",
    effortNote: "Read view over the UX-05 verification records.",
    risk: "Low",
    riskNote: "Depends on UX-05.",
    components: ["new VerificationStatusPanel", "dashboard.tsx"],
    screens: ["/dashboard"],
    dbImpact: "Reads evidence_verifications from UX-05.",
    apiImpact: "New read fn listMySubmittedEvidence.",
  },
  {
    id: "UX-16",
    title: "Reviewer closure validation with per-school compliance rates",
    priority: "P1",
    role: "Reviewer",
    figmaRef: "Reviewer → Closure Validation",
    currentState: "No closure-validation step exists; audit centres prove system behaviour, not per-school evidence compliance.",
    proposedState:
      "An explanation of what closure validation means, then a per-school list showing verified / pending / total submissions with a compliance percentage and a below-threshold warning.",
    businessValue: "Gives a district or chain buyer the oversight view that justifies multi-site rollout.",
    userValue: "Reviewer targets site visits at the schools that are actually behind.",
    effort: "L",
    effortNote:
      "Multi-school comparison crosses the current single-organisation RLS model; needs a district scope before it can be truthful with real data.",
    risk: "High",
    riskNote:
      "Do NOT widen tenant isolation to build this. It requires an explicit district/tenant-group model with its own policies — a scoped design task, not a UI change.",
    components: ["new ClosureValidation screen", "src/lib/verification.functions.ts", "RLS policies"],
    screens: ["new reviewer screen"],
    dbImpact: "New districts / org_groups table plus reviewer scope mapping, with GRANTs and RLS. Significant.",
    apiImpact: "New district-scoped read fns; every one needs a cross-district denial probe.",
  },

  // ---------------------------------------------------------------- P2
  {
    id: "UX-17",
    title: "Gap XP levels and outcome-linked badges",
    priority: "P2",
    role: "Student",
    figmaRef: "Student → Gap XP",
    currentState: "No gamification. Motivation depends entirely on the mastery chart.",
    proposedState:
      "XP earned only for verified gap closures and high reassessment scores, a level indicator, and badges tied to closure outcomes — with the rule stated on screen that content completion and logins earn nothing.",
    businessValue: "Potential engagement lift, but it is not what the pilot is measured on.",
    userValue: "Recognition for closing gaps rather than for time spent.",
    effort: "M",
    effortNote: "New ledger table, award rules, badge assets and an audit view of awards.",
    risk: "Medium",
    riskNote:
      "Any XP that can be earned without a verified closure corrupts the outcome narrative. Ship only after UX-05/UX-06 make verification authoritative.",
    components: ["new XpLedger", "new BadgeGrid", "new src/lib/xp.server.ts"],
    screens: ["/home"],
    dbImpact: "New tables xp_events and badge_awards with GRANTs and RLS; awards written server-side only.",
    apiImpact: "Award hook on verified closure; new read fn getMyXp.",
  },
  {
    id: "UX-18",
    title: "Reviewer report library with generated downloads",
    priority: "P2",
    role: "Reviewer",
    figmaRef: "Reviewer → Reports",
    currentState: "/pilot-evidence and the audit centres are printable but there is no report library with ready/pending/scheduled states.",
    proposedState: "A list of standard reports (closure summary, intervention effectiveness, compliance audit, at-risk cohort) with status, date and download.",
    businessValue: "Useful for a district sale; not required for pilot evidence, which the audit centres already cover.",
    userValue: "Reviewer exports without asking anyone.",
    effort: "L",
    effortNote: "Report generation, storage of artefacts, and a scheduling concept.",
    risk: "Medium",
    riskNote: "Generated files must inherit tenant scope; a mis-scoped export leaks across organisations.",
    components: ["new ReportLibrary", "report generation server fns", "storage bucket"],
    screens: ["new reviewer screen"],
    dbImpact: "New table generated_reports plus a storage bucket with org-scoped paths.",
    apiImpact: "New generate/list/download fns, all org-scoped.",
  },
  {
    id: "UX-19",
    title: "Portal switcher in the header",
    priority: "P2",
    role: "All roles",
    figmaRef: "Every portal → 'Switch Portal'",
    currentState: "Role is fixed by the signed-in account; the context bar already shows role, organisation and educator.",
    proposedState:
      "Keep as-is for real users. Optionally a demo-only switcher for admins to preview each portal — never a way to assume another role's data.",
    businessValue: "Demo convenience only.",
    userValue: "Minimal; the prototype needs it because it has no login.",
    effort: "S",
    effortNote: "Presentation-only preview toggle if built at all.",
    risk: "High",
    riskNote:
      "A literal implementation is a privilege-escalation surface. Recommendation: do not build role switching; if a preview is needed it must render sample data, never another user's records.",
    components: ["src/components/app-shell.tsx"],
    screens: ["All authenticated screens (header)"],
    dbImpact: "None.",
    apiImpact: "None — must not touch role resolution.",
  },
];

export const SEQUENCE: { wave: string; window: string; items: string[]; rationale: string }[] = [
  {
    wave: "Wave 1 — Outcome visibility",
    window: "Week 1",
    items: ["UX-07", "UX-02", "UX-01"],
    rationale:
      "Nav cleanup is a one-day change that makes every demo readable. The shared closure header then reuses metrics that already exist, and the student gap-first screen turns visibility into action. No schema changes, so nothing blocks.",
  },
  {
    wave: "Wave 2 — Educator efficiency",
    window: "Week 2",
    items: ["UX-03", "UX-04"],
    rationale: "Heatmap plus prioritised queue is the largest saving in educator time per closed gap, and both are read-side only.",
  },
  {
    wave: "Wave 3 — Evidence flow",
    window: "Weeks 3–4",
    items: ["UX-05", "UX-06", "UX-15"],
    rationale:
      "The reviewer queue introduces the only new write path; verified-by attribution and the educator status panel land immediately after so the loop is visible end to end.",
  },
  {
    wave: "Wave 4 — Parent trust",
    window: "Week 5",
    items: ["UX-11", "UX-13", "UX-12"],
    rationale: "Once verification is authoritative, parent screens can claim verified outcomes truthfully. Tutor scheduling is the only part that may slip.",
  },
  {
    wave: "Wave 5 — Learner depth",
    window: "Week 6",
    items: ["UX-08", "UX-09", "UX-10", "UX-14"],
    rationale: "Journey, mastery targets, portfolio and cohort distribution deepen the story without changing the operating model.",
  },
  {
    wave: "Deferred — needs a decision, not a sprint",
    window: "Post-pilot",
    items: ["UX-16", "UX-17", "UX-18", "UX-19"],
    rationale:
      "District compliance needs a tenant-group model, XP needs verification to be authoritative first, reports duplicate existing audit exports, and portal switching is a security decision rather than a UX one.",
  },
];
