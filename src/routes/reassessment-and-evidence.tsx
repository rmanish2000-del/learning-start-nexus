import { createFileRoute } from "@tanstack/react-router";

import {
  MarketingList,
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";
import { breadcrumbLd, faqLd, pageHead } from "@/lib/seo";

const PATH = "/reassessment-and-evidence";
const TITLE = "Fresh Reassessment and Evidence of Progress | EduOS";
const DESCRIPTION =
  "How EduOS proves a CBSE Class 10 learning gap has closed: a fresh reassessment on unseen questions, linked to the original diagnostic and intervention as one evidence chain.";

const FAQS = [
  {
    q: "What makes a reassessment 'fresh'?",
    a: "It uses questions the learner has not already answered in the diagnostic or the intervention, mapped to the same learning outcome.",
  },
  {
    q: "Can the AI tutor close a gap?",
    a: "No. The tutor works inside an approved intervention and can explain or question. It cannot change a score and it cannot mark a gap closed.",
  },
  {
    q: "What does the parent see?",
    a: "The diagnostic, the intervention and the reassessment kept together as one linked record, readable by the parent, the centre and a reviewer.",
  },
];

export const Route = createFileRoute("/reassessment-and-evidence")({
  head: () =>
    pageHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      ogType: "article",
      jsonLd: [breadcrumbLd([{ name: "Reassessment and evidence", path: PATH }]), faqLd(FAQS)],
    }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Proof, not promises"
      title="Fresh reassessment and evidence of progress"
      intro="Most tools claim improvement. EduOS makes closure a measurable event: a gap stays open until a reassessment on unseen questions says otherwise, and the whole chain stays readable."
      primary={{ label: "Start the ₹199 Diagnostic", href: "/diagnostic", cta: "diagnostic_start" }}
      secondary={{
        label: "Read the parent guide",
        href: "/parent-guide-learning-gaps",
        cta: "free_check",
      }}
      whatNext={[
        "A diagnostic names and ranks the gaps.",
        "An approved intervention works on one gap, with bounded AI tutor support.",
        "A fresh reassessment is set on questions the learner has not seen.",
        "The result decides closure, and the whole chain stays linked as evidence.",
      ]}
      internalLinks={[
        {
          label: "CBSE Class 10 learning gap diagnostic",
          href: "/cbse-class-10-learning-gap-diagnostic",
          detail: "Where the evidence chain begins.",
        },
        {
          label: "Parent guide to learning gaps",
          href: "/parent-guide-learning-gaps",
          detail: "Reading a gap report in plain language.",
        },
        {
          label: "CBSE paper practice",
          href: "/cbse-paper-practice",
          detail: "Timed past-paper attempts alongside the plan.",
        },
        {
          label: "About EduOS",
          href: "/about",
          detail: "The principle behind the product.",
        },
      ]}
      faqs={FAQS}
      sharePath={PATH}
      shareCampaign="reassessment_evidence"
    >
      <MarketingSection heading="The rule">
        <p>
          No claim of progress without a fresh, independent reassessment. Practice does not close a
          gap. Time spent does not close a gap. An AI conversation does not close a gap. Only a
          reassessment on unseen questions mapped to the same outcome does.
        </p>
      </MarketingSection>

      <MarketingSection heading="What is kept as evidence">
        <MarketingList
          items={[
            "The original diagnostic result, outcome by outcome.",
            "The intervention that was approved and worked through.",
            "The reassessment, its questions and its result.",
            "The closure decision, linked to all of the above in one record.",
          ]}
        />
      </MarketingSection>

      <MarketingSection heading="Who can read it">
        <p>
          The parent who owns the account, the learning centre running the programme, and a
          reviewer where one is involved. Learner answers stay inside the learner's own workspace.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
