import { useEffect, useState } from "react";

import { AudiencePanel, type AudienceContent } from "@/components/landing/audience-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * UI Phase: the three audience blocks (Parents / Centres / Schools) are one
 * accessible tab set instead of three long stacked sections. Radix Tabs
 * provides roving-tabindex keyboard support and correct tab/tabpanel roles.
 * The old "/#parents", "/#centres" and "/#schools" deep links still work: an
 * invisible anchor per audience scrolls here and selects the matching tab.
 */
export function AudienceTabs({
  audiences,
}: {
  audiences: (AudienceContent & { tabLabel: string })[];
}) {
  const [value, setValue] = useState(audiences[0]!.id);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace("#", "");
      if (audiences.some((a) => a.id === hash)) setValue(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [audiences]);

  return (
    <section id="audiences" className="scroll-mt-16 border-t bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        {audiences.map((a) => (
          <span key={a.id} id={a.id} aria-hidden className="block scroll-mt-16" />
        ))}

        <p className="text-xs font-medium tracking-widest text-primary uppercase">Who it is for</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          One loop, three ways to use it
        </h2>

        <Tabs value={value} onValueChange={setValue} className="mt-6">
          <TabsList aria-label="Choose an audience" className="grid w-full grid-cols-3 sm:w-auto">
            {audiences.map((a) => (
              <TabsTrigger key={a.id} value={a.id} className="min-h-10 text-sm">
                {a.tabLabel}
              </TabsTrigger>
            ))}
          </TabsList>

          {audiences.map(({ id, tabLabel: _tabLabel, ...content }) => (
            <TabsContent
              key={id}
              value={id}
              className="mt-8 rounded-2xl border bg-background p-5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-8"
            >
              <AudiencePanel {...content} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
