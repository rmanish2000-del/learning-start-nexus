import { describe, expect, it } from "vitest";

import { normalizeAppEnv } from "../environment";

describe("normalizeAppEnv", () => {
  it("defaults to production when unset or unknown", () => {
    expect(normalizeAppEnv(undefined)).toBe("production");
    expect(normalizeAppEnv("")).toBe("production");
    expect(normalizeAppEnv("prod")).toBe("production");
    expect(normalizeAppEnv("something-else")).toBe("production");
  });

  it("recognises the staging aliases", () => {
    for (const value of ["staging", "STAGING", " sandbox ", "test"]) {
      expect(normalizeAppEnv(value)).toBe("staging");
    }
  });

  it("recognises development aliases", () => {
    for (const value of ["development", "dev", "local"]) {
      expect(normalizeAppEnv(value)).toBe("development");
    }
  });
});
