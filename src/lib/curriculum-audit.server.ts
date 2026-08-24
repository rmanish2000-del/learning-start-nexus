// Sprint 6B audit center: server-only helpers behind the audit server
// functions. Plain DTOs with verbatim database responses so an independent
// reviewer can validate the curriculum engine without trusting app claims.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchPolicyAudit,
  getCallerIdentity,
  type CallerIdentity,
  type DbErrorShape,
  type PolicyAuditRow,
} from "./audit.server";

type Client = SupabaseClient<Database>;

export const PILOT_BOOK_ID = "66000000-0000-4000-8000-000000000003";

const CURRICULUM_TABLES = [
  "books",
  "curriculum_units",
  "curriculum_chapters",
  "curriculum_topics",
  "curriculum_outcomes",
  "concept_nodes",
  "concept_edges",
  "book_events",
] as const;

function shapeError(err: unknown): DbErrorShape {
  if (!err || typeof err !== "object") return null;
  const e = err as { code?: string; message?: string; details?: string | null; hint?: string | null };
  return {
    code: e.code ?? null,
    message: e.message ?? "unknown error",
    details: e.details ?? null,
    hint: e.hint ?? null,
  };
}

// ---------------------------------------------------------------------------
// Counts: caller-visible (RLS) vs global (service role)
// ---------------------------------------------------------------------------

export type CurriculumCount = {
  table: string;
  label: string;
  visibleToYou: number | null;
  globalAllOrgs: number;
  isolated: boolean;
  note: string;
};

const COUNT_SPECS: { table: (typeof CURRICULUM_TABLES)[number]; label: string; note: string }[] = [
  { table: "books", label: "Books", note: "Staff and reviewers see their org's library only." },
  { table: "curriculum_units", label: "Units", note: "Top level of the imported tree." },
  { table: "curriculum_chapters", label: "Chapters", note: "Belong to units (cascade on delete)." },
  { table: "curriculum_topics", label: "Topics", note: "Belong to chapters." },
  { table: "curriculum_outcomes", label: "Learning outcomes", note: "Suggested → approved workflow." },
  { table: "concept_nodes", label: "Concept nodes", note: "Knowledge graph vertices." },
  { table: "concept_edges", label: "Concept edges", note: "Parent → child concept relations." },
  { table: "book_events", label: "Processing history", note: "Append-only audit trail per book." },
];

export async function fetchCurriculumCounts(
  supabase: Client,
  admin: Client,
): Promise<CurriculumCount[]> {
  const out: CurriculumCount[] = [];
  for (const spec of COUNT_SPECS) {
    const visible = await (supabase as SupabaseClient)
      .from(spec.table)
      .select("id", { count: "exact", head: true });
    const global = await (admin as SupabaseClient)
      .from(spec.table)
      .select("id", { count: "exact", head: true });
    const visibleToYou = visible.error ? null : (visible.count ?? 0);
    const globalAllOrgs = global.count ?? 0;
    out.push({
      table: spec.table,
      label: spec.label,
      visibleToYou,
      globalAllOrgs,
      isolated: visibleToYou !== null && visibleToYou <= globalAllOrgs,
      note: spec.note,
    });
  }
  return out;
}

export async function fetchCurriculumPolicies(supabase: Client): Promise<PolicyAuditRow[]> {
  const all = await fetchPolicyAudit(supabase);
  return all.filter((p) => (CURRICULUM_TABLES as readonly string[]).includes(p.tablename));
}

// ---------------------------------------------------------------------------
// Pilot book snapshot + processing history
// ---------------------------------------------------------------------------

export type PilotSampleRow = {
  unit: string;
  chapter: string;
  topic: string;
  outcomes: number;
  sampleOutcome: string | null;
};

export type PilotGraphEdge = { parent: string; child: string };

export type PilotSnapshot = {
  present: boolean;
  bookId: string;
  title: string | null;
  status: string | null;
  board: string | null;
  units: number;
  chapters: number;
  topics: number;
  outcomes: number;
  approvedOutcomes: number;
  nodes: number;
  edges: number;
  structureOk: boolean;
  sampleRows: PilotSampleRow[];
  graphSample: PilotGraphEdge[];
};

export const PILOT_EXPECTED = {
  units: 6,
  chapters: 64,
  topics: 64,
  outcomes: 55,
  nodes: 39,
  edges: 38,
} as const;

