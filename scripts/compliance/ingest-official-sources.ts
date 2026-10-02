/**
 * Class 10 official source ingestion and verification.
 *
 * Downloads every permitted CBSE/NCERT document into a scratch directory,
 * proves each one is a genuine PDF (magic bytes + MIME + size + readable
 * trailer), hashes it twice to prove hash stability, and emits the official
 * source register, SHA-256 manifest and compliance matrix.
 *
 * Copyright: NCERT textbook and booklet binaries are NEVER written into the
 * repository. Only URLs, HTTP metadata and SHA-256 digests are recorded.
 *
 * Run: bun run scripts/compliance/ingest-official-sources.ts
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SCRATCH = "/tmp/eduos-official-sources";
const OUT_DATA = "content/compliance";
const CBSE = "https://cbseacademic.nic.in/";
const NCERT = "https://ncert.nic.in/";

const OFFICIAL_DOMAINS = ["cbseacademic.nic.in", "ncert.nic.in", "cbse.gov.in", "cbse.nic.in"];

type Requirement =
  | "curriculum"
  | "maths_syllabus"
  | "science_syllabus"
  | "maths_sample_paper"
  | "science_sample_paper"
  | "maths_marking_scheme"
  | "science_marking_scheme"
  | "ncert_maths_textbook"
  | "ncert_science_textbook"
  | "ncert_rationalised_booklet";

type Spec = {
  id: string;
  requirement: Requirement;
  subject: "Mathematics" | "Science" | "All";
  authority: "CBSE" | "NCERT";
  academicYear: string;
  /** Official index page the URL was discovered on — provenance, not a guess. */
  discoveredOn: string;
  title: string;
  url: string;
  /** Copyrighted third-party content: metadata only, never redistributed. */
  redistributable: boolean;
  note?: string;
};

const SPECS: Spec[] = [
  {
    id: "CBSE-2025-26-C10-CURRICULUM",
    requirement: "curriculum",
    subject: "All",
    authority: "CBSE",
    academicYear: "2025-26",
    discoveredOn: `${CBSE}curriculum_2026.html`,
    title: "CBSE Secondary School Curriculum (Classes IX-X), session 2025-26",
    url: `${CBSE}web_material/CurriculumMain26/Sec/Curriculum_Sec_2025-26.pdf`,
    redistributable: true,
  },
  {
    id: "CBSE-2025-26-C10-MAT-SYLLABUS",
    requirement: "maths_syllabus",
    subject: "Mathematics",
    authority: "CBSE",
    academicYear: "2025-26",
    discoveredOn: `${CBSE}curriculum_2026.html`,
    title: "CBSE Mathematics (041) syllabus, Secondary, session 2025-26",
    url: `${CBSE}web_material/CurriculumMain26/Sec/Maths_Sec_2025-26.pdf`,
    redistributable: true,
  },
  {
    id: "CBSE-2025-26-C10-SCI-SYLLABUS",
    requirement: "science_syllabus",
    subject: "Science",
    authority: "CBSE",
    academicYear: "2025-26",
    discoveredOn: `${CBSE}curriculum_2026.html`,
    title: "CBSE Science (086) syllabus, Secondary, session 2025-26",
    url: `${CBSE}web_material/CurriculumMain26/Sec/Science_Sec_2025-26.pdf`,
    redistributable: true,
  },
  {
    id: "CBSE-2025-26-C10-MAT-SQP",
    requirement: "maths_sample_paper",
    subject: "Mathematics",
    authority: "CBSE",
    academicYear: "2025-26",
    discoveredOn: `${CBSE}SQP_CLASSX_2025-26.html`,
    title: "CBSE Class X Mathematics Standard sample question paper, 2025-26",
    url: `${CBSE}web_material/SQP/ClassX_2025_26/MathsStandard-SQP.pdf`,
    redistributable: true,
  },
  {
    id: "CBSE-2025-26-C10-MAT-MS",
    requirement: "maths_marking_scheme",
    subject: "Mathematics",
    authority: "CBSE",
    academicYear: "2025-26",
    discoveredOn: `${CBSE}SQP_CLASSX_2025-26.html`,
    title: "CBSE Class X Mathematics Standard marking scheme, 2025-26",
    url: `${CBSE}web_material/SQP/ClassX_2025_26/MathsStandard-MS.pdf`,
    redistributable: true,
  },
  {
    id: "CBSE-2025-26-C10-SCI-SQP",
    requirement: "science_sample_paper",
    subject: "Science",
    authority: "CBSE",
    academicYear: "2025-26",
    discoveredOn: `${CBSE}SQP_CLASSX_2025-26.html`,
    title: "CBSE Class X Science sample question paper, 2025-26",
    url: `${CBSE}web_material/SQP/ClassX_2025_26/Science-SQP.pdf`,
    redistributable: true,
  },
  {
    id: "CBSE-2025-26-C10-SCI-MS",
    requirement: "science_marking_scheme",
    subject: "Science",
    authority: "CBSE",
    academicYear: "2025-26",
    discoveredOn: `${CBSE}SQP_CLASSX_2025-26.html`,
    title: "CBSE Class X Science marking scheme, 2025-26",
    url: `${CBSE}web_material/SQP/ClassX_2025_26/Science-MS.pdf`,
    redistributable: true,
  },
  {
    id: "NCERT-C10-MAT-TEXTBOOK",
    requirement: "ncert_maths_textbook",
    subject: "Mathematics",
    authority: "NCERT",
    academicYear: "2025-26",
    discoveredOn: `${NCERT}textbook.php?jemh1=0-14`,
    title: "NCERT Mathematics, Class X (jemh1) — prelims/imprint volume used for edition pinning",
    url: `${NCERT}textbook/pdf/jemh1ps.pdf`,
    redistributable: false,
    note: "Copyright NCERT. Binary is fetched to a scratch directory for hashing only and is never committed or redistributed.",
  },
  {
    id: "NCERT-C10-SCI-TEXTBOOK",
    requirement: "ncert_science_textbook",
    subject: "Science",
    authority: "NCERT",
    academicYear: "2025-26",
    discoveredOn: `${NCERT}textbook.php?jesc1=0-13`,
    title: "NCERT Science, Class X (jesc1) — prelims/imprint volume used for edition pinning",
    url: `${NCERT}textbook/pdf/jesc1ps.pdf`,
    redistributable: false,
    note: "Copyright NCERT. Binary is fetched to a scratch directory for hashing only and is never committed or redistributed.",
  },
  {
    id: "NCERT-C10-RATIONALISED-BOOKLET",
    requirement: "ncert_rationalised_booklet",
    subject: "All",
    authority: "NCERT",
    academicYear: "2025-26",
    discoveredOn: `${NCERT}rationalised-content.php`,
    title: "NCERT rationalised content booklet, Class X",
    url: `${NCERT}pdf/BookletClass10.pdf`,
    redistributable: false,
    note: "Copyright NCERT. Metadata and digest only.",
  },
];

