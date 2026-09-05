// Route-aware guidance for the public site.
//
// Every statement here must match production behaviour and pricing:
//   Free Learning Check ₹0 · Diagnostic ₹199 · Annual Plan ₹2,999
//   Upgrade credit ₹199 · Upgrade payable ₹2,800
// The learning flow is:
//   Diagnostic → Gap Plan → Study Plan → AI Tutor → Guided Intervention →
//   Fresh Reassessment → Evidence Chain → CBSE Paper Practice

export interface GuidanceStep {
  label: string;
  /** Real, existing route. */
  to: string;
  search?: Record<string, string>;
  detail: string;
}

export interface RouteGuidance {
  /** Match by exact path or prefix. */
  match: string;
  title: string;
  explain: string[];
  next: GuidanceStep[];
  /** Short optional walkthrough of what is on this page. */
  walkthrough?: { title: string; body: string }[];
}

const START_DIAGNOSTIC: GuidanceStep = {
  label: "Start the ₹199 Diagnostic",
  to: "/diagnostic",
  detail: "A full CBSE Class 10 Mathematics or Science diagnostic that produces a gap plan.",
};

const CREATE_PARENT_ACCOUNT: GuidanceStep = {
  label: "Create a parent account",
  to: "/auth",
  search: { tab: "parent", mode: "signup", next: "/parent" },
  detail: "Free. You'll see your child's gaps, study plan and evidence in one place.",
};

const BOOK_DEMO: GuidanceStep = {
  label: "Book a centre demo",
  to: "/contact",
  search: { topic: "centre" },
  detail: "For tuition centres and schools running EduOS with a cohort.",
};

