// Public Guidance · Feedback — server-only implementation.
//
// Writes go through the service-role client because the tables are locked
// (RLS enabled, no policies): nobody can read or write them from a browser.
// Everything stored here is listed explicitly — no learner data, no phone
// numbers, no tokens, no payment details.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  DUPLICATE_WINDOW_MS,
  MAX_SCREENSHOT_BYTES,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  detectSensitive,
  type FeedbackRow,
  type FeedbackSubmission,
} from "./feedback-shared";

const SCREENSHOT_BUCKET = "feedback-screenshots";

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function decodeBase64(base64: string): Uint8Array {
  const clean = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  const binary = atob(clean);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/** Magic-byte check — the declared content type must match the real bytes. */
function sniff(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  const ascii = String.fromCharCode(...bytes.slice(0, 12));
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

export interface SubmitResult {
  ok: true;
  duplicate: boolean;
  id: string;
}

export async function submitFeedback(
  input: FeedbackSubmission & { isAuthenticated: boolean },
): Promise<SubmitResult> {
  const sensitive = detectSensitive(input.message);
  if (sensitive) {
    throw new Error(`Please remove ${sensitive} from your message — we can't store that.`);
  }

  const clientHash = await sha256(`feedback:${input.clientId}`);

  // Rate limiting — per device, per window.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error: countError } = await supabaseAdmin
    .from("feedback_submissions")
    .select("id", { count: "exact", head: true })
    .eq("client_hash", clientHash)
    .gte("created_at", since);
  if (countError) throw new Error("We couldn't send that just now. Please try again.");
  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    throw new Error("Thanks — you've sent a few already. Please try again in a little while.");
  }

  // Duplicate protection — same device, same category, same normalised text.
  const normalised = input.message.trim().toLowerCase().replace(/\s+/g, " ");
  const dedupeHash = await sha256(`${clientHash}:${input.category}:${normalised}`);
  const dupeSince = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const { data: dupe } = await supabaseAdmin
    .from("feedback_submissions")
    .select("id")
    .eq("dedupe_hash", dedupeHash)
    .gte("created_at", dupeSince)
    .limit(1)
    .maybeSingle();
  if (dupe) return { ok: true, duplicate: true, id: dupe.id };

  // Screenshot: validated, size-capped, stored privately.
  let screenshotPath: string | null = null;
  let pendingUpload: { path: string; bytes: Uint8Array; contentType: string } | null = null;
  if (input.screenshot) {
    const bytes = decodeBase64(input.screenshot.base64);
    if (bytes.byteLength > MAX_SCREENSHOT_BYTES) {
      throw new Error("That screenshot is too large. Please attach one under 1.5 MB.");
    }
    const real = sniff(bytes);
    if (!real || real !== input.screenshot.contentType) {
      throw new Error("That file isn't a PNG, JPEG or WebP image.");
    }
    const ext = real === "image/png" ? "png" : real === "image/jpeg" ? "jpg" : "webp";
    pendingUpload = {
      path: `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`,
      bytes,
      contentType: real,
    };
    screenshotPath = pendingUpload.path;
  }

  if (pendingUpload) {
    const { error: uploadError } = await supabaseAdmin.storage
      .from(SCREENSHOT_BUCKET)
      .upload(pendingUpload.path, pendingUpload.bytes, {
        contentType: pendingUpload.contentType,
        upsert: false,
      });
    if (uploadError) {
      screenshotPath = null; // never fail the feedback because of an image
    }
  }

  const { data, error } = await supabaseAdmin
    .from("feedback_submissions")
    .insert({
      category: input.category,
      message: input.message.trim(),
      // Email is stored only when the person explicitly ticked "you may reply".
      contact_email: input.emailConsent && input.contactEmail ? input.contactEmail : null,
      screenshot_path: screenshotPath,
      route: input.route,
      device_class: input.deviceClass,
      viewport: input.viewport ?? null,
      browser_family: input.browserFamily ?? null,
      app_version: input.appVersion ?? null,
      guidance_context: input.guidanceContext ?? null,
      cta_context: input.ctaContext ?? null,
      is_authenticated: input.isAuthenticated,
      client_hash: clientHash,
      dedupe_hash: dedupeHash,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("We couldn't send that just now. Please try again.");
  return { ok: true, duplicate: false, id: data.id };
}

export async function listFeedback(status?: string | undefined, limit = 100): Promise<FeedbackRow[]> {
  let query = supabaseAdmin
    .from("feedback_submissions")
    .select(
      "id, category, message, contact_email, screenshot_path, route, device_class, viewport, browser_family, app_version, guidance_context, cta_context, is_authenticated, status, priority, reproduction, product_area, duplicate_of, business_impact, resolution_notes, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error("We couldn't load feedback right now.");

  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    message: row.message,
    contactEmail: row.contact_email,
    hasScreenshot: Boolean(row.screenshot_path),
    route: row.route,
    deviceClass: row.device_class,
    viewport: row.viewport,
    browserFamily: row.browser_family,
    appVersion: row.app_version,
    guidanceContext: row.guidance_context,
    ctaContext: row.cta_context,
    isAuthenticated: row.is_authenticated,
    status: row.status,
    priority: row.priority,
    reproduction: row.reproduction,
    productArea: row.product_area,
    duplicateOf: row.duplicate_of,
    businessImpact: row.business_impact,
    resolutionNotes: row.resolution_notes,
    createdAt: row.created_at,
  }));
}

export async function updateFeedback(input: {
  id: string;
  status?: string | undefined;
  priority?: string | undefined;
  reproduction?: string | undefined;
  productArea?: string | undefined;
  duplicateOf?: string | null | undefined;
  businessImpact?: string | null | undefined;
  resolutionNotes?: string | null | undefined;
}): Promise<void> {
  const patch: Record<string, string | null> = {};
  if (input.status) patch["status"] = input.status;
  if (input.priority) patch["priority"] = input.priority;
  if (input.reproduction) patch["reproduction"] = input.reproduction;
  if (input.productArea) patch["product_area"] = input.productArea;
  if (input.duplicateOf !== undefined) patch["duplicate_of"] = input.duplicateOf;
  if (input.businessImpact !== undefined) patch["business_impact"] = input.businessImpact;
  if (input.resolutionNotes !== undefined) patch["resolution_notes"] = input.resolutionNotes;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabaseAdmin
    .from("feedback_submissions")
    .update(patch as never)
    .eq("id", input.id);
  if (error) throw new Error("We couldn't save that change.");
}

/** Short-lived signed URL for an admin reviewer; the bucket stays private. */
export async function screenshotUrl(id: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("feedback_submissions")
    .select("screenshot_path")
    .eq("id", id)
    .maybeSingle();
  if (!data?.screenshot_path) return null;
  const { data: signed } = await supabaseAdmin.storage
    .from(SCREENSHOT_BUCKET)
    .createSignedUrl(data.screenshot_path, 300);
  return signed?.signedUrl ?? null;
}

// ---------------------------------------------------------------------------
// Guidance analytics
// ---------------------------------------------------------------------------

export async function recordGuidanceEvent(input: {
  name: string;
  route: string;
  cta?: string | undefined;
  deviceClass?: string | undefined;
  viewport?: string | undefined;
  browserFamily?: string | undefined;
  appVersion?: string | undefined;
  sessionHash?: string | undefined;
  isAuthenticated: boolean;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("guidance_events").insert({
    name: input.name,
    route: input.route,
    cta: input.cta ?? null,
    device_class: input.deviceClass ?? null,
    viewport: input.viewport ?? null,
    browser_family: input.browserFamily ?? null,
    app_version: input.appVersion ?? null,
    session_hash: input.sessionHash ?? null,
    is_authenticated: input.isAuthenticated,
  });
  // Analytics must never break a user journey.
  if (error) console.warn("guidance event dropped", error.code);
}

export interface GuidanceEventCount {
  name: string;
  cta: string | null;
  total: number;
}

export async function guidanceEventCounts(days = 30): Promise<GuidanceEventCount[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("guidance_events")
    .select("name, cta")
    .gte("occurred_at", since)
    .limit(20000);
  if (error) throw new Error("We couldn't load guidance activity.");

  const map = new Map<string, GuidanceEventCount>();
  for (const row of data ?? []) {
    const key = `${row.name}::${row.cta ?? ""}`;
    const found = map.get(key);
    if (found) found.total += 1;
    else map.set(key, { name: row.name, cta: row.cta, total: 1 });
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
