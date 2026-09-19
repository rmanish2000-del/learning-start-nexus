"""Original EduOS rewrites for the five frozen-overlap-list queue rows
(four distinct questions), plus the confirmed REQ043-REASS-002 explanation fix.

Method for the overlap rewrites: the historical overlap finding is preserved
untouched in `NCERT_OVERLAP_CANDIDATES` and in the review queue. Only the
curriculum objective, the underlying concept and the formula are retained. The
scenario, the numbers, the question sentence, the answer values, the worked
explanation and any distractors are newly authored in EduOS's own language --
not synonym-substituted. Each rewrite is then tested for exact, normalised,
shingle and semantic overlap against the recorded matched shingle before
ORIGINAL_EDUOS_REWRITE_VERIFIED can be recorded.

No copyright clearance is claimed by these rewrites. Public accessibility of a
source is not recorded as licence permission.
"""

from __future__ import annotations

# ruff: noqa: E501

REWRITES: dict[str, dict] = {
    "C10-2627-MATH-REQ022-DIAG-009": {
        "concept_retained": "Section formula; points dividing a segment in the ratios 1:2 and 2:1 (trisection).",
        "curriculum_objective": "LO_M7.1.1 — Derive and apply the distance and section formulae.",
        "prompt": (
            "A delivery drone flies in a straight line from rooftop marker P(-3, 5) to rooftop marker Q(9, -7) "
            "on a map grid. Two relay beacons are to be placed on this path so that they split the flight into "
            "three equal legs.\n\n"
            "Work out the map coordinates of both beacons."
        ),
        "stimulus": None,
        "options": None,
        "correct_answer": "(1, 1) and (5, -3)",
        "explanation": (
            "The first beacon divides PQ in the ratio 1 : 2, so its coordinates are "
            "((1 x 9 + 2 x -3)/3, (1 x -7 + 2 x 5)/3) = (3/3, 3/3) = (1, 1). "
            "The second beacon divides PQ in the ratio 2 : 1, giving "
            "((2 x 9 + 1 x -3)/3, (2 x -7 + 1 x 5)/3) = (15/3, -9/3) = (5, -3). "
            "Both beacons lie on PQ and the three legs are equal in length."
        ),
    },
    "C10-2627-MATH-REQ024-DIAG-004": {
        "concept_retained": "Equal solar elevation gives similar right triangles; AA similarity used to find an inaccessible height.",
        "curriculum_objective": "LO_M6.1.1 — State and apply similarity criteria for triangles.",
        "prompt": (
            "During a morning survey of a school campus, a vertical flagstaff of height 4.5 m throws a shadow "
            "3 m across the level playground. At the very same instant the shadow of the campus water tank "
            "measures 18 m on the same ground.\n\n"
            "Work out the height of the water tank and name the similarity criterion that justifies your method."
        ),
        "stimulus": None,
        "options": None,
        "correct_answer": "27 m, justified by AA similarity",
        "explanation": (
            "At one instant the sun's rays strike both objects at the same angle, and both objects stand "
            "vertically on level ground, so the two right triangles formed share two equal angles and are "
            "similar by AA. Corresponding sides are therefore in the same ratio: "
            "H / 18 = 4.5 / 3 = 1.5, so H = 1.5 x 18 = 27 m."
        ),
    },
    "C10-2627-MATH-REQ032-DIAG-001": {
        "concept_retained": "Right-triangle trigonometry with a given elevation angle and horizontal distance.",
        "curriculum_objective": "LO_M9.1.1 — Solve real-world problems involving angles of elevation and depression.",
        "prompt": (
            "A surveyor stands on level ground 45 m away from the base of a mobile-signal mast and sights its "
            "top through a theodolite held at ground level. The line of sight makes 30 degrees with the ground.\n\n"
            "How tall is the mast? Give the exact value and a value rounded to two decimal places."
        ),
        "stimulus": None,
        "options": None,
        "correct_answer": "15 root 3 m, about 25.98 m",
        "explanation": (
            "In the right triangle formed by the mast, the ground and the line of sight, the mast is the side "
            "opposite the 30 degree angle and the 45 m ground distance is the adjacent side. "
            "So tan 30 = H / 45, and since tan 30 = 1 / root 3, H = 45 / root 3 = 15 root 3 m, "
            "which is approximately 25.98 m."
        ),
    },
    "C10-2627-MATH-REQ034-REASS-005": {
        "concept_retained": "Area of a minor segment = area of the corresponding sector minus the area of the triangle formed by the two radii and the chord.",
        "curriculum_objective": "LO_M11.1.1 — Calculate arc lengths, sector areas and segment areas.",
        "prompt": (
            "A decorative circular window of radius 21 cm has a straight glazing bar fixed across it, joining "
            "two points on its rim. The radii drawn to those two points are perpendicular to each other where "
            "they meet at the hub.\n\n"
            "How much glass, in square centimetres, lies in the smaller of the two pieces created by the bar? "
            "Take pi as 22/7."
        ),
        "stimulus": None,
        "options": None,
        "correct_answer": "126 cm^2",
        "explanation": (
            "Because the radii are perpendicular, the bar and those radii enclose one quarter of the window: "
            "(90/360) x (22/7) x 21 x 21 = 346.5 cm^2. Removing the right-angled triangle formed by the two "
            "radii and the bar, whose area is (1/2) x 21 x 21 = 220.5 cm^2, leaves the smaller piece of glass: "
            "346.5 - 220.5 = 126 cm^2."
        ),
    },
}

