import { ArrowRight, ClipboardList, FileCheck2, RefreshCcw, Target } from "lucide-react";

const CHAIN = [
  {
    icon: Target,
    title: "Diagnostic result",
    body: "Answers are scored against the learning outcomes in the chapter group, so the result names skills rather than a single mark.",
  },
  {
    icon: ClipboardList,
    title: "Intervention record",
    body: "Each detected gap gets a recommended next step. The step is recorded, so what was done is visible later.",
  },
  {
    icon: RefreshCcw,
    title: "Fresh reassessment",
    body: "Closure is tested on questions the learner has not already answered, so a gap cannot be cleared by repeating the same items.",
  },
  {
    icon: FileCheck2,
    title: "Evidence item",
    body: "The diagnostic, the intervention and the reassessment stay linked as one record that a parent, centre or reviewer can read.",
  },
];

const PRINCIPLES = [
  "Effort alone does not close a gap — reassessment determines closure.",
  "Each step in the chain is timestamped where the application currently records it.",
  "The AI tutor explains and questions; it cannot change a score or close a gap.",
  "Reviewer controls apply on the surfaces where they are currently implemented.",
];

/**
 * Trust and evidence section. Describes only the chain the application
 * actually produces — no testimonials, third-party logos, case studies or
 * performance statistics.
 */
export function TrustSection() {
  return (
    <section id="evidence" className="scroll-mt-16 border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">
          Trust and evidence
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Built around evidence. Not unsupported promises.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Progress in EduOS is something you can trace. Every claim on a learner record comes from
          a chain of steps the platform recorded.
        </p>

        <ol className="mt-8 grid gap-3 md:grid-cols-4">
          {CHAIN.map((step, index) => (
            <li key={step.title} className="relative rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <step.icon className="h-4.5 w-4.5 text-primary" aria-hidden />
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                  Step {index + 1}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
              {index < CHAIN.length - 1 ? (
                <ArrowRight
                  className="absolute -right-2.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-border md:block"
                  aria-hidden
                />
              ) : null}
            </li>
          ))}
        </ol>

        <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
          {PRINCIPLES.map((principle) => (
            <li key={principle} className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              {principle}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
