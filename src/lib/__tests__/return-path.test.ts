import { describe, expect, it } from "vitest";

import { sanitizeReturnPath, validatedReturnPath } from "../return-path";

/** The 16 malicious variants from the Lovable P0 open-redirect package. */
export const MALICIOUS_NEXT = [
  "//evil.com",
  "https://evil.com",
  "/\\evil.com",
  "\\\\evil.com",
  "/\\/evil.com",
  "\\/evil.com",
  "//\\evil.com",
  "/\t/evil.com",
  "/%2F%2Fevil.com",
  "%2F%2Fevil.com",
  "https%3A%2F%2Fevil.com",
  "/%5Cevil.com",
  "/%2F\\evil.com",
  "/\\%2Fevil.com",
  "/%5C/evil.com",
  "/%252F%252Fevil.com",
] as const;

const EXTRA_BAD = [
  "/\n/evil.com",
  "/\r\n/evil.com",
  "/\u0000/evil.com",
  "/.//evil.com",
  "/../../evil.com",
  "javascript:alert(1)",
  "JAVASCRIPT:alert(1)",
  "data:text/html,x",
  " /exam-pattern",
  "evil.com",
  "exam-pattern",
  "",
  "/" + "a".repeat(3000),
];

const SAFE = [
  "/exam-pattern",
  "/exam-pattern?board=cbse#papers",
  "/parent?tab=report&x=1#gaps",
  "/diagnostic/checkout/abc",
  "/learners?q=a%20b",
];

/**
 * How TanStack Router (router-core 1.171.x, `{ ...parentSearch, ...strictSearch }`)
 * builds the search object a route sees: validated output merged OVER the raw
 * search. A validator that omits a rejected key leaves the raw value in place.
 */
const routerMerge = (raw: Record<string, unknown>, validated: Record<string, unknown>) => ({
  ...raw,
  ...validated,
});

describe("sanitizeReturnPath — the only return-path sanitizer", () => {
  it.each([...MALICIOUS_NEXT])("rejects supplied malicious variant %j", (v) => {
    expect(sanitizeReturnPath(v)).toBeUndefined();
  });

  it.each(EXTRA_BAD)("rejects %j", (v) => {
    expect(sanitizeReturnPath(v)).toBeUndefined();
  });

  it("rejects non-strings", () => {
    for (const v of [undefined, null, 42, {}, ["/x"]])
      expect(sanitizeReturnPath(v)).toBeUndefined();
  });

  it.each(SAFE)("keeps valid internal path, query and fragment %j", (v) => {
    expect(sanitizeReturnPath(v)).toBe(v);
  });

  it("bounds decoding: a value that is still encoded after three rounds is not trusted", () => {
    // Four levels of encoding of "//evil.com" — decoded three times it is still
    // "%2F%2Fevil.com", which resolves to a same-origin path, so it is kept as
    // a path and never reaches another origin.
    const quad = "/" + encodeURIComponent(encodeURIComponent(encodeURIComponent("%2F%2Fevil.com")));
    const out = sanitizeReturnPath(quad);
    if (out)
      expect(new URL(out, "https://www.eduos.global").origin).toBe("https://www.eduos.global");
  });
});

describe("signed-in flow: the /auth search validator (root cause)", () => {
  it("reproduces the defect: omitting a rejected `next` lets the raw value survive the router merge", () => {
    // The pre-fix validator on main@9c90805 returned {} for a rejected value.
    const preFix = (search: Record<string, unknown>) => {
      const next = sanitizeReturnPath(search["next"]);
      return next ? { next } : {};
    };
    for (const v of MALICIOUS_NEXT) {
      const seen = routerMerge({ next: v }, preFix({ next: v }));
      expect(seen["next"], v).toBe(v); // the vulnerability
    }
  });

  it.each([...MALICIOUS_NEXT])(
    "fixed validator replaces rejected %j with undefined after the router merge",
    (v) => {
      const seen = routerMerge({ next: v }, validatedReturnPath({ next: v }));
      expect(seen["next"]).toBeUndefined();
      expect("next" in seen).toBe(true);
      // and the redirect sites re-sanitize whatever they are handed
      expect(sanitizeReturnPath(seen["next"])).toBeUndefined();
    },
  );

  it.each(SAFE)("fixed validator keeps %j", (v) => {
    expect(routerMerge({ next: v }, validatedReturnPath({ next: v }))["next"]).toBe(v);
  });
});

describe("signed-out flow: the document gate's encoded `next`", () => {
  const gate = (requested: string) => {
    const url = new URL(requested, "https://www.eduos.global");
    return `/auth?next=${encodeURIComponent(url.pathname + url.search)}`;
  };
  const routerDecode = (location: string) =>
    new URL(location, "https://www.eduos.global").searchParams.get("next");

  it.each([...MALICIOUS_NEXT])(
    "a hostile value smuggled through the gate is rejected on /auth: %j",
    (v) => {
      const next = routerDecode(`/auth?next=${encodeURIComponent(v)}`);
      expect(sanitizeReturnPath(next)).toBeUndefined();
      expect(routerMerge({ next }, validatedReturnPath({ next }))["next"]).toBeUndefined();
    },
  );

  it.each(["/exam-pattern", "/exam-pattern?board=MPBSE", "/diagnostic/checkout/abc"])(
    "a genuine protected page round-trips: %s",
    (requested) => {
      const next = routerDecode(gate(requested));
      expect(sanitizeReturnPath(next)).toBe(requested);
    },
  );
});
