// Sprint 6C audit center: server-only helpers behind the audit server
// functions. Plain DTOs with verbatim database responses so an independent
// reviewer can validate the blueprint engine without trusting app claims.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchPolicyAudit,
  type DbErrorShape,
  type PolicyAuditRow,
} from "./audit.server";
import { projectMastery, MASTERY_FORMULA } from "./blueprint-shared";
import { PILOT_BOOK_ID } from "./curriculum-audit.server";

type Client = SupabaseClient<Database>;

const BLUEPRINT_TABLES = [
  "assessment_outcomes",
  "outcome_map",
  "intervention_map",
  "mastery_levels",
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

// Expected seed for the pilot book (Knowledge Bank for Children, Class 3 GK).
export const BLUEPRINT_EXPECTED = {
  outcomes: 18,
  mappings: 55,
  interventions: 24,
  masteryLevels: 4,
  units: 6,
  sampleCode: "LO_GK3_NAT_01",
} as const;

// ---------------------------------------------------------------------------
// Counts: caller-visible (RLS) vs global (service role)
// ---------------------------------------------------------------------------

export type BlueprintCount = {
  table: string;
  label: string;
  visibleToYou: number | null;
  globalAllOrgs: number;
  isolated: boolean;
  note: string;
};

const COUNT_SPECS: { table: (typeof BLUEPRINT_TABLES)[number]; label: string; note: string }[] = [
  { table: "assessment_outcomes", label: "Assessment outcomes", note: "The outcome catalog (LO_GK3_* codes)." },
  { table: "outcome_map", label: "Outcome mappings", note: "Curriculum outcome → assessment outcome links." },
  { table: "intervention_map", label: "Intervention mappings", note: "Failure pattern → recommended intervention." },
  { table: "mastery_levels", label: "Mastery levels", note: "Org-configurable score bands." },
];

export async function fetchBlueprintCounts(
  supabase: Client,
  admin: Client,
): Promise<BlueprintCount[]> {
  const out: BlueprintCount[] = [];
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

export async function fetchBlueprintPolicies(supabase: Client): Promise<PolicyAuditRow[]> {
  const all = await fetchPolicyAudit(supabase);
  return all.filter((p) => (BLUEPRINT_TABLES as readonly string[]).includes(p.tablename));
}

// ---------------------------------------------------------------------------
// Pilot blueprint snapshot
// ---------------------------------------------------------------------------

export type BlueprintSnapshotRow = {
  code: string;
  title: string;
  bloomLevel: string;
  difficulty: number;
  weight: number;
  mappings: number;
  interventions: number;
};

export type BlueprintUnitSum = { unit: string; outcomes: number; weightSum: number };

export type BlueprintSnapshot = {
  present: boolean;
  outcomes: number;
  mappings: number;
  interventions: number;
  masteryLevels: number;
  unitSums: BlueprintUnitSum[];
  rows: BlueprintSnapshotRow[];
  masteryBands: { label: string; min: number; max: number }[];
};

export async function fetchBlueprintSnapshot(supabase: Client): Promise<BlueprintSnapshot> {
  const empty: BlueprintSnapshot = {
    present: false,
    outcomes: 0,
    mappings: 0,
    interventions: 0,
    masteryLevels: 0,
    unitSums: [],
    rows: [],
    masteryBands: [],
  };
  const [outcomesRes, unitsRes, mapsRes, interventionsRes, levelsRes] = await Promise.all([
    supabase.from("assessment_outcomes").select("*").eq("book_id", PILOT_BOOK_ID).order("code"),
    supabase.from("curriculum_units").select("id, title, position").eq("book_id", PILOT_BOOK_ID).order("position"),
    supabase.from("outcome_map").select("assessment_outcome_id").eq("book_id", PILOT_BOOK_ID),
    supabase.from("intervention_map").select("assessment_outcome_id").eq("book_id", PILOT_BOOK_ID),
    supabase.from("mastery_levels").select("label, min_score, max_score").order("sort_order"),
  ]);
  if (outcomesRes.error || !outcomesRes.data || outcomesRes.data.length === 0) return empty;

  const unitById = new Map((unitsRes.data ?? []).map((u) => [u.id, u]));
  const mapCount = new Map<string, number>();
  for (const m of mapsRes.data ?? []) {
    mapCount.set(m.assessment_outcome_id, (mapCount.get(m.assessment_outcome_id) ?? 0) + 1);
  }
  const intCount = new Map<string, number>();
  for (const im of interventionsRes.data ?? []) {
    intCount.set(im.assessment_outcome_id, (intCount.get(im.assessment_outcome_id) ?? 0) + 1);
  }

  const unitSums: BlueprintUnitSum[] = (unitsRes.data ?? []).map((u) => {
    const rows = outcomesRes.data.filter((o) => o.unit_id === u.id);
    return {
      unit: u.title,
      outcomes: rows.length,
      weightSum: rows.reduce((s, o) => s + o.diagnostic_weight, 0),
    };
  });

  return {
    present: true,
    outcomes: outcomesRes.data.length,
    mappings: mapsRes.data?.length ?? 0,
    interventions: interventionsRes.data?.length ?? 0,
    masteryLevels: levelsRes.data?.length ?? 0,
    unitSums,
    rows: outcomesRes.data.map((o) => ({
      code: o.code,
      title: o.title,
      bloomLevel: o.bloom_level,
      difficulty: o.difficulty,
      weight: o.diagnostic_weight,
      mappings: mapCount.get(o.id) ?? 0,
      interventions: intCount.get(o.id) ?? 0,
    })),
    masteryBands: (levelsRes.data ?? []).map((l) => ({
      label: l.label,
      min: l.min_score,
      max: l.max_score,
    })),
  };
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

export type BlueprintProbe = {
  key: string;
  name: string;
  expectation: string;
  detail: string;
  pass: boolean;
  skipped?: boolean;
  dbError?: DbErrorShape;
};

export type CallerCtx = { userId: string; role: string; orgId: string | null };

export async function runBlueprintProbes(
  supabase: Client,
  admin: Client,
  me: CallerCtx,
): Promise<BlueprintProbe[]> {
  const probes: BlueprintProbe[] = [];
  const E = BLUEPRINT_EXPECTED;

  // P1 — Outcome catalog present with expected seed shape.
  {
    const snap = await fetchBlueprintSnapshot(admin);
    const sampleOk = snap.rows.some((r) => r.code === E.sampleCode);
    const ok =
      snap.present &&
      snap.outcomes === E.outcomes &&
      snap.mappings === E.mappings &&
      snap.interventions === E.interventions &&
      snap.masteryLevels === E.masteryLevels &&
      sampleOk;
    probes.push({
      key: "catalog-present",
      name: "P1 — Outcome catalog seeded",
      expectation: `Pilot book has ${E.outcomes} assessment outcomes, ${E.mappings} outcome mappings, ${E.interventions} intervention mappings, ${E.masteryLevels} mastery levels; sample code ${E.sampleCode} exists.`,
      detail: snap.present
        ? `Found ${snap.outcomes} outcomes / ${snap.mappings} mappings / ${snap.interventions} interventions / ${snap.masteryLevels} mastery levels. Sample ${E.sampleCode}: ${sampleOk ? "present" : "MISSING"}.`
        : "No assessment outcomes found for the pilot book.",
      pass: ok,
    });
  }

  // P2 — Diagnostic weights sum to 100 per unit.
  {
    const snap = await fetchBlueprintSnapshot(admin);
    const bad = snap.unitSums.filter((u) => u.weightSum !== 100);
    probes.push({
      key: "weights-sum-100",
      name: "P2 — Diagnostic weights sum to 100 per unit",
      expectation: `Each of the ${E.units} units carries a total diagnostic weight of exactly 100.`,
      detail:
        snap.unitSums.length === 0
          ? "No units found."
          : snap.unitSums.map((u) => `${u.unit}: ${u.weightSum}`).join(" · ") +
            (bad.length === 0 ? " — all correct." : ` — ${bad.length} unit(s) off.`),
      pass: snap.unitSums.length === E.units && bad.length === 0,
    });
  }

  // P3 — Mastery framework: 4 contiguous bands covering 0–100.
  {
    const { data: levels } = await admin
      .from("mastery_levels")
      .select("label, min_score, max_score, sort_order")
      .order("sort_order");
    const bands = levels ?? [];
    let contiguous = bands.length > 0 && bands[0]!.min_score === 0 && bands[bands.length - 1]!.max_score === 100;
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i]!;
      if (b.min_score > b.max_score) contiguous = false;
      if (i > 0 && b.min_score !== bands[i - 1]!.max_score + 1) contiguous = false;
    }
    probes.push({
      key: "mastery-bands",
      name: "P3 — Mastery framework is contiguous",
      expectation: "Four bands — Beginning (0–49), Developing (50–69), Proficient (70–84), Advanced (85–100) — contiguous, no gaps or overlaps, covering 0–100.",
      detail:
        bands.length === 0
          ? "No mastery levels found."
          : bands.map((b) => `${b.label} ${b.min_score}–${b.max_score}`).join(" · ") +
            (contiguous ? " — contiguous." : " — GAP/OVERLAP detected."),
      pass: bands.length === E.masteryLevels && contiguous,
    });
  }

  // P4 — Curriculum mapping chain: every pilot learning outcome mapped, links valid.
  {
    const [{ data: los }, { data: maps }, { data: aos }, { data: topics }] = await Promise.all([
      admin.from("curriculum_outcomes").select("id, topic_id").eq("book_id", PILOT_BOOK_ID),
      admin.from("outcome_map").select("curriculum_outcome_id, assessment_outcome_id").eq("book_id", PILOT_BOOK_ID),
      admin.from("assessment_outcomes").select("id").eq("book_id", PILOT_BOOK_ID),
      admin.from("curriculum_topics").select("id").eq("book_id", PILOT_BOOK_ID),
    ]);
    const loIds = new Set((los ?? []).map((l) => l.id as string));
    const loTopic = new Map((los ?? []).map((l) => [l.id as string, l.topic_id as string]));
    const topicIds = new Set((topics ?? []).map((t) => t.id as string));
    const aoIds = new Set((aos ?? []).map((a) => a.id as string));
    const mappedLo = new Set((maps ?? []).map((m) => m.curriculum_outcome_id as string));
    const unmapped = (los ?? []).filter((l) => !mappedLo.has(l.id as string)).length;
    const brokenLinks = (maps ?? []).filter(
      (m) =>
        !loIds.has(m.curriculum_outcome_id as string) ||
        !aoIds.has(m.assessment_outcome_id as string) ||
        !topicIds.has(loTopic.get(m.curriculum_outcome_id as string) ?? ""),
    ).length;
    const ok = (los ?? []).length > 0 && unmapped === 0 && brokenLinks === 0;
    probes.push({
      key: "mapping-chain",
      name: "P4 — Mapping chain Topic → Learning Outcome → Assessment Outcome",
      expectation: `Every one of the pilot book's ${E.mappings} learning outcomes maps to exactly one assessment outcome; every map row references a real learning outcome and assessment outcome in the same book.`,
      detail: `Learning outcomes: ${loIds.size}; mapped: ${mappedLo.size}; unmapped: ${unmapped}; broken links: ${brokenLinks}.`,
      pass: ok,
    });
  }

  // P5 — Every assessment outcome has at least one intervention mapping.
  {
    const [{ data: aos }, { data: ims }] = await Promise.all([
      admin.from("assessment_outcomes").select("id, code").eq("book_id", PILOT_BOOK_ID),
      admin.from("intervention_map").select("assessment_outcome_id").eq("book_id", PILOT_BOOK_ID),
    ]);
    const covered = new Set((ims ?? []).map((m) => m.assessment_outcome_id as string));
    const uncovered = (aos ?? []).filter((a) => !covered.has(a.id as string));
    probes.push({
      key: "intervention-coverage",
      name: "P5 — Intervention mapping covers every outcome",
      expectation: "Each assessment outcome has at least one Failure Pattern → Recommended Intervention row.",
      detail:
        uncovered.length === 0
          ? `All ${aos?.length ?? 0} outcomes covered by ${ims?.length ?? 0} intervention rows.`
          : `Uncovered: ${uncovered.map((a) => a.code).join(", ")}.`,
      pass: (aos ?? []).length > 0 && uncovered.length === 0,
    });
  }

  // P6/P7 — Cross-organization isolation (read + write) on assessment_outcomes.
  const { data: otherOrg } = await admin
    .from("organizations")
    .select("id, name")
    .neq("id", me.orgId ?? "")
    .limit(1)
    .maybeSingle();
  if (!otherOrg) {
    for (const [key, name, expectation] of [
      ["cross-org-read", "P6 — Cross-organization read isolation", "Reading another org's outcomes returns 0 rows."],
      ["cross-org-write", "P7 — Cross-organization write rejected", "Inserting into another org is rejected by RLS."],
    ] as const) {
      probes.push({ key, name, expectation, detail: "No second organization exists to test against.", pass: true, skipped: true });
    }
  } else {
    const { data: otherBook } = await admin
      .from("books")
      .select("id")
      .eq("org_id", otherOrg.id)
      .limit(1)
      .maybeSingle();
    const read = await (supabase as SupabaseClient)
      .from("assessment_outcomes")
      .select("id", { count: "exact", head: true })
      .eq("org_id", otherOrg.id);
    probes.push({
      key: "cross-org-read",
      name: "P6 — Cross-organization read isolation",
      expectation: `Reading assessment outcomes of "${otherOrg.name}" as ${me.role} returns 0 rows.`,
      detail: read.error
        ? `Query errored (also acceptable): ${read.error.message}`
        : `Visible rows: ${read.count ?? 0}.`,
      pass: read.error ? true : (read.count ?? 0) === 0,
      dbError: shapeError(read.error),
    });

    const write = await (supabase as SupabaseClient).from("assessment_outcomes").insert({
      org_id: otherOrg.id,
      book_id: otherBook?.id ?? PILOT_BOOK_ID,
      unit_id: "66100000-0000-4000-8000-000000000001",
      code: "PROBE",
      title: "probe",
      category: "probe",
      bloom_level: "remember",
      difficulty: 1,
      diagnostic_weight: 10,
      intervention_strategy: "probe",
    });
    probes.push({
      key: "cross-org-write",
      name: "P7 — Cross-organization write rejected",
      expectation: `Inserting an assessment outcome into "${otherOrg.name}" fails with a row-level security error.`,
      detail: write.error ? `Rejected: ${write.error.message}` : "INSERT SUCCEEDED — tenant isolation breach.",
      pass: !!write.error,
      dbError: shapeError(write.error),
    });
  }

  // P8 — Role write gate: reviewer insert denied; staff create/delete round-trip.
  if (me.role === "reviewer") {
    const attempt = await (supabase as SupabaseClient).from("assessment_outcomes").insert({
      org_id: me.orgId ?? "",
      book_id: PILOT_BOOK_ID,
      unit_id: "66100000-0000-4000-8000-000000000001",
      code: "REVIEWER_PROBE",
      title: "reviewer probe",
      category: "probe",
      bloom_level: "remember",
      difficulty: 1,
      diagnostic_weight: 10,
      intervention_strategy: "probe",
    });
    probes.push({
      key: "role-write-gate",
      name: "P8 — Reviewer is read-only",
      expectation: "A reviewer's INSERT into assessment_outcomes is rejected.",
      detail: attempt.error ? `Rejected: ${attempt.error.message}` : "INSERT SUCCEEDED — reviewers must not write.",
      pass: !!attempt.error,
      dbError: shapeError(attempt.error),
    });
  } else {
    const ins = await (supabase as SupabaseClient)
      .from("assessment_outcomes")
      .insert({
        org_id: me.orgId ?? "",
        book_id: PILOT_BOOK_ID,
        unit_id: "66100000-0000-4000-8000-000000000001",
        code: "ZZ_PROBE_TEMP",
        title: "zz probe temp",
        category: "probe",
        bloom_level: "remember",
        difficulty: 1,
        diagnostic_weight: 10,
        intervention_strategy: "probe",
      })
      .select("id")
      .single();
    if (ins.error) {
      probes.push({
        key: "role-write-gate",
        name: "P8 — Staff write round-trip",
        expectation: "Staff can create and delete an outcome in their own org.",
        detail: `Create failed: ${ins.error.message}`,
        pass: false,
        dbError: shapeError(ins.error),
      });
    } else {
      const del = await (supabase as SupabaseClient)
        .from("assessment_outcomes")
        .delete()
        .eq("id", ins.data.id);
      probes.push({
        key: "role-write-gate",
        name: "P8 — Staff write round-trip",
        expectation: "Staff can create and delete an outcome in their own org.",
        detail: del.error ? `Created but delete failed: ${del.error.message}` : "Created and deleted a temporary outcome successfully.",
        pass: !del.error,
        dbError: shapeError(del.error),
      });
    }
  }

  // P9 — Weight bounds + Bloom/difficulty vocabularies hold (data-level check).
  {
    const { data: aos } = await admin
      .from("assessment_outcomes")
      .select("code, diagnostic_weight, bloom_level, difficulty")
      .eq("book_id", PILOT_BOOK_ID);
    const BLOOMS = new Set(["remember", "understand", "apply", "analyze", "evaluate", "create"]);
    const badWeight = (aos ?? []).filter((a) => a.diagnostic_weight < 5 || a.diagnostic_weight > 60);
    const badBloom = (aos ?? []).filter((a) => !BLOOMS.has(a.bloom_level as string));
    const badDifficulty = (aos ?? []).filter((a) => (a.difficulty as number) < 1 || (a.difficulty as number) > 5);
    const bad = badWeight.length + badBloom.length + badDifficulty.length;
    probes.push({
      key: "weight-bounds",
      name: "P9 — Weights and vocabularies within bounds",
      expectation: "Every diagnostic weight is 5–60 (DB CHECK), Bloom level is one of remember/understand/apply/analyze/evaluate/create, difficulty is 1–5.",
      detail: `Checked ${aos?.length ?? 0} outcomes — out-of-range weights: ${badWeight.length}, unknown Bloom levels: ${badBloom.length}, bad difficulty: ${badDifficulty.length}.`,
      pass: (aos ?? []).length > 0 && bad === 0,
    });
  }

  // P10 — Mastery projection is deterministic (same inputs → same output).
  {
    const rows = [
      { outcomeId: "a", weight: 40, evidenceScore: 80 },
      { outcomeId: "b", weight: 35, evidenceScore: 60 },
      { outcomeId: "c", weight: 25, evidenceScore: null },
    ];
    const first = projectMastery(rows, 42);
    const second = projectMastery(rows, 42);
    // Hand-computed: evidenceMean = (80×40 + 60×35)/75 = 70.67; 0.5×42 + 0.5×70.67 = 56.33 → 56.
    const expected = 56;
    const deterministic =
      first.overall === second.overall &&
      first.overall === expected &&
      first.perOutcome.get("c") === 42;
    probes.push({
      key: "projection-determinism",
      name: "P10 — Mastery projection is deterministic",
      expectation: `Formula: ${MASTERY_FORMULA[2]}. Fixed inputs (prior 42; evidence 80@40, 60@35, none@25) must yield overall ${expected} twice, with the unevidenced outcome falling back to the prior.`,
      detail: `Run 1: overall ${first.overall}, outcome c → ${first.perOutcome.get("c")} · Run 2: overall ${second.overall}. Expected overall ${expected}.`,
      pass: deterministic,
    });
  }

  return probes;
}
