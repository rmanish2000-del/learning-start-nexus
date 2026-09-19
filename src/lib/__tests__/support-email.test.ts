import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  SUPPORT_EMAIL,
  UNMONITORED_SENDER_NOTICE,
  paymentSupportMailto,
  supportMailto,
} from "@/lib/support";

/** Any address that must never reappear in a customer-support journey. */
const OBSOLETE_ADDRESSES = [
  "help@eduos.global",
  "hello@eduos.global",
  "info@eduos.global",
  "contact@eduos.global",
  "support@eduos.in",
  "support@eduos.com",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("support email standardisation", () => {
  it("uses support@eduos.global as the single address", () => {
    expect(SUPPORT_EMAIL).toBe("support@eduos.global");
  });

  it("builds an EduOS-prefixed subject", () => {
    expect(supportMailto({ subject: "Sign-in help" })).toContain("EduOS+%E2%80%94+Sign-in+help");
  });

  it("carries the order reference in payment support links", () => {
    const link = paymentSupportMailto("ORD-1234");
    expect(link.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    expect(link).toContain("ORD-1234");
  });

  it("warns recipients that the sender mailbox is unmonitored", () => {
    expect(UNMONITORED_SENDER_NOTICE).toMatch(/unmonitored/i);
    expect(UNMONITORED_SENDER_NOTICE).toContain(SUPPORT_EMAIL);
  });

  it("has no obsolete support address anywhere in the app source", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      const text = readFileSync(file, "utf8");
      for (const bad of OBSOLETE_ADDRESSES) {
        if (text.includes(bad)) offenders.push(`${file}: ${bad}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("wires support into feedback, checkout and sign-in journeys", () => {
    const surfaces = [
      "src/components/feedback-form.tsx",
      "src/routes/diagnostic.checkout.$orderRef.tsx",
      "src/routes/auth.tsx",
    ];
    for (const file of surfaces) {
      expect(readFileSync(file, "utf8")).toContain("@/lib/support");
    }
  });
});
