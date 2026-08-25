import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, LifeBuoy, Play, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QUICK_START } from "@/lib/help-center";
import { requestIntro, requestTour } from "@/lib/onboarding";
import { ROLE_LABELS } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/quick-start")({
  head: () => ({
    meta: [
      { title: "Quick Start — EduOS" },
      {
        name: "description",
        content: "Your role-based quick start: the first steps to get value from EduOS.",
      },
      { property: "og:title", content: "Quick Start — EduOS" },
      {
        property: "og:description",
        content: "Your role-based quick start: the first steps to get value from EduOS.",
      },
    ],
  }),
  component: QuickStartPage,
});

const authRoute = getRouteApi("/_authenticated");

function QuickStartPage() {
  const { role } = authRoute.useRouteContext();
  const content = QUICK_START[role];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">{content.heading}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{content.intro}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tailored to your role: <span className="font-medium text-foreground">{ROLE_LABELS[role]}</span>
        </p>
      </div>

      <ol className="space-y-3">
        {content.steps.map((step, i) => (
          <li key={i}>
            <Card>
              <CardContent className="flex items-start gap-4 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
                {step.to && (
                  <Button asChild size="sm" variant="outline" className="shrink-0 gap-1">
                    <Link to={step.to}>
                      {step.cta ?? "Go"} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <p className="w-full text-sm font-medium">Replay orientation any time</p>
          {content.tourId && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => requestTour(content.tourId!)}>
              <Play className="h-3.5 w-3.5" /> Guided tour
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={requestIntro}>
            <Sparkles className="h-3.5 w-3.5" /> How EduOS Works
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/help">
              <LifeBuoy className="h-3.5 w-3.5" /> Help center
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
