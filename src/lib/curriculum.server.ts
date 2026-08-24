// Sprint 6B: server-only helpers for the curriculum engine. Every read/write
// runs through the caller's RLS-scoped client, so org isolation and the
// staff/reviewer role split are enforced by database policies, not app code.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  BookEventRow,
  BookSummary,
  BookWorkspace,
  ChapterNode,
  EventDetail,
  ImportCurriculumInput,
  NodeKind,
  OutcomeNode,
  TopicNode,
  UnitNode,
} from "./curriculum-shared";

type Client = SupabaseClient<Database>;

const TABLE_BY_KIND = {
  unit: "curriculum_units",
  chapter: "curriculum_chapters",
  topic: "curriculum_topics",
} as const;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

function mapBook(row: Database["public"]["Tables"]["books"]["Row"], counts: BookSummary["counts"]): BookSummary {
  return {
    id: row.id,
    title: row.title,
    board: row.board,
    grade: row.grade,
    subject: row.subject,
    status: row.status,
    fileNames: row.file_names,
    fileSizeBytes: Number(row.file_size_bytes),
    processedAt: row.processed_at,
    createdAt: row.created_at,
    counts,
  };
}

async function countFor(client: Client, table: string, bookId: string): Promise<number> {
  const { count } = await (client as SupabaseClient)
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId);
  return count ?? 0;
}

