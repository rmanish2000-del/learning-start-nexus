export type AppRole = "admin" | "educator" | "student" | "reviewer";

export function roleHome(role: AppRole): "/dashboard" | "/home" | "/launch-audit" {
  if (role === "student") return "/home";
  if (role === "reviewer") return "/launch-audit";
  return "/dashboard";
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  educator: "Educator",
  student: "Student",
  reviewer: "Reviewer",
};

// Sprint 5A: reviewers are read-only and limited to audit surfaces. The
// server-side document gate and every write server function already exclude
// the role; this list drives the client-side route gate and navigation.
export const REVIEWER_ALLOWED_PATHS = [
  "/verification",
  "/assessment-verification",
  "/rls-verification",
  "/assessment-audit",
  "/assessment-proof",
  "/sprint-3-audit",
  "/sprint-4-audit",
  "/sprint-5-audit",
  "/launch-audit",
] as const;

export function isReviewerAllowedPath(pathname: string): boolean {
  return REVIEWER_ALLOWED_PATHS.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}
