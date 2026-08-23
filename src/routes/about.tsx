import { createFileRoute } from "@tanstack/react-router";
import { Crosshair, GraduationCap, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { PublicPageLayout } from "@/components/public-layout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About EduOS — Learning Intelligence for Tutoring Centers" },
      {
        name: "description",
        content:
          "EduOS closes the loop for tutoring centers: diagnose, detect gaps, intervene, tutor, reassess, and prove mastery lift.",
      },
      { property: "og:title", content: "About EduOS — Learning Intelligence for Tutoring Centers" },
      {
        property: "og:description",
        content:
          "EduOS closes the loop for tutoring centers: diagnose, detect gaps, intervene, tutor, reassess, and prove mastery lift.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AboutPage,
});

const PILLARS = [
  {
    icon: Crosshair,
    title: "Diagnose precisely",
    body: "Item-bank diagnostics pinpoint exactly which subtopic a learner is stuck on — not just a score.",
  },
  {
    icon: Sparkles,
    title: "Intervene with a tutor that teaches",
    body: "A Socratic AI tutor works only on educator-approved interventions, unlocked by guardian consent. It never touches scores.",
  },
  {
    icon: TrendingUp,
    title: "Prove the lift",
    body: "Fresh-item reassessments measure mastery after the intervention, so improvement is evidence — not a claim.",
  },
  {
    icon: ShieldCheck,
    title: "Auditable by design",
    body: "Every claim ships with a runnable probe. Reviewers get read-only access to verify isolation, policies, and outcomes themselves.",
  },
];

function AboutPage() {
  return (
    <PublicPageLayout title="About EduOS">
      <p className="text-base text-muted-foreground">
        EduOS is a learning intelligence platform for tutoring centers. It closes the loop that
        most tools leave open:{" "}
        <span className="font-medium text-foreground">
          diagnose → detect the gap → intervene → tutor → reassess → prove mastery lift.
        </span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-xl border p-4">
            <p.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-2 text-sm font-semibold">{p.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Who it's for</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium">Center admins</span> get organization-wide roster health
            and outcome summaries.
          </li>
          <li>
            <span className="font-medium">Educators</span> get a focused workflow: assign
            diagnostics, approve recommendations, track interventions, and see before/after
            outcomes.
          </li>
          <li>
            <span className="font-medium">Students</span> get a simple home: their plan, their
            assessments, their progress — and an AI tutor once a parent or guardian has consented.
          </li>
          <li>
            <span className="font-medium">Independent reviewers</span> get read-only audit access to
            verify every platform claim against live data.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">This deployment</h2>
        <p>
          You're looking at the EduOS demo operated by Brightpath Learning, seeded with realistic
          demonstration data across two organizations to prove tenant isolation. Sign in with a
          demo account from the{" "}
          <a href="/auth" className="font-medium text-primary hover:underline">
            sign-in page
          </a>{" "}
          to explore each role.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/50 p-3 text-xs text-muted-foreground">
          <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
          Demo scope: Grade 6 · Mathematics · Fractions.
        </div>
      </section>
    </PublicPageLayout>
  );
}
