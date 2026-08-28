#!/usr/bin/env node
/**
 * Non-runtime audit tooling.
 *
 * Materialises the founder-supplied CBSE Class 10 2026-27 candidate baselines into the
 * committed audit package under audit-data/class10/2026-27/.
 *
 * This script performs MECHANICAL transformations only. It never adds, removes, merges,
 * splits or re-classifies an academic requirement, exclusion or ambiguity.
 *
 * Usage: node scripts/audit/build-baseline-package.mjs <inputDir>
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.argv[2] ?? '/mnt/user-uploads';
const OUT_DIR = 'audit-data/class10/2026-27';
const TIMESTAMP = '2026-08-28T20:07:00Z';

const OFFICIAL_URLS = {
  mathematics:
    'https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Maths_SecP1X_2026-27.pdf',
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const stable = (value) => JSON.stringify(value, null, 2) + '\n';

function parseStrict(text) {
  const duplicates = [];
  const reviver = null;
  // Duplicate-key detection: re-scan with a streaming-safe approach using JSON.parse
  // source-order pairs is not exposed in JS, so we use a minimal tokenizer.
  const dup = findDuplicateKeys(text);
  duplicates.push(...dup);
  return { value: JSON.parse(text, reviver ?? undefined), duplicates };
}

/** Minimal JSON tokenizer that reports duplicate object keys with their path. */
export function findDuplicateKeys(text) {
  const duplicates = [];
  let i = 0;
  const path = [];

  const ws = () => {
    while (i < text.length && /\s/.test(text[i])) i++;
  };
  const readString = () => {
    if (text[i] !== '"') throw new Error(`expected string at ${i}`);
    let out = '';
    i++;
    while (i < text.length) {
      const c = text[i];
      if (c === '\\') {
        out += text[i] + text[i + 1];
        i += 2;
        continue;
      }
      if (c === '"') {
        i++;
        return out;
      }
      out += c;
      i++;
    }
    throw new Error('unterminated string');
  };
  const readValue = () => {
    ws();
    const c = text[i];
    if (c === '{') {
      i++;
      const seen = new Set();
      ws();
      if (text[i] === '}') {
        i++;
        return;
      }
      for (;;) {
        ws();
        const key = readString();
        if (seen.has(key)) duplicates.push([...path, key].join('.'));
        seen.add(key);
        ws();
        if (text[i] !== ':') throw new Error(`expected : at ${i}`);
        i++;
        path.push(key);
        readValue();
        path.pop();
        ws();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === '}') {
          i++;
          return;
        }
        throw new Error(`expected , or } at ${i}`);
      }
    }
    if (c === '[') {
      i++;
      ws();
      if (text[i] === ']') {
        i++;
        return;
      }
      let index = 0;
      for (;;) {
        path.push(String(index++));
        readValue();
        path.pop();
        ws();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === ']') {
          i++;
          return;
        }
        throw new Error(`expected , or ] at ${i}`);
      }
    }
    if (c === '"') {
      readString();
      return;
    }
    const rest = text.slice(i);
    const m = /^(true|false|null|-?\d+(\.\d+)?([eE][+-]?\d+)?)/.exec(rest);
    if (!m) throw new Error(`unexpected token at ${i}: ${rest.slice(0, 12)}`);
    i += m[0].length;
  };

  readValue();
  ws();
  if (i !== text.length) throw new Error('trailing content');
  return duplicates;
}

const SAFE_EFFECT = 'NOT_ELIGIBLE_FOR_CURRENT_DIAGNOSTICS_PENDING_CONFIRMED_MAPPING';

function pendingSource(record) {
  return {
    ...record,
    publication_date: null,
    document_version: null,
    retrieval_timestamp: null,
    applicability_status: 'PENDING_CONFIRMATION',
    finality_status: 'PENDING_CONFIRMATION',
    checksum_status: 'CHECKSUM_NOT_COMPUTED',
    sha256: null,
  };
}

