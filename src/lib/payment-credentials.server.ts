// Razorpay credential resolution — server only.
//
// Credentials come from one of two sources, in priority order:
//   1. the locked-down `public.payment_credentials` row (admin-managed via
//      the admin payment settings page; readable only by the service role),
//   2. the platform environment secrets (RAZORPAY_KEY_ID / _KEY_SECRET /
//      _WEBHOOK_SECRET).
//
// Secret values never leave this module: callers get either the resolved
// credentials (server-side use) or a masked status object (safe for UI).
//
// Stored secrets are encrypted at rest with AES-256-GCM. The encryption key
// is derived (HKDF-SHA256) from the service-role key, which never leaves the
// server — a raw read of the table returns ciphertext only. Values written
// before encryption shipped are plaintext and are migrated on next save;
// reads transparently accept both formats.

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CredentialSource = "database" | "environment" | "missing";

export type RazorpayCredentials = {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
  source: CredentialSource;
  updatedAt: string | null;
};

export type RazorpayCredentialStatus = {
  configured: boolean;
  mode: "test" | "live" | "unknown";
  source: CredentialSource;
  maskedKeyId: string | null;
  keySecretSet: boolean;
  webhookSecretSet: boolean;
  webhookSecretSource: CredentialSource;
  updatedAt: string | null;
  envKeyId: string | null;
  envMode: "test" | "live" | "unknown";
};

// ---------- encryption at rest (AES-256-GCM, key from HKDF) ----------

const ENC_PREFIX = "v1";

function encryptionKey(): Buffer {
  const master = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!master) throw new Error("Credential encryption key is unavailable.");
  return Buffer.from(hkdfSync("sha256", master, "eduos-payment-credentials", "aes-256-gcm", 32));
}

/** Encrypts a secret for storage. Returns `v1:<iv>:<tag>:<ciphertext>` (base64). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ENC_PREFIX, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(
    ":",
  );
}

/** Decrypts a stored secret. Plaintext (pre-encryption) values pass through. */
export function decryptSecret(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== ENC_PREFIX) return stored;
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString(
    "utf8",
  );
}

// ---------- cache ----------

type CacheEntry = { value: RazorpayCredentials | null; at: number };
const CACHE_TTL_MS = 15_000;
let cache: CacheEntry | null = null;

export function invalidateCredentialCache(): void {
  cache = null;
}

export function maskKeyId(keyId: string): string {
  if (keyId.length <= 8) return "••••";
  return `${keyId.slice(0, 8)}••••${keyId.slice(-4)}`;
}

export function modeForKeyId(keyId: string | null | undefined): "test" | "live" | "unknown" {
  if (!keyId) return "unknown";
  if (keyId.startsWith("rzp_live_")) return "live";
  if (keyId.startsWith("rzp_test_")) return "test";
  return "unknown";
}

async function readStoredRow(): Promise<{
  key_id: string;
  key_secret: string;
  webhook_secret: string | null;
  updated_at: string;
} | null> {
  const { data, error } = await supabaseAdmin
    .from("payment_credentials")
    .select("key_id, key_secret, webhook_secret, updated_at")
    .eq("id", "razorpay")
    .maybeSingle();
  if (error) {
    console.error("[payments] stored credential read failed", error.code, error.message);
    return null;
  }
  return data ?? null;
}

/** Resolves the credentials the gateway calls should use right now. */
export async function resolveRazorpayCredentials(): Promise<RazorpayCredentials | null> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;

  const envKeyId = process.env["RAZORPAY_KEY_ID"] ?? null;
  const envKeySecret = process.env["RAZORPAY_KEY_SECRET"] ?? null;
  const envWebhook = process.env["RAZORPAY_WEBHOOK_SECRET"] ?? null;

  let value: RazorpayCredentials | null = null;
  const stored = await readStoredRow().catch(() => null);

  if (stored?.key_id && stored.key_secret) {
    value = {
      keyId: stored.key_id,
      keySecret: decryptSecret(stored.key_secret),
      webhookSecret: stored.webhook_secret ? decryptSecret(stored.webhook_secret) : envWebhook,
      source: "database",
      updatedAt: stored.updated_at,
    };
  } else if (envKeyId && envKeySecret) {
    value = {
      keyId: envKeyId,
      keySecret: envKeySecret,
      webhookSecret: envWebhook,
      source: "environment",
      updatedAt: null,
    };
  }

  cache = { value, at: now };
  return value;
}

/** Masked, UI-safe view of the current payment configuration. */
export async function razorpayCredentialStatus(): Promise<RazorpayCredentialStatus> {
  const envKeyId = process.env["RAZORPAY_KEY_ID"] ?? null;
  const envWebhook = Boolean(process.env["RAZORPAY_WEBHOOK_SECRET"]);
  const resolved = await resolveRazorpayCredentials();

  if (!resolved) {
    return {
      configured: false,
      mode: "unknown",
      source: "missing",
      maskedKeyId: null,
      keySecretSet: false,
      webhookSecretSet: envWebhook,
      webhookSecretSource: envWebhook ? "environment" : "missing",
      updatedAt: null,
      envKeyId: envKeyId ? maskKeyId(envKeyId) : null,
      envMode: modeForKeyId(envKeyId),
    };
  }

  const storedWebhook = resolved.source === "database" && Boolean(resolved.webhookSecret);
  return {
    configured: true,
    mode: modeForKeyId(resolved.keyId),
    source: resolved.source,
    maskedKeyId: maskKeyId(resolved.keyId),
    keySecretSet: true,
    webhookSecretSet: Boolean(resolved.webhookSecret),
    webhookSecretSource: storedWebhook ? "database" : envWebhook ? "environment" : "missing",
    updatedAt: resolved.updatedAt,
    envKeyId: envKeyId ? maskKeyId(envKeyId) : null,
    envMode: modeForKeyId(envKeyId),
  };
}

