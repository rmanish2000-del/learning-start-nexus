import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WifiOff, X } from "lucide-react";

import { useOnlineStatus } from "@/lib/connectivity";
import { useAssessmentActive } from "@/lib/pwa/assessment-activity";

/**
 * App-wide connection-loss notice (handoff State 4a) plus the
 * connection-restored toast (State 5).
 *
 * During an active assessment the red, non-dismissible notice rendered by
 * `AssessmentOfflineNotice` owns the message, so this general banner stands
 * down and only the restored toast copy changes.
 */
export function OfflineBanner() {
  const { online, wasOffline } = useOnlineStatus();
  const assessmentActive = useAssessmentActive();
  const announced = useRef(false);
  const wasAssessment = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!online) {
      announced.current = true;
      wasAssessment.current = assessmentActive;
      setDismissed(false);
      return;
    }
    if (wasOffline && announced.current) {
      announced.current = false;
      toast.success(
        wasAssessment.current ? "Connection restored" : "You're back online",
        {
          description: wasAssessment.current
            ? "You can now submit your answers."
            : "Refreshing your data…",
          duration: 4000,
        },
      );
    }
  }, [online, wasOffline, assessmentActive]);

  if (online || assessmentActive || dismissed) return null;

  return (
    <div
      data-eduos-offline-banner="visible"
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-[70] flex w-full items-start gap-2 border-b px-3 py-2 print:hidden"
      style={{ background: "var(--eds-amber-50)", borderColor: "var(--eds-amber-200)" }}
    >
      <WifiOff
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
        style={{ color: "var(--eds-color-state-warning)" }}
        aria-hidden
      />
      <div className="flex-1 text-left">
        <p className="text-xs font-bold" style={{ color: "var(--eds-amber-500)" }}>
          No internet connection
        </p>
        <p className="text-[11px]" style={{ color: "var(--eds-amber-500)" }}>
          Your connection was lost. Some features may not be available.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss connection notice"
        className="-my-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md"
        style={{ color: "var(--eds-amber-500)" }}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
