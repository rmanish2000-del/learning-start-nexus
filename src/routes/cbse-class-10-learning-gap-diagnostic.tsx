import { createFileRoute } from "@tanstack/react-router";

import {
  MarketingList,
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";
import { breadcrumbLd, faqLd, offerLd, pageHead } from "@/lib/seo";

const PATH = "/cbse-class-10-learning-gap-diagnostic";
const TITLE = "CBSE Class 10 Learning Gap Diagnostic — EduOS";
const DESCRIPTION =
  "A ₹199 CBSE Class 10 Mathematics or Science diagnostic that names the exact learning outcomes losing marks, ranks the gaps and sets the next step for each one.";

const FAQS = [
  {
    q: "What does the ₹199 diagnostic include?",
    a: "One curriculum-mapped diagnostic of up to twenty questions on the chapter group you choose, an outcome-by-outcome report, the named gaps ranked, and the recommended next step for each one.",
  },
  {
    q: "Who buys it and who answers the questions?",
    a: "The parent creates the account, buys the diagnostic and receives the report. The learner signs in separately with their own handle and PIN and answers the questions themselves.",
  },
  {
    q: "Does the AI tutor decide whether a gap is closed?",
    a: "No. The AI tutor explains and questions inside an approved intervention. It cannot change a score and it cannot mark a gap closed. Only a fresh reassessment on unseen questions does that.",
  },
  {
    q: "What if we want everything for the year?",
    a: "The Annual Plan is ₹2,999. If you have already paid ₹199 for a diagnostic and upgrade within 30 days, that ₹199 is credited, so ₹2,800 is payable.",
  },
];

export const Route = createFileRoute("/cbse-class-10-learning-gap-diagnostic")({
  head: () =>
    pageHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      ogType: "product",
      jsonLd: [
        breadcrumbLd([{ name: "CBSE Class 10 Learning Gap Diagnostic", path: PATH }]),
        offerLd({
          name: "CBSE Class 10 Learning Gap Diagnostic",
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
      eyebrow="CBSE Class 10 · Mathematics & Science"
      title="Find the exact learning gaps behind your child's Class 10 marks"
      intro="A score tells you there is a problem. The EduOS diagnostic tells you which learning outcome caused it — outcome by outcome, ranked by how much it matters in the CBSE Class 10 paper."
      primary={{ label: "Start the ₹199 Diagnostic", href: "/diagnostic", cta: "diagnostic_start" }}
      secondary={{
        label: "Try the free learning check first",
        href: "/free-learning-check",
        cta: "free_check",
      }}
      whatNext={[
        "You create a parent account and pay ₹199 for one diagnostic in Mathematics or Science.",
        "Your child signs in with their own handle and PIN and answers up to twenty curriculum-mapped questions.",
        "You receive an outcome-by-outcome report with the named gaps ranked by board weight and severity.",
        "Each gap gets a recommended intervention, and closure is decided later by a fresh reassessment on unseen questions.",
      ]}
      internalLinks={[
        {
          label: "Class 10 Mathematics diagnostic",
          href: "/class-10-maths-diagnostic",
          detail: "What the Mathematics diagnostic checks and reports.",
        },
        {
          label: "Class 10 Science diagnostic",
          href: "/class-10-science-diagnostic",
          detail: "What the Science diagnostic checks and reports.",
        },
        {
          label: "Parent guide to learning gaps",
          href: "/parent-guide-learning-gaps",
          detail: "How to read a gap report and decide what to do next.",
        },
        {
          label: "Fresh reassessment and evidence",
          href: "/reassessment-and-evidence",
          detail: "How EduOS proves a gap has actually closed.",
        },
      ]}
      faqs={FAQS}
      sharePath={PATH}
      shareCampaign="class10_diagnostic"
    >
      <MarketingSection heading="What the report actually tells you">
        <MarketingList
          items={[
            "Mastery bands — Weak, Developing, Secure or Strong — against every active outcome in the chapter group.",
            "The named gaps, ordered by board weight multiplied by severity, with the questions missed on each one.",
            "The recommended intervention mapped to each gap.",
            "A report kept in your account, whether or not you upgrade.",
          ]}
        />
      </MarketingSection>

      <MarketingSection heading="The full learning loop">
        <p>
          Diagnostic → gap plan → study plan → AI tutor → guided intervention → fresh reassessment →
          evidence chain → CBSE paper practice. Each stage is a real product step, not a promise:
          the reassessment uses questions the learner has not already answered, and only that
          reassessment decides whether a gap is closed.
        </p>
      </MarketingSection>

      <MarketingSection heading="Pricing, in full">
        <MarketingList
          items={[
            "Free Learning Check — ₹0, five questions per subject, no card.",
            "Diagnostic — ₹199 for one subject chapter group.",
            "Annual Plan — ₹2,999.",
            "Upgrading within 30 days of a ₹199 diagnostic credits that ₹199, so ₹2,800 is payable.",
          ]}
        />
      </MarketingSection>
    </MarketingPage>
  );
}