export const PUBLIC_GUIDANCE: RouteGuidance[] = [
  {
    match: "/",
    title: "What this page is",
    explain: [
      "EduOS is a learning intelligence system for CBSE Class 10 Mathematics and Science. It finds exactly which learning outcomes a student has not mastered, then closes them with a plan and proves the change with a fresh reassessment.",
      "This home page introduces the three audiences — parents, learning centres and schools — and links to the two ways to begin: a free learning check or the ₹199 diagnostic.",
    ],
    next: [START_DIAGNOSTIC, CREATE_PARENT_ACCOUNT, BOOK_DEMO],
    walkthrough: [
      { title: "Pick your audience", body: "Parents, Centres and Schools each have a section explaining what EduOS does for them." },
      { title: "See the learning loop", body: "Diagnostic, gap plan, study plan, AI Tutor, guided intervention, fresh reassessment, evidence." },
      { title: "Choose a first step", body: "A free learning check needs only a parent account. The ₹199 diagnostic gives the full report." },
    ],
  },
  {
    match: "/about",
    title: "About EduOS",
    explain: [
      "This page explains who builds EduOS and the principle behind it: no claim of progress without a fresh, independent reassessment.",
    ],
    next: [START_DIAGNOSTIC, BOOK_DEMO],
  },
  {
    match: "/contact",
    title: "Getting in touch",
    explain: [
      "Use this form for centre demos, school pilots and support questions. Replies come from support@eduos.global.",
    ],
    next: [CREATE_PARENT_ACCOUNT, START_DIAGNOSTIC],
  },
  {
    match: "/diagnostic",
    title: "The ₹199 diagnostic",
    explain: [
      "The diagnostic is a real CBSE-aligned assessment. It maps every answer to a curriculum outcome, so the report says which specific outcomes are weak — not just a score.",
      "It costs ₹199 once. If you later take the Annual Plan (₹2,999), the ₹199 is credited, so you pay ₹2,800.",
    ],
    next: [
      { label: "Continue on this page", to: "/diagnostic", detail: "Choose the subject and start. You can pause and return." },
      CREATE_PARENT_ACCOUNT,
    ],
    walkthrough: [
      { title: "Choose the subject", body: "Mathematics or Science, CBSE Class 10." },
      { title: "Answer honestly", body: "Guessing hides real gaps — the plan is only as good as the diagnostic." },
      { title: "Get the gap plan", body: "The report lists weak outcomes and the study plan that closes them." },
    ],
  },
  {
    match: "/auth",
    title: "Signing in",
    explain: [
      "Parents and staff sign in with email or Google. Learners sign in with the handle and PIN their educator gave them.",
      "Creating a parent account is free and does not start any payment.",
    ],
    next: [CREATE_PARENT_ACCOUNT, START_DIAGNOSTIC],
  },
  {
    match: "/pilot-invite",
    title: "Your pilot invitation",
    explain: [
      "This invitation is single-use and tied to your email address. Accepting it creates or reuses your account and unlocks pilot access — nothing is charged.",
    ],
    next: [
      { label: "Accept on this page", to: "/pilot-invite", detail: "Sign in with the invited email address, then accept." },
    ],
  },
  {
    match: "/free-check",
    title: "Your free learning check",
    explain: [
      "The free check is a short, no-cost snapshot. It shows the direction of the gaps; the ₹199 diagnostic produces the full outcome-level plan.",
    ],
    next: [START_DIAGNOSTIC, CREATE_PARENT_ACCOUNT],
  },
  {
    match: "/upgrade",
    title: "Upgrading to the Annual Plan",
    explain: [
      "The Annual Plan is ₹2,999 for the year. Your ₹199 diagnostic is credited, so the amount payable here is ₹2,800.",
    ],
    next: [
      { label: "Continue on this page", to: "/upgrade", detail: "Review what's included, then confirm payment." },
    ],
  },
  {
    match: "/privacy",
    title: "Privacy",
    explain: ["What EduOS stores, why, and how learner data is protected."],
    next: [CREATE_PARENT_ACCOUNT],
  },
  {
    match: "/terms",
    title: "Terms of use",
    explain: ["The terms that apply to parents, centres and schools using EduOS."],
    next: [CREATE_PARENT_ACCOUNT],
  },
  {
    match: "/cbse-class-10-learning-gap-diagnostic",
    title: "The CBSE Class 10 gap diagnostic",
    explain: [
      "This page explains the ₹199 diagnostic: up to twenty curriculum-mapped questions, an outcome-by-outcome report and the ranked gaps with a recommended next step for each.",
    ],
    next: [START_DIAGNOSTIC, CREATE_PARENT_ACCOUNT],
  },
  {
    match: "/class-10-maths-diagnostic",
    title: "Class 10 Mathematics diagnostic",
    explain: [
      "How the diagnostic works for CBSE Class 10 Mathematics, and what the report names once it is finished.",
    ],
    next: [START_DIAGNOSTIC, CREATE_PARENT_ACCOUNT],
  },
  {
    match: "/class-10-science-diagnostic",
    title: "Class 10 Science diagnostic",
    explain: [
      "How the diagnostic works for CBSE Class 10 Science, and what the report names once it is finished.",
    ],
    next: [START_DIAGNOSTIC, CREATE_PARENT_ACCOUNT],
  },
  {
    match: "/free-learning-check",
    title: "The free learning check",
    explain: [
      "Five questions per subject, ₹0 and no card. It shows the direction of the gaps; the ₹199 diagnostic produces the full outcome-level plan.",
    ],
    next: [CREATE_PARENT_ACCOUNT, START_DIAGNOSTIC],
  },
  {
    match: "/cbse-paper-practice",
    title: "CBSE paper practice",
    explain: [
      "Timed full-paper attempts and chapter practice on CBSE Class 10 Mathematics and Science papers, inside the learner workspace.",
    ],
    next: [CREATE_PARENT_ACCOUNT, START_DIAGNOSTIC],
  },
  {
    match: "/parent-guide-learning-gaps",
    title: "Parent guide to learning gaps",
    explain: [
      "What a learning gap is, how EduOS names one, and what a parent can do about it without a teaching background.",
    ],
    next: [CREATE_PARENT_ACCOUNT, START_DIAGNOSTIC],
  },
  {
    match: "/reassessment-and-evidence",
    title: "Reassessment and evidence",
    explain: [
      "A gap is only closed by a fresh reassessment on unseen questions. The diagnostic, the intervention and the reassessment stay linked as one record.",
    ],
    next: [START_DIAGNOSTIC, CREATE_PARENT_ACCOUNT],
  },
];


export function guidanceForRoute(pathname: string): RouteGuidance | null {
  const exact = PUBLIC_GUIDANCE.find((g) => g.match === pathname);
  if (exact) return exact;
  const prefixed = PUBLIC_GUIDANCE.filter((g) => g.match !== "/" && pathname.startsWith(g.match)).sort(
    (a, b) => b.match.length - a.match.length,
  );
  return prefixed[0] ?? null;
}