/**
 * 2026-27 Class X files that resolve directly but are NOT published on the
 * official 2026-27 curriculum index (which lists Class IX only under the new
 * scheme). Recorded as unconfirmed; they never satisfy a requirement.
 */
const UNCONFIRMED: Spec[] = [
  {
    id: "CBSE-2026-27-C10-MAT-SYLLABUS-UNCONFIRMED",
    requirement: "maths_syllabus",
    subject: "Mathematics",
    authority: "CBSE",
    academicYear: "2026-27",
    discoveredOn: "direct URL only — absent from cbseacademic.nic.in/curriculum_2027.html",
    title: "CBSE Class X Mathematics syllabus, session 2026-27 (publication unconfirmed)",
    url: `${CBSE}web_material/CurriculumMain27/SecPart1/Maths_SecP1X_2026-27.pdf`,
    redistributable: true,
  },
  {
    id: "CBSE-2026-27-C10-SCI-SYLLABUS-UNCONFIRMED",
    requirement: "science_syllabus",
    subject: "Science",
    authority: "CBSE",
    academicYear: "2026-27",
    discoveredOn: "direct URL only — absent from cbseacademic.nic.in/curriculum_2027.html",
    title: "CBSE Class X Science syllabus, session 2026-27 (publication unconfirmed)",
    url: `${CBSE}web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf`,
    redistributable: true,
  },
];

export type SourceRecord = Spec & {
  finalUrl: string | null;
  httpStatus: number | null;
  mimeType: string | null;
  sizeBytes: number | null;
  retrievedAt: string | null;
  sha256: string | null;
  sha256Repeat: string | null;
  hashStable: boolean;
  pdfSignatureOk: boolean;
  pdfTrailerOk: boolean;
  pageCount: number | null;
  /** Imprint line read out of the PDF, e.g. "Reprint 2026-27". Pins the edition. */
  edition: string | null;
  officialDomain: boolean;
  verdict: "VERIFIED" | "FAILED" | "UNCONFIRMED_PUBLICATION";
  failures: string[];
};

