// Shared modal shell — one structure for every workflow dialog in EduOS.
//
// Layout law: the shell never exceeds the viewport, the header and footer are
// pinned, and the body is the ONLY scroll region. No nested scrollers, no
// horizontal overflow, no action buttons pushed past the screen edge.

import * as React from "react";
import { AlertTriangle, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ModalShell({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        // flex column + hidden overflow: the body below owns scrolling.
        "flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

export function ModalHeader({
  title,
  description,
  badge,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 py-4 pr-14 text-left">
      <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
        {title}
        {badge}
      </DialogTitle>
      {description ? <DialogDescription>{description}</DialogDescription> : null}
    </DialogHeader>
  );
}

export function ModalBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5", className)}>
      {children}
    </div>
  );
}

export function ModalFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "shrink-0 flex flex-col-reverse gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-end",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// Explains why an action is unavailable instead of showing a mute disabled control.
export function DisabledReason({ reason, children }: { reason: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-label={reason} className="inline-flex">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{reason}</TooltipContent>
    </Tooltip>
  );
}

export function ReasonList({ title, reasons }: { title: string; reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" /> {title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{children}</span>
    </p>
  );
}

// Confirmation dialog used for every commitment action (publish, discard…).
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? null : onOpenChange(next))}>
      <ModalShell className="sm:max-w-md">
        <ModalHeader title={title} description={description} />
        <ModalFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </ModalFooter>
      </ModalShell>
    </Dialog>
  );
}
