"""Derive CBSE Class 10 exam-pattern intelligence from the officially retrieved
2022-2026 question-paper archives.

    python3 scripts/pyq/build_pattern_intelligence.py

Reads ONLY the private evidence tree written by scripts/pyq/acquire-cbse-class10.ts
and the verified inventory CSV. No question text is copied into the repository:
the output contains counts, mark weights and chapter attribution ratios only.

Cohorts are kept strictly separate:
  * term_2022      - 2022 used the two-term, 40-mark format. Reported, never
                     blended into the recent-pattern weights.
  * recent_2023_2026 - the comparable 80-mark single-examination format used for
                     every blueprint weight EduOS consumes.
"""

from __future__ import annotations

import csv
import glob
import json
import os
import re
from collections import Counter, defaultdict

from pypdf import PdfReader

EVIDENCE = "/mnt/documents/eduos-private-evidence/cbse-class10-pyq"
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, "content", "pyq", "class10-pyq-intelligence.json")
INVENTORY = os.path.join(REPO, "CBSE_CLASS10_PYQ_EXTRACTION_INVENTORY.csv")

# CBSE Class 10 single-examination (80 marks) section structure, 2023 onwards.
def marks_for(q: int) -> int:
    if 1 <= q <= 20:
        return 1
    if 21 <= q <= 25:
        return 2
    if 26 <= q <= 31:
        return 3
    if 32 <= q <= 35:
        return 5
    if 36 <= q <= 38:
        return 4
    return 0


def competency_for(q: int) -> str:
    if 1 <= q <= 18:
        return "objective"
    if 19 <= q <= 20:
        return "assertion_reason"
    if 21 <= q <= 25:
        return "very_short_answer"
    if 26 <= q <= 31:
        return "short_answer"
    if 32 <= q <= 35:
        return "long_answer"
    return "case_study"


