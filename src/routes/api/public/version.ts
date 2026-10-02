import { createFileRoute } from "@tanstack/react-router";

declare const __RELEASE_INFO__: { releaseId: string; fingerprint: string; builtAt: string };

// Release identity probe. Exposes only the release ID, the deterministic
// source-tree fingerprint and the build timestamp. No database access, no user
// data, no secrets, no environment configuration.
const HEX64 = /^[0-9a-f]{64}$/;
const info =
  typeof __RELEASE_INFO__ === "object" && HEX64.test(__RELEASE_INFO__.fingerprint)
    ? __RELEASE_INFO__
    : { releaseId: "unknown", fingerprint: "unknown", builtAt: "unknown" };

export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          JSON.stringify({
            releaseId: info.releaseId,
            fingerprint: info.fingerprint,
            builtAt: info.builtAt,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          },
        ),
    },
  },
});
