// Pilot readiness: help & orientation content.
// All copy lives here so the intro dialog, quick-start page, and help center
// stay in sync. Everything is static — no server calls, safe for every role.

import type { AppRole } from "@/lib/roles";

// ---------------------------------------------------------------------------
// First login: "How EduOS Works"
// ---------------------------------------------------------------------------

export interface HowItWorksStep {
  title: string;
  body: string;
}

export interface HowItWorksContent {
  heading: string;
  intro: string;
  steps: HowItWorksStep[];
  /** Guided tour to offer from the intro (roles without a tour omit it). */
  tourId?: string;
}

const CORE_LOOP =
  "EduOS runs one continuous loop: Diagnostic → Gap detection → Intervention → AI Tutor practice → Reassessment → Mastery lift.";

export const HOW_IT_WORKS: Record<AppRole, HowItWorksContent> = {
  admin: {
    heading: "How EduOS Works",
    intro: `${CORE_LOOP} As admin you set up the people and assignments that make the loop run.`,
    steps: [
      {
        title: "Set up learners and educators",
        body: "Create learner profiles and assign each learner to an educator from the Assignments page.",
      },
      {
        title: "Diagnostics find the gaps",
        body: "Educators assign diagnostics. Scores under 70% automatically open a learning gap with a recommended intervention.",
      },
      {
        title: "Interventions drive practice",
        body: "Approved interventions unlock the AI Tutor, scoped to exactly what the learner needs to work on.",
      },
      {
        title: "Reassessment proves progress",
        body: "Reassessments compute mastery lift per outcome — the evidence that learning actually happened.",
      },
    ],
    tourId: "educator-dashboard",
  },
  educator: {
    heading: "How EduOS Works",
    intro: `${CORE_LOOP} You drive the loop for every learner in your roster.`,
    steps: [
      {
        title: "Add learners, assign diagnostics",
        body: "Add a learner, then assign a published diagnostic. It appears on the student's home screen immediately.",
      },
      {
        title: "Gaps surface automatically",
        body: "When a learner scores under 70%, EduOS opens a gap per weak outcome and recommends an intervention.",
      },
      {
        title: "Approve interventions",
        body: "Approving a recommendation creates the intervention and unlocks the AI Tutor for that learner — scoped to the approved outcomes.",
      },
      {
        title: "Reassess and prove lift",
        body: "Reassessments feed the mastery index so you can show parents exactly how far each learner has come.",
      },
    ],
    tourId: "educator-dashboard",
  },
  student: {
    heading: "How EduOS Works",
    intro:
      "EduOS figures out exactly what you need to practice, then helps you master it. Work top to bottom on your home page.",
    steps: [
      {
        title: "Take your diagnostic",
        body: "Your educator assigns a short assessment. Answer honestly — it's used to build your personal plan, not to grade you.",
      },
      {
        title: "Get your focus plan",
        body: "Anything you found tricky becomes a focus area. Your educator approves a plan to fix each one.",
      },
      {
        title: "Practice with the AI Tutor",
        body: "The tutor explains, hints, and gives examples and practice — only for your approved focus areas. A parent approves it first.",
      },
      {
        title: "Reassess and level up",
        body: "Short reassessments show your progress. Your mastery ring fills as focus areas turn into strengths.",
      },
    ],
    tourId: "student-home",
  },
  parent: {
    heading: "How EduOS Works",
    intro:
      "EduOS shows you exactly what your child is working on and whether it's working. Everything you see is read-only.",
    steps: [
      {
        title: "Record consent",
        body: "Your consent unlocks the AI Tutor for your child. Assessments and plans work either way — consent only gates the tutor.",
      },
      {
        title: "Follow the learning loop",
        body: "Your child takes diagnostics, receives a focus plan, and practices with the AI Tutor between reassessments.",
      },
      {
        title: "Track progress",
        body: "The portal shows live mastery, recent assessment scores, and active interventions — updated as your child works.",
      },
      {
        title: "Talk to the educator",
        body: "Questions about the plan? Your child's educator sees the same evidence and can adjust the approach.",
      },
    ],
    tourId: "parent-portal",
  },
  reviewer: {
    heading: "How EduOS Works",
    intro:
      "You have read-only access to the audit surfaces. Every claim EduOS makes is backed by a verification page you can run yourself.",
    steps: [
      {
        title: "Start at the Launch Audit",
        body: "The launch readiness audit is your home — it summarizes platform health and links to every other audit center.",
      },
      {
        title: "Verify data isolation",
        body: "The RLS verification page runs live cross-organization probes proving tenants can't see each other's data.",
      },
      {
        title: "Trace the evidence chain",
        body: "Assessment audit shows the full chain from assignment to scored evidence. Nothing is edited, only appended.",
      },
      {
        title: "Run the sprint audits",
        body: "Each engine (blueprint, question bank, builder, diagnostics, gaps) has an audit center with deterministic probes.",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Role-based quick start pages
// ---------------------------------------------------------------------------

export interface QuickStartStep {
  title: string;
  body: string;
  /** In-app destination for the step's call-to-action. */
  to?: string;
  cta?: string;
}

export interface QuickStartContent {
  heading: string;
  intro: string;
  steps: QuickStartStep[];
  tourId?: string;
}

export const QUICK_START: Record<AppRole, QuickStartContent> = {
  admin: {
    heading: "Admin quick start",
    intro: "Get your organization running: people first, then the learning loop.",
    steps: [
      {
        title: "Assign educators to learners",
        body: "Every learner needs an educator before diagnostics and interventions flow correctly.",
        to: "/assignments",
        cta: "Open Assignments",
      },
      {
        title: "Review the dashboard",
        body: "The dashboard shows live stats, learners needing attention, and pending interventions across your org.",
        to: "/dashboard",
        cta: "Open Dashboard",
      },
      {
        title: "Check the curriculum",
        body: "Confirm the uploaded curriculum tree and outcomes match what your center teaches.",
        to: "/curriculum",
        cta: "Open Curriculum",
      },
      {
        title: "Verify platform health",
        body: "The launch audit runs live checks across auth, RLS, and every engine — run it before onboarding staff.",
        to: "/launch-audit",
        cta: "Open Launch Audit",
      },
    ],
    tourId: "educator-dashboard",
  },
  educator: {
    heading: "Educator quick start",
    intro: "Five steps to your first proven outcome. The checklist on your dashboard tracks them live.",
    steps: [
      {
        title: "Add your learners",
        body: "Create a learner profile for each student. They sign in with a handle and 6-digit PIN.",
        to: "/learners",
        cta: "Open Learners",
      },
      {
        title: "Assign a diagnostic",
        body: "Pick a published assessment and assign it. Your learner sees it on their home screen right away.",
        to: "/assessments",
        cta: "Open Assessments",
      },
      {
        title: "Review gaps",
        body: "Scores under 70% open gaps per outcome. Gap analysis shows exactly which topics need work.",
        to: "/gap-analysis",
        cta: "Open Gap Analysis",
      },
      {
        title: "Approve interventions",
        body: "Each gap comes with a recommendation. Approving it creates the intervention and unlocks the AI Tutor.",
        to: "/interventions",
        cta: "Open Interventions",
      },
      {
        title: "Reassess and show lift",
        body: "Assign the reassessment when the learner is ready. The outcome report computes mastery lift per outcome.",
        to: "/learners",
        cta: "Open a Learner Profile",
      },
    ],
    tourId: "educator-dashboard",
  },
  student: {
    heading: "Student quick start",
    intro: "Everything you need is on your home page — work from top to bottom.",
    steps: [
      {
        title: "Finish your diagnostic",
        body: "Your assigned assessment is at the top of your home page. Take your time; you can resume if you stop.",
        to: "/home",
        cta: "Go to My Learning",
      },
      {
        title: "Check your focus plan",
        body: "After your diagnostic, your focus areas appear with a plan your educator approved for you.",
        to: "/home",
        cta: "See My Plan",
      },
      {
        title: "Practice with the AI Tutor",
        body: "Ask for an explanation, a hint, an example, or practice questions. The tutor only covers your approved focus areas.",
        to: "/home",
        cta: "Open the Tutor",
      },
      {
        title: "Fill your mastery ring",
        body: "Reassessments update your mastery. Watch the ring fill as focus areas become strengths.",
        to: "/home",
        cta: "See My Progress",
      },
    ],
    tourId: "student-home",
  },
  parent: {
    heading: "Parent quick start",
    intro: "Two things to do, one thing to watch. Everything here is read-only.",
    steps: [
      {
        title: "Record consent",
        body: "Consent unlocks the AI Tutor for your child. Without it, assessments and plans still work — only the tutor stays locked.",
        to: "/parent",
        cta: "Open Parent Portal",
      },
      {
        title: "Review progress",
        body: "See live mastery, recent assessment scores, and active interventions for your child.",
        to: "/parent",
        cta: "See Progress",
      },
      {
        title: "Understand the loop",
        body: "Diagnostic → focus plan → AI Tutor practice → reassessment. The portal shows each stage as it happens.",
        to: "/parent",
        cta: "View the Journey",
      },
    ],
    tourId: "parent-portal",
  },
  reviewer: {
    heading: "Reviewer quick start",
    intro: "Your access is read-only and audit-focused. These four pages verify the platform end to end.",
    steps: [
      {
        title: "Launch readiness audit",
        body: "Your home page: platform health, launch checklist status, and links to every audit center.",
        to: "/launch-audit",
        cta: "Open Launch Audit",
      },
      {
        title: "RLS verification",
        body: "Live cross-organization probes: attempt to read, create, and update another org's data and watch every attempt get blocked.",
        to: "/rls-verification",
        cta: "Run RLS Probes",
      },
      {
        title: "Assessment audit trail",
        body: "Trace a real assessment from assignment through scoring to stored evidence — with the policy names that protected each step.",
        to: "/assessment-audit",
        cta: "Open Audit Trail",
      },
      {
        title: "Engine audit centers",
        body: "Blueprint, question bank, builder, diagnostic engine, and gap analysis each have deterministic audit probes.",
        to: "/gap-analysis-audit",
        cta: "Open Gap Audit",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Help center: searchable articles
// ---------------------------------------------------------------------------

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  /** Roles that see the article, or "all". */
  roles: AppRole[] | "all";
  summary: string;
  keywords: string[];
  body: string[];
}

export const HELP_CATEGORIES = [
  "Getting started",
  "Assessments",
  "Interventions & AI Tutor",
  "Progress & reports",
  "Account & privacy",
  "Audits & verification",
] as const;

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "sign-in",
    title: "Signing in and your role home",
    category: "Getting started",
    roles: "all",
    summary: "Staff sign in with email; students use a handle and 6-digit PIN. Each role lands on its own home page.",
    keywords: ["login", "password", "pin", "handle", "access"],
    body: [
      "Staff (admins, educators, reviewers, parents) sign in with their email address and password. Students sign in with the handle and 6-digit PIN their educator gives them.",
      "After sign-in you're routed to your role's home: educators and admins to the dashboard, students to My Learning, parents to the parent portal, and reviewers to the launch audit.",
      "If a student forgets their handle or PIN, their educator can look it up or reset it from the learner profile.",
    ],
  },
  {
    id: "onboarding",
    title: "Guided tours, checklists, and the intro",
    category: "Getting started",
    roles: "all",
    summary: "On your first login EduOS shows a short intro, a guided tour, and a live checklist. Replay any of them any time.",
    keywords: ["tour", "checklist", "intro", "welcome", "first login", "restart"],
    body: [
      "The first time you sign in, a \"How EduOS Works\" intro explains the learning loop for your role, followed by an optional guided tour of your home page.",
      "The getting-started checklist tracks real progress — steps complete themselves as you do the work, on any device.",
      "To replay anything: use the Help button on your home page for the tour, Settings → Onboarding to restart the tour or replay the intro, or the buttons at the bottom of your Quick Start page.",
    ],
  },
  {
    id: "assign-diagnostic",
    title: "Assign a diagnostic to a learner",
    category: "Assessments",
    roles: ["admin", "educator"],
    summary: "Published diagnostics are assigned from the Assessments page and appear on the student's home immediately.",
    keywords: ["assign", "diagnostic", "assessment", "publish", "student"],
    body: [
      "Open Assessments, pick a published diagnostic, and assign it to one or more learners. Only published assessments can be assigned.",
      "The assessment appears on the student's home page the moment it's assigned — no extra step needed from the student.",
      "Curriculum-linked assessments are built in the Assessment Builder or Diagnostic Engine from your uploaded curriculum; legacy Sprint 2 assessments still work but are deprecated.",
    ],
  },
  {
    id: "take-assessment",
    title: "Taking an assessment",
    category: "Assessments",
    roles: ["student"],
    summary: "Assessments appear on your home page. Answers save as you go, so you can stop and resume any time.",
    keywords: ["take", "answer", "resume", "submit", "test", "exam"],
    body: [
      "Assigned assessments appear at the top of My Learning. Click one to start — one question at a time.",
      "Every answer saves immediately. If you close the tab or lose connection, you resume exactly where you stopped.",
      "When you submit, scoring happens on the server and your result is stored as evidence. Evidence is never edited or deleted — reassessments add new evidence alongside it.",
    ],
  },
  {
    id: "scoring-gaps",
    title: "How scoring and gap detection work",
    category: "Assessments",
    roles: ["admin", "educator", "reviewer"],
    summary: "Server-side scoring, per-outcome breakdowns, and automatic gap creation below 70%.",
    keywords: ["score", "70", "gap", "outcome", "detection", "grading"],
    body: [
      "Scoring runs entirely on the server — answers are checked against the answer key and per-outcome scores are computed deterministically.",
      "Any outcome under 70% opens a learning gap, classified as Weak, Medium, or Strong based on the score band.",
      "Each gap carries full curriculum traceability: outcome → topic → chapter → unit, so you can see exactly where in the book the weakness lives.",
    ],
  },
  {
    id: "approve-intervention",
    title: "Approve an intervention and unlock the AI Tutor",
    category: "Interventions & AI Tutor",
    roles: ["admin", "educator"],
    summary: "Gap detection produces recommendations; your approval turns them into interventions and unlocks tutoring.",
    keywords: ["approve", "intervention", "recommendation", "unlock", "tutor"],
    body: [
      "Open Interventions to see recommendations produced by gap detection. Each one lists the outcomes it targets and the approach.",
      "Approving a recommendation creates the intervention. The student sees it on their home page immediately.",
      "Approval also unlocks the AI Tutor for that learner — strictly scoped to the intervention's outcomes. The tutor cannot wander outside approved scope and can never modify scores or evidence.",
    ],
  },
  {
    id: "use-tutor",
    title: "Practicing with the AI Tutor",
    category: "Interventions & AI Tutor",
    roles: ["student"],
    summary: "A Socratic companion: Explain, Hint, Example, Practice — only inside your approved focus areas.",
    keywords: ["tutor", "ai", "practice", "hint", "explain", "example", "socratic"],
    body: [
      "The AI Tutor opens from your focus plan once an educator has approved an intervention and a parent has given consent.",
      "Use Explain to understand a concept, Hint when you're stuck, Example to see one worked out, and Practice to try questions yourself.",
      "The tutor only covers your approved focus areas, and it can never change your scores — it only helps you learn.",
    ],
  },
  {
    id: "guardian-consent",
    title: "Guardian consent for the AI Tutor",
    category: "Interventions & AI Tutor",
    roles: ["parent", "student"],
    summary: "A parent or guardian records consent once; it unlocks the AI Tutor. Everything else works without it.",
    keywords: ["consent", "guardian", "parent", "approve", "permission", "locked"],
    body: [
      "The AI Tutor stays locked until a parent or guardian records consent in the parent portal. This is deliberate — AI features require explicit guardian approval.",
      "Consent does not gate assessments, focus plans, or progress tracking. Those work regardless.",
      "If the tutor button looks locked on the student home page, ask your parent to open their portal and record consent.",
    ],
  },
  {
    id: "mastery-lift",
    title: "Mastery lift and reassessments",
    category: "Progress & reports",
    roles: ["admin", "educator", "student", "parent"],
    summary: "Reassessments re-measure the same outcomes; mastery lift is the difference between then and now.",
    keywords: ["mastery", "lift", "reassessment", "progress", "report", "outcome"],
    body: [
      "After an intervention has had time to work, assign the reassessment. Reassessment templates guarantee zero question overlap with the original diagnostic.",
      "Mastery lift is computed per outcome: reassessment score minus diagnostic score. The mastery index rolls this up into the learner's overall picture.",
      "The learner profile shows the outcome report and timeline — the evidence chain from diagnostic to lift, all append-only.",
    ],
  },
  {
    id: "parent-portal",
    title: "The parent portal",
    category: "Progress & reports",
    roles: ["parent"],
    summary: "Live, read-only visibility into your child's mastery, scores, and active interventions.",
    keywords: ["parent", "child", "progress", "read-only", "portal"],
    body: [
      "The portal shows your child's live mastery, recent assessment scores, and any active interventions — updated as work happens.",
      "Everything is read-only by design. You can't change scores, plans, or evidence — and neither can the AI Tutor.",
      "Record consent here to unlock the AI Tutor. For anything else, talk to your child's educator — they see the same evidence you do.",
    ],
  },
  {
    id: "restart-tour",
    title: "Restart the tour or replay the intro",
    category: "Account & privacy",
    roles: "all",
    summary: "All onboarding can be replayed safely — nothing auto-starts twice unless you ask it to.",
    keywords: ["restart", "replay", "tour", "intro", "reset", "onboarding"],
    body: [
      "Settings → Onboarding has two controls: Restart Tour replays your role's guided tour once, and Mark Tour Complete stops anything from auto-starting.",
      "Your Quick Start page (in the sidebar under Support) can replay the intro, the tour, or both.",
      "These flags live in your browser only. Your actual progress — checklists, completed steps — always comes from live data, so it's the same on every device.",
    ],
  },
  {
    id: "audit-centers",
    title: "Audit and verification centers",
    category: "Audits & verification",
    roles: ["admin", "educator", "reviewer"],
    summary: "Every engine ships with a live audit page running deterministic probes against real data.",
    keywords: ["audit", "verification", "rls", "probe", "security", "proof", "launch"],
    body: [
      "The Verification Center proves auth, role enforcement, and organization isolation with live session data.",
      "RLS Verification runs cross-organization probes: attempts to read or write another tenant's data, all of which must fail.",
      "Each engine — blueprint, question bank, assessment builder, diagnostic engine, gap analysis — has its own audit center under System in the sidebar. The Launch Audit summarizes everything.",
    ],
  },
];

/**
 * Search the help center. Every whitespace-separated term must match
 * somewhere in the title, summary, keywords, or body. Articles are
 * pre-filtered to those visible for the given role.
 */
export function searchHelpArticles(query: string, role: AppRole): HelpArticle[] {
  const visible = HELP_ARTICLES.filter((a) => a.roles === "all" || a.roles.includes(role));
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return visible;
  return visible.filter((a) => {
    const haystack = [a.title, a.summary, a.category, ...a.keywords, ...a.body]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}