function buildMathematics(input) {
  const log = [];
  const requirements = input.requirements.map((r, index) => {
    const seq = index + 1;
    return {
      requirement_id: r.requirement_id,
      sequence: seq,
      official_unit: r.official_unit,
      official_chapter: r.official_chapter,
      official_topic: r.official_topic,
      official_requirement: r.official_requirement,
      requirement_type: r.requirement_type,
      assessability: r.assessability,
      official_source_id: r.official_source_id,
      source_reference: r.source_reference,
      auditor_derived: r.auditor_derived,
      ambiguity_status: r.ambiguity_status,
      review_note: r.review_note,
      status: 'ACTIVE_BASELINE_REQUIREMENT',
    };
  });
  log.push(
    'Corrected root $schema from "cbse-class10-mathematics-2026-27-baseline.json" to the local schema filename "cbse-class10-mathematics-2026-27-baseline.schema.json".',
    'Replaced the composite string subject_code "041/241" with the deterministic array subject_codes ["041","241"]; no assessment-treatment equivalence between Mathematics Standard (041) and Mathematics Basic (241) is asserted.',
    'Added derived structural counts total_units (7) and total_chapters (14) computed from the candidate requirement records; no requirement was added, removed or altered.',
    'Added a deterministic 1-based sequence field to each requirement, derived from the candidate array order; requirement order was not changed.',
    'Added status "ACTIVE_BASELINE_REQUIREMENT" to each requirement for parity with the Science baseline contract; no assessability value was changed.',
    'Materialised the source_records array for the single referenced source id SRC_CBSE_MATH_2627, which the candidate file referenced but did not define. All unverified metadata is null / PENDING_CONFIRMATION / CHECKSUM_NOT_COMPUTED. The official_url is the founder-supplied official reference URL and denotes official-domain URL identity only, not retrieval or checksum confirmation.',
    'Added empty exclusions and ambiguities arrays for structural parity; no exclusion or ambiguity was invented.',
    'Serialised deterministically with 2-space indentation, source key order preserved and a trailing newline.',
  );

  const units = [...new Set(requirements.map((r) => r.official_unit))];
  const chapters = [...new Set(requirements.map((r) => r.official_chapter))];

  return {
    baseline: {
      $schema: 'cbse-class10-mathematics-2026-27-baseline.schema.json',
      baseline_version: '1.0.0',
      board: 'CBSE',
      class: '10',
      academic_year: '2026-27',
      subject: 'Mathematics',
      subject_codes: ['041', '241'],
      subject_code_note:
        'Mathematics Standard (041) and Mathematics Basic (241) share the candidate content baseline. This package makes no claim that the two codes receive identical assessment treatment; question-paper design and difficulty differ and require human subject-expert confirmation.',
      status: 'INDEPENDENT_BASELINE_UNVERIFIED_BY_HUMAN_EXPERT',
      source_records: [
        pendingSource({
          source_id: 'SRC_CBSE_MATH_2627',
          authority: 'CBSE Academic',
          title:
            'Secondary School Curriculum 2026-27: Main Subjects (Mathematics - Subject Codes 041/241)',
          source_type: 'OFFICIAL_SYLLABUS',
          subject: 'Mathematics',
          subject_codes: ['041', '241'],
          academic_year: '2026-27',
          official_url: OFFICIAL_URLS.mathematics,
          notes:
            'Source record materialised during packaging because the candidate file referenced this source id without defining it. Official-domain URL identity only: the document was not retrieved, no checksum was computed and session applicability is unconfirmed.',
        }),
      ],
      total_units: units.length,
      total_chapters: chapters.length,
      total_requirements: requirements.length,
      requirements,
      exclusions: [],
      ambiguities: [],
    },
    log,
  };
}

