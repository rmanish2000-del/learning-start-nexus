// Retrieves the official CBSE Class 10 2026-27 syllabus documents referenced by
// the committed baselines, records retrieval metadata and SHA-256 checksums, and
// runs identity + content probes against the extracted text.
//
//   bun run scripts/compliance/verify-sources.ts
//
// Network access is required. The PDFs themselves are NOT committed — only the
// verification record in
//   content/compliance/class-10-2026-27.source-verification.json
// The record is what downstream deterministic tooling consumes.

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const SOURCE_VERIFICATION_CONTRACT_VERSION = "1.0.0";

type Probe = { probeId: string; description: string; pattern: RegExp; expect: "present" | "absent" };

type Target = {
  sourceId: string;
  subject: "Mathematics" | "Science";
  url: string;
  probes: Probe[];
};

const TARGETS: Target[] = [
  {
    sourceId: "SRC_CBSE_MATH_2627",
    subject: "Mathematics",
    url: "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Maths_SecP1X_2026-27.pdf",
    probes: [
      { probeId: "IDENTITY_SUBJECT", description: "Document declares Mathematics", pattern: /Mathematics/i, expect: "present" },
      { probeId: "IDENTITY_CODE", description: "Subject code 041", pattern: /041/, expect: "present" },
      { probeId: "IDENTITY_CLASS_YEAR", description: "Class X, session 2026-27", pattern: /Class\s*[–-]?\s*X\s*\(2026-27\)/i, expect: "present" },
      { probeId: "UNIT_NUMBER_SYSTEMS", description: "Unit I Number Systems present", pattern: /NUMBER\s+SYSTEMS/i, expect: "present" },
      { probeId: "UNIT_ALGEBRA", description: "Unit II Algebra present", pattern: /ALGEBRA/i, expect: "present" },
      { probeId: "UNIT_COORDINATE_GEOMETRY", description: "Unit III Coordinate Geometry present", pattern: /COORDINATE\s+GEOMETRY/i, expect: "present" },
      { probeId: "UNIT_GEOMETRY", description: "Unit IV Geometry present", pattern: /GEOMETRY/i, expect: "present" },
      { probeId: "UNIT_TRIGONOMETRY", description: "Unit V Trigonometry present", pattern: /TRIGONOMETRY/i, expect: "present" },
      { probeId: "UNIT_MENSURATION", description: "Unit VI Mensuration present", pattern: /MENSURATION/i, expect: "present" },
      { probeId: "UNIT_STATISTICS_PROBABILITY", description: "Unit VII Statistics and Probability present", pattern: /STATISTICS\s+AND\s+PROBABILITY/i, expect: "present" },
    ],
  },
  {
    sourceId: "SRC_CBSE_SCI_2026_27",
    subject: "Science",
    url: "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf",
    probes: [
      { probeId: "IDENTITY_SUBJECT", description: "Document declares Science", pattern: /SCIENCE/i, expect: "present" },
      { probeId: "IDENTITY_CODE", description: "Subject code 086", pattern: /086/, expect: "present" },
      { probeId: "IDENTITY_CLASS_YEAR", description: "Class X, session 2026-27", pattern: /Class\s*X\s*\(2026-27\)/i, expect: "present" },
      { probeId: "UNIT_CHEMICAL_SUBSTANCES", description: "Unit I Chemical Substances present", pattern: /Chemical\s+Substances\s*-\s*Nature\s+and\s+Behaviour/i, expect: "present" },
      { probeId: "UNIT_WORLD_OF_LIVING", description: "Unit II World of Living present", pattern: /World\s+of\s+Living/i, expect: "present" },
      { probeId: "UNIT_NATURAL_PHENOMENA", description: "Unit III Natural Phenomena present", pattern: /Natural\s+Phenomena/i, expect: "present" },
      { probeId: "UNIT_EFFECTS_OF_CURRENT", description: "Unit IV Effects of Current present", pattern: /Effects\s+of\s+Current/i, expect: "present" },
      { probeId: "UNIT_NATURAL_RESOURCES", description: "Unit V Natural Resources present", pattern: /Natural\s+Resources/i, expect: "present" },
      {
        probeId: "RETAINED_PERIODIC_CLASSIFICATION",
        description:
          "Periodic Classification of Elements is retained in the syllabus (contradicting baseline exclusion EXCL_SCI_2026_001)",
        pattern: /Periodic\s+Classification/i,
        expect: "present",
      },
      {
        probeId: "FORMATIVE_ONLY_BLOCK",
        description: "Formative-only assessment block present, which is what governs Periodic Classification and Evolution",
        pattern: /assessed\s+only\s+formatively/i,
        expect: "present",
      },
      {
        probeId: "NOT_ASSESSED_NOTE",
        description: "Note for Teachers records topics not assessed in the year-end examination",
        pattern: /will\s*not\s*be\s*assessed\s*in\s*the\s*year\s*-?\s*end/i,
        expect: "present",
      },
      {
        probeId: "TOPIC_HUMAN_EYE",
        description: "Human eye covered under Unit III Natural Phenomena",
        pattern: /human\s+eye/i,
        expect: "present",
      },
    ],
  },
];