function sha256(buf: Uint8Array): string {
  return createHash("sha256").update(buf).digest("hex");
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

async function verify(spec: Spec, unconfirmed: boolean): Promise<SourceRecord> {
  const failures: string[] = [];
  const record: SourceRecord = {
    ...spec,
    finalUrl: null,
    httpStatus: null,
    mimeType: null,
    sizeBytes: null,
    retrievedAt: null,
    sha256: null,
    sha256Repeat: null,
    hashStable: false,
    pdfSignatureOk: false,
    pdfTrailerOk: false,
    pageCount: null,
    edition: null,
    officialDomain: OFFICIAL_DOMAINS.includes(hostOf(spec.url)),
    verdict: "FAILED",
    failures,
  };

  if (!record.officialDomain) {
    failures.push(`Host ${hostOf(spec.url)} is not an official CBSE/NCERT domain`);
    return record;
  }

  // NCERT occasionally drops the socket mid-transfer; retry rather than
  // record a false MISSING for a document that is genuinely published.
  let response: Response | null = null;
  let lastError = "";
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      response = await fetch(spec.url, { redirect: "follow" });
      break;
    } catch (error) {
      lastError = (error as Error).message;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
  if (!response) {
    failures.push(`Network failure after 4 attempts: ${lastError}`);
    return record;
  }

  record.finalUrl = response.url;
  record.httpStatus = response.status;
  record.mimeType = response.headers.get("content-type");
  record.retrievedAt = new Date().toISOString();

  if (!OFFICIAL_DOMAINS.includes(hostOf(response.url))) {
    failures.push(`Redirected off official domains to ${hostOf(response.url)}`);
  }
  if (response.status !== 200) failures.push(`HTTP ${response.status}`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  record.sizeBytes = bytes.byteLength;

  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 8));
  const tail = new TextDecoder("latin1").decode(bytes.subarray(Math.max(0, bytes.length - 2048)));
  record.pdfSignatureOk = head.startsWith("%PDF-");
  record.pdfTrailerOk = tail.includes("%%EOF");

  if (!record.pdfSignatureOk) failures.push("Body is not a PDF (missing %PDF- signature) — likely an HTML error or redirect page");
  if (!record.pdfTrailerOk) failures.push("PDF is truncated (no %%EOF trailer)");
  if (!(record.mimeType ?? "").includes("application/pdf")) failures.push(`Unexpected MIME type ${record.mimeType}`);
  if (bytes.byteLength < 20_000) failures.push(`Implausibly small payload (${bytes.byteLength} bytes)`);

  // Scratch copy: hashing input and pdfinfo target. Never inside the repo.
  mkdirSync(SCRATCH, { recursive: true });
  const scratchFile = join(SCRATCH, `${spec.id}.pdf`);
  writeFileSync(scratchFile, bytes);

  // Readability probe: pdfinfo parses the real cross-reference table and page
  // tree, so it also catches pages stored in compressed object streams (which
  // a raw "/Type /Page" scan misses).
  const info = Bun.spawnSync(["pdfinfo", scratchFile]);
  const infoText = new TextDecoder().decode(info.stdout);
  const pages = Number(/^Pages:\s+(\d+)$/m.exec(infoText)?.[1] ?? 0);
  record.pageCount = pages || null;
  if (record.pdfSignatureOk && pages < 1) {
    failures.push(`PDF is not readable: pdfinfo reported no pages (${new TextDecoder().decode(info.stderr).trim()})`);
  }

  // Edition pinning: read the imprint line out of the front matter.
  const text = new TextDecoder().decode(Bun.spawnSync(["pdftotext", "-f", "1", "-l", "4", scratchFile, "-"]).stdout);
  record.edition = /(?:Reprint|Reprinted|Edition)\s+(20\d{2}(?:-\d{2})?)/i.exec(text)?.[0]?.trim() ?? null;
  if (spec.authority === "NCERT" && spec.requirement !== "ncert_rationalised_booklet" && !record.edition) {
    failures.push("NCERT edition could not be pinned from the imprint page");
  }

  record.sha256 = sha256(bytes);
  record.sha256Repeat = sha256(new Uint8Array(await Bun.file(scratchFile).arrayBuffer()));
  record.hashStable = record.sha256 === record.sha256Repeat;
  if (!record.hashStable) failures.push("SHA-256 is unstable across repeated execution");

  record.verdict = failures.length > 0 ? "FAILED" : unconfirmed ? "UNCONFIRMED_PUBLICATION" : "VERIFIED";
  return record;
}

const REQUIREMENT_LABELS: Record<Requirement, string> = {
  curriculum: "CBSE Secondary Curriculum 2025-26",
  maths_syllabus: "CBSE Mathematics 041 syllabus 2025-26",
  science_syllabus: "CBSE Science 086 syllabus 2025-26",
  maths_sample_paper: "Mathematics sample question paper",
  science_sample_paper: "Science sample question paper",
  maths_marking_scheme: "Mathematics marking scheme",
  science_marking_scheme: "Science marking scheme",
  ncert_maths_textbook: "NCERT Class 10 Mathematics textbook reference",
  ncert_science_textbook: "NCERT Class 10 Science textbook reference",
  ncert_rationalised_booklet: "NCERT Class 10 rationalised-content booklet",
};

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  return [headers.join(","), ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(","))].join("\n") + "\n";
}

