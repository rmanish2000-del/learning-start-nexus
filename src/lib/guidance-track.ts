// Fire-and-forget guidance analytics from the browser.
// Never blocks or breaks a journey; never carries free text or personal data.

import { clientContext, sessionHash } from "@/lib/client-context";
import { recordGuidanceEventFn } from "@/lib/feedback.functions";
import type { GuidanceCta, GuidanceEventName } from "@/lib/guidance-analytics";
import { currentAttribution } from "@/lib/utm";

export function trackGuidance(
  name: GuidanceEventName,
  options: { route?: string; cta?: GuidanceCta } = {},
): void {
  if (typeof window === "undefined") return;
  const ctx = clientContext();
  const attribution = currentAttribution();
  const payload = {
    name,
    route: options.route ?? window.location.pathname,
    ...(options.cta ? { cta: options.cta } : {}),
    deviceClass: ctx.deviceClass,
    ...(ctx.viewport ? { viewport: ctx.viewport } : {}),
    browserFamily: ctx.browserFamily,
    appVersion: ctx.appVersion,
    sessionHash: sessionHash(),
    isAuthenticated: isSignedIn(),
    ...attribution,
  };
  void recordGuidanceEventFn({ data: payload }).catch(() => undefined);
}


/** Coarse anonymous/signed-in flag from the non-sensitive session marker cookie. */
function isSignedIn(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)eduos_session=1(?:;|$)/.test(document.cookie);
}
