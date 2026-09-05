// Public Guidance · privacy-safe analytics.
//
// There is no third-party analytics in EduOS. These events are a minimal
// first-party funnel counter written to public.guidance_events through a
// server function. We send ONLY the fields below — never free text, never a
// screenshot, never a learner answer, never an email or any identifier that
// points at a person. The session hash is a random per-tab id, not a user id.

import { z } from "zod";

export const GUIDANCE_EVENTS = [
  "public_page_view",
  "help_opened",
  "help_tab_viewed",
  "explain_page_viewed",
  "what_next_viewed",
  "walkthrough_started",
  "walkthrough_completed",
  "faq_searched",
  "faq_article_opened",
  "feedback_opened",
  "feedback_submitted",
  "contact_opened",
  "cta_clicked",
] as const;

export type GuidanceEventName = (typeof GUIDANCE_EVENTS)[number];

/** Funnel the events roll up into (used by the admin review page). */
export const GUIDANCE_FUNNEL: { step: string; events: GuidanceEventName[] }[] = [
  { step: "Public visit", events: ["public_page_view"] },
  { step: "Help / guidance", events: ["help_opened", "explain_page_viewed", "what_next_viewed"] },
  { step: "Free check", events: ["cta_clicked"] },
  { step: "Signup", events: ["cta_clicked"] },
  { step: "Pilot or diagnostic start", events: ["cta_clicked"] },
];

/** Allowed CTA identifiers — free text is never accepted. */
export const GUIDANCE_CTAS = [
  "free_check",
  "signup",
  "signin",
  "diagnostic_start",
  "pilot_accept",
  "book_demo",
  "contact",
  "help",
] as const;
export type GuidanceCta = (typeof GUIDANCE_CTAS)[number];

export const guidanceEventSchema = z.object({
  name: z.enum(GUIDANCE_EVENTS),
  route: z.string().trim().max(300),
  cta: z.enum(GUIDANCE_CTAS).optional(),
  deviceClass: z.enum(["mobile", "tablet", "desktop"]).optional(),
  viewport: z.string().trim().max(20).optional(),
  browserFamily: z.string().trim().max(40).optional(),
  appVersion: z.string().trim().max(60).optional(),
  sessionHash: z.string().trim().min(8).max(64).optional(),
  isAuthenticated: z.boolean().default(false),
});

export type GuidanceEventInput = z.infer<typeof guidanceEventSchema>;