export async function fetchLibrary(supabase: Client): Promise<BookSummary[]> {
  const { data: books, error } = await supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return Promise.all(
    (books ?? []).map(async (b) => {
      const [units, chapters, topics, outcomes, approvedOutcomes] = await Promise.all([
        countFor(supabase, "curriculum_units", b.id),
        countFor(supabase, "curriculum_chapters", b.id),
        countFor(supabase, "curriculum_topics", b.id),
        countFor(supabase, "curriculum_outcomes", b.id),
        (async () => {
          const { count } = await supabase
            .from("curriculum_outcomes")
            .select("id", { count: "exact", head: true })
            .eq("book_id", b.id)
            .eq("status", "approved");
          return count ?? 0;
        })(),
      ]);
      return mapBook(b, { units, chapters, topics, outcomes, approvedOutcomes });
    }),
  );
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export async function fetchBookWorkspace(supabase: Client, bookId: string): Promise<BookWorkspace> {
  const [bookRes, unitsRes, chaptersRes, topicsRes, outcomesRes, nodesRes, edgesRes, eventsRes] =
    await Promise.all([
      supabase.from("books").select("*").eq("id", bookId).maybeSingle(),
      supabase.from("curriculum_units").select("*").eq("book_id", bookId).order("position"),
      supabase.from("curriculum_chapters").select("*").eq("book_id", bookId).order("position"),
      supabase.from("curriculum_topics").select("*").eq("book_id", bookId).order("position"),
      supabase.from("curriculum_outcomes").select("*").eq("book_id", bookId).order("position"),
      supabase.from("concept_nodes").select("*").eq("book_id", bookId),
      supabase.from("concept_edges").select("*").eq("book_id", bookId),
      supabase
        .from("book_events")
        .select("id, event, detail, created_at")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (bookRes.error) throw new Error(bookRes.error.message);
  if (!bookRes.data) throw new Error("Book not found in your organization.");
  for (const r of [unitsRes, chaptersRes, topicsRes, outcomesRes, nodesRes, edgesRes, eventsRes]) {
    if (r.error) throw new Error(r.error.message);
  }

  const outcomesByTopic = new Map<string, OutcomeNode[]>();
  for (const o of outcomesRes.data ?? []) {
    const list = outcomesByTopic.get(o.topic_id) ?? [];
    list.push({ id: o.id, text: o.text, status: o.status as OutcomeNode["status"], position: o.position });
    outcomesByTopic.set(o.topic_id, list);
  }

  const topicsByChapter = new Map<string, TopicNode[]>();
  for (const t of topicsRes.data ?? []) {
    const list = topicsByChapter.get(t.chapter_id) ?? [];
    list.push({
      id: t.id,
      title: t.title,
      position: t.position,
      keyConcepts: asStringArray(t.key_concepts),
      outcomes: outcomesByTopic.get(t.id) ?? [],
    });
    topicsByChapter.set(t.chapter_id, list);
  }

  const units: UnitNode[] = (unitsRes.data ?? []).map((u) => ({
    id: u.id,
    title: u.title,
    position: u.position,
    chapters: (chaptersRes.data ?? [])
      .filter((c) => c.unit_id === u.id)
      .map(
        (c): ChapterNode => ({
          id: c.id,
          title: c.title,
          position: c.position,
          topics: topicsByChapter.get(c.id) ?? [],
        }),
      ),
  }));

  const counts = {
    units: units.length,
    chapters: chaptersRes.data?.length ?? 0,
    topics: topicsRes.data?.length ?? 0,
    outcomes: outcomesRes.data?.length ?? 0,
    approvedOutcomes: (outcomesRes.data ?? []).filter((o) => o.status === "approved").length,
  };

  return {
    book: mapBook(bookRes.data, counts),
    units,
    graph: {
      nodes: (nodesRes.data ?? []).map((n) => ({ id: n.id, label: n.label, depth: n.depth })),
      edges: (edgesRes.data ?? []).map((e) => ({
        id: e.id,
        parentId: e.parent_id,
        childId: e.child_id,
        relation: e.relation,
      })),
    },
    events: (eventsRes.data ?? []).map(
      (e): BookEventRow => ({
        id: e.id,
        event: e.event,
        detail: (e.detail ?? {}) as EventDetail,
        createdAt: e.created_at,
      }),
    ),
  };
}

// ---------------------------------------------------------------------------
// Event log (append-only audit trail per book)
// ---------------------------------------------------------------------------

async function logEvent(
  supabase: Client,
  input: { orgId: string; bookId: string; actorId: string; event: string; detail?: EventDetail },
): Promise<void> {
  await supabase.from("book_events").insert({
    org_id: input.orgId,
    book_id: input.bookId,
    actor_id: input.actorId,
    event: input.event,
    detail: input.detail ?? {},
  });
}

// ---------------------------------------------------------------------------
// Tree edits (staff only — enforced by RLS + requireAnyRole in the wrapper)
// ---------------------------------------------------------------------------

async function nextPosition(supabase: Client, kind: NodeKind, bookId: string, parentId?: string | null): Promise<number> {
  const table = TABLE_BY_KIND[kind];
  let q = (supabase as SupabaseClient).from(table).select("position").eq("book_id", bookId);
  if (kind === "chapter" && parentId) q = q.eq("unit_id", parentId);
  if (kind === "topic" && parentId) q = q.eq("chapter_id", parentId);
  const { data } = await q.order("position", { ascending: false }).limit(1);
  return ((data?.[0] as { position: number } | undefined)?.position ?? 0) + 1;
}

export async function renameNode(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: { kind: NodeKind; id: string; title: string },
): Promise<void> {
  const table = TABLE_BY_KIND[input.kind];
  const { data: row, error } = await (supabase as SupabaseClient)
    .from(table)
    .update({ title: input.title })
    .eq("id", input.id)
    .select("book_id")
    .single();
  if (error) throw new Error(error.message);
  await logEvent(supabase, {
    orgId: ctx.orgId,
    bookId: (row as { book_id: string }).book_id,
    actorId: ctx.userId,
    event: `${input.kind}_renamed`,
    detail: { id: input.id, title: input.title },
  });
}

export async function moveNode(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: { kind: "chapter" | "topic"; id: string; parentId: string },
): Promise<void> {
  const table = TABLE_BY_KIND[input.kind];
  const parentColumn = input.kind === "chapter" ? "unit_id" : "chapter_id";

  // Verify the new parent is visible to the caller (RLS scopes to own org).
  const parentTable = input.kind === "chapter" ? "curriculum_units" : "curriculum_chapters";
  const { data: parent } = await (supabase as SupabaseClient)
    .from(parentTable)
    .select("id, book_id")
    .eq("id", input.parentId)
    .maybeSingle();
  if (!parent) throw new Error("Target parent not found in your organization.");

  const { data: row, error } = await (supabase as SupabaseClient)
    .from(table)
    .update({ [parentColumn]: input.parentId })
    .eq("id", input.id)
    .select("book_id")
    .single();
  if (error) throw new Error(error.message);
  if ((row as { book_id: string }).book_id !== (parent as { book_id: string }).book_id) {
    throw new Error("Cannot move nodes across books.");
  }
  await logEvent(supabase, {
    orgId: ctx.orgId,
    bookId: (row as { book_id: string }).book_id,
    actorId: ctx.userId,
    event: `${input.kind}_moved`,
    detail: { id: input.id, parentId: input.parentId },
  });
}

export async function addNode(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: { kind: NodeKind; bookId: string; parentId?: string | null; title: string },
): Promise<void> {
  if (input.kind !== "unit" && !input.parentId) {
    throw new Error("A parent is required for chapters and topics.");
  }
  const position = await nextPosition(supabase, input.kind, input.bookId, input.parentId);
  const base = { org_id: ctx.orgId, book_id: input.bookId, title: input.title, position };
  const payload =
    input.kind === "unit"
      ? base
      : input.kind === "chapter"
        ? { ...base, unit_id: input.parentId! }
        : { ...base, chapter_id: input.parentId!, key_concepts: [], learning_outcomes: [], question_opportunities: [] };

  const { error } = await (supabase as SupabaseClient).from(TABLE_BY_KIND[input.kind]).insert(payload);
  if (error) throw new Error(error.message);
  await logEvent(supabase, {
    orgId: ctx.orgId,
    bookId: input.bookId,
    actorId: ctx.userId,
    event: `${input.kind}_added`,
    detail: { title: input.title },
  });
}

export async function deleteNode(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: { kind: NodeKind; id: string },
): Promise<void> {
  const table = TABLE_BY_KIND[input.kind];
  const { data: row, error: readError } = await (supabase as SupabaseClient)
    .from(table)
    .select("book_id, title")
    .eq("id", input.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!row) throw new Error("Node not found in your organization.");

  // Children (chapters, topics, outcomes) are removed by ON DELETE CASCADE.
  const { error } = await (supabase as SupabaseClient).from(table).delete().eq("id", input.id);
  if (error) throw new Error(error.message);
  await logEvent(supabase, {
    orgId: ctx.orgId,
    bookId: (row as { book_id: string }).book_id,
    actorId: ctx.userId,
    event: `${input.kind}_deleted`,
    detail: { id: input.id, title: (row as { title: string }).title },
  });
}

// ---------------------------------------------------------------------------
// Learning outcomes
// ---------------------------------------------------------------------------

export async function createOutcome(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: { bookId: string; topicId: string; text: string },
): Promise<void> {
  const { data: max } = await supabase
    .from("curriculum_outcomes")
    .select("position")
    .eq("topic_id", input.topicId)
    .order("position", { ascending: false })
    .limit(1);
  const { error } = await supabase.from("curriculum_outcomes").insert({
    org_id: ctx.orgId,
    book_id: input.bookId,
    topic_id: input.topicId,
    text: input.text,
    position: (max?.[0]?.position ?? 0) + 1,
    status: "suggested",
  });
  if (error) throw new Error(error.message);
  await logEvent(supabase, {
    orgId: ctx.orgId,
    bookId: input.bookId,
    actorId: ctx.userId,
    event: "outcome_added",
    detail: { topicId: input.topicId },
  });
}

export async function updateOutcome(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: { outcomeId: string; text?: string; status?: "suggested" | "approved" },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.text !== undefined) patch.text = input.text;
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length === 0) return;

  const { data: row, error } = await supabase
    .from("curriculum_outcomes")
    .update(patch)
    .eq("id", input.outcomeId)
    .select("book_id")
    .single();
  if (error) throw new Error(error.message);
  await logEvent(supabase, {
    orgId: ctx.orgId,
    bookId: row.book_id,
    actorId: ctx.userId,
    event: input.status === "approved" ? "outcome_approved" : "outcome_updated",
    detail: { outcomeId: input.outcomeId, ...patch },
  });
}

export async function deleteOutcome(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  outcomeId: string,
): Promise<void> {
  const { data: row, error: readError } = await supabase
    .from("curriculum_outcomes")
    .select("book_id")
    .eq("id", outcomeId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!row) throw new Error("Outcome not found in your organization.");
  const { error } = await supabase.from("curriculum_outcomes").delete().eq("id", outcomeId);
  if (error) throw new Error(error.message);
  await logEvent(supabase, {
    orgId: ctx.orgId,
    bookId: row.book_id,
    actorId: ctx.userId,
    event: "outcome_deleted",
    detail: { outcomeId },
  });
}

export async function approveAllOutcomes(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  bookId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("curriculum_outcomes")
    .update({ status: "approved" })
    .eq("book_id", bookId)
    .eq("status", "suggested")
    .select("id");
  if (error) throw new Error(error.message);
  const count = data?.length ?? 0;
  if (count > 0) {
    await logEvent(supabase, {
      orgId: ctx.orgId,
      bookId,
      actorId: ctx.userId,
      event: "outcomes_approved_bulk",
      detail: { count },
    });
  }
  return count;
}

// ---------------------------------------------------------------------------
// Book lifecycle + JSON import
// ---------------------------------------------------------------------------

export async function setBookStatus(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: { bookId: string; status: "processed" | "approved" },
): Promise<void> {
  const { error } = await supabase
    .from("books")
    .update({ status: input.status, processed_at: new Date().toISOString() })
    .eq("id", input.bookId);
  if (error) throw new Error(error.message);
  await logEvent(supabase, {
    orgId: ctx.orgId,
    bookId: input.bookId,
    actorId: ctx.userId,
    event: input.status === "approved" ? "approved" : "returned_to_review",
    detail: {},
  });
}

export async function importCurriculum(
  supabase: Client,
  ctx: { orgId: string; userId: string },
  input: ImportCurriculumInput,
): Promise<{ bookId: string; counts: Record<string, number> }> {
  const { data: book, error: bookError } = await supabase
    .from("books")
    .insert({
      org_id: ctx.orgId,
      uploaded_by: ctx.userId,
      title: input.title,
      board: input.board,
      grade: input.grade,
      subject: input.subject,
      file_names: ["import.json"],
      storage_paths: [],
      mime_types: ["application/json"],
      file_size_bytes: JSON.stringify(input).length,
      status: "processed",
      processed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (bookError) throw new Error(bookError.message);
  const bookId = book.id;

  let chapterCount = 0;
  let topicCount = 0;
  let outcomeCount = 0;

  for (const [ui, unit] of input.units.entries()) {
    const { data: u, error } = await supabase
      .from("curriculum_units")
      .insert({ org_id: ctx.orgId, book_id: bookId, title: unit.title, position: ui + 1 })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    for (const [ci, chapter] of unit.chapters.entries()) {
      const { data: c, error: cError } = await supabase
        .from("curriculum_chapters")
        .insert({ org_id: ctx.orgId, book_id: bookId, unit_id: u.id, title: chapter.title, position: ci + 1 })
        .select("id")
        .single();
      if (cError) throw new Error(cError.message);
      chapterCount++;

      for (const [ti, topic] of chapter.topics.entries()) {
        const { data: t, error: tError } = await supabase
          .from("curriculum_topics")
          .insert({
            org_id: ctx.orgId,
            book_id: bookId,
            chapter_id: c.id,
            title: topic.title,
            position: ti + 1,
            key_concepts: topic.keyConcepts ?? [],
            learning_outcomes: topic.outcomes ?? [],
            question_opportunities: [],
          })
          .select("id")
          .single();
        if (tError) throw new Error(tError.message);
        topicCount++;

        const outcomeRows = (topic.outcomes ?? []).map((text, oi) => ({
          org_id: ctx.orgId,
          book_id: bookId,
          topic_id: t.id,
          text,
          position: oi + 1,
          status: "suggested",
        }));
        if (outcomeRows.length > 0) {
          const { error: oError } = await supabase.from("curriculum_outcomes").insert(outcomeRows);
          if (oError) throw new Error(oError.message);
          outcomeCount += outcomeRows.length;
        }
      }
    }
  }

  await logEvent(supabase, {
    orgId: ctx.orgId,
    bookId,
    actorId: ctx.userId,
    event: "uploaded",
    detail: { file: "import.json", format: "json" },
  });
  await logEvent(supabase, {
    orgId: ctx.orgId,
    bookId,
    actorId: ctx.userId,
    event: "imported",
    detail: {
      source: "JSON import",
      units: input.units.length,
      chapters: chapterCount,
      topics: topicCount,
      outcomes: outcomeCount,
    },
  });

  return {
    bookId,
    counts: { units: input.units.length, chapters: chapterCount, topics: topicCount, outcomes: outcomeCount },
  };
}
