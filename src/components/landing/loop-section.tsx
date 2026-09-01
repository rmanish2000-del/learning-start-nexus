import { BadgeCheck, Bot, ClipboardList, MessagesSquare, RefreshCcw, Target } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


const STEPS = [
  {
    icon: Target,
    title: "Diagnostic",
    body: "A curriculum-mapped assessment places every answer against a specific learning outcome.",
  },
  {
    icon: ClipboardList,
    title: "Gap Plan",
    body: "Weak outcomes become a named, ordered list of gaps with a targeted next step for each.",
  },
  {
    icon: MessagesSquare,
    title: "Guided Intervention",
    body: "The recommended step is tracked as an intervention record — by a centre educator, or generated as a study plan for direct-parent learners.",
  },
  {
    icon: Bot,
    title: "Tutor Support",
    body: "An AI tutor works within the approved intervention. It explains and questions; it never edits a score or marks a gap closed.",
  },
  {
    icon: RefreshCcw,
    title: "Fresh Reassessment",
    body: "Closure is tested on questions the learner has not seen before. Only reassessment can close a gap.",
  },
  {
    icon: BadgeCheck,
    title: "Evidence",
    body: "The diagnostic, the intervention and the reassessment stay linked as a single readable record.",
  },
];

/**
 * Public "How EduOS works" section: desktop grid, mobile vertical stepper.
 * (The authenticated first-login intro lives in components/how-it-works.tsx
 * and is intentionally separate from this marketing surface.)
 */
export function LoopSection() {
  return (
    <section id="how" className="scroll-mt-16 border-t bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">How EduOS works</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          One loop, from first diagnostic to recorded evidence
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Human educator support and AI tutor support are different things in EduOS. Educators
          decide and approve; the tutor teaches within those bounds; reassessment decides closure.
        </p>

        {/* Mobile: accordion so the six steps do not become a long scroll.
            Radix supplies the button/region roles and keyboard support. */}
        <Accordion
          type="single"
          collapsible
          defaultValue="step-0"
          className="mt-8 rounded-xl border bg-card px-4 sm:hidden"
        >
          {STEPS.map((step, index) => (
            <AccordionItem key={step.title} value={`step-${index}`}>
              <AccordionTrigger className="text-left text-sm font-medium">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <step.icon className="h-4 w-4 text-primary" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[11px] font-semibold tabular-nums text-muted-foreground">
                      Step {index + 1}
                    </span>
                    {step.title}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {step.body}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <ol className="mt-8 hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-xl border bg-card p-5 transition-colors motion-safe:hover:bg-accent/40"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="h-4.5 w-4.5 text-primary" aria-hidden />
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                  Step {index + 1}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

      </div>
    </section>
  );
}
