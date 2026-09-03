// Official CBSE Class 10 past-paper acquisition and provenance verification.
//
//   bun run scripts/pyq/acquire-cbse-class10.ts
//
// Rules encoded here (do not relax):
//  * The ONLY entry point is the official archive page. Every download URL is
//    parsed from that page's markup — no URL is ever constructed or guessed.
//  * Only main-examination Mathematics Standard (041) and Science (086) are
//    accepted. Mathematics Basic (241), compartment ("-COMPTT"), sample papers
//    and marking schemes are excluded by construction.
//  * Binaries are written to a private evidence directory OUTSIDE the
//    application bundle and are never committed.
//  * No question text is extracted into the product. Only structural metadata
//    (page counts, section/mark structure) is retained.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";

export const PYQ_CONTRACT_VERSION = "1.0.0";

export const ARCHIVE_PAGE = "https://www.cbse.gov.in/cbsenew/question-paper.html";
export const YEARS = [2022, 2023, 2024, 2025, 2026] as const;
export const SUBJECTS = ["Mathematics Standard", "Science"] as const;
export type PyqSubject = (typeof SUBJECTS)[number];

// Private evidence root: outside the repository and outside public/.
export const EVIDENCE_ROOT = "/mnt/documents/eduos-private-evidence/cbse-class10-pyq";
const REPO = resolve(import.meta.dirname, "../..");

/** Excluded by policy — compartment, basic maths, sample papers, marking schemes. */
export function isExcludedPath(path: string): boolean {
  return /COMPTT|BASIC|Math_B\b|_B\.zip|SQP|Sample|Marking|MS_|Second/i.test(path);
}

