// Retrieves the five official source categories that the corrected Class 10
// certification package recorded as missing, strictly from official CBSE
// (cbseacademic.nic.in) and NCERT (ncert.nic.in) domains.
//
//   bun run scripts/compliance/retrieve-missing-sources.ts
//
// No document is committed to the repository. Only retrieval provenance
// (URL, HTTP status, MIME type, byte length, SHA-256) is recorded in
//   content/compliance/class-10-2026-27.missing-sources.json
// Anything that cannot be retrieved from an official domain is recorded as
// MISSING with the reproducible HTTP evidence. No unofficial substitution.

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const MISSING_SOURCE_CONTRACT_VERSION = "1.0.0";

const OFFICIAL_HOSTS = ["cbseacademic.nic.in", "ncert.nic.in", "cbse.gov.in"];

type Category =
  | "cbse_curriculum"
  | "ncert_textbook"
  | "rationalised_content_notice"
  | "sample_paper"
  | "marking_scheme";

type Target = {
  sourceId: string;
  category: Category;
  subject: "Mathematics" | "Science" | "All";
  academicYear: string;
  authority: "CBSE" | "NCERT";
  title: string;
  url: string;
  note?: string;
};

const MATH_CHAPTERS = Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, "0"));
const SCIENCE_CHAPTERS = Array.from({ length: 13 }, (_, i) => String(i + 1).padStart(2, "0"));

export const TARGETS: Target[] = [
  {
    sourceId: "SRC_CBSE_CURRICULUM_SEC_2026_27",
    category: "cbse_curriculum",
    subject: "All",
    academicYear: "2026-27",
    authority: "CBSE",
    title: "CBSE Secondary School Curriculum (Classes IX-X), Part 1, session 2026-27",
    url: "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Curriculum_SecP1_2026-27.pdf",
  },
  {
    sourceId: "SRC_NCERT_RATIONALISED_C10",
    category: "rationalised_content_notice",
    subject: "All",
    academicYear: "current",
    authority: "NCERT",
    title: "NCERT Rationalised Content booklet, Class X",
    url: "https://ncert.nic.in/pdf/BookletClass10.pdf",
  },
  ...MATH_CHAPTERS.map<Target>((c) => ({
    sourceId: `SRC_NCERT_MATH_C10_CH${c}`,
    category: "ncert_textbook",
    subject: "Mathematics",
    academicYear: "current",
    authority: "NCERT",
    title: `NCERT Mathematics Class X (jemh1), chapter ${Number(c)}`,
    url: `https://ncert.nic.in/textbook/pdf/jemh1${c}.pdf`,
  })),
  ...SCIENCE_CHAPTERS.map<Target>((c) => ({
    sourceId: `SRC_NCERT_SCI_C10_CH${c}`,
    category: "ncert_textbook",
    subject: "Science",
    academicYear: "current",
    authority: "NCERT",
    title: `NCERT Science Class X (jesc1), chapter ${Number(c)}`,
    url: `https://ncert.nic.in/textbook/pdf/jesc1${c}.pdf`,
  })),
  // 2026-27 assessment artefacts: expected location, published only when CBSE
  // releases the session's sample papers. Probed so the MISSING verdict is
  // reproducible rather than asserted.
  {
    sourceId: "SRC_CBSE_SQP_INDEX_2026_27",
    category: "sample_paper",
    subject: "All",
    academicYear: "2026-27",
    authority: "CBSE",
    title: "CBSE Class X sample question paper index, session 2026-27",
    url: "https://cbseacademic.nic.in/SQP_CLASSX_2026-27.html",
    note: "Session 2026-27 sample papers not yet published by CBSE at the time of retrieval.",
  },
  // Latest published official assessment artefacts (previous session). Recorded
  // as prior-session evidence only; they do not satisfy the 2026-27 requirement.
  {
    sourceId: "SRC_CBSE_SQP_MATH_STD_2025_26",
    category: "sample_paper",
    subject: "Mathematics",
    academicYear: "2025-26",
    authority: "CBSE",
    title: "CBSE Class X Mathematics Standard sample question paper, session 2025-26",
    url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/MathsStandard-SQP.pdf",
  },
  {
    sourceId: "SRC_CBSE_MS_MATH_STD_2025_26",
    category: "marking_scheme",
    subject: "Mathematics",
    academicYear: "2025-26",
    authority: "CBSE",
    title: "CBSE Class X Mathematics Standard marking scheme, session 2025-26",
    url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/MathsStandard-MS.pdf",
  },
  {
    sourceId: "SRC_CBSE_SQP_MATH_BASIC_2025_26",
    category: "sample_paper",
    subject: "Mathematics",
    academicYear: "2025-26",
    authority: "CBSE",
    title: "CBSE Class X Mathematics Basic sample question paper, session 2025-26",
    url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/MathsBasic-SQP.pdf",
  },
  {
    sourceId: "SRC_CBSE_MS_MATH_BASIC_2025_26",
    category: "marking_scheme",
    subject: "Mathematics",
    academicYear: "2025-26",
    authority: "CBSE",
    title: "CBSE Class X Mathematics Basic marking scheme, session 2025-26",
    url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/MathsBasic-MS.pdf",
  },
  {
    sourceId: "SRC_CBSE_SQP_SCI_2025_26",
    category: "sample_paper",
    subject: "Science",
    academicYear: "2025-26",
    authority: "CBSE",
    title: "CBSE Class X Science sample question paper, session 2025-26",
    url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/Science-SQP.pdf",
  },
  {
    sourceId: "SRC_CBSE_MS_SCI_2025_26",
    category: "marking_scheme",
    subject: "Science",
    academicYear: "2025-26",
    authority: "CBSE",
    title: "CBSE Class X Science marking scheme, session 2025-26",
    url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/Science-MS.pdf",
  },
];

