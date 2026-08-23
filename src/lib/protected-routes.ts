// Single source of truth for routes behind the _authenticated gate.
// Used by the server-side document gate (start.ts) and the live probe
// on the verification page.
export const PROTECTED_ROUTES = [
  "/dashboard",
  "/learners",
  "/assignments",
  "/admin",
  "/settings",
  "/verification",
  "/home",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}
