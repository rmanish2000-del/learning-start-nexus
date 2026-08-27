// Public landing content — UI/UX 9.0 Part A (trust layer).
// Every figure here is a FIXED, ANONYMISED pilot sample. Nothing on this
// module reads tenant data, so no learner-identifiable record can leave the
// tenant through the public page. Labels must always say "pilot sample".

export const SAMPLE_LABEL = "Anonymised pilot sample — not live tenant data";

export type ProofStat = { label: string; value: string; note: string };

export const PROOF_STRIP: ProofStat[] = [
  { label: "Gap closure rate", value: "72%", note: "Gaps closed after intervention, pilot cohort" },
  { label: "Average mastery lift", value: "+43 pts", note: "Baseline vs fresh-item reassessment" },
  { label: "Verified evidence rows", value: "128", note: "Each signed by a named reviewer" },
];

export type RoleLane = {
  role: string;
  jobs: string[];
};

export const ROLE_LANES: RoleLane[] = [
  {
    role: "Educator",
    jobs: [
      "Assign a curriculum-mapped diagnostic",
      "Read the gap heatmap, worst learner first",
      "Approve the recommended intervention",
      "Reassess on fresh items and sign the evidence",
    ],
  },
  {
    role: "Student",
    jobs: [
      "Sit a short diagnostic on the phone",
      "See exactly which outcome is weak",
      "Work through it with the Socratic tutor",
      "Retake on new questions and watch mastery move",
    ],
  },
  {
    role: "Parent",
    jobs: [
      "See what your child is stuck on, in plain language",
      "See what the centre actually did about it",
      "See whether it worked, measured not claimed",
      "Give or withdraw tutor consent at any time",
    ],
  },
];

export type LoopStep = {
  key: string;
  title: string;
  artefact: string;
  detail: string;
  sample: string;
};

export const LOOP_STEPS: LoopStep[] = [
  {
    key: "diagnostic",
    title: "Diagnostic",
    artefact: "Diagnostic score",
    detail: "Curriculum-mapped items, blueprint-balanced across outcomes.",
    sample: "Learner A · Class 10 Mathematics · Real Numbers & Polynomials diagnostic · 20 items · scored 42%",
  },
  {
    key: "gap",
    title: "Gap detected",
    artefact: "Weak outcome",
    detail: "Scoring is per outcome, not per paper, so the gap is specific.",
    sample: "Weak outcome: “Apply the factor theorem to find polynomial zeroes” · 2 of 6 correct · band: Weak",
  },
  {
    key: "intervention",
    title: "Intervention",
    artefact: "Approved plan",
    detail: "A deterministic recommendation an educator approves or rejects.",
    sample: "Recommended: equivalence-first practice · approved by educator on day 2",
  },
  {
    key: "tutor",
    title: "AI tutor",
    artefact: "Session minutes",
    detail: "Socratic only, scoped to the approved intervention, consent-gated.",
    sample: "3 sessions · 46 minutes · 28 interactions · logged against the gap",
  },
  {
    key: "reassessment",
    title: "Reassessment",
    artefact: "Fresh-item retake",
    detail: "Zero question overlap with the diagnostic, so the lift is real.",
    sample: "Fresh 12-item retake on the same outcome · scored 85%",
  },
  {
    key: "evidence",
    title: "Evidence",
    artefact: "Verified row",
    detail: "Baseline, action, retake and lift stored as one reviewable chain.",
    sample: "Mastery lift +43 pts · gap closed · verified by Reviewer R. on day 11",
  },
];

export type SafetyRule = { can: boolean; text: string };

export const TUTOR_SAFETY: SafetyRule[] = [
  { can: true, text: "Explains, hints, gives worked examples and generates practice" },
  { can: true, text: "Works only inside an educator-approved intervention" },
  { can: true, text: "Runs only after guardian consent, which is reviewable and withdrawable" },
  { can: false, text: "Cannot write, change or influence any score" },
  { can: false, text: "Cannot create, edit or sign outcome evidence" },
  { can: false, text: "Cannot see learners outside the centre it belongs to" },
  { can: false, text: "Cannot give the answer outright — it works Socratically" },
];

export const TUTOR_FALLBACK =
  "If the model is unavailable the tutor falls back to a static, educator-reviewed explanation library. It never fails open into unscoped free chat.";

export type EvidenceRow = { label: string; value: string };