/** Classify a Class X archive link into an accepted subject, or null. */
export function classifyLink(path: string): { year: number; subject: PyqSubject } | null {
  const m = /question-paper\/(\d{4})(-COMPTT)?\/X\/(.+)$/i.exec(path);
  if (!m) return null;
  const [, yearRaw, comptt, file] = m;
  if (comptt) return null;
  const year = Number(yearRaw);
  if (!(YEARS as readonly number[]).includes(year)) return null;
  if (isExcludedPath(file!)) return null;
  if (/^(041_)?math(ematics)?[_ ]?(standard|s)\.zip$/i.test(file!)) {
    return { year, subject: "Mathematics Standard" };
  }
  // 2022 ships the Science archive with an official spelling error ("Scince").
  if (/^(086_)?(science|scince)\.zip$/i.test(file!)) return { year, subject: "Science" };
  return null;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function signatureOf(buf: Buffer): "ZIP" | "PDF" | "HTML" | "UNKNOWN" {
  const head = buf.subarray(0, 5).toString("latin1");
  if (head.startsWith("PK\u0003\u0004")) return "ZIP";
  if (head.startsWith("%PDF")) return "PDF";
  if (/^\s*<(!doctype|html)/i.test(buf.subarray(0, 64).toString("latin1"))) return "HTML";
  return "UNKNOWN";
}

type Accepted = {
  year: number;
  subject: PyqSubject;
  subjectCode: "041" | "086";
  linkHref: string;
  requestUrl: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  bytes: number;
  fileSignature: string;
  sha256: string;
  sha256Recomputed: string;
  checksumsAgree: boolean;
  storedAt: string;
};

type Missing = { year: number; subject: PyqSubject; reason: string; detail: string };

function curl(url: string, out: string): { status: number; type: string; finalUrl: string } {
  const meta = execFileSync(
    "curl",
    [
      "-sSL",
      "--max-time",
      "120",
      "-A",
      "Mozilla/5.0",
      "-o",
      out,
      "-w",
      "%{http_code}\\n%{content_type}\\n%{url_effective}",
      url,
    ],
    { encoding: "utf8" },
  ).split("\n");
  return { status: Number(meta[0]), type: (meta[1] ?? "").trim(), finalUrl: (meta[2] ?? "").trim() };
}

async function main() {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const pagePath = join(EVIDENCE_ROOT, "_archive-page.html");
  const page = curl(ARCHIVE_PAGE, pagePath);
  if (page.status !== 200) throw new Error(`archive page HTTP ${page.status}`);
  const html = readFileSync(pagePath, "utf8");

  const hrefs = [...new Set([...html.matchAll(/href=["']([^"']+\.zip)["']/gi)].map((m) => m[1]!))];
  const targets = hrefs
    .map((h) => ({ href: h, hit: classifyLink(h) }))
    .filter((t): t is { href: string; hit: { year: number; subject: PyqSubject } } => !!t.hit);

  const accepted: Accepted[] = [];
  const missing: Missing[] = [];

  for (const year of YEARS) {
    for (const subject of SUBJECTS) {
      const found = targets.find((t) => t.hit.year === year && t.hit.subject === subject);
      if (!found) {
        missing.push({
          year,
          subject,
          reason: "NO_OFFICIAL_LINK",
          detail: "No matching main-examination link is published on the official archive page.",
        });
        continue;
      }
      const url = new URL(found.href, "https://www.cbse.gov.in/cbsenew/").toString();
      const code = subject === "Science" ? "086" : "041";
      const dir = join(EVIDENCE_ROOT, String(year));
      mkdirSync(dir, { recursive: true });
      const out = join(dir, `${code}_${subject.replace(/ /g, "_")}_${year}.zip`);
      const res = curl(url, out);
      const buf = readFileSync(out);
      const sig = signatureOf(buf);
      if (res.status !== 200 || buf.length === 0 || sig !== "ZIP") {
        missing.push({
          year,
          subject,
          reason:
            buf.length === 0 ? "ZERO_BYTES" : sig === "HTML" ? "HTML_ERROR_PAGE" : "BAD_RESPONSE",
          detail: `HTTP ${res.status} ${res.type} ${buf.length}B signature=${sig} url=${res.finalUrl}`,
        });
        continue;
      }
      accepted.push({
        year,
        subject,
        subjectCode: code,
        linkHref: found.href,
        requestUrl: url,
        finalUrl: res.finalUrl,
        httpStatus: res.status,
        contentType: res.type,
        bytes: buf.length,
        fileSignature: sig,
        sha256: sha256(buf),
        sha256Recomputed: sha256(readFileSync(out)),
        checksumsAgree: sha256(buf) === sha256(readFileSync(out)),
        storedAt: out,
      });
      console.log(`accepted ${year} ${subject} ${buf.length}B`);
    }
  }

  // ---- ZIP integrity + PDF inventory -----------------------------------
  type InvRow = {
    year: number;
    subject: PyqSubject;
    archive: string;
    entry: string;
    entryBytes: number;
    entrySignature: string;
    entrySha256: string;
    setSeries: string;
    examType: string;
  };
  const inventory: InvRow[] = [];
  const zipFailures: string[] = [];

  for (const a of accepted) {
    const extractDir = a.storedAt.replace(/\.zip$/, "-extracted");
    mkdirSync(extractDir, { recursive: true });
    try {
      execFileSync("unzip", ["-tqq", a.storedAt], { stdio: "pipe" });
      execFileSync("unzip", ["-oqq", a.storedAt, "-d", extractDir], { stdio: "pipe" });
    } catch (err) {
      zipFailures.push(`${a.year} ${a.subject}: ${(err as Error).message}`);
      continue;
    }
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        return statSync(p).isDirectory() ? walk(p) : [p];
      });
    for (const file of walk(extractDir)) {
      const buf = readFileSync(file);
      const name = file.slice(extractDir.length + 1);
      const setMatch = /(\d{1,2}[-_ ]?\d?[-_ ]?\d?)/.exec(name.replace(/\.pdf$/i, ""));
      inventory.push({
        year: a.year,
        subject: a.subject,
        archive: a.storedAt.split("/").pop()!,
        entry: name,
        entryBytes: buf.length,
        entrySignature: signatureOf(buf),
        entrySha256: sha256(buf),
        setSeries: setMatch?.[1] ?? "",
        examType: isExcludedPath(name) ? "EXCLUDED_CANDIDATE" : "MAIN",
      });
    }
  }

  // ---- Deliverables -----------------------------------------------------
  const register = {
    contractVersion: PYQ_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    archivePage: ARCHIVE_PAGE,
    policy: {
      urlConstruction: "none — every URL is parsed from the official archive page markup",
      excluded: ["Mathematics Basic 241", "compartment", "sample papers", "marking schemes"],
      storage: EVIDENCE_ROOT,
      questionTextImported: false,
      externalChecksumsUsed: false,
    },
    accepted,
    missing,
    zipFailures,
    counts: {
      acceptedArchives: accepted.length,
      byYear: Object.fromEntries(
        YEARS.map((y) => [y, accepted.filter((a) => a.year === y).length]),
      ),
      bySubject: Object.fromEntries(
        SUBJECTS.map((s) => [s, accepted.filter((a) => a.subject === s).length]),
      ),
      pdfEntries: inventory.filter((i) => i.entrySignature === "PDF").length,
    },
  };

  const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n") + "\n";
  writeFileSync(join(REPO, "CBSE_CLASS10_PYQ_SOURCE_REGISTER.json"), `${JSON.stringify(register, null, 2)}\n`);
  writeFileSync(
    join(REPO, "CBSE_CLASS10_PYQ_SOURCE_REGISTER.csv"),
    csv([
      ["year", "subject", "subject_code", "final_url", "http_status", "content_type", "bytes", "signature", "sha256", "checksums_agree"],
      ...accepted.map((a) => [
        String(a.year), a.subject, a.subjectCode, a.finalUrl, String(a.httpStatus), a.contentType,
        String(a.bytes), a.fileSignature, a.sha256, String(a.checksumsAgree),
      ]),
    ]),
  );
  writeFileSync(
    join(REPO, "CBSE_CLASS10_PYQ_SHA256SUMS.txt"),
    accepted.map((a) => `${a.sha256}  ${a.storedAt}`).join("\n") + "\n",
  );
  writeFileSync(
    join(REPO, "CBSE_CLASS10_PYQ_EXTRACTION_INVENTORY.csv"),
    csv([
      ["year", "subject", "archive", "pdf_entry", "bytes", "signature", "sha256", "set_series", "exam_type"],
      ...inventory.map((i) => [
        String(i.year), i.subject, i.archive, i.entry, String(i.entryBytes), i.entrySignature,
        i.entrySha256, i.setSeries, i.examType,
      ]),
    ]),
  );
  writeFileSync(
    join(REPO, "CBSE_CLASS10_PYQ_MISSING_FILES.csv"),
    csv([["year", "subject", "reason", "detail"], ...missing.map((m) => [String(m.year), m.subject, m.reason, m.detail])]),
  );

  console.log(JSON.stringify(register.counts, null, 2));
  console.log(`missing: ${missing.length}, zip failures: ${zipFailures.length}`);
}

if (import.meta.main) await main();
