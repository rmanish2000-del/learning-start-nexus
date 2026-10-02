import { createFileRoute } from "@tanstack/react-router";

declare const __BUILD_SHA__: string;

// Build identity probe. Exposes only the git commit SHA the build was made
// from (or "unknown"). No database access, no user data, no secrets.
const SHA = /^[0-9a-f]{40}$/.test(typeof __BUILD_SHA__ === "string" ? __BUILD_SHA__ : "")
  ? __BUILD_SHA__
  : "unknown";

export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify({ sha: SHA }), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }),
    },
  },
});
