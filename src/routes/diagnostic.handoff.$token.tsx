import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  FileText,
  LogIn,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

import { DiagnosticShell } from "@/components/diagnostic-shell";
import { ParentAuthGate } from "@/components/parent-auth-gate";
import { LoginInstructionActions } from "@/components/student-credentials";
import { QueryError } from "@/components/query-error";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import { fetchDiagnosticHandoff } from "@/lib/parent-diagnostic.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const TITLE = "Diagnostic ready | EduOS";
const DESCRIPTION =
  "Your child's diagnostic is ready. Hand over their sign-in details — they answer it, you get the report.";

export const Route = createFileRoute("/diagnostic/handoff/$token")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HandoffPage,
});

function HandoffPage() {
  const { token } = Route.useParams();
  const { data: user, isLoading } = useSupabaseUser();
  if (isLoading) {
    return (
      <DiagnosticShell>
        <Skeleton className="h-64 w-full" />
      </DiagnosticShell>
    );
  }
  if (!user) {
    return (
      <DiagnosticShell>
        <ParentAuthGate next={`/diagnostic/handoff/${token}`}>{null}</ParentAuthGate>
      </DiagnosticShell>
    );
  }
  return <HandoffBody />;
}

/**
 * The purchase/assessment boundary made visible. The parent owns the order and
 * the report; the learner owns the attempt. This screen hands the diagnostic
 * over — it never opens an answerable question paper for the parent.
 */
function HandoffBody() {
  const { token } = Route.useParams();
  const handoffFn = useServerFn(fetchDiagnosticHandoff);
  const query = useQuery({
    queryKey: ["diagnostic-handoff", token],
    queryFn: () => handoffFn({ data: { token } }),
    refetchInterval: 30_000,
  });

  if (query.isLoading) {
    return (
      <DiagnosticShell>
        <Skeleton className="h-72 w-full" />
      </DiagnosticShell>
    );
  }
  if (query.isError || !query.data) {
    return (
      <DiagnosticShell>
        <QueryError
          title="This diagnostic could not be loaded"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </DiagnosticShell>
    );
  }

  const h = query.data;
  const pct = h.totalQuestions === 0 ? 0 : (h.answeredCount / h.totalQuestions) * 100;

  return (
    <DiagnosticShell footerNote={`${h.subject} · ${h.unitTitle}`}>
      <div className="space-y-2">
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> Payment received
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Diagnostic ready for {h.learnerName}</h1>
        <p className="text-sm text-muted-foreground">
          {h.subject} · {h.unitTitle} · {h.totalQuestions}-question diagnostic
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ask {h.learnerName} to sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p>
              Handle: <span className="font-mono font-medium">{h.learnerHandle}</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              PIN:{" "}
              {h.hasLogin
                ? "the 6-digit PIN you set. You can reset it any time from the Parent portal."
                : "not set yet — set a 6-digit PIN in the Parent portal before your child signs in."}
            </p>
            <LoginInstructionActions learnerName={h.learnerName} handle={h.learnerHandle} />
          </div>

          <p className="text-sm text-muted-foreground">
            Your child answers the diagnostic in their own Student workspace so the result measures
            them, not you. You'll get the full report here as soon as they finish.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/auth">
                <LogIn className="mr-2 h-4 w-4" /> Open learner sign-in
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/parent">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Parent portal
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {h.status === "submitted" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Completed — report ready
              </>
            ) : h.status === "in_progress" ? (
              <>
                <PlayCircle className="h-4 w-4 text-amber-600" /> In progress
              </>
            ) : (
              <>
                <CircleDashed className="h-4 w-4 text-muted-foreground" /> Not started
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={pct} />
          <p className="text-sm text-muted-foreground">
            {h.answeredCount} of {h.totalQuestions} questions answered.
            {h.status === "submitted" ? " The report is ready below." : " This page updates itself."}
          </p>
          {h.status === "submitted" ? (
            <Button asChild>
              <Link to="/diagnostic/report/$token" params={{ token: h.accessToken }}>
                <FileText className="mr-2 h-4 w-4" /> Open the report
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </DiagnosticShell>
  );
}
