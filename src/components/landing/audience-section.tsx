import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export type AudienceCta = {
  label: string;
  to: "/auth" | "/contact" | "/diagnostic";
  search?: Record<string, string>;
};

export type AudienceContent = {
  id: string;
  eyebrow: string;
  title: string;
  lede: string;
  points: string[];
  cta: AudienceCta;
  secondary?: ReactNode;
  qualifier?: string;
  aside?: ReactNode;
};

/**
 * Inner content for an audience block (Parents / Learning Centres / Schools).
 * Rendered either standalone via AudienceSection or inside the accessible
 * audience tabs on the home page. Every bullet must describe a capability that
 * exists in the current application.
 */
export function AudiencePanel({
  eyebrow,
  title,
  lede,
  points,
  cta,
  secondary,
  qualifier,
  aside,
}: Omit<AudienceContent, "id">) {
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <p className="text-xs font-medium tracking-widest text-primary uppercase">{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </h3>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">{lede}</p>

        <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
          {points.map((point) => (
            <li key={point} className="flex gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>

        {qualifier ? (
          <p className="mt-5 rounded-lg border border-dashed bg-background p-3 text-xs text-muted-foreground">
            {qualifier}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to={cta.to} search={cta.search as never}>
              {cta.label}
            </Link>
          </Button>
          {secondary}
        </div>
      </div>

      {aside ? <div className="min-w-0">{aside}</div> : null}
    </div>
  );
}

/** Standalone section wrapper, kept for non-tabbed surfaces. */
export function AudienceSection({
  id,
  muted,
  ...content
}: AudienceContent & { muted?: boolean }) {
  return (
    <section
      id={id}
      className={muted ? "scroll-mt-16 border-t bg-muted/40" : "scroll-mt-16 border-t"}
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <AudiencePanel {...content} />
      </div>
    </section>
  );
}
