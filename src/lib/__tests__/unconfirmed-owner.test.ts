import { describe, expect, it } from "vitest";

import { isPlatformOwner } from "../platform-owner.server";
import { isPlatformOwnerUser, PLATFORM_OWNER_EMAIL } from "../platform-owner-shared";

const ctx = (user: Record<string, unknown> | null) =>
  ({
    userId: "u1",
    supabase: { auth: { getUser: async () => ({ data: { user }, error: null }) } },
  }) as never;

describe("unconfirmed owner email is denied", () => {
  it("shared check rejects the owner email without confirmation", () => {
    expect(isPlatformOwnerUser({ email: PLATFORM_OWNER_EMAIL, email_confirmed_at: null })).toBe(
      false,
    );
    expect(isPlatformOwnerUser({ email: PLATFORM_OWNER_EMAIL })).toBe(false);
  });
  it("server gate rejects an unconfirmed owner and accepts a confirmed one", async () => {
    expect(
      await isPlatformOwner(
        ctx({ id: "u1", email: PLATFORM_OWNER_EMAIL, email_confirmed_at: null }),
      ),
    ).toBe(false);
    expect(
      await isPlatformOwner(
        ctx({ id: "u1", email: PLATFORM_OWNER_EMAIL, email_confirmed_at: "2026-01-01" }),
      ),
    ).toBe(true);
  });
  it("server gate rejects a token whose user id differs from the caller", async () => {
    expect(
      await isPlatformOwner(
        ctx({ id: "other", email: PLATFORM_OWNER_EMAIL, email_confirmed_at: "2026-01-01" }),
      ),
    ).toBe(false);
  });
});