async function extractText(bytes: Uint8Array): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: bytes, useSystemFonts: false, isEvalSupported: false }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return parts.join("\n");
}

async function main() {
  const records = [];
  for (const target of TARGETS) {
    const startedAt = new Date().toISOString();
    const response = await fetch(target.url, { redirect: "follow" });
    const buffer = new Uint8Array(await response.arrayBuffer());
    // Capture length and checksum before extraction: pdf.js detaches the
    // underlying ArrayBuffer, after which buffer.length reads 0.
    const byteLength = buffer.length;
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const text = response.ok ? await extractText(buffer) : "";
    const probes = target.probes.map((p) => {
      const found = p.pattern.test(text);
      const pass = p.expect === "present" ? found : !found;
      return { probeId: p.probeId, description: p.description, expect: p.expect, found, result: pass ? "PASS" : "FAIL" };
    });
    records.push({
      sourceId: target.sourceId,
      subject: target.subject,
      officialUrl: target.url,
      retrievalTimestamp: startedAt,
      httpStatus: response.status,
      finalUrl: response.url,
      contentType: response.headers.get("content-type"),
      byteLength,
      sha256,
      checksumAlgorithm: "sha256",
      extractedCharacters: text.length,
      probes,
      retrievalStatus: response.ok ? "RETRIEVED" : "RETRIEVAL_FAILED",
      verificationStatus: response.ok && probes.every((p) => p.result === "PASS") ? "VERIFIED" : "VERIFICATION_FAILED",
      documentRetained: false,
      retentionNote:
        "The PDF is not committed to the repository. Identity is preserved through the official URL, byte length and SHA-256 checksum recorded here.",
    });
  }

  const payload = {
    contractVersion: SOURCE_VERIFICATION_CONTRACT_VERSION,
    board: "CBSE",
    classLevel: 10,
    academicYear: "2026-27",
    generatedAt: new Date().toISOString(),
    sources: records,
    overallStatus: records.every((r) => r.verificationStatus === "VERIFIED") ? "SOURCES_VERIFIED" : "SOURCES_PENDING",
  };

  const target = resolve(import.meta.dirname, "../../content/compliance/class-10-2026-27.source-verification.json");
  writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`wrote ${target} — ${payload.overallStatus}`);
  for (const r of payload.sources) {
    const failed = r.probes.filter((p) => p.result === "FAIL").map((p) => p.probeId);
    console.log(`  ${r.sourceId}: http ${r.httpStatus}, ${r.byteLength} bytes, sha256 ${r.sha256.slice(0, 16)}…${failed.length ? ` FAILED: ${failed.join(", ")}` : " all probes pass"}`);
  }
}

await main();
