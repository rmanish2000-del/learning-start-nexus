import { useCallback, useEffect, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Compass, Play, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOW_IT_WORKS } from "@/lib/help-center";
import {
  claimOnboardingModal,
  getOnboardingFlag,
  hasCompletedOnboarding,
  introSeenKey,
  releaseOnboardingModal,
  requestTour,
  setOnboardingFlag,
  SHOW_INTRO_EVENT,
} from "@/lib/onboarding";
import { ROLE_TOUR_ID } from "@/lib/onboarding";

const authRoute = getRouteApi("/_authenticated");

/**
 * First-login "How EduOS Works" intro. Shows once per role per browser —
 * and never for a user who has already completed onboarding (no forced
 * modals after completion, per the onboarding-trap fix). Replayable any
 * time via requestIntro() (Settings → Onboarding, Quick Start, Help).
 *
 * Visibility is driven directly by state set from effects/events; every
 * dismiss path persists the seen flag, so the dialog can never trap the
 * user or loop on refresh.
 */
export function HowItWorksDialog() {
  const { role } = authRoute.useRouteContext();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  // Auto-show once, shortly after the first authenticated page settles.
  // The modal claim prevents stacking with the completion celebration:
  // whoever loses the claim retries a few times, then gives up silently
  // (the intro stays replayable on demand via requestIntro()).
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const attempt = (tries: number) => {
      if (cancelled) return;
      if (getOnboardingFlag(introSeenKey(role))) return;
      if (hasCompletedOnboarding()) return;
      if (!claimOnboardingModal("intro")) {
        if (tries < 8) timer = window.setTimeout(() => attempt(tries + 1), 2500);
        return;
      }
      setShow(true);
    };
    timer = window.setTimeout(() => attempt(0), 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [role]);

  // Manual replays (Settings, Quick Start, Help Center) — the user asked
  // explicitly, so force the claim past any stale holder.
  useEffect(() => {
    const handler = () => {
      releaseOnboardingModal("intro");
      claimOnboardingModal("intro");
      setShow(true);
    };
    window.addEventListener(SHOW_INTRO_EVENT, handler);
    return () => window.removeEventListener(SHOW_INTRO_EVENT, handler);
  }, []);

  const close = useCallback(() => {
    setOnboardingFlag(introSeenKey(role));
    releaseOnboardingModal("intro");
    setShow(false);
  }, [role]);

  // Escape closes like every other dismiss path.
  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [show, close]);

  if (!show) return null;

  const content = HOW_IT_WORKS[role];
  const tourId = content.tourId ?? ROLE_TOUR_ID[role];

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={content.heading}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl md:p-8">
        <button
          onClick={close}
          aria-label="Close intro"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-5.5 w-5.5 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{content.heading}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{content.intro}</p>

        <ol className="mt-5 space-y-3">
          {content.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-col gap-2">
          {tourId && (
            <Button
              className="w-full gap-1.5"
              onClick={() => {
                close();
                // Let the dialog unmount before the tour spotlight renders.
                window.setTimeout(() => requestTour(tourId), 150);
              }}
            >
              <Play className="h-4 w-4" /> Take the guided tour
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => {
              close();
              void navigate({ to: "/quick-start" });
            }}
          >
            <Compass className="h-4 w-4" /> Open my quick start
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={close}>
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
