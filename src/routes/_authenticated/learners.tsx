import { useMemo, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { createLearner } from "@/lib/learners.functions";
import { listStaffUsers } from "@/lib/admin.functions";
import { createLearnerSchema } from "@/lib/schemas";
import { statusBadge, liftText } from "./dashboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authenticated/learners")({
  beforeLoad: ({ context }) => {
    if (context.role === "student") throw redirect({ to: "/home" });
  },
  head: () => ({
    meta: [
      { title: "Learners — EduOS" },
      { name: "description", content: "Browse, filter, and manage every learner at your center." },
      { property: "og:title", content: "Learners — EduOS" },
      { property: "og:description", content: "Browse, filter, and manage every learner at your center." },
    ],
  }),
  component: LearnersPage,
});

function LearnersPage() {
  const { role } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const createLearnerFn = useServerFn(createLearner);

  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [grade, setGrade] = useState("all");
  const [status, setStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: learners, isPending } = useQuery({
    queryKey: ["learners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learners").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: staff } = useQuery({
    queryKey: ["staff-users"],
    queryFn: () => listStaffUsers(),
    enabled: role === "admin",
  });

  const educatorName = useMemo(() => {
    const map = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return (id: string | null) => (id ? (map.get(id) ?? "—") : "Unassigned");
  }, [profiles]);

  const subjects = useMemo(
    () => [...new Set((learners ?? []).map((l) => l.subject))].sort(),
    [learners],
  );
  const grades = useMemo(
    () => [...new Set((learners ?? []).map((l) => l.grade))].sort((a, b) => a - b),
    [learners],
  );

  const filtered = (learners ?? []).filter((l) => {
    if (search && !l.full_name.toLowerCase().includes(search.toLowerCase()) && !l.handle.includes(search.toLowerCase()))
      return false;
    if (subject !== "all" && l.subject !== subject) return false;
    if (grade !== "all" && l.grade !== Number(grade)) return false;
    if (status !== "all" && l.status !== status) return false;
    return true;
  });

  const addMutation = useMutation({
    mutationFn: (input: unknown) => createLearnerFn({ data: createLearnerSchema.parse(input) }),
    onSuccess: () => {
      toast.success("Learner added. Share their handle and PIN with them.");
      setDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["learners"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const onAddSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addMutation.mutate({
      fullName: String(form.get("fullName") ?? ""),
      handle: String(form.get("handle") ?? ""),
      grade: Number(form.get("grade")),
      subject: String(form.get("subject") ?? ""),
      pin: String(form.get("pin") ?? ""),
      educatorId: form.get("educatorId") ? String(form.get("educatorId")) : undefined,
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Learners</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {learners?.length ?? 0} learners
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Add learner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add learner</DialogTitle>
              <DialogDescription>
                Creates the learner profile and their student sign-in (handle + PIN).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" placeholder="Aarav Sharma" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="handle">Handle</Label>
                  <Input id="handle" name="handle" placeholder="aarav" autoCapitalize="none" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">6-digit PIN</Label>
                  <Input id="pin" name="pin" inputMode="numeric" maxLength={6} placeholder="123456" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input id="grade" name="grade" type="number" min={1} max={12} defaultValue={6} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select name="subject" defaultValue="Mathematics">
                    <SelectTrigger id="subject">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Mathematics", "English", "Science"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {role === "admin" && (
                <div className="space-y-2">
                  <Label htmlFor="educatorId">Educator</Label>
                  <Select name="educatorId">
                    <SelectTrigger id="educatorId">
                      <SelectValue placeholder="Assign educator…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(staff ?? [])
                        .filter((u) => u.role === "educator")
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Adding…" : "Add learner"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or handle…"
            className="pl-9"
          />
        </div>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-40" aria-label="Filter by subject">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger className="w-32" aria-label="Filter by grade">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All grades</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="needs_attention">Needs attention</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Learner</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Educator</TableHead>
              <TableHead className="text-right">Mastery</TableHead>
              <TableHead className="text-right">30-day lift</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              [0, 1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isPending && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No learners match these filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((learner) => (
              <TableRow key={learner.id}>
                <TableCell>
                  <Link
                    to="/learners/$learnerId"
                    params={{ learnerId: learner.id }}
                    className="font-medium hover:underline"
                  >
                    {learner.full_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">@{learner.handle}</p>
                </TableCell>
                <TableCell>{learner.grade}</TableCell>
                <TableCell>{learner.subject}</TableCell>
                <TableCell className="text-muted-foreground">{educatorName(learner.educator_id)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {learner.mastery_score}%
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {liftText(Number(learner.mastery_lift))}
                </TableCell>
                <TableCell>{statusBadge(learner.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
