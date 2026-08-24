import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getOnboardingFlag,
  hasCompletedOnboarding,
  setOnboardingFlag,
  START_TOUR_EVENT,
  tourSeenKey,
} from "@/lib/onboarding";

export interface TourStep {
  /** CSS selector for the element to highlight (e.g. [data-tour="student-plan"]). */
  selector: string;
  title: string;
  body: string;
}

interface GuidedTourProps {
  tourId: string;
  steps: TourStep[];
  /** Auto-start on first visit (per browser). Default true. */
  autoStart?: boolean;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Spotlight guided tour. Highlights elements tagged with data-tour attributes,
 * skips steps whose target isn't rendered (e.g. empty states), and remembers
 * completion per browser. Restart any time via requestTour(tourId).
 */
export function GuidedTour({ tourId, steps, autoStart = true }: GuidedTourProps) {
  const [active, setActive] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  const findNext = useCallback(
    (from: number): number | null => {
      for (let i = from; i < steps.length; i++) {
        if (document.querySelector(steps[i]!.selector)) return i;
      }
      return null;
    },
    [steps],
  );

  const finish = useCallback(() => {
    setOnboardingFlag(tourSeenKey(tourId));
    setActive(null);
    setRect(null);
  }, [tourId]);

  const start = useCallback(() => {
    const first = findNext(0);
    if (first === null) return;
    setActive(first);
  }, [findNext]);

  // Auto-start once per browser, after the page settles. Never auto-start
  // for a user who has completed onboarding — no forced tours after that.
  useEffect(() => {
    if (!autoStart || getOnboardingFlag(tourSeenKey(tourId)) || hasCompletedOnboarding()) return;
    const t = window.setTimeout(start, 900);
    return () => window.clearTimeout(t);
  }, [autoStart, start, tourId]);

  // External restart requests (context help, checklist "Replay tour").
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<string>).detail === tourId) start();
    };
    window.addEventListener(START_TOUR_EVENT, handler);
    return () => window.removeEventListener(START_TOUR_EVENT, handler);
  }, [tourId, start]);

  // Track the highlighted element's position.
  useEffect(() => {
    if (active === null) return;
    const update = () => {
      const el = document.querySelector(steps[active]!.selector);
      if (!el) {
        // Target unmounted mid-tour — advance or finish.
        const next = findNext(active + 1);
        if (next === null) finish();
        else setActive(next);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, steps, findNext, finish]);

  if (active === null || !rect) return null;

  const step = steps[active]!;
  const pad = 8;
  const tooltipWidth = 320;
  const spaceBelow = window.innerHeight - (rect.top + rect.height + pad);
  const tooltipTop =
    spaceBelow > 190 ? rect.top + rect.height + pad + 12 : Math.max(16, rect.top - pad - 200);
  const tooltipLeft = Math.min(
    Math.max(16, rect.left + rect.width / 2 - tooltipWidth / 2),
    window.innerWidth - tooltipWidth - 16,
  );

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/55" onClick={finish} />
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-200"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.0)",
        }}
      />
      <div
        className="absolute rounded-xl border bg-card p-4 shadow-2xl"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
        role="dialog"
        aria-label={`Tour step ${active + 1}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{step.title}</p>
          <button
            onClick={finish}
            aria-label="End tour"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Step {active + 1} of {steps.length}
          </span>
          <div className="flex gap-1.5">
            {active > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  for (let i = active - 1; i >= 0; i--) {
                    if (document.querySelector(steps[i]!.selector)) {
                      setActive(i);
                      return;
                    }
                  }
                }}
              >
                <ArrowLeft className="mr-1 h-3 w-3" /> Back
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                const next = findNext(active + 1);
                if (next === null) finish();
                else setActive(next);
              }}
            >
              {findNext(active + 1) === null ? "Done" : "Next"} <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
