import { Link } from "@tanstack/react-router";
import { CircleHelp, GraduationCap, LogOut, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { useI18n } from "@/lib/i18n/context";
import { BAND_LABELS, type MasteryBand } from "@/lib/parent-diagnostic-shared";
import { cn } from "@/lib/utils";

// Chrome for the parent funnel. Deliberately minimal: on the purchase and
// checkout screens every outbound link is a leak, so there is no navigation
// beyond the logo.
export function DiagnosticShell({
  children,
  footerNote,
  wide,
  variant = "parent",
  learnerName,
}: {
  children: ReactNode;
  footerNote?: string;
  wide?: boolean;
  /**
   * "learner" is the assessment chrome: reduced, but never a dead end. It keeps
   * EduOS identity, the learner's own name, a way out and Help — and it never
   * shows parent/billing navigation.
   */
  variant?: "parent" | "learner";
  learnerName?: string;
}) {
  const { t } = useI18n();
  const isLearner = variant === "learner";
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className={cn("mx-auto flex h-14 items-center justify-between px-4", wide ? "max-w-5xl" : "max-w-3xl")}>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-semibold tracking-tight">EduOS</span>
          </Link>
          {isLearner ? (
            <div className="flex items-center gap-2">
              {learnerName ? (
                <span className="hidden text-xs text-muted-foreground sm:inline">{learnerName}</span>
              ) : null}
              <Link
                to="/help"
                className="hidden items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:inline-flex"
              >
                <CircleHelp className="h-3.5 w-3.5" /> {t("common.help", "Help")}
              </Link>
              <Link
                to="/home"
                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t("learner.exitResume", "Exit and resume later")}
              </Link>
            </div>
          ) : (
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Lock className="h-3.5 w-3.5" /> {t("common.secureCheckout", "Secure checkout")}
            </span>
            {/* Focus mode is deliberate, but never a trap: two clear ways
                back, visible at every breakpoint. */}
            <Link
              to="/"
              className="hidden text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:inline"
            >
              {t("common.home", "Home")}
            </Link>
            <Link
              to="/parent"
              className="rounded-md border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              {t("common.parentPortal", "Parent portal")}
            </Link>

          </div>
          )}
        </div>
        <p className="mx-auto max-w-5xl px-4 pb-2 text-[11px] text-muted-foreground sm:hidden">
          {isLearner
            ? t("learner.focusMode", "Focus mode — your answers save as you go. Exit and resume any time.")
            : t("common.focusMode", "Distraction-free checkout — use Parent portal to go back.")}
        </p>
      </header>
      <main className={cn("mx-auto w-full flex-1 px-4 py-10", wide ? "max-w-5xl" : "max-w-3xl")}>{children}</main>
      <footer className="border-t">
        <div
          className={cn(
            "mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-xs text-muted-foreground",
            wide ? "max-w-5xl" : "max-w-3xl",
          )}
        >
          <Link to="/privacy" className="hover:text-foreground">
            {t("common.privacy", "Privacy")}
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            {t("common.terms", "Terms")}
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            {t("common.contact", "Contact")}
          </Link>
          {footerNote ? <span className="ml-auto">{footerNote}</span> : null}
        </div>
      </footer>
    </div>
  );
}

const BAND_CLASS: Record<MasteryBand, string> = {
  weak: "border-destructive/40 bg-destructive/10 text-destructive",
  developing: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  secure: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  strong: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

// Band is never communicated by colour alone — the label always ships with it.
export function BandPill({ band, suffix }: { band: MasteryBand; suffix?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        BAND_CLASS[band],
      )}
    >
      {t(`band.${band}`, BAND_LABELS[band])}
      {suffix ? <span className="font-normal opacity-80">{suffix}</span> : null}
    </span>
  );
}
