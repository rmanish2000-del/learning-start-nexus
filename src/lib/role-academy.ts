// Role Academy — role-specific guided learning about EduOS itself.
//
// This module is CONTENT ONLY. It deliberately introduces no new onboarding
// engine: the Academy page reuses the existing help-center content, the
// guided-tour engine (`requestTour`), the intro dialog (`requestIntro`) and
// the shared UI primitives. Every stage below points at a route that exists
// in `src/routes/` today and describes an action the signed-in role is
// actually permitted to perform — no invented screens, metrics or workflows.

import type { AppRole } from "@/lib/roles";

export interface AcademyStage {
  /** Short screen name as it appears in the product. */
  screen: string;
  /** Real in-app route. Static paths only, so links are type-checked. */
  to?: string;
  /** Route pattern shown as text when the path needs an id. */
  routeHint?: string;
  /** Why this screen exists. */
  purpose: string;
  /** What the role does here. */
  actions: string[];
  /** What the screen produces / records. */
  outputs: string[];
  /** What this role may and may not do here. */
  permissions: string;
  /** Which screen leads here, and where it leads next. */
  flow: string;
  /** A concrete, safe thing a tester can do right now. */
  tryIt?: string;
}

export interface AcademyJourney {
  heading: string;
  intro: string;
  /** Existing guided tour to replay, when the role has one. */
  tourId?: string;
  stages: AcademyStage[];
  /** Internal tester scenarios — no credentials, no personal data. */
  scenarios: { title: string; steps: string[]; expected: string }[];
}

