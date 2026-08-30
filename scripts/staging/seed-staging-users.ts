/**
 * Seed (or reset) the labelled staging test users.
 *
 * Runs ONLY against a staging/sandbox project. It refuses to run when
 * APP_ENV is production, and it refuses to touch any account outside the
 * reserved `@staging.eduos.test` domain.
 *
 * Usage (from the staging project's sandbox):
 *   bun scripts/staging/seed-staging-users.ts            # create / repair
 *   bun scripts/staging/seed-staging-users.ts --reset    # delete then recreate
 *
 * Credentials are generated at run time and written to
 * `.staging-credentials.local.json` (git-ignored). They are never printed to
 * stdout, never committed and never included in any report.
 */

import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const EMAIL_DOMAIN = "staging.eduos.test";
const CREDENTIALS_FILE = ".staging-credentials.local.json";

type SeedRole = "admin" | "reviewer" | "educator" | "parent" | "student";

type SeedUser = {
  key: string;
  role: SeedRole | null;
  fullName: string;
  journey: string;
};

/** The staging test-user inventory. Keep in sync with STAGING_ENVIRONMENT.md. */
export const STAGING_USERS: SeedUser[] = [
  { key: "admin", role: "admin", fullName: "STAGING Admin", journey: "Org settings, payment settings, audit centres" },
  { key: "reviewer", role: "reviewer", fullName: "STAGING Reviewer", journey: "Question verification queues" },
  { key: "educator", role: "educator", fullName: "STAGING Educator", journey: "Assignments, gap board, interventions" },
  { key: "parent", role: "parent", fullName: "STAGING Parent", journey: "Signup, add learner, free check, ₹199 diagnostic" },
  { key: "student", role: "student", fullName: "STAGING Student", journey: "Handle + PIN login, diagnostic, tutor, reassessment" },
  { key: "parent-direct", role: "parent", fullName: "STAGING Direct Parent", journey: "Direct-parent learner (no centre)" },
  { key: "parent-centre", role: "parent", fullName: "STAGING Centre Parent", journey: "Centre-managed learner" },
  { key: "norole", role: null, fullName: "STAGING No Role", journey: "Unassigned account — role-claim redirect" },
  { key: "expired", role: "parent", fullName: "STAGING Expired Entitlement", journey: "Expired entitlement paywall" },
  { key: "paid", role: "parent", fullName: "STAGING Paid Diagnostic", journey: "₹199 paid, ₹2,800 upgrade path" },
];

function assertStaging(): void {
  const env = (process.env["APP_ENV"] ?? process.env["VITE_APP_ENV"] ?? "production").toLowerCase();
  if (env !== "staging" && env !== "sandbox") {
    throw new Error(
      `Refusing to seed: APP_ENV is "${env}". This script may only run in the staging project.`,
    );
  }
}

function password(): string {
  return `Stg-${randomBytes(12).toString("base64url")}`;
}

function pin(): string {
  return String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
}

async function main() {
  assertStaging();
  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const reset = process.argv.includes("--reset");

  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const byEmail = new Map((existing?.users ?? []).map((u) => [u.email ?? "", u]));

  if (reset) {
    for (const user of existing?.users ?? []) {
      if (user.email?.endsWith(`@${EMAIL_DOMAIN}`)) {
        await admin.auth.admin.deleteUser(user.id);
        byEmail.delete(user.email);
      }
    }
  }

  const inventory: Array<Record<string, string>> = [];

  for (const seed of STAGING_USERS) {
    const email = `${seed.key}@${EMAIL_DOMAIN}`;
    const pass = password();
    const found = byEmail.get(email);

    let userId: string;
    if (found) {
      await admin.auth.admin.updateUserById(found.id, { password: pass });
      userId = found.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: pass,
        email_confirm: true,
        user_metadata: {
          full_name: seed.fullName,
          internal_test_account: true,
          exclude_from_analytics: true,
          ...(seed.role ? { signup_role: seed.role } : {}),
        },
      });
      if (error) throw new Error(`create ${email}: ${error.message}`);
      userId = data.user!.id;
    }

    if (seed.role) {
      await admin.from("user_roles").upsert({ user_id: userId, role: seed.role }, { onConflict: "user_id,role" });
    } else {
      await admin.from("user_roles").delete().eq("user_id", userId);
    }

    inventory.push({ key: seed.key, email, password: pass, role: seed.role ?? "none", journey: seed.journey });
  }

  // A learner PIN for the student journey; rotate with --reset.
  const learnerPin = pin();

  writeFileSync(
    CREDENTIALS_FILE,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), learnerPin, users: inventory }, null, 2)}\n`,
  );

  console.log(`Seeded ${inventory.length} staging users.`);
  console.log(`Credentials written to ${CREDENTIALS_FILE} (git-ignored). Do not commit or paste them.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
