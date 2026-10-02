// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { VitePWA } from "vite-plugin-pwa";

// Safe PWA Phase 1.
//
// The worker caches PUBLIC STATIC ASSETS ONLY. Everything personal —
// /api/*, dashboards, reports, learner data, assessments, payments, auth and
// Supabase — is denied by both the navigation deny-list and the runtime
// handler allow-list below, so no PII or token can ever reach Cache Storage.
const PRIVATE_PATHS =
  /^\/(api|dashboard|report|learners?|session|assessment|assessments|free-check|diagnostic|parent|payment|payments|checkout|upgrade|auth|admin|settings|interventions|gaps|gap-analysis|home|help|~oauth)(\/|$)/;

// Server routes (e.g. the auth email webhook) read non-VITE_ env vars at
// request time; load them into process.env without exposing them to the client.
Object.assign(process.env, loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), ""));

// Commit SHA baked into the build for /api/public/version. Only the SHA is exposed.
// Resolution order: CI-provided env vars, then the .git directory read as plain
// files (no git binary needed), then the git binary. Anything else → "unknown".
const SHA_RE = /^[0-9a-f]{40}$/;
function shaFromGitFiles(): string | null {
  try {
    const gitDir = path.resolve(import.meta.dirname, ".git");
    const head = readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
    if (SHA_RE.test(head)) return head;
    const ref = head.startsWith("ref: ") ? head.slice(5).trim() : null;
    if (!ref) return null;
    const loose = path.join(gitDir, ref);
    if (existsSync(loose)) return readFileSync(loose, "utf8").trim();
    const packed = readFileSync(path.join(gitDir, "packed-refs"), "utf8");
    const line = packed.split("\n").find((l) => l.endsWith(" " + ref));
    return line ? (line.split(" ")[0] ?? null) : null;
  } catch {
    return null;
  }
}
function buildSha(): string {
  const candidates = [
    process.env["BUILD_SHA"],
    process.env["COMMIT_SHA"],
    process.env["GITHUB_SHA"],
    process.env["CF_PAGES_COMMIT_SHA"],
    process.env["WORKERS_CI_COMMIT_SHA"],
    process.env["VERCEL_GIT_COMMIT_SHA"],
    shaFromGitFiles(),
  ];
  try {
    candidates.push(
      execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim(),
    );
  } catch {
    // git binary unavailable in this build environment
  }
  return (
    candidates.map((c) => c?.trim().toLowerCase()).find((c) => c && SHA_RE.test(c)) ?? "unknown"
  );
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: { __BUILD_SHA__: JSON.stringify(buildSha()) },
    resolve: {
      alias: {
        // React Email pulls htmlparser2 -> entities; pin every import to the
        // hoisted v4.5.0 copy (v5+ removed ./lib/decode.js and breaks SSR).
        "entities/lib/decode.js": path.resolve(
          import.meta.dirname,
          "node_modules/entities/lib/decode.js",
        ),
        "entities/lib/encode.js": path.resolve(
          import.meta.dirname,
          "node_modules/entities/lib/encode.js",
        ),
        entities: path.resolve(import.meta.dirname, "node_modules/entities"),
      },
    },
    plugins: [
      mcpPlugin(),
      VitePWA({
        strategies: "generateSW",
        // "prompt", not "autoUpdate": autoUpdate forces skipWaiting/clientsClaim
        // into the generated worker, which swaps the build under a learner
        // mid-assessment. Activation must stay user-controlled (AC-13/AC-14).
        registerType: "prompt",
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        // TanStack Start emits the browser bundle to dist/client.
        outDir: "dist/client",
        manifest: false, // public/manifest.webmanifest is the approved source of truth.
        includeAssets: [],
        workbox: {
          // Only fingerprinted build output and the offline shell are precached.
          globPatterns: [
            "assets/**/*.{js,css,woff2}",
            "offline.html",
            "icons/*.png",
            "favicon.png",
          ],
          globIgnores: ["**/_server/**", "**/api/**"],
          // No navigateFallback: a precache-bound navigation route is cache-first
          // and would serve the offline shell to online visitors. HTML is always
          // fetched from the network; the offline shell is only a failure fallback.
          navigateFallback: null,
          importScripts: ["/sw-update.js"],
          cleanupOutdatedCaches: true,
          skipWaiting: false,
          clientsClaim: false,
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              // Documents: network-only, never cached (no PII, tokens or reports
              // can enter Cache Storage). When the network fails, the precached
              // static offline shell is served instead.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkOnly",
              options: {
                precacheFallback: { fallbackURL: "/offline.html" },
              },
            },
            {
              // Public static assets only; never a document, never an API call.
              urlPattern: ({ request, url, sameOrigin }) =>
                Boolean(sameOrigin) &&
                !PRIVATE_PATHS.test(url.pathname) &&
                ["style", "script", "font", "image"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "eduos-static-v2",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
