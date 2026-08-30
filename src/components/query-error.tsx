import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { friendlyErrorMessage } from "@/lib/user-errors";

/**
 * Shared failure state for data-backed panels. Distinguishes "you don't have
 * access" from "something broke" and always offers a way forward instead of
 * an empty card or a silent blank region.
 */
export function QueryError({
  title = "This didn't load",
  error,
  onRetry,
  compact,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const raw = friendlyErrorMessage(error, "");
  const denied = /permission|unauthori|forbidden|row-level/i.test(raw);
  const message = denied
    ? "You don't have access to this information. If that looks wrong, ask your center's admin to check your account."
    : raw || "We couldn't load this right now. Please try again.";

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <span className="min-w-0 flex-1 text-muted-foreground">{message}</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          {title}
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
