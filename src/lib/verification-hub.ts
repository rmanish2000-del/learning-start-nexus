// UX Phase 1 · UX-07 — one index of every audit / verification centre.
// The sidebar carries a single "Verification" entry; this list keeps every
// existing route one click away, so bookmarks and audit evidence links survive.

export type AuditCenter = {
  to: string;
  label: string;
  domain: "Platform" | "Assessment" | "Curriculum" | "Sprint";
  description: string;
};

export const AUDIT_CENTERS: AuditCenter[] = [
  {
    to: "/rls-verification",
    label: "RLS Policies",
    domain: "Platform",
    description: "Live pg_policies read plus the cross-organization test runner.",
  },
  {
    to: "/launch-audit",
    label: "Launch Readiness",
    domain: "Platform",
    description: "Legal pages, consent, PWA installability and release gates.",
  },
  {
    to: "/assessment-verification",
    label: "Assessment QA",
    domain: "Assessment",
    description: "Item bank counts, session resume, scoring and evidence probes.",
  },
  {
    to: "/assessment-audit",
    label: "Audit Trail",
    domain: "Assessment",
    description: "Diagnostic → gap → intervention → outcome evidence chains.",
  },
  {
    to: "/assessment-proof",
    label: "Build Proof",
    domain: "Assessment",
    description: "Printable proof pack for the assessment engine.",
  },
  {
    to: "/assessment-blueprint-audit",
    label: "Blueprint Audit",
    domain: "Assessment",
    description: "Outcome catalog, mastery bands and curriculum mapping checks.",
  },
  {
    to: "/question-bank-audit",
    label: "Question Bank Audit",
    domain: "Assessment",
    description: "Coverage, answer keys and CBSE competency question types.",
  },
  {
    to: "/assessment-builder-audit",
    label: "Builder Audit",
    domain: "Assessment",
    description: "Curriculum-driven assessment assembly and coverage math.",
  },
  {
    to: "/diagnostic-engine-audit",
    label: "Diagnostic Audit",
    domain: "Assessment",
    description: "Allocation determinism and zero-overlap reassessment rules.",
  },
  {
    to: "/gap-analysis-audit",
    label: "Gap Audit",
    domain: "Assessment",
    description: "Outcome-level scoring, banding and intervention mapping.",
  },
  {
    to: "/payment-audit",
    label: "Payment Audit",
    domain: "Assessment",
    description: "Orders, captures, failures, webhook replays and entitlement grants.",
  },
  {
    to: "/curriculum-audit",
    label: "Curriculum Audit",
    domain: "Curriculum",
    description: "Book ingest, extraction and unit/chapter/topic integrity.",
  },
  {
    to: "/sprint-3-audit",
    label: "Sprint 3 Audit",
    domain: "Sprint",
    description: "Gap detection, recommendations and intervention workflow.",
  },
  {
    to: "/sprint-4-audit",
    label: "Sprint 4 Audit",
    domain: "Sprint",
    description: "AI Tutor privacy, scoping and failsafe behaviour.",
  },
  {
    to: "/sprint-5-audit",
    label: "Sprint 5 Audit",
    domain: "Sprint",
    description: "Reassessment, mastery lift and the closed outcome loop.",
  },
  {
    to: "/ux-phase1-plan",
    label: "UX Phase 1 Plan",
    domain: "Sprint",
    description: "Redesign comparison, P0/P1/P2 backlog and delivery waves.",
  },
];

export const AUDIT_DOMAINS: AuditCenter["domain"][] = [
  "Platform",
  "Assessment",
  "Curriculum",
  "Sprint",
];
