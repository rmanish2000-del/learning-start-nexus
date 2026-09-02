import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PWA_CLIENT_BUILD, registerServiceWorker } from "@/lib/pwa/register-sw";
import { useAssessmentActive } from "@/lib/pwa/assessment-activity";

/**
 * Handoff State 6 — controlled update activation.
 *
 * A new build never takes over silently, and the prompt never appears while an
 * assessment is in progress (AC-12): a learner mid-session must not be
 * reloaded from under their feet. "Later" defers for the rest of the session.
 */
export function PwaUpdatePrompt() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const applyRef = useRef<(() => void) | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const assessmentActive = useAssessmentActive();

  useEffect(() => {
    void registerServiceWorker((apply) => {
      applyRef.current = apply;
      setReady(true);
    });
  }, []);

  const visible = ready && !dismissed && !assessmentActive;

  const later = useCallback(() => setDismissed(true), []);

  useEffect(() => {
    if (!visible) return;
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") later();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, later]);

  if (!visible) return <span data-eduos-update-prompt="mounted" data-eduos-build={PWA_CLIENT_BUILD} hidden />;

  return (
    <div
      data-eduos-update-prompt="visible"
      role="dialog"
      aria-modal="false"
      aria-label="Update available"
      className="fixed bottom-4 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-[16px] border bg-background p-4 shadow-lg print:hidden"
      style={{
        animation: "eduos-pwa-slide-up var(--pwa-slide-up-duration) var(--pwa-slide-up-easing)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Update available</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A new version of EduOS is ready. Refresh to get the latest improvements.
          </p>
        </div>
        <button
          type="button"
          onClick={later}
          aria-label="Dismiss update notice"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" className="min-h-11" onClick={later}>
          Later
        </Button>
        <Button
          ref={buttonRef}
          size="sm"
          className="min-h-11 bg-[var(--pwa-brand-primary)] text-white hover:bg-[var(--pwa-brand-primary)]/90"
          onClick={() => applyRef.current?.()}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
          Refresh now
        </Button>
      </div>
    </div>
  );
}
