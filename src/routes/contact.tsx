import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone, ShieldQuestion } from "lucide-react";

import { PublicPageLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — EduOS" },
      {
        name: "description",
        content:
          "Reach the EduOS team — product questions, privacy requests, and support. Email support@eduos.global or call 9850820909.",
      },
      { property: "og:title", content: "Contact — EduOS" },
      {
        property: "og:description",
        content:
          "Reach the EduOS team — product questions, privacy requests, and support. Email support@eduos.global or call 9850820909.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.eduos.global/contact" },
    ],
    links: [{ rel: "canonical", href: "https://www.eduos.global/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "EduOS",
          url: "https://www.eduos.global",
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
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "customer support",
              email: "support@eduos.global",
              telephone: "+91-9850820909",
              areaServed: "IN",
            },
          ],
        }),
      },
    ],
  }),

  component: ContactPage,
});

const CHANNELS = [
  {
    icon: Mail,
    title: "General & product",
    value: "support@eduos.global",
    href: "mailto:support@eduos.global",
    note: "Demo access, onboarding, and feature questions.",
  },
  {
    icon: ShieldQuestion,
    title: "Privacy & data requests",
    value: "support@eduos.global",
    href: "mailto:support@eduos.global",
    note: "Access, correction, or deletion of learner records.",
  },
  {
    icon: Phone,
    title: "Phone",
    value: "9850820909",
    href: "tel:+919850820909",
    note: "Weekdays 10:00–18:00 IST.",
  },
];

const ADDRESS_LINES = [
  "Tilak Ward",
  "Deori",
  "Sagar",
  "Madhya Pradesh 470226",
  "India",
];


function ContactPage() {
  return (
    <PublicPageLayout title="Contact us">
      <p className="text-muted-foreground">
        Pick the channel that matches your question — mail goes to a real inbox monitored by the
        EduOS team.
      </p>

      <div className="space-y-4">
        {CHANNELS.map((c) => (
          <div
            key={c.title}
            className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:gap-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <c.icon className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">{c.title}</h2>
              <a href={c.href} className="block break-words text-sm font-medium text-primary hover:underline">
                {c.value}
              </a>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0 self-start">
              <a href={c.href}>{c.icon === Phone ? "Call" : "Email"}</a>
            </Button>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <MapPin className="h-4.5 w-4.5 text-primary" /> Mailing address
        </h2>
        <address className="not-italic text-muted-foreground">
          {ADDRESS_LINES.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Parents & guardians</h2>
        <p className="text-muted-foreground">
          To update or withdraw consent for a student's AI tutor access, contact the center directly
          or email{" "}
          <a href="mailto:support@eduos.global" className="font-medium text-primary hover:underline">
            support@eduos.global
          </a>{" "}
          — staff will record the change as a new consent entry so the history stays complete.
        </p>
      </section>

    </PublicPageLayout>
  );
}
