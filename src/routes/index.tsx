import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";

import { PilotForm } from "@/components/landing/pilot-form";
import { AudienceSection } from "@/components/landing/audience-section";
import { LoopSection } from "@/components/landing/loop-section";
import { TrustSection } from "@/components/landing/trust-section";
import {
  CENTRE_DEMO_SEARCH,
  FREE_CHECK_SEARCH,
  PublicSiteFooter,
  PublicSiteHeader,
} from "@/components/public-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TITLE = "EduOS — Find the learning gaps. Prove the progress.";
const DESCRIPTION =
  "EduOS is a Learning Intelligence and Intervention System. It identifies specific learning gaps, creates targeted next steps, tracks interventions and uses fresh reassessment to evidence progress. CBSE Class 10 Mathematics and Science.";

const FAQS = [
  {
    q: "What exactly is EduOS?",
    a: "A Learning Intelligence and Intervention System. It runs a diagnostic, names the specific learning gaps behind the marks, records the intervention taken against each gap, and reassesses on fresh questions to determine whether the gap has closed.",
  },
  {
    q: "What does the free learning check include?",
    a: "Five verified questions, one per subject area, with no payment and no card required. The learner answers it in their own workspace and the parent sees a limited preview of the report.",
  },
  {
    q: "What does the ₹199 diagnostic add?",
    a: "A full curriculum-mapped diagnostic of up to twenty questions with an outcome-by-outcome report, the named gaps ranked, and the recommended next step for each one.",
  },
  {
    q: "How does the ₹2,999 plan work?",
    a: "The annual Board Success Plan is ₹2,999. If you have already paid for the ₹199 diagnostic and upgrade within the credit window, that ₹199 is applied, so ₹2,800 is payable.",
  },
  {
    q: "Can the AI tutor change results?",
    a: "No. The tutor works inside an approved intervention and can explain or question. It cannot edit a score, and it cannot mark a gap closed — only a fresh reassessment does that.",
  },
  {
    q: "Which board, class and subjects are supported today?",
    a: "CBSE Class 10 Mathematics and Science, in India, priced in INR. Learner-facing surfaces support English and Hindi where currently translated.",
  },
  {
    q: "Can a school use EduOS?",
    a: "School engagement is consultation-led. EduOS can support earlier gap visibility, interventions, reassessment and evidence, but school-specific structures such as classes, sections, timetables, attendance and academic calendars are not implemented today.",
  },
];

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Signed-in visitors keep going straight to the workspace. The marker
    // cookie is a hint only; the _authenticated gate is the real boundary.
    if (hasSessionMarker()) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.eduos.global/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.eduos.global/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "EduOS",
              url: "https://www.eduos.global",
              email: "support@eduos.global",
              telephone: "+91-9850820909",
              description: DESCRIPTION,
              address: {
                "@type": "PostalAddress",
                streetAddress: "Tilak Ward, Deori",
                addressLocality: "Sagar",
                addressRegion: "Madhya Pradesh",
                postalCode: "470226",
                addressCountry: "IN",
              },
            },
            {
              "@type": "SoftwareApplication",
              name: "EduOS",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              description: DESCRIPTION,
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],
  }),
  component: LandingPage,
});

function hasSessionMarker() {
  return typeof document !== "undefined" && /(?:^|;\s*)eduos_session=1(?:;|$)/.test(document.cookie);
}