# Confirmed content fix carried forward from the enhanced automated review:
# the stored answer is supported, but the stored explanation never reaches the
# stated value. The replacement explanation derives it explicitly.
CONTENT_FIXES: dict[str, dict] = {
    "C10-2627-SCI-REQ043-REASS-002": {
        "reason": "AUTOMATED_PROVISIONAL_CONTENT_FIX — the stored explanation asserted proportionality but did not derive the stated factor of five.",
        "explanation": (
            "The magnetic field at the centre of a circular loop of radius r carrying current I is "
            "B = mu0 I / (2 r) for a single turn. When n turns of the same radius are wound together and carry "
            "the same current, each turn contributes a field in the same direction at the centre, so the "
            "contributions add: B_n = n x mu0 I / (2 r) = n B. With the current and radius unchanged and n "
            "increased from 1 to 5, the field becomes B_5 = 5 x mu0 I / (2 r) = 5 B, that is five times as "
            "strong as with a single turn."
        ),
    },
}

# Official curriculum sources cited for the resolved items. Recorded with an
# explicit NOT_ASSESSED licence status: public accessibility is not permission.
SOURCES: dict[str, dict] = {
    "Mathematics": {
        "source_title": "CBSE Mathematics (041) syllabus, Secondary, session 2025-26",
        "source_url": "https://cbseacademic.nic.in/web_material/CurriculumMain26/Sec/Maths_Sec_2025-26.pdf",
        "checksum_sha256": "2a2c03e9f66a24dd0980d5b07d2ea70bc00ca72fa95cf7c48d2eec224218921e",
        "accessed_at": "2026-09-02",
    },
    "Science": {
        "source_title": "CBSE Science (086) syllabus, Secondary, session 2025-26",
        "source_url": "https://cbseacademic.nic.in/web_material/CurriculumMain26/Sec/Science_Sec_2025-26.pdf",
        "checksum_sha256": "472f528a8fe172967adaccca9272b09060497399618b076b42c44feea8395dea",
        "accessed_at": "2026-09-02",
    },
}

CURRICULUM_SOURCE = {
    "source_title": "CBSE Secondary School Curriculum (Classes IX-X), session 2025-26",
    "source_url": "https://cbseacademic.nic.in/web_material/CurriculumMain26/Sec/Curriculum_Sec_2025-26.pdf",
    "checksum_sha256": "232d23fd23074305512972511feefd28cebe366944701778e24a576c392e3830",
    "accessed_at": "2026-09-02",
}
