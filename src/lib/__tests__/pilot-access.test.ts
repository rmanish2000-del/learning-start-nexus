// Pilot access must stay strictly non-commercial: no orders, no payments,
// no invoices, no discounts — so pilot families never enter revenue or
// conversion reporting.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PROTECTED_ROUTES } from "../protected-routes";
import {
  PILOT_MAX_DAYS,
  grantPilotAccessSchema,
  grantStatus,
  startPilotRunSchema,
} from "../pilot-access-shared";

const serverSource = readFileSync("src/lib/pilot-access.server.ts", "utf8");

describe("pilot access — zero commercial footprint", () => {
  it("never writes an order, payment, entitlement or invoice", () => {
    for (const table of [
      "parent_orders",
      "parent_entitlements",
      "payment_credentials",
      "payment_events",
      "invoices",
    ]) {
      expect(serverSource).not.toContain(`from("${table}")`);
    }
  });

  it("does not reference a rupee amount or discount", () => {
    expect(serverSource).not.toMatch(/amount_paise|razorpay|discount/i);
  });
});

describe("pilot access — grant rules", () => {
  it("caps the grant length", () => {
    expect(PILOT_MAX_DAYS).toBe(180);
    expect(() =>
      grantPilotAccessSchema.parse({
        parentEmail: "a@b.com",
        subject: null,
        days: PILOT_MAX_DAYS + 1,
        reason: "Pilot cohort 1",
      }),
    ).toThrow();
  });

  it("requires an email and a reason", () => {
    expect(() =>
      grantPilotAccessSchema.parse({ parentEmail: "", subject: null, days: 30, reason: "" }),
    ).toThrow();
  });

  it("requires learner, book and unit to start a run", () => {
    expect(() => startPilotRunSchema.parse({ bookId: "", unitId: "", learnerId: "" })).toThrow();
  });
});

describe("pilot access — lifecycle status", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();

  it("is active while unexpired and unrevoked", () => {
    expect(grantStatus({ expires_at: future, revoked_at: null })).toBe("active");
  });

  it("expires on time", () => {
    expect(grantStatus({ expires_at: past, revoked_at: null })).toBe("expired");
  });

  it("revocation wins over an unexpired window", () => {
    expect(grantStatus({ expires_at: future, revoked_at: past })).toBe("revoked");
  });
});

describe("pilot access — route protection", () => {
  it("guards the admin grant screen server-side", () => {
    expect(PROTECTED_ROUTES).toContain("/pilot-access");
  });
});
