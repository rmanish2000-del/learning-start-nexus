// Public Guidance · Feedback — shared contracts (client + server).
//
// Privacy law for this surface: we persist ONLY what is listed in
// feedbackSubmissionSchema. Learner answers, phone numbers, credentials,
// payment details and auth tokens are rejected before storage — see
// SENSITIVE_PATTERNS. The screenshot is re-encoded in the browser (canvas)
// so camera/EXIF metadata never reaches the server.

import { z } from "zod";

export const FEEDBACK_CATEGORIES = [
  "confusing",
  "bug",
  "idea",
  "pricing",
  "praise",
  "other",
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  confusing: "Something is confusing",
  bug: "Something is broken",
  idea: "Idea or request",
  pricing: "Pricing question",
  praise: "This helped me",
  other: "Something else",
};

export const FEEDBACK_STATUSES = ["new", "triaged", "in_progress", "resolved", "declined"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number];

export const FEEDBACK_REPRODUCTION = ["unknown", "not_reproduced", "reproduced", "not_a_defect"] as const;
export type FeedbackReproduction = (typeof FEEDBACK_REPRODUCTION)[number];

export const FEEDBACK_AREAS = [
  "unclassified",
  "public_site",
  "guidance",
  "signup_auth",
  "diagnostic",
  "study_plan",
  "ai_tutor",
  "reassessment",
  "evidence",
  "pyq_practice",
  "payments",
  "pwa",
] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number];

export const DEVICE_CLASSES = ["mobile", "tablet", "desktop"] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

export const MAX_MESSAGE = 1200;
export const MAX_SCREENSHOT_BYTES = 1_500_000;
export const ALLOWED_SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

// ---------------------------------------------------------------------------
// Sensitive-content rejection
// ---------------------------------------------------------------------------

const SENSITIVE_PATTERNS: { test: RegExp; reason: string }[] = [
  { test: /(?:\+?91[\s-]?)?\b[6-9]\d{9}\b/, reason: "a phone number" },
  { test: /\b(?:\d[ -]?){13,19}\b/, reason: "what looks like a card number" },
  { test: /\b(?:password|passwd|otp)\b|\bpin\s*(?:is\b|:)/i, reason: "a password, PIN or OTP" },
  { test: /\beyJ[A-Za-z0-9_-]{10,}\b/, reason: "an access token" },
  { test: /\b(?:sb_(?:secret|publishable)_|rzp_(?:live|test)_)[A-Za-z0-9_-]{6,}/, reason: "an API key" },
  { test: /\b(?:cvv|card\s*number|upi\s*pin)\b/i, reason: "payment details" },
];

/** Returns a human reason when the text must not be stored, else null. */
export function detectSensitive(text: string): string | null {
  for (const { test, reason } of SENSITIVE_PATTERNS) {
    if (test.test(text)) return reason;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const feedbackSubmissionSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z
    .string()
    .trim()
    .min(10, { message: "Please add at least a sentence so we can act on it." })
    .max(MAX_MESSAGE, { message: `Please keep it under ${MAX_MESSAGE} characters.` })
    .refine((value) => detectSensitive(value) === null, {
      message: "Please remove personal or payment details — we can't store those.",
    }),
  contactEmail: z
    .string()
    .trim()
    .email({ message: "That email doesn't look right." })
    .max(255)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  emailConsent: z.boolean().default(false),
  route: z.string().trim().max(300),
  deviceClass: z.enum(DEVICE_CLASSES),
  viewport: z.string().trim().max(20).optional(),
  browserFamily: z.string().trim().max(40).optional(),
  appVersion: z.string().trim().max(60).optional(),
  guidanceContext: z.string().trim().max(80).optional(),
  ctaContext: z.string().trim().max(80).optional(),
  clientId: z.string().trim().min(8).max(64),
  screenshot: z
    .object({
      contentType: z.enum(ALLOWED_SCREENSHOT_TYPES),
      base64: z.string().max(Math.ceil(MAX_SCREENSHOT_BYTES * 1.4)),
    })
    .optional(),
});

export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;

export const feedbackReviewUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  priority: z.enum(FEEDBACK_PRIORITIES).optional(),
  reproduction: z.enum(FEEDBACK_REPRODUCTION).optional(),
  productArea: z.enum(FEEDBACK_AREAS).optional(),
  duplicateOf: z.string().uuid().nullable().optional(),
  businessImpact: z.string().trim().max(400).nullable().optional(),
  resolutionNotes: z.string().trim().max(2000).nullable().optional(),
});

export const feedbackListSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES).optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export interface FeedbackRow {
  id: string;
  category: FeedbackCategory | string;
  message: string;
  contactEmail: string | null;
  hasScreenshot: boolean;
  route: string;
  deviceClass: string;
  viewport: string | null;
  browserFamily: string | null;
  appVersion: string | null;
  guidanceContext: string | null;
  ctaContext: string | null;
  isAuthenticated: boolean;
  status: FeedbackStatus | string;
  priority: FeedbackPriority | string;
  reproduction: FeedbackReproduction | string;
  productArea: FeedbackArea | string;
  duplicateOf: string | null;
  businessImpact: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

// Rate limiting / duplicate protection (enforced server-side).
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const RATE_LIMIT_MAX = 3;
export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
