import { createFileRoute } from "@tanstack/react-router";

import {
  MarketingList,
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";
import { breadcrumbLd, faqLd, offerLd, pageHead } from "@/lib/seo";

const PATH = "/class-10-science-diagnostic";
const TITLE = "Class 10 Science Diagnostic — outcome-level gap report | EduOS";
const DESCRIPTION =
  "A ₹199 CBSE Class 10 Science diagnostic mapped to curriculum outcomes across Physics, Chemistry and Biology topics, with ranked gaps and a next step for each.";

const FAQS = [
  {
    q: "Does it cover Physics, Chemistry and Biology?",
    a: "It covers CBSE Class 10 Science. You choose one chapter group, and the diagnostic draws curriculum-mapped questions for the outcomes in that group.",
  },
  {
    q: "Is this a mock test?",
    a: "No. A mock test gives a score. This gives an outcome-level map of which specific skills are weak, ranked by how much they matter in the board paper.",
  },
  {
    q: "How is progress proved?",
    a: "By a fresh reassessment on unseen questions after the intervention. The AI tutor cannot mark a gap closed.",
  },
];

export const Route = createFileRoute("/class-10-science-diagnostic")({
  head: () =>
    pageHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      ogType: "product",
      jsonLd: [
        breadcrumbLd([{ name: "Class 10 Science diagnostic", path: PATH }]),
        offerLd({
          name: "CBSE Class 10 Science Diagnostic",
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
      eyebrow="CBSE Class 10 · Science"
      title="Class 10 Science diagnostic"
      intro="Science marks are lost for very different reasons — a misread definition, an unbalanced equation, a diagram misinterpreted, a numerical method never secured. This diagnostic tells you which of those is happening."
      primary={{ label: "Start the ₹199 Diagnostic", href: "/diagnostic", cta: "diagnostic_start" }}
      secondary={{
        label: "Try five free questions",
        href: "/free-learning-check",
        cta: "free_check",
      }}
      whatNext={[
        "Create a parent account and choose Science with the chapter group you want checked.",
        "Pay ₹199 for that diagnostic.",
        "Your child signs in with their own handle and PIN and answers the questions.",
        "You read the ranked, outcome-level report and follow the recommended intervention for each gap.",
      ]}
      internalLinks={[
        {
          label: "How the diagnostic works",
          href: "/cbse-class-10-learning-gap-diagnostic",
          detail: "The full ₹199 diagnostic explained, with pricing.",
        },
        {
          label: "Class 10 Mathematics diagnostic",
          href: "/class-10-maths-diagnostic",
          detail: "The same approach for Mathematics.",
        },
        {
          label: "Fresh reassessment and evidence",
          href: "/reassessment-and-evidence",
          detail: "How a closed gap is proved.",
        },
        {
          label: "CBSE paper practice",
          href: "/cbse-paper-practice",
          detail: "Practise real past papers with the gaps in mind.",
        },
      ]}
      faqs={FAQS}
      sharePath={PATH}
      shareCampaign="science_diagnostic"
    >
      <MarketingSection heading="What you get for Science">
        <MarketingList
          items={[
            "Mastery bands against every active Science outcome in the chapter group you choose.",
            "Ranked gaps with the exact questions missed on each outcome.",
            "A recommended intervention per gap, mapped to that outcome.",
            "A study plan, with AI tutor support bounded to the approved intervention.",
          ]}
        />
      </MarketingSection>

      <MarketingSection heading="Pricing">
        <MarketingList
          items={[
            "Free Learning Check — ₹0.",
            "Diagnostic — ₹199.",
            "Annual Plan — ₹2,999, with a ₹199 credit if you upgrade within 30 days of a diagnostic, so ₹2,800 payable.",
          ]}
        />
      </MarketingSection>
    </MarketingPage>
  );
}
