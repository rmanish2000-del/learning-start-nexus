// Dry-run harness for supabase/migrations/20261003120000_staging_reconciliation_forward_only.sql
// against a DISPOSABLE PostgreSQL (never a live project). Three scenarios:
//   bare      — shim only: proves every step is self-guarded
//   main      — shim + main's own 20260919*/20261002* migrations: must be a no-op
//   staging   — shim + staging-applied 20260915161655 + hardened PR #5 owner
//               check + seeded rows (10 feedback / 1 snapshot / 325 actions):
//               must add only the missing objects and preserve every row
// Each scenario runs the migration twice (idempotency) and compares row
// fingerprints before/after. Connection: PGHOST/PGPORT/PGUSER (defaults
// 127.0.0.1 / 54329 / postgres). Writes JSON evidence to stdout.
//   bun scripts/db/reconciliation-dryrun/run.ts > verification/.../dryrun-results.json

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const HERE = resolve(ROOT, "scripts/db/reconciliation-dryrun");
const MIG = resolve(ROOT, "supabase/migrations");
const STAGING_HISTORY = resolve(
  ROOT,
  "verification/staging-migration-reconciliation/handoff/staging-history",
);
export const RECONCILIATION = "20261003120000_staging_reconciliation_forward_only.sql";

const PG = {
  host: process.env["PGHOST"] ?? "127.0.0.1",
  port: process.env["PGPORT"] ?? "54329",
  user: process.env["PGUSER"] ?? "postgres",
};

function psql(db: string, args: string[]): { ok: boolean; out: string; err: string } {
  const proc = spawnSync(
    "psql",
    [
      "-X",
      "-q",
      "-v",
      "ON_ERROR_STOP=1",
      "-h",
      PG.host,
      "-p",
      PG.port,
      "-U",
      PG.user,
      "-d",
      db,
      ...args,
    ],
    { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
  );
  return { ok: proc.status === 0, out: proc.stdout ?? "", err: proc.stderr ?? "" };
}

function runFile(db: string, file: string, singleTxn = false) {
  const r = psql(db, [...(singleTxn ? ["-1"] : []), "-f", file]);
  if (!r.ok) throw new Error(`psql ${file} failed:\n${r.err}`);
}

function query(db: string, sql: string): string[] {
  const r = psql(db, ["-At", "-c", sql]);
  if (!r.ok) throw new Error(`query failed: ${sql}\n${r.err}`);
  return r.out.trim().split("\n").filter(Boolean);
}

const SNAPSHOT_TABLES = [
  "feedback_submissions",
  "remediation_snapshots",
  "remediation_actions",
  "question_pool_exclusions",
  "remediation_work_items",
];

/** Row fingerprints; a table that does not exist yet is reported as `absent`. */
function snapshot(db: string): string[] {
  const present = new Set(
    query(
      db,
      `SELECT t FROM unnest(ARRAY['${SNAPSHOT_TABLES.join("','")}']) t WHERE to_regclass('public.' || t) IS NOT NULL`,
    ),
  );
  const lines = readFileSync(resolve(HERE, "snapshot.sql"), "utf8")
    .split("\n")
    .filter((l) => l.startsWith("SELECT") || l.startsWith("UNION ALL SELECT"))
    .map((l) => l.replace(/^UNION ALL /, "").replace(/\s*$/, ""));
  return SNAPSHOT_TABLES.map((t) => {
    if (!present.has(t)) return `${t}|absent`;
    const sql = lines.find((l) => l.includes(`'${t}'`))!;
    return query(db, sql)[0] ?? `${t}|0|`;
  });
}

function objects(db: string): string[] {
  return query(db, readFileSync(resolve(HERE, "objects.sql"), "utf8"));
}

function applyMigration(db: string) {
  runFile(db, resolve(MIG, RECONCILIATION), true);
}

export function reachable(): boolean {
  return psql("postgres", ["-At", "-c", "select 1"]).ok;
}

export interface ScenarioResult {
  scenario: string;
  before: { snapshot: string[]; objects: string[] };
  afterFirst: { snapshot: string[]; objects: string[] };
  afterSecond: { snapshot: string[]; objects: string[] };
  rowsPreserved: boolean;
  idempotent: boolean;
  objectsAdded: string[];
  objectsRemoved: string[];
}

/** `view_option:` and `function:` lines are state flags, not objects. */
const isObject = (o: string) => !o.startsWith("view_option:") && !o.startsWith("function:");

function runScenario(name: string, setup: (db: string) => void): ScenarioResult {
  const db = `recon_${name}_${Date.now()}`;
  const created = psql("postgres", ["-c", `CREATE DATABASE ${db}`]);
  if (!created.ok) throw new Error(created.err);
  try {
    runFile(db, resolve(HERE, "shim.sql"));
    setup(db);
    const before = { snapshot: snapshot(db), objects: objects(db) };
    applyMigration(db);
    const afterFirst = { snapshot: snapshot(db), objects: objects(db) };
    applyMigration(db);
    const afterSecond = { snapshot: snapshot(db), objects: objects(db) };
    const eq = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);
    // Every table that held rows before must hold byte-identical rows after;
    // tables that did not exist before (bare database) are not data, and the
    // two bookkeeping tables legitimately gain the guarded inserts.
    const dataLines = (snap: string[]) =>
      snap.filter(
        (l) =>
          !l.endsWith("|absent") &&
          !l.startsWith("question_pool_exclusions") &&
          !l.startsWith("remediation_work_items"),
      );
    return {
      scenario: name,
      before,
      afterFirst,
      afterSecond,
      rowsPreserved: dataLines(before.snapshot).every((l) => afterFirst.snapshot.includes(l)),
      idempotent:
        eq(afterFirst.snapshot, afterSecond.snapshot) &&
        eq(afterFirst.objects, afterSecond.objects),
      objectsAdded: afterFirst.objects.filter((o) => isObject(o) && !before.objects.includes(o)),
      objectsRemoved: before.objects.filter((o) => isObject(o) && !afterFirst.objects.includes(o)),
    };
  } finally {
    psql("postgres", ["-c", `DROP DATABASE IF EXISTS ${db}`]);
  }
}