CHAPTER_KEYWORDS: dict[str, dict[str, list[str]]] = {
    "Mathematics": {
        'Real Numbers': ['hcf', 'lcm', 'prime factor', 'irrational', 'euclid', 'terminating', 'composite number', 'rational number'],
        'Polynomials': ['polynomial', 'zeroes', 'zeros', 'sum of the zeroes', 'product of the zeroes'],
        'Pair of Linear Equations in Two Variables': ['pair of linear equations', 'two variables', 'consistent', 'inconsistent', 'substitution method', 'elimination method', 'coincident lines'],
        'Quadratic Equations': ['quadratic equation', 'discriminant', 'real and equal roots', 'nature of the roots', 'roots of the quadratic'],
        'Arithmetic Progressions': ['arithmetic progression', 'common difference', 'nth term', 'first n terms', 'a.p.'],
        'Triangles': ['similar triangles', 'basic proportionality', 'thales', 'similarity', 'triangle abc', 'corresponding sides', 'similar', 'congruent', 'triangle'],
        'Coordinate Geometry': ['section formula', 'mid-point', 'midpoint', 'distance formula', 'trisection', 'collinear', 'coordinates of the point'],
        'Introduction to Trigonometry': ['sin', 'cos', 'tan', 'cosec', 'cot', 'trigonometric', 'trigonometry'],
        'Some Applications of Trigonometry': ['angle of elevation', 'angle of depression', 'line of sight', 'tower', 'shadow', 'height of the tower'],
        'Circles': ['tangent', 'tangents', 'chord', 'concentric', 'circumscrib', 'touching the circle'],
        'Areas Related to Circles': ['sector', 'segment of a circle', 'area swept', 'arc', 'circumference'],
        'Surface Areas and Volumes': ['surface area', 'volume', 'cylinder', 'cone', 'hemisphere', 'frustum', 'solid sphere'],
        'Statistics': ['median', 'modal class', 'frequency distribution', 'class interval', 'ogive', 'cumulative frequency', 'mean of the following'],
        'Probability': ['probability', 'die is thrown', 'drawn at random', 'well shuffled', 'pack of 52'],
    },
    "Science": {
        'Chemical Reactions and Equations': ['balanced chemical equation', 'skeletal equation', 'decomposition reaction', 'displacement reaction', 'rancidity', 'corrosion', 'exothermic', 'endothermic', 'oxidation', 'reduction'],
        'Acids, Bases and Salts': ['ph value', 'ph scale', 'litmus', 'bleaching powder', 'baking soda', 'washing soda', 'neutralisation', 'neutralization', 'water of crystallisation', 'plaster of paris'],
        'Metals and Non-metals': ['reactivity series', 'alloy', 'roasting', 'calcination', 'ionic compound', 'malleable', 'ductile', 'amphoteric', 'ore', 'electrolytic refining'],
        'Carbon and its Compounds': ['hydrocarbon', 'ethanol', 'ethanoic acid', 'covalent bond', 'homologous series', 'micelle', 'saponification', 'catenation', 'soap', 'detergent'],
        'Life Processes': ['autotrophic', 'photosynthesis', 'digestion', 'excretion', 'nephron', 'stomata', 'xylem', 'phloem', 'alveoli', 'respiration', 'transpiration'],
        'Control and Coordination': ['neuron', 'reflex arc', 'hormone', 'cerebellum', 'phototropism', 'endocrine', 'thyroxine', 'spinal cord', 'insulin'],
        'How do Organisms Reproduce?': ['fertilisation', 'fertilization', 'pollination', 'gamete', 'placenta', 'budding', 'contraceptive', 'vegetative propagation', 'reproduction'],
        'Heredity': ['mendel', 'dominant trait', 'recessive', 'genotype', 'phenotype', 'f1 generation', 'sex determination', 'chromosome', 'inherited'],
        'Light – Reflection and Refraction': ['concave mirror', 'convex mirror', 'focal length', 'refractive index', 'mirror formula', 'lens formula', 'power of a lens', 'real and inverted', 'magnification'],
        'The Human Eye and the Colourful World': ['human eye', 'myopia', 'hypermetropia', 'dispersion', 'prism', 'scattering', 'tyndall', 'presbyopia', 'spectrum'],
        'Electricity': ['resistance', 'resistivity', 'ohm', 'ammeter', 'voltmeter', 'electric power', 'series combination', 'parallel combination', 'potential difference', 'electric current'],
        'Magnetic Effects of Electric Current': ['magnetic field', 'solenoid', 'electromagnetic induction', 'right hand thumb', 'fleming', 'electric motor', 'magnetic field lines', 'galvanometer'],
        'Our Environment': ['food chain', 'trophic level', 'ecosystem', 'biodegradable', 'ozone', 'biomagnification', 'food web'],
    },
}

QUESTION_RE = re.compile(r"(?:^|\s)(\d{1,2})\s*[\.\)]\s+")


CACHE = "/tmp/pyq-text-cache"
# Below this many characters a PDF is treated as image-only (scanned) and sent
# through OCR. Digital CBSE papers extract tens of thousands of characters.
OCR_THRESHOLD = 2000
OCR_ENABLED = os.environ.get("PYQ_OCR", "1") != "0"


def ocr_text(path: str) -> str:
    """OCR a scanned paper bilingually (eng+hin) so the Devanagari half of a CBSE
    paper is recognised as Hindi instead of being mis-read as broken Latin; segment()
    then keeps the English rendering of each question.
    Returns '' on any failure so the paper stays unattributed rather than guessed."""
    import subprocess
    import tempfile

    try:
        import pytesseract
        from PIL import Image
    except Exception:
        return ""
    out: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        try:
            subprocess.run(
                ["pdftoppm", "-r", "200", "-gray", "-jpeg", path, os.path.join(tmp, "p")],
                check=True,
                capture_output=True,
                timeout=600,
            )
        except Exception:
            return ""
        for img in sorted(glob.glob(os.path.join(tmp, "p-*.jpg"))):
            try:
                out.append(pytesseract.image_to_string(Image.open(img), lang="eng+hin"))
            except Exception:
                continue
    return "\n".join(out)


def paper_text(path: str) -> str:
    os.makedirs(CACHE, exist_ok=True)
    key = os.path.join(CACHE, path.replace("/", "_") + ".txt")
    if os.path.exists(key):
        with open(key) as fh:
            cached = fh.read()
        if len(cached) >= OCR_THRESHOLD or not OCR_ENABLED:
            return cached
    try:
        reader = PdfReader(path)
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception:
        text = ""
    if len(text) < OCR_THRESHOLD and OCR_ENABLED:
        ocred = ocr_text(path)
        if len(ocred) > len(text):
            text = ocred
    with open(key, "w") as fh:
        fh.write(text)
    return text