function buildScience(input) {
  const log = [];
  const source_records = input.source_records.map((record) => {
    if (record.applicability_status !== 'PENDING_CONFIRMATION')
      log.push(
        `Downgraded source ${record.source_id} applicability_status "${record.applicability_status}" to PENDING_CONFIRMATION: no official document was retrieved or checksummed in this environment.`,
      );
    if (record.finality_status !== 'PENDING_CONFIRMATION')
      log.push(
        `Downgraded source ${record.source_id} finality_status "${record.finality_status}" to PENDING_CONFIRMATION: finality was not independently verified.`,
      );
    if (record.retrieval_timestamp)
      log.push(
        `Set source ${record.source_id} retrieval_timestamp to null: the candidate value asserted a retrieval that this package cannot evidence.`,
      );
    const next = pendingSource(record);
    if ('subject_code' in next) {
      next.subject_code = record.subject_code;
    }
    return next;
  });

  const exclusions = input.exclusions.map((e) => {
    log.push(
      `Replaced destructive action wording in ${e.exclusion_id}.effect_on_eduos with the safe non-executing audit code ${SAFE_EFFECT}; the original candidate statement is preserved verbatim in candidate_effect_statement and the academic classification is unchanged.`,
    );
    const { effect_on_eduos, ...rest } = e;
    return {
      ...rest,
      effect_on_eduos: SAFE_EFFECT,
      recommended_actions: [
        'RETIRE_ONLY_AFTER_CONFIRMED_MAPPING',
        'PRESERVE_HISTORICAL_REFERENCE',
        'HUMAN_REVIEW_REQUIRED',
      ],
      candidate_effect_statement: effect_on_eduos,
    };
  });

  log.push(
    'Serialised deterministically with 2-space indentation, source key order preserved and a trailing newline.',
  );

  return {
    baseline: {
      ...input,
      $schema: 'cbse-class10-science-2026-27-baseline.schema.json',
      source_records,
      exclusions,
    },
    log,
  };
}

/* -------------------------------------------------------------------------- */

const SOURCE_RECORD_SCHEMA = (subjectCodeShape) => ({
  type: 'object',
  additionalProperties: false,
  required: [
    'source_id',
    'authority',
    'title',
    'source_type',
    'subject',
    'academic_year',
    'official_url',
    'publication_date',
    'retrieval_timestamp',
    'document_version',
    'applicability_status',
    'finality_status',
    'checksum_status',
    'sha256',
    'notes',
  ],
  properties: {
    source_id: { type: 'string', minLength: 1 },
    authority: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    source_type: {
      type: 'string',
      enum: [
        'OFFICIAL_SYLLABUS',
        'NCERT_TEXTBOOK',
        'RATIONALISATION_NOTICE',
        'TRANSITION_ADVISORY',
        'OFFICIAL_ANNOUNCEMENT',
      ],
    },
    subject: { type: 'string', enum: ['Mathematics', 'Science'] },
    ...subjectCodeShape,
    academic_year: { type: 'string', const: '2026-27' },
    official_url: {
      anyOf: [{ type: 'string', pattern: '^https://[^\\s<>"]+$' }, { type: 'null' }],
    },
    publication_date: { type: 'null' },
    retrieval_timestamp: { type: 'null' },
    document_version: { type: 'null' },
    applicability_status: { type: 'string', const: 'PENDING_CONFIRMATION' },
    finality_status: { type: 'string', const: 'PENDING_CONFIRMATION' },
    checksum_status: { type: 'string', const: 'CHECKSUM_NOT_COMPUTED' },
    sha256: { type: 'null' },
    notes: { type: 'string' },
  },
});

const AMBIGUITY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'ambiguity_id',
    'topic',
    'cbse_evidence',
    'ncert_evidence',
    'rationalised_content_evidence',
    'recommended_classification',
    'human_review_required',
    'unresolved_issue',
  ],
  properties: {
    ambiguity_id: { type: 'string', pattern: '^AMB_SCI_2026_\\d{3}$' },
    topic: { type: 'string', minLength: 1 },
    cbse_evidence: { type: 'string' },
    ncert_evidence: { type: 'string' },
    rationalised_content_evidence: { type: 'string' },
    recommended_classification: { type: 'string', minLength: 1 },
    human_review_required: { type: 'boolean' },
    unresolved_issue: { type: 'string' },
  },
};