export function isOfficialHost(url: string): boolean {
  try {
    return OFFICIAL_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function retrieve(target: Target) {
  const retrievalTimestamp = new Date().toISOString();
  if (!isOfficialHost(target.url)) {
    return {
      ...target,
      retrievalTimestamp,
      retrievalStatus: "REJECTED_UNOFFICIAL_DOMAIN" as const,
      httpStatus: null,
      finalUrl: null,
      contentType: null,
      byteLength: null,
      sha256: null,
      checksumAlgorithm: "sha256",
      documentRetained: false,
    };
  }
  try {
    const response = await fetch(target.url, { redirect: "follow" });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type");
    const isPdf = (contentType ?? "").includes("pdf");
    const ok = response.ok && (isPdf || !target.url.endsWith(".pdf"));
    return {
      ...target,
      retrievalTimestamp,
      httpStatus: response.status,
      finalUrl: response.url,
      contentType,
      byteLength: bytes.length,
      sha256: ok ? createHash("sha256").update(bytes).digest("hex") : null,
      checksumAlgorithm: "sha256",
      retrievalStatus: ok ? ("RETRIEVED" as const) : ("MISSING" as const),
      documentRetained: false,
    };
  } catch (error) {
    return {
      ...target,
      retrievalTimestamp,
      httpStatus: null,
      finalUrl: null,
      contentType: null,
      byteLength: null,
      sha256: null,
      checksumAlgorithm: "sha256",
      retrievalStatus: "MISSING" as const,
      transportError: String(error),
      documentRetained: false,
    };
  }
}

type RetrievalRecord = Awaited<ReturnType<typeof retrieve>>;

async function main() {
  const records: RetrievalRecord[] = [];
  for (const target of TARGETS) {
    const record = await retrieve(target);
    records.push(record);
    console.log(
      `  ${record.sourceId}: ${record.retrievalStatus} http=${record.httpStatus ?? "-"} bytes=${record.byteLength ?? "-"} sha256=${record.sha256 ? record.sha256.slice(0, 16) + "…" : "-"}`,
    );
  }

  const categories: Category[] = [
    "cbse_curriculum",
    "ncert_textbook",
    "rationalised_content_notice",
    "sample_paper",
    "marking_scheme",
  ];
  const categorySummary = categories.map((category) => {
    const inCategory = records.filter((r) => r.category === category);
    const retrieved = inCategory.filter((r) => r.retrievalStatus === "RETRIEVED");
    const forSession = retrieved.filter((r) => r.academicYear === "2026-27" || r.academicYear === "current");
    return {
      category,
      attempted: inCategory.length,
      retrieved: retrieved.length,
      missing: inCategory.length - retrieved.length,
      satisfiesCurrentSession: forSession.length > 0,
      status: forSession.length > 0 ? "RETRIEVED" : retrieved.length > 0 ? "PRIOR_SESSION_ONLY" : "MISSING",
    };
  });

  const payload = {
    contractVersion: MISSING_SOURCE_CONTRACT_VERSION,
    board: "CBSE",
    classLevel: 10,
    academicYear: "2026-27",
    generatedAt: new Date().toISOString(),
    officialHostAllowlist: OFFICIAL_HOSTS,
    documentRetentionPolicy:
      "No official document is committed. Identity is preserved through the official URL, byte length and SHA-256 recorded here.",
    categorySummary,
    sources: records,
    overallStatus: categorySummary.every((c) => c.status === "RETRIEVED")
      ? "ALL_CATEGORIES_RETRIEVED"
      : "CATEGORIES_INCOMPLETE",
  };

  const out = resolve(import.meta.dirname, "../../content/compliance/class-10-2026-27.missing-sources.json");
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`wrote ${out} — ${payload.overallStatus}`);
  for (const c of categorySummary) console.log(`  ${c.category}: ${c.status} (${c.retrieved}/${c.attempted})`);
}

if (import.meta.main) await main();
