import { describe, expect, it } from "vitest";

import { parseLearnerCsv } from "../centre-onboarding-shared";

describe("parseLearnerCsv", () => {
  it("parses a valid roster", () => {
    const result = parseLearnerCsv(
      "full_name,handle,pin,grade,subject\nAarav Sharma,aarav10,123456,10,Mathematics\n\"Neha, R\",neha10,654321,10,Science\n",
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]).toMatchObject({ fullName: "Neha, R", handle: "neha10", grade: 10 });
  });

  it("reports missing columns", () => {
    const result = parseLearnerCsv("full_name,handle\nAarav,aarav\n");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]?.message).toContain("Missing column");
  });

  it("rejects bad rows but keeps good ones", () => {
    const result = parseLearnerCsv(
      "full_name,handle,pin,grade,subject\nA,aarav10,123456,10,Mathematics\nRiya Roy,riya10,12,10,Science\nOk Name,ok10,111111,10,Science\n",
    );
    expect(result.rows.map((r) => r.handle)).toEqual(["ok10"]);
    expect(result.errors).toHaveLength(2);
  });

  it("flags duplicate handles inside the file", () => {
    const result = parseLearnerCsv(
      "full_name,handle,pin,grade,subject\nAarav Sharma,aarav10,123456,10,Mathematics\nAarav Two,aarav10,222222,10,Science\n",
    );
    expect(result.rows).toHaveLength(1);
    expect(result.errors[0]?.message).toContain("Duplicate handle");
  });
});
