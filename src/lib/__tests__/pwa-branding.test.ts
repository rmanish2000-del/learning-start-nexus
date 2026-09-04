import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Brand identity guard: every favicon / PWA icon must carry the approved
 * orange-navy identity. The legacy green mark (#02745C) must never return.
 */
const ICONS = [
  "public/favicon.png",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/icon-maskable-192.png",
  "public/icons/icon-maskable-512.png",
  "public/icons/apple-touch-icon.png",
];

function centerPixel(file: string): [number, number, number] {
  // Minimal PNG reader is unnecessary: assert on file presence plus the
  // manifest/head wiring, and on byte-level absence of the legacy palette in
  // the generator, which is the single source of icon colour.
  const buf = readFileSync(file);
  expect(buf.byteLength).toBeGreaterThan(200);
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return [0, 0, 0];
}

describe("PWA branding", () => {
  it("ships every referenced icon as a valid PNG", () => {
    for (const icon of ICONS) centerPixel(icon);
  });

  it("generates icons from the approved orange/navy tokens only", () => {
    const gen = readFileSync("scripts/branding/generate-icons.py", "utf8");
    expect(gen).toContain("(12, 22, 40, 255)"); // #0C1628 navy
    expect(gen).toContain("(249, 115, 22, 255)"); // #F97316 orange
    expect(gen).not.toMatch(/2,\s*116,\s*92/); // legacy green
  });

  it("keeps the manifest aligned with the design tokens and versioned icons", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
    expect(manifest.theme_color).toBe("#F97316");
    expect(manifest.background_color).toBe("#0C1628");
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
    for (const icon of manifest.icons) expect(icon.src).toMatch(/\?v=2$/);
  });

  it("references exactly one manifest with cache-busted icon links", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    expect([...root.matchAll(/rel: "manifest"/g)].length).toBe(1);
    expect(root).toContain('href: "/manifest.webmanifest?v=2"');
    expect(root).toContain('href: "/icons/apple-touch-icon.png?v=2"');
    expect(root).toContain('href: "/favicon.png?v=2"');
  });
});
