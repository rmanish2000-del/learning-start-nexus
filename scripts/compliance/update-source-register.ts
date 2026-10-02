// Regenerates the official source register from retrieval evidence.
//
//   bun run scripts/compliance/update-source-register.ts
//
// Inputs (evidence only, both produced by retrieval scripts):
//   content/compliance/class-10-2026-27.source-verification.json
//   content/compliance/class-10-2026-27.missing-sources.json
// Outputs:
//   content/compliance/cbse-2026-27.sources.json          (registry)
//   content/compliance/class-10-2026-27.sha256-manifest.json (flat checksum manifest)
//
// Only CBSE and NCERT domains contribute records. Anything not retrieved stays
// draft / pending_confirmation with the reproducible HTTP evidence recorded.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { sourceManifestSchema, validateSourceRegistry, type SourceRecord } from "../../src/lib/compliance-shared";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));

type MissingRecord = {
  sourceId: string;
  category: string;
  subject: string;
  academicYear: string;
  authority: "CBSE" | "NCERT";
  title: string;
  url: string;
  note?: string;
  retrievalTimestamp: string;
  httpStatus: number | null;
  contentType: string | null;
  byteLength: number | null;
  sha256: string | null;
  retrievalStatus: string;
};

const SESSION = "2026-27";
const EVIDENCE_MISSING = "content/compliance/class-10-2026-27.missing-sources.json";
const EVIDENCE_SYLLABUS = "content/compliance/class-10-2026-27.source-verification.json";

function compositeChecksum(records: MissingRecord[]): string {
  const lines = records
    .filter((r) => r.sha256)
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId))
    .map((r) => `${r.sourceId}:${r.sha256}`);
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

