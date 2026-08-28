import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

// @ts-expect-error - non-runtime audit tooling, plain ESM without types
import { findDuplicateKeys, scanContamination } from '../../../scripts/audit/build-baseline-package.mjs';

const DIR = 'audit-data/class10/2026-27';

const FILES = [
  'cbse-class10-mathematics-2026-27-baseline.json',
  'cbse-class10-mathematics-2026-27-baseline.schema.json',
  'mathematics-baseline-file-validation.json',
  'cbse-class10-science-2026-27-baseline.json',
  'cbse-class10-science-2026-27-baseline.schema.json',
  'science-baseline-file-validation.json',
];

const read = (name: string) => readFileSync(join(DIR, name));
const text = (name: string) => read(name).toString('utf8');
const json = (name: string) => JSON.parse(text(name));
const sha256 = (name: string) => createHash('sha256').update(read(name)).digest('hex');

describe('class 10 2026-27 baseline package — files', () => {
  it('contains exactly the six required files', () => {
    expect(readdirSync(DIR).sort()).toEqual([...FILES].sort());
  });

  it('has no duplicate-extension filenames', () => {
    for (const name of readdirSync(DIR)) expect(name.endsWith('.json.json')).toBe(false);
  });

  it('parses every file as strict JSON with valid UTF-8', () => {
    for (const name of FILES) {
      expect(() => new TextDecoder('utf-8', { fatal: true }).decode(read(name))).not.toThrow();
      expect(() => json(name)).not.toThrow();
    }
  });

  it('detects no duplicate JSON keys in any file', () => {
    for (const name of FILES) expect(findDuplicateKeys(text(name))).toEqual([]);
  });

  it('detects duplicate keys when they exist (parser sanity)', () => {
    expect(findDuplicateKeys('{"a":1,"b":{"c":1,"c":2}}')).toEqual(['b.c']);
  });

  it('reports zero HTML and Markdown contamination on saved bytes', () => {
    for (const name of FILES) {
      const scan = scanContamination(text(name));
      expect(scan.html).toBe(0);
      expect(scan.markdown).toBe(0);
    }
  });

  it('serialises deterministically (2-space indent, trailing newline)', () => {
    for (const name of FILES) {
      expect(text(name)).toBe(`${JSON.stringify(json(name), null, 2)}\n`);
    }
  });
});

describe('class 10 2026-27 baseline package — baseline/schema separation', () => {
  for (const subject of ['mathematics', 'science'] as const) {
    it(`${subject} schema is draft-07 and carries no baseline content`, () => {
      const schema = json(`cbse-class10-${subject}-2026-27-baseline.schema.json`);
      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(schema.requirements).toBeUndefined();
      expect(schema.source_records).toBeUndefined();
      expect(schema.properties.requirements.type).toBe('array');
    });

    it(`${subject} baseline references its local schema file`, () => {
      const baseline = json(`cbse-class10-${subject}-2026-27-baseline.json`);
      expect(baseline.$schema).toBe(`cbse-class10-${subject}-2026-27-baseline.schema.json`);
    });

    it(`${subject} baseline validates against its schema`, () => {
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(json(`cbse-class10-${subject}-2026-27-baseline.schema.json`));
      const ok = validate(json(`cbse-class10-${subject}-2026-27-baseline.json`));
      expect(validate.errors ?? []).toEqual([]);
      expect(ok).toBe(true);
    });
  }
});

