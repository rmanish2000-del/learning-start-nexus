// Single, guarded service-worker registration point for EduOS.
//
// Safety rules (Safe PWA Phase 1):
// - Never register in dev, inside an iframe, or on any Lovable preview host —
//   a stale worker there would serve deleted chunks and white-screen the editor.
// - `?sw=off` is a permanent kill switch: it unregisters and returns.
// - The generated worker caches public/static assets only. Every private
//   surface (API, dashboards, reports, auth, payments, Supabase) is excluded
//   in the plugin config, not here.
// - A waiting worker never activates on its own; the user presses "Refresh
//   now", which is the only thing that sends SKIP_WAITING.

const SW_URL = "/sw.js";

// Bumped when the update lifecycle is exercised end to end (AC-13/AC-14).
export const PWA_CLIENT_BUILD = "2026-09-02";

export function shouldRegisterServiceWorker(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.top !== window.self) return false;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return false;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return false;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return false;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return false;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return false;
  return true;
}

export async function unregisterServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
        .map((r) => r.unregister()),
    );
  } catch {
    // Nothing to clean up.
  }
}

type UpdateHandler = (applyUpdate: () => void) => void;

function applyUpdate(worker: ServiceWorker) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  worker.postMessage({ type: "SKIP_WAITING" });
}

/**
 * Registers the generated worker and calls `onNeedRefresh` when a new version
 * is waiting. Activation is always user-controlled — never automatic mid-task.
 */
export async function registerServiceWorker(onNeedRefresh: UpdateHandler): Promise<void> {
  if (!shouldRegisterServiceWorker()) {
    await unregisterServiceWorker();
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    const notify = (worker: ServiceWorker | null) => {
      if (!worker || !navigator.serviceWorker.controller) return;
      onNeedRefresh(() => applyUpdate(worker));
    };
    notify(registration.waiting);
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed") notify(installing);
      });
    });
  } catch {
    // No worker available — the app is fully functional online, so this is
    // never fatal.
  }
}
