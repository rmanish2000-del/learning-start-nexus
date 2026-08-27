import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  Clock3,
  FileText,
  KeyRound,
  PlayCircle,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { getParentAccount, setStudentLoginPin } from "@/lib/parent-account.functions";
import type { ParentStudent } from "@/lib/parent-account-shared";
import { formatInr } from "@/lib/parent-diagnostic-shared";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Parent-facing student credentials: the handle is always visible and the
 * parent can set or reset the 6-digit PIN themselves. Students therefore never
 * depend on an educator being assigned before they can sign in.
 */
function StudentLoginPanel({ student, onSaved }: { student: ParentStudent; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const savePin = useServerFn(setStudentLoginPin);

  const mutation = useMutation({
    mutationFn: () => savePin({ data: { learnerId: student.id, pin } }),
    onSuccess: (result) => {
      toast.success(
        result.created
          ? `Student login created. Handle: ${result.handle}`
          : "PIN updated. Your child can sign in with the new PIN.",
      );
      setPin("");
      setOpen(false);
      onSaved();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save the PIN."),
  });

  return (
    <div className="mt-3 rounded-lg border border-dashed bg-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium">Student sign-in</p>
          <p className="truncate text-xs text-muted-foreground">
            Handle: <span className="font-mono">{student.handle}</span>
            {student.hasLogin ? "" : " · PIN not set yet"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          {student.hasLogin ? "Reset PIN" : "Create login"}
        </Button>
      </div>
      {open ? (
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^\d{6}$/.test(pin)) {
              toast.error("Enter a 6-digit PIN.");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`pin-${student.id}`} className="text-xs">
              New 6-digit PIN
            </Label>
            <Input
              id={`pin-${student.id}`}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              className="h-9 w-36 tracking-[0.4em]"
            />
          </div>
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save PIN"}
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Your child signs in at the Student tab with this handle and PIN.
          </p>
        </form>
      ) : null}
    </div>
  );
}

/**
 * Returning-parent surface: the students on the account and every purchase
 * made with it, each with the one action that moves it forward — resume the
 * diagnostic, read the report, or upgrade.
 */
export function ParentPurchases() {
  const accountFn = useServerFn(getParentAccount);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["parent-account"], queryFn: () => accountFn() });

  if (query.isLoading) return <Skeleton className="h-48 w-full" />;
  if (query.isError) {
    return (
      <QueryError title="Your account could not be loaded" error={query.error} onRetry={() => void query.refetch()} />
    );
  }

  const account = query.data;
  if (!account) return null;
  const { students, purchases } = account;
  const awaiting = students.filter((s) => s.assignmentStatus === "awaiting_assignment").length;

  return (
    <div className="space-y-4">
      {students.length > 0 ? (
        <Card className="border-primary/25 bg-primary/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> What happens next
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1 · Diagnostic</p>
              <p className="mt-1 text-sm">
                Your child takes the diagnostic from the link below. The gap report is instant.
              </p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2 · Educator</p>
              <p className="mt-1 text-sm">
                {awaiting > 0
                  ? "Our centre admin assigns an educator within 1 working day. No action needed from you."
                  : "An educator is assigned and reviewing the report."}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">3 · Plan</p>
              <p className="mt-1 text-sm">
                The educator approves interventions; progress and consent controls appear on this page.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Students
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No student profile yet.</p>
          ) : (
            students.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{s.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.board} · Class {s.grade}
                    </p>
                  </div>
                  <Badge variant="secondary">{s.masteryScore}%</Badge>
                </div>
                <div className="mt-2 space-y-1.5">
                  {s.assignmentStatus === "assigned" ? (
                    <Badge variant="default" className="gap-1">
                      <UserCheck className="h-3 w-3" />
                      Educator assigned{s.educatorName ? ` · ${s.educatorName}` : ""}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-amber-600">
                      <Clock3 className="h-3 w-3" />
                      No educator needed for the diagnostic
                    </Badge>
                  )}
                  {/* Never leave an unexplained state: say who acts next. */}
                  <p className="text-xs text-muted-foreground">
                    {s.assignmentStatus === "assigned"
                      ? "Your educator reviews the gap report and approves the learning plan."
                      : "The diagnostic and its report run without an educator. Our centre admin assigns one within 1 working day of a Board Success Plan purchase — nothing for you to do."}
                  </p>
                </div>

                <StudentLoginPanel
                  student={s}
                  onSaved={() => void queryClient.invalidateQueries({ queryKey: ["parent-account"] })}
                />
              </div>
            ))
          )}
          <Button asChild variant="outline" className="w-full">
            <Link to="/diagnostic">
              <ShoppingBag className="mr-2 h-4 w-4" /> Buy a diagnostic
            </Link>
          </Button>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" /> Your purchases
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing purchased yet. A diagnostic takes about 20 minutes and the report is instant.
            </p>
          ) : (
            purchases.map((p) => (
              <div
                key={p.orderRef}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {p.purpose === "diagnostic" ? "Diagnostic" : "Board Success Plan"}
                    {p.subject ? ` · ${p.subject}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.studentName ?? "—"}
                    {p.unitTitle ? ` · ${p.unitTitle}` : ""} · {formatInr(p.amountPaise)} · {p.orderRef}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "paid" ? "secondary" : "outline"}>{p.status}</Badge>
                  {p.status === "paid" && p.accessToken ? (
                    p.sessionStatus === "submitted" ? (
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
                        <Link to="/diagnostic/session/$token" params={{ token: p.accessToken }}>
                          <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Resume
                        </Link>
                      </Button>
                    )
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
