import { createFileRoute } from "@tanstack/react-router";

import {
  MarketingList,
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";
import { breadcrumbLd, faqLd, pageHead } from "@/lib/seo";

const PATH = "/free-learning-check";
const TITLE = "Free Learning Check for CBSE Class 10 — ₹0, no card | EduOS";
const DESCRIPTION =
  "Five questions per subject, free, for CBSE Class 10 Mathematics and Science. The learner answers in their own workspace and the parent sees which skills were checked.";

const FAQS = [
  {
    q: "Is it really free?",
    a: "Yes. The free learning check is ₹0 with no payment and no card. It is five questions per subject.",
  },
  {
    q: "Do I need an account?",
    a: "A parent account, which is free to create. The learner then signs in separately with their own handle and PIN to answer.",
  },
  {
    q: "What is the difference from the ₹199 diagnostic?",
    a: "The free check is a short preview of the skills being checked. The ₹199 diagnostic is up to twenty curriculum-mapped questions with a full outcome-by-outcome report and ranked gaps.",
  },
];

export const Route = createFileRoute("/free-learning-check")({
  head: () =>
    pageHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      jsonLd: [breadcrumbLd([{ name: "Free learning check", path: PATH }]), faqLd(FAQS)],
    }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="₹0 · No card"
      title="Free learning check"
      intro="Start without paying anything. Five questions per subject in CBSE Class 10 Mathematics and Science, answered by your child in their own workspace, with a preview for you of the skills that were checked."
      primary={{
        label: "Create a free parent account",
        href: "/auth?tab=parent&mode=signup&next=/parent",
        cta: "free_check",
      }}
      secondary={{
        label: "See the ₹199 diagnostic",
        href: "/cbse-class-10-learning-gap-diagnostic",
        cta: "diagnostic_start",
      }}
      whatNext={[
        "You create a free parent account — no card is asked for.",
        "You add your child and share their handle and PIN.",
        "Your child signs in and answers five questions in the subject you pick.",
        "You see a preview of the skills checked, and can move to the ₹199 diagnostic when you want the full ranked gap report.",
      ]}
      internalLinks={[
        {
          label: "CBSE Class 10 learning gap diagnostic",
          href: "/cbse-class-10-learning-gap-diagnostic",
          detail: "The ₹199 full diagnostic and what the report contains.",
        },
        {
          label: "Parent guide to learning gaps",
          href: "/parent-guide-learning-gaps",
          detail: "What a learning gap is and how to act on one.",
        },
        {
          label: "Class 10 Mathematics diagnostic",
          href: "/class-10-maths-diagnostic",
          detail: "Mathematics, outcome by outcome.",
        },
        {
          label: "Class 10 Science diagnostic",
          href: "/class-10-science-diagnostic",
          detail: "Science, outcome by outcome.",
        },
      ]}
      faqs={FAQS}
      sharePath={PATH}
      shareCampaign="free_learning_check"
    >
      <MarketingSection heading="What the free check shows">
        <MarketingList
          items={[
            "Five questions per subject, drawn from CBSE Class 10 Mathematics or Science content.",
            "Answers saved as the learner goes, so the check can be paused.",
            "A parent-side preview of which skills were checked.",
            "No payment, no card, no commitment.",
          ]}
        />
      </MarketingSection>

      <MarketingSection heading="Who owns what">
        <p>
          The parent owns the account and receives the reports. The learner answers the questions
          and does the learning. The AI tutor supports learning inside an approved intervention — it
          cannot alter a score or decide that a gap is closed.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
