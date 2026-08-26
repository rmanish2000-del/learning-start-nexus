import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

// Shared chrome for the public marketing/legal pages (About, Privacy, Terms,
// Contact). App-owned content published by the EduOS demo operator.
export function PublicPageLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-semibold tracking-tight">EduOS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              search={{ tab: "parent", mode: "signin" }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Link>
            <Button asChild size="sm">
              <Link to="/auth" search={{ tab: "parent", mode: "signup" }}>
                Create Account
              </Link>
            </Button>
          </div>

        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {updated ? <p className="mt-1 text-sm text-muted-foreground">Last updated: {updated}</p> : null}
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">{children}</div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-foreground">About</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
          <span className="ml-auto text-xs">EduOS demo — Brightpath Learning</span>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{heading}</h2>
      {children}
    </section>
  );
}
