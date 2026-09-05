import { createFileRoute } from "@tanstack/react-router";

import {
  MarketingList,
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";
import { breadcrumbLd, faqLd, offerLd, pageHead } from "@/lib/seo";

const PATH = "/class-10-maths-diagnostic";
const TITLE = "Class 10 Maths Diagnostic — find the outcomes losing marks | EduOS";
const DESCRIPTION =
  "A ₹199 CBSE Class 10 Mathematics diagnostic mapped to curriculum outcomes. See which specific skills are weak, ranked by board weight, with the next step for each.";

const FAQS = [
  {
    q: "Which Mathematics content is covered?",
    a: "CBSE Class 10 Mathematics. You choose one chapter group, and the diagnostic draws curriculum-mapped questions for the outcomes in that group.",
  },
  {
    q: "How long does it take?",
    a: "Up to twenty questions. The learner can pause and return; answers are saved as they go.",
  },
  {
    q: "What happens if a gap is found?",
    a: "The report names the outcome, ranks it, and recommends the intervention. A fresh reassessment on unseen questions is what decides whether that gap is closed.",
  },
];

export const Route = createFileRoute("/class-10-maths-diagnostic")({
  head: () =>
    pageHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      ogType: "product",
      jsonLd: [
        breadcrumbLd([{ name: "Class 10 Mathematics diagnostic", path: PATH }]),
        offerLd({
          name: "CBSE Class 10 Mathematics Diagnostic",
          description: DESCRIPTION,
          price: "199",
          path: PATH,
        }),
        faqLd(FAQS),
      ],
    }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="CBSE Class 10 · Mathematics"
      title="Class 10 Mathematics diagnostic"
      intro="Algebra slips, geometry reasoning, trigonometric identities, mensuration and statistics all look the same on a mark sheet. This diagnostic separates them, outcome by outcome, so practice goes where it is actually needed."
      primary={{ label: "Start the ₹199 Diagnostic", href: "/diagnostic", cta: "diagnostic_start" }}
      secondary={{
        label: "Try five free questions",
        href: "/free-learning-check",
        cta: "free_check",
      }}
      whatNext={[
        "Create a parent account and choose Mathematics with the chapter group you want checked.",
        "Pay ₹199 for that diagnostic.",
        "Your child signs in with their own handle and PIN and answers the questions.",
        "You read the outcome-by-outcome report and the ranked gaps, then follow the recommended intervention for each.",
      ]}
      internalLinks={[
        {
          label: "How the diagnostic works",
          href: "/cbse-class-10-learning-gap-diagnostic",
          detail: "The full ₹199 diagnostic explained, with pricing.",
        },
        {
          label: "Class 10 Science diagnostic",
          href: "/class-10-science-diagnostic",
          detail: "The same approach for Science.",
        },
        {
          label: "CBSE paper practice",
          href: "/cbse-paper-practice",
          detail: "Practise real past papers once the gaps are known.",
        },
        {
          label: "Free learning check",
          href: "/free-learning-check",
          detail: "Five questions per subject, ₹0.",
        },
      ]}
      faqs={FAQS}
      sharePath={PATH}
      shareCampaign="maths_diagnostic"
    >
      <MarketingSection heading="What you get for Mathematics">
        <MarketingList
          items={[
            "Mastery bands against every active Mathematics outcome in the chapter group you choose.",
            "The gaps ranked by board weight and severity, with the exact questions missed.",
            "A recommended intervention per gap, mapped to that outcome.",
            "A study plan and AI tutor support inside that intervention — the tutor can explain, but cannot change a score.",
          ]}
        />
      </MarketingSection>

      <MarketingSection heading="Who does what">
        <p>
          The parent owns the account, buys the diagnostic and receives the reports. The learner
          signs in separately, answers the questions and works through the plan. Closure of a gap is
          decided by a fresh reassessment on questions the learner has not seen before.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
