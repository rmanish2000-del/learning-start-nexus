// Single source of truth for routes behind the _authenticated gate.
// Used by the server-side document gate (start.ts) and the live probe
// on the verification page.
export const PROTECTED_ROUTES = [
  "/dashboard",
  "/learners",
  "/assignments",
  "/assessments",
  "/assessment",
  "/assessment-blueprint",
  "/assessment-blueprint-audit",
  "/question-bank",
  "/question-bank-audit",
  "/assessment-builder",
  "/assessment-builder-audit",
  "/diagnostic-engine",
  "/diagnostic-engine-audit",
  "/gap-analysis",
  "/gap-analysis-audit",
  "/session",
  "/admin",
  "/settings",
  "/verification",
  "/assessment-verification",
  "/rls-verification",
  "/assessment-audit",
  "/assessment-proof",
  "/interventions",
  "/sprint-3-audit",
  "/tutor",
  "/sprint-4-audit",
  "/home",
  "/launch-audit",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}
