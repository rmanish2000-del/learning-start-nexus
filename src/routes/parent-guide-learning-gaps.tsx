import { createFileRoute } from "@tanstack/react-router";

import {
  MarketingList,
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";
import { breadcrumbLd, faqLd, pageHead } from "@/lib/seo";

const PATH = "/parent-guide-learning-gaps";
const TITLE = "A Parent's Guide to Learning Gaps in CBSE Class 10 | EduOS";
const DESCRIPTION =
  "What a learning gap is, why marks alone hide it, and how a parent can act on an outcome-level report for CBSE Class 10 Mathematics and Science — without a teaching background.";

const FAQS = [
  {
    q: "What is a learning gap?",
    a: "A specific learning outcome the student has not mastered — for example a method, a definition or a form of reasoning. A mark sheet totals the damage; a gap report names the cause.",
  },
  {
    q: "Do I need to understand the subject to help?",
    a: "No. The report names the gap in plain language, ranks it and gives the recommended next step. Your child does the learning; you decide what to prioritise.",
  },
  {
    q: "How do I know it worked?",
    a: "A fresh reassessment on questions your child has not seen before. Nothing else marks a gap as closed — not practice, not the AI tutor.",
  },
];

export const Route = createFileRoute("/parent-guide-learning-gaps")({
  head: () =>
    pageHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      ogType: "article",
      jsonLd: [breadcrumbLd([{ name: "Parent guide to learning gaps", path: PATH }]), faqLd(FAQS)],
    }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="For parents"
      title="A parent's guide to learning gaps"
      intro="Two children can lose the same ten marks for completely different reasons. This guide explains what a learning gap is, how EduOS names one, and what a parent can reasonably do about it."
      primary={{
        label: "Start with the free learning check",
        href: "/free-learning-check",
        cta: "free_check",
      }}
      secondary={{
        label: "See the ₹199 diagnostic",
        href: "/cbse-class-10-learning-gap-diagnostic",
        cta: "diagnostic_start",
      }}
      whatNext={[
        "Read the four steps below so the report language makes sense.",
        "Run the free learning check, or the ₹199 diagnostic for the full ranked report.",
        "Work through the recommended intervention for the highest-ranked gap first.",
        "Ask for a fresh reassessment — that is the only thing that closes a gap.",
      ]}
      internalLinks={[
        {
          label: "Free learning check",
          href: "/free-learning-check",
          detail: "₹0, five questions per subject.",
        },
        {
          label: "CBSE Class 10 learning gap diagnostic",
          href: "/cbse-class-10-learning-gap-diagnostic",
          detail: "The ₹199 diagnostic and its report.",
        },
        {
          label: "Fresh reassessment and evidence",
          href: "/reassessment-and-evidence",
          detail: "What counts as proof of progress.",
        },
        {
          label: "CBSE paper practice",
          href: "/cbse-paper-practice",
          detail: "Timed past papers once gaps are known.",
        },
      ]}
      faqs={FAQS}
      sharePath={PATH}
      shareCampaign="parent_guide"
    >
      <MarketingSection heading="1. A mark is a symptom, not a diagnosis">
        <p>
          A 62 in Mathematics can mean weak algebraic manipulation, or shaky geometric reasoning, or
          simply running out of time. Repeating the whole syllabus treats all three the same way.
          An outcome-level report separates them.
        </p>
      </MarketingSection>

      <MarketingSection heading="2. How EduOS names the gap">
        <MarketingList
          items={[
            "Every question maps to a CBSE Class 10 learning outcome.",
            "Answers produce a mastery band per outcome: Weak, Developing, Secure or Strong.",
            "Gaps are ranked by board weight multiplied by severity, so the costly ones come first.",
            "Each gap carries the recommended intervention for that outcome.",
          ]}
        />
      </MarketingSection>

      <MarketingSection heading="3. What help is allowed to do">
        <p>
          The AI tutor works inside an educator-approved intervention. It can explain and question.
          It cannot edit a score, and it cannot mark a gap closed. That boundary is deliberate: it
          keeps the evidence honest.
        </p>
      </MarketingSection>

      <MarketingSection heading="4. What proof looks like">
        <p>
          A fresh reassessment on questions the learner has not already answered. The diagnostic,
          the intervention and the reassessment stay linked as one record you can read at any time.
        </p>
      </MarketingSection>

      <MarketingSection heading="What it costs">
        <MarketingList
          items={[
            "Free Learning Check — ₹0.",
            "Diagnostic — ₹199.",
            "Annual Plan — ₹2,999; upgrading within 30 days of a diagnostic credits ₹199, so ₹2,800 is payable.",
          ]}
        />
      </MarketingSection>
    </MarketingPage>
  );
}
