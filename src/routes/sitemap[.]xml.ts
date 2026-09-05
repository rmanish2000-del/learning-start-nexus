import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/lib/seo";

/**
 * Public, indexable routes only. Authenticated, admin, transactional and
 * token-bearing routes are deliberately absent and carry noindex in their own
 * head(). No <lastmod> is emitted: there is no authoritative per-page
 * modification timestamp to report.
 */
const PATHS = [
  "/",
  "/cbse-class-10-learning-gap-diagnostic",
  "/class-10-maths-diagnostic",
  "/class-10-science-diagnostic",
  "/free-learning-check",
  "/cbse-paper-practice",
  "/parent-guide-learning-gaps",
  "/reassessment-and-evidence",
  "/diagnostic",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
] as const;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...PATHS.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