const feedback = resolve(MIG, "20260905074149_22b39441-baac-4847-b0a9-7bef6ec582a4.sql");

export const SCENARIOS: Record<string, (db: string) => void> = {
  bare: () => {},
  main: (db) => {
    runFile(db, feedback);
    for (const f of [
      "20260919175712_8a16e7d2-73e0-40d7-908e-d07bd538e2fa.sql",
      "20260919175907_a6cec947-baea-4506-9661-db7cef48a32a.sql",
      "20260919195620_b30e9647-5517-4603-9c1c-6d244ee2c4b3.sql",
      "20260919195651_fdde1774-86cb-44f5-9172-ac6398190072.sql",
      "20261002045629_be60915e-3ad8-4dbe-9bbb-314f7edca414.sql",
      "20261002050331_7ac11e74-e65e-4d5e-9ab7-443ab74e82ce.sql",
    ])
      runFile(db, resolve(MIG, f));
    // main's 20261002050000 (not fresh-replayable, see DB-BASELINE-001) owns
    // the two pilot_leads owner policies; recreate just those.
    runFile(db, resolve(HERE, "staging-owner.sql"));
    runFile(db, resolve(HERE, "seed-staging.sql"));
  },
  staging: (db) => {
    runFile(db, feedback); // staging's 20260905084252 is byte-identical to main's 20260905074149
    runFile(
      db,
      resolve(
        STAGING_HISTORY,
        "staging-applied__20260915161655_88fec6b0-f152-48f5-a53c-bdaf5742fd49.sql",
      ),
    );
    runFile(db, resolve(HERE, "staging-owner.sql"));
    runFile(db, resolve(HERE, "seed-staging.sql"));
  },
};

export function runAll(): ScenarioResult[] {
  return Object.entries(SCENARIOS).map(([name, setup]) => runScenario(name, setup));
}

if (import.meta.main) {
  if (!reachable()) {
    console.error(`no PostgreSQL at ${PG.host}:${PG.port}`);
    process.exit(2);
  }
  const results = runAll();
  const ok = results.every((r) => r.rowsPreserved && r.idempotent);
  console.log(
    JSON.stringify(
      {
        migration: RECONCILIATION,
        postgres: query("postgres", "select version()")[0],
        ok,
        results,
      },
      null,
      2,
    ),
  );
  process.exit(ok ? 0 : 1);
}
