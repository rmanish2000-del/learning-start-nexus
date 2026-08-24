export type AppRole = "admin" | "educator" | "student" | "reviewer" | "parent";

export function roleHome(role: AppRole): "/dashboard" | "/home" | "/launch-audit" | "/parent" {
  if (role === "student") return "/home";
  if (role === "reviewer") return "/launch-audit";
  if (role === "parent") return "/parent";
  return "/dashboard";
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  educator: "Educator",
  student: "Student",
  reviewer: "Reviewer",
  parent: "Parent",
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
  "/curriculum",
  "/curriculum-audit",
  "/assessment-blueprint",
  "/assessment-blueprint-audit",
  "/question-bank",
  "/question-bank-audit",
  "/assessment-builder",
  "/assessment-builder-audit",
  "/diagnostic-engine",
  "/diagnostic-engine-audit",
] as const;

export function isReviewerAllowedPath(pathname: string): boolean {
  return REVIEWER_ALLOWED_PATHS.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}
