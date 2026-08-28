import { createFileRoute } from "@tanstack/react-router";
import { Bot, Crosshair, GraduationCap, RefreshCcw, ShieldCheck } from "lucide-react";

import { PublicPageLayout } from "@/components/public-layout";

const TITLE = "About EduOS — Learning Intelligence and Intervention";
const DESCRIPTION =
  "EduOS is a Learning Intelligence and Intervention System: it names the specific learning gaps behind the marks, tracks the intervention, and reassesses on fresh items to evidence progress.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.eduos.global/about" },
    ],
    links: [{ rel: "canonical", href: "https://www.eduos.global/about" }],
  }),
  component: AboutPage,
});

const PILLARS = [
  {
    icon: Crosshair,
    title: "Name the gap, not just the mark",
    body: "Diagnostics are mapped to learning outcomes, so a result points at the specific skill causing difficulty rather than a single total.",
  },
  {
    icon: Bot,
    title: "Bounded AI support",
    body: "The AI tutor works inside an approved intervention. It explains and questions. It cannot edit a score and it cannot mark a gap closed.",
  },
  {
    icon: RefreshCcw,
    title: "Reassessment decides closure",
    body: "A gap is only treated as closed after a reassessment on questions the learner has not already answered.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence, kept together",
    body: "Diagnostic, intervention and reassessment stay linked as one record a parent, centre or reviewer can read.",
  },
];

function AboutPage() {
  return (
    <PublicPageLayout title="About EduOS">
      <p className="text-base text-muted-foreground">
        EduOS is a{" "}
        <span className="font-medium text-foreground">
          Learning Intelligence and Intervention System
        </span>
        . It closes the step most tools leave open:{" "}
        <span className="font-medium text-foreground">
          diagnostic → gap plan → guided intervention → tutor support → fresh reassessment →
          evidence.
        </span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-xl border p-4">
            <p.icon className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="mt-2 text-sm font-semibold">{p.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Who EduOS is for</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium">Parents</span> start with a free learning check, can buy
            a full diagnostic, and read the gaps and progress in plain language while the learner
            answers independently.
          </li>
          <li>
            <span className="font-medium">Learning centres</span> onboard an organization, import a
            roster, assign educators and diagnostics, work an intervention queue, and produce
            evidence per learner within their own isolated tenant.
          </li>
          <li>
            <span className="font-medium">Schools</span> are an expansion use case. EduOS can
            support earlier gap visibility, structured interventions, reassessment and evidence,
            but engagement is consultation-led.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">What EduOS is not</h2>
        <p className="text-muted-foreground">
          EduOS is not a general LMS, a school ERP, a fee-management system, an attendance platform
          or only an AI tutor. School-specific structures — classes and sections, timetables,
          attendance, academic calendars and SIS integration — are not implemented today.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Current scope</h2>
        <p className="text-muted-foreground">
          EduOS operates in India, prices in INR, and its operational content library covers CBSE
          Class 10 Mathematics and Science. Learner-facing surfaces support English and Hindi where
          currently translated.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/50 p-3 text-xs text-muted-foreground">
          <GraduationCap className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Scope: CBSE Class 10 · Mathematics &amp; Science · India · INR.
        </div>
      </section>
    </PublicPageLayout>
  );
}
