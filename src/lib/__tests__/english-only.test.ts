import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// EduOS interface language: ENGLISH ONLY (founder decision, 2026-08-28).
// These tests are the guard rail for that decision.

const SRC = join(process.cwd(), "src");
const DEVANAGARI = /[\u0900-\u097F]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC);

describe("English-only product language", () => {
  it("ships no Hindi translation dictionary", () => {
    expect(existsSync(join(SRC, "lib/i18n/hi.ts"))).toBe(false);
  });

  it("ships no language toggle component", () => {
    expect(existsSync(join(SRC, "components/language-toggle.tsx"))).toBe(false);
  });

  it("renders no language toggle anywhere in the app", () => {
    const offenders = FILES.filter(
      (f) =>
        !f.endsWith("english-only.test.ts") &&
        /LanguageToggle|LANGUAGE_LABELS|setLang\b/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("contains no Devanagari user-facing copy outside comments in the i18n module", () => {
    const offenders = FILES.filter((f) => {
      if (f.endsWith(join("lib", "i18n", "context.tsx"))) return false;
      if (f.endsWith("english-only.test.ts")) return false;
      return DEVANAGARI.test(readFileSync(f, "utf8"));
    });
    expect(offenders).toEqual([]);
  });

  it("exposes only 'en' as a locale type and no locale setter", async () => {
    const mod = await import("@/lib/i18n/context");
    expect(Object.keys(mod)).not.toContain("LANGUAGE_LABELS");
    expect((mod as Record<string, unknown>)["setLang"]).toBeUndefined();
  });
});

describe("t() helper", () => {
  it("returns the English string with interpolation", async () => {
    const { interpolate } = await import("@/lib/i18n/context");
    expect(interpolate("Hi {name}, {n} gaps", { name: "Aarav", n: 3 })).toBe("Hi Aarav, 3 gaps");
    expect(interpolate("No vars")).toBe("No vars");
  });
});

describe("stored Hindi preference", () => {
  it("is cleared and cannot reactivate Hindi", async () => {
    const store = new Map<string, string>([["eduos.lang", "hi"]]);
    const win = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    };
    (globalThis as Record<string, unknown>)["window"] = win;
    const { clearStoredLanguagePreference } = await import("@/lib/i18n/context");
    clearStoredLanguagePreference();
    expect(store.has("eduos.lang")).toBe(false);
    delete (globalThis as Record<string, unknown>)["window"];
  });
});

describe("document language", () => {
  it("declares English in the root shell", () => {
    const root = readFileSync(join(SRC, "routes/__root.tsx"), "utf8");
    expect(root).toContain('<html lang="en"');
  });
});
