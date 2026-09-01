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
import type { AudienceContent } from "@/components/landing/audience-section";
import { AudienceTabs } from "@/components/landing/audience-tabs";
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

const TITLE = "EduOS — CBSE Class 10 Maths & Science learning diagnostics";
const DESCRIPTION =
  "Find out exactly which CBSE Class 10 Maths and Science skills your child is losing marks on. ₹199 diagnostic, outcome-by-outcome report, targeted next steps and reassessment on fresh questions.";

const FAQS = [
  {
    q: "What does the ₹199 diagnostic include?",
    a: "One curriculum-mapped diagnostic of up to twenty questions on the chapter group you choose, an outcome-by-outcome report, the named gaps ranked, and the recommended next step for each one.",
  },
  {
    q: "Who creates the account, and who takes the test?",
    a: "The parent creates the account and makes the purchase. The learner signs in separately with their own handle and PIN and answers the questions themselves. The parent receives the report and the progress evidence.",
  },
  {
    q: "Is there anything free to try first?",
    a: "Yes. The free learning check is five questions per subject with no payment and no card. The learner answers it in their own workspace and the parent sees a preview of the skills checked.",
  },
  {
    q: "How does the ₹2,999 Annual Plan work?",
    a: "The Annual Plan is ₹2,999. If you have already paid ₹199 for the diagnostic and upgrade within 30 days, that ₹199 is credited, so ₹2,800 is payable.",
  },
  {
    q: "Can the AI tutor change results?",
    a: "No. The tutor works inside an approved intervention and can explain or question. It cannot edit a score, and it cannot mark a gap closed — only a reassessment on fresh questions does that.",
  },
  {
    q: "Which board, class and subjects are covered?",
    a: "CBSE Class 10 Mathematics and Science, in India, priced in INR. The interface is English only.",
  },
  {
    q: "Can a learning centre or school use EduOS?",
    a: "Centres can onboard an organisation, import a roster and run the same loop across learners. School engagement is consultation-led — school-specific structures such as classes, sections, timetables and attendance are not implemented today.",
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
        <AudienceTabs audiences={AUDIENCES} />
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
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-muted/50 via-background to-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-14 sm:pt-20 sm:pb-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <div>
            <Badge
              variant="secondary"
              className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[0.7rem] font-medium tracking-widest text-primary uppercase"
            >
              CBSE Class 10 · Maths &amp; Science
            </Badge>
            <h1 className="mt-6 max-w-2xl text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance sm:text-[2.6rem] lg:text-[2.75rem]">
              See exactly where your child is{" "}
              <span className="text-primary">losing marks.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              A ₹199 diagnostic names the specific Maths and Science skills behind the marks, gives
              a targeted next step for each gap, and reassesses on fresh questions to show whether
              the gap has closed.
            </p>
            <p className="mt-3 max-w-xl text-base font-medium text-foreground">
              Most tests give a score. EduOS names the skill, acts on it, and re-tests on fresh
              questions.
            </p>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
              <Button asChild size="lg" className="min-h-11 w-full shadow-sm sm:w-auto">
                <Link to="/diagnostic">
                  Start the ₹199 Diagnostic <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Link
                to="/auth"
                search={FREE_CHECK_SEARCH}
                className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Or try the free learning check
              </Link>
            </div>

            <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              You create the account and pay. Your child signs in separately with their own handle
              and PIN and answers the questions. You receive the report.
            </p>



            <StatRow />
          </div>

          {/* Illustrative product visual. This is a static UI example of the
              evidence chain layout — not a real learner record, and it contains
              no personal data and no performance claim. */}
          <ProofCard />
        </div>
      </div>
    </section>
  );
}

/**
 * Process facts, not marketing statistics. Each entry names a real step of the
 * EduOS loop; no percentages, counts or outcome claims are used here.
 */
const LOOP_STEPS = [
  { step: "Step 1", label: "Diagnostic" },
  { step: "Step 2", label: "Targeted Intervention" },
  { step: "Step 3", label: "Fresh Reassessment" },
  { step: "Step 4", label: "Evidence of Progress" },
];

