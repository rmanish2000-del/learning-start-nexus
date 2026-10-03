// Deterministic release fingerprint: SHA-256 over the sorted relative paths and
// contents of the source tree that determines the shipped build. Needs no git,
// no network and no environment variables, so the same source always yields
// the same fingerprint locally and on the hosting build machine.
// Run directly to print the expected fingerprint: `node scripts/release-fingerprint.mjs`.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INPUTS = [
  "src",
  "public",
  "supabase/migrations",
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
];
// Generated or environment-specific files that may legitimately differ per machine.
const EXCLUDE = [/^src\/routeTree\.gen\.ts$/, /(^|\/)\.DS_Store$/, /(^|\/)node_modules\//];

function walk(root, rel, out) {
  const abs = path.join(root, rel);
  if (!existsSync(abs)) return;
  if (statSync(abs).isDirectory()) {
    for (const name of readdirSync(abs)) walk(root, rel ? `${rel}/${name}` : name, out);
  } else if (!EXCLUDE.some((re) => re.test(rel))) {
    out.push(rel);
  }
}

export function releaseFingerprint(root) {
  const files = [];
  for (const input of INPUTS) walk(root, input, files);
  files.sort();
  const hash = createHash("sha256");
  for (const rel of files) {
    const body = readFileSync(path.join(root, rel)).toString("latin1").replace(/\r\n/g, "\n");
    hash.update(rel).update("\0").update(body, "latin1").update("\0");
  }
  const fingerprint = hash.digest("hex");
  return { releaseId: `eduos-${fingerprint.slice(0, 12)}`, fingerprint, files: files.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  console.log(JSON.stringify(releaseFingerprint(root)));
}
