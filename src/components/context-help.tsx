import { CircleHelp, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CONTEXT_HELP, requestTour } from "@/lib/onboarding";

/** Page-level "?" button: contextual tips plus a guided-tour replay trigger. */
export function ContextHelp({ page }: { page: string }) {
  const content = CONTEXT_HELP[page];
  if (!content) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <CircleHelp className="h-3.5 w-3.5" />
          Help
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-semibold">{content.title}</p>
        <ul className="mt-2 space-y-2">
          {content.tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {tip}
            </li>
          ))}
        </ul>
        {content.tourId && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full gap-1.5 text-xs"
            onClick={() => requestTour(content.tourId!)}
          >
            <Play className="h-3 w-3" /> Replay guided tour
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
