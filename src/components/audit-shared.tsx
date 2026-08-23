import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import type { DbErrorShape } from "@/lib/audit.server";

export function fmt(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

export function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs break-all">{children}</span>;
}

export function Pass({ pass, skipped }: { pass: boolean; skipped?: boolean }) {
  if (skipped) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <MinusCircle className="h-3.5 w-3.5" /> SKIP
      </span>
    );
  }
  return pass ? (
    <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" /> PASS
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-medium text-destructive">
      <XCircle className="h-3.5 w-3.5" /> FAIL
    </span>
  );
}

export function DbErrorBlock({ error }: { error: DbErrorShape }) {
  if (!error) return null;
  return (
    <div className="rounded-md border bg-muted/40 p-2.5 font-mono text-xs leading-relaxed">
      <div>
        <span className="text-muted-foreground">code:</span> {error.code ?? "—"}
      </div>
      <div>
        <span className="text-muted-foreground">message:</span> {error.message}
      </div>
      {error.details ? (
        <div>
          <span className="text-muted-foreground">details:</span> {error.details}
        </div>
      ) : null}
      {error.hint ? (
        <div>
          <span className="text-muted-foreground">hint:</span> {error.hint}
        </div>
      ) : null}
    </div>
  );
}
