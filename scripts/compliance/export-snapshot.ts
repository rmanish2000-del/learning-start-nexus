// Read-only exporter for the Class 10 compliance snapshot.
//
//   psql "$SUPABASE_DB_URL" -At -f scripts/compliance/export-snapshot.sql \
//     > content/compliance/class-10-2026-27.snapshot.json
//
// This wrapper exists so the export is reproducible from the repository. It
// performs SELECTs only; it never writes to the database. Run it whenever the
// live curriculum or question bank changes, then re-run:
//
//   bun run scripts/compliance/validate.ts
//   bun run scripts/compliance/report.ts

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env["SUPABASE_DB_URL"];
if (!url) {
  console.error("SUPABASE_DB_URL is not set — the exporter needs a read-only database URL.");
  process.exit(1);
}

const sqlPath = resolve(import.meta.dirname, "export-snapshot.sql");
const out = execFileSync("psql", [url, "-At", "-f", sqlPath], { encoding: "utf8" });
JSON.parse(out); // fail loudly if the query returned anything but JSON
const target = resolve(import.meta.dirname, "../../content/compliance/class-10-2026-27.snapshot.json");
writeFileSync(target, out);
console.log(`wrote ${target} (${out.length} bytes)`);
