import { useCallback, useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { readCookieConsent } from "@/components/cookie-consent";

// Safe PWA Phase 1 — handoff State 1: "Install EduOS" banner.
//
// Behaviour required by AC-01..AC-03:
// - Android / desktop Chrome only, and only once the browser has fired
//   beforeinstallprompt (the app is genuinely installable).
// - Engagement gate: at least 2 visits AND at least 30 s total dwell time on
//   the origin, tracked in localStorage.
// - iOS never shows this banner (beforeinstallprompt never fires there); iOS
//   users get the in-content "Add to Home Screen" guide instead.
// - "Not now" suppresses the banner for 30 days; a completed install hides it
//   permanently.

export const INSTALL_DISMISS_KEY = "eduos_install_banner";
export const INSTALL_ENGAGEMENT_KEY = "eduos_install_engagement";
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_VISITS = 2;
const MIN_DWELL_MS = 30_000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __eduosInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

type Dismissal = { snoozedUntil?: number; installed?: boolean };
type Engagement = { visits: number; dwellMs: number };

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — the decision lasts for this render only.
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** True when the browser has offered a native install prompt this session. */
export function hasInstallPrompt(): boolean {
  return typeof window !== "undefined" && Boolean(window.__eduosInstallPrompt);
}

/** Pure engagement gate, exported for tests (AC-01). */
export function meetsEngagementThreshold(e: Engagement | null): boolean {
  if (!e) return false;
  return e.visits >= MIN_VISITS && e.dwellMs >= MIN_DWELL_MS;
}

export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStandalone()) return; // Already installed — never show.

    // Visit + dwell tracking (origin-scoped, no personal data).
    const engagement: Engagement = readJson<Engagement>(INSTALL_ENGAGEMENT_KEY) ?? {
      visits: 0,
      dwellMs: 0,
    };
    engagement.visits += 1;
    writeJson(INSTALL_ENGAGEMENT_KEY, engagement);
    const startedAt = Date.now();
    const persistDwell = () => {
      const current = readJson<Engagement>(INSTALL_ENGAGEMENT_KEY) ?? engagement;
      writeJson(INSTALL_ENGAGEMENT_KEY, {
        visits: current.visits,
        dwellMs: (current.dwellMs ?? 0) + (Date.now() - startedAt),
      });
    };

    const dismissal = readJson<Dismissal>(INSTALL_DISMISS_KEY);
    const blocked =
      Boolean(dismissal?.installed) || (dismissal?.snoozedUntil ?? 0) > Date.now() || isIos();

    let promptReady = false;
    let dwellReached = engagement.dwellMs + 0 >= MIN_DWELL_MS;
    const reveal = () => {
      if (blocked || !promptReady || !dwellReached) return;
      if (engagement.visits < MIN_VISITS) return;
      // Consent banner owns the bottom edge until a choice is recorded.
      if (readCookieConsent() === null) return;
      setVisible(true);
    };

    const remaining = Math.max(0, MIN_DWELL_MS - engagement.dwellMs);
    const timer = window.setTimeout(() => {
      dwellReached = true;
      reveal();
    }, remaining);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__eduosInstallPrompt = e as BeforeInstallPromptEvent;
      promptReady = true;
      reveal();
    };
    const onInstalled = () => {
      writeJson(INSTALL_DISMISS_KEY, { installed: true });
      window.__eduosInstallPrompt = null;
      setVisible(false);
    };

    if (!isIos()) {
      window.addEventListener("beforeinstallprompt", onPrompt);
      window.addEventListener("appinstalled", onInstalled);
    }
    window.addEventListener("eduos:cookie-consent", reveal);
    window.addEventListener("pagehide", persistDwell);

    return () => {
      window.clearTimeout(timer);
      persistDwell();
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("eduos:cookie-consent", reveal);
      window.removeEventListener("pagehide", persistDwell);
    };
  }, []);

  const later = useCallback(() => {
    writeJson(INSTALL_DISMISS_KEY, { snoozedUntil: Date.now() + SNOOZE_MS });
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") later();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, later]);

  const install = async () => {
    const ev = window.__eduosInstallPrompt;
    if (!ev) return;
    await ev.prompt();
    const choice = await ev.userChoice;
    window.__eduosInstallPrompt = null;
    writeJson(
      INSTALL_DISMISS_KEY,
      choice.outcome === "accepted"
        ? { installed: true }
        : { snoozedUntil: Date.now() + SNOOZE_MS },
    );
    setVisible(false);
  };

  // Mount marker: lets the launch audit verify from the live DOM that the
  // banner component is mounted app-wide, even with no install prompt to show.
  if (!visible) return <span data-eduos-install-banner="mounted" hidden />;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      data-eduos-install-banner="visible"
      role="dialog"
      aria-modal="false"
      aria-label="Install EduOS app"
      className="fixed inset-x-0 bottom-0 z-40 border-t shadow-lg print:hidden"
      style={{
        background: "var(--eds-color-surface-card)",
        borderColor: "var(--eds-color-border-default)",
        animation: "eduos-pwa-slide-up var(--eds-duration-base) var(--eds-easing-decelerate)",
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <img
            src="/icons/icon-192.png"
            alt=""
            width={36}
            height={36}
            className="mt-0.5 h-9 w-9 shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0C1628]">Install EduOS</p>
            <p className="text-sm text-[#6B7280]">
              <span className="sm:hidden">
                Add to your home screen for faster access to your child's progress and reports.
              </span>
              <span className="hidden sm:inline">
                Add to your home screen for faster access to progress and reports.
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={later}
            aria-label="Dismiss install prompt"
            className="min-h-11 min-w-11 text-[#6B7280]"
          >
            Not now
          </Button>
          <Button
            size="sm"
            onClick={install}
            className="min-h-11 bg-[var(--eds-color-brand-primary)] text-white hover:bg-[var(--eds-color-brand-primary)]/90"
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden />
            <span className="sm:hidden">Add to Home Screen</span>
            <span className="hidden sm:inline">Install</span>
          </Button>
          <button
            type="button"
            onClick={later}
            aria-label="Dismiss install prompt"
            className="flex h-11 w-11 items-center justify-center rounded-md text-[#6B7280] sm:hidden"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
