import { beforeAll, describe, expect, it } from "vitest";

// The encryption key is HKDF-derived from the service-role key. A fixed test
// value keeps the round-trip deterministic without touching real secrets.
beforeAll(() => {
  process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key-for-crypto";
});

describe("payment credential encryption at rest", () => {
  it("encrypts and decrypts a secret round-trip", async () => {
    const { encryptSecret, decryptSecret } = await import("../payment-credentials.server");
    const stored = encryptSecret("rzp_secret_value_123");
    expect(stored).not.toContain("rzp_secret_value_123");
    expect(stored.startsWith("v1:")).toBe(true);
    expect(decryptSecret(stored)).toBe("rzp_secret_value_123");
  });

  it("produces unique ciphertexts for the same input (random IV)", async () => {
    const { encryptSecret } = await import("../payment-credentials.server");
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("rejects tampered ciphertext", async () => {
    const { encryptSecret, decryptSecret } = await import("../payment-credentials.server");
    const stored = encryptSecret("secret");
    const parts = stored.split(":");
    const ct = Buffer.from(parts[3]!, "base64");
    ct[0] = ct[0]! ^ 0xff;
    parts[3] = ct.toString("base64");
    expect(() => decryptSecret(parts.join(":"))).toThrow();
  });

  it("passes through legacy plaintext values", async () => {
    const { decryptSecret } = await import("../payment-credentials.server");
    expect(decryptSecret("legacy_plaintext_secret")).toBe("legacy_plaintext_secret");
  });
});