function StatRow() {
  return (
    <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-6 sm:grid-cols-4">
      {LOOP_STEPS.map((item) => (
        <div key={item.label}>
          <dt className="text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
            {item.step}
          </dt>
          <dd className="mt-1 text-sm font-semibold tracking-tight text-foreground">
            {item.label}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * ILLUSTRATIVE PRODUCT PREVIEW — not a real learner record.
 *
 * Every value below is static sample content describing the EduOS workflow
 * (diagnostic → gap → intervention → reassessment → evidence). It contains no
 * personal data, no outcome statistics and no guarantee of a result. The dark
 * "ink" surface is a marketing-only token set that renders identically in the
 * light and dark themes.
 */
function ProofCard() {
  const rows = [
    { label: "Diagnostic", value: "Outcome-level result recorded", state: "Recorded" },
    { label: "Gap detected", value: "Named against a specific outcome", state: "Named" },
    { label: "Intervention", value: "Targeted next step, tracked", state: "In progress" },
    { label: "Reassessment", value: "Fresh questions, never reused", state: "Scheduled" },
    { label: "Evidence", value: "Steps linked as one record", state: "Available" },
  ];
  return (
    <figure className="relative m-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 -bottom-3 h-10 rounded-b-3xl bg-foreground/10 blur-xl"
      />
      <div
        role="group"
        aria-label="Illustrative product preview of the EduOS evidence chain. Sample content only."
        className="relative overflow-hidden rounded-2xl border border-ink-border bg-ink text-ink-foreground shadow-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-border bg-ink-raised px-5 py-4">
          <div>
            <p className="text-[0.65rem] font-medium tracking-widest text-ink-muted uppercase">
              EduOS · Learner workspace
            </p>
            <h2 className="mt-1 text-sm font-semibold text-ink-foreground">Evidence chain</h2>
          </div>
          <span className="rounded-full border border-ink-border px-2.5 py-1 text-[0.65rem] font-medium tracking-wide text-ink-muted">
            Illustrative sample
          </span>
        </div>

        <dl className="divide-y divide-ink-border px-5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <dt className="text-[0.7rem] font-medium tracking-widest text-ink-muted uppercase">
                  {row.label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink-foreground">{row.value}</dd>
              </div>
              <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[0.7rem] font-medium text-ink-accent">
                {row.state}
              </span>
            </div>
          ))}
        </dl>

        <figcaption className="border-t border-ink-border bg-ink-raised px-5 py-3 text-xs text-ink-muted">
          Sample layout only. It does not represent a real learner, a real result, or a guarantee
          that a gap will close.
        </figcaption>
      </div>
    </figure>
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
    <section id="problem" className="scroll-mt-16 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-widest text-primary uppercase">The problem</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
            Marks describe the result. They rarely explain the cause.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PROBLEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          EduOS is built for the step in between: naming the gap, acting on it, and checking
          whether the action worked.
        </p>
      </div>
    </section>
  );
}


const AUDIENCES: (AudienceContent & { tabLabel: string })[] = [
  {
    id: "parents",
    tabLabel: "Parents",
    eyebrow: "For parents",
    title: "How it works for your family",
    lede: "You own the account and the purchase. Your child signs in separately with a handle and PIN, answers the questions unaided, and you get the report and the evidence.",
    points: [
      "A report skill by skill, not just a total score",
      "The gaps named and ranked, with a targeted next step for each",
      "A study plan built from the gaps that were detected",
      "Reassessment on fresh questions decides whether a gap has closed",
      "You can start free: five questions per subject, no card needed",
    ],
    cta: { label: "Start the ₹199 Diagnostic", to: "/diagnostic" },
    secondary: (
      <Link
        to="/auth"
        search={FREE_CHECK_SEARCH}
        className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Or try the free learning check
      </Link>
    ),
    qualifier:
      "EduOS reports what the assessments show. It does not promise that every gap will close or that a particular grade will be achieved.",
    aside: (
      <div className="rounded-2xl border bg-card p-5">
        <h4 className="text-sm font-semibold">What you receive</h4>
        <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
          <li>A free 5-question learning check per subject, with a preview report.</li>
          <li>The ₹199 diagnostic report, outcome by outcome.</li>
          <li>The named gaps and the recommended next step for each.</li>
          <li>Reassessment results showing whether a gap has closed.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "centres",
    tabLabel: "Centres",
    eyebrow: "For learning centres",
    title: "Run the gap-closure loop across your roster",
    lede: "Onboard your centre, import your learners, assign diagnostics, and work a prioritised intervention queue with evidence at the end of it.",
    points: [
      "Centre onboarding with organization and first-admin provisioning",
      "Educator workflows for assignment, review and approval",
      "CSV learner import for your existing roster",
      "Educator-to-learner assignment and diagnostic assignment",
      "Learner gap visibility, intervention queues and cohort heatmaps",
      "Reassessment and evidence records per learner",
      "Tenant isolation, so each centre sees only its own data",
    ],
    cta: { label: "Book a Centre Demo", to: "/contact", search: { ...CENTRE_DEMO_SEARCH } },
    qualifier:
      "EduOS is not a fee, payroll, attendance, timetable or scheduling product. It is the learning-outcome layer alongside whatever you already use for operations.",
    aside: (
      <div className="rounded-2xl border bg-card p-5">
        <h4 className="text-sm font-semibold">A centre's working week</h4>
        <ol className="mt-3 space-y-2.5 text-sm text-muted-foreground">
          <li>1. Assign a diagnostic to a group of learners.</li>
          <li>2. Read the cohort heatmap and see which outcomes are weak.</li>
          <li>3. Work the intervention queue, worst gap first.</li>
          <li>4. Reassess on fresh items and share the evidence with families.</li>
        </ol>
      </div>
    ),
  },
  {
    id: "schools",
    tabLabel: "Schools",
    eyebrow: "For schools",
    title: "Earlier gap visibility, explored with us first",
    lede: "EduOS can help schools explore earlier learning-gap visibility, structured interventions, reassessment and evidence. School deployment is consultation-led.",
    points: [
      "Diagnostics that report against learning outcomes, not only totals",
      "Structured interventions recorded against each detected gap",
      "Reassessment on fresh items to determine closure",
      "Evidence records that can be reviewed by staff",
    ],
    cta: { label: "Talk to EduOS", to: "/contact", search: { topic: "school" } },
    qualifier:
      "Current operational content is CBSE Class 10 Mathematics and Science. School-specific structures — classes and sections, timetables, attendance, academic calendars, district reporting and SIS/LMS integration — are not implemented today and would require configuration or future development. We will tell you plainly what fits before anything is agreed.",
  },
];


function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-16 border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">Pricing</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Simple pricing, in INR
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Pay ₹199 once for the diagnostic. If you later upgrade, that ₹199 comes off the Annual
          Plan. Centres and schools are priced after a demo.
        </p>

        {/* Credit callout: the exact runtime rule (₹199 credited within a
            30-day window, so ₹2,800 is payable on the ₹2,999 Annual Plan). */}
        <p className="mt-5 max-w-2xl rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
          Your ₹199 is credited toward the Annual Plan. You pay{" "}
          <span className="font-semibold tabular-nums">₹2,800</span>, not{" "}
          <span className="tabular-nums">₹2,999</span> — valid for 30 days.
        </p>



        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">Free Learning Check</h3>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">Free</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Five questions per subject, answered by the learner, with a preview of the skills
              checked and possible gaps. No card required.
            </p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/auth" search={FREE_CHECK_SEARCH}>Start free</Link>
            </Button>
          </div>

          <div className="rounded-xl border-2 border-primary bg-card p-5">
            <h3 className="text-sm font-semibold">Diagnostic</h3>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">₹199</p>
            <p className="mt-2 text-sm text-muted-foreground">
              One curriculum-mapped diagnostic of up to twenty questions, an outcome-by-outcome gap
              report and the recommended next step for each gap.
            </p>
            <Button asChild className="mt-4 w-full">
              <Link to="/diagnostic">Start the ₹199 Diagnostic</Link>
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">Annual Plan</h3>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">₹2,999</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Guided practice, AI tutor access with guardian consent, reassessment on fresh
              questions and evidence records for the year.
            </p>
            <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Already paid ₹199 for the diagnostic? That ₹199 is credited if you upgrade within 30
              days, so <span className="font-medium text-foreground">₹2,800</span> is payable. The
              Annual Plan is offered from your diagnostic report.
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
