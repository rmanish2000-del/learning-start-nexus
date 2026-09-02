import { createFileRoute } from "@tanstack/react-router";

import { APP_ENV } from "@/lib/environment";

// Uptime/monitoring probe. Deliberately discloses nothing beyond liveness and
// the environment label so it can be polled by an external monitor without
// authentication. No database access, no user data, no secrets.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          JSON.stringify({
            status: "ok",
            environment: APP_ENV,
            time: new Date().toISOString(),
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
