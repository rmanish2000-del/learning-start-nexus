import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Database,
  FileCheck2,
  FlaskConical,
  Layers,
  PlayCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DIFFICULTY_LABELS } from "@/lib/assessment-shared";
import { getAssessmentVerification } from "@/lib/assessment-verification.functions";
import { assignAssessment, createAssessment } from "@/lib/assessments.functions";

export const Route = createFileRoute("/_authenticated/assessment-verification")({
  head: () => ({
    meta: [
      { title: "Assessment Verification — EduOS" },
      {
        name: "description",
        content:
          "Internal Sprint 2 verification page: live proof for the item bank, assessment creation, assignment, resume, server-side scoring, evidence generation, and RLS isolation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentVerificationPage,
});

const authRoute = getRouteApi("/_authenticated");
const PROBE_KEY = "eduos.probeAssessment";

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

function Pass({ pass }: { pass: boolean }) {
  return pass ? (
    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" /> PASS
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-destructive">
      <XCircle className="h-3.5 w-3.5" /> FAIL
    </span>
  );
}

function AssessmentVerificationPage() {
  const { role } = authRoute.useRouteContext();
  const isStaff = role === "admin" || role === "educator";
  const queryClient = useQueryClient();

  const runReport = useServerFn(getAssessmentVerification);
  const report = useQuery({
    queryKey: ["assessment-verification"],
    queryFn: () => runReport(),
    staleTime: 10_000,
  });

  const createFn = useServerFn(createAssessment);
  const assignFn = useServerFn(assignAssessment);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastProbe, setLastProbe] = useState<{ id: string; title: string; at: string } | null>(() => {
    try {
      const raw = window.localStorage.getItem(PROBE_KEY);
      return raw ? (JSON.parse(raw) as { id: string; title: string; at: string }) : null;
    } catch {
      return null;
    }
  });

  const data = report.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["assessment-verification"] });

  const runCreateProbe = async () => {
    if (!data || data.itemBank.items.length === 0) return;
    setBusy("create");
    try {
      const title = `Verification probe ${new Date().toISOString().slice(11, 19)} UTC`;
      const res = await createFn({
        data: {
          title,
          description: "Created by the Sprint 2 verification center to prove persistence.",
          itemIds: data.itemBank.items.slice(0, 3).map((i) => i.id),
          publishNow: false,
        },
      });
      const record = { id: res.id, title, at: new Date().toISOString() };
      window.localStorage.setItem(PROBE_KEY, JSON.stringify(record));
      setLastProbe(record);
      await refresh();
      toast.success("Probe assessment created. Reload the page — it will still be listed below.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(null);
    }
  };

  const runAssignProbe = async () => {
    if (!data) return;
    const published = data.assessments.find((a) => a.status === "published");
    const learner = data.learners[0];
    if (!published || !learner) return;
    setBusy("assign");
    try {
      await assignFn({
        data: { assessmentId: published.id, learnerIds: [learner.id] },
      });
      await refresh();
      toast.success(
        `Assigned "${published.title}" to ${learner.fullName}. Reload the page — the session row persists.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setBusy(null);
    }
  };

  const publishedAssessment = data?.assessments.find((a) => a.status === "published");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FlaskConical className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Sprint 2 verification — assessment engine</h2>
            <p className="text-sm text-muted-foreground">
              Every figure below is queried live from the database as the signed-in user. Reload the
              page at any point — persisted rows reappear because they come from Postgres, not
              client state.
              {data && (
                <>
                  {" "}Generated {fmt(data.generatedAt)} as{" "}
                  <span className="font-medium text-foreground">{data.me.role}</span> of{" "}
                  <span className="font-medium text-foreground">{data.me.orgName ?? "—"}</span>.
                </>
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={report.isFetching}>
          <RefreshCw className={report.isFetching ? "animate-spin" : ""} />
          Refresh live data
        </Button>
      </div>

      {report.isError && (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            Failed to load the verification report.
          </CardContent>
        </Card>
      )}

      {/* 1. Item bank */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" /> 1. Item bank — persisted assessment_items
          </CardTitle>
          <CardDescription>
            Live rows from <span className="font-mono text-xs">assessment_items</span>, scoped to
            your organization by RLS. Concept linkage: every item is attached to a{" "}
            <span className="font-medium text-foreground">topic → subtopic</span> pair with a
            difficulty level.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.itemBank.restricted ? (
            <p className="rounded-lg border bg-muted/40 p-4 text-sm">
              <span className="font-medium">Access denied for your role.</span> The item bank
              (including correct answers) is staff-only at the database level — this denial is
              itself proof for the RLS section below. Sign in as{" "}
              <span className="font-mono text-xs">priya.nair@eduos.dev</span> to see the bank.
            </p>
          ) : (
            <>
              <p className="text-sm">
                <span className="text-2xl font-semibold">{data?.itemBank.total ?? "…"}</span>{" "}
                <span className="text-muted-foreground">items persisted in your org bank</span>
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concept linkage</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Prompt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.itemBank.items ?? []).slice(0, 12).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        <span className="font-medium">{item.topic}</span>
                        <ArrowRight className="mx-1 inline h-3 w-3 text-muted-foreground" />
                        <span>{item.subtopic}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.kind}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {DIFFICULTY_LABELS[item.difficulty] ?? item.difficulty}
                      </TableCell>
                      <TableCell className="max-w-72 truncate text-sm text-muted-foreground">
                        {item.prompt}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(data?.itemBank.total ?? 0) > 12 && (
                <p className="text-xs text-muted-foreground">
                  Showing 12 of {data?.itemBank.total} items.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 2. Assessment creation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" /> 2. Assessment creation — survives reload
          </CardTitle>
          <CardDescription>
            The button calls the real <span className="font-mono text-xs">createAssessment</span>{" "}
            server function. After it succeeds, reload the page: the new row is still in this live
            table because it was written to Postgres.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isStaff && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                onClick={runCreateProbe}
                disabled={busy !== null || !data || data.itemBank.items.length === 0}
              >
                <PlayCircle className="h-4 w-4" />
                {busy === "create" ? "Creating…" : "Create probe assessment"}
              </Button>
              {lastProbe && (
                <p className="text-xs text-muted-foreground">
                  Last probe: <span className="font-medium text-foreground">{lastProbe.title}</span>{" "}
                  at {fmt(lastProbe.at)} — reload the page and find it highlighted below.
                </p>
              )}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Persisted at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.assessments ?? []).map((a) => (
                <TableRow
                  key={a.id}
                  className={lastProbe?.id === a.id ? "bg-emerald-500/5" : undefined}
                >
                  <TableCell className="text-sm font-medium">
                    {a.title}
                    {lastProbe?.id === a.id && (
                      <Badge variant="outline" className="ml-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                        probe — persisted
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.status === "published" ? "default" : "secondary"}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{a.itemCount}</TableCell>
                  <TableCell className="font-mono text-xs">{fmt(a.createdAt)}</TableCell>
                </TableRow>
              ))}
              {data && data.assessments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    No assessments visible to your account.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. Assignment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck2 className="h-4 w-4" /> 3. Assessment assignment — session rows persist
          </CardTitle>
          <CardDescription>
            Assigning creates one <span className="font-mono text-xs">assessment_sessions</span>{" "}
            row per learner. The table below is queried live — reload and the assignment is still
            there.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isStaff && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={runAssignProbe}
                disabled={busy !== null || !publishedAssessment || (data?.learners.length ?? 0) === 0}
              >
                <PlayCircle className="h-4 w-4" />
                {busy === "assign" ? "Assigning…" : "Assign probe"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {publishedAssessment && data?.learners[0]
                  ? `Assigns "${publishedAssessment.title}" to ${data.learners[0].fullName}. Re-running is a no-op (unique per assessment + learner).`
                  : "Needs a published assessment and at least one learner."}
              </p>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.sessions ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm font-medium">{s.learnerName}</TableCell>
                  <TableCell className="text-sm">{s.assessmentTitle}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.status === "submitted"
                          ? "default"
                          : s.status === "in_progress"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{s.scorePct === null ? "—" : `${s.scorePct}%`}</TableCell>
                  <TableCell className="font-mono text-xs">{fmt(s.createdAt)}</TableCell>
                </TableRow>
              ))}
              {data && data.sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No sessions visible to your account.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. Resume */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4" /> 4. Resume interrupted session — answers stored server-side
          </CardTitle>
          <CardDescription>
            These unfinished sessions have answers stored in the{" "}
            <span className="font-mono text-xs">answers</span> jsonb column on the server — the
            student can leave, sign back in, and continue exactly where they stopped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data?.resumeProofs ?? []).map((r) => (
            <div key={r.sessionId} className="rounded-lg border p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {r.learnerName} — {r.assessmentTitle}
                </p>
                {role === "student" && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/session/$sessionId" params={{ sessionId: r.sessionId }}>
                      Resume now
                    </Link>
                  </Button>
                )}
              </div>
              <div className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-3">
                <span>
                  Stored answers:{" "}
                  <span className="font-medium text-foreground">
                    {Object.keys(r.storedAnswers).length}
                  </span>
                </span>
                <span>
                  Saved position:{" "}
                  <span className="font-medium text-foreground">question {r.currentPosition + 1}</span>
                </span>
                <span>
                  Last activity:{" "}
                  <span className="font-medium text-foreground">{fmt(r.lastActivityAt)}</span>
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                answers = {JSON.stringify(r.storedAnswers).slice(0, 160)}
                {JSON.stringify(r.storedAnswers).length > 160 ? "…" : ""}
              </p>
            </div>
          ))}
          {data && data.resumeProofs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No in-progress sessions with stored answers right now. Sign in as a student, start an
              assessment, answer a few questions, leave — then reload this page.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 5. Server-side scoring */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" /> 5. Server-side scoring — database record
          </CardTitle>
          <CardDescription>
            Scoring runs inside the <span className="font-mono text-xs">submitAssessment</span>{" "}
            server function, reading the stored answers — never the client payload. Below is the
            verbatim session row written back to Postgres.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.scoringProof ? (
            <>
              <div className="grid gap-2 rounded-lg border bg-muted/40 p-4 font-mono text-xs sm:grid-cols-2">
                <span>session.id = {data.scoringProof.sessionId}</span>
                <span>score_pct = {data.scoringProof.scorePct}</span>
                <span>
                  correct_count = {data.scoringProof.correctCount} / total_count ={" "}
                  {data.scoringProof.totalCount}
                </span>
                <span>submitted_at = {fmt(data.scoringProof.submittedAt)}</span>
                <span className="sm:col-span-2">
                  learner = {data.scoringProof.learnerName} · assessment ={" "}
                  {data.scoringProof.assessmentTitle}
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subtopic</TableHead>
                    <TableHead>Given</TableHead>
                    <TableHead>Correct answer</TableHead>
                    <TableHead>Verdict</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.scoringProof.breakdown.map((entry) => (
                    <TableRow key={entry.item_id}>
                      <TableCell className="text-sm">{entry.subtopic}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.given || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.correct_answer}</TableCell>
                      <TableCell>
                        {entry.correct ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <XCircle className="h-3.5 w-3.5" /> wrong
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No submitted session visible yet. Complete an assessment as a student, then reload.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 6. Evidence generation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> 6. Evidence generation — written on submit
          </CardTitle>
          <CardDescription>
            Submission writes two rows: a{" "}
            <span className="font-mono text-xs">learner_assessments</span> record and a{" "}
            <span className="font-mono text-xs">learner_evidence</span> entry with subtopic
            strengths/gaps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">learner_evidence (kind = assessment)</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.evidence ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm font-medium">{e.learnerName}</TableCell>
                    <TableCell className="text-sm">{e.title}</TableCell>
                    <TableCell className="max-w-96 text-xs text-muted-foreground">{e.note}</TableCell>
                    <TableCell className="font-mono text-xs">{e.recordedOn}</TableCell>
                  </TableRow>
                ))}
                {data && data.evidence.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      No assessment evidence visible to your account.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">learner_assessments (score records)</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Taken on</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.learnerAssessments ?? []).map((la) => (
                  <TableRow key={la.id}>
                    <TableCell className="text-sm font-medium">{la.learnerName}</TableCell>
                    <TableCell className="text-sm">{la.title}</TableCell>
                    <TableCell className="text-sm">{la.score === null ? "—" : `${la.score}%`}</TableCell>
                    <TableCell className="font-mono text-xs">{la.takenOn ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {data && data.learnerAssessments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      No assessment records visible to your account.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 7. RLS probes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> 7. Assessment RLS probes — executed as you
          </CardTitle>
          <CardDescription>
            Each probe ran just now with your credentials. Cross-org probes locate a real row owned
            by the other organization (via the service role) and then try to read it as you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Probe</TableHead>
                <TableHead>Expectation</TableHead>
                <TableHead>Observed</TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.probes ?? []).map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="text-sm font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.expectation}</TableCell>
                  <TableCell className="max-w-80 text-xs">{p.outcome}</TableCell>
                  <TableCell>
                    <Pass pass={p.pass} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 8. Cross-org isolation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> 8. Cross-organization isolation — visible vs actual
          </CardTitle>
          <CardDescription>
            "Visible to you" is counted as your signed-in user (RLS applies). "Exists globally" is
            counted with the service role across all organizations. The gap is RLS filtering rows
            before they leave the database. Sign in as{" "}
            <span className="font-mono text-xs">nina.osei@northstar.education</span> (Org B) and the
            visible column flips to Northstar's rows only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Visible to you</TableHead>
                <TableHead>Exists globally (all orgs)</TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.counts ?? []).map((c) => (
                <TableRow key={c.table}>
                  <TableCell className="text-sm font-medium">{c.label}</TableCell>
                  <TableCell className="text-sm">
                    {c.visibleToYou === null ? (
                      <span className="text-muted-foreground">access denied</span>
                    ) : (
                      c.visibleToYou
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{c.globalAllOrgs}</TableCell>
                  <TableCell>
                    <Pass pass={c.isolated} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="pt-3 text-xs text-muted-foreground">
            Students are denied the item bank entirely; staff see only their own organization's
            assessments, sessions, responses, and evidence.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
