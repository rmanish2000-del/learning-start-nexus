import { describe, expect, it } from "vitest";

import {
  MAX_MESSAGE,
  detectSensitive,
  feedbackSubmissionSchema,
} from "@/lib/feedback-shared";
import { GUIDANCE_EVENTS, guidanceEventSchema } from "@/lib/guidance-analytics";
import { PUBLIC_FAQ, PUBLIC_GUIDANCE, guidanceForRoute, isGuidedPublicRoute, searchFaq } from "@/lib/public-guidance";

const base = {
  category: "bug" as const,
  message: "The diagnostic start button does nothing on my phone.",
  emailConsent: false,
  route: "/diagnostic",
  deviceClass: "mobile" as const,
  clientId: "abcdefgh1234",
};

describe("feedback privacy guards", () => {
  it("rejects phone numbers", () => {
    expect(detectSensitive("call me on 9876543210")).toBe("a phone number");
    expect(feedbackSubmissionSchema.safeParse({ ...base, message: "call me on 9876543210 please" }).success).toBe(false);
  });

  it("rejects card numbers, PINs and tokens", () => {
    expect(detectSensitive("4111 1111 1111 1111")).not.toBeNull();
    expect(detectSensitive("my pin: 4821")).not.toBeNull();
    expect(detectSensitive("eyJhbGciOiJIUzI1NiJ9abc")).not.toBeNull();
    expect(detectSensitive("rzp_live_abc123456")).not.toBeNull();
  });

  it("accepts ordinary feedback", () => {
    expect(detectSensitive(base.message)).toBeNull();
    expect(feedbackSubmissionSchema.safeParse(base).success).toBe(true);
  });

  it("enforces length limits", () => {
    expect(feedbackSubmissionSchema.safeParse({ ...base, message: "too short" }).success).toBe(false);
    expect(feedbackSubmissionSchema.safeParse({ ...base, message: "a".repeat(MAX_MESSAGE + 1) }).success).toBe(false);
  });

  it("only accepts allowed screenshot types", () => {
    const bad = feedbackSubmissionSchema.safeParse({
      ...base,
      screenshot: { contentType: "application/pdf", base64: "AAAA" },
    });
    expect(bad.success).toBe(false);
  });
});

describe("guidance analytics contract", () => {
  it("has exactly the thirteen approved events", () => {
    expect(GUIDANCE_EVENTS).toHaveLength(13);
  });

  it("rejects unknown events and free-text CTAs", () => {
    expect(guidanceEventSchema.safeParse({ name: "not_an_event", route: "/" }).success).toBe(false);
    expect(guidanceEventSchema.safeParse({ name: "help_opened", route: "/", cta: "whatever" }).success).toBe(false);
    expect(guidanceEventSchema.safeParse({ name: "help_opened", route: "/", cta: "free_check" }).success).toBe(true);
  });
});

describe("route-aware guidance", () => {
  it("resolves the home page exactly and other routes by prefix", () => {
    expect(guidanceForRoute("/")?.match).toBe("/");
    expect(guidanceForRoute("/diagnostic/session/abc")?.match).toBe("/diagnostic");
    expect(guidanceForRoute("/dashboard")).toBeNull();
    expect(isGuidedPublicRoute("/about")).toBe(true);
  });

  it("only links to real public routes", () => {
    const allowed = ["/", "/about", "/contact", "/privacy", "/terms", "/diagnostic", "/auth", "/pilot-invite", "/free-check", "/upgrade"];
    for (const guidance of PUBLIC_GUIDANCE) {
      for (const step of guidance.next) {
        expect(allowed).toContain(step.to);
      }
    }
  });

  it("states production pricing accurately", () => {
    const pricing = PUBLIC_FAQ.find((f) => f.id === "pricing")!.answer.join(" ");
    expect(pricing).toContain("₹0");
    expect(pricing).toContain("₹199");
    expect(pricing).toContain("₹2,999");
    expect(pricing).toContain("₹2,800");
  });

  it("searches the FAQ", () => {
    expect(searchFaq("pricing").length).toBeGreaterThan(0);
    expect(searchFaq("zzzzz")).toHaveLength(0);
    expect(searchFaq("")).toHaveLength(PUBLIC_FAQ.length);
  });
});
