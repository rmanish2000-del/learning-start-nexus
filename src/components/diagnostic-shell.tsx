import { Link } from "@tanstack/react-router";
import { GraduationCap, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { BAND_LABELS, type MasteryBand } from "@/lib/parent-diagnostic-shared";
import { cn } from "@/lib/utils";

// Chrome for the parent funnel. Deliberately minimal: on the purchase and
// checkout screens every outbound link is a leak, so there is no navigation
// beyond the logo.
export function DiagnosticShell({
  children,
  footerNote,
  wide,
}: {
  children: ReactNode;
  footerNote?: string;
  wide?: boolean;
}) {
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
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Secure checkout
          </span>
        </div>
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
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            Contact
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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        BAND_CLASS[band],
      )}
    >
      {BAND_LABELS[band]}
      {suffix ? <span className="font-normal opacity-80">{suffix}</span> : null}
    </span>
  );
}
