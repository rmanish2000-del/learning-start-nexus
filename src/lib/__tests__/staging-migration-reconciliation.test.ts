import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { RECONCILIATION, reachable, runAll } from "../../../scripts/db/reconciliation-dryrun/run";

const ROOT = resolve(import.meta.dirname, "../../..");
const MIG = resolve(ROOT, "supabase/migrations");
const EVIDENCE = resolve(ROOT, "verification/staging-migration-reconciliation");
const sha256 = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const migration = readFileSync(resolve(MIG, RECONCILIATION), "utf8");
const code = migration.replace(/--[^\n]*/g, "");

const STAGING_ONLY_NAMES = [
  "20260904172759_ab478d85-b845-4cfc-a217-86a721dc950a.sql",
  "20260905045134_835adc31-c4d4-4244-b691-4e79b40d1481.sql",
  "20260905084252_0db76c42-15bd-4f09-ba70-ed49c830dc4c.sql",
  "20260905100552_b81b51d9-d908-4772-8dc9-8f31ecbba362.sql",
  "20260905100631_02e41e98-a756-47ba-8a2e-59d736c358e8.sql",
  "20260905100711_04ffe976-54a0-43eb-bf35-15909973a015.sql",
  "20261002052435_b60cb0a3-e7ae-46df-a541-37556d8089f1.sql",
  "20261002052550_298225aa-0a38-4d50-95a1-067c08145078.sql",
];

describe("existing migrations are preserved byte-for-byte", () => {
  const manifest = readFileSync(resolve(EVIDENCE, "existing-migrations.sha256"), "utf8")
    .trim()
    .split("\n")
    .map((l) => l.split(/\s+/) as [string, string]);

  it("every migration recorded at main@5bf25fb5 is unchanged and still present", () => {
    expect(manifest.length).toBe(109);
    for (const [hash, name] of manifest) {
      expect(existsSync(resolve(MIG, name)), name).toBe(true);
      expect(sha256(resolve(MIG, name)), name).toBe(hash);
    }
  });

  it("the only new file is the forward-only reconciliation, ordered after every known name on both histories", () => {
    const names = readdirSync(MIG).sort();
    const known = new Set(manifest.map(([, n]) => n));
    const added = names.filter((n) => !known.has(n));
    expect(added).toEqual([RECONCILIATION]);
    expect(RECONCILIATION > "20261002052550_").toBe(true);
    expect(names[names.length - 1]).toBe(RECONCILIATION);
  });

  it("the same-name conflict is left alone: main keeps its 215-byte 20260915161655 placeholder", () => {
    const placeholder = resolve(MIG, "20260915161655_88fec6b0-f152-48f5-a53c-bdaf5742fd49.sql");
    expect(readFileSync(placeholder, "utf8").trim().endsWith("SELECT 1;")).toBe(true);
    expect(readFileSync(placeholder).length).toBe(215);
  });

  it("no staging-only migration name is imported into main's history", () => {
    for (const n of STAGING_ONLY_NAMES) expect(existsSync(resolve(MIG, n)), n).toBe(false);
  });
});

describe("the reconciliation migration is forward-only, idempotent and non-destructive by construction", () => {
  it("is regenerated deterministically from main's own migrations", () => {
    const gen = spawnSync(
      "python3",
      [resolve(ROOT, "scripts/db/generate-reconciliation-migration.py")],
      {
        cwd: ROOT,
        encoding: "utf8",
      },
    );
    expect(gen.status).toBe(0);
    expect(gen.stdout).toBe(migration);
  });

  it("contains no DROP TABLE / TRUNCATE / DELETE / DROP COLUMN / DROP SCHEMA", () => {
    expect(code).not.toMatch(
      /\b(DROP\s+TABLE|TRUNCATE|DELETE\s+FROM|DROP\s+COLUMN|DROP\s+SCHEMA|DROP\s+DATABASE)\b/i,
    );
  });

  it("every CREATE TABLE and CREATE INDEX is IF NOT EXISTS; every policy and trigger is existence-guarded; views are CREATE OR REPLACE", () => {
    expect(code.match(/CREATE TABLE (?!IF NOT EXISTS)/g)).toBeNull();
    expect(code.match(/CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)/g)).toBeNull();
    expect(code.match(/^CREATE POLICY/gm)).toBeNull();
    expect(code.match(/^CREATE TRIGGER/gm)).toBeNull();
    expect(code.match(/CREATE VIEW /g)).toBeNull();
    expect((code.match(/CREATE TABLE IF NOT EXISTS/g) ?? []).length).toBe(16);
    expect(
      (code.match(/IF NOT EXISTS \(SELECT 1 FROM pg_policies/g) ?? []).length,
    ).toBeGreaterThanOrEqual(16);
    expect(
      (code.match(/IF NOT EXISTS \(SELECT 1 FROM pg_trigger/g) ?? []).length,
    ).toBeGreaterThanOrEqual(10);
    // grants, revokes and table alters only run when the relation exists
    expect(code.match(/^(GRANT|REVOKE) [^;]* ON (TABLE )?public\./gm)).toBeNull();
    expect(code.match(/^ALTER TABLE/gm)).toBeNull();
    // every INSERT is paired with ON CONFLICT ... DO NOTHING (string literals may contain ';')
    expect((code.match(/INSERT INTO/g) ?? []).length).toBe(3);
    expect((code.match(/ON CONFLICT \([^)]*\) DO NOTHING/g) ?? []).length).toBe(3);
  });

  it("the only DROPs are the two trigger removals main itself performs (no data effect)", () => {
    expect(code).not.toMatch(/\bDROP\s+(?!TRIGGER\s+IF\s+EXISTS\b)/i);
    const triggers = [
      ...code.matchAll(/DROP\s+TRIGGER\s+IF\s+EXISTS\s+(\w+)\s+ON\s+public\.(\w+)/g),
    ].map((m) => `${m[2]}.${m[1]}`);
    expect(triggers.sort()).toEqual([
      "engine_rerun_results.engine_rerun_results_no_delete",
      "legacy_verification_quarantine.legacy_quarantine_no_delete",
    ]);
  });
});