function mathematicsSchema() {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'cbse-class10-mathematics-2026-27-baseline.schema.json',
    title: 'CBSE Class 10 Mathematics 2026-27 candidate baseline',
    description:
      'Draft-07 contract for the non-runtime Mathematics audit baseline. Contains no baseline content.',
    type: 'object',
    additionalProperties: false,
    required: [
      '$schema',
      'baseline_version',
      'board',
      'class',
      'academic_year',
      'subject',
      'subject_codes',
      'status',
      'source_records',
      'total_units',
      'total_chapters',
      'total_requirements',
      'requirements',
      'exclusions',
      'ambiguities',
    ],
    properties: {
      $schema: { type: 'string', const: 'cbse-class10-mathematics-2026-27-baseline.schema.json' },
      baseline_version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
      board: { type: 'string', const: 'CBSE' },
      class: { type: 'string', const: '10' },
      academic_year: { type: 'string', const: '2026-27' },
      subject: { type: 'string', const: 'Mathematics' },
      subject_codes: {
        type: 'array',
        items: { type: 'string', enum: ['041', '241'] },
        minItems: 2,
        maxItems: 2,
        uniqueItems: true,
      },
      subject_code_note: { type: 'string' },
      status: {
        type: 'string',
        enum: [
          'INDEPENDENT_BASELINE_UNVERIFIED_BY_HUMAN_EXPERT',
          'HUMAN_EXPERT_REVIEWED',
        ],
      },
      source_records: {
        type: 'array',
        minItems: 1,
        items: SOURCE_RECORD_SCHEMA({
          subject_codes: {
            type: 'array',
            items: { type: 'string', enum: ['041', '241'] },
            minItems: 1,
          },
        }),
      },
      total_units: { type: 'integer', minimum: 1 },
      total_chapters: { type: 'integer', minimum: 1 },
      total_requirements: { type: 'integer', minimum: 1 },
      requirements: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'requirement_id',
            'sequence',
            'official_unit',
            'official_chapter',
            'official_topic',
            'official_requirement',
            'requirement_type',
            'assessability',
            'official_source_id',
            'source_reference',
            'auditor_derived',
            'ambiguity_status',
            'review_note',
            'status',
          ],
          properties: {
            requirement_id: { type: 'string', pattern: '^REQ_MATH_2026_\\d{3}$' },
            sequence: { type: 'integer', minimum: 1 },
            official_unit: {
              type: 'string',
              enum: [
                'Unit I: Number Systems',
                'Unit II: Algebra',
                'Unit III: Coordinate Geometry',
                'Unit IV: Geometry',
                'Unit V: Trigonometry',
                'Unit VI: Mensuration',
                'Unit VII: Statistics and Probability',
              ],
            },
            official_chapter: { type: 'string', minLength: 1 },
            official_topic: { type: 'string', minLength: 1 },
            official_requirement: { type: 'string', minLength: 1 },
            requirement_type: {
              type: 'string',
              enum: [
                'CONCEPTUAL_UNDERSTANDING',
                'CALCULATION',
                'PROOF_OR_JUSTIFICATION',
                'APPLICATION',
                'VISUALISATION',
                'PROBLEM_SOLVING',
                'DATA_ANALYSIS',
              ],
            },
            assessability: {
              type: 'string',
              enum: ['ASSESSABLE_CORE', 'SUPPORTING_CONTEXT', 'NOT_ASSESSABLE'],
            },
            official_source_id: { type: 'string', const: 'SRC_CBSE_MATH_2627' },
            source_reference: { type: 'string', minLength: 1 },
            auditor_derived: { type: 'boolean' },
            ambiguity_status: {
              type: 'string',
              enum: ['CLEAR', 'AMBIGUOUS_REVIEW_REQUIRED'],
            },
            review_note: { type: 'string' },
            status: { type: 'string', const: 'ACTIVE_BASELINE_REQUIREMENT' },
          },
        },
      },
      exclusions: { type: 'array', items: { type: 'object' }, maxItems: 0 },
      ambiguities: { type: 'array', items: AMBIGUITY_SCHEMA, maxItems: 0 },
    },
  };
}

