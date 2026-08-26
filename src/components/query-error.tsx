import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorProps {
  title: string;
  /** The failed query's error; raw messages are shown only when Error-typed. */
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

/**
 * Inline card for a failed data fetch. Keeps failures visually distinct from
 * empty states so "we couldn't load this" never reads as "you have no data".
 */
export function QueryError({ title, error, onRetry, className }: QueryErrorProps) {
  return (
    <div
      role="alert"
      className={`rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm ${className ?? ""}`}
    >
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        {title}
      </p>
      <p className="mt-1 text-muted-foreground">
        {error instanceof Error && error.message ? error.message : "Please check your connection and try again."}
      </p>
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
