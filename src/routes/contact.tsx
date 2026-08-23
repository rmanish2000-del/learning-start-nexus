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
          "Reach the EduOS team at Brightpath Learning — product questions, privacy requests, and security reports.",
      },
      { property: "og:title", content: "Contact — EduOS" },
      {
        property: "og:description",
        content:
          "Reach the EduOS team at Brightpath Learning — product questions, privacy requests, and security reports.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ContactPage,
});

const CHANNELS = [
  {
    icon: Mail,
    title: "General & product",
    value: "hello@brightpath.education",
    href: "mailto:hello@brightpath.education",
    note: "Demo access, onboarding, and feature questions.",
  },
  {
    icon: ShieldQuestion,
    title: "Privacy & data requests",
    value: "privacy@brightpath.education",
    href: "mailto:privacy@brightpath.education",
    note: "Access, correction, or deletion of learner records.",
  },
  {
    icon: Phone,
    title: "Phone",
    value: "+91 98200 10020",
    href: "tel:+919820010020",
    note: "Weekdays 10:00–18:00 IST.",
  },
];

function ContactPage() {
  return (
    <PublicPageLayout title="Contact us">
      <p className="text-muted-foreground">
        EduOS is operated by Brightpath Learning. Pick the channel that matches your question —
        mail goes to a real inbox monitored by the team running this demo.
      </p>

      <div className="space-y-4">
        {CHANNELS.map((c) => (
          <div key={c.title} className="flex items-start gap-4 rounded-xl border p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <c.icon className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">{c.title}</h2>
              <a href={c.href} className="text-sm font-medium text-primary hover:underline">
                {c.value}
              </a>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <a href={c.href}>Email</a>
            </Button>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <MapPin className="h-4.5 w-4.5 text-primary" /> Mailing address
        </h2>
        <p className="text-muted-foreground">
          Brightpath Learning, 14 Lakeview Road, Kolkata 700029, India
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Parents & guardians</h2>
        <p className="text-muted-foreground">
          To update or withdraw consent for a student's AI tutor access, contact the center directly
          or email{" "}
          <a href="mailto:privacy@brightpath.education" className="font-medium text-primary hover:underline">
            privacy@brightpath.education
          </a>{" "}
          — staff will record the change as a new consent entry so the history stays complete.
        </p>
      </section>
    </PublicPageLayout>
  );
}
