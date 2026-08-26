import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  GraduationCap,
  ShieldCheck,
  X,
} from "lucide-react";

import { PilotForm } from "@/components/landing/pilot-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CENTRE_BENEFITS,
  EVIDENCE_CHAIN,
  FAQS,
  LOOP_STEPS,
  PARENT_QUESTIONS,
  PARENT_REPORT,
  PROOF_STRIP,
  ROLE_LANES,
  SAMPLE_LABEL,
  TUTOR_FALLBACK,
  TUTOR_SAFETY,
} from "@/lib/landing-content";

const TITLE = "EduOS — Prove the learning gap closed, don't claim it";
const DESCRIPTION =
  "EduOS closes the loop for tutoring centres: diagnose, detect the gap, intervene, tutor, reassess on fresh items, and publish verified mastery lift.";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Signed-in visitors keep going straight to the workspace. The marker
    // cookie is a hint only; the _authenticated gate is the real boundary.
    if (typeof document !== "undefined" && /(?:^|;\s*)eduos_session=1(?:;|$)/.test(document.cookie)) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
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
              description: DESCRIPTION,
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

function SampleTag() {
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      {SAMPLE_LABEL}
    </Badge>
  );
}

function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  muted,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section id={id} className={muted ? "border-t bg-muted/40" : "border-t"}>
      <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">{eyebrow}</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {lede ? <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{lede}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ClosureLoop />
        <TutorSafety />
        <SampleEvidence />
        <ParentTrust />
        <CentreBenefits />
        <FaqSection />
        <PilotCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4.5 w-4.5" />
          </span>
          <span className="text-base font-semibold tracking-tight">EduOS</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <a href="#how" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            How it works
          </a>
          <a href="#evidence" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Evidence
          </a>
          <a href="#faq" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            FAQ
          </a>
          <Link to="/auth" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Button asChild size="sm">
            <a href="#pilot">Apply for the pilot</a>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
      <Badge variant="secondary" className="font-normal">
        Learning intelligence for tutoring centres
      </Badge>
      <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Prove the learning gap closed. Don't claim it.
      </h1>
      <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
        EduOS runs the whole loop — diagnostic, gap detection, approved intervention, Socratic AI
        tutor, fresh-item reassessment — and ends with evidence a reviewer has signed.
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <a href="#pilot">
            Apply for the pilot <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href="#evidence">See a sample outcome report</a>
        </Button>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
        {PROOF_STRIP.map((s) => (
          <div key={s.label} className="bg-card p-5">
            <p className="text-3xl font-semibold tabular-nums tracking-tight">{s.value}</p>
            <p className="mt-1 text-sm font-medium">{s.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{SAMPLE_LABEL}.</p>
    </section>
  );
}

function HowItWorks() {
  return (
    <Section
      id="how"
      eyebrow="How EduOS works"
      title="One loop, three jobs"
      lede="Everyone in the centre works the same loop from their own side."
      muted
    >
      <div className="grid gap-4 md:grid-cols-3">
        {ROLE_LANES.map((lane) => (
          <div key={lane.role} className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">{lane.role}</h3>
            <ol className="mt-3 space-y-2.5">
              {lane.jobs.map((job, i) => (
                <li key={job} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <span>{job}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ClosureLoop() {
  const [open, setOpen] = useState<string>(LOOP_STEPS[0]!.key);
  return (
    <Section
      id="loop"
      eyebrow="The closure loop"
      title="Diagnostic → Gap → Intervention → Tutor → Reassessment → Evidence"
      lede="Follow one anonymised learner through every stage. Each step produces a real artefact — select a step to see it."
    >
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {LOOP_STEPS.map((step, i) => {
          const active = open === step.key;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setOpen(step.key)}
              aria-pressed={active}
              className={`rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                active ? "border-primary bg-accent" : "bg-card hover:bg-muted"
              }`}
            >
              <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                Step {i + 1}
              </span>
              <span className="mt-1 block text-sm font-medium">{step.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{step.artefact}</span>
            </button>
          );
        })}
      </div>

      {LOOP_STEPS.filter((s) => s.key === open).map((s) => (
        <div key={s.key} className="mt-5 rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold">{s.title}</h3>
            <SampleTag />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{s.detail}</p>
          <p className="mt-3 rounded-lg bg-muted p-3 font-mono text-xs">{s.sample}</p>
        </div>
      ))}
    </Section>
  );
}

function TutorSafety() {
  return (
    <Section
      id="safety"
      eyebrow="AI tutor safety"
      title="The tutor teaches. It never touches the record."
      lede="These are boundaries the code enforces, not promises in a policy document."
      muted
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">What it can do</h3>
          <ul className="mt-3 space-y-2">
            {TUTOR_SAFETY.filter((r) => r.can).map((r) => (
              <li key={r.text} className="flex gap-2.5 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">What it structurally cannot do</h3>
          <ul className="mt-3 space-y-2">
            {TUTOR_SAFETY.filter((r) => !r.can).map((r) => (
              <li key={r.text} className="flex gap-2.5 text-sm text-muted-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2.5 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        {TUTOR_FALLBACK}
      </p>
    </Section>
  );
}

function SampleEvidence() {
  return (
    <Section
      id="evidence"
      eyebrow="Sample outcome evidence"
      title="One complete evidence chain, start to signature"
      lede="This is the artefact a reviewer inspects. Baseline, action, retake, lift, verifier — in one row."
    >
      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-5">
          <h3 className="text-sm font-semibold">Evidence chain</h3>
          <SampleTag />
        </div>
        <dl className="divide-y">
          {EVIDENCE_CHAIN.map((row) => (
            <div key={row.label} className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="text-sm font-medium tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Reassessments use questions the learner has never seen, so the lift cannot be inflated by
        re-testing the same items.
      </p>
    </Section>
  );
}

function ParentTrust() {
  return (
    <Section
      id="parents"
      eyebrow="For parents"
      title="Three questions, answered with evidence"
      lede="Tutor access requires guardian consent. Consent is visible, reviewable and can be withdrawn at any time."
      muted
    >
      <div className="grid gap-4 md:grid-cols-3">
        {PARENT_QUESTIONS.map((p) => (
          <div key={p.question} className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">{p.question}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{p.answer}</p>
            <p className="mt-3 rounded-lg bg-muted p-3 text-xs">{p.sample}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-5">
          <h3 className="text-sm font-semibold">{PARENT_REPORT.title}</h3>
          <SampleTag />
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground">
            {PARENT_REPORT.learner} · {PARENT_REPORT.period}
          </p>
          <div className="mt-4 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-5">
            {PARENT_REPORT.lines.map((l) => (
              <div key={l.label} className="bg-card p-3">
                <p className="text-lg font-semibold tabular-nums">{l.value}</p>
                <p className="text-xs text-muted-foreground">{l.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{PARENT_REPORT.narrative}</p>
        </div>
      </div>
    </Section>
  );
}

function CentreBenefits() {
  return (
    <Section
      id="centres"
      eyebrow="For tutoring centres"
      title="Educator hours back, and proof at renewal time"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {CENTRE_BENEFITS.map((b) => (
          <div key={b.title} className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">{b.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function FaqSection() {
  return (
    <Section id="faq" eyebrow="FAQ" title="The questions buyers actually ask" muted>
      <Accordion type="single" collapsible className="rounded-xl border bg-card px-5">
        {FAQS.map((f, i) => (
          <AccordionItem key={f.q} value={`faq-${i}`}>
            <AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}

function PilotCta() {
  return (
    <Section
      id="pilot"
      eyebrow="Pilot programme"
      title="Run one grade, one subject, and see the evidence"
      lede="Tell us about your centre and we'll come back with pilot scope, timeline and what we need from you."
    >
      <PilotForm />
    </Section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-sm text-muted-foreground">
        <Link to="/about" className="hover:text-foreground">About</Link>
        <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
        <Link to="/contact" className="hover:text-foreground">Contact</Link>
        <Link to="/auth" className="hover:text-foreground">Sign in</Link>
        <span className="ml-auto text-xs">EduOS — Brightpath Learning</span>
      </div>
    </footer>
  );
}
