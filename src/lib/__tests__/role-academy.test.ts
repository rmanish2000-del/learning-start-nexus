import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ROLE_ACADEMY } from "@/lib/role-academy";
import { HELP_ARTICLES } from "@/lib/help-center";
import { CONTEXT_HELP } from "@/lib/onboarding";
import {
  isReviewerAllowedPath,
  isStudentAllowedPath,
  REVIEWER_ALLOWED_PATHS,
  STUDENT_ALLOWED_PATHS,
} from "@/lib/roles";
import { isProtectedPath } from "@/lib/protected-routes";

/** Every static route the app actually ships, derived from the route files. */
function existingRoutes(): Set<string> {
  const routes = new Set<string>(["/auth", "/diagnostic", "/"]);
  for (const file of readdirSync("src/routes/_authenticated")) {
    if (!file.endsWith(".tsx") || file === "route.tsx") continue;
    const base = file.replace(/\.tsx$/, "");
    if (base.includes("$")) continue;
    routes.add("/" + base.replace(/\.index$/, "").replace(/\./g, "/"));
  }
  return routes;
}

const ROLES = ["admin", "reviewer", "educator", "parent", "student"] as const;

describe("Role Academy", () => {
  it("covers every role with real, non-empty guidance", () => {
    for (const role of ROLES) {
      const journey = ROLE_ACADEMY[role];
      expect(journey.stages.length).toBeGreaterThan(2);
      expect(journey.scenarios.length).toBeGreaterThan(0);
      for (const stage of journey.stages) {
        expect(stage.purpose.length).toBeGreaterThan(20);
        expect(stage.actions.length).toBeGreaterThan(0);
        expect(stage.outputs.length).toBeGreaterThan(0);
        expect(stage.permissions.length).toBeGreaterThan(10);
        expect(stage.flow.length).toBeGreaterThan(10);
      }
    }
  });

  it("links only to routes that exist in the repository", () => {
    const routes = existingRoutes();
    for (const role of ROLES) {
      for (const stage of ROLE_ACADEMY[role].stages) {
        if (stage.to) expect(routes.has(stage.to), `${role}: ${stage.to}`).toBe(true);
      }
    }
  });

  it("never links a role to a route its own gate forbids", () => {
    for (const stage of ROLE_ACADEMY.student.stages) {
      if (stage.to && stage.to !== "/auth") {
        expect(isStudentAllowedPath(stage.to), stage.to).toBe(true);
      }
    }
    for (const stage of ROLE_ACADEMY.reviewer.stages) {
      if (stage.to) expect(isReviewerAllowedPath(stage.to), stage.to).toBe(true);
    }
    // Reviewers and learners must never be pointed at admin-only surfaces.
    expect(REVIEWER_ALLOWED_PATHS).not.toContain("/pilot-access");
    expect(STUDENT_ALLOWED_PATHS).not.toContain("/pilot-access");
  });

  it("keeps the academy route behind the authenticated gate", () => {
    expect(isProtectedPath("/role-academy")).toBe(true);
    expect(isReviewerAllowedPath("/role-academy")).toBe(true);
    expect(isStudentAllowedPath("/role-academy")).toBe(true);
  });

  it("states the correct ₹199 diagnostic credit and never ₹200", () => {
    const serialised = JSON.stringify(ROLE_ACADEMY);
    expect(serialised).toContain("₹199");
    expect(serialised).not.toContain("₹200");
    expect(serialised).not.toMatch(/\[VERIFY]/);
  });

  it("documents the newer production surfaces", () => {
    const serialised = JSON.stringify(ROLE_ACADEMY);
    for (const route of ["/pilot-access", "/exam-pattern", "/auto-verification", "/sme-review"]) {
      expect(serialised, route).toContain(route);
    }
    for (const page of ["/pilot-access", "/exam-pattern", "/auto-verification", "/sme-review"]) {
      expect(CONTEXT_HELP[page], page).toBeTruthy();
    }
    expect(HELP_ARTICLES.some((a) => a.id === "role-academy")).toBe(true);
    expect(HELP_ARTICLES.some((a) => a.id === "pyq-practice")).toBe(true);
  });

  it("introduces no parallel portal or second onboarding engine", () => {
    const page = readFileSync("src/routes/_authenticated/role-academy.tsx", "utf8");
    expect(page).toContain('from "@/lib/onboarding"');
    expect(page).toContain("requestTour");
    expect(readdirSync("src/routes/_authenticated")).not.toContain("AdminPortal.tsx");
  });
});
