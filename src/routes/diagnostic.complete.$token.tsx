import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, GraduationCap } from "lucide-react";

import { DiagnosticShell } from "@/components/diagnostic-shell";
import { QueryError } from "@/components/query-error";
import { fetchRunCompletion } from "@/lib/parent-diagnostic.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/context";

const TITLE = "Diagnostic complete | EduOS";
const DESCRIPTION = "Your diagnostic has been submitted and scored. Your parent receives the report.";

export const Route = createFileRoute("/diagnostic/complete/$token")({
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
  component: CompletePage,
});

/**
 * The learner's end of the diagnostic. Scores and recommendations are the
 * parent's report, so this screen confirms the submission and sends the learner
 * back to My Learning — nothing more.
 */
function CompletePage() {
  const { t } = useI18n();
  const { token } = Route.useParams();
  const completionFn = useServerFn(fetchRunCompletion);
  const query = useQuery({
    queryKey: ["diagnostic-completion", token],
    queryFn: () => completionFn({ data: { token } }),
  });

  if (query.isLoading) {
    return (
      <DiagnosticShell variant="learner">
        <Skeleton className="h-56 w-full" />
      </DiagnosticShell>
    );
  }
  if (query.isError || !query.data) {
    return (
      <DiagnosticShell variant="learner">
        <QueryError
          title="This diagnostic could not be loaded"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </DiagnosticShell>
    );
  }

  const c = query.data;
  return (
    <DiagnosticShell variant="learner" learnerName={c.learnerName} footerNote={`${c.subject} · ${c.unitTitle}`}>
      <Card>
        <CardHeader className="items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <CardTitle className="mt-2 text-xl">
            {c.submitted ? "All done — well played" : "Almost there"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {c.submitted
              ? `You answered ${c.answeredCount} of ${c.totalQuestions} questions in ${c.subject}. Your parent gets the report, and your focus areas will show up in My Learning.`
              : "This diagnostic has not been submitted yet. Head back and finish the last questions."}
          </p>
          <Button asChild>
            <Link to="/home">
              <GraduationCap className="mr-2 h-4 w-4" /> {t("runs.backToLearning", "Back to My Learning")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </DiagnosticShell>
  );
}
