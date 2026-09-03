// P0 security regression tests for the Razorpay credential stack.
//
// These assert the *access shape* of the credential paths: secrets are
// reachable only through the service-role server module, never through the
// browser client, server-function responses, or any repository artifact.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const credentialsServer = read("src/lib/payment-credentials.server.ts");
const settingsFunctions = read("src/lib/payment-settings.functions.ts");
const migrationsDir = join(root, "supabase/migrations");
const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => ({ file: f, sql: readFileSync(join(migrationsDir, f), "utf8") }));

const lockMigration = migrations.find((m) =>
  m.sql.includes('DROP POLICY IF EXISTS "payment_credentials_admin_select"'),
);

describe("payment credential table lockdown", () => {
  it("ships a migration that removes every authenticated policy", () => {
    expect(lockMigration).toBeDefined();
    for (const policy of [
      "payment_credentials_admin_select",
      "payment_credentials_admin_insert",
      "payment_credentials_admin_update",
      "payment_credentials_admin_delete",
    ]) {
      expect(lockMigration!.sql).toContain(`DROP POLICY IF EXISTS "${policy}"`);
    }
  });

  it("revokes anon and authenticated privileges on both credential tables", () => {
    expect(lockMigration!.sql).toContain(
      "REVOKE ALL ON public.payment_credentials FROM anon, authenticated;",
    );
    expect(lockMigration!.sql).toContain(
      "REVOKE ALL ON public.payment_credential_audit FROM anon, authenticated;",
    );
  });

  it("keeps the service-role path working", () => {
    expect(lockMigration!.sql).toContain("GRANT ALL ON public.payment_credentials TO service_role;");
    expect(lockMigration!.sql).toContain(
      "GRANT SELECT, INSERT ON public.payment_credential_audit TO service_role;",
    );
  });

  it("makes the audit trail immutable (append-only)", () => {
    expect(lockMigration!.sql).toContain("payment_credential_audit_immutable");
    expect(lockMigration!.sql).toMatch(/BEFORE UPDATE OR DELETE ON public\.payment_credential_audit/);
  });

  it("no later migration re-grants credential access to anon or authenticated", () => {
    const lockIndex = migrations.findIndex((m) => m.file === lockMigration!.file);
    const later = migrations.slice(lockIndex + 1);
    for (const m of later) {
      expect(
        /GRANT[^;]*ON\s+public\.payment_credential[s_]*[^;]*TO[^;]*(anon|authenticated)/i.test(m.sql),
      ).toBe(false);
    }
  });
});

describe("credential reads never leave the service-role module", () => {
  it("only the admin (service-role) client touches the credential tables", () => {
    const lines = credentialsServer
      .split("\n")
      .filter((l) => l.includes('from("payment_credential'));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).toContain("supabaseAdmin");
    }
  });

  it("no browser-facing module queries the credential tables", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          walk(rel);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        if (entry.name.endsWith(".server.ts") || entry.name === "types.ts") continue;
        if (rel.includes("__tests__")) continue;
        const src = readFileSync(join(root, rel), "utf8");
        if (src.includes('from("payment_credentials")') || src.includes('from("payment_credential_audit")')) {
          offenders.push(rel);
        }
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });
});

describe("secret values are write-only", () => {
  it("the status object exposes no secret fields", () => {
    const statusType = credentialsServer.slice(
      credentialsServer.indexOf("export type RazorpayCredentialStatus"),
      credentialsServer.indexOf("// ---------- encryption at rest"),
    );
    expect(statusType).not.toMatch(/keySecret\s*:/);
    expect(statusType).not.toMatch(/webhookSecret\s*:\s*string/);
    expect(statusType).toContain("maskedKeyId");
  });

  it("no server function returns resolved credentials to the client", () => {
    expect(settingsFunctions).not.toContain("resolveRazorpayCredentials");
    expect(settingsFunctions).not.toMatch(/keySecret\s*[,)}]/);
    for (const fn of ["getPaymentSettingsFn", "savePaymentSettingsFn", "clearPaymentSettingsFn"]) {
      expect(settingsFunctions).toContain(fn);
    }
    // every handler is admin-gated server-side
    const gates = settingsFunctions.match(/requireAnyRole\(/g) ?? [];
    const handlers = settingsFunctions.match(/\.handler\(/g) ?? [];
    expect(gates.length).toBe(handlers.length);
  });

  it("the credential audit record stores only masked identifiers", () => {
    const auditInsert = credentialsServer.slice(
      credentialsServer.indexOf('from("payment_credential_audit").insert'),
      credentialsServer.indexOf("export type CredentialAuditEntry"),
    );
    expect(auditInsert).toContain("masked_key_id");
    expect(auditInsert).not.toContain("key_secret");
    expect(auditInsert).not.toContain("webhook_secret");
  });

  it("never logs secret material", () => {
    const logs = credentialsServer.match(/console\.(log|error|warn)\([^)]*\)/g) ?? [];
    for (const log of logs) {
      expect(log).not.toMatch(/keySecret|key_secret|webhookSecret|webhook_secret|creds\./);
    }
  });
});

describe("no live secrets in the repository", () => {
  it("contains no Razorpay live key id or secret literal", () => {
    const scan = [
      "src/lib/payment-credentials.server.ts",
      "src/lib/razorpay.server.ts",
      "src/lib/payment-settings.functions.ts",
      ".env",
    ];
    for (const file of scan) {
      let src = "";
      try {
        src = read(file);
      } catch {
        continue;
      }
      expect(/rzp_live_[A-Za-z0-9]{6,}/.test(src)).toBe(false);
      expect(/RAZORPAY_KEY_SECRET\s*=\s*\S+/.test(src)).toBe(false);
    }
  });
});
