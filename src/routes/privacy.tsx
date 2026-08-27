import { createFileRoute } from "@tanstack/react-router";

import { LegalSection, PublicPageLayout } from "@/components/public-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — EduOS" },
      {
        name: "description",
        content:
          "How EduOS collects, uses, and protects learner, educator, and guardian data in the EduOS deployment.",
      },
      { property: "og:title", content: "Privacy Policy — EduOS" },
      {
        property: "og:description",
        content:
          "How EduOS collects, uses, and protects learner, educator, and guardian data in the EduOS deployment.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PublicPageLayout title="Privacy Policy" updated="August 23, 2026">
      <p className="text-muted-foreground">
        This policy describes how the EduOS deployment
        ("EduOS", "we") handles information. It is written for the tutoring centers, educators,
        students, and parents/guardians who use this workspace.
      </p>

      <LegalSection heading="What we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium">Account data</span> — staff names, work emails, and roles;
            student handles and PINs (never student email addresses).
          </li>
          <li>
            <span className="font-medium">Learning data</span> — assessment responses and scores,
            mastery history, learning gaps, interventions, and AI tutor session activity.
          </li>
          <li>
            <span className="font-medium">Guardian consent data</span> — parent/guardian name,
            email, mobile number, consent date, and the consent version accepted.
          </li>
          <li>
            <span className="font-medium">Usage essentials</span> — sign-in session and display
            preferences stored on your device (see our cookie notice below).
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="How we use it">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Run the core product: diagnostics, gap detection, interventions, and progress reports.</li>
          <li>Personalize the AI tutor to an educator-approved intervention for the student.</li>
          <li>Give educators and center admins visibility into their own organization's learners.</li>
          <li>Enforce access control and audit the platform's security behavior.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Who can see what">
        <p>
          Access is role-based and enforced at the database layer. Educators see only learners
          assigned to them; center admins see their own organization; students see only their own
          work; reviewers have read-only access to audit surfaces. AI tutor conversations are
          private to the student — staff see session aggregates (counts and practice accuracy),
          never the conversation text.
        </p>
      </LegalSection>

      <LegalSection heading="Children and guardian consent">
        <p>
          Students sign in with a handle and PIN issued by their center — we do not collect student
          email addresses. Assessments and learning plans are available to every enrolled learner.
          The AI tutor is unlocked only after a parent or guardian consent record (name, email,
          mobile, date, and consent version) is on file, recorded by center staff. Consent history
          is append-only: new versions are added as new records and past records are retained.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies and device storage">
        <p>
          EduOS uses essential storage only: your sign-in session, theme preference, and your cookie
          consent choice. We do not use advertising or cross-site tracking cookies. The consent
          banner lets you accept or limit storage to essentials; both choices keep the product
          fully functional.
        </p>
      </LegalSection>

      <LegalSection heading="Data retention and deletion">
        <p>
          Learning records are kept while the learner is enrolled at the center so progress trends
          remain meaningful. Center admins can request removal of a learner's records by contacting
          us at the address below.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about this policy or your data:{" "}
          <a href="mailto:support@eduos.global" className="font-medium text-primary hover:underline">
            support@eduos.global
          </a>
          .
        </p>
      </LegalSection>
    </PublicPageLayout>
  );
}