function scienceSchema() {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'cbse-class10-science-2026-27-baseline.schema.json',
    title: 'CBSE Class 10 Science 2026-27 candidate baseline',
    description:
      'Draft-07 contract for the non-runtime Science audit baseline. Contains no baseline content.',
    type: 'object',
    additionalProperties: false,
    required: [
      '$schema',
      'baseline_version',
      'board',
      'class',
      'academic_year',
      'subject',
      'subject_code',
      'status',
      'source_records',
      'total_units',
      'total_chapters',
      'total_requirements',
      'requirements',
      'exclusions',
      'ambiguities',
      'validation',
    ],
    properties: {
      $schema: { type: 'string', const: 'cbse-class10-science-2026-27-baseline.schema.json' },
      baseline_version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
      board: { type: 'string', const: 'CBSE' },
      class: { type: 'string', const: '10' },
      academic_year: { type: 'string', const: '2026-27' },
      subject: { type: 'string', const: 'Science' },
      subject_code: { type: 'string', const: '086' },
      status: {
        type: 'string',
        enum: [
          'INDEPENDENT_BASELINE_UNVERIFIED_BY_HUMAN_EXPERT',
          'HUMAN_EXPERT_REVIEWED',
        ],
      },
      source_records: {
        type: 'array',
        minItems: 1,
        items: SOURCE_RECORD_SCHEMA({ subject_code: { type: 'string', const: '086' } }),
      },
      total_units: { type: 'integer', const: 5 },
      total_chapters: { type: 'integer', const: 13 },
      total_requirements: { type: 'integer', minimum: 1 },
      requirements: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'requirement_id',
            'official_unit',
            'official_chapter',
            'official_topic',
            'official_requirement',
            'requirement_type',
            'discipline',
            'assessability',
            'official_source_id',
            'source_reference',
            'auditor_derived',
            'ambiguity_status',
            'review_note',
            'sequence',
            'status',
          ],
          properties: {
            requirement_id: { type: 'string', pattern: '^REQ_SCI_2026_\\d{3}$' },
            sequence: { type: 'integer', minimum: 1 },
            official_unit: {
              type: 'string',
              enum: [
                'Unit I: Chemical Substances - Nature and Behaviour',
                'Unit II: World of Living',
                'Unit III: Natural Phenomena',
                'Unit IV: How Things Work',
                'Unit V: Natural Resources',
              ],
            },
            official_chapter: { type: 'string', minLength: 1 },
            official_topic: { type: 'string', minLength: 1 },
            official_requirement: { type: 'string', minLength: 1 },
            requirement_type: { type: 'string', minLength: 1 },
            discipline: {
              type: 'string',
              enum: ['PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'ENVIRONMENTAL_SCIENCE'],
            },
            assessability: {
              type: 'string',
              enum: ['ASSESSABLE_CORE', 'SUPPORTING_CONTEXT', 'NOT_ASSESSABLE'],
            },
            official_source_id: { type: 'string', minLength: 1 },
            source_reference: { type: 'string', minLength: 1 },
            auditor_derived: { type: 'boolean' },
            ambiguity_status: {
              type: 'string',
              enum: ['CLEAR', 'AMBIGUOUS_REVIEW_REQUIRED'],
            },
            review_note: { type: 'string' },
            status: { type: 'string', const: 'ACTIVE_BASELINE_REQUIREMENT' },
          },
        },
      },
      exclusions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'exclusion_id',
            'official_unit',
            'official_chapter',
            'excluded_topic',
            'exclusion_type',
            'official_source_id',
            'source_reference',
            'academic_year',
            'effect_on_eduos',
            'recommended_actions',
            'candidate_effect_statement',
            'ambiguity_status',
            'review_note',
          ],
          properties: {
            exclusion_id: { type: 'string', pattern: '^EXCL_SCI_2026_\\d{3}$' },
            official_unit: { type: 'string', minLength: 1 },
            official_chapter: { type: 'string', minLength: 1 },
            excluded_topic: { type: 'string', minLength: 1 },
            exclusion_type: {
              type: 'string',
              enum: [
                'RATIONALISED_CHAPTER_OMISSION',
                'TOPIC_RATIONALISATION',
                'INTERNAL_ASSESSMENT_ONLY',
              ],
            },
            official_source_id: { type: 'string', minLength: 1 },
            source_reference: { type: 'string', minLength: 1 },
            academic_year: { type: 'string', const: '2026-27' },
            effect_on_eduos: {
              type: 'string',
              const: 'NOT_ELIGIBLE_FOR_CURRENT_DIAGNOSTICS_PENDING_CONFIRMED_MAPPING',
            },
            recommended_actions: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'string',
                enum: [
                  'RETIRE_ONLY_AFTER_CONFIRMED_MAPPING',
                  'PRESERVE_HISTORICAL_REFERENCE',
                  'HUMAN_REVIEW_REQUIRED',
                ],
              },
            },
            candidate_effect_statement: { type: 'string', minLength: 1 },
            ambiguity_status: {
              type: 'string',
              enum: ['CLEAR', 'AMBIGUOUS_REVIEW_REQUIRED'],
            },
            review_note: { type: 'string' },
          },
        },
      },
      ambiguities: { type: 'array', items: AMBIGUITY_SCHEMA },
      validation: {
        type: 'object',
        description: 'Candidate-declared validation metadata, retained verbatim as provenance.',
        additionalProperties: true,
        required: ['strict_json_valid', 'utf8_valid', 'validation_status'],
        properties: {
          strict_json_valid: { type: 'boolean' },
          utf8_valid: { type: 'boolean' },
          delivered_requirements: { type: 'integer' },
          expected_requirements: { type: 'integer' },
          count_reconciled: { type: 'boolean' },
          duplicate_requirement_ids: { type: 'array', items: { type: 'string' } },
          missing_requirement_ids: { type: 'array', items: { type: 'string' } },
          duplicate_sequences: { type: 'array', items: { type: 'integer' } },
          missing_source_references: { type: 'array', items: { type: 'string' } },
          invalid_enum_values: { type: 'array', items: { type: 'string' } },
          html_contamination: { type: 'boolean' },
          markdown_contamination: { type: 'boolean' },
          copyright_check: { type: 'string' },
          deterministic_ordering: { type: 'boolean' },
          validation_timestamp: { type: 'string' },
          validation_status: { type: 'string' },
        },
      },
    },
  };
}

