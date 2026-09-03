import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  NCERT_OVERLAP_CANDIDATES,
  NEAR_DUPLICATE_PAIRS,
  SME_EXPECTED_QUEUE,
  SME_EXPECTED_TOTAL,
  SME_WORKFLOW_RULES,
} from "../sme-review-shared";

const validation = JSON.parse(
  readFileSync("content/compliance/class-10-2026-27.draft-validation.json", "utf8"),
) as {
  queueCounts: Record<string, number>;
  duplicates: { nearPairs?: { a: string; b: string }[] };
  copyrightContamination: { hits: { externalRef: string }[] };
};

describe("SME review queue reconciliation", () => {
  it("expects Mathematics 235, Science 91, 326 combined", () => {
    expect(SME_EXPECTED_QUEUE.Mathematics).toBe(235);
    expect(SME_EXPECTED_QUEUE.Science).toBe(91);
    expect(SME_EXPECTED_QUEUE.Mathematics + SME_EXPECTED_QUEUE.Science).toBe(SME_EXPECTED_TOTAL);
  });

  it("matches the canonical draft validation artifact", () => {
    expect(validation.queueCounts['Mathematics']).toBe(SME_EXPECTED_QUEUE.Mathematics);
    expect(validation.queueCounts['Science']).toBe(SME_EXPECTED_QUEUE.Science);
  });
});

describe("advisory candidates", () => {
  it("carries exactly the overlap candidates found by the validator", () => {
    const fromArtifact = new Set(
      (validation.copyrightContamination.hits ?? []).map((c) => c.externalRef),
    );
    const inCode = new Set(NCERT_OVERLAP_CANDIDATES.map((c) => c.externalRef));
    expect(inCode).toEqual(fromArtifact);
  });

  it("carries exactly the near-duplicate pairs found by the validator", () => {
    const fromArtifact = (validation.duplicates.nearPairs ?? []).map((p) =>
      [p.a, p.b].sort().join("|"),
    );
    const inCode = NEAR_DUPLICATE_PAIRS.map((p) => [p.a, p.b].sort().join("|"));
    expect(inCode.sort()).toEqual(fromArtifact.sort());
  });

  it("does not duplicate or self-pair candidates", () => {
    for (const pair of NEAR_DUPLICATE_PAIRS) expect(pair.a).not.toBe(pair.b);
    const refs = NCERT_OVERLAP_CANDIDATES.map((c) => c.externalRef);
    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe("workflow guarantees", () => {
  const source = readFileSync("src/lib/sme-review.functions.ts", "utf8");
  const route = readFileSync("src/routes/_authenticated/sme-review.$subject.tsx", "utf8");
  const server = readFileSync("src/lib/sme-review.server.ts", "utf8");

  it("gates every server function on reviewer or admin role", () => {
    const gates = source.match(/requireAnyRole\(context\.supabase, context\.userId, \[[^\]]+\]\)/g);
    expect(gates).toHaveLength(2);
    for (const gate of gates ?? []) {
      expect(gate).toContain('"admin"');
      expect(gate).toContain('"reviewer"');
      expect(gate).not.toContain('"educator"');
      expect(gate).not.toContain('"parent"');
    }
  });

  it("accepts one question per decision — no bulk approval surface", () => {
    expect(source).toContain("questionId: z.string().uuid()");
    expect(source).not.toMatch(/questionIds|z\.array\(/);
    expect(route).not.toMatch(/Approve all|approveAll|selectAll|bulkApprove/);
  });

  it("requires a named, qualified reviewer and a decision basis for every decision", () => {
    expect(source).toContain("reviewerName: z.string().trim().min(2).max(120)");
    expect(source).toContain("reviewerQualification: z.string().trim().min(2).max(200)");
    expect(source).toContain("decisionBasis: z.string().trim().min(10).max(1000)");
    expect(source).toContain("Named SME:");
  });

  it("offers all four review outcomes on subject-specific routes", () => {
    expect(source).toContain("z.enum(SME_DECISIONS)");
    expect(route).toContain('createFileRoute("/_authenticated/sme-review/$subject")');
    expect(route).toContain("SME_DECISIONS.map");
  });

  it("never writes question_bank directly — promotion goes through the audit trail", () => {
    expect(server).not.toMatch(/from\("question_bank"\)\s*\.\s*(update|insert|upsert|delete)/);
    expect(server).toContain('from("question_verifications").insert');
  });

  it("reads drafts only and never approves automatically", () => {
    expect(server).toContain('q.status === "draft" && q.verification_state === "unverified"');
    expect(server).not.toMatch(/status:\s*"approved"/);
  });

  it("states the append-only and not-certified rules to the reviewer", () => {
    const joined = SME_WORKFLOW_RULES.join(" ");
    expect(joined).toMatch(/append-only/i);
    expect(joined).toMatch(/NOT_CERTIFIED/);
    expect(joined).toMatch(/Science book stays unapproved/i);
    expect(joined).toMatch(/no bulk approve/i);
  });
});

describe("append-only migration", () => {
  const migrations = readFileSync(
    "supabase/migrations/" +
      (process.env["SME_MIGRATION"] ??
        require("node:fs")
          .readdirSync("supabase/migrations")
          .filter((f: string) => f.endsWith(".sql"))
          .sort()
          .reverse()
          .find((f: string) =>
            readFileSync(`supabase/migrations/${f}`, "utf8").includes(
              "question_verifications_append_only",
            ),
          )!),
    "utf8",
  );

  it("blocks updates and deletes on the decision trail", () => {
    expect(migrations).toContain("BEFORE UPDATE ON public.question_verifications");
    expect(migrations).toContain("BEFORE DELETE ON public.question_verifications");
  });

  it("blocks multi-row (bulk) decision writes", () => {
    expect(migrations).toContain("Bulk verification is not permitted");
  });

  it("promotes to approved only on an explicit approve decision", () => {
    expect(migrations).toContain(
      "status = CASE WHEN NEW.action = 'verified' THEN 'approved' ELSE status END",
    );
  });
});

describe("four-outcome attribution migration", () => {
  const sql = readFileSync(
    "supabase/migrations/20260903142636_c52a8157-ad18-4f80-8e7b-bfc823a84a28.sql",
    "utf8",
  );

  it("accepts exactly the four review outcomes", () => {
    for (const action of ["verified", "rejected", "remediation_required", "cannot_assess"])
      expect(sql).toContain(action);
  });

  it("makes reviewer qualification and decision basis mandatory", () => {
    expect(sql).toContain("reviewer_qualification");
    expect(sql).toContain("decision_basis");
    expect(sql).toContain("question_verifications_attribution_chk");
  });

  it("keeps non-approval outcomes as drafts", () => {
    expect(sql).toContain("WHEN NEW.action = 'verified' THEN 'approved'");
  });
});

describe("sme review route protection", () => {
  it("gates both subject queues behind the server-side auth gate", () => {
    expect(isProtectedPath("/sme-review")).toBe(true);
    expect(isProtectedPath("/sme-review/mathematics")).toBe(true);
    expect(isProtectedPath("/sme-review/science")).toBe(true);
  });
});
