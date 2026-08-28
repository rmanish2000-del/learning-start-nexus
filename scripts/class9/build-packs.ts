// Wave 1: deterministic generator for the Class 9 preparation packs.
//
//   bun run scripts/class9/build-packs.ts
//
// Emits content/class-9/*.curriculum.json and *.questions.json. The output is
// byte-identical on every run (no timestamps, no random ids), which is what
// makes a later import idempotent.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SUBJECTS, type AuthoredSubject } from "./authoring";
import { applyExtensions } from "./extensions";
import { externalRef } from "../../src/lib/class9-content-schema";
import {
  curriculumPackSchema,
  questionPackSchema,
  type CurriculumPack,
  type QuestionPack,
} from "../../src/lib/class9-content-schema";

const RETRIEVED_ON = "2026-08-28";

const SOURCE_REGISTER = {
  "NCERT-C9-MAT-2026-27": {
    id: "NCERT-C9-MAT-2026-27",
    title: "NCERT Mathematics Textbook for Class IX (rationalised) with the CBSE Secondary Curriculum syllabus for Mathematics (Code 041)",
    issuingAuthority: "National Council of Educational Research and Training / Central Board of Secondary Education",
    edition: "Rationalised edition in force for session 2026-27",
    officialReference: "https://ncert.nic.in/textbook.php (Class IX Mathematics) and https://cbseacademic.nic.in/curriculum.html (Secondary Curriculum, Mathematics 041)",
    retrievedOn: RETRIEVED_ON,
    licensing:
      "Structure, chapter titles and syllabus weightings are cited as factual curriculum metadata. No textbook text, figures or exercise items are copied or stored in this repository. All questions in the pack are original EduOS material.",
    supersedes: null,
    provenanceStatus: "official-derived" as const,
  },
  "NCERT-C9-SCI-2026-27": {
    id: "NCERT-C9-SCI-2026-27",
    title: "NCERT Science Textbook for Class IX (rationalised) with the CBSE Secondary Curriculum syllabus for Science (Code 086)",
    issuingAuthority: "National Council of Educational Research and Training / Central Board of Secondary Education",
    edition: "Rationalised edition in force for session 2026-27",
    officialReference: "https://ncert.nic.in/textbook.php (Class IX Science) and https://cbseacademic.nic.in/curriculum.html (Secondary Curriculum, Science 086)",
    retrievedOn: RETRIEVED_ON,
    licensing:
      "Structure, chapter titles and syllabus weightings are cited as factual curriculum metadata. No textbook text, figures or exercise items are copied or stored in this repository. All questions in the pack are original EduOS material.",
    supersedes: null,
    provenanceStatus: "official-derived" as const,
  },
} as const;

