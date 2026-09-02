import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { isProtectedPath } from "./lib/protected-routes";
import { applySecurityHeaders } from "./lib/security-headers";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Clickjacking / browser-feature hardening on every HTML document response.
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  // `next()` resolves to the middleware context, not a bare Response, so the
  // headers must be applied to `result.response`.
  const result = await next();
  if (result instanceof Response) return applySecurityHeaders(result);
  if (result?.response instanceof Response) applySecurityHeaders(result.response);
  return result;
});


const errorMiddleware = createMiddleware().server(async ({ next, handlerType, request }) => {
  try {
    return await next();
  } catch (error) {
    if (handlerType === "serverFn") {
      throw error;
    }
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    const accept = request.headers.get("accept") ?? "";
    if (!accept.includes("text/html")) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Server-side route gate: anonymous document requests to protected routes are
// answered with a 302 to /auth before any app HTML, JS, or data ships. The
// marker cookie is only a hint for this document-level gate — the real data
// boundary is RLS plus bearer-validated server functions.
const authGateMiddleware = createMiddleware().server(({ next, request }) => {
  if (request.method !== "GET" && request.method !== "HEAD") return next();

  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) return next();

  const url = new URL(request.url);
  if (!isProtectedPath(url.pathname)) return next();

  const cookie = request.headers.get("cookie") ?? "";
  if (/(?:^|;\s*)eduos_session=1(?:;|$)/.test(cookie)) return next();

  return new Response(null, {
    status: 302,
    headers: {
      location: "/auth",
      "cache-control": "no-store",
    },
  });
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware, csrfMiddleware, authGateMiddleware],
}));
