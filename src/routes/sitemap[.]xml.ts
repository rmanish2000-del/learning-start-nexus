import { createFileRoute } from "@tanstack/react-router";

function renderUrl(origin: string, path: string, lastmod?: string) {
  return `<url><loc>${origin}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const lastmod = new Date().toISOString().split("T")[0];
        const paths: [string, boolean][] = [
          ["/", true],
          ["/about", true],
          ["/privacy", true],
          ["/terms", true],
          ["/contact", true],
          ["/diagnostic", true],
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
          .map(([p, dated]) => renderUrl(origin, p, dated ? lastmod : undefined))
          .join("\n")}\n</urlset>`;

        return new Response(xml, { headers: { "Content-Type": "application/xml" } });
      },
    },
  },
});