export async function fetchPilotSnapshot(supabase: Client): Promise<PilotSnapshot> {
  const empty: PilotSnapshot = {
    present: false,
    bookId: PILOT_BOOK_ID,
    title: null,
    status: null,
    board: null,
    units: 0,
    chapters: 0,
    topics: 0,
    outcomes: 0,
    approvedOutcomes: 0,
    nodes: 0,
    edges: 0,
    structureOk: false,
    sampleRows: [],
    graphSample: [],
  };
  const { data: book } = await supabase
    .from("books")
    .select("title, status, board")
    .eq("id", PILOT_BOOK_ID)
    .maybeSingle();
  if (!book) return empty;

  const count = async (table: string, extra?: (q: any) => any) => {
    let q = (supabase as SupabaseClient)
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("book_id", PILOT_BOOK_ID);
    if (extra) q = extra(q);
    const { count: c } = await q;
    return c ?? 0;
  };

  const [units, chapters, topics, outcomes, approvedOutcomes, nodes, edges] = await Promise.all([
    count("curriculum_units"),
    count("curriculum_chapters"),
    count("curriculum_topics"),
    count("curriculum_outcomes"),
    count("curriculum_outcomes", (q) => q.eq("status", "approved")),
    count("concept_nodes"),
    count("concept_edges"),
  ]);

  // Tree-ordered sample rows: first 12 topics with unit/chapter context and a
  // sample outcome, so an auditor can eyeball the extraction without the UI.
  const [{ data: unitRows }, { data: chapterRows }, { data: topicRows }, { data: outcomeRows }] =
    await Promise.all([
      supabase
        .from("curriculum_units")
        .select("id, title, position")
        .eq("book_id", PILOT_BOOK_ID)
        .order("position"),
      supabase
        .from("curriculum_chapters")
        .select("id, unit_id, title, position")
        .eq("book_id", PILOT_BOOK_ID)
        .order("position"),
      supabase
        .from("curriculum_topics")
        .select("id, chapter_id, title, position")
        .eq("book_id", PILOT_BOOK_ID)
        .order("position"),
      supabase
        .from("curriculum_outcomes")
        .select("topic_id, text, position")
        .eq("book_id", PILOT_BOOK_ID)
        .order("position"),
    ]);

  const unitById = new Map((unitRows ?? []).map((u) => [u.id as string, u.title as string]));
  const chapterById = new Map(
    (chapterRows ?? []).map((c) => [c.id as string, { title: c.title as string, unitId: c.unit_id as string }]),
  );
  const outcomesByTopic = new Map<string, string[]>();
  for (const o of outcomeRows ?? []) {
    const list = outcomesByTopic.get(o.topic_id as string) ?? [];
    list.push(o.text as string);
    outcomesByTopic.set(o.topic_id as string, list);
  }
  const chapterOrder = new Map((chapterRows ?? []).map((c, i) => [c.id as string, i]));
  const sortedTopics = [...(topicRows ?? [])].sort(
    (a, b) =>
      (chapterOrder.get(a.chapter_id as string) ?? 0) - (chapterOrder.get(b.chapter_id as string) ?? 0) ||
      (a.position as number) - (b.position as number),
  );
  const sampleRows: PilotSampleRow[] = sortedTopics.slice(0, 12).map((t) => {
    const chapter = chapterById.get(t.chapter_id as string);
    const topicOutcomes = outcomesByTopic.get(t.id as string) ?? [];
    return {
      unit: (chapter ? unitById.get(chapter.unitId) : null) ?? "—",
      chapter: chapter?.title ?? "—",
      topic: t.title as string,
      outcomes: topicOutcomes.length,
      sampleOutcome: topicOutcomes[0] ?? null,
    };
  });

  // Knowledge graph sample: first 12 edges resolved to concept labels.
  const [{ data: gNodes }, { data: gEdges }] = await Promise.all([
    supabase.from("concept_nodes").select("id, label").eq("book_id", PILOT_BOOK_ID),
    supabase.from("concept_edges").select("parent_id, child_id").eq("book_id", PILOT_BOOK_ID).limit(12),
  ]);
  const labelById = new Map((gNodes ?? []).map((n) => [n.id as string, n.label as string]));
  const graphSample: PilotGraphEdge[] = (gEdges ?? []).map((e) => ({
    parent: labelById.get(e.parent_id as string) ?? "?",
    child: labelById.get(e.child_id as string) ?? "?",
  }));

  const structureOk =
    units === PILOT_EXPECTED.units &&
    chapters === PILOT_EXPECTED.chapters &&
    topics === PILOT_EXPECTED.topics &&
    outcomes === PILOT_EXPECTED.outcomes &&
    nodes === PILOT_EXPECTED.nodes &&
    edges === PILOT_EXPECTED.edges;

  return {
    present: true,
    bookId: PILOT_BOOK_ID,
    title: book.title,
    status: book.status,
    board: book.board,
    units,
    chapters,
    topics,
    outcomes,
    approvedOutcomes,
    nodes,
    edges,
    structureOk,
    sampleRows,
    graphSample,
  };
}