function LandingPage() {
  const navigate = useNavigate();

  // SSR can't read the marker cookie through beforeLoad, so signed-in visitors
  // are forwarded to the workspace right after hydration.
  useEffect(() => {
    if (hasSessionMarker()) void navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <PublicSiteHeader />
      <main id="main-content" className="flex-1">
        <Hero />
        <ProblemSection />
        <LoopSection />
        <ParentsSection />
        <CentresSection />
        <SchoolsSection />
        <TrustSection />
        <PricingSection />
        <FaqSection />
        <CentreCtaSection />
      </main>
      <PublicSiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 pb-12 sm:pt-20 sm:pb-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Badge variant="secondary" className="font-normal">
            Learning Intelligence &amp; Intervention
          </Badge>
          <h1 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Find the learning gaps. Close them with purpose. Prove the progress.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            EduOS identifies specific learning gaps, creates targeted next steps, tracks
            interventions, and uses fresh reassessment to provide evidence of demonstrated
            progress.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button asChild size="lg">
              <Link to="/auth" search={FREE_CHECK_SEARCH}>
                Start a Free Learning Check <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contact" search={CENTRE_DEMO_SEARCH}>
                Book a Centre Demo
              </Link>
            </Button>
          </div>

          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            CBSE Class 10 Mathematics and Science. No credit card required for the free check.
          </p>
        </div>

        {/* Illustrative product visual. This is a static UI example of the
            evidence chain layout — not a real learner record, and it contains
            no personal data and no performance claim. */}
        <ProofCard />
      </div>
    </section>
  );
}

function ProofCard() {
  const rows = [
    { label: "Diagnostic", value: "Outcome-level result recorded" },
    { label: "Gap detected", value: "Named against a specific outcome" },
    { label: "Intervention", value: "Targeted next step, tracked" },
    { label: "Reassessment", value: "Fresh questions, never reused" },
    { label: "Evidence", value: "Steps linked as one record" },
  ];
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <h2 className="text-sm font-semibold">Evidence chain</h2>
        <Badge variant="outline" className="font-normal text-muted-foreground">
          Illustrative product visual
        </Badge>
      </div>
      <dl className="divide-y">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-0.5 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="text-sm font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1 text-xs text-muted-foreground">
        Example layout only. It does not represent a real learner or an outcome guarantee.
      </p>
    </div>
  );
}

const PROBLEMS = [
  {
    icon: Users,
    title: "Parents",
    body: "A learner can work hard without the family knowing which underlying skills are causing difficulty.",
  },
  {
    icon: Building2,
    title: "Learning Centres",
    body: "Tutors can work hard while evidence of progress remains scattered and difficult to communicate to families.",
  },
  {
    icon: GraduationCap,
    title: "Schools",
    body: "End-of-term marks can identify a problem after important instructional time has already passed.",
  },
];