export const EVIDENCE_CHAIN: EvidenceRow[] = [
  { label: "Learner", value: "Learner A (anonymised) · CBSE Class 10" },
  { label: "Outcome", value: "Apply the factor theorem to find polynomial zeroes" },
  { label: "Baseline", value: "42% · 12-item diagnostic · day 0" },
  { label: "Gap band", value: "Weak (< 50%)" },
  { label: "Intervention", value: "Zeroes-and-coefficients practice · educator approved day 2" },
  { label: "Tutor", value: "46 minutes across 3 consent-gated sessions" },
  { label: "Reassessment", value: "85% · 12 fresh items, zero overlap · day 10" },
  { label: "Mastery lift", value: "+43 points" },
  { label: "Verification", value: "Verified by Reviewer R. on day 11" },
];

export type ParentQuestion = { question: string; answer: string; sample: string };

export const PARENT_QUESTIONS: ParentQuestion[] = [
  {
    question: "What is my child stuck on?",
    answer: "A named curriculum outcome, not a vague subject grade.",
    sample: "Factor theorem and polynomial zeroes — 2 of 6 items correct",
  },
  {
    question: "What was done about it?",
    answer: "The approved intervention and every tutor minute spent on that gap.",
    sample: "Zeroes-and-coefficients practice · 46 tutor minutes over 3 sessions",
  },
  {
    question: "Did it actually work?",
    answer: "A retake on questions your child has never seen, with the lift shown.",
    sample: "42% → 85% · +43 points · verified by a reviewer",
  },
];

export const PARENT_REPORT = {
  title: "Fortnightly progress report",
  learner: "Learner A (anonymised)",
  period: "Weeks 1–2 · CBSE Class 10 Mathematics",
  lines: [
    { label: "Gaps detected", value: "3" },
    { label: "Gaps closed", value: "2" },
    { label: "Average mastery lift", value: "+38 pts" },
    { label: "Tutor minutes", value: "92" },
    { label: "Tutor consent", value: "Granted" },
  ],
  narrative:
    "Learner A closed two of three detected gaps this fortnight. The remaining gap (word problems with mixed numbers) has an approved intervention in progress and a reassessment scheduled. Every figure above comes from a scored retake on fresh items, not from teacher estimate.",
};

export type CentreBenefit = { title: string; body: string };

export const CENTRE_BENEFITS: CentreBenefit[] = [
  {
    title: "Triage in one screen",
    body: "The gap heatmap ranks every learner by unresolved gaps, so an educator knows who to see first without opening a single report.",
  },
  {
    title: "A queue, not a to-do list",
    body: "The intervention queue orders work by urgency and flags stalled cases, so nothing sits untouched for a fortnight.",
  },
  {
    title: "Retention you can defend",
    body: "Renewal conversations use verified before/after evidence per learner instead of attendance and goodwill.",
  },
];

export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: "Who owns the data?",
    a: "The centre does. Every record is scoped to your organisation and enforced at the database level by row-level security, not by application code alone.",
  },
  {
    q: "How is consent handled?",
    a: "AI tutoring requires explicit guardian consent per learner. Consent is visible to the guardian, reviewable, and can be withdrawn at any time — withdrawal immediately blocks tutor access.",
  },
  {
    q: "What can the AI tutor not do?",
    a: "It cannot write or change scores, cannot create or sign evidence, cannot work outside an educator-approved intervention, and cannot see learners outside your centre.",
  },
  {
    q: "How is mastery lift calculated?",
    a: "Reassessment score minus baseline score on the same curriculum outcome, where the reassessment uses fresh items with zero overlap with the diagnostic.",
  },
  {
    q: "What counts as a closed gap?",
    a: "A gap closes only when a fresh-item reassessment on that outcome reaches the mastery threshold. Tutor time alone never closes a gap.",
  },
  {
    q: "Which boards and grades are covered?",
    a: "Curriculum is ingested from your own books and syllabus documents, so coverage follows what you upload. The pilot content is CBSE-aligned.",
  },
  {
    q: "Can an external reviewer check our claims?",
    a: "Yes. Reviewers get read-only access to the verification centres, where every outcome claim can be traced back to its diagnostic, intervention, tutor log and retake.",
  },
  {
    q: "What does a pilot involve?",
    a: "A fixed-length pilot on one grade and subject: we ingest your curriculum, run diagnostics on a cohort, and report verified closure and mastery lift at the end. You can exit at the end of the pilot and export your data.",
  },
];

export const LEARNER_COUNT_OPTIONS = ["Under 50", "50–200", "200–500", "500+"] as const;
export const TIMELINE_OPTIONS = ["This month", "This quarter", "Next term", "Exploring"] as const;