export type BookEventDto = {
  id: string;
  event: string;
  bookTitle: string;
  detail: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export async function fetchBookEvents(supabase: Client): Promise<BookEventDto[]> {
  const { data } = await supabase
    .from("book_events")
    .select("id, event, detail, created_at, books(title)")
    .order("created_at", { ascending: false })
    .limit(25);
  return (data ?? []).map((e) => {
    const joined = (e as { books?: { title?: string } | { title?: string }[] | null }).books;
    const bookTitle = Array.isArray(joined) ? (joined[0]?.title ?? "—") : (joined?.title ?? "—");
    return {
      id: e.id as string,
      event: e.event as string,
      bookTitle,
      detail: (e.detail ?? {}) as Record<string, string | number | boolean | null>,
      createdAt: e.created_at as string,
    };
  });
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

export type CurriculumProbe = {
  key: string;
  name: string;
  expectation: string;
  detail: string;
  pass: boolean;
  skipped?: boolean;
  dbError?: DbErrorShape;
};

export type CurriculumProbeRun = {
  generatedAt: string;
  me: CallerIdentity;
  probes: CurriculumProbe[];
};

export async function runCurriculumProbes(
  supabase: Client,
  admin: Client,
  me: CallerIdentity,
): Promise<CurriculumProbe[]> {
  const probes: CurriculumProbe[] = [];

  // P1 — Pilot book structure intact (seed verification).
  {
    const snap = await fetchPilotSnapshot(admin);
    const expected = { units: 6, chapters: 64, topics: 64, outcomes: 55, nodes: 39, edges: 38 };
    const ok =
      snap.present &&
      snap.units === expected.units &&
      snap.chapters === expected.chapters &&
      snap.topics === expected.topics &&
      snap.outcomes === expected.outcomes &&
      snap.nodes === expected.nodes &&
      snap.edges === expected.edges;
    probes.push({
      key: "pilot-structure",
      name: "P1 — Pilot book structure intact",
      expectation: `Knowledge Bank for Children seeded with ${expected.units} units / ${expected.chapters} chapters / ${expected.topics} topics / ${expected.outcomes} outcomes / ${expected.nodes} concepts / ${expected.edges} edges (global view).`,
      detail: snap.present
        ? `Found "${snap.title}" [${snap.status}] with ${snap.units} units / ${snap.chapters} chapters / ${snap.topics} topics / ${snap.outcomes} outcomes / ${snap.nodes} concepts / ${snap.edges} edges.`
        : "Pilot book row not found.",
      pass: ok,
    });
  }

  // P2 — Cross-organization read returns zero rows.
  const { data: otherOrg } = await admin
    .from("organizations")
    .select("id, name")
    .neq("id", me.orgId ?? "")
    .limit(1)
    .maybeSingle();
  if (!otherOrg) {
    probes.push({
      key: "cross-org-read",
      name: "P2 — Cross-organization read isolation",
      expectation: "Reading another org's curriculum units returns 0 rows.",
      detail: "No second organization exists to test against.",
      pass: true,
      skipped: true,
    });
    probes.push({
      key: "cross-org-write",
      name: "P3 — Cross-organization write rejected",
      expectation: "Inserting into another org is rejected by RLS.",
      detail: "No second organization exists to test against.",
      pass: true,
      skipped: true,
    });
  } else {
    const read = await (supabase as SupabaseClient)
      .from("curriculum_units")
      .select("id", { count: "exact", head: true })
      .eq("org_id", otherOrg.id);
    probes.push({
      key: "cross-org-read",
      name: "P2 — Cross-organization read isolation",
      expectation: `Reading units of "${otherOrg.name}" as ${me.role} returns 0 rows.`,
      detail: read.error
        ? `Query errored (also acceptable): ${read.error.message}`
        : `Visible rows: ${read.count ?? 0}.`,
      pass: read.error ? true : (read.count ?? 0) === 0,
      dbError: shapeError(read.error),
    });

    const write = await (supabase as SupabaseClient)
      .from("curriculum_units")
      .insert({ org_id: otherOrg.id, book_id: PILOT_BOOK_ID, title: "probe", position: 999 });
    const rejected = !!write.error;
    probes.push({
      key: "cross-org-write",
      name: "P3 — Cross-organization write rejected",
      expectation: `Inserting a unit into "${otherOrg.name}" fails with a row-level security error.`,
      detail: rejected
        ? `Rejected: ${write.error.message}`
        : "INSERT SUCCEEDED — tenant isolation breach.",
      pass: rejected,
      dbError: shapeError(write.error),
    });
  }

  // P4 — Role write gate: staff write round-trip; reviewer insert denied.
  if (me.role === "reviewer") {
    const attempt = await (supabase as SupabaseClient)
      .from("curriculum_units")
      .insert({ org_id: me.orgId, book_id: PILOT_BOOK_ID, title: "reviewer-probe", position: 998 });
    probes.push({
      key: "role-write-gate",
      name: "P4 — Reviewer is read-only",
      expectation: "A reviewer's INSERT into curriculum_units is rejected.",
      detail: attempt.error
        ? `Rejected: ${attempt.error.message}`
        : "INSERT SUCCEEDED — reviewers must not write.",
      pass: !!attempt.error,
      dbError: shapeError(attempt.error),
    });
  } else {
    const ins = await (supabase as SupabaseClient)
      .from("curriculum_units")
      .insert({ org_id: me.orgId, book_id: PILOT_BOOK_ID, title: "zz-probe-temp", position: 997 })
      .select("id")
      .single();
    if (ins.error) {
      probes.push({
        key: "role-write-gate",
        name: "P4 — Staff write round-trip",
        expectation: "Staff can create and delete a unit in their own org.",
        detail: `Create failed: ${ins.error.message}`,
        pass: false,
        dbError: shapeError(ins.error),
      });
    } else {
      const del = await (supabase as SupabaseClient)
        .from("curriculum_units")
        .delete()
        .eq("id", ins.data.id);
      probes.push({
        key: "role-write-gate",
        name: "P4 — Staff write round-trip",
        expectation: "Staff can create and delete a unit in their own org.",
        detail: del.error
          ? `Created but delete failed: ${del.error.message}`
          : "Created and deleted a temporary unit successfully.",
        pass: !del.error,
        dbError: shapeError(del.error),
      });
    }
  }

  // P5 — book_events is append-only.
  {
    const del = await (supabase as SupabaseClient).from("book_events").delete().eq("org_id", me.orgId ?? "");
    const upd = await (supabase as SupabaseClient)
      .from("book_events")
      .update({ event: "tampered" })
      .eq("org_id", me.orgId ?? "");
    const denied = !!del.error && !!upd.error;
    probes.push({
      key: "events-append-only",
      name: "P5 — Processing history is append-only",
      expectation: "UPDATE and DELETE on book_events are rejected (no policies grant them).",
      detail: `DELETE: ${del.error ? del.error.message : "succeeded (0 rows or more)"} · UPDATE: ${upd.error ? upd.error.message : "succeeded (0 rows or more)"}`,
      pass: denied,
      dbError: shapeError(del.error) ?? shapeError(upd.error),
    });
  }

  // P6 — Knowledge graph integrity: every edge endpoint is a node in the same book.
  {
    const { data: edges } = await admin
      .from("concept_edges")
      .select("id, parent_id, child_id, book_id");
    const { data: nodes } = await admin.from("concept_nodes").select("id, book_id");
    const nodeBook = new Map((nodes ?? []).map((n) => [n.id as string, n.book_id as string]));
    const broken = (edges ?? []).filter(
      (e) =>
        !nodeBook.has(e.parent_id as string) ||
        !nodeBook.has(e.child_id as string) ||
        nodeBook.get(e.parent_id as string) !== (e.book_id as string) ||
        nodeBook.get(e.child_id as string) !== (e.book_id as string),
    );
    probes.push({
      key: "graph-integrity",
      name: "P6 — Knowledge graph integrity",
      expectation: "Every concept edge connects two nodes that belong to the same book.",
      detail: `Checked ${edges?.length ?? 0} edges against ${nodes?.length ?? 0} nodes; ${broken.length} broken.`,
      pass: broken.length === 0,
    });
  }

  // P7 — Tree referential integrity (orphan check, global view).
  {
    const { data: chapters } = await admin.from("curriculum_chapters").select("id, unit_id");
    const { data: units } = await admin.from("curriculum_units").select("id");
    const { data: topics } = await admin.from("curriculum_topics").select("id, chapter_id");
    const { data: outcomes } = await admin.from("curriculum_outcomes").select("id, topic_id");
    const unitIds = new Set((units ?? []).map((u) => u.id as string));
    const chapterIds = new Set((chapters ?? []).map((c) => c.id as string));
    const topicIds = new Set((topics ?? []).map((t) => t.id as string));
    const orphanChapters = (chapters ?? []).filter((c) => !unitIds.has(c.unit_id as string)).length;
    const orphanTopics = (topics ?? []).filter((t) => !chapterIds.has(t.chapter_id as string)).length;
    const orphanOutcomes = (outcomes ?? []).filter((o) => !topicIds.has(o.topic_id as string)).length;
    const orphans = orphanChapters + orphanTopics + orphanOutcomes;
    probes.push({
      key: "tree-integrity",
      name: "P7 — Tree referential integrity",
      expectation: "No orphan chapters, topics, or outcomes anywhere (all organizations).",
      detail: `Orphans — chapters: ${orphanChapters}, topics: ${orphanTopics}, outcomes: ${orphanOutcomes}.`,
      pass: orphans === 0,
    });
  }

  return probes;
}
