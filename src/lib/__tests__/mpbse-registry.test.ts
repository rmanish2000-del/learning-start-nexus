import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import registry from "../../../content/mpbse/mpbse-class10-sample-papers.json";

type Rec = Record<string, unknown>;
const records = (registry as { records: Rec[] }).records;
const verified = records.filter((r) => r["status"] === "VERIFIED");
const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("MPBSE registry", () => {
  it("has 9 verified official papers", () => {
    expect(verified).toHaveLength(9);
  });
  it("every verified paper is official, real and unique", () => {
    const hashes = new Set<string>();
    for (const r of verified) {
      expect(r["board"]).toBe("MPBSE");
      expect(r["class_level"]).toBe(10);
      expect(String(r["official_url"])).toMatch(/^https:\/\/mpbse\.nic\.in\//);
      const h = String(r["sha256"]);
      expect(h).toMatch(/^[0-9a-f]{64}$/);
      expect(h).not.toBe(EMPTY);
      expect(/^(.)\1+$/.test(h)).toBe(false);
      expect(Number(r["bytes"])).toBeGreaterThan(0);
      expect(r["copyright_policy"]).toBe("OFFICIAL_LINK_AND_METADATA_ONLY");
      hashes.add(h);
    }
    expect(hashes.size).toBe(verified.length);
  });
  it("2026 Maths has Basic and Standard as separate papers", () => {
    const m = verified.filter((r) => r["exam_year"] === 2026 && r["subject"] === "Mathematics");
    expect(m.map((r) => r["maths_stream"]).sort()).toEqual(["Basic", "Standard"]);
  });
  it("NOT_FOUND years carry no invented URL", () => {
    for (const r of records.filter((x) => x["status"] !== "VERIFIED")) {
      expect(r["official_url"] ?? "").toBe("");
    }
  });
  it("CSV matches JSON", () => {
    const csv = readFileSync("content/mpbse/mpbse-class10-sample-papers.csv", "utf8")
      .trim()
      .split(/\r?\n/);
    expect(csv.length - 1).toBe(records.length);
    for (const r of records)
      expect(csv.some((l) => l.startsWith(`${String(r["id"])},`))).toBe(true);
  });
});
