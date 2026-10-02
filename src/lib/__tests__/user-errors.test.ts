import { describe, expect, it } from "vitest";
import { z } from "zod";

import { friendlyErrorMessage, parseZodIssues, zodFieldErrors } from "../user-errors";
import { registerParentSchema } from "../parent-account-shared";

function zodError(schema: z.ZodTypeAny, value: unknown): Error {
  try {
    schema.parse(value);
    throw new Error("expected a validation failure");
  } catch (error) {
    return error as Error;
  }
}

describe("friendlyErrorMessage", () => {
  it("never surfaces the raw Zod JSON array for a bad parent profile", () => {
    const error = zodError(registerParentSchema, { fullName: "", email: "", phone: "" });
    const message = friendlyErrorMessage(error);
    expect(message).not.toContain("{");
    expect(message).not.toContain("[");
    expect(message).not.toContain('"code"');
    expect(message).toContain("Enter your full name");
    expect(message).toContain("Enter a valid mobile number");
  });

  it("labels fields when Zod gives a generic issue message", () => {
    const schema = z.object({ fullName: z.string() });
    const message = friendlyErrorMessage(zodError(schema, {}));
    expect(message.toLowerCase()).toContain("full name");
    expect(message).not.toContain("[");
  });

  it("rewrites database and permission text", () => {
    expect(friendlyErrorMessage(new Error("new row violates row-level security policy"))).toMatch(
      /don't have access/i,
    );
    expect(friendlyErrorMessage(new Error('duplicate key value violates unique constraint "x"'))).toMatch(
      /already exists/i,
    );
    expect(friendlyErrorMessage(new Error("JWT expired"))).toMatch(/sign in again/i);
    expect(friendlyErrorMessage(new Error("Failed to fetch"))).toMatch(/connection/i);
  });

  it("passes through short human sentences untouched", () => {
    expect(friendlyErrorMessage(new Error("This assessment is not assigned to you."))).toBe(
      "This assessment is not assigned to you.",
    );
  });

  it("falls back for empty, unknown, or stack-like values", () => {
    expect(friendlyErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(friendlyErrorMessage(new Error("   "), "fallback")).toBe("fallback");
    expect(friendlyErrorMessage(new Error("boom\n    at foo (bar.ts:1:1)"), "fallback")).toBe("fallback");
    expect(friendlyErrorMessage(new Error("x".repeat(400)), "fallback")).toBe("fallback");
  });

  it("never returns raw JSON for object payloads", () => {
    expect(friendlyErrorMessage(new Error('{"code":"invalid_type"}'))).not.toContain("{");
  });
});

describe("parseZodIssues / zodFieldErrors", () => {
  it("returns null for non-Zod text", () => {
    expect(parseZodIssues("Could not save your details.")).toBeNull();
  });

  it("maps issues onto field keys", () => {
    const fields = zodFieldErrors(zodError(registerParentSchema, { fullName: "A", email: "nope", phone: "1" }));
    expect(fields["full name"]).toBe("Enter your full name");
    expect(fields["phone"]).toBe("Enter a valid mobile number");
    expect(fields["email"]).toBe("Enter a valid email");
  });
});
