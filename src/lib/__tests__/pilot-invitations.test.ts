// Pilot invitations must be single-use, expiring, identity-bound and strictly
// non-commercial.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PROTECTED_ROUTES } from "../protected-routes";
import {
  INVITE_MAX_VALID_DAYS,
  createPilotInvitationSchema,
  invitationState,
  invitationTokenSchema,
  maskEmail,
} from "../pilot-invitations-shared";

const server = readFileSync("src/lib/pilot-invitations.server.ts", "utf8");
const functions = readFileSync("src/lib/pilot-invitations.functions.ts", "utf8");
const page = readFileSync("src/routes/pilot-invite.$token.tsx", "utf8");

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

describe("invitation state machine", () => {
  it("is valid while unaccepted, unrevoked and unexpired", () => {
    expect(invitationState({ revoked_at: null, accepted_at: null, expires_at: future })).toBe("valid");
  });

  it("reports acceptance", () => {
    expect(invitationState({ revoked_at: null, accepted_at: past, expires_at: future })).toBe("accepted");
  });

  it("expires on time", () => {
    expect(invitationState({ revoked_at: null, accepted_at: null, expires_at: past })).toBe("expired");
  });

  it("revocation wins over everything else", () => {
    expect(invitationState({ revoked_at: past, accepted_at: past, expires_at: future })).toBe("revoked");
  });
});

describe("invitation contracts", () => {
  it("caps how long a link stays usable", () => {
    expect(INVITE_MAX_VALID_DAYS).toBe(30);
    expect(() =>
      createPilotInvitationSchema.parse({
        parentEmail: "a@b.com",
        days: 60,
        reason: "Pilot cohort 1",
        validDays: INVITE_MAX_VALID_DAYS + 1,
      }),
    ).toThrow();
  });

  it("requires an email and a reason", () => {
    expect(() =>
      createPilotInvitationSchema.parse({ parentEmail: "", days: 60, reason: "", validDays: 7 }),
    ).toThrow();
  });

  it("rejects a trivially short token", () => {
    expect(() => invitationTokenSchema.parse({ token: "abc" })).toThrow();
  });

  it("never discloses the full invited address in a preview", () => {
    expect(maskEmail("parent@example.com")).toBe("pa••••@example.com");
  });
});

describe("invitation safety", () => {
  it("stores only a hash of the link token", () => {
    expect(server).toContain('crypto.subtle.digest("SHA-256"');
    expect(server).toContain("token_hash");
    expect(server).not.toMatch(/insert\([^)]*token:\s/);
  });

  it("claims the link with a conditional update so it can be used once", () => {
    expect(server).toMatch(/\.is\("accepted_at", null\)/);
    expect(server).toMatch(/\.is\("revoked_at", null\)/);
  });

  it("binds acceptance to the invited email", () => {
    expect(server).toContain("row.parent_email.trim().toLowerCase()");
  });

  it("never writes an order, payment, entitlement or invoice", () => {
    for (const table of [
      "parent_orders",
      "parent_entitlements",
      "payment_credentials",
      "payment_events",
      "invoices",
    ]) {
      expect(server).not.toContain(`from("${table}")`);
    }
    expect(server).not.toMatch(/amount_paise|razorpay|discount/i);
  });

  it("creates no new auth user, profile, role, family or organisation", () => {
    expect(server).not.toContain("auth.admin.createUser");
    expect(server).not.toMatch(/from\("(profiles|user_roles|organizations|orgs)"\)\s*\n?\s*\.insert/);
  });

  it("keeps create and revoke admin-only and accept authenticated", () => {
    expect(functions.match(/requireAnyRole\(context\.supabase, context\.userId, \["admin"\]\)/g)?.length).toBe(3);
    expect(functions).toContain("acceptPilotInvitationFn");
    expect(functions).toMatch(/acceptPilotInvitationFn[\s\S]*requireSupabaseAuth/);
  });
});

describe("invitation landing page", () => {
  it("is public, not behind the workspace gate", () => {
    expect(PROTECTED_ROUTES).not.toContain("/pilot-invite");
  });

  it("offers Google sign-in and is not indexed", () => {
    expect(page).toContain('signInWithOAuth("google"');
    expect(page).toContain('{ name: "robots", content: "noindex" }');
  });
});