/** Public routes that show the guidance launcher. */
export function isGuidedPublicRoute(pathname: string): boolean {
  return guidanceForRoute(pathname) !== null;
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface FaqEntry {
  id: string;
  question: string;
  answer: string[];
  tags: string[];
}

export const PUBLIC_FAQ: FaqEntry[] = [
  {
    id: "what-is-eduos",
    question: "What is EduOS?",
    answer: [
      "A learning intelligence and intervention system for CBSE Class 10 Mathematics and Science. It finds the exact outcomes a learner has not mastered, closes them with a plan and AI-tutor practice, then proves the change with a fresh reassessment.",
    ],
    tags: ["about", "overview"],
  },
  {
    id: "pricing",
    question: "What does it cost?",
    answer: [
      "The Free Learning Check is ₹0. The full diagnostic is ₹199. The Annual Plan is ₹2,999.",
      "If you upgrade after a diagnostic, your ₹199 is credited, so you pay ₹2,800.",
    ],
    tags: ["pricing", "cost", "199", "2999", "upgrade"],
  },
  {
    id: "free-vs-paid",
    question: "How is the free check different from the ₹199 diagnostic?",
    answer: [
      "The free check is a short snapshot showing where the difficulty likely sits. The ₹199 diagnostic is a full CBSE-aligned assessment that maps every answer to a curriculum outcome and produces the gap plan and study plan.",
    ],
    tags: ["pricing", "diagnostic", "free"],
  },
  {
    id: "learning-flow",
    question: "What happens after the diagnostic?",
    answer: [
      "Diagnostic → Gap Plan → Study Plan → AI Tutor → Guided Intervention → Fresh Reassessment → Evidence Chain → CBSE Paper Practice.",
      "Nothing marks a gap as closed except a fresh reassessment scored at 70% or above. The AI Tutor and interventions help the learner get there; they never close the gap by themselves.",
    ],
    tags: ["flow", "diagnostic", "tutor", "reassessment", "evidence"],
  },
  {
    id: "subjects",
    question: "Which classes and subjects are covered?",
    answer: ["CBSE Class 10 Mathematics and Science."],
    tags: ["subjects", "class 10", "cbse"],
  },
  {
    id: "paper-practice",
    question: "Can my child practise real CBSE papers?",
    answer: [
      "Yes. CBSE Paper Practice offers past papers by subject, year and set, with timed full-paper attempts and answer review.",
    ],
    tags: ["pyq", "papers", "practice"],
  },
  {
    id: "who-signs-in",
    question: "Who signs in, the parent or the child?",
    answer: [
      "Parents sign in with email or Google. Learners sign in with the handle and PIN their educator creates for them.",
    ],
    tags: ["signin", "login", "parent", "learner", "pin"],
  },
  {
    id: "google",
    question: "Can I sign in with Google?",
    answer: ["Yes — Google sign-in is available for parents and staff on the sign-in page."],
    tags: ["google", "signin"],
  },
  {
    id: "pilot",
    question: "I received a pilot invitation. How do I use it?",
    answer: [
      "Open the link, sign in with the invited email address and accept. Invitations are single-use, tied to that email, and never charge anything.",
    ],
    tags: ["pilot", "invitation", "invite"],
  },
  {
    id: "centre",
    question: "We run a tuition centre. How do we start?",
    answer: [
      "Book a centre demo from the Contact page. Centres get a roster, educator assignment, intervention approval and pilot evidence reporting.",
    ],
    tags: ["centre", "school", "demo"],
  },
  {
    id: "data",
    question: "What data do you store about my child?",
    answer: [
      "Only what is needed to run the learning loop: the learner profile, assessment attempts and outcome mastery. The Privacy Policy has the full detail.",
    ],
    tags: ["privacy", "data", "security"],
  },
  {
    id: "install",
    question: "Can I install EduOS on my phone?",
    answer: [
      "Yes. EduOS installs like an app from your browser — the footer has the step-by-step guide for iPhone and Android.",
    ],
    tags: ["pwa", "install", "app", "mobile"],
  },
];

export function searchFaq(query: string): FaqEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return PUBLIC_FAQ;
  const words = q.split(/\s+/);
  return PUBLIC_FAQ.filter((entry) => {
    const haystack = `${entry.question} ${entry.answer.join(" ")} ${entry.tags.join(" ")}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}
