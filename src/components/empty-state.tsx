import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  to?: string;
  onAction?: () => void;
  /** Extra guidance shown under the description. */
  hint?: string;
}

/** Consistent empty-state guidance: what this is, why it's empty, what to do next. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  to,
  onAction,
  hint,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {hint && <p className="mt-2 max-w-md text-xs text-muted-foreground/80">{hint}</p>}
      {actionLabel && to && (
        <Button asChild className="mt-5" size="sm">
          <Link to={to}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && !to && onAction && (
        <Button className="mt-5" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