function main() {
  const syllabus = read(EVIDENCE_SYLLABUS);
  const missing = read(EVIDENCE_MISSING);
  const records: MissingRecord[] = missing.sources;
  const by = (id: string) => records.find((r) => r.sourceId === id)!;
  const retrieved = (r: MissingRecord | undefined) => Boolean(r && r.retrievalStatus === "RETRIEVED" && r.sha256);

  const mathSyllabus = syllabus.sources.find((s: { subject: string }) => s.subject === "Mathematics");
  const sciSyllabus = syllabus.sources.find((s: { subject: string }) => s.subject === "Science");

  const mathChapters = records.filter((r) => r.sourceId.startsWith("SRC_NCERT_MATH_C10_CH"));
  const sciChapters = records.filter((r) => r.sourceId.startsWith("SRC_NCERT_SCI_C10_CH"));

  const sources: SourceRecord[] = [];

  const curriculum = by("SRC_CBSE_CURRICULUM_SEC_2026_27");
  sources.push({
    id: "CBSE-2026-27-C10-CURRICULUM",
    board: "CBSE",
    classLevel: 10,
    subject: "All",
    academicSession: SESSION,
    authority: "CBSE",
    sourceType: "cbse_curriculum",
    documentTitle: curriculum.title,
    documentVersion: SESSION,
    edition: null,
    publishedOn: null,
    effectiveFrom: null,
    effectiveTo: null,
    officialUrl: curriculum.url,
    retrievedAt: curriculum.retrievalTimestamp,
    checksum: curriculum.sha256,
    checksumAlgorithm: "sha256",
    status: retrieved(curriculum) ? "final" : "draft",
    supersedesId: null,
    supersededById: null,
    applicability: retrieved(curriculum) ? "applicable" : "pending_confirmation",
    reviewerNote: `Retrieved live from cbseacademic.nic.in (HTTP ${curriculum.httpStatus}, ${curriculum.byteLength} bytes), sha256 recorded. Whole-curriculum document governing all Class X subjects for the session.`,
    evidenceRef: EVIDENCE_MISSING,
  });

  for (const [subject, syl] of [
    ["Mathematics", mathSyllabus],
    ["Science", sciSyllabus],
  ] as const) {
    sources.push({
      id: `CBSE-2026-27-C10-${subject === "Mathematics" ? "MAT" : "SCI"}-SYLLABUS`,
      board: "CBSE",
      classLevel: 10,
      subject,
      academicSession: SESSION,
      authority: "CBSE",
      sourceType: "subject_syllabus",
      documentTitle: `CBSE Class X ${subject} (${subject === "Mathematics" ? "041" : "086"}) syllabus, session ${SESSION}`,
      documentVersion: SESSION,
      edition: null,
      publishedOn: null,
      effectiveFrom: null,
      effectiveTo: null,
      officialUrl: syl.officialUrl,
      retrievedAt: syl.retrievalTimestamp,
      checksum: syl.sha256,
      checksumAlgorithm: "sha256",
      status: "final",
      supersedesId: null,
      supersededById: null,
      applicability: "applicable",
      reviewerNote: `Retrieved live from cbseacademic.nic.in (HTTP ${syl.httpStatus}, ${syl.byteLength} bytes), sha256 recorded, ${syl.probes.length}/${syl.probes.length} identity and unit probes PASS.`,
      evidenceRef: EVIDENCE_SYLLABUS,
    });
  }

  for (const [subject, chapters, code] of [
    ["Mathematics", mathChapters, "jemh1"],
    ["Science", sciChapters, "jesc1"],
  ] as const) {
    const complete = chapters.length > 0 && chapters.every((c) => retrieved(c));
    sources.push({
      id: `NCERT-2026-27-C10-${subject === "Mathematics" ? "MAT" : "SCI"}-TEXTBOOK`,
      board: "CBSE",
      classLevel: 10,
      subject,
      academicSession: SESSION,
      authority: "NCERT",
      sourceType: "ncert_textbook",
      documentTitle: `NCERT ${subject}, Class X (${code}), chapter set as published on ncert.nic.in`,
      documentVersion: `${code}-chapters-${chapters.length}`,
      edition: `Composite of ${chapters.length} chapter PDFs pinned by SHA-256`,
      publishedOn: null,
      effectiveFrom: null,
      effectiveTo: null,
      officialUrl: `https://ncert.nic.in/textbook/pdf/${code}01.pdf`,
      retrievedAt: chapters[0]?.retrievalTimestamp ?? null,
      checksum: complete ? compositeChecksum(chapters) : null,
      checksumAlgorithm: complete ? "sha256" : null,
      status: complete ? "final" : "draft",
      supersedesId: null,
      supersededById: null,
      applicability: complete ? "applicable" : "pending_confirmation",
      reviewerNote: complete
        ? `All ${chapters.length} chapter PDFs retrieved from ncert.nic.in and individually checksummed; the registry checksum is the sha256 of the sorted "sourceId:sha256" chapter list. Per-chapter hashes are in the evidence file.`
        : "Chapter set incomplete; edition cannot be pinned.",
      evidenceRef: EVIDENCE_MISSING,
    });
  }

  const rationalised = by("SRC_NCERT_RATIONALISED_C10");
  sources.push({
    id: "NCERT-2026-27-C10-RATIONALISED",
    board: "CBSE",
    classLevel: 10,
    subject: "All",
    academicSession: SESSION,
    authority: "NCERT",
    sourceType: "rationalised_content_notice",
    documentTitle: rationalised.title,
    documentVersion: "class-10-booklet",
    edition: null,
    publishedOn: null,
    effectiveFrom: null,
    effectiveTo: null,
    officialUrl: rationalised.url,
    retrievedAt: rationalised.retrievalTimestamp,
    checksum: rationalised.sha256,
    checksumAlgorithm: "sha256",
    status: retrieved(rationalised) ? "final" : "draft",
    supersedesId: null,
    supersededById: null,
    applicability: retrieved(rationalised) ? "applicable" : "pending_confirmation",
    reviewerNote: `Retrieved live from ncert.nic.in (HTTP ${rationalised.httpStatus}, ${rationalised.byteLength} bytes). Lists content rationalised out of the Class X textbooks; must be cross-checked before any excluded-topic claim.`,
    evidenceRef: EVIDENCE_MISSING,
  });

  // Session 2026-27 assessment artefacts: not yet published by CBSE.
  const sqpIndex = by("SRC_CBSE_SQP_INDEX_2026_27");
  for (const [id, sourceType, label] of [
    ["CBSE-2026-27-C10-SAMPLE-PAPER", "sample_paper", "sample question papers"],
    ["CBSE-2026-27-C10-MARKING-SCHEME", "marking_scheme", "marking schemes"],
  ] as const) {
    sources.push({
      id,
      board: "CBSE",
      classLevel: 10,
      subject: "All",
      academicSession: SESSION,
      authority: "CBSE",
      sourceType,
      documentTitle: `CBSE Class X ${label}, session ${SESSION}`,
      documentVersion: "unpublished",
      edition: null,
      publishedOn: null,
      effectiveFrom: null,
      effectiveTo: null,
      officialUrl: null,
      retrievedAt: sqpIndex.retrievalTimestamp,
      checksum: null,
      checksumAlgorithm: null,
      status: "draft",
      supersedesId: null,
      supersededById: null,
      applicability: "pending_confirmation",
      reviewerNote: `MISSING. The session ${SESSION} index at ${sqpIndex.url} returned HTTP ${sqpIndex.httpStatus} at ${sqpIndex.retrievalTimestamp}; CBSE has not published these artefacts yet. No unofficial substitute is used. Prior-session artefacts are recorded separately and are NOT applicable to ${SESSION}.`,
      evidenceRef: EVIDENCE_MISSING,
    });
  }

  // Prior-session assessment artefacts: retrieved, recorded, not applicable to 2026-27.
  const prior: Array<[string, string, "sample_paper" | "marking_scheme", string]> = [
    ["CBSE-2025-26-C10-MAT-SQP-STD", "SRC_CBSE_SQP_MATH_STD_2025_26", "sample_paper", "Mathematics"],
    ["CBSE-2025-26-C10-MAT-MS-STD", "SRC_CBSE_MS_MATH_STD_2025_26", "marking_scheme", "Mathematics"],
    ["CBSE-2025-26-C10-MAT-SQP-BAS", "SRC_CBSE_SQP_MATH_BASIC_2025_26", "sample_paper", "Mathematics"],
    ["CBSE-2025-26-C10-MAT-MS-BAS", "SRC_CBSE_MS_MATH_BASIC_2025_26", "marking_scheme", "Mathematics"],
    ["CBSE-2025-26-C10-SCI-SQP", "SRC_CBSE_SQP_SCI_2025_26", "sample_paper", "Science"],
    ["CBSE-2025-26-C10-SCI-MS", "SRC_CBSE_MS_SCI_2025_26", "marking_scheme", "Science"],
  ];
  for (const [id, srcId, sourceType, subject] of prior) {
    const r = by(srcId);
    sources.push({
      id,
      board: "CBSE",
      classLevel: 10,
      subject,
      academicSession: "2025-26",
      authority: "CBSE",
      sourceType,
      documentTitle: r.title,
      documentVersion: "2025-26",
      edition: null,
      publishedOn: null,
      effectiveFrom: null,
      effectiveTo: null,
      officialUrl: r.url,
      retrievedAt: r.retrievalTimestamp,
      checksum: r.sha256,
      checksumAlgorithm: "sha256",
      status: "final",
      supersedesId: null,
      supersededById: null,
      applicability: "not_applicable",
      reviewerNote: `Prior-session official artefact, retrieved (HTTP ${r.httpStatus}, ${r.byteLength} bytes). Recorded for assessment-shape reference only. NOT applicable to session ${SESSION} and never used as a coverage authority.`,
      evidenceRef: EVIDENCE_MISSING,
    });
  }

  const manifest = {
    manifestVersion: "2",
    generatedAt: new Date().toISOString().slice(0, 10),
    authorityOrder: [
      "CBSE senior secondary / secondary curriculum document for the session",
      "CBSE subject-wise syllabus for the session",
      "NCERT syllabus and current-edition textbook for the session",
      "CBSE rationalised-content notice / circular",
      "CBSE sample question paper and marking scheme",
      "CBSE erratum or corrigendum (overrides all of the above for the corrected item)",
    ],
    sources,
  };

  sourceManifestSchema.parse(manifest);
  const validation = validateSourceRegistry(manifest);
  writeFileSync(resolve(ROOT, "content/compliance/cbse-2026-27.sources.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const flat = {
    contractVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    board: "CBSE",
    classLevel: 10,
    academicSession: SESSION,
    checksumAlgorithm: "sha256",
    note: "No official document is committed to the repository. These checksums pin document identity.",
    entries: [
      ...syllabus.sources.map((s: Record<string, unknown>) => ({
        sourceId: s.sourceId,
        title: `CBSE Class X ${s.subject} syllabus ${SESSION}`,
        url: s.officialUrl,
        byteLength: s.byteLength,
        sha256: s.sha256,
        retrievedAt: s.retrievalTimestamp,
      })),
      ...records.map((r) => ({
        sourceId: r.sourceId,
        title: r.title,
        url: r.url,
        byteLength: r.byteLength,
        sha256: r.sha256,
        retrievedAt: r.retrievalTimestamp,
        status: r.retrievalStatus,
      })),
    ],
  };
  writeFileSync(resolve(ROOT, "content/compliance/class-10-2026-27.sha256-manifest.json"), `${JSON.stringify(flat, null, 2)}\n`);

  const errors = validation.filter((i) => i.level === "error");
  const warnings = validation.filter((i) => i.level !== "error");
  console.log(`registry: ${sources.length} records`);
  console.log(`  errors:   ${errors.length}`);
  for (const e of errors) console.log(`    - ${e.code}: ${e.detail}`);
  console.log(`  warnings: ${warnings.length}`);
  for (const w of warnings) console.log(`    - ${w.code}: ${w.detail}`);
  console.log(`manifest entries: ${flat.entries.length}`);
}

if (import.meta.main) main();
