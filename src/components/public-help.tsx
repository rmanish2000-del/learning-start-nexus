import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, CircleHelp, Mail, MessageSquarePlus, Search, SearchX, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedbackForm } from "@/components/feedback-form";
import { readCookieConsent } from "@/components/cookie-consent";
import { guidanceForRoute, searchFaq } from "@/lib/public-guidance";
import { trackGuidance } from "@/lib/guidance-track";

const HIDE_KEY = "eduos_guidance_hidden";
const OPEN_EVENT = "eduos:open-help";

/** Open the public guidance panel from anywhere (e.g. the footer link). */
export function openPublicHelp(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(HIDE_KEY);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type TabKey = "explain" | "next" | "faq" | "feedback" | "contact";

export function PublicHelpLauncher() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const guidance = useMemo(() => guidanceForRoute(pathname), [pathname]);

  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [consentDone, setConsentDone] = useState(false);
  const [tab, setTab] = useState<TabKey>("explain");
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    setConsentDone(readCookieConsent() !== null);
    const onConsent = () => setConsentDone(true);
    window.addEventListener("eduos:cookie-consent", onConsent);
    try {
      setHidden(window.localStorage.getItem(HIDE_KEY) === "1");
    } catch {
      setHidden(false);
    }
    const onOpen = () => {
      setHidden(false);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("eduos:cookie-consent", onConsent);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  // Page view is the top of the guidance funnel.
  useEffect(() => {
    if (guidance) trackGuidance("public_page_view", { route: pathname });
  }, [pathname, guidance]);

  const changeTab = useCallback(
    (value: string) => {
      const next = value as TabKey;
      setTab(next);
      trackGuidance("help_tab_viewed", { route: pathname });
      if (next === "explain") trackGuidance("explain_page_viewed", { route: pathname });
      if (next === "next") trackGuidance("what_next_viewed", { route: pathname });
      if (next === "feedback") trackGuidance("feedback_opened", { route: pathname });
      if (next === "contact") trackGuidance("contact_opened", { route: pathname, cta: "contact" });
    },
    [pathname],
  );

  if (!guidance) return null;

  const results = searchFaq(query);
  const walkthrough = guidance.walkthrough ?? [];

  return (
    <>
      {!hidden && consentDone && (
        <div className="fixed bottom-4 left-4 z-30 flex items-center gap-1 print:hidden">
          <Button
            size="sm"
            variant="secondary"
            className="h-11 gap-1.5 rounded-full border shadow-lg sm:h-10"
            onClick={() => {
              setOpen(true);
              setTab("explain");
              trackGuidance("help_opened", { route: pathname, cta: "help" });
              trackGuidance("explain_page_viewed", { route: pathname });
            }}
            aria-haspopup="dialog"
          >
            <CircleHelp className="h-4 w-4" aria-hidden />
            Help
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-muted-foreground"
            aria-label="Hide the help button"
            onClick={() => {
              setHidden(true);
              try {
                window.localStorage.setItem(HIDE_KEY, "1");
              } catch {
                /* storage unavailable */
              }
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle>{guidance.title}</DialogTitle>
            <DialogDescription>Guidance for this page. Close it any time — nothing is required.</DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={changeTab}>
            <TabsList className="flex w-full flex-wrap justify-start gap-1 overflow-x-auto">
              <TabsTrigger value="explain" className="text-xs">Explain</TabsTrigger>
              <TabsTrigger value="next" className="text-xs">What next</TabsTrigger>
              <TabsTrigger value="faq" className="text-xs">FAQ</TabsTrigger>
              <TabsTrigger value="feedback" className="text-xs">Feedback</TabsTrigger>
              <TabsTrigger value="contact" className="text-xs">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="explain" className="space-y-3 pt-3">
              {guidance.explain.map((para, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {para}
                </p>
              ))}

              {walkthrough.length > 0 && step === null && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setStep(0);
                    trackGuidance("walkthrough_started", { route: pathname });
                  }}
                >
                  Walk me through this page <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}

              {walkthrough.length > 0 && step !== null && (
                <div className="rounded-lg border bg-muted/40 p-3" role="group" aria-label="Page walkthrough">
                  <p className="text-xs font-medium text-muted-foreground">
                    Step {step + 1} of {walkthrough.length}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{walkthrough[step]!.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{walkthrough[step]!.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={step === 0}
                      onClick={() => setStep((s) => Math.max(0, (s ?? 0) - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Back
                    </Button>
                    {step < walkthrough.length - 1 ? (
                      <Button size="sm" onClick={() => setStep((s) => (s ?? 0) + 1)}>
                        Next <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setStep(null);
                          trackGuidance("walkthrough_completed", { route: pathname });
                        }}
                      >
                        Done
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setStep(null)}>
                      Skip
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="next" className="space-y-2 pt-3">
              {guidance.next.map((item) => (
                <Link
                  key={`${item.to}-${item.label}`}
                  to={item.to}
                  search={item.search as never}
                  onClick={() => {
                    setOpen(false);
                    trackGuidance("cta_clicked", { route: pathname, cta: ctaFor(item.to) });
                  }}
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                </Link>
              ))}
            </TabsContent>

            <TabsContent value="faq" className="space-y-3 pt-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value.trim().length > 2) trackGuidance("faq_searched", { route: pathname });
                  }}
                  placeholder="Search — pricing, sign in, papers…"
                  className="pl-9"
                  aria-label="Search frequently asked questions"
                />
              </div>
              {results.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <SearchX className="h-7 w-7 text-muted-foreground/50" />
                  <p className="text-sm">Nothing matches "{query}".</p>
                  <Button variant="outline" size="sm" onClick={() => changeTab("feedback")}>
                    Ask us instead
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {results.map((entry) => (
                    <li key={entry.id} className="rounded-lg border">
                      <details onToggle={() => trackGuidance("faq_article_opened", { route: pathname })}>
                        <summary className="cursor-pointer list-none p-3 text-sm font-medium">
                          {entry.question}
                        </summary>
                        <div className="space-y-2 border-t px-3 py-3">
                          {entry.answer.map((a, i) => (
                            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                              {a}
                            </p>
                          ))}
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="feedback" className="pt-3">
              <FeedbackForm route={pathname} guidanceContext={guidance.match} onDone={() => undefined} />
            </TabsContent>

            <TabsContent value="contact" className="space-y-3 pt-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Prefer to talk to a person? The team replies from support@eduos.global.
              </p>
              <div className="grid gap-2">
                <Button asChild variant="outline" className="justify-start gap-2">
                  <a href="mailto:support@eduos.global">
                    <Mail className="h-4 w-4" /> support@eduos.global
                  </a>
                </Button>
                <Button asChild className="justify-start gap-2" onClick={() => setOpen(false)}>
                  <Link to="/contact">
                    <MessageSquarePlus className="h-4 w-4" /> Open the contact page
                  </Link>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ctaFor(to: string) {
  if (to.startsWith("/diagnostic")) return "diagnostic_start" as const;
  if (to.startsWith("/auth")) return "signup" as const;
  if (to.startsWith("/contact")) return "book_demo" as const;
  if (to.startsWith("/free-check")) return "free_check" as const;
  if (to.startsWith("/pilot-invite")) return "pilot_accept" as const;
  return "help" as const;
}