// ---------- audit trail ----------

export type CredentialAuditAction = "save" | "clear" | "test";

/** Append-only audit record of every credential change and mode/source switch. */
async function recordCredentialAudit(
  action: CredentialAuditAction,
  actorId: string | null,
  prev: RazorpayCredentialStatus,
): Promise<void> {
  invalidateCredentialCache();
  const next = await razorpayCredentialStatus();
  const { error } = await supabaseAdmin.from("payment_credential_audit").insert({
    actor_id: actorId,
    action,
    prev_mode: prev.mode,
    new_mode: next.mode,
    prev_source: prev.source,
    new_source: next.source,
    masked_key_id: next.maskedKeyId,
  });
  if (error) {
    // Audit failure must never block a payment change, but it is loud in logs.
    console.error("[payments] credential audit write failed", error.code, error.message);
  }
  invalidateCredentialCache();
}

export type CredentialAuditEntry = {
  id: string;
  action: CredentialAuditAction;
  prevMode: string;
  newMode: string;
  prevSource: string;
  newSource: string;
  maskedKeyId: string | null;
  createdAt: string;
};

/** Recent audit entries for the admin settings page. No secrets — masked only. */
export async function listCredentialAudit(limit = 20): Promise<CredentialAuditEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("payment_credential_audit")
    .select("id, action, prev_mode, new_mode, prev_source, new_source, masked_key_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[payments] credential audit read failed", error.code, error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action as CredentialAuditAction,
    prevMode: row.prev_mode,
    newMode: row.new_mode,
    prevSource: row.prev_source,
    newSource: row.new_source,
    maskedKeyId: row.masked_key_id,
    createdAt: row.created_at,
  }));
}

// ---------- writes ----------

export type SaveCredentialInput = {
  keyId: string;
  keySecret: string;
  webhookSecret?: string | null;
  updatedBy: string;
};

/** Stores admin-supplied credentials. Values are write-only from the UI. */
export async function saveRazorpayCredentials(input: SaveCredentialInput): Promise<void> {
  const keyId = input.keyId.trim();
  const keySecret = input.keySecret.trim();
  const webhookSecret = (input.webhookSecret ?? "").trim();

  if (!/^rzp_(test|live)_[A-Za-z0-9]{6,}$/.test(keyId)) {
    throw new Error("Key id must look like rzp_test_… or rzp_live_…");
  }
  if (keySecret.length < 8) throw new Error("Key secret looks too short.");
  if (webhookSecret && webhookSecret.length < 8) throw new Error("Webhook secret looks too short.");

  const prev = await razorpayCredentialStatus();

  const { error } = await supabaseAdmin.from("payment_credentials").upsert(
    {
      id: "razorpay",
      key_id: keyId,
      key_secret: encryptSecret(keySecret),
      webhook_secret: webhookSecret ? encryptSecret(webhookSecret) : null,
      updated_by: input.updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    console.error("[payments] credential save failed", error.code, error.message);
    throw new Error("We couldn't save those payment keys. Please try again.");
  }
  invalidateCredentialCache();
  await recordCredentialAudit("save", input.updatedBy, prev);
}

/** Removes the stored override so the environment secrets take over again. */
export async function clearRazorpayCredentials(actorId: string | null): Promise<void> {
  const prev = await razorpayCredentialStatus();
  const { error } = await supabaseAdmin.from("payment_credentials").delete().eq("id", "razorpay");
  if (error) {
    console.error("[payments] credential clear failed", error.code, error.message);
    throw new Error("We couldn't clear the stored payment keys. Please try again.");
  }
  invalidateCredentialCache();
  await recordCredentialAudit("clear", actorId, prev);
}

/** Live check against Razorpay with the currently active credentials. */
export async function testRazorpayCredentials(
  actorId: string | null,
): Promise<{ ok: boolean; message: string }> {
  const prev = await razorpayCredentialStatus();
  const creds = await resolveRazorpayCredentials();
  if (!creds) return { ok: false, message: "No payment keys are configured." };
  try {
    const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    void recordCredentialAudit("test", actorId, prev);
    if (res.status === 401) return { ok: false, message: "Razorpay rejected these keys (401)." };
    if (!res.ok) return { ok: false, message: `Razorpay responded with ${res.status}.` };
    return {
      ok: true,
      message: `Razorpay accepted the ${modeForKeyId(creds.keyId)} keys.`,
    };
  } catch {
    return { ok: false, message: "Could not reach Razorpay. Please try again." };
  }
}
