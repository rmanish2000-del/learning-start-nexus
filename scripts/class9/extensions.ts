// Wave 1 continuation: merges per-unit extensions into the authored subjects.
//
// Deterministic and pure: topics are appended in a fixed order and extra
// questions are appended after the baseline questions of each outcome, so the
// emitted packs stay byte-identical between runs (idempotent import).

import type { AuthoredSubject } from "./authoring";
import type { UnitExtension } from "./extension-types";
import { EXT as MAT_U1 } from "./extra/mat-u1";
import { EXT as MAT_U2 } from "./extra/mat-u2";
import { EXT as MAT_U3 } from "./extra/mat-u3";
import { EXT as MAT_U4 } from "./extra/mat-u4";
import { EXT as MAT_U5 } from "./extra/mat-u5";
import { EXT as MAT_U6 } from "./extra/mat-u6";
import { EXT as SCI_U1 } from "./extra/sci-u1";
import { EXT as SCI_U2 } from "./extra/sci-u2";
import { EXT as SCI_U3 } from "./extra/sci-u3";
import { EXT as SCI_U4 } from "./extra/sci-u4";

export const EXTENSIONS: UnitExtension[] = [
  MAT_U1,
  MAT_U2,
  MAT_U3,
  MAT_U4,
  MAT_U5,
  MAT_U6,
  SCI_U1,
  SCI_U2,
  SCI_U3,
  SCI_U4,
];

export function applyExtensions(subject: AuthoredSubject): AuthoredSubject {
  const s = subject.subjectCode;
  return {
    ...subject,
    units: subject.units.map((u, ui) => {
      const un = ui + 1;
      const unitId = `C9-${s}-U${un}`;
      const ext = EXTENSIONS.find((e) => e.unitId === unitId);
      if (!ext) return u;
      return {
        ...u,
        chapters: u.chapters.map((c, ci) => {
          const cn = ci + 1;
          const chapterId = `${unitId}-CH${cn}`;
          const topics = c.topics.map((t, ti) => {
            const topicId = `${chapterId}-T${ti + 1}`;
            return {
              ...t,
              outcomes: t.outcomes.map((o, oi) => {
                const outcomeId = `${topicId}-O${oi + 1}`;
                const extra = ext.extraQuestions[outcomeId];
                return extra ? { ...o, questions: [...o.questions, ...extra] } : o;
              }),
            };
          });
          const appended = ext.newTopics.filter((nt) => nt.chapter === cn).map((nt) => nt.topic);
          return appended.length ? { ...c, topics: [...topics, ...appended] } : { ...c, topics };
        }),
      };
    }),
  };
}