describe("dry-runs against a disposable PostgreSQL (skipped when none is reachable)", () => {
  const live = reachable();

  it.skipIf(!live)(
    "bare, main-shaped and staging-shaped databases: rows preserved, idempotent, nothing removed",
    () => {
      const results = runAll();
      expect(results.map((r) => r.scenario)).toEqual(["bare", "main", "staging"]);
      const ALLOWED_REMOVALS = [
        // main's own 20260919175712 drops these two delete-blocking triggers so
        // the service role can roll back; nothing else may disappear.
        "trigger:engine_rerun_results.engine_rerun_results_no_delete",
        "trigger:legacy_verification_quarantine.legacy_quarantine_no_delete",
      ];
      for (const r of results) {
        expect(r.rowsPreserved, `${r.scenario} rows`).toBe(true);
        expect(r.idempotent, `${r.scenario} idempotent`).toBe(true);
        for (const o of r.objectsRemoved)
          expect(ALLOWED_REMOVALS, `${r.scenario} removed ${o}`).toContain(o);
      }
      const main = results.find((r) => r.scenario === "main")!;
      expect(main.objectsAdded).toEqual([]); // no-op on a database that followed main
      const count = (snap: string[], t: string) => snap.find((l) => l.startsWith(t))?.split("|")[1];
      const staging = results.find((r) => r.scenario === "staging")!;
      expect(count(staging.before.snapshot, "feedback_submissions")).toBe("10");
      expect(count(staging.before.snapshot, "remediation_snapshots")).toBe("1");
      expect(count(staging.before.snapshot, "remediation_actions")).toBe("325");
      for (const t of ["feedback_submissions", "remediation_snapshots", "remediation_actions"]) {
        expect(staging.afterSecond.snapshot.find((l) => l.startsWith(t))).toBe(
          staging.before.snapshot.find((l) => l.startsWith(t)),
        );
      }
      for (const o of [
        "table:question_commercial_release",
        "table:founder_access_denials",
        "table:automated_review_imports",
        "table:automated_provisional_outcomes",
        "table:automated_review_rollback_events",
        "table:question_marking_specs",
        "table:question_content_revisions",
        "table:curriculum_source_register",
        "table:question_originality_checks",
        "view:production_release_pool",
      ])
        expect(staging.objectsAdded, o).toContain(o);
      expect(staging.afterFirst.objects).toContain(
        "view_option:production_release_pool=security_invoker=on",
      );
      expect(staging.afterFirst.objects).toContain("function:is_platform_owner_confirmed=true");
      // 1 quarantined question + 2 of the 3 named DIAG refs seeded = 3 exclusion rows, inserted once
      expect(count(staging.afterFirst.snapshot, "question_pool_exclusions")).toBe("3");
      expect(count(staging.afterSecond.snapshot, "question_pool_exclusions")).toBe("3");
      expect(count(staging.afterFirst.snapshot, "remediation_work_items")).toBe("1");
      // the same-name conflict: staging's full 20260915161655 tables are untouched
      expect(staging.objectsRemoved.filter((o) => o.startsWith("table:"))).toEqual([]);
    },
  );

  it("records whether the live dry-run ran", () => {
    // Evidence of the actual run lives in verification/staging-migration-reconciliation/dryrun-results.json
    expect(typeof live).toBe("boolean");
  });
});
