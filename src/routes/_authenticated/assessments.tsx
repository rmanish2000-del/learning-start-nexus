import { useMemo, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Plus, Search, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { assignAssessment, createAssessment } from "@/lib/assessments.functions";
import {
  ACTION_LABELS,
  STATE_LABELS,
  actionsFor,
  SUPPORTED_SCOPE,
  isLegacyContent,
  resolveState,
  unavailableReason,
} from "@/lib/assessment-lifecycle";
import {
  ConfirmDialog,
  DisabledReason,
  FormField,
  FormSection,
  InfoNote,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalShell,
} from "@/components/modal-shell";
import { DIFFICULTY_LABELS, type AssessmentItem } from "@/lib/assessment-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/assessments")({
  beforeLoad: ({ context }) => {
    if (context.role === "student") throw redirect({ to: "/home" });
  },
  head: () => ({
    meta: [
      { title: "Assessments — EduOS" },
      { name: "description", content: "Item bank, diagnostics, and learner assessment sessions." },
      { property: "og:title", content: "Assessments — EduOS" },
      { property: "og:description", content: "Item bank, diagnostics, and learner assessment sessions." },
    ],
  }),
  component: AssessmentsPage,
});

function sessionStatusBadge(status: string) {
  if (status === "submitted") return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">Submitted</Badge>;
  if (status === "in_progress") return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">In progress</Badge>;
  return <Badge variant="outline">Assigned</Badge>;
}

