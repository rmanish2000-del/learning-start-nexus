import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { QueryError } from "@/components/query-error";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { listStaffUsers } from "@/lib/admin.functions";
import { assignEducator } from "@/lib/learners.functions";
import { cn } from "@/lib/utils";
import { friendlyErrorMessage } from "@/lib/user-errors";

const UNASSIGNED = "__unassigned__";

export const Route = createFileRoute("/_authenticated/assignments")({
  beforeLoad: ({ context }) => {
    if (context.role !== "admin") {
      throw redirect({ to: context.role === "student" ? "/home" : "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Assignments — EduOS" },
      { name: "description", content: "Assign learners to educators." },
      { property: "og:title", content: "Assignments — EduOS" },
      { property: "og:description", content: "Assign learners to educators." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssignmentsPage,
});

type LearnerRow = {
  id: string;
  full_name: string;
  grade: number;
  subject: string;
  status: "active" | "needs_attention" | "paused";
  educator_id: string | null;
};

function AssignmentsPage() {
  const queryClient = useQueryClient();
  const fetchStaff = useServerFn(listStaffUsers);
  const runAssign = useServerFn(assignEducator);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"unassigned" | "all">("unassigned");

  const {
    data: learners,
    isLoading: learnersLoading,
    isError: learnersIsError,
    error: learnersError,
    refetch: refetchLearners,
  } = useQuery({
    queryKey: ["learners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learners")
        .select("id, full_name, grade, subject, status, educator_id")
        .eq("learner_mode", "centre_managed")
        .order("full_name");
      if (error) throw new Error(error.message);
      return data as LearnerRow[];
    },
    retry: false,
    throwOnError: false,
  });

  const {
    data: staff,
    isError: staffIsError,
    error: staffError,
    refetch: refetchStaff,
  } = useQuery({
    queryKey: ["staff-users"],
    queryFn: () => fetchStaff(),
    retry: false,
    throwOnError: false,
  });

  const educators = (staff ?? []).filter((s) => s.role === "educator");

  const assignMutation = useMutation({
    mutationFn: ({ learnerId, educatorId }: { learnerId: string; educatorId: string }) =>
      runAssign({ data: { learnerId, educatorId } }),
    onMutate: ({ learnerId }) => setSavingId(learnerId),
    onSettled: () => setSavingId(null),
    onSuccess: async (_result, { educatorId }) => {
      const educator = educators.find((e) => e.id === educatorId);
      toast.success(`Assigned to ${educator?.fullName ?? "educator"}.`);
      await queryClient.invalidateQueries({ queryKey: ["learners"] });
    },
    onError: (err) => {
      toast.error(friendlyErrorMessage(err, "Could not assign educator."));
    },
  });

  const unassignedCount = (learners ?? []).filter((l) => !l.educator_id).length;
  // Unassigned learners are the work queue — they sort first and can be
  // isolated with the filter, so nobody purchased-but-unassigned is missed.
  const visibleLearners = (learners ?? [])
    .filter((l) => (filter === "unassigned" ? !l.educator_id : true))
    .sort((a, b) => Number(!!a.educator_id) - Number(!!b.educator_id));

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Educator assignments</h2>
          <p className="text-sm text-muted-foreground">
            Every learner — including students created by parents after a diagnostic purchase —
            needs an assigned educator. Assign from this queue; parents see the status change
            immediately in their portal.
          </p>
        </div>

        {learnersIsError && (
          <QueryError
            title="Learner roster didn't load"
            error={learnersError}
            onRetry={() => void refetchLearners()}
          />
        )}
        {staffIsError && (
          <QueryError
            title="Educator list didn't load"
            error={staffError}
            onRetry={() => void refetchStaff()}
            compact
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={filter === "unassigned" ? "default" : "outline"}
            onClick={() => setFilter("unassigned")}
          >
            Needs assignment ({unassignedCount})
          </Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All learners ({(learners ?? []).length})
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              Learner roster
            </CardTitle>
            <CardDescription>
              {unassignedCount > 0
                ? `${unassignedCount} learner${unassignedCount === 1 ? "" : "s"} without an assigned educator.`
                : "Every learner has an assigned educator."}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="rounded-b-xl border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Learner</TableHead>
                    <TableHead className="w-16">Grade</TableHead>
                    <TableHead className="w-32">Subject</TableHead>
                    <TableHead className="w-36">Status</TableHead>
                    <TableHead className="w-64">Assigned educator</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {learnersLoading
                    ? Array.from({ length: 5 }, (_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 5 }, (_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full max-w-40" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : visibleLearners.map((learner) => (
                        <TableRow key={learner.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
                                  {learner.full_name
                                    .split(" ")
                                    .map((p) => p[0])
                                    .slice(0, 2)
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{learner.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>G{learner.grade}</TableCell>
                          <TableCell className="text-muted-foreground">{learner.subject}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 text-xs",
                                learner.status === "active" &&
                                  "text-emerald-600 dark:text-emerald-400",
                                learner.status === "needs_attention" && "text-amber-600",
                                learner.status === "paused" && "text-muted-foreground",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  learner.status === "active" && "bg-emerald-500",
                                  learner.status === "needs_attention" && "bg-amber-500",
                                  learner.status === "paused" && "bg-muted-foreground",
                                )}
                              />
                              {learner.status.replace("_", " ")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={learner.educator_id ?? UNASSIGNED}
                              disabled={savingId === learner.id}
                              onValueChange={(value) => {
                                if (!value || value === UNASSIGNED) return;
                                assignMutation.mutate({
                                  learnerId: learner.id,
                                  educatorId: value,
                                });
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Unassigned" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={UNASSIGNED} disabled>
                                  Unassigned
                                </SelectItem>
                                {educators.map((educator) => (
                                  <SelectItem key={educator.id} value={educator.id}>
                                    {educator.fullName || educator.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!learnersLoading && visibleLearners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        {filter === "unassigned"
                          ? "Nothing waiting — every learner has an educator."
                          : "No learners yet."}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