export function buildPacks(input: AuthoredSubject): { curriculum: CurriculumPack; questions: QuestionPack } {
  const subject = applyExtensions(input);
  const s = subject.subjectCode;
  const source = SOURCE_REGISTER[subject.sourceId as keyof typeof SOURCE_REGISTER];
  const questions: QuestionPack["questions"] = [];

  const units = subject.units.map((u, ui) => {
    const un = ui + 1;
    const unitId = `C9-${s}-U${un}`;
    return {
      id: unitId,
      externalRef: externalRef(s, `U${un}`),
      title: u.title,
      position: un,
      syllabusMarks: u.marks,
      chapters: u.chapters.map((c, ci) => {
        const cn = ci + 1;
        const chapterId = `${unitId}-CH${cn}`;
        return {
          id: chapterId,
          externalRef: externalRef(s, `U${un}`, `CH${cn}`),
          ncertChapter: c.ncert,
          title: c.title,
          position: cn,
          provenance: {
            sourceId: source.id,
            sourceRef: `${source.id}#chapter-${c.ncert}`,
            retrievedOn: RETRIEVED_ON,
            note: `NCERT Class IX ${subject.subjectKey}, Chapter ${c.ncert}: ${c.title}`,
          },
          topics: c.topics.map((t, ti) => {
            const tn = ti + 1;
            const topicId = `${chapterId}-T${tn}`;
            return {
              id: topicId,
              externalRef: externalRef(s, `U${un}`, `CH${cn}`, `T${tn}`),
              title: t.title,
              position: tn,
              outcomes: t.outcomes.map((o, oi) => {
                const on = oi + 1;
                const outcomeId = `${topicId}-O${on}`;
                o.questions.forEach((q, qi) => {
                  const qn = qi + 1;
                  questions.push({
                    id: `${outcomeId}-Q${qn}`,
                    externalRef: externalRef(s, `U${un}`, `CH${cn}`, `T${tn}`, `O${on}`, `Q${qn}`),
                    outcomeId,
                    atomId: `${outcomeId}-A${Math.min(qn, o.atoms.length)}`,
                    kind: q.kind,
                    difficulty: q.difficulty,
                    stimulus: q.stimulus ?? null,
                    prompt: q.prompt,
                    options: q.options ?? null,
                    correctAnswer: q.answer,
                    explanation: q.explanation,
                    language: "en",
                    status: "draft",
                    verificationState: "unverified",
                    reviewNote: "",
                    provenance: {
                      sourceId: source.id,
                      sourceRef: `${source.id}#chapter-${c.ncert}`,
                      retrievedOn: RETRIEVED_ON,
                      note: "Original EduOS item aligned to the cited chapter; not copied from any textbook exercise.",
                    },
                  });
                });
                return {
                  id: outcomeId,
                  externalRef: externalRef(s, `U${un}`, `CH${cn}`, `T${tn}`, `O${on}`),
                  code: `C9-${s}-${String(un).padStart(2, "0")}.${String(cn).padStart(2, "0")}.${String(tn)}${String(on)}`,
                  title: o.title,
                  category: o.category,
                  bloomLevel: o.bloom,
                  difficulty: o.difficulty,
                  diagnosticWeight: o.weight,
                  questionTypes: o.types,
                  atoms: o.atoms.map((text, ai) => ({ id: `${outcomeId}-A${ai + 1}`, text })),
                  prerequisites: o.prerequisites ?? [],
                };
              }),
            };
          }),
        };
      }),
    };
  });

  const curriculum = curriculumPackSchema.parse({
    packVersion: 1,
    board: "CBSE",
    academicYear: "2026-27",
    classLevel: 9,
    subjectCode: subject.subjectCode,
    subjectKey: subject.subjectKey,
    catalogueCode: subject.catalogueCode,
    activation: {
      isActive: false,
      commercialStatus: "hidden",
      reviewState: "draft",
      diagnosticEligible: false,
      reassessmentReady: false,
    },
    sources: [source],
    ambiguities: subject.ambiguities,
    units,
  } satisfies CurriculumPack);

  const questionPack = questionPackSchema.parse({
    packVersion: 1,
    subjectCode: subject.subjectCode,
    academicYear: "2026-27",
    generatedBy: "scripts/class9/build-packs.ts",
    questions,
  } satisfies QuestionPack);

  return { curriculum, questions: questionPack };
}

if (process.argv[1]?.includes("build-packs")) {
  const outDir = resolve(process.cwd(), "content/class-9");
  mkdirSync(outDir, { recursive: true });
  for (const subject of SUBJECTS) {
    const { curriculum, questions } = buildPacks(subject);
    const slug = subject.subjectKey.toLowerCase();
    writeFileSync(`${outDir}/${slug}.curriculum.json`, JSON.stringify(curriculum, null, 2) + "\n");
    writeFileSync(`${outDir}/${slug}.questions.json`, JSON.stringify(questions, null, 2) + "\n");
    console.log(
      `${subject.subjectKey}: ${curriculum.units.length} units, ` +
        `${curriculum.units.flatMap((u) => u.chapters).length} chapters, ` +
        `${questions.questions.length} questions`,
    );
  }
}
