import { Link } from "@tanstack/react-router";
import { GraduationCap, Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * Public marketing navigation. Audience sections live on the home page, so
 * these entries are hash targets on "/" and work from every public route.
 */
const AUDIENCE_LINKS = [
  { hash: "/#parents", label: "For Parents" },
  { hash: "/#centres", label: "For Centres" },
  { hash: "/#schools", label: "For Schools" },
  { hash: "/about", label: "About" },
] as const;

/** Verified entry point for the free learning check: parent account → parent portal. */
export const FREE_CHECK_SEARCH = {
  tab: "parent",
  mode: "signup",
  next: "/parent",
} as const;

/** Book a demo routes to the existing Contact page with centre context. */
export const CENTRE_DEMO_SEARCH = { topic: "centre" } as const;

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="EduOS home">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="h-4.5 w-4.5" aria-hidden />
      </span>
      <span className="text-base font-semibold tracking-tight">EduOS</span>
    </Link>
  );
}

export function PublicSiteHeader() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Escape to close, focus trap inside the panel, and body-scroll lock while
  // the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <BrandMark />

        <nav aria-label="Primary" className="hidden items-center gap-1 text-sm lg:flex">
          {AUDIENCE_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.hash}
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to="/auth"
            search={{ tab: "parent", mode: "signin" }}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Sign In
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link to="/contact" search={CENTRE_DEMO_SEARCH}>
              Book Demo
            </Link>
          </Button>
          <Button asChild size="sm" className="shadow-sm">
            <Link to="/auth" search={FREE_CHECK_SEARCH}>
              Free Learning Check
            </Link>
          </Button>
        </div>


        <div className="flex items-center gap-1.5 lg:hidden">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="lg:hidden">
          <div
            className="fixed inset-x-0 top-16 bottom-0 z-40 bg-background/70"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            id={panelId}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b bg-background p-4 shadow-lg"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {AUDIENCE_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.hash}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-md px-2 text-base font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {item.label}
                </a>
              ))}
              <Link
                to="/auth"
                search={{ tab: "parent", mode: "signin" }}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-md px-2 text-base font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Sign In
              </Link>
            </nav>
            <div className="mt-3 grid gap-2">
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link to="/contact" search={CENTRE_DEMO_SEARCH}>
                  Book Demo
                </Link>
              </Button>
              <Button asChild onClick={() => setOpen(false)}>
                <Link to="/auth" search={FREE_CHECK_SEARCH}>
                  Free Learning Check
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandMark />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            A Learning Intelligence and Intervention System. Find the gaps, close them with
            purpose, prove the progress.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold">For</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="/#parents" className="hover:text-foreground">Parents</a></li>
            <li><a href="/#centres" className="hover:text-foreground">Learning Centres</a></li>
            <li><a href="/#schools" className="hover:text-foreground">Schools</a></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Company</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About EduOS</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
            <li>
              <Link to="/contact" search={CENTRE_DEMO_SEARCH} className="hover:text-foreground">
                Book a Demo
              </Link>
            </li>
          </ul>
          <h2 className="mt-6 text-sm font-semibold">Legal</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms of Use</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Contact</h2>
          <address className="mt-3 space-y-2 text-sm not-italic text-muted-foreground">
            <a href="mailto:support@eduos.global" className="block break-words hover:text-foreground">
              support@eduos.global
            </a>
            <a href="tel:+919850820909" className="block hover:text-foreground">
              9850820909
            </a>
            <span className="block">
              Tilak Ward, Deori, Sagar, Madhya Pradesh 470226, India
            </span>
          </address>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} EduOS</span>
          <span>Learning Intelligence &amp; Intervention</span>
          <span className="sm:ml-auto">CBSE Class 10 · Mathematics &amp; Science · India</span>
        </div>
      </div>
    </footer>
  );
}

// Shared chrome for the public marketing/legal pages (About, Privacy, Terms,
// Contact).
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
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <PublicSiteHeader />

      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {updated ? <p className="mt-1 text-sm text-muted-foreground">Last updated: {updated}</p> : null}
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">{children}</div>
      </main>

      <PublicSiteFooter />
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
