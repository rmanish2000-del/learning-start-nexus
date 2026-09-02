import { describe, expect, it } from "vitest";

import { SECURITY_HEADERS, applySecurityHeaders } from "../security-headers";

function html(): Response {
  return new Response("<html></html>", { headers: { "content-type": "text/html; charset=utf-8" } });
}

describe("security headers", () => {
  it("hardens HTML document responses", () => {
    const res = applySecurityHeaders(html());
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("permissions-policy")).toContain("camera=()");
  });

  it("keeps the Lovable preview embeddable but blocks arbitrary framing", () => {
    const csp = SECURITY_HEADERS["content-security-policy"] ?? "";
    expect(csp).toContain("'self'");
    expect(csp).toContain("https://*.lovable.app");
    expect(csp).not.toContain("*;");
    expect(csp.includes("frame-ancestors *")).toBe(false);
  });

  it("leaves non-HTML responses untouched", () => {
    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    const res = applySecurityHeaders(json);
    expect(res.headers.get("content-security-policy")).toBeNull();
  });

  it("does not weaken payment or media permissions", () => {
    const policy = SECURITY_HEADERS["permissions-policy"] ?? "";
    expect(policy).toContain("payment=(self)");
    expect(policy).toContain("microphone=()");
  });
});
