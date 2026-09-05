// Browser-side, privacy-safe request context shared by guidance analytics and
// the feedback form. Nothing here identifies a person: the client id is a
// random value stored on this device only, used for rate limiting and
// duplicate protection.

import { APP_ENV } from "@/lib/environment";
import type { DeviceClass } from "@/lib/feedback-shared";

const CLIENT_ID_KEY = "eduos_client_id";

export const APP_VERSION: string =
  (typeof import.meta !== "undefined"
    ? (import.meta.env?.["VITE_APP_VERSION"] as string | undefined)
    : undefined) ?? `eduos-${APP_ENV}`;

function randomId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/** Stable-per-device random id (never sent anywhere else, never a user id). */
export function clientId(): string {
  if (typeof window === "undefined") return "server000000000";
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing && existing.length >= 8) return existing;
    const fresh = randomId();
    window.localStorage.setItem(CLIENT_ID_KEY, fresh);
    return fresh;
  } catch {
    return randomId();
  }
}

let tabSession: string | null = null;
/** Per-tab random id for funnel stitching; forgotten when the tab closes. */
export function sessionHash(): string {
  if (!tabSession) tabSession = randomId();
  return tabSession;
}

export function deviceClass(width = typeof window === "undefined" ? 1280 : window.innerWidth): DeviceClass {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function viewportLabel(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.innerWidth}x${window.innerHeight}`;
}

/** Coarse browser family only — never the full user-agent string. */
export function browserFamily(ua = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  if (/Edg\//.test(ua)) return "edge";
  if (/OPR\//.test(ua)) return "opera";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/SamsungBrowser\//.test(ua)) return "samsung";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

export function clientContext() {
  return {
    deviceClass: deviceClass(),
    viewport: viewportLabel(),
    browserFamily: browserFamily(),
    appVersion: APP_VERSION,
  };
}
