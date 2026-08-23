import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";

import { Button } from "@/components/ui/button";

// Sprint 5A: cookie consent banner. EduOS only uses essential storage
// (sign-in session, theme, this choice) — there are no analytics or
// advertising cookies to opt out of, so both actions record a choice and
// dismiss. The choice is stored in localStorage under CONSENT_KEY.
export const CONSENT_KEY = "eduos_cookie_consent";
export const CONSENT_VERSION = "v1.0";

export type CookieChoice = "all" | "essential";

export function readCookieConsent(): { choice: CookieChoice; at: string; version: string } | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { choice?: string; at?: string; version?: string };
    if (parsed.choice !== "all" && parsed.choice !== "essential") return null;
    return { choice: parsed.choice, at: parsed.at ?? "", version: parsed.version ?? "" };
  } catch {
    return null;
  }
}

export function CookieConsentBanner() {
  // null = not yet hydrated (render nothing), true = show, false = chosen
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    setVisible(readCookieConsent() === null);
  }, []);

  const choose = (choice: CookieChoice) => {
    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ choice, at: new Date().toISOString(), version: CONSENT_VERSION }),
      );
    } catch {
      // Storage unavailable — still dismiss for this session.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 shadow-lg backdrop-blur print:hidden"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">EduOS uses essential cookies only.</span>{" "}
            We store your sign-in session, theme preference, and this choice on your device. No
            advertising or cross-site tracking. Details in our{" "}
            <Link to="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => choose("essential")}>
            Essential only
          </Button>
          <Button size="sm" onClick={() => choose("all")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