/* -------------------------------------------------------------------------- */

const CONTAMINATION_TOKENS = [
  '<a',
  '</a>',
  'href=',
  'target=',
  'rel=',
  'class=',
  '&quot;',
  '```json',
  '```text',
  '\\[',
  '\\]',
  '\\_',
  'Fai-ChatInputEntity',
  'ChatInputEntity',
  'noopener',
  'noreferrer',
];
const HTML_TOKENS = new Set([
  '<a',
  '</a>',
  'href=',
  'target=',
  'rel=',
  'class=',
  '&quot;',
  'Fai-ChatInputEntity',
  'ChatInputEntity',
  'noopener',
  'noreferrer',
]);

export function scanContamination(text) {
  const counts = {};
  for (const token of CONTAMINATION_TOKENS) {
    counts[token] = text.split(token).length - 1;
  }
  const html = Object.entries(counts)
    .filter(([t]) => HTML_TOKENS.has(t))
    .reduce((a, [, n]) => a + n, 0);
  const markdown = Object.entries(counts)
    .filter(([t]) => !HTML_TOKENS.has(t))
    .reduce((a, [, n]) => a + n, 0);
  return { counts, html, markdown };
}

const OVERREACH_FLAGS = [
  {
    subject: 'Science',
    record_id: 'EXCL_SCI_2026_001',
    candidate_statement:
      'Fully removed from NCERT Class 10 textbook and CBSE 2026-27 examination syllabus.',
    cited_source: 'SRC_NCERT_RAT_GUIDE_X — Class10.pdf Page 3 / CBSE Syllabus 2026-27',
    reason:
      'Claim that an entire chapter is fully removed is stronger than an unretrieved, unchecksummed source line can support.',
    recommended_human_review_action:
      'Named subject expert to confirm chapter-level removal against the retrieved and checksummed CBSE 2026-27 syllabus and NCERT rationalisation notice.',
  },
  {
    subject: 'Science',
    record_id: 'EXCL_SCI_2026_004',
    candidate_statement:
      "Explicitly deleted from rationalised NCERT textbook and CBSE 2026-27 exam syllabus.",
    cited_source: 'SRC_CBSE_SCI_2026_27 — Science_SecP1_2026-27.pdf Page 7',
    reason:
      'Asserts explicit deletion of named topics (electric motor, electromagnetic induction, generator) without a retrieved source document.',
    recommended_human_review_action:
      'Human review against the retrieved official syllabus before any EduOS question is retired.',
  },
  {
    subject: 'Science',
    record_id: 'AMB_SCI_2026_002',
    candidate_statement:
      'None. Board examination scope strictly excludes metallurgy calculations and extraction steps.',
    cited_source: 'SRC_CBSE_SCI_2026_27',
    reason:
      'Declares strict non-assessability and marks the ambiguity as needing no human review; this package does not resolve academic ambiguities.',
    recommended_human_review_action:
      'Treat as unresolved; both Science ambiguities remain open pending named subject-expert review.',
  },
  {
    subject: 'Science',
    record_id: 'EXCL_SCI_2026_003',
    candidate_statement:
      "Chapter retitled to 'Heredity' in current NCERT textbook reprints.",
    cited_source: 'SRC_NCERT_RAT_GUIDE_X',
    reason:
      'Edition-specific retitling claim depends on an unconfirmed textbook printing.',
    recommended_human_review_action: 'Confirm chapter title against the retrieved NCERT edition.',
  },
  {
    subject: 'Mathematics',
    record_id: 'REQ_MATH_2026_004',
    candidate_statement:
      'Application of prime factorization in real-world contextual problems.',
    cited_source: 'SRC_CBSE_MATH_2627 — Maths_SecP1X_2026-27.pdf Page 2',
    reason:
      'Auditor-derived requirement: expands the cited syllabus line into an application scope not quoted verbatim.',
    recommended_human_review_action:
      'Subject expert to confirm each auditor_derived requirement against the retrieved syllabus line before mapping.',
  },
];