def normalise_text(text: str) -> str:
    """CBSE PDFs extract with newlines inside words and sentences, which stops
    multi-word concept matching. Collapse whitespace and repair split words."""
    text = text.replace("\u00ad", "")
    text = re.sub(r"-\s*\n\s*", "", text)
    text = re.sub(r"[ \t]*\n[ \t]*", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text


def segment(text: str) -> list[tuple[int, str]]:
    """Split a paper into numbered questions.

    CBSE papers are bilingual: every question number appears twice, Hindi first
    and English second. The Hindi rendering extracts as mojibake, so for each
    number we keep the variant with the most Latin text -- the English one.
    """
    text = normalise_text(text)
    matches = list(QUESTION_RE.finditer(text))
    best: dict[int, tuple[int, str]] = {}
    for i, m in enumerate(matches):
        number = int(m.group(1))
        if number < 1 or number > 38:
            continue
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[m.end() : end]
        latin = sum(1 for ch in body if ch.isascii() and ch.isalpha())
        if number not in best or latin > best[number][0]:
            best[number] = (latin, body.lower())
    return [(number, body) for number, (_latin, body) in sorted(best.items())]


KEYWORD_RE: dict[str, dict[str, list[tuple[str, re.Pattern[str]]]]] = {
    subject: {
        chapter: [(k, re.compile(r"\b" + re.escape(k) + r"\b")) for k in keywords]
        for chapter, keywords in chapters.items()
    }
    for subject, chapters in CHAPTER_KEYWORDS.items()
}


def attribute(subject: str, body: str) -> tuple[str | None, list[str]]:
    """Attribute a question to one chapter. Ties are left unattributed: an
    ambiguous match is never allowed to inflate a chapter weight."""
    scores: list[tuple[int, str, list[str]]] = []
    for chapter, keywords in KEYWORD_RE[subject].items():
        hits = [k for k, rx in keywords if rx.search(body)]
        if hits:
            scores.append((len(hits), chapter, hits))
    if not scores:
        return None, []
    scores.sort(key=lambda s: (-s[0], s[1]))
    # Precision over recall: attribute only when one chapter clearly dominates.
    # Everything else is reported as unattributed rather than guessed.
    top = scores[0]
    runner = scores[1][0] if len(scores) > 1 else 0
    if top[0] < 2 or top[0] <= runner:
        return None, []
    return scores[0][1], scores[0][2]


def main() -> None:
    with open(INVENTORY, newline="") as fh:
        inventory = [r for r in csv.DictReader(fh)]

    accepted = [r for r in inventory if r["status"] == "ACCEPTED"]
    quarantined = [r for r in inventory if r["status"] == "QUARANTINED"]

    cohorts = {
        "term_2022": [r for r in accepted if r["year"] == "2022"],
        "recent_2023_2026": [r for r in accepted if r["year"] != "2022"],
    }

    result: dict = {
        "generatedFrom": "official CBSE archive binaries (private evidence tree)",
        "academicYear": "2026-27",
        "provenance": {
            "archives": 10,
            "acceptedPdfs": len(accepted),
            "quarantinedPdfs": len(quarantined),
            "quarantineReasons": sorted({r["exclusion_reason"] for r in quarantined}),
        },
        "cohorts": {},
    }

    for cohort, rows in cohorts.items():
        per_subject: dict[str, dict] = {}
        analysed = 0
        skipped_no_text = 0
        for subject in ("Mathematics Standard", "Science"):
            subject_key = "Mathematics" if subject.startswith("Math") else "Science"
            chapter_marks: Counter[str] = Counter()
            chapter_questions: Counter[str] = Counter()
            chapter_by_year: dict[str, Counter[str]] = defaultdict(Counter)
            competency: Counter[str] = Counter()
            concept_hits: Counter[str] = Counter()
            unattributed = 0
            papers = 0
            paper_blueprints: list[dict] = []
            for row in rows:
                if row["subject"] != subject:
                    continue
                path = os.path.join(EVIDENCE, row["pdf_entry"])
                text = paper_text(path)
                if len(text) < 800:
                    skipped_no_text += 1
                    continue
                papers += 1
                analysed += 1
                paper_chapters: Counter[str] = Counter()
                numbers: list[int] = []
                for number, body in segment(text):
                    numbers.append(number)
                    chapter, hits = attribute(subject_key, body)
                    competency[competency_for(number)] += 1
                    if chapter is None:
                        unattributed += 1
                        continue
                    marks = marks_for(number) if cohort == "recent_2023_2026" else 1
                    paper_chapters[chapter] += marks
                    chapter_questions[chapter] += 1
                    chapter_marks[chapter] += marks
                    chapter_by_year[row["year"]][chapter] += 1
                    for hit in hits:
                        concept_hits[hit.strip()] += 1

                paper_total = sum(paper_chapters.values()) or 1
                paper_blueprints.append(
                    {
                        "paperId": f"{row['year']}-{subject_key}-{(row['set_series'] or os.path.basename(row['pdf_entry'])[:18]).replace(' ', '')}",
                        "year": row["year"],
                        "setSeries": row["set_series"] or "unlabelled set",
                        "language": row["language"],
                        "maxMarks": int(row["max_marks"]) if row["max_marks"].isdigit() else (80 if cohort == "recent_2023_2026" else 40),
                        "questionsDetected": len(numbers),
                        "sections": [
                            {"section": name, "questions": count, "marksEach": each}
                            for name, count, each in (
                                ("A - objective", sum(1 for n in numbers if 1 <= n <= 20), 1),
                                ("B - very short answer", sum(1 for n in numbers if 21 <= n <= 25), 2),
                                ("C - short answer", sum(1 for n in numbers if 26 <= n <= 31), 3),
                                ("D - long answer", sum(1 for n in numbers if 32 <= n <= 35), 5),
                                ("E - case study", sum(1 for n in numbers if 36 <= n <= 38), 4),
                            )
                            if count
                        ],
                        "chapterMix": [
                            {"chapter": c, "marks": m, "markShare": round(m / paper_total, 4)}
                            for c, m in paper_chapters.most_common()
                        ],
                        "attributedQuestions": sum(paper_chapters.values()),
                    }
                )

            total_marks = sum(chapter_marks.values()) or 1
            total_q = sum(chapter_questions.values()) or 1
            per_subject[subject_key] = {
                "papersAnalysed": papers,
                "papers": sorted(paper_blueprints, key=lambda b: (b["year"], b["setSeries"])),
                "attributedQuestions": sum(chapter_questions.values()),
                "unattributedQuestions": unattributed,
                "chapters": [
                    {
                        "chapter": chapter,
                        "questions": chapter_questions[chapter],
                        "marks": chapter_marks[chapter],
                        "markShare": round(chapter_marks[chapter] / total_marks, 4),
                        "questionShare": round(chapter_questions[chapter] / total_q, 4),
                        "byYear": {
                            year: counts[chapter]
                            for year, counts in sorted(chapter_by_year.items())
                            if counts[chapter]
                        },
                    }
                    for chapter in sorted(
                        CHAPTER_KEYWORDS[subject_key],
                        key=lambda c: (-chapter_marks[c], c),
                    )
                ],
                "competencyMix": dict(sorted(competency.items())),
                "repeatedConcepts": [
                    {"concept": concept, "occurrences": count}
                    for concept, count in concept_hits.most_common(12)
                ],
            }
        result["cohorts"][cohort] = {
            "years": sorted({r["year"] for r in rows}),
            "format": "two-term, 40 marks" if cohort == "term_2022" else "single examination, 80 marks",
            "usedForBlueprintWeights": cohort == "recent_2023_2026",
            "pdfsInCohort": len(rows),
            "pdfsAnalysed": analysed,
            "pdfsWithoutTextLayer": skipped_no_text,
            "subjects": per_subject,
        }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump(result, fh, indent=2)
        fh.write("\n")
    print(json.dumps({k: {"analysed": v["pdfsAnalysed"], "noText": v["pdfsWithoutTextLayer"]} for k, v in result["cohorts"].items()}, indent=2))


if __name__ == "__main__":
    main()
