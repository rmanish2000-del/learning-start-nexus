// P0 regression tests for the platform-owner capability.
//
// Every platform-level server function must gate on requirePlatformOwner —
// the `admin` role is held by every centre admin and is never sufficient.
// These tests assert the access shape of the code and the migration, so a
// future edit that falls back to a role check fails the suite.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  isPlatformOwnerEmail,
  isPlatformOwnerUser,
  isPlatformOwnerPath,
  PLATFORM_OWNER_EMAIL,
} from "../platform-owner-shared";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("isPlatformOwnerUser", () => {
  it("requires the exact owner email and a confirmed email", () => {
    const at = "2026-01-01T00:00:00Z";
    expect(isPlatformOwnerUser({ email: "rmanish2000@gmail.com", email_confirmed_at: at })).toBe(true);
    expect(isPlatformOwnerUser({ email: "rmanish2000@gmail.com", email_confirmed_at: null })).toBe(false);
    expect(isPlatformOwnerUser({ email: "rmanish2000@gmail.com" })).toBe(false);
    expect(isPlatformOwnerUser({ email: "centre.admin@example.test", email_confirmed_at: at })).toBe(false);
    expect(isPlatformOwnerUser(null)).toBe(false);
  });
});

describe("isPlatformOwnerEmail", () => {
  it("accepts only the owner, case- and whitespace-insensitively", () => {
    expect(PLATFORM_OWNER_EMAIL).toBe("rmanish2000@gmail.com");
    expect(isPlatformOwnerEmail("rmanish2000@gmail.com")).toBe(true);
    expect(isPlatformOwnerEmail("  RManish2000@Gmail.com ")).toBe(true);
    expect(isPlatformOwnerEmail("rmanish2000+x@gmail.com")).toBe(false);
    expect(isPlatformOwnerEmail("anita.deshmukh@meridiancoaching.test")).toBe(false);
    expect(isPlatformOwnerEmail("")).toBe(false);
    expect(isPlatformOwnerEmail(null)).toBe(false);
    expect(isPlatformOwnerEmail(undefined)).toBe(false);
  });

  it("honours a configured override exactly", () => {
    expect(isPlatformOwnerEmail("owner@staging.example", "owner@staging.example")).toBe(true);
    expect(isPlatformOwnerEmail("rmanish2000@gmail.com", "owner@staging.example")).toBe(false);
  });
});

describe("platform-owner paths", () => {
  it("covers every platform-level route and nothing a centre admin needs", () => {
    for (const p of [
      "/payment-settings",
      "/payment-settings/x",
      "/pilot-access",
      "/feedback-review",
      "/payment-audit",
    ]) {
      expect(isPlatformOwnerPath(p)).toBe(true);
    }
    for (const p of [
      "/dashboard",
      "/learners",
      "/assessments",
      "/admin",
      "/settings",
      "/quick-start",
      "/help",
    ]) {
      expect(isPlatformOwnerPath(p)).toBe(false);
    }
  });
});

