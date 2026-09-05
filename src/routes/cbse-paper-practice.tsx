import { createFileRoute } from "@tanstack/react-router";

import {
  MarketingList,
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";
import { breadcrumbLd, faqLd, pageHead } from "@/lib/seo";

const PATH = "/cbse-paper-practice";
const TITLE = "CBSE Class 10 Paper Practice — timed past papers | EduOS";
const DESCRIPTION =
  "Practise real CBSE Class 10 Mathematics and Science papers by year and set, with timed full-paper attempts, chapter practice and answer review inside EduOS.";

const FAQS = [
  {
    q: "Which papers can be practised?",
    a: "CBSE Class 10 Mathematics and Science papers, selectable by subject, year and set inside the learner workspace.",
  },
  {
    q: "Is it timed?",
    a: "Full-paper attempts are timed. Chapter practice is untimed so a learner can work through one topic at a time.",
  },
  {
    q: "Do I need the diagnostic first?",
    a: "No, but practice is far more useful once the diagnostic has named the weak outcomes, so effort goes where marks are actually being lost.",
  },
];

export const Route = createFileRoute("/cbse-paper-practice")({
  head: () =>
    pageHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      jsonLd: [breadcrumbLd([{ name: "CBSE paper practice", path: PATH }]), faqLd(FAQS)],
    }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="CBSE Class 10 · Past papers"
      title="CBSE paper practice, connected to the gaps"
      intro="Practising papers at random rarely changes a mark. Inside EduOS, paper practice sits after the diagnostic, so a learner spends time on the outcomes the report actually flagged."
      primary={{
        label: "Create a free parent account",
        href: "/auth?tab=parent&mode=signup&next=/parent",
        cta: "signup",
      }}
      secondary={{
        label: "Start the ₹199 Diagnostic",
        href: "/diagnostic",
        cta: "diagnostic_start",
      }}
      whatNext={[
        "You create a parent account and add your child.",
        "Your child signs in with their handle and PIN and opens paper practice.",
        "They choose subject, year and set — a full paper is timed, chapter practice is not.",
        "Answers can be reviewed afterwards, and attempt history stays in the workspace.",
      ]}
      internalLinks={[
        {
          label: "CBSE Class 10 learning gap diagnostic",
          href: "/cbse-class-10-learning-gap-diagnostic",
          detail: "Name the weak outcomes before practising papers.",
        },
        {
          label: "Fresh reassessment and evidence",
          href: "/reassessment-and-evidence",
          detail: "How progress is proved on unseen questions.",
        },
        {
          label: "Free learning check",
          href: "/free-learning-check",
          detail: "Five free questions per subject.",
        },
        {
          label: "Parent guide to learning gaps",
          href: "/parent-guide-learning-gaps",
          detail: "Reading a gap report without a teaching background.",
        },
      ]}
      faqs={FAQS}
      sharePath={PATH}
      shareCampaign="paper_practice"
    >
      <MarketingSection heading="What paper practice includes">
        <MarketingList
          items={[
            "Subject, year and set selection for CBSE Class 10 Mathematics and Science papers.",
            "Timed full-paper attempts that mirror the real sitting.",
            "Chapter practice for one topic at a time.",
            "Answer review and attempt history kept in the learner workspace.",
          ]}
        />
      </MarketingSection>

      <MarketingSection heading="Where it sits in the loop">
        <p>
          Diagnostic → gap plan → study plan → AI tutor → guided intervention → fresh reassessment →
          evidence chain → CBSE paper practice. Practice reinforces what the intervention taught; a
          gap is only marked closed by a fresh reassessment on unseen questions.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
