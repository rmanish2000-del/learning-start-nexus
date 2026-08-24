import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  ArrowRight,
  Crosshair,
  Gauge,
  GitBranch,
  Layers,
  ListChecks,
  Pencil,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mono } from "@/components/audit-shared";
import {
  BLOOM_LABELS,
  DIFFICULTY_LABELS,
  MASTERY_FORMULA,
  type AssessmentOutcomeDto,
  type BlueprintWorkspace,
  type MasteryLevelDto,
} from "@/lib/blueprint-shared";
import {
  getBlueprintWorkspace,
  getLearnerOptions,
  getMasteryLevels,
  getMasteryPreview,
  updateMasteryLevelFn,
} from "@/lib/blueprint.functions";
import { getCurriculumLibrary } from "@/lib/curriculum.functions";

export const Route = createFileRoute("/_authenticated/assessment-blueprint")({
  validateSearch: (search: Record<string, unknown>) => ({
    book: typeof search["book"] === "string" ? search["book"] : undefined,
    tab: typeof search["tab"] === "string" ? search["tab"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Assessment Blueprint — EduOS" },
      {
        name: "description",
        content:
          "Assessment blueprint engine: outcome catalog, diagnostic weights, curriculum mapping, intervention mapping, and the mastery framework.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentBlueprintPage,
});

const authRoute = getRouteApi("/_authenticated");

const LEVEL_STYLES: Record<string, string> = {
  destructive: "bg-destructive/10 text-destructive",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function LevelBadge({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${LEVEL_STYLES[color ?? ""] ?? "bg-muted text-muted-foreground"}`}
    >
      {label}
    </span>
  );
}

function WeightBar({ weight }: { weight: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, weight)}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums">{weight}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blueprint tab: Unit → Outcome → Weight → Question Types → Intervention
// ---------------------------------------------------------------------------

function OutcomeCard({ outcome }: { outcome: AssessmentOutcomeDto }) {
  return (
    <div className="rounded-lg border p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Mono>{outcome.code}</Mono>
          <span className="text-sm font-medium">{outcome.title}</span>
        </div>
        <WeightBar weight={outcome.diagnosticWeight} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <Badge variant="outline">{BLOOM_LABELS[outcome.bloomLevel] ?? outcome.bloomLevel}</Badge>
        <Badge variant="outline">
          {DIFFICULTY_LABELS[outcome.difficulty] ?? `Level ${outcome.difficulty}`}
        </Badge>
        <Badge variant="secondary">{outcome.category}</Badge>
        {outcome.questionTypes.map((qt) => (
          <Badge key={qt} variant="outline" className="font-normal">
            {qt}
          </Badge>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Intervention strategy: </span>
        {outcome.interventionStrategy}
      </p>
      {outcome.interventions.length > 0 && (
        <div className="mt-2 space-y-1 border-l-2 border-primary/30 pl-3">
          {outcome.interventions.map((im) => (
            <p key={im.id} className="text-xs text-muted-foreground">
              <span className="text-foreground">{im.failurePattern}</span>
              <ArrowRight className="mx-1 inline h-3 w-3" />
              {im.recommendedIntervention}
            </p>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {outcome.mappings.length} curriculum outcome{outcome.mappings.length === 1 ? "" : "s"} mapped
      </p>
    </div>
  );
}

function BlueprintTab({ workspace }: { workspace: BlueprintWorkspace }) {
  return (
    <div className="space-y-4">
      {workspace.units.map((unit) => (
        <Card key={unit.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-primary" />
                Unit {unit.position} — {unit.title}
              </CardTitle>
              <Badge variant={unit.weightSum === 100 ? "secondary" : "destructive"}>
                Σ weight {unit.weightSum}/100
              </Badge>
            </div>
            <CardDescription>
              {unit.outcomes.length} assessment outcome{unit.outcomes.length === 1 ? "" : "s"} ·
              weight · question types · intervention strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {unit.outcomes.map((o) => (
              <OutcomeCard key={o.id} outcome={o} />
            ))}
            {unit.outcomes.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No assessment outcomes for this unit yet.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Outcome catalog tab
// ---------------------------------------------------------------------------

function CatalogTab({ workspace }: { workspace: BlueprintWorkspace }) {
  const rows = workspace.units.flatMap((u) =>
    u.outcomes.map((o) => ({ unit: u.title, ...o })),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4 text-primary" />
          Outcome catalog — {rows.length} outcomes
        </CardTitle>
        <CardDescription>
          Every assessment outcome with its Bloom level, difficulty, diagnostic weight, and
          intervention strategy.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Bloom</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Question types</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Mono>{o.code}</Mono>
                </TableCell>
                <TableCell className="max-w-64 text-xs">{o.title}</TableCell>
                <TableCell className="text-xs">{o.unit}</TableCell>
                <TableCell className="text-xs">{BLOOM_LABELS[o.bloomLevel] ?? o.bloomLevel}</TableCell>
                <TableCell className="text-xs">{DIFFICULTY_LABELS[o.difficulty] ?? o.difficulty}</TableCell>
                <TableCell>
                  <WeightBar weight={o.diagnosticWeight} />
                </TableCell>
                <TableCell className="max-w-48 text-xs text-muted-foreground">
                  {o.questionTypes.join(", ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Curriculum mapping tab: Topic → Learning Outcome → Assessment Outcome
// ---------------------------------------------------------------------------

function MappingTab({ workspace }: { workspace: BlueprintWorkspace }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-primary" />
            Curriculum mapping — Topic → Learning Outcome → Assessment Outcome
          </CardTitle>
          <CardDescription>
            {workspace.totals.mappings} learning outcomes are bridged to assessment outcomes. Each
            row shows the topic context, the learning outcome text, and the assessment outcome it
            feeds.
          </CardDescription>
        </CardHeader>
      </Card>
      {workspace.units.map((unit) => (
        <Card key={unit.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Unit {unit.position} — {unit.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unit.outcomes.map((o) => (
              <div key={o.id} className="rounded-lg border">
                <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <Mono>{o.code}</Mono>
                  <span className="text-xs font-medium">{o.title}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    weight {o.diagnosticWeight}%
                  </span>
                </div>
                <div className="divide-y">
                  {o.mappings.map((m) => (
                    <div key={m.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">
                        {m.chapterTitle} · <span className="text-foreground">{m.topicTitle}</span>
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">{m.learningOutcomeText}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <Mono>{o.code}</Mono>
                      <Badge variant={m.learningOutcomeStatus === "approved" ? "secondary" : "outline"} className="text-[10px]">
                        {m.learningOutcomeStatus}
                      </Badge>
                    </div>
                  ))}
                  {o.mappings.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No mappings yet.</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mastery preview tab (staff only)
// ---------------------------------------------------------------------------

function PreviewTab({ workspace }: { workspace: BlueprintWorkspace }) {
  const [learnerId, setLearnerId] = useState<string>("");

  const { data: learners, isPending: learnersPending } = useQuery({
    queryKey: ["blueprint-learners"],
    queryFn: () => getLearnerOptions(),
  });

  const { data: preview, isFetching } = useQuery({
    queryKey: ["mastery-preview", workspace.book.id, learnerId],
    enabled: learnerId.length > 0,
    queryFn: () => getMasteryPreview({ data: { bookId: workspace.book.id, learnerId } }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-primary" />
            Mastery engine preview
          </CardTitle>
          <CardDescription>
            Projected mastery for a learner against this book's blueprint. Preview only — nothing is
            written and no reassignment happens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm space-y-1.5">
            <Label>Learner</Label>
            <Select value={learnerId} onValueChange={setLearnerId} disabled={learnersPending}>
              <SelectTrigger>
                <SelectValue placeholder={learnersPending ? "Loading learners…" : "Pick a learner"} />
              </SelectTrigger>
              <SelectContent>
                {(learners ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.fullName} — Grade {l.grade} {l.subject} (mastery {l.masteryScore}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Projection formula (deterministic)
            </p>
            <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
              {MASTERY_FORMULA.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>

          {learnerId && isFetching && <Skeleton className="h-40 w-full" />}

          {preview && !isFetching && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Prior mastery</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{preview.priorMastery}%</p>
                  <p className="text-xs text-muted-foreground">{preview.learner.fullName}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Evidence ({preview.bookSubject})
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {preview.evidenceScore !== null ? `${preview.evidenceScore}%` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {preview.evidenceLabel ?? "No scored evidence in this subject yet"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Projected overall
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">
                    {preview.overall}%
                    {preview.overallLevel && (
                      <LevelBadge label={preview.overallLevel.label} color={preview.overallLevel.color} />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {preview.basis === "prior_only" ? "Prior only — no evidence" : "Blended 50/50 prior + evidence"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Evidence</TableHead>
                      <TableHead>Projected</TableHead>
                      <TableHead>Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((r) => (
                      <TableRow key={r.outcomeId}>
                        <TableCell className="text-xs">{r.unitTitle}</TableCell>
                        <TableCell className="text-xs">
                          <Mono>{r.code}</Mono>
                          <span className="block max-w-56 truncate text-muted-foreground">{r.title}</span>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">{r.weight}%</TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {r.evidenceScore !== null ? `${r.evidenceScore}%` : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-medium tabular-nums">{r.projectedScore}%</TableCell>
                        <TableCell className="text-xs">{r.projectedLevel}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {!learnerId && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Pick a learner to see the projected mastery calculation.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mastery framework tab (bands; admin-configurable)
// ---------------------------------------------------------------------------

function FrameworkTab({ levels, isAdmin }: { levels: MasteryLevelDto[]; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const runUpdate = useServerFn(updateMasteryLevelFn);
  const [editing, setEditing] = useState<MasteryLevelDto | null>(null);
  const [minScore, setMinScore] = useState("0");
  const [maxScore, setMaxScore] = useState("100");
  const [saving, setSaving] = useState(false);

  const openEdit = (level: MasteryLevelDto) => {
    setEditing(level);
    setMinScore(String(level.minScore));
    setMaxScore(String(level.maxScore));
  };

  const handleSave = async () => {
    if (!editing) return;
    const min = Number(minScore);
    const max = Number(maxScore);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > 100 || min > max) {
      toast.error("Enter whole numbers 0–100 with min not exceeding max.");
      return;
    }
    setSaving(true);
    try {
      await runUpdate({ data: { levelId: editing.id, minScore: min, maxScore: max } });
      toast.success(`"${editing.label}" band updated to ${min}–${max}.`);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["mastery-levels"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Mastery framework
        </CardTitle>
        <CardDescription>
          The score bands every projection lands in. Stored per organization and configurable by
          admins; contiguous from 0 to 100.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {levels.map((l) => (
            <div
              key={l.id}
              title={`${l.label} ${l.minScore}–${l.maxScore}`}
              className={
                l.color === "destructive"
                  ? "bg-destructive/70"
                  : l.color === "amber"
                    ? "bg-amber-500/70"
                    : l.color === "emerald"
                      ? "bg-emerald-500/70"
                      : "bg-primary/70"
              }
              style={{ width: `${l.maxScore - l.minScore + 1}%` }}
            />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {levels.map((l) => (
            <div key={l.id} className="rounded-lg border p-3.5">
              <div className="flex items-center justify-between gap-2">
                <LevelBadge label={l.label} color={l.color} />
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}>
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Edit {l.label}</span>
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xl font-semibold tabular-nums">
                {l.minScore}–{l.maxScore}
              </p>
              <p className="text-xs text-muted-foreground">score range</p>
            </div>
          ))}
        </div>
        {!isAdmin && (
          <p className="text-xs text-muted-foreground">
            Only admins can adjust the bands; your role has read access.
          </p>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit band — {editing?.label}</DialogTitle>
            <DialogDescription>
              Adjust the score range for this band. Keep the four bands contiguous from 0 to 100.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="band-min">Min score</Label>
              <Input
                id="band-min"
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="band-max">Max score</Label>
              <Input
                id="band-max"
                type="number"
                min={0}
                max={100}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save band"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AssessmentBlueprintPage() {
  const { role } = authRoute.useRouteContext();
  const search = Route.useSearch();
  const isStaff = role === "admin" || role === "educator";
  const [tab, setTab] = useState(search.tab ?? "blueprint");

  const { data: library, isPending: libraryPending } = useQuery({
    queryKey: ["curriculum-library"],
    queryFn: () => getCurriculumLibrary(),
  });

  const books = library ?? [];
  const bookId = search.book ?? books[0]?.id;

  const { data: workspace, isPending: workspacePending } = useQuery({
    queryKey: ["blueprint-workspace", bookId],
    enabled: !!bookId,
    queryFn: () => getBlueprintWorkspace({ data: { bookId: bookId! } }),
  });

  const { data: levels } = useQuery({
    queryKey: ["mastery-levels"],
    queryFn: () => getMasteryLevels(),
  });

  if (libraryPending) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Crosshair className="h-6 w-6 text-primary" />
            Assessment Blueprint
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Curriculum → Outcomes → Blueprint → Mastery framework. Diagnostic weights, intervention
            strategies, and projected mastery — no question generation yet.
          </p>
        </div>
        <div className="w-64">
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={books.find((b) => b.id === bookId)?.title ?? "Book"} />
            </SelectTrigger>
            <SelectContent>
              {books.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {workspacePending || !workspace ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xl" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
            <TabsTrigger value="catalog">Outcome catalog</TabsTrigger>
            <TabsTrigger value="mapping">Curriculum mapping</TabsTrigger>
            {isStaff && <TabsTrigger value="preview">Mastery preview</TabsTrigger>}
            <TabsTrigger value="framework">Mastery framework</TabsTrigger>
          </TabsList>
          <TabsContent value="blueprint" className="mt-4">
            <BlueprintTab workspace={workspace} />
          </TabsContent>
          <TabsContent value="catalog" className="mt-4">
            <CatalogTab workspace={workspace} />
          </TabsContent>
          <TabsContent value="mapping" className="mt-4">
            <MappingTab workspace={workspace} />
          </TabsContent>
          {isStaff && (
            <TabsContent value="preview" className="mt-4">
              <PreviewTab workspace={workspace} />
            </TabsContent>
          )}
          <TabsContent value="framework" className="mt-4">
            <FrameworkTab levels={levels ?? []} isAdmin={role === "admin"} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