describe('class 10 2026-27 baseline package — record reconciliation', () => {
  const cases = [
    {
      subject: 'mathematics',
      prefix: 'REQ_MATH_2026_',
      units: 7,
      chapters: 14,
      requirements: 38,
      exclusions: 0,
      ambiguities: 0,
    },
    {
      subject: 'science',
      prefix: 'REQ_SCI_2026_',
      units: 5,
      chapters: 13,
      requirements: 46,
      exclusions: 6,
      ambiguities: 2,
    },
  ] as const;

  for (const c of cases) {
    it(`${c.subject} counts, IDs and sequences reconcile`, () => {
      const b = json(`cbse-class10-${c.subject}-2026-27-baseline.json`);
      const reqs = b.requirements as Array<{
        requirement_id: string;
        sequence: number;
        official_unit: string;
        official_chapter: string;
        official_source_id: string;
      }>;
      expect(reqs).toHaveLength(c.requirements);
      expect(b.total_requirements).toBe(c.requirements);
      expect(new Set(reqs.map((r) => r.official_unit)).size).toBe(c.units);
      expect(new Set(reqs.map((r) => r.official_chapter)).size).toBe(c.chapters);
      expect(b.exclusions).toHaveLength(c.exclusions);
      expect(b.ambiguities).toHaveLength(c.ambiguities);

      const expectedIds = reqs.map(
        (_, i) => `${c.prefix}${String(i + 1).padStart(3, '0')}`,
      );
      expect(reqs.map((r) => r.requirement_id)).toEqual(expectedIds);
      expect(new Set(reqs.map((r) => r.requirement_id)).size).toBe(c.requirements);
      expect(reqs.map((r) => r.sequence)).toEqual(
        reqs.map((_, i) => i + 1),
      );
    });

    it(`${c.subject} source references all resolve`, () => {
      const b = json(`cbse-class10-${c.subject}-2026-27-baseline.json`);
      const ids = new Set((b.source_records as Array<{ source_id: string }>).map((s) => s.source_id));
      for (const r of b.requirements) expect(ids.has(r.official_source_id)).toBe(true);
      for (const e of b.exclusions) expect(ids.has(e.official_source_id)).toBe(true);
    });

    it(`${c.subject} source records stay unverified`, () => {
      const b = json(`cbse-class10-${c.subject}-2026-27-baseline.json`);
      for (const s of b.source_records) {
        expect(s.applicability_status).toBe('PENDING_CONFIRMATION');
        expect(s.finality_status).toBe('PENDING_CONFIRMATION');
        expect(s.checksum_status).toBe('CHECKSUM_NOT_COMPUTED');
        expect(s.sha256).toBeNull();
        expect(s.publication_date).toBeNull();
        expect(s.document_version).toBeNull();
        if (s.official_url !== null) expect(s.official_url).toMatch(/^https:\/\/[^\s<>"]+$/);
      }
    });
  }

  it('science exclusions use safe non-executing audit wording', () => {
    const b = json('cbse-class10-science-2026-27-baseline.json');
    const activeChapterTopics = new Set(
      b.requirements.map((r: { official_chapter: string; official_topic: string }) =>
        `${r.official_chapter}::${r.official_topic}`,
      ),
    );
    for (const e of b.exclusions) {
      expect(e.effect_on_eduos).toBe(
        'NOT_ELIGIBLE_FOR_CURRENT_DIAGNOSTICS_PENDING_CONFIRMED_MAPPING',
      );
      expect(e.candidate_effect_statement.length).toBeGreaterThan(0);
      expect(activeChapterTopics.has(`${e.official_chapter}::${e.excluded_topic}`)).toBe(false);
    }
  });

  it('science ambiguities remain unresolved in this package', () => {
    const validation = json('science-baseline-file-validation.json');
    expect(validation.ambiguities).toBe(2);
    expect(validation.semantic_transformations).toEqual([]);
  });
});

describe('class 10 2026-27 baseline package — validation files', () => {
  for (const subject of ['mathematics', 'science'] as const) {
    it(`${subject} validation file records reverified SHA-256 hashes`, () => {
      const v = json(`${subject}-baseline-file-validation.json`);
      const baselineName = `cbse-class10-${subject}-2026-27-baseline.json`;
      const schemaName = `cbse-class10-${subject}-2026-27-baseline.schema.json`;
      expect(v.baseline_filename).toBe(baselineName);
      expect(v.schema_filename).toBe(schemaName);
      expect(v.baseline_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(v.schema_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(v.input_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(v.baseline_sha256).toBe(sha256(baselineName));
      expect(v.schema_sha256).toBe(sha256(schemaName));
      expect(v.baseline_bytes).toBe(read(baselineName).length);
      expect(v.schema_bytes).toBe(read(schemaName).length);
      expect(v.validation_status).toBe('PASS');
      expect(v.duplicate_json_keys_checked).toBe(true);
      expect(v.duplicate_json_keys).toEqual([]);
      expect(v.html_contamination_count).toBe(0);
      expect(v.markdown_contamination_count).toBe(0);
      expect(v.missing_requirement_ids).toEqual([]);
      expect(v.duplicate_requirement_ids).toEqual([]);
      expect(v.duplicate_sequences).toEqual([]);
      expect(v.missing_source_references).toEqual([]);
      expect(v.official_source_checksums_computed).toEqual([]);
      expect(v.academic_overreach_flags.length).toBeGreaterThan(0);
      expect(v.mechanical_transformations.length).toBeGreaterThan(0);
    });
  }
});
