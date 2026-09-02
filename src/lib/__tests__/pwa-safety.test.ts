import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { shouldRegisterServiceWorker } from "@/lib/pwa/register-sw";

/**
 * AC-05 / AC-15 release blockers: the service worker must never register in a
 * dev or Lovable preview context, and Cache Storage must never contain a
 * private, personalised or authenticated response.
 */
describe("safe PWA guards", () => {
  it("never registers a service worker outside a production build", () => {
    // vitest runs with import.meta.env.PROD === false.
    expect(shouldRegisterServiceWorker()).toBe(false);
  });

  it("precaches public static assets only", () => {
    const sw = "dist/client/sw.js";
    if (!existsSync(sw)) return; // Only assertable after a production build.
    const source = readFileSync(sw, "utf8");
    const urls = [...source.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]!);
    expect(urls.length).toBeGreaterThan(0);
    const allowed = /^(assets\/|icons\/|favicon\.png$|offline\.html$)/;
    expect(urls.filter((u) => !allowed.test(u))).toEqual([]);
    const forbidden = /(api|dashboard|report|learner|session|assessment|parent|payment|checkout|auth|supabase)/i;
    expect(urls.filter((u) => forbidden.test(u.replace(/^assets\/.*$/, "")))).toEqual([]);
  });

  it("never serves HTML from the cache to an online visitor", () => {
    const sw = "dist/client/sw.js";
    if (!existsSync(sw)) return; // Only assertable after a production build.
    const source = readFileSync(sw, "utf8");
    // A precache-bound navigation route (workbox navigateFallback) is
    // cache-first and would hand the offline shell to online visitors.
    expect(source).not.toMatch(/createHandlerBoundToURL/);
    expect(source).toMatch(/NetworkOnly/);
    expect(source).toMatch(/offline\.html/);
  });

  it("keeps the service worker config free of a navigation fallback route", () => {
    const config = readFileSync("vite.config.ts", "utf8");
    expect(config).toMatch(/navigateFallback:\s*null/);
    expect(config).not.toMatch(/navigateFallbackDenylist/);
  });

  it("never activates a new build without the user pressing Refresh now", () => {
    // registerType "autoUpdate" silently forces skipWaiting + clientsClaim into
    // the generated worker, which swaps the build under a learner mid-session.
    const config = readFileSync("vite.config.ts", "utf8");
    expect(config).toMatch(/registerType:\s*"prompt"/);
    const sw = "dist/client/sw.js";
    if (!existsSync(sw)) return; // Only assertable after a production build.
    const source = readFileSync(sw, "utf8");
    expect(source).not.toMatch(/clientsClaim\(\)/);
    // The only skipWaiting call must be the SKIP_WAITING message handler.
    const skipWaitingCalls = [...source.matchAll(/skipWaiting\(\)/g)].length;
    expect(skipWaitingCalls).toBe(1);
    expect(source).toMatch(/"SKIP_WAITING"===\w+\.data\.type&&self\.skipWaiting\(\)/);
  });
});