function AssessmentsPage() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createAssessment);
  const assignFn = useServerFn(assignAssessment);

  const [itemSearch, setItemSearch] = useState("");
  const [subtopic, setSubtopic] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);

  // New-assessment form state. Curriculum linkage is part of the form because
  // board, class and subject are inherited from the book — never hardcoded.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("20");
  const [bookId, setBookId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Stable per-attempt id — protects the create action against double clicks,
  // refreshes and network retries (server dedupes on it).
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  // Assign form state
  const [pickedLearners, setPickedLearners] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState("");

  const { data: items, isPending: itemsPending } = useQuery({
    queryKey: ["assessment-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_items")
        .select("*")
        .order("subtopic")
        .order("difficulty");
      if (error) throw error;
      return data as unknown as AssessmentItem[];
    },
  });

  // Active-scope curriculum sources for creation. Archived/demo books are
  // excluded so a new assessment can never be born as legacy content.
  const { data: books } = useQuery({
    queryKey: ["builder-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, board, grade, subject")
        .is("archived_at", null)
        .eq("is_demo", false)
        .eq("grade", SUPPORTED_SCOPE.grade)
        .in("subject", SUPPORTED_SCOPE.subjects)
        .order("subject");
      if (error) throw error;
      return data;
    },
  });

  const { data: units } = useQuery({
    queryKey: ["builder-units", bookId],
    enabled: Boolean(bookId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curriculum_units")
        .select("id, title, position")
        .eq("book_id", bookId)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  // Only approved AND verified questions of the chosen unit are selectable —
  // the same gate publishBlockers enforces server-side.
  const { data: unitQuestions, isPending: unitQuestionsPending } = useQuery({
    queryKey: ["builder-questions", unitId],
    enabled: Boolean(unitId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_bank")
        .select("id, prompt, kind, difficulty, assessment_outcomes!inner(code, title, unit_id)")
        .eq("assessment_outcomes.unit_id", unitId)
        .eq("status", "approved")
        .eq("verification_state", "verified")
        .order("difficulty");
      if (error) throw error;
      return data;
    },
  });

  const { data: assessments, isPending: assessmentsPending } = useQuery({
    queryKey: ["assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: maps } = useQuery({
    queryKey: ["assessment-maps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_item_map").select("assessment_id, item_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["assessment-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_sessions")
        .select("*, learners(full_name, handle), assessments(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: learners } = useQuery({
    queryKey: ["learners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learners")
        .select("id, full_name, handle, grade, status")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of maps ?? []) counts.set(m.assessment_id, (counts.get(m.assessment_id) ?? 0) + 1);
    return counts;
  }, [maps]);

  const sessionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions ?? []) counts.set(s.assessment_id, (counts.get(s.assessment_id) ?? 0) + 1);
    return counts;
  }, [sessions]);

  const subtopics = useMemo(() => [...new Set((items ?? []).map((i) => i.subtopic))].sort(), [items]);

  // Legacy pilot content (outside the active CBSE Class 10 scope) is never offered
  // in creation or assignment flows — it lives in a read-only archive tab.
  const activeAssessments = useMemo(
    () => (assessments ?? []).filter((a) => !isLegacyContent(a)),
    [assessments],
  );
  const legacyAssessments = useMemo(
    () => (assessments ?? []).filter((a) => isLegacyContent(a)),
    [assessments],
  );


  const filteredItems = useMemo(() => {
    return (items ?? []).filter((item) => {
      if (subtopic !== "all" && item.subtopic !== subtopic) return false;
      if (itemSearch && !item.prompt.toLowerCase().includes(itemSearch.toLowerCase())) return false;
      return true;
    });
  }, [items, subtopic, itemSearch]);

  const createMutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title,
          description: description || undefined,
          timeLimitMinutes: timeLimit ? Number(timeLimit) : undefined,
          bookId,
          unitId,
          questionIds: [...picked],
          clientRequestId: requestId,
        },
      }),
    onSuccess: (r) => {
      toast.success("Assessment saved as draft.");
      setSavedDraftId(r.id);
      setRequestId(crypto.randomUUID());
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["assessment-maps"] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not save the draft. Nothing was published."),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      assignFn({ data: { assessmentId: assignFor!, learnerIds: [...pickedLearners], dueDate: dueDate || undefined } }),
    onSuccess: (r) => {
      toast.success(`Assigned to ${r.assigned} learner${r.assigned === 1 ? "" : "s"}`);
      setAssignFor(null);
      setPickedLearners(new Set());
      setDueDate("");
      queryClient.invalidateQueries({ queryKey: ["assessment-sessions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not assign assessment."),
  });

  const toggle = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  };

  const draftReady = title.trim().length >= 3 && picked.size > 0;
  const dirty = title.trim().length > 0 || description.trim().length > 0 || picked.size > 0;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPicked(new Set());
    setSavedDraftId(null);
  };

  const closeCreate = (open: boolean) => {
    if (open) {
      setCreateOpen(true);
      return;
    }
    // Unsaved-changes guard: closing never discards silently and never publishes.
    if (dirty && !savedDraftId) {
      setConfirmDiscard(true);
      return;
    }
    setCreateOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Assessments</h2>
          <p className="text-sm text-muted-foreground">
            Create assessment → Save as draft → Review → Publish → Assign to learner. Active scope is
            CBSE Class 10 Mathematics and Science.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={closeCreate}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4" /> Create assessment
            </Button>
          </DialogTrigger>
          <ModalShell aria-describedby={undefined}>
            <ModalHeader
              title="Create assessment"
              description="Assessments are created as drafts. Nothing is published or assigned by saving."
            />
            {savedDraftId ? (
              <>
                <ModalBody>
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Assessment saved as draft.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      It is not visible to any learner. Review it to run the publication checks.
                    </p>
                  </div>
                  <InfoNote>
                    Publishing makes the assessment eligible for assignment; assigning connects a
                    published assessment to a learner or cohort. They remain separate steps.
                  </InfoNote>
                </ModalBody>
                <ModalFooter>
                  <Button variant="ghost" onClick={() => setSavedDraftId(null)}>
                    Continue editing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreateOpen(false);
                      resetForm();
                    }}
                  >
                    Return to assessments
                  </Button>
                  <Button asChild>
                    <Link to="/assessment/$assessmentId" params={{ assessmentId: savedDraftId }}>
                      Review assessment
                    </Link>
                  </Button>
                </ModalFooter>
              </>
            ) : (
              <>
                <ModalBody>
                  <FormSection title="Details">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField id="a-title" label="Title">
                        <Input
                          id="a-title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Class 10 Mathematics checkpoint"
                        />
                      </FormField>
                      <FormField
                        id="a-time"
                        label="Estimated duration (minutes)"
                        hint="Shown to learners before they start."
                      >
                        <Input
                          id="a-time"
                          type="number"
                          min={1}
                          max={180}
                          value={timeLimit}
                          onChange={(e) => setTimeLimit(e.target.value)}
                        />
                      </FormField>
                    </div>
                    <FormField id="a-desc" label="Description (optional)">
                      <Input
                        id="a-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What this assessment measures"
                      />
                    </FormField>
                  </FormSection>

                  <FormSection
                    title={`Questions (${picked.size} selected)`}
                    hint="Selecting questions never publishes or assigns anything."
                  >
                    <div className="divide-y rounded-lg border">
                      {(items ?? []).length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">
                          No questions are available in the active CBSE Class 10 scope yet. Build one
                          from the curriculum in the Assessment Builder.
                        </p>
                      ) : (
                        (items ?? []).map((item) => (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={picked.has(item.id)}
                              onCheckedChange={() => toggle(picked, item.id, setPicked)}
                              className="mt-0.5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm">{item.prompt}</span>
                              <span className="text-xs text-muted-foreground">
                                {item.subtopic} · {DIFFICULTY_LABELS[item.difficulty]} ·{" "}
                                {item.kind === "mcq" ? "Multiple choice" : "Numeric"}
                              </span>
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </FormSection>

                  <InfoNote>
                    New assessments always begin as <strong>Draft</strong>. Publishing happens on the
                    review screen after every validation check passes.
                  </InfoNote>
                </ModalBody>
                <ModalFooter>
                  <Button variant="ghost" onClick={() => closeCreate(false)}>
                    Cancel
                  </Button>
                  {draftReady ? null : (
                    <span className="text-xs text-muted-foreground sm:mr-auto">
                      Add a title (3+ characters) and at least one question to save a draft.
                    </span>
                  )}
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !draftReady}
                  >
                    {createMutation.isPending ? "Saving…" : "Save as draft"}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalShell>
        </Dialog>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsaved assessment?"
        description="Your title, description and selected questions have not been saved as a draft yet."
        confirmLabel="Discard"
        cancelLabel="Continue editing"
        destructive
        onConfirm={() => {
          setConfirmDiscard(false);
          setCreateOpen(false);
          resetForm();
        }}
      />


      <Tabs defaultValue="assessments">
        <TabsList>
          <TabsTrigger value="assessments">Assessments ({activeAssessments.length})</TabsTrigger>
          <TabsTrigger value="bank">Question bank ({items?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({sessions?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="legacy">Archived / legacy ({legacyAssessments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="mt-4">
          {assessmentsPending ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeAssessments.map((a) => {
                const state = resolveState({
                  status: a.status,
                  archivedAt: a.archived_at,
                  assignedCount: sessionCounts.get(a.id) ?? 0,
                });
                const allowed = actionsFor(state);
                const assignReason = unavailableReason("assign", state);
                return (
                  <Card key={a.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">
                          <Link
                            to="/assessment/$assessmentId"
                            params={{ assessmentId: a.id }}
                            className="hover:underline"
                          >
                            {a.title}
                          </Link>
                        </CardTitle>
                        <Badge
                          variant={
                            state === "published" || state === "assigned" ? "default" : "secondary"
                          }
                        >
                          {STATE_LABELS[state]}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">{a.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Class {a.grade} · {a.subject} · {a.topic} · {itemCounts.get(a.id) ?? 0}{" "}
                        questions
                        {a.time_limit_minutes ? ` · ${a.time_limit_minutes} min` : ""} ·{" "}
                        {sessionCounts.get(a.id) ?? 0} assigned
                      </p>
                      <div className="flex flex-wrap items-start gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/assessment/$assessmentId" params={{ assessmentId: a.id }}>
                            <ClipboardList className="h-3.5 w-3.5" />{" "}
                            {allowed.includes("review")
                              ? ACTION_LABELS.review
                              : ACTION_LABELS.preview}
                          </Link>
                        </Button>
                        {assignReason ? (
                          <DisabledReason reason={assignReason}>
                            <Button size="sm" variant="secondary" disabled>
                              <Send className="h-3.5 w-3.5" /> {ACTION_LABELS.assign}
                            </Button>
                          </DisabledReason>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setAssignFor(a.id);
                              setPickedLearners(new Set());
                            }}
                          >
                            <Send className="h-3.5 w-3.5" /> {ACTION_LABELS.assign}
                          </Button>
                        )}
                        {state === "assigned" ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/assessment/$assessmentId" params={{ assessmentId: a.id }}>
                              {ACTION_LABELS["view-progress"]}
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {activeAssessments.length === 0 && (
                <Card className="md:col-span-2">
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No assessments in the active CBSE Class 10 scope yet — create one to start a
                    draft.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="legacy" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Archived / legacy content</CardTitle>
              <CardDescription>
                Pilot content outside the active CBSE Class 10 scope (for example Grade 6 ·
                Fractions). Retained as evidence, excluded from every creation and assignment flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {legacyAssessments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No legacy assessments.</p>
              ) : (
                legacyAssessments.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Grade {a.grade} · {a.subject} · {a.topic}
                      </p>
                    </div>
                    <Badge variant="outline">Archived / legacy</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="bank" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search questions…"
                className="pl-8"
              />
            </div>
            <Select value={subtopic} onValueChange={setSubtopic}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Subtopic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subtopics</SelectItem>
                {subtopics.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Subtopic</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsPending && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-md">
                      <p className="truncate text-sm">{item.prompt}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.subtopic}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.kind === "mcq" ? "Multiple choice" : "Numeric"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {DIFFICULTY_LABELS[item.difficulty]}
                    </TableCell>
                  </TableRow>
                ))}
                {!itemsPending && filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No questions match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sessions ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link to="/learners/$learnerId" params={{ learnerId: s.learner_id }} className="font-medium hover:underline">
                        {s.learners?.full_name ?? "—"}
                      </Link>
                      <p className="text-xs text-muted-foreground">@{s.learners?.handle}</p>
                    </TableCell>
                    <TableCell className="text-sm">{s.assessments?.title}</TableCell>
                    <TableCell>{sessionStatusBadge(s.status)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {s.score_pct != null ? `${s.score_pct}%` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.due ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.last_activity_at ? new Date(s.last_activity_at).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {(sessions ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No sessions yet — assign an assessment to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!assignFor} onOpenChange={(open) => !open && setAssignFor(null)}>
        <ModalShell aria-describedby={undefined}>
          <ModalHeader
            title="Assign assessment"
            description="Learners will see this on their home screen. Progress saves automatically; they can resume anytime."
          />
          <ModalBody>
            <FormSection title={`Learners (${pickedLearners.size} selected)`}>
              <div className="divide-y rounded-lg border">
                {(learners ?? []).length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No learners available.</p>
                ) : (
                  (learners ?? []).map((learner) => (
                    <label
                      key={learner.id}
                      className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={pickedLearners.has(learner.id)}
                        onCheckedChange={() =>
                          toggle(pickedLearners, learner.id, setPickedLearners)
                        }
                      />
                      <span className="flex-1 text-sm">
                        {learner.full_name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          Class {learner.grade} · @{learner.handle}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </FormSection>
            <FormField id="a-due" label="Due date (optional)">
              <Input
                id="a-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </FormField>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setAssignFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={assignMutation.isPending || pickedLearners.size === 0}
            >
              {assignMutation.isPending
                ? "Assigning…"
                : `Assign to ${pickedLearners.size || ""} learner${pickedLearners.size === 1 ? "" : "s"}`}
            </Button>
          </ModalFooter>
        </ModalShell>
      </Dialog>

    </div>
  );
}
