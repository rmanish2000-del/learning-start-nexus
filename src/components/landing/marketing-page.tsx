import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { PublicSiteFooter, PublicSiteHeader } from "@/components/public-layout";
import { ShareRow } from "@/components/share-row";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { openPublicHelp } from "@/components/public-help";
import { trackGuidance } from "@/lib/guidance-track";
import type { GuidanceCta } from "@/lib/guidance-analytics";
import type { UtmCampaign } from "@/lib/utm";

export interface MarketingCta {
  label: string;
  href: string;
  cta: GuidanceCta;
}

export interface MarketingLink {
  label: string;
  href: string;
  detail: string;
}

/**
 * Shared scaffold for the acquisition landing pages. Mobile-first, uses the
 * approved orange/navy tokens through the shared button/typography styles,
 * and always offers Help and Feedback through the existing public Help panel.
 */
export function MarketingPage({
  eyebrow,
  title,
  intro,
  primary,
  secondary,
  whatNext,
  children,
  internalLinks,
  faqs,
  sharePath,
  shareCampaign,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  primary: MarketingCta;
  secondary: MarketingCta;
  whatNext: string[];
  children?: ReactNode;
  internalLinks: MarketingLink[];
  faqs?: { q: string; a: string }[];
  sharePath: string;
  shareCampaign: UtmCampaign;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <PublicSiteHeader />

      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{intro}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" className="min-h-11">
            <a
              href={primary.href}
              onClick={() => trackGuidance("cta_clicked", { cta: primary.cta })}
            >
              {primary.label} <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="min-h-11">
            <a
              href={secondary.href}
              onClick={() => trackGuidance("cta_clicked", { cta: secondary.cta })}
            >
              {secondary.label}
            </a>
          </Button>
        </div>

        <div className="mt-10 space-y-10">{children}</div>

        <section className="mt-10 rounded-xl border bg-muted/30 p-5">
          <h2 className="text-lg font-semibold tracking-tight">What happens next?</h2>
          <ol className="mt-3 space-y-2.5">
            {whatNext.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {faqs && faqs.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">Common questions</h2>
            <Accordion type="single" collapsible className="mt-3">
              {faqs.map((faq) => (
                <AccordionItem key={faq.q} value={faq.q}>
                  <AccordionTrigger className="text-left text-sm">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Related pages</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {internalLinks.map((link) => (
              <li key={link.href} className="rounded-lg border p-4">
                <a
                  href={link.href}
                  className="text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {link.label}
                </a>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{link.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 space-y-3">
          <ShareRow path={sharePath} title={title} campaign={shareCampaign} />
          <p className="text-sm text-muted-foreground">
            Unsure about anything on this page?{" "}
            <button
              type="button"
              onClick={openPublicHelp}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Open Help &amp; feedback
            </button>
          </p>
        </div>
      </main>

      <PublicSiteFooter />
    </div>
  );
}

/** A titled content block inside a marketing page. */
export function MarketingSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

/** Checklist of factual product points. */
export function MarketingList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