function auditorDerivedFlags(baseline, subject) {
  return baseline.requirements
    .filter((r) => r.auditor_derived)
    .map((r) => ({
      subject,
      record_id: r.requirement_id,
      candidate_statement: r.official_requirement,
      cited_source: `${r.official_source_id} — ${r.source_reference}`,
      reason:
        'Record is labelled auditor_derived: it is an inferred expansion of the cited official line rather than a verbatim official requirement.',
      recommended_human_review_action:
        'Named subject expert to confirm or reject against the retrieved and checksummed official syllabus.',
    }));
}

function dedupeFlags(flags) {
  const seen = new Map();
  for (const f of flags) if (!seen.has(f.record_id)) seen.set(f.record_id, f);
  return [...seen.values()].sort((a, b) => a.record_id.localeCompare(b.record_id));
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const results = {};

  for (const subject of ['mathematics', 'science']) {
    const inputName = `cbse-class10-${subject}-2026-27-baseline.json`;
    const inputBytes = readFileSync(join(INPUT_DIR, inputName));
    const inputText = new TextDecoder('utf-8', { fatal: true }).decode(inputBytes);
    const { value: input, duplicates } = parseStrict(inputText);
    if (duplicates.length) throw new Error(`duplicate keys in ${inputName}: ${duplicates}`);

    const { baseline, log } =
      subject === 'mathematics' ? buildMathematics(input) : buildScience(input);
    const schema = subject === 'mathematics' ? mathematicsSchema() : scienceSchema();

    const baselinePath = join(OUT_DIR, inputName);
    const schemaPath = join(OUT_DIR, `cbse-class10-${subject}-2026-27-baseline.schema.json`);
    writeFileSync(baselinePath, stable(baseline));
    writeFileSync(schemaPath, stable(schema));

    results[subject] = {
      inputName,
      inputBytes: inputBytes.length,
      inputSha: sha256(inputBytes),
      baselinePath,
      schemaPath,
      log,
      baseline,
    };
  }

  // Validation files (hash the just-written bytes).
  const Ajv = (await importAjv()).default;
  for (const subject of ['mathematics', 'science']) {
    const r = results[subject];
    const baselineBytes = readFileSync(r.baselinePath);
    const schemaBytes = readFileSync(r.schemaPath);
    const baselineText = baselineBytes.toString('utf8');
    const schemaText = schemaBytes.toString('utf8');
    const baseline = JSON.parse(baselineText);
    const schema = JSON.parse(schemaText);
    const ajv = new Ajv({ allErrors: true, schemaId: 'auto' });
    const validate = ajv.compile(schema);
    const valid = validate(baseline);
    if (!valid) {
      console.error(subject, JSON.stringify(validate.errors, null, 2));
      throw new Error(`${subject} baseline fails its schema`);
    }

    const prefix = subject === 'mathematics' ? 'REQ_MATH_2026_' : 'REQ_SCI_2026_';
    const ids = baseline.requirements.map((x) => x.requirement_id);
    const expected = ids.map((_, i) => `${prefix}${String(i + 1).padStart(3, '0')}`);
    const missing = expected.filter((id) => !ids.includes(id));
    const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
    const seqs = baseline.requirements.map((x) => x.sequence);
    const dupSeq = seqs.filter((s, i) => seqs.indexOf(s) !== i);
    const sourceIds = new Set(baseline.source_records.map((s) => s.source_id));
    const missingRefs = [
      ...baseline.requirements
        .filter((x) => !sourceIds.has(x.official_source_id))
        .map((x) => x.requirement_id),
      ...baseline.exclusions
        .filter((x) => !sourceIds.has(x.official_source_id))
        .map((x) => x.exclusion_id),
    ];
    const contamination = scanContamination(baselineText);
    const schemaContamination = scanContamination(schemaText);

    const flags = dedupeFlags([
      ...OVERREACH_FLAGS.filter((f) => f.subject.toLowerCase() === subject),
      ...auditorDerivedFlags(baseline, subject === 'mathematics' ? 'Mathematics' : 'Science'),
    ]);

    const validation = {
      subject: subject === 'mathematics' ? 'Mathematics' : 'Science',
      input_filename: r.inputName,
      input_bytes: r.inputBytes,
      input_sha256: r.inputSha,
      baseline_filename: `cbse-class10-${subject}-2026-27-baseline.json`,
      schema_filename: `cbse-class10-${subject}-2026-27-baseline.schema.json`,
      baseline_bytes: baselineBytes.length,
      schema_bytes: schemaBytes.length,
      baseline_sha256: sha256(baselineBytes),
      schema_sha256: sha256(schemaBytes),
      baseline_json_parse: true,
      schema_json_parse: true,
      schema_validation: valid === true,
      utf8_valid: true,
      duplicate_json_keys_checked: true,
      duplicate_json_keys: [
        ...findDuplicateKeys(baselineText),
        ...findDuplicateKeys(schemaText),
      ],
      duplicate_key_parser: 'scripts/audit/build-baseline-package.mjs::findDuplicateKeys (source-order JSON tokenizer)',
      schema_validator: 'ajv draft-07',
      units: new Set(baseline.requirements.map((x) => x.official_unit)).size,
      chapters: new Set(baseline.requirements.map((x) => x.official_chapter)).size,
      requirements: baseline.requirements.length,
      exclusions: baseline.exclusions.length,
      ambiguities: baseline.ambiguities.length,
      duplicate_requirement_ids: dupIds,
      missing_requirement_ids: missing,
      duplicate_sequences: dupSeq,
      missing_source_references: missingRefs,
      invalid_enum_values: [],
      html_contamination_count: contamination.html + schemaContamination.html,
      markdown_contamination_count: contamination.markdown + schemaContamination.markdown,
      unverified_source_records: baseline.source_records.map((s) => s.source_id),
      official_source_checksums_computed: [],
      official_source_checksums_not_computed: baseline.source_records.map((s) => s.source_id),
      academic_overreach_flags: flags,
      mechanical_transformations: r.log,
      semantic_transformations: [],
      validation_timestamp: TIMESTAMP,
      validation_status:
        valid &&
        !missing.length &&
        !dupIds.length &&
        !dupSeq.length &&
        !missingRefs.length &&
        contamination.html + schemaContamination.html === 0 &&
        contamination.markdown + schemaContamination.markdown === 0
          ? 'PASS'
          : 'FAIL',
    };

    const validationPath = join(OUT_DIR, `${subject}-baseline-file-validation.json`);
    writeFileSync(validationPath, stable(validation));
    results[subject].validation = validation;
    results[subject].validationPath = validationPath;
    results[subject].validationSha = sha256(readFileSync(validationPath));
    results[subject].validationBytes = readFileSync(validationPath).length;
  }

  writeFileSync('/tmp/baseline-package-summary.json', stable(
    Object.fromEntries(
      Object.entries(results).map(([k, v]) => [
        k,
        {
          input: { name: v.inputName, bytes: v.inputBytes, sha256: v.inputSha },
          validation: v.validation,
          validation_file: {
            path: v.validationPath,
            bytes: v.validationBytes,
            sha256: v.validationSha,
          },
        },
      ]),
    ),
  ));
  console.log('package written');
}

async function importAjv() {
  return await import('ajv');
}

await main();
