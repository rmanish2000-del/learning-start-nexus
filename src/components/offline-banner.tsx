import { useEffect, useState } from "react";

/**
 * Connection-loss notice.
 *
 * Without it a dropped connection is silent: server calls fail in the
 * background and the page simply stops responding to actions. Answers are
 * autosaved per question, so the honest message is "your saved answers are
 * safe, reconnect to continue".
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Read after mount only — reading navigator during render mismatches SSR.
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[70] w-full bg-destructive px-3 py-2 text-center text-xs font-semibold text-destructive-foreground"
    >
      You are offline. Answers already saved are safe — reconnect to continue.
    </div>
  );
}
