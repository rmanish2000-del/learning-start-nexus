import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  FileText,
  Loader2,
  PlayCircle,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n/context";
import { getParentAccount, createStudentProfile } from "@/lib/parent-account.functions";
import { PILOT_BOARD, PILOT_CLASS, type ParentAccount, type ParentStudent } from "@/lib/parent-account-shared";
import { FreeCheckPanel } from "@/components/free-check-panel";
import { ParentDetailsCard, parentDetailsComplete } from "@/components/parent-details-card";

import { LoginInstructionActions, StudentLoginPanel } from "@/components/student-credentials";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Learner management is the first thing a signed-in parent sees. Creating a
 * child must never be hidden behind the purchase funnel: a parent can add a
 * child, hand over sign-in details and run a free learning check without ever
 * opening checkout.
 */
export function ParentLearners() {
  const { t } = useI18n();
  const accountFn = useServerFn(getParentAccount);
  const query = useQuery({ queryKey: ["parent-account"], queryFn: () => accountFn() });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (query.isLoading) return <Skeleton className="h-56 w-full" />;
  if (query.isError) {
    return (
      <QueryError
        title="Your children could not be loaded"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const account = query.data as ParentAccount | undefined;
  if (!account) return null;

  const students = account.students;
  const selected = students.find((s) => s.id === selectedId) ?? students[0] ?? null;

  return (
    <Card data-tour="parent-learners" className="border-primary/25">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" /> {t("learners.title", "Your children")}
        </CardTitle>
        <CardDescription>
          {t(
            "learners.subtitle",
            "Add a child, share their sign-in, run a free learning check, and follow every diagnostic — all from here.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adding a child is refused server-side until name + mobile exist, so
            the form to complete them must live here, not only in checkout. */}
        {!parentDetailsComplete(account.profile) ? (
          <ParentDetailsCard profile={account.profile} onSaved={() => void query.refetch()} />
        ) : null}
        {students.length === 0 ? (
          <EmptyLearners />
        ) : (

          <>
            <div className="flex flex-wrap items-center gap-2">
              {students.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant={selected?.id === s.id ? "default" : "outline"}
                  onClick={() => setSelectedId(s.id)}
                >
                  {s.fullName}
                </Button>
              ))}
              <AddLearnerButton />
            </div>
            {selected ? <LearnerDetail student={selected} account={account} /> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyLearners() {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UserPlus className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-base font-semibold">{t("learners.empty.title", "Add your child to begin")}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {t(
          "learners.empty.body",
          "Creating a profile takes a few seconds and costs nothing. You'll get their sign-in handle straight away and can run a free learning check before you buy anything.",
        )}
      </p>
      <div className="mt-4">
        <AddLearnerForm />
      </div>
    </div>
  );
}

function AddLearnerButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("learners.add", "Add child")}
      </Button>
      {open ? (
        <div className="mt-3 rounded-lg border bg-muted/30 p-3">
          <AddLearnerForm onDone={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

function AddLearnerForm({ onDone }: { onDone?: () => void }) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const addFn = useServerFn(createStudentProfile);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      addFn({ data: { fullName: fullName.trim(), grade: PILOT_CLASS, board: PILOT_BOARD } }),
    onSuccess: () => {
      toast.success("Child added. Set a 6-digit PIN so they can sign in.");
      setFullName("");
      void queryClient.invalidateQueries({ queryKey: ["parent-account"] });
      onDone?.();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "That child could not be added."),
  });

  return (
    <form
      className="mx-auto flex max-w-md flex-wrap items-end justify-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (fullName.trim().length < 2) {
          toast.error("Enter your child's name.");
          return;
        }
        mutation.mutate();
      }}
    >
      <div className="flex-1 space-y-1 text-left">
        <Label htmlFor="new-learner-name" className="text-xs">
          {t("learners.add.name", "Child's full name")}
        </Label>
        <Input
          id="new-learner-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Aarav Sharma"
          className="h-9"
        />
      </div>
      <Button type="submit" size="sm" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
        {t("learners.add", "Add child")}
      </Button>
      <p className="w-full text-left text-xs text-muted-foreground">
        {t("learners.add.scope", `The pilot covers ${PILOT_BOARD} Class ${PILOT_CLASS} — Mathematics and Science.`)}
      </p>
    </form>
  );
}

function LearnerDetail({ student, account }: { student: ParentStudent; account: ParentAccount }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["parent-account"] });

  const purchases = useMemo(
    () => account.purchases.filter((p) => p.studentId === student.id && p.status === "paid"),
    [account.purchases, student.id],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{student.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {student.board} · Class {student.grade}
            </p>
          </div>
          <Badge variant="secondary">Mastery {student.masteryScore}%</Badge>
        </div>

        <StudentLoginPanel
          learnerId={student.id}
          handle={student.handle}
          hasLogin={student.hasLogin}
          onSaved={invalidate}
        />
        <LoginInstructionActions learnerName={student.fullName} handle={student.handle} />
      </div>

      <FreeCheckPanel student={student} />

      <div className="rounded-lg border p-3">
        <p className="text-sm font-medium">{t("learners.diagnostics", "Diagnostics")}</p>
        {purchases.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            No paid diagnostic yet for {student.fullName}.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {purchases.map((p) => (
              <div
                key={p.orderRef}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {p.purpose === "diagnostic" ? "Diagnostic" : "Board Success Plan"}
                    {p.subject ? ` · ${p.subject}` : ""}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {p.sessionStatus === "submitted" ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{" "}
                        {t("status.completed", "Completed — report ready")}
                      </>
                    ) : p.sessionStatus === "in_progress" ? (
                      <>
                        <PlayCircle className="h-3.5 w-3.5 text-amber-600" /> {t("status.inProgress", "In progress")}
                      </>
                    ) : (
                      <>
                        <CircleDashed className="h-3.5 w-3.5" /> {t("status.notStarted", "Not started")}
                      </>
                    )}
                  </p>
                </div>
                {p.accessToken ? (
                  <div className="flex flex-wrap gap-2">
                    {p.sessionStatus === "submitted" ? (
                      <>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/diagnostic/report/$token" params={{ token: p.accessToken }}>
                            <FileText className="mr-1.5 h-3.5 w-3.5" /> Report
                          </Link>
                        </Button>
                        {p.purpose === "diagnostic" ? (
                          <Button asChild size="sm">
                            <Link to="/upgrade/$token" params={{ token: p.accessToken }}>
                              <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" /> Upgrade
                            </Link>
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Button asChild size="sm">
                        <Link to="/diagnostic/handoff/$token" params={{ token: p.accessToken }}>
                          Sign-in details
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
