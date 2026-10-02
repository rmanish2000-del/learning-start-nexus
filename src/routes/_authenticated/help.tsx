import { useMemo, useState } from "react";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { ChevronDown, Compass, GraduationCap, LifeBuoy, Search, SearchX, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { HELP_CATEGORIES, searchHelpArticles } from "@/lib/help-center";
import { requestIntro } from "@/lib/onboarding";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help Center — EduOS" },
      {
        name: "description",
        content: "Searchable help for EduOS: sign-in, assessments, interventions, the AI Tutor, progress, and audits.",
      },
      { property: "og:title", content: "Help Center — EduOS" },
      {
        property: "og:description",
        content: "Searchable help for EduOS: sign-in, assessments, interventions, the AI Tutor, progress, and audits.",
      },
    ],
  }),
  component: HelpCenterPage,
});

const authRoute = getRouteApi("/_authenticated");

function HelpCenterPage() {
  const { role } = authRoute.useRouteContext();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const results = useMemo(() => {
    const found = searchHelpArticles(query, role);
    return category ? found.filter((a) => a.category === category) : found;
  }, [query, role, category]);

  // Only offer categories that have visible articles for this role.
  const visibleCategories = useMemo(() => {
    const present = new Set(searchHelpArticles("", role).map((a) => a.category));
    return HELP_CATEGORIES.filter((c) => present.has(c));
  }, [role]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Help center</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Searchable answers, filtered to what your role can actually do.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help — e.g. consent, assign, mastery, tour…"
          className="pl-9"
          aria-label="Search help articles"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant={category === null ? "default" : "outline"}
          className="h-7 text-xs"
          onClick={() => setCategory(null)}
        >
          All
        </Button>
        {visibleCategories.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={category === c ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <SearchX className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No articles match "{query}"</p>
            <p className="text-xs text-muted-foreground">
              Try fewer or different words — or browse a category above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {results.map((article) => {
            const open = openId === article.id;
            return (
              <Card key={article.id}>
                <button
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                  onClick={() => setOpenId(open ? null : article.id)}
                  aria-expanded={open}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {article.category}
                    </p>
                    <p className="mt-0.5 text-sm font-medium">{article.title}</p>
                    {!open && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {article.summary}
                      </p>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>
                {open && (
                  <CardContent className="space-y-2 border-t px-4 pt-3 pb-4">
                    {article.body.map((para, i) => (
                      <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                        {para}
                      </p>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <p className="w-full text-sm font-medium">Still stuck?</p>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/quick-start">
              <Compass className="h-3.5 w-3.5" /> My quick start
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/role-academy">
              <GraduationCap className="h-3.5 w-3.5" /> Role Academy
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={requestIntro}>
            <Sparkles className="h-3.5 w-3.5" /> Replay "How EduOS Works"
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
