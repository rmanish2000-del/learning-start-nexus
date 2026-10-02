// Role Academy — role-specific guidance about EduOS itself.
//
// Reuses the existing onboarding primitives (guided tour, intro dialog,
// quick start, help center). No parallel portal and no second onboarding
// engine is introduced here — this route is a reader over ROLE_ACADEMY
// content plus links into the tools that already exist.
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Compass,
  FlaskConical,
  GraduationCap,
  LifeBuoy,
  Play,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requestIntro, requestTour } from "@/lib/onboarding";
import { ROLE_ACADEMY } from "@/lib/role-academy";
import { ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/role-academy")({
  head: () => ({
    meta: [
      { title: "Role Academy — learn EduOS for your role | EduOS" },
      {
        name: "description",
        content:
          "Role-specific guidance for EduOS: what every screen is for, what you can do there, what it produces and where it leads next.",
      },
      { property: "og:title", content: "Role Academy | EduOS" },
      {
        property: "og:description",
        content: "Learn the EduOS workflow for your role — screen by screen, with real routes and real actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoleAcademyPage,
});

const authRoute = getRouteApi("/_authenticated");

function RoleAcademyPage() {
  const { role } = authRoute.useRouteContext();
  const journey = ROLE_ACADEMY[role];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight">{journey.heading}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{journey.intro}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Written for your role: <span className="font-medium text-foreground">{ROLE_LABELS[role]}</span>. Guidance
          for other roles is not shown here.
        </p>
      </header>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <p className="w-full text-sm font-medium">Orientation, any time</p>
          {journey.tourId && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => requestTour(journey.tourId!)}
            >
              <Play className="h-3.5 w-3.5" aria-hidden /> Guided tour
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={requestIntro}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> How EduOS Works
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/quick-start">
              <Compass className="h-3.5 w-3.5" aria-hidden /> Quick start
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/help">
              <LifeBuoy className="h-3.5 w-3.5" aria-hidden /> Help center
            </Link>
          </Button>
        </CardContent>
      </Card>

      <section aria-label="Your journey, screen by screen" className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold">Your journey, screen by screen</h3>
        </div>
        {journey.stages.map((stage, i) => {
          const open = openIndex === i;
          return (
            <Card key={stage.screen}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 p-4 text-left"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Step {i + 1}
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{stage.screen}</p>
                  {!open && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {stage.purpose}
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {open && (
                <CardContent className="space-y-3 border-t px-4 pt-3 pb-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{stage.purpose}</p>

                  <Detail label="What you do">
                    <ul className="space-y-1">
                      {stage.actions.map((a) => (
                        <li key={a} className="flex gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </Detail>

                  <Detail label="What it produces">
                    <ul className="space-y-1">
                      {stage.outputs.map((o) => (
                        <li key={o} className="flex gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </Detail>

                  <Detail label="Permissions">{stage.permissions}</Detail>
                  <Detail label="Before and after">{stage.flow}</Detail>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {stage.to && (
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link to={stage.to}>
                          Open {stage.screen} <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </Button>
                    )}
                    {stage.routeHint && (
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {stage.routeHint}
                      </Badge>
                    )}
                  </div>

                  {stage.tryIt && (
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <p className="text-xs font-semibold">Try it</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stage.tryIt}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </section>

      <section aria-label="Tester scenarios" className="space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold">Tester scenarios</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Representative internal checks for your role. Use your own test account — never share credentials or a
          learner's personal details.
        </p>
        {journey.scenarios.map((scenario) => (
          <Card key={scenario.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{scenario.title}</CardTitle>
              <CardDescription className="text-xs">Expected: {scenario.expected}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1.5">
                {scenario.steps.map((step, i) => (
                  <li key={step} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="shrink-0 font-medium text-primary">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