export async function run() {
  const records: SourceRecord[] = [];
  for (const spec of SPECS) records.push(await verify(spec, false));
  for (const spec of UNCONFIRMED) records.push(await verify(spec, true));

  const verified = records.filter((r) => r.verdict === "VERIFIED");
  const missing = (Object.keys(REQUIREMENT_LABELS) as Requirement[]).filter(
    (req) => !verified.some((r) => r.requirement === req),
  );

  const sourceComplete = missing.length === 0;

  const register = {
    manifestVersion: "2",
    board: "CBSE",
    classLevel: 10,
    academicYear: "2025-26",
    generatedAt: new Date().toISOString(),
    generator: "scripts/compliance/ingest-official-sources.ts",
    officialDomains: OFFICIAL_DOMAINS,
    sourceStatus: sourceComplete ? "SOURCE_COMPLETE" : "SOURCE_INCOMPLETE",
    missingRequirements: missing.map((req) => ({ requirement: req, label: REQUIREMENT_LABELS[req] })),
    reviewerCertification: {
      gate: "NAMED_SUBJECT_EXPERT_REVIEW",
      status: "PENDING",
      note: "Source verification does not certify academic compliance. A named subject expert must sign off separately.",
    },
    sources: records,
  };

  mkdirSync(OUT_DATA, { recursive: true });
  writeFileSync(join(OUT_DATA, "class-10.official-sources.json"), JSON.stringify(register, null, 2) + "\n");

  writeFileSync(
    join(OUT_DATA, "class-10.official-sources.csv"),
    toCsv(
      records.map((r) => ({
        id: r.id,
        requirement: r.requirement,
        subject: r.subject,
        authority: r.authority,
        academic_year: r.academicYear,
        title: r.title,
        final_url: r.finalUrl ?? r.url,
        http_status: r.httpStatus,
        mime_type: r.mimeType,
        size_bytes: r.sizeBytes,
        page_count: r.pageCount,
        edition: r.edition,
        retrieved_at: r.retrievedAt,
        sha256: r.sha256,
        hash_stable: r.hashStable,
        redistributable: r.redistributable,
        verdict: r.verdict,
        failures: r.failures.join(" | "),
      })),
    ),
  );

  writeFileSync(
    join(OUT_DATA, "class-10.sha256.manifest"),
    records
      .filter((r) => r.sha256)
      .map((r) => `${r.sha256}  ${r.id}  ${r.finalUrl}`)
      .join("\n") + "\n",
  );

  const matrix = {
    generatedAt: register.generatedAt,
    board: "CBSE",
    classLevel: 10,
    academicYear: "2025-26",
    sourceStatus: register.sourceStatus,
    reviewerGate: "PENDING",
    complianceVerdict: "NOT_CERTIFIED",
    rows: (Object.keys(REQUIREMENT_LABELS) as Requirement[]).map((req) => {
      const hit = verified.find((r) => r.requirement === req);
      return {
        requirement: req,
        label: REQUIREMENT_LABELS[req],
        status: hit ? "SATISFIED" : "MISSING",
        sourceId: hit?.id ?? null,
        academicYear: hit?.academicYear ?? null,
        edition: hit?.edition ?? null,
        sha256: hit?.sha256 ?? null,
        url: hit?.finalUrl ?? null,
      };
    }),
  };

  writeFileSync("EDUOS_CLASS10_COMPLIANCE_MATRIX.json", JSON.stringify(matrix, null, 2) + "\n");
  writeFileSync("EDUOS_CLASS10_COMPLIANCE_MATRIX.csv", toCsv(matrix.rows as unknown as Record<string, unknown>[]));

  console.log(`SOURCE STATUS: ${register.sourceStatus}`);
  for (const r of records) {
    console.log(
      `${r.verdict.padEnd(24)} ${r.id.padEnd(46)} HTTP ${r.httpStatus} ${r.mimeType} ${r.sizeBytes}B pages=${r.pageCount} sha256=${r.sha256?.slice(0, 16)}… stable=${r.hashStable}`,
    );
    for (const f of r.failures) console.log(`    ! ${f}`);
  }
  return { register, matrix };
}

if (import.meta.main) {
  const { register } = await run();
  process.exit(register.sourceStatus === "SOURCE_COMPLETE" ? 0 : 1);
}
