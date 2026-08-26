import { useEffect, useState } from "react";
import { Download, Plus, Share } from "lucide-react";

import { Button } from "@/components/ui/button";
import { readCookieConsent } from "@/components/cookie-consent";

// Sprint 5A addendum: "Install EduOS" banner for the manifest-only PWA.
// There is no service worker and no caching — this is home-screen
// installability only.
//
// Behavior:
// - Android / desktop Chrome: shown only when the browser fires
//   beforeinstallprompt (i.e. the app is genuinely installable); "Install"
//   triggers the native prompt.
// - iPhone / iPad: those browsers never fire beforeinstallprompt, so the
//   banner shows Share → Add to Home Screen instructions instead.
// - "Later" snoozes for 14 days so users are never nagged; a completed
//   install hides the banner permanently.
// - Never rendered while already running standalone (installed), and never
//   stacked on top of the cookie consent banner.

export const INSTALL_DISMISS_KEY = "eduos_install_banner";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

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

function readDismissal(): Dismissal | null {
  try {
    const raw = localStorage.getItem(INSTALL_DISMISS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Dismissal;
  } catch {
    return null;
  }
}

function writeDismissal(d: Dismissal) {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, JSON.stringify(d));
  } catch {
    // Storage unavailable — dismissal lasts for this render only.
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

type Variant = "android" | "ios";

export function InstallBanner() {
  const [variant, setVariant] = useState<Variant | null>(null);

  useEffect(() => {
    if (isStandalone()) return; // Already installed — never show.
    const dismissal = readDismissal();
    if (dismissal?.installed) return;
    const snoozed = (dismissal?.snoozedUntil ?? 0) > Date.now();

    let pending: Variant | null = null;
    const reveal = () => {
      if (!pending || snoozed) return;
      // Consent banner owns the bottom edge until a choice is recorded.
      if (readCookieConsent() === null) return;
      setVariant(pending);
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__eduosInstallPrompt = e as BeforeInstallPromptEvent;
      pending = "android";
      reveal();
    };
    const onInstalled = () => {
      writeDismissal({ installed: true });
      window.__eduosInstallPrompt = null;
      setVariant(null);
    };

    if (isIos()) {
      pending = "ios";
    } else {
      window.addEventListener("beforeinstallprompt", onPrompt);
      window.addEventListener("appinstalled", onInstalled);
    }
    reveal();
    window.addEventListener("eduos:cookie-consent", reveal);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("eduos:cookie-consent", reveal);
    };
  }, []);

  const later = () => {
    writeDismissal({ snoozedUntil: Date.now() + SNOOZE_MS });
    setVariant(null);
  };

  const install = async () => {
    const ev = window.__eduosInstallPrompt;
    if (!ev) return;
    await ev.prompt();
    const choice = await ev.userChoice;
    window.__eduosInstallPrompt = null;
    writeDismissal(
      choice.outcome === "accepted"
        ? { installed: true }
        : { snoozedUntil: Date.now() + SNOOZE_MS },
    );
    setVariant(null);
  };

  // Mount marker: lets the launch audit verify from the live DOM that the
  // banner component is actually mounted app-wide, even when the browser has
  // no install prompt to show.
  if (!variant) return <span data-eduos-install-banner="mounted" hidden />;

  return (
    <div
      data-eduos-install-banner="visible"
      role="region"
      aria-label="Install EduOS"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 shadow-lg backdrop-blur print:hidden"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <img
            src="/icons/icon-192.png"
            alt="EduOS app icon"
            width={40}
            height={40}
            className="mt-0.5 h-10 w-10 shrink-0 rounded-lg"
          />
          {variant === "android" ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Install EduOS</span> — add it to your
              home screen for one-tap access. It launches full-screen, just like an app.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Install EduOS on this device:</span>{" "}
              tap <Share className="inline h-4 w-4 align-[-2px] text-primary" aria-label="Share" />{" "}
              <span className="font-medium text-foreground">Share</span>, then{" "}
              <Plus className="inline h-4 w-4 align-[-2px] text-primary" aria-label="Add" />{" "}
              <span className="font-medium text-foreground">Add to Home Screen</span>.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={later}>
            Later
          </Button>
          {variant === "android" ? (
            <Button size="sm" onClick={install}>
              <Download className="mr-1.5 h-4 w-4" />
              Install
            </Button>
          ) : (
            <Button size="sm" onClick={later}>
              Got it
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
