// Deployment-environment detection.
//
// The staging/sandbox project is a separate Lovable project with its own
// database, Auth, Storage and secrets. The only difference in code is the
// VITE_APP_ENV variable, which every environment-aware guard reads from here.
//
//   production (default) — www.eduos.global, live data, live payment keys
//   staging              — isolated sandbox, synthetic data, Razorpay test keys
//   development          — local dev server
//
// Never branch on hostnames: a staging project may be reached through several
// URLs (preview, project URL, custom domain).

export type AppEnv = "production" | "staging" | "development";

function readRaw(): string | undefined {
  // import.meta.env is inlined at build time in both the client and the
  // server bundle; process.env is the escape hatch for scripts and tests.
  const fromVite =
    typeof import.meta !== "undefined"
      ? (import.meta.env?.["VITE_APP_ENV"] as string | undefined)
      : undefined;
  const fromProcess =
    typeof process !== "undefined" ? (process.env?.["APP_ENV"] ?? process.env?.["VITE_APP_ENV"]) : undefined;
  return fromVite ?? fromProcess;
}

export function normalizeAppEnv(value: string | undefined | null): AppEnv {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "staging" || v === "sandbox" || v === "test") return "staging";
  if (v === "development" || v === "dev" || v === "local") return "development";
  return "production";
}

export const APP_ENV: AppEnv = normalizeAppEnv(readRaw());

/** True only in the isolated staging/sandbox project. */
export const IS_STAGING = APP_ENV === "staging";

/** True in production — the only environment allowed to hold live payment keys. */
export const IS_PRODUCTION = APP_ENV === "production";

/** Non-production environments must never be indexed by search engines. */
export const SHOULD_NOINDEX = APP_ENV !== "production";

/** Short label for the staging ribbon and internal reports. */
export const ENV_LABEL: Record<AppEnv, string> = {
  production: "Production",
  staging: "Staging sandbox",
  development: "Development",
};
