import { createFileRoute } from "@tanstack/react-router";

import { LegalSection, PublicPageLayout } from "@/components/public-layout";
import { breadcrumbLd, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    pageHead({
      path: "/terms",
      title: "Terms of Service — EduOS",
      description:
        "The terms that govern use of the EduOS learning intelligence platform by tutoring centers, educators, students, and reviewers.",
      twitterCard: "summary",
      jsonLd: [breadcrumbLd([{ name: "Terms of Service", path: "/terms" }])],
    }),

  component: TermsPage,
});

function TermsPage() {
  return (
    <PublicPageLayout title="Terms of Service" updated="August 23, 2026">
      <p className="text-muted-foreground">
        These terms govern access to the EduOS deployment.
        By signing in, you agree to them.
      </p>

      <LegalSection heading="1. The service">
        <p>
          EduOS is a learning intelligence workspace for tutoring centers: learner rosters,
          diagnostic assessments, gap detection, intervention tracking, an AI tutor scoped to
          educator-approved interventions, and outcome reporting.
        </p>
      </LegalSection>

      <LegalSection heading="2. Accounts and roles">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium">Admins</span> manage the organization's roster, staff, and
            settings.
          </li>
          <li>
            <span className="font-medium">Educators</span> manage the learners assigned to them:
            assessments, interventions, and consent records.
          </li>
          <li>
            <span className="font-medium">Students</span> sign in with a handle and PIN, take
            assessments, follow their learning plan, and use the AI tutor once guardian consent is
            on file.
          </li>
          <li>
            <span className="font-medium">Reviewers</span> have read-only access to audit surfaces
            for independent verification. They cannot create, edit, or delete anything.
          </li>
        </ul>
        <p>You are responsible for keeping your credentials confidential.</p>
      </LegalSection>

      <LegalSection heading="3. Acceptable use">
        <p>
          Do not attempt to access another organization's data, another user's account, or data
          beyond your role. Do not probe or disrupt the service except through the built-in audit
          tooling. Automated scraping of learner data is prohibited.
        </p>
      </LegalSection>

      <LegalSection heading="4. AI tutor">
        <p>
          The AI tutor is a Socratic learning companion, not a grader. It explains, hints, and
          generates practice — it never changes scores, mastery, or evidence. It activates only for
          educator-approved interventions and only after parent/guardian consent is recorded. AI
          responses may occasionally be imperfect; educators remain responsible for instructional
          decisions.
        </p>
      </LegalSection>

      <LegalSection heading="5. Educational records">
        <p>
          The center owns its learner data. EduOS processes it to provide the service and applies
          organization-level isolation enforced at the database layer. See the{" "}
          <a href="/privacy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </a>{" "}
          for details.
        </p>
      </LegalSection>

      <LegalSection heading="6. Availability and changes">
        <p>
          This is a demonstration deployment provided as-is. Features may change between sprints;
          material changes to these terms or the privacy policy will be reflected with a new
          "last updated" date.
        </p>
      </LegalSection>

      <LegalSection heading="7. Contact">
        <p>
          Questions about these terms:{" "}
          <a href="mailto:support@eduos.global" className="font-medium text-primary hover:underline">
            support@eduos.global
          </a>
          .
        </p>
      </LegalSection>
    </PublicPageLayout>
  );
}
