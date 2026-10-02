import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  FileJson,
  GitBranch,
  Layers,
  Library,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { fmt, Mono } from "@/components/audit-shared";
import {
  BOOK_STATUS_LABELS,
  IMPORT_JSON_EXAMPLE,
  importCurriculumSchema,
  type BookSummary,
  type BookWorkspace,
  type ChapterNode,
  type TopicNode,
  type UnitNode,
} from "@/lib/curriculum-shared";
import {
  addCurriculumNode,
  approveAllOutcomesFn,
  createOutcomeFn,
  deleteCurriculumNode,
  deleteOutcomeFn,
  extractCurriculumFn,
  getBookWorkspace,
  getCurriculumLibrary,
  importCurriculumFn,
  moveCurriculumNode,
  renameCurriculumNode,
  setBookStatusFn,
  updateOutcomeFn,
  uploadBookFileFn,
} from "@/lib/curriculum.functions";
import { friendlyErrorMessage } from "@/lib/user-errors";

export const Route = createFileRoute("/_authenticated/curriculum")({
  validateSearch: (search: Record<string, unknown>) => ({
    book: typeof search["book"] === "string" ? search["book"] : undefined,
    tab: typeof search["tab"] === "string" ? search["tab"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Curriculum — EduOS" },
      {
        name: "description",
        content:
          "Curriculum library, tree viewer, review workspace, learning outcomes, and knowledge graph.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CurriculumPage,
});

const authRoute = getRouteApi("/_authenticated");

function statusBadge(status: string) {
  if (status === "approved")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
        Approved
      </Badge>
    );
  if (status === "processed") return <Badge variant="secondary">In review</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="outline">{BOOK_STATUS_LABELS[status] ?? status}</Badge>;
}

// ---------------------------------------------------------------------------
// Library: Board → Grade → Subject → Book
// ---------------------------------------------------------------------------

function LibraryView({ books, isStaff }: { books: BookSummary[]; isStaff: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const runImport = useServerFn(importCurriculumFn);
  const runUpload = useServerFn(uploadBookFileFn);
  const runExtract = useServerFn(extractCurriculumFn);
  const [importOpen, setImportOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState({ title: "", board: "", grade: "6", subject: "" });
  const [extractingId, setExtractingId] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("title", uploadMeta.title);
      form.set("board", uploadMeta.board);
      form.set("grade", uploadMeta.grade);
      form.set("subject", uploadMeta.subject);
      form.set("file", uploadFile);
      const result = await runUpload({ data: form });
      toast.success(`Uploaded "${uploadMeta.title}" (${result.fileName}). Extract its curriculum next.`);
      setUploadOpen(false);
      setUploadFile(null);
      setUploadMeta({ title: "", board: "", grade: "6", subject: "" });
      await queryClient.invalidateQueries({ queryKey: ["curriculum-library"] });
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "Upload failed."));
    } finally {
      setBusy(false);
    }
  };

  const handleExtract = async (bookId: string) => {
    setExtractingId(bookId);
    try {
      const result = await runExtract({ data: { bookId } });
      toast.success(
        `Extracted ${result.units} units, ${result.chapters} chapters, ${result.topics} topics, ${result.outcomes} outcomes.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["curriculum-library"] });
      navigate({ to: "/curriculum", search: { book: bookId, tab: "review" } });
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "Extraction failed."));
      await queryClient.invalidateQueries({ queryKey: ["curriculum-library"] });
    } finally {
      setExtractingId(null);
    }
  };

  const boards = new Map<string, Map<string, BookSummary[]>>();
  for (const b of books) {
    const board = b.board ?? "Unassigned board";
    const lane = `Grade ${b.grade} · ${b.subject}`;
    if (!boards.has(board)) boards.set(board, new Map());
    const lanes = boards.get(board)!;
    if (!lanes.has(lane)) lanes.set(lane, []);
    lanes.get(lane)!.push(b);
  }

  const handleImport = async () => {
    setBusy(true);
    try {
      const parsed = importCurriculumSchema.parse(JSON.parse(jsonText));
      const result = await runImport({ data: parsed });
      toast.success(
        `Imported "${parsed.title}": ${result.counts["units"]} units, ${result.counts["chapters"]} chapters, ${result.counts["topics"]} topics, ${result.counts["outcomes"]} outcomes.`,
      );
      setImportOpen(false);
      setJsonText("");
      await queryClient.invalidateQueries({ queryKey: ["curriculum-library"] });
      navigate({ to: "/curriculum", search: { book: result.bookId, tab: "review" } });
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "Import failed — check the JSON structure."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Curriculum Library</h2>
          <p className="text-sm text-muted-foreground">
            Board → Grade → Subject → Book. Open a book to review its structure, outcomes, and
            knowledge graph.
          </p>
        </div>
        {isStaff && (
          <div className="flex gap-2">
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" /> Upload book
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileJson className="h-4 w-4" /> Import JSON
            </Button>
          </div>
        )}
      </div>

      {books.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No books in your library yet.{" "}
            {isStaff ? "Upload a book file or import a curriculum JSON to get started." : ""}
          </CardContent>
        </Card>
      )}

      {[...boards.entries()].map(([board, lanes]) => (
        <div key={board} className="space-y-3">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {board}
            </h3>
          </div>
          {[...lanes.entries()].map(([lane, laneBooks]) => (
            <div key={lane} className="space-y-2 pl-6">
              <p className="text-xs font-medium text-muted-foreground">{lane}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {laneBooks.map((b) => (
                  <Card key={b.id} className="transition-colors hover:border-primary/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{b.title}</CardTitle>
                        {statusBadge(b.status)}
                      </div>
                      <CardDescription>
                        {b.fileNames.join(", ") || "Imported"} · added {fmt(b.createdAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <Badge variant="outline">{b.counts.units} units</Badge>
                        <Badge variant="outline">{b.counts.chapters} chapters</Badge>
                        <Badge variant="outline">{b.counts.topics} topics</Badge>
                        <Badge variant="outline">
                          {b.counts.approvedOutcomes}/{b.counts.outcomes} outcomes approved
                        </Badge>
                      </div>
                      {b.status === "failed" && b.processingError && (
                        <p className="text-xs text-destructive">{b.processingError}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            navigate({ to: "/curriculum", search: { book: b.id, tab: "tree" } })
                          }
                        >
                          <BookOpen className="h-4 w-4" /> Open
                        </Button>
                        {isStaff && (b.status === "uploaded" || b.status === "failed") && (
                          <Button
                            size="sm"
                            disabled={extractingId === b.id}
                            onClick={() => void handleExtract(b.id)}
                          >
                            {extractingId === b.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                            {extractingId === b.id ? "Extracting…" : "Extract curriculum"}
                          </Button>
                        )}
                        {b.status === "processing" && (
                          <Button size="sm" disabled>
                            <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload a book</DialogTitle>
            <DialogDescription>
              Upload a PDF, TXT, or Markdown file (up to 15 MB). The file is stored privately for
              your organization; you can then extract its curriculum structure with AI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="book-file">Book file</Label>
              <Input
                id="book-file"
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="book-title">Title</Label>
              <Input
                id="book-title"
                value={uploadMeta.title}
                onChange={(e) => setUploadMeta((m) => ({ ...m, title: e.target.value }))}
                placeholder="e.g. My Book of General Knowledge — Class 3"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="book-board">Board</Label>
                <Input
                  id="book-board"
                  value={uploadMeta.board}
                  onChange={(e) => setUploadMeta((m) => ({ ...m, board: e.target.value }))}
                  placeholder="CBSE"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-grade">Grade</Label>
                <Input
                  id="book-grade"
                  type="number"
                  min={1}
                  max={12}
                  value={uploadMeta.grade}
                  onChange={(e) => setUploadMeta((m) => ({ ...m, grade: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-subject">Subject</Label>
                <Input
                  id="book-subject"
                  value={uploadMeta.subject}
                  onChange={(e) => setUploadMeta((m) => ({ ...m, subject: e.target.value }))}
                  placeholder="Mathematics"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => void handleUpload()}
              disabled={
                busy ||
                !uploadFile ||
                uploadMeta.title.trim().length < 2 ||
                uploadMeta.board.trim().length < 2 ||
                uploadMeta.subject.trim().length < 2
              }
            >
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import curriculum JSON</DialogTitle>
            <DialogDescription>
              Paste a complete book structure: title, board, grade, subject, and units → chapters →
              topics with optional key concepts and learning outcomes. The book lands in review.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={IMPORT_JSON_EXAMPLE}
            className="min-h-64 font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setJsonText(IMPORT_JSON_EXAMPLE)}>
              Insert example
            </Button>
            <Button onClick={() => void handleImport()} disabled={busy || !jsonText.trim()}>
              {busy ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tree viewer (read-only)
// ---------------------------------------------------------------------------

function TreeTab({ workspace }: { workspace: BookWorkspace }) {
  return (
    <div className="space-y-3">
      {workspace.units.map((u) => (
        <Card key={u.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-primary" />
              Unit {u.position} — {u.title}
              <Badge variant="outline" className="ml-1">{u.chapters.length} chapters</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {u.chapters.map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {u.position}.{c.position} {c.title}
                </p>
                <div className="mt-2 space-y-1.5 pl-4">
                  {c.topics.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-center gap-2 text-xs">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span>{t.title}</span>
                      {t.outcomes.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t.outcomes.filter((o) => o.status === "approved").length}/
                          {t.outcomes.length} outcomes
                        </Badge>
                      )}
                    </div>
                  ))}
                  {c.topics.length === 0 && (
                    <p className="text-xs italic text-muted-foreground">No topics</p>
                  )}
                </div>
              </div>
            ))}
            {u.chapters.length === 0 && (
              <p className="text-xs italic text-muted-foreground">No chapters in this unit.</p>
            )}
          </CardContent>
        </Card>
      ))}
      {workspace.units.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            This book has no curriculum structure yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review / edit screen
// ---------------------------------------------------------------------------

type EditState =
  | { mode: "rename"; kind: "unit" | "chapter" | "topic"; id: string; title: string }
  | { mode: "add"; kind: "unit" | "chapter" | "topic"; parentId?: string; title: string }
  | { mode: "delete"; kind: "unit" | "chapter" | "topic"; id: string; title: string }
  | { mode: "move"; kind: "chapter" | "topic"; id: string; title: string }
  | null;

function ReviewTab({ workspace }: { workspace: BookWorkspace }) {
  const queryClient = useQueryClient();
  const renameFn = useServerFn(renameCurriculumNode);
  const addFn = useServerFn(addCurriculumNode);
  const deleteFn = useServerFn(deleteCurriculumNode);
  const moveFn = useServerFn(moveCurriculumNode);
  const [edit, setEdit] = useState<EditState>(null);
  const [text, setText] = useState("");
  const [moveTarget, setMoveTarget] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["curriculum-book", workspace.book.id] });

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      setEdit(null);
      await refresh();
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "Action failed."));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (state: NonNullable<EditState>) => {
    setEdit(state);
    setText("title" in state ? state.title : "");
    setMoveTarget("");
  };

  const chapterParents = workspace.units;
  const topicParents = workspace.units.flatMap((u) =>
    u.chapters.map((c) => ({ id: c.id, title: `${u.title} → ${c.title}` })),
  );

  function NodeActions({
    kind,
    id,
    title,
  }: {
    kind: "unit" | "chapter" | "topic";
    id: string;
    title: string;
  }) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Rename"
          onClick={() => openEdit({ mode: "rename", kind, id, title })}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        {kind !== "unit" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Move"
            onClick={() => openEdit({ mode: "move", kind, id, title })}
          >
            <GitBranch className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          title="Delete"
          onClick={() => openEdit({ mode: "delete", kind, id, title })}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </span>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openEdit({ mode: "add", kind: "unit", title: "" })}
        >
          <Plus className="h-4 w-4" /> Add unit
        </Button>
      </div>

      {workspace.units.map((u) => (
        <Card key={u.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                Unit {u.position} — {u.title}
              </CardTitle>
              <div className="flex items-center gap-1">
                <NodeActions kind="unit" id={u.id} title={u.title} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit({ mode: "add", kind: "chapter", parentId: u.id, title: "" })}
                >
                  <Plus className="h-3.5 w-3.5" /> Chapter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {u.chapters.map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {u.position}.{c.position} {c.title}
                  </p>
                  <div className="flex items-center gap-1">
                    <NodeActions kind="chapter" id={c.id} title={c.title} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openEdit({ mode: "add", kind: "topic", parentId: c.id, title: "" })
                      }
                    >
                      <Plus className="h-3.5 w-3.5" /> Topic
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-1 pl-4">
                  {c.topics.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        {t.title}
                      </span>
                      <NodeActions kind="topic" id={t.id} title={t.title} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Rename / Add dialog */}
      <Dialog
        open={edit?.mode === "rename" || edit?.mode === "add"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit?.mode === "rename" ? `Rename ${edit.kind}` : `Add ${edit?.kind ?? ""}`}
            </DialogTitle>
            {edit?.mode === "delete" ? null : (
              <DialogDescription>
                {edit?.mode === "add" && edit.kind !== "unit"
                  ? "The new node is appended at the end of its parent."
                  : "Titles are stored verbatim and shown in the tree viewer."}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="node-title">Title</Label>
            <Input id="node-title" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              disabled={busy || !text.trim()}
              onClick={() => {
                if (!edit) return;
                if (edit.mode === "rename") {
                  void run(
                    () => renameFn({ data: { kind: edit.kind, id: edit.id, title: text.trim() } }),
                    "Renamed.",
                  );
                } else if (edit.mode === "add") {
                  void run(
                    () =>
                      addFn({
                        data: {
                          kind: edit.kind,
                          bookId: workspace.book.id,
                          parentId: edit.parentId ?? null,
                          title: text.trim(),
                        },
                      }),
                    "Added.",
                  );
                }
              }}
            >
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move dialog */}
      <Dialog open={edit?.mode === "move"} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {edit?.mode === "move" ? edit.kind : ""}</DialogTitle>
            <DialogDescription>
              Choose the new parent for “{edit?.mode === "move" ? edit.title : ""}”.
            </DialogDescription>
          </DialogHeader>
          <Select value={moveTarget} onValueChange={setMoveTarget}>
            <SelectTrigger>
              <SelectValue placeholder="Select new parent" />
            </SelectTrigger>
            <SelectContent>
              {(edit?.mode === "move" && edit.kind === "chapter" ? chapterParents : topicParents).map(
                (p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              disabled={busy || !moveTarget}
              onClick={() => {
                if (edit?.mode !== "move") return;
                void run(
                  () => moveFn({ data: { kind: edit.kind, id: edit.id, parentId: moveTarget } }),
                  "Moved.",
                );
              }}
            >
              {busy ? "Moving…" : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={edit?.mode === "delete"} onOpenChange={(open) => !open && setEdit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {edit?.mode === "delete" ? edit.kind : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              “{edit?.mode === "delete" ? edit.title : ""}” will be removed permanently.
              {edit?.mode === "delete" && edit.kind !== "topic"
                ? " Everything inside it (chapters, topics, outcomes) is deleted too."
                : " Its learning outcomes are deleted too."}{" "}
              The deletion is recorded in the book's processing history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => {
                if (edit?.mode !== "delete") return;
                void run(
                  () => deleteFn({ data: { kind: edit.kind, id: edit.id } }),
                  "Deleted.",
                );
              }}
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Learning outcomes manager
// ---------------------------------------------------------------------------

function OutcomeRow({
  topic,
  isStaff,
  bookId,
}: {
  topic: TopicNode & { path: string };
  isStaff: boolean;
  bookId: string;
}) {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateOutcomeFn);
  const deleteFn = useServerFn(deleteOutcomeFn);
  const createFn = useServerFn(createOutcomeFn);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["curriculum-book", bookId] });

  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
      await refresh();
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "Action failed."));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">{topic.path}</CardTitle>
          {isStaff && (
            <Button variant="outline" size="sm" onClick={() => setAdding((v) => !v)}>
              <Plus className="h-3.5 w-3.5" /> Outcome
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {topic.outcomes.map((o) => (
          <div key={o.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-2.5">
            <div className="min-w-0 flex-1">
              {editingId === o.id ? (
                <div className="flex items-center gap-2">
                  <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="h-8 text-xs" />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      void act(
                        () => updateFn({ data: { outcomeId: o.id, text: editText.trim() } }),
                        "Outcome updated.",
                      );
                      setEditingId(null);
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <p className="text-xs leading-relaxed">{o.text}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {o.status === "approved" ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
                  <CircleCheck className="h-3 w-3" /> Approved
                </Badge>
              ) : (
                <Badge variant="outline">
                  <CircleDashed className="h-3 w-3" /> Suggested
                </Badge>
              )}
              {isStaff && editingId !== o.id && (
                <>
                  {o.status === "suggested" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        void act(
                          () => updateFn({ data: { outcomeId: o.id, status: "approved" } }),
                          "Outcome approved.",
                        )
                      }
                    >
                      Approve
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        void act(
                          () => updateFn({ data: { outcomeId: o.id, status: "suggested" } }),
                          "Moved back to suggested.",
                        )
                      }
                    >
                      Unapprove
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingId(o.id);
                      setEditText(o.text);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() =>
                      void act(() => deleteFn({ data: { outcomeId: o.id } }), "Outcome deleted.")
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {topic.outcomes.length === 0 && !adding && (
          <p className="text-xs italic text-muted-foreground">No outcomes for this topic yet.</p>
        )}
        {adding && isStaff && (
          <div className="flex items-center gap-2">
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Students will be able to…"
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="h-8"
              disabled={newText.trim().length < 3}
              onClick={() => {
                void act(
                  () =>
                    createFn({
                      data: { bookId, topicId: topic.id, text: newText.trim() },
                    }),
                  "Outcome added.",
                );
                setNewText("");
                setAdding(false);
              }}
            >
              Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OutcomesTab({ workspace, isStaff }: { workspace: BookWorkspace; isStaff: boolean }) {
  const queryClient = useQueryClient();
  const approveAll = useServerFn(approveAllOutcomesFn);
  const suggested = workspace.units
    .flatMap((u) => u.chapters)
    .flatMap((c) => c.topics)
    .flatMap((t) => t.outcomes)
    .filter((o) => o.status === "suggested").length;

  const topics = workspace.units.flatMap((u) =>
    u.chapters.flatMap((c) =>
      c.topics.map((t) => ({ ...t, path: `${u.title} → ${c.title} → ${t.title}` })),
    ),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {workspace.book.counts.approvedOutcomes} of {workspace.book.counts.outcomes} outcomes
          approved · {suggested} awaiting review.
        </p>
        {isStaff && suggested > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                const r = await approveAll({ data: { bookId: workspace.book.id } });
                toast.success(`Approved ${r.approved} outcome(s).`);
                await queryClient.invalidateQueries({
                  queryKey: ["curriculum-book", workspace.book.id],
                });
              } catch (error) {
                toast.error(friendlyErrorMessage(error, "Bulk approve failed."));
              }
            }}
          >
            <CheckCheck className="h-4 w-4" /> Approve all suggested
          </Button>
        )}
      </div>
      {topics.map((t) => (
        <OutcomeRow key={t.id} topic={t} isStaff={isStaff} bookId={workspace.book.id} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Knowledge graph viewer
// ---------------------------------------------------------------------------

function GraphTab({ workspace }: { workspace: BookWorkspace }) {
  const { nodes, edges } = workspace.graph;
  const childrenOf = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const e of edges) {
    childrenOf.set(e.parentId, [...(childrenOf.get(e.parentId) ?? []), e.childId]);
    hasParent.add(e.childId);
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots = nodes.filter((n) => !hasParent.has(n.id)).sort((a, b) => a.depth - b.depth);

  function renderNode(id: string, level: number): React.ReactNode {
    const node = byId.get(id);
    if (!node) return null;
    const kids = childrenOf.get(id) ?? [];
    return (
      <div key={id} style={{ marginLeft: level === 0 ? 0 : 20 }}>
        <div className="flex items-center gap-2 py-1">
          <GitBranch className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="text-sm">{node.label}</span>
          <Badge variant="outline" className="text-[10px]">
            depth {node.depth}
          </Badge>
        </div>
        {kids.map((k) => renderNode(k, level + 1))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Concept knowledge graph</CardTitle>
        <CardDescription>
          {nodes.length} concepts · {edges.length} relationships (parent contains child). Extracted
          from the curriculum analysis — e.g. India → States & Capitals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {nodes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No knowledge graph for this book.
          </p>
        ) : (
          <div className="rounded-lg border p-4">{roots.map((r) => renderNode(r.id, 0))}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Processing history
// ---------------------------------------------------------------------------

function HistoryTab({ workspace }: { workspace: BookWorkspace }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Processing history</CardTitle>
        <CardDescription>
          Append-only audit trail — every structural change to this book is recorded and cannot be
          edited or deleted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {workspace.events.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5">
            <div className="flex items-center gap-2">
              <Mono>{e.event}</Mono>
              {Object.keys(e.detail).length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {Object.entries(e.detail)
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(" · ")}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{fmt(e.createdAt)}</span>
          </div>
        ))}
        {workspace.events.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No events recorded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Workspace (selected book)
// ---------------------------------------------------------------------------

function WorkspaceView({ bookId, tab, isStaff }: { bookId: string; tab: string; isStaff: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setStatus = useServerFn(setBookStatusFn);

  const { data, isPending } = useQuery({
    queryKey: ["curriculum-book", bookId],
    queryFn: () => getBookWorkspace({ data: { bookId } }),
  });

  if (isPending || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const activeTab = ["tree", "review", "outcomes", "graph", "history"].includes(tab) ? tab : "tree";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 text-xs"
            onClick={() => navigate({ to: "/curriculum", search: { book: undefined, tab: undefined } })}
          >
            ← Back to library
          </Button>
          <h2 className="text-2xl font-semibold tracking-tight">{data.book.title}</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {data.book.board && <Badge variant="outline">{data.book.board}</Badge>}
            <Badge variant="outline">Grade {data.book.grade}</Badge>
            <Badge variant="outline">{data.book.subject}</Badge>
            {statusBadge(data.book.status)}
          </div>
        </div>
        {isStaff && data.book.status === "processed" && (
          <Button
            onClick={async () => {
              try {
                await setStatus({ data: { bookId, status: "approved" } });
                toast.success("Book approved — ready for assessments.");
                await queryClient.invalidateQueries({ queryKey: ["curriculum-book", bookId] });
                await queryClient.invalidateQueries({ queryKey: ["curriculum-library"] });
              } catch (error) {
                toast.error(friendlyErrorMessage(error, "Approve failed."));
              }
            }}
          >
            <CircleCheck className="h-4 w-4" /> Approve book
          </Button>
        )}
        {isStaff && data.book.status === "approved" && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await setStatus({ data: { bookId, status: "processed" } });
                toast.success("Returned to review.");
                await queryClient.invalidateQueries({ queryKey: ["curriculum-book", bookId] });
                await queryClient.invalidateQueries({ queryKey: ["curriculum-library"] });
              } catch (error) {
                toast.error(friendlyErrorMessage(error, "Action failed."));
              }
            }}
          >
            Return to review
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => navigate({ to: "/curriculum", search: { book: bookId, tab: v } })}
      >
        <TabsList>
          <TabsTrigger value="tree">Tree</TabsTrigger>
          {isStaff && <TabsTrigger value="review">Review & edit</TabsTrigger>}
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="graph">Knowledge graph</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="tree" className="mt-4">
          <TreeTab workspace={data} />
        </TabsContent>
        {isStaff && (
          <TabsContent value="review" className="mt-4">
            <ReviewTab workspace={data} />
          </TabsContent>
        )}
        <TabsContent value="outcomes" className="mt-4">
          <OutcomesTab workspace={data} isStaff={isStaff} />
        </TabsContent>
        <TabsContent value="graph" className="mt-4">
          <GraphTab workspace={data} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab workspace={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function CurriculumPage() {
  const { role } = authRoute.useRouteContext();
  const { book, tab } = Route.useSearch();
  const isStaff = role === "admin" || role === "educator";

  const { data: library, isPending } = useQuery({
    queryKey: ["curriculum-library"],
    queryFn: () => getCurriculumLibrary(),
  });

  if (book) {
    return (
      <div className="mx-auto max-w-5xl">
        <WorkspaceView bookId={book} tab={tab ?? "tree"} isStaff={isStaff} />
      </div>
    );
  }

  if (isPending || !library) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <LibraryView books={library} isStaff={isStaff} />
    </div>
  );
}
