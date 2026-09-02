// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
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

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
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
          globPatterns: ["assets/**/*.{js,css,woff2}", "offline.html", "icons/*.png", "favicon.png"],
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
                cacheName: "eduos-static-v1",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
