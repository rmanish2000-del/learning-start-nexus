// Regression: /free-check/$checkId crashed ("This page didn't load") because
// question_bank rows store options as { key, text } objects and the runner
// rendered them raw as React children. The run loader must normalize them.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeQuestionOptions } from "../assessment-shared";

describe("free learning check options", () => {
  it("normalizes question_bank {key,text} options into {key,label}", () => {
    expect(
      normalizeQuestionOptions([
        { key: "A", text: "12 cm" },
        { key: "B", text: "14 cm" },
      ]),
    ).toEqual([
      { key: "A", label: "12 cm" },
      { key: "B", label: "14 cm" },
    ]);
  });

  it("keeps legacy plain-string options working", () => {
    expect(normalizeQuestionOptions(["12 cm", "14 cm"])).toEqual([
      { key: "12 cm", label: "12 cm" },
      { key: "14 cm", label: "14 cm" },
    ]);
  });

  it("returns null for missing or malformed option payloads", () => {
    expect(normalizeQuestionOptions(null)).toBeNull();
    expect(normalizeQuestionOptions("not-an-array")).toBeNull();
    expect(normalizeQuestionOptions([])).toBeNull();
    expect(normalizeQuestionOptions([1, true])).toBeNull();
  });

  it("free-check run loader routes options through the normalizer", () => {
    const source = readFileSync("src/lib/free-check.server.ts", "utf8");
    expect(source).toContain("options: normalizeQuestionOptions(q.options)");
    expect(source).not.toContain("q.options as string[]");
  });

  it("the learner runner renders option.label and stores option.key", () => {
    const source = readFileSync("src/routes/free-check.$checkId.tsx", "utf8");
    expect(source).toContain("value={option.key}");
    expect(source).toContain("{option.label}");
  });
});

describe("free learning check unavailable links", () => {
  it("does not retry the run query, so bad links show a recoverable message fast", () => {
    const source = readFileSync("src/routes/free-check.$checkId.tsx", "utf8");
    expect(source).toContain("retry: false");
    expect(source).toContain("This learning check is not available");
  });
});

describe("free learning check ownership privacy", () => {
  it("names the child only for the parent who started the check", () => {
    const source = readFileSync("src/lib/free-check.server.ts", "utf8");
    expect(source).toContain("const ownerViewing = row.parent_user_id != null && row.parent_user_id === userId");
    expect(source).toContain("This learning check can only be answered by the student it was created for.");
  });
});