export const ROLE_ACADEMY: Record<AppRole, AcademyJourney> = {
  admin: {
    heading: "Admin academy",
    intro:
      "Admins set up who can use EduOS, grant free pilot journeys, keep verified content trustworthy and watch the platform's health. Admins never score learners and never edit stored evidence.",
    tourId: "educator-dashboard",
    stages: [
      {
        screen: "Pilot access",
        to: "/pilot-access",
        purpose:
          "Give a selected family the complete journey free of charge. Pilot access is not a ₹0 purchase — no order, payment or invoice is created, so pilot families never appear in revenue reporting.",
        actions: [
          "Grant access by parent email, optional subject scope and access length.",
          "Extend an active grant by 30 days.",
          "Revoke a grant — access stops immediately, history is preserved.",
        ],
        outputs: ["An audited pilot grant with reason, grant date, expiry and run count."],
        permissions: "Admin only. Every other role is redirected away from this route.",
        flow:
          "Comes before the parent journey: the family must already have an EduOS parent account. Leads to the parent signing in and starting the diagnostic.",
        tryIt: "Open Pilot access and read an existing grant row — status, subject scope, expiry and reason.",
      },
      {
        screen: "Admin & assignments",
        to: "/admin",
        purpose: "Manage organisation users and see the roles that govern every permission in the product.",
        actions: ["Review users and their roles.", "Open Assignments to map each learner to an educator."],
        outputs: ["Role rows and educator↔learner assignments that drive dashboards and RLS scoping."],
        permissions: "Admin only. Roles live in a separate table; they can never be self-assigned from the UI.",
        flow: "Follows pilot access; feeds the educator journey, which only shows assigned learners.",
        tryIt: "Open Assignments and confirm every active learner has an educator.",
      },
      {
        screen: "Automated verification",
        to: "/auto-verification",
        purpose:
          "Review how draft questions were checked against CBSE paper-pattern intelligence and which ones were auto-approved as EduOS verified.",
        actions: ["Re-read the deterministic verification run.", "Inspect approval and quarantine counts."],
        outputs: ["Immutable verification evidence per question; approved items become learner-visible."],
        permissions:
          "Admin and reviewer. Verification never invents a human reviewer identity — automated decisions are recorded as automated.",
        flow: "Follows content authoring; gates what the learner journey and PYQ practice can ever show.",
        tryIt: "Open Automated verification and compare the approved count with the quarantined count.",
      },
      {
        screen: "Verification hub",
        to: "/verification",
        purpose: "The single index of every audit centre: RLS probes, assessment audit, engine audits and launch readiness.",
        actions: ["Open any audit centre.", "Run the live RLS probes."],
        outputs: ["Deterministic pass/fail evidence for platform integrity."],
        permissions: "Admin and reviewer only.",
        flow: "Used continuously; the reviewer journey lives almost entirely inside this hub.",
        tryIt: "Open Verification and follow the link to RLS verification.",
      },
    ],
    scenarios: [
      {
        title: "Grant and revoke a pilot journey",
        steps: [
          "Open Pilot access.",
          "Grant access to an internal pilot parent account with a clear reason.",
          "Confirm the grant appears as active with the expected expiry.",
          "Revoke it and confirm the status changes while history stays visible.",
        ],
        expected: "No order, payment or invoice is created at any point.",
      },
      {
        title: "Confirm quarantined content cannot reach learners",
        steps: [
          "Open Automated verification and note the quarantined count.",
          "Open Question Bank and filter to quarantined items.",
          "Sign in as an internal learner and open Exam Pattern practice.",
        ],
        expected: "Only approved, verified questions appear in learner-facing practice.",
      },
    ],
  },

  reviewer: {
    heading: "Reviewer academy",
    intro:
      "Reviewers are read-only. Your job is to confirm that what EduOS claims is backed by evidence: verification runs, quarantine decisions, RLS isolation and the assessment evidence chain.",
    stages: [
      {
        screen: "Launch audit",
        to: "/launch-audit",
        purpose: "Your home page: platform readiness, checklist status and links to every audit centre.",
        actions: ["Read the readiness checklist.", "Follow links into individual audit centres."],
        outputs: ["A single readiness view assembled from live probes."],
        permissions: "Read-only. Reviewers are redirected away from every workspace route.",
        flow: "Starting point for all reviewer work.",
        tryIt: "Open Launch audit and note which checks are green.",
      },
      {
        screen: "Automated verification",
        to: "/auto-verification",
        purpose: "See the deterministic verification of draft questions and the resulting approve / hold decisions.",
        actions: ["Inspect accuracy, alignment, quality and duplicate signals.", "Read the quarantine reasons."],
        outputs: ["Verification evidence rows that cannot be edited after the fact."],
        permissions: "Read-only for reviewers. No approval can be attributed to a human who did not make it.",
        flow: "Follows content authoring; precedes SME review of anything held back.",
        tryIt: "Open Automated verification and read one quarantine reason end to end.",
      },
      {
        screen: "SME review — Mathematics and Science",
        to: "/sme-review",
        purpose: "Subject-matter review surface for items that automated verification could not approve on its own.",
        actions: ["Open the Mathematics or Science review workspace.", "Read each item with its curriculum mapping."],
        outputs: ["Subject review records tied to the specific question and outcome."],
        permissions: "Admin and reviewer. Learners and parents never see review surfaces.",
        flow: "Receives held items from automated verification; feeds the approved question bank.",
        tryIt: "Open SME review and switch between the Mathematics and Science subjects.",
      },
      {
        screen: "Evidence chain",
        to: "/assessment-audit",
        purpose: "Trace a real assessment from assignment through scoring to stored evidence, with the policy that protected each step.",
        actions: ["Follow a single assessment through the chain.", "Cross-check with RLS verification."],
        outputs: ["An append-only evidence trail — records are added, never edited or deleted."],
        permissions: "Read-only. Reviewers can read the chain but never alter an evidence record.",
        flow: "Closes the loop that started with question verification.",
        tryIt: "Open the assessment audit trail and confirm each step names the policy that allowed it.",
      },
    ],
    scenarios: [
      {
        title: "Verify isolation between organisations",
        steps: ["Open RLS verification.", "Run the cross-organisation probes.", "Read each blocked attempt."],
        expected: "Every cross-organisation read, insert and update is refused.",
      },
      {
        title: "Trace one question from draft to learner",
        steps: [
          "Pick an approved item in Automated verification.",
          "Find the same item in Question Bank.",
          "Confirm it is marked EduOS verified and approved.",
        ],
        expected: "Only items with complete verification evidence are learner-visible.",
      },
    ],
  },

  educator: {
    heading: "Educator academy",
    intro:
      "Educators run the learning loop for their assigned learners: read the gaps, approve a guided intervention, monitor AI Tutor practice and prove progress with a fresh reassessment.",
    tourId: "educator-dashboard",
    stages: [
      {
        screen: "Gap analysis",
        to: "/gap-analysis",
        purpose: "See which outcomes each learner is losing marks on, with full curriculum traceability.",
        actions: ["Open a learner's gaps.", "Read the outcome → topic → chapter mapping."],
        outputs: ["Gaps opened automatically for any outcome scored under 70%."],
        permissions: "Educators see only learners assigned to them, inside their organisation.",
        flow: "Created by diagnostic scoring; leads to intervention approval.",
        tryIt: "Open Gap analysis and read the weakest outcome for one learner.",
      },
      {
        screen: "Guided intervention",
        to: "/interventions",
        purpose: "Turn a recommendation produced by gap detection into an approved intervention the learner can act on.",
        actions: ["Review the recommendation and its target outcomes.", "Approve it."],
        outputs: ["An intervention visible to the learner, and AI Tutor access scoped to those outcomes."],
        permissions:
          "Educators and admins approve. Approving never changes a score and never closes a gap by itself.",
        flow: "Follows gap analysis; unlocks tutor practice.",
        tryIt: "Open Interventions and read a pending recommendation's target outcomes.",
      },
      {
        screen: "Tutor monitoring",
        to: "/learners",
        routeHint: "/learners/:learnerId",
        purpose: "See tutoring activity for a learner alongside assessments, gaps, interventions and outcomes.",
        actions: ["Open a learner profile.", "Review tutor sessions and practice history."],
        outputs: ["A single, append-only history per learner."],
        permissions:
          "Read-only with respect to evidence. The AI Tutor cannot change scores, mastery or gap status for anyone.",
        flow: "Follows intervention approval; tells you when the learner is ready to be reassessed.",
        tryIt: "Open a learner profile and switch to the tutor / practice history.",
      },
      {
        screen: "Fresh reassessment",
        to: "/assessments",
        purpose: "Prove whether the gap actually closed, using fresh questions the learner has not already seen.",
        actions: ["Generate and publish a reassessment.", "Assign it to the open outcome."],
        outputs: ["A reassessment result that alone determines whether the outcome closes or stays open."],
        permissions:
          "Only published assessments with approved, verified questions can be assigned. Reassessment questions are disjoint from the learner's diagnostic.",
        flow: "Last step of the loop; the result feeds Outcome Proof for parents.",
        tryIt: "Open Assessments and confirm only published assessments can be assigned.",
      },
    ],
    scenarios: [
      {
        title: "Close one learner loop",
        steps: [
          "Read a learner's weakest outcome in Gap analysis.",
          "Approve the recommended intervention.",
          "Let the learner practice with the AI Tutor.",
          "Publish and assign a fresh reassessment.",
        ],
        expected: "The gap status changes only after the reassessment is submitted and scored.",
      },
      {
        title: "Confirm the Tutor cannot close a gap",
        steps: ["Note a learner's open gap.", "Have the learner complete a tutor session.", "Re-open Gap analysis."],
        expected: "The gap is still open; only reassessment evidence can move it.",
      },
    ],
  },

  parent: {
    heading: "Parent academy",
    intro:
      "Parents own the account, unlock access for their child and read the evidence. Everything in the parent portal is read-only — you never mark work or change scores.",
    tourId: "parent-portal",
    stages: [
      {
        screen: "Sign in",
        to: "/auth",
        purpose: "Create or access your EduOS parent account with Google or email.",
        actions: ["Sign in with Google, or with your email and password."],
        outputs: ["A parent account that owns every purchase, learner and report on it."],
        permissions: "Parents reach the portal and the support pages only.",
        flow: "First step; everything else hangs off this account.",
        tryIt: "Sign out and back in to confirm you land on the parent portal.",
      },
      {
        screen: "Your child and access",
        to: "/parent",
        purpose: "Add your child, record AI Tutor consent and see how access was granted — pilot or paid.",
        actions: ["Add a learner.", "Record consent, which unlocks the AI Tutor.", "Review purchases and access."],
        outputs: ["A learner profile with a handle and 6-digit PIN, plus a consent record."],
        permissions:
          "Read-only for learning evidence. Pilot access is granted by an admin; paid access is the ₹199 diagnostic, credited toward the ₹2,999 Annual Plan if you upgrade within the credit window.",
        flow: "Follows sign-in; precedes the diagnostic.",
        tryIt: "Open the parent portal and check whether consent is recorded.",
      },
      {
        screen: "Diagnostic and report",
        to: "/parent",
        purpose: "Your child takes the diagnostic; you read the outcome-by-outcome report.",
        actions: ["Share the handle and PIN with your child.", "Read the report when it appears."],
        outputs: ["A per-outcome score breakdown and the gaps it opened."],
        permissions: "You can read everything about your own children and nothing about anyone else's.",
        flow: "Follows access; feeds the study plan and tutor practice.",
        tryIt: "Open the portal and read the most recent assessment score for your child.",
      },
      {
        screen: "Progress and outcome proof",
        to: "/outcome-proof",
        purpose: "See whether practice actually moved the needle, with the reassessment evidence behind it.",
        actions: ["Read the outcome status and the recommended next action."],
        outputs: ["Evidence of mastery lift, or a clear statement that the outcome is still open."],
        permissions: "Read-only. Parents read evidence; they never mark work or change a score.",
        flow: "Last stage of the loop, and the trigger for the next one.",
        tryIt: "Open Outcome proof and read the next action suggested for your child.",
      },
    ],
    scenarios: [
      {
        title: "Walk the family journey",
        steps: [
          "Sign in as a parent.",
          "Confirm your child is listed and consent is recorded.",
          "Wait for the diagnostic result and open the report.",
          "Open Outcome proof after the reassessment.",
        ],
        expected: "Every stage is visible and read-only; nothing about other families is ever shown.",
      },
    ],
  },

  student: {
    heading: "Learner academy",
    intro:
      "You sign in with your handle and 6-digit PIN. EduOS finds exactly what you need to practise, helps you practise it, then checks with fresh questions whether it stuck.",
    tourId: "student-home",
    stages: [
      {
        screen: "Sign in",
        to: "/auth",
        purpose: "Get into your own learning space with the handle and PIN your educator gave you.",
        actions: ["Enter your handle and 6-digit PIN."],
        outputs: ["A session that only ever shows your own work."],
        permissions: "You can see and change only your own answers and practice.",
        flow: "First step; leads to My Learning.",
        tryIt: "Sign in and check that My Learning is your landing page.",
      },
      {
        screen: "Diagnostic",
        to: "/home",
        purpose: "One assessment that finds which CBSE outcomes are costing you marks.",
        actions: ["Start the assigned assessment.", "Answer one question at a time — answers save as you go."],
        outputs: ["A score per outcome, and a focus area for anything under 70%."],
        permissions: "Scoring happens on the server; you cannot change a result after submitting.",
        flow: "Everything after this is built from your diagnostic.",
        tryIt: "Open My Learning and check whether an assessment is waiting at the top.",
      },
      {
        screen: "Gap plan and study plan",
        to: "/home",
        purpose: "See your focus areas and the step-by-step plan generated for each one.",
        actions: ["Open a focus area.", "Work through the plan steps."],
        outputs: ["A study plan tied to real curriculum outcomes."],
        permissions: "Yours only. The plan cannot change your score.",
        flow: "Follows the diagnostic; leads into tutor practice.",
        tryIt: "Open a focus area from My Learning and read the plan.",
      },
      {
        screen: "AI Tutor",
        to: "/home",
        routeHint: "/tutor/:sessionId",
        purpose: "Practise a focus area with explanations, hints, worked examples and practice questions.",
        actions: ["Start a tutor session from an approved focus area."],
        outputs: ["A practice history — never a change to your marks."],
        permissions:
          "Needs guardian consent and an approved intervention. The Tutor can never change your score or close a focus area.",
        flow: "Follows the study plan; prepares you for reassessment.",
        tryIt: "Open My Learning and check whether the Tutor is unlocked for you.",
      },
      {
        screen: "Reassessment",
        to: "/home",
        purpose: "Fresh questions on the same outcome — the only thing that can close a focus area.",
        actions: ["Take the reassessment when it appears on your home page."],
        outputs: ["New evidence alongside your diagnostic; your mastery ring updates."],
        permissions: "Questions are always different from your diagnostic questions.",
        flow: "Closes the loop that started with the diagnostic.",
        tryIt: "Check My Learning for a reassessment waiting for you.",
      },
      {
        screen: "CBSE paper practice",
        to: "/exam-pattern",
        purpose: "Practise on real CBSE Class 10 paper patterns for Mathematics and Science.",
        actions: [
          "Choose a subject, year and set.",
          "Take a full timed paper, or practise one chapter.",
          "Review your answers and attempt history.",
        ],
        outputs: ["A practice attempt with per-question review, saved to your own history."],
        permissions: "Only approved, verified questions ever appear here.",
        flow: "Runs alongside the loop — most useful once your focus areas are under control.",
        tryIt: "Open Exam pattern and start a chapter practice in one subject.",
      },
    ],
    scenarios: [
      {
        title: "One full learning loop",
        steps: [
          "Sign in with handle and PIN.",
          "Finish the diagnostic.",
          "Read your focus plan and practise with the Tutor.",
          "Take the reassessment when it appears.",
        ],
        expected: "Your mastery updates only after the reassessment is submitted.",
      },
      {
        title: "Paper-pattern practice",
        steps: ["Open Exam pattern.", "Pick a subject, year and set.", "Complete a timed full paper.", "Review the answers."],
        expected: "The attempt is saved in your own history and visible to nobody else's account.",
      },
    ],
  },
};
