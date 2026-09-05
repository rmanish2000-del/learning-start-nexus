// Single source of truth for public-page metadata.
//
// Every public route builds its head() through `pageHead` so the origin,
// canonical, Open Graph and Twitter tags stay consistent. Non-production
// deployments already add noindex sitewide from __root.tsx; `noindex: true`
// here marks routes that must never be indexed in ANY environment
// (authenticated, transactional, token-bearing).

export const SITE_URL = "https://www.eduos.global";
export const SITE_NAME = "EduOS";

/** Absolute URL for a site path. */
export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface PageHeadOptions {
  /** Site-relative path, e.g. "/free-learning-check" or "/". */
  path: string;
  title: string;
  description: string;
  /** "website" (default), "article", "product". */
  ogType?: "website" | "article" | "product";
  /** Twitter card type. Defaults to summary_large_image. */
  twitterCard?: "summary" | "summary_large_image";
  /** Mark the route non-indexable in every environment. */
  noindex?: boolean;
  /** Extra JSON-LD graph nodes rendered on this page. */
  jsonLd?: Record<string, unknown>[];
}

type MetaTag = Record<string, string>;

export function pageHead(options: PageHeadOptions) {
  const url = absoluteUrl(options.path);
  const meta: MetaTag[] = [
    { title: options.title },
    { name: "description", content: options.description },
    { property: "og:title", content: options.title },
    { property: "og:description", content: options.description },
    { property: "og:type", content: options.ogType ?? "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "en_IN" },
    { name: "twitter:card", content: options.twitterCard ?? "summary_large_image" },
    { name: "twitter:title", content: options.title },
    { name: "twitter:description", content: options.description },
  ];
  if (options.noindex) meta.push({ name: "robots", content: "noindex, nofollow" });

  const head: {
    meta: MetaTag[];
    links?: { rel: string; href: string }[];
    scripts?: { type: string; children: string }[];
  } = { meta };

  // Canonical only on indexable pages; a noindex route should not claim one.
  if (!options.noindex) head.links = [{ rel: "canonical", href: url }];

  if (options.jsonLd && options.jsonLd.length > 0) {
    head.scripts = [
      {
        type: "application/ld+json",
        children: JSON.stringify({ "@context": "https://schema.org", "@graph": options.jsonLd }),
      },
    ];
  }
  return head;
}

/** BreadcrumbList for a page nested under the home page. */
export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** FAQPage — only ever used where the same Q&A is visibly rendered. */
export function faqLd(faqs: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Organization node, kept identical wherever it appears. */
export const organizationLd = {
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  email: "support@eduos.global",
  telephone: "+91-9850820909",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Tilak Ward, Deori",
    addressLocality: "Sagar",
    addressRegion: "Madhya Pradesh",
    postalCode: "470226",
    addressCountry: "IN",
  },
} as const;

/** Product/Offer — only where the price is visibly on the page. */
export function offerLd(input: {
  name: string;
  description: string;
  price: string;
  path: string;
}) {
  return {
    "@type": "Product",
    name: input.name,
    description: input.description,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      price: input.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(input.path),
    },
  };
}