describe("server functions gate on the platform owner", () => {
  const ownerGated: Array<[string, string[]]> = [
    [
      "src/lib/payment-settings.functions.ts",
      [
        "getPaymentSettingsFn",
        "savePaymentSettingsFn",
        "clearPaymentSettingsFn",
        "listPaymentAuditFn",
        "testPaymentSettingsFn",
        "getWebhookStatusFn",
      ],
    ],
    [
      "src/lib/pilot-access.functions.ts",
      ["listPilotGrantsFn", "grantPilotAccessFn", "extendPilotAccessFn", "revokePilotAccessFn"],
    ],
    [
      "src/lib/pilot-invitations.functions.ts",
      ["createPilotInvitationFn", "listPilotInvitationsFn", "revokePilotInvitationFn"],
    ],
    ["src/lib/payment-audit.functions.ts", ["getPaymentAuditFn"]],
  ];

  for (const [file, fns] of ownerGated) {
    it(`${file}: every platform function calls requirePlatformOwner before its handler body`, () => {
      const src = read(file);
      expect(src).toContain("requirePlatformOwner");
      // No platform function may fall back to the shared admin role.
      expect(src).not.toMatch(/requireAnyRole\([^)]*\["admin"\]\)/);
      for (const fn of fns) {
        const start = src.indexOf(`export const ${fn} =`);
        expect(start, fn).toBeGreaterThan(-1);
        const next = src.indexOf("export const ", start + 1);
        const body = src.slice(start, next === -1 ? undefined : next);
        expect(body, `${fn} must call requirePlatformOwner`).toContain(
          "await requirePlatformOwner(context)",
        );
      }
    });
  }

  it("centre approval is owner-only while learner import stays centre-scoped", () => {
    const src = read("src/lib/centre-onboarding.functions.ts");
    const approve = src.slice(
      src.indexOf("export const approveCentreLead"),
      src.indexOf("export const importLearners"),
    );
    expect(approve).toContain("await requirePlatformOwner(context)");
    expect(approve).not.toContain('requireAnyRole(context.supabase, context.userId, ["admin"])');
    const importBody = src.slice(src.indexOf("export const importLearners"));
    expect(importBody).toContain("callerOrgId(context.supabase, context.userId)");
  });

  it("feedback review resolves the owner, not the admin role", () => {
    const src = read("src/lib/feedback.functions.ts");
    expect(src).toContain("requirePlatformOwner");
    expect(src).not.toContain('["admin"]');
  });

  it("the server gate re-validates with the auth server, requires a confirmed email and returns a generic 403", () => {
    const src = read("src/lib/platform-owner.server.ts");
    expect(src).toContain("auth.getUser()");
    expect(src).toContain("isPlatformOwnerUser(data.user)");
    expect(src).toContain('new Response("Forbidden", { status: 403 })');
    expect(src).not.toContain("process.env");
    expect(src).not.toContain("context.claims");
    expect(src).not.toMatch(/data\.(email|ownerEmail)/);
  });
});

describe("client route gate and navigation", () => {
  it("the authenticated layout computes platformOwner from the verified user and guards owner paths first", () => {
    const src = read("src/routes/_authenticated/route.tsx");
    expect(src).toContain("isPlatformOwnerUser(data.user)");
    expect(src).toContain("isPlatformOwnerPath(location.pathname) && !platformOwner");
    expect(src).toContain("platformOwner,");
    // Audit surfaces are no longer open to every admin.
    expect(src).toContain(
      'isAuditPath(location.pathname) && !platformOwner && role !== "reviewer"',
    );
    expect(src).not.toMatch(/isAuditPath\(location\.pathname\) && role !== "admin"/);
  });

  it("owner-only nav items are flagged, so they are absent from the DOM for centre admins", () => {
    const src = read("src/components/app-shell.tsx");
    for (const to of ["/payment-settings", "/pilot-access", "/feedback-review"]) {
      const line = src.split("\n").find((l) => l.includes(`to: "${to}"`));
      expect(line, to).toBeDefined();
      expect(line, to).toContain("ownerOnly: true");
    }
    expect(src).toContain("if (item.ownerOnly && !platformOwner) return false;");
    expect(src).toContain("canSeeNavItem(item, role, platformOwner)");
  });

  it("reviewers no longer reach the payment audit", () => {
    const src = read("src/lib/roles.ts");
    const reviewerBlock = src.slice(
      src.indexOf("REVIEWER_ALLOWED_PATHS"),
      src.indexOf("isReviewerAllowedPath"),
    );
    expect(reviewerBlock).not.toContain("/payment-audit");
  });
});

describe("database: pilot applications and sign-up roles", () => {
  const sql = read("supabase/migrations/20261002050123_4b519290-29d6-4d7b-a837-c369974aa40e.sql");

  it("defines the owner identity in the database and restricts pilot_leads to it", () => {
    expect(sql).toContain("FUNCTION private.is_platform_owner()");
    expect(sql).toContain("= 'rmanish2000@gmail.com'");
    expect(sql).toContain('DROP POLICY IF EXISTS "Admins can read pilot applications"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Admins can update pilot applications"');
    expect(sql).toMatch(
      /pilot_leads FOR SELECT TO authenticated\s+USING \(private\.is_platform_owner\(\)\)/,
    );
    expect(sql).toMatch(
      /pilot_leads FOR UPDATE TO authenticated\s+USING \(private\.is_platform_owner\(\)\)/,
    );
  });

  it("self-service sign-up can only ever claim the parent role", () => {
    const fn = sql.slice(
      sql.indexOf("FUNCTION public.handle_new_user()"),
      sql.indexOf("$function$;"),
    );
    expect(fn).toContain("v_signup_role = 'parent'");
    expect(fn).toContain("v_provisioned AND v_signup_role IN");
    expect(fn).not.toMatch(/v_signup_role IN \('parent'/);
  });
});
