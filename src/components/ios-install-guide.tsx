import { useEffect, useRef, useState } from "react";
import { Plus, Share, Smartphone, X } from "lucide-react";

import { isIos, isStandalone } from "@/components/install-banner";

// Handoff State 2 — iOS install guidance.
//
// Safari never fires `beforeinstallprompt`, so iOS must never see the install
// banner (AC-02). Instead, iPhone/iPad visitors get an in-content link that
// opens a three-step sheet describing Share -> Add to Home Screen -> Add.

const STEPS = [
  {
    icon: Share,
    title: "Tap the Share button",
    body: "It's at the bottom of Safari (or the top on iPad).",
  },
  {
    icon: Plus,
    title: "Choose 'Add to Home Screen'",
    body: "Scroll down the share sheet to find it.",
  },
  {
    icon: Smartphone,
    title: "Tap 'Add'",
    body: "EduOS appears on your home screen like an app.",
  },
];

export function IosInstallGuide() {
  const [eligible, setEligible] = useState(false);
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setEligible(isIos() && !isStandalone());
  }, []);

  useEffect(() => {
    if (!open) return;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!eligible) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-eduos-ios-install="link"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add EduOS to your Home Screen
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 print:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Add EduOS to your Home Screen"
            data-eduos-ios-install="sheet"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-[16px] bg-background p-5 shadow-xl"
            style={{
              animation:
                "eduos-pwa-slide-up var(--pwa-slide-up-duration) var(--pwa-slide-up-easing)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Add EduOS to your Home Screen
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Three quick steps in Safari — it opens full screen, just like an app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <ol className="mt-4 space-y-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                    aria-hidden
                  >
                    <step.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {i + 1}. {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 min-h-11 w-full rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