function ProblemSection() {
  return (
    <section id="problem" className="scroll-mt-16 border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">The problem</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Marks describe the result. They rarely explain the cause.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((item) => (
            <div key={item.title} className="rounded-xl border bg-card p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-4.5 w-4.5 text-primary" aria-hidden />
              </span>
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          EduOS is built for the step in between: naming the gap, acting on it, and checking
          whether the action worked.
        </p>
      </div>
    </section>
  );
}

function ParentsSection() {
  return (
    <AudienceSection
      id="parents"
      eyebrow="For parents"
      title="See where your child is actually struggling"
      lede="Start with a free learning check. Your child answers it themselves, and you get a readable view of the skills behind the marks."
      points={[
        "A diagnostic that reports skill by skill, not just a total score",
        "A targeted study plan built from the gaps that were detected",
        "Progress visibility as steps are completed and reassessed",
        "The learner answers independently — you receive the report and evidence",
        "A gap is only treated as closed after a fresh reassessment",
      ]}
      cta={{ label: "Start a Free Learning Check", to: "/auth", search: { ...FREE_CHECK_SEARCH } }}
      secondary={
        <Button asChild size="lg" variant="outline">
          <Link to="/diagnostic">See the ₹199 diagnostic</Link>
        </Button>
      }
      qualifier="EduOS reports what the assessments show. It does not promise that every gap will close or that a particular grade will be achieved."
      muted
      aside={
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold">What a parent receives</h3>
          <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
            <li>A free 5-question learning check per subject, with a preview report.</li>
            <li>The ₹199 full diagnostic report, outcome by outcome.</li>
            <li>The named gaps and the recommended next step for each.</li>
            <li>Reassessment results showing whether a gap has closed.</li>
          </ul>
        </div>
      }
    />
  );
}

function CentresSection() {
  return (
    <AudienceSection
      id="centres"
      eyebrow="For learning centres"
      title="Run the gap-closure loop across your roster"
      lede="Onboard your centre, import your learners, assign diagnostics, and work a prioritised intervention queue with evidence at the end of it."
      points={[
        "Centre onboarding with organization and first-admin provisioning",
        "Educator workflows for assignment, review and approval",
        "CSV learner import for your existing roster",
        "Educator-to-learner assignment and diagnostic assignment",
        "Learner gap visibility, intervention queues and cohort heatmaps",
        "Reassessment and evidence records per learner",
        "Tenant isolation, so each centre sees only its own data",
      ]}
      cta={{ label: "Book a Centre Demo", to: "/contact", search: { ...CENTRE_DEMO_SEARCH } }}
      qualifier="EduOS is not a fee, payroll, attendance, timetable or scheduling product. It is the learning-outcome layer alongside whatever you already use for operations."
      aside={
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold">A centre's working week</h3>
          <ol className="mt-3 space-y-2.5 text-sm text-muted-foreground">
            <li>1. Assign a diagnostic to a group of learners.</li>
            <li>2. Read the cohort heatmap and see which outcomes are weak.</li>
            <li>3. Work the intervention queue, worst gap first.</li>
            <li>4. Reassess on fresh items and share the evidence with families.</li>
          </ol>
        </div>
      }
    />
  );
}

function SchoolsSection() {
  return (
    <AudienceSection
      id="schools"
      eyebrow="For schools"
      title="Earlier gap visibility, explored with us first"
      lede="EduOS can help schools explore earlier learning-gap visibility, structured interventions, reassessment and evidence. School deployment is consultation-led."
      points={[
        "Diagnostics that report against learning outcomes, not only totals",
        "Structured interventions recorded against each detected gap",
        "Reassessment on fresh items to determine closure",
        "Evidence records that can be reviewed by staff",
      ]}
      cta={{ label: "Talk to EduOS", to: "/contact", search: { topic: "school" } }}
      qualifier="Current operational content is CBSE Class 10 Mathematics and Science. School-specific structures — classes and sections, timetables, attendance, academic calendars, district reporting and SIS/LMS integration — are not implemented today and would require configuration or future development. We will tell you plainly what fits before anything is agreed."
      muted
    />
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-16 border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">Pricing</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Direct-parent pricing, in INR
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Centres and schools are priced after a demo, based on roster size and scope.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">Free Learning Check</h3>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">Free</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Five verified questions per subject, answered by the learner, with a preview of the
              skills checked and possible gaps. No card required.
            </p>
            <Button asChild className="mt-4 w-full">
              <Link to="/auth" search={FREE_CHECK_SEARCH}>Start free</Link>
            </Button>
          </div>

          <div className="rounded-xl border-2 border-primary bg-card p-5">
            <h3 className="text-sm font-semibold">Full Diagnostic</h3>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">₹199</p>
            <p className="mt-2 text-sm text-muted-foreground">
              One curriculum-mapped diagnostic of up to twenty questions, an outcome-by-outcome gap
              report and the recommended next step for each gap.
            </p>
            <Button asChild className="mt-4 w-full">
              <Link to="/diagnostic">Start the ₹199 diagnostic</Link>
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">Annual Board Success Plan</h3>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">₹2,999</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Guided practice, AI tutor access with guardian consent, reassessment on fresh items
              and evidence records for the year.
            </p>
            <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Already paid for the ₹199 diagnostic? That ₹199 is credited against an eligible
              upgrade, so <span className="font-medium text-foreground">₹2,800</span> is payable.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-16 border-t bg-muted/40">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">FAQ</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          The questions we are actually asked
        </h2>
        <Accordion type="single" collapsible className="mt-8 rounded-xl border bg-card px-5">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CentreCtaSection() {
  return (
    <section id="demo" className="scroll-mt-16 border-t">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">
          Centre and school enquiries
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Book a Centre Demo
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Tell us about your centre or school and we will come back with scope, timeline and what
          we need from you. You can also email{" "}
          <a href="mailto:support@eduos.global" className="font-medium text-primary hover:underline">
            support@eduos.global
          </a>
          .
        </p>
        <div className="mt-8">
          <PilotForm />
        </div>
      </div>
    </section>
  );
}
