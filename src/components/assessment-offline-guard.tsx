import { AlertTriangle } from "lucide-react";

import { useOnlineStatus } from "@/lib/connectivity";
import { useMarkAssessmentActive } from "@/lib/pwa/assessment-activity";

/**
 * Mid-assessment connection-loss state (handoff State 4b).
 *
 * EduOS never claims offline assessments: answers are saved on the server, so
 * a dropped connection must stop submission rather than queue it. The current
 * question stays rendered so nothing typed on screen is lost, and answering
 * resumes only once connectivity returns.
 *
 * Mounting this hook also marks an assessment session active, which suppresses
 * the general connectivity banner and defers the update prompt.
 */
export function useAssessmentOnline(): boolean {
  useMarkAssessmentActive();
  return useOnlineStatus().online;
}

export function AssessmentOfflineNotice({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div
      data-eduos-assessment-offline="visible"
      role="alert"
      aria-live="assertive"
      className="mt-4 flex items-start gap-3 rounded-[10px] border p-3"
      style={{
        background: "var(--pwa-error-bg)",
        borderColor: "var(--pwa-error-border)",
      }}
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ color: "var(--pwa-error-icon)" }}
        aria-hidden
      />
      <div>
        <p className="text-xs font-bold" style={{ color: "var(--pwa-error-heading)" }}>
          Connection lost during assessment
        </p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--pwa-error-body)" }}>
          Do not close this page. Reconnect before submitting your answers. Answers already saved
          are safe.
        </p>
      </div>
    </div>
  );
}
