"""Production-release-candidate rewrites for items classified LICENCE_NOT_CONFIRMED.

Two additional Mathematics items were found, during item-level licence
classification, to share a six-word window with a recorded third-party shingle
above the 0.15 threshold. Only the underlying fact, formula and curriculum
objective are retained; the scenario, the numbers, the question sentence, the
answer and the worked explanation are newly authored in EduOS's own language.

No copyright clearance is claimed. Public accessibility of a source is never
recorded as licence permission. All outcomes remain
FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL.
"""

from __future__ import annotations

# ruff: noqa: E501

REWRITES_V2: dict[str, dict] = {
    "C10-2627-MATH-REQ032-REASS-001": {
        "concept_retained": "Right-triangle trigonometry: tan of the sighting angle relates vertical height to horizontal distance; tan 45 = 1.",
        "curriculum_objective": "LO_M9.1.1 - Solve simple problems on heights and distances using trigonometric ratios.",
        "prompt": (
            "A surveyor stands on level ground 18 m from the base of a straight flagpole. "
            "Looking at the tip of the pole, her line of sight rises 45 degrees above the horizontal, "
            "and her measuring instrument sits at ground level.\n\n"
            "Work out how tall the flagpole is."
        ),
        "stimulus": None,
        "options": None,
        "correct_answer": "18 m",
        "explanation": (
            "The pole, the ground and the line of sight form a right triangle in which the pole is the side "
            "opposite the 45 degree sighting angle and the 18 m ground distance is the side adjacent to it. "
            "So tan 45 = pole height / 18. Since tan 45 = 1, the pole height equals the ground distance, "
            "giving 18 m."
        ),
        "source_section": "Mathematics Class X syllabus - Some Applications of Trigonometry: simple heights and distances problems with angles of 30, 45 and 60 degrees.",
    },
    "C10-2627-MATH-REQ034-DIAG-005": {
        "concept_retained": "Area of a circular segment = area of the corresponding sector minus the area of the triangle formed by the two bounding radii.",
        "curriculum_objective": "LO_M11.1.2 - Calculate areas of sectors and segments of a circle.",
        "prompt": (
            "On a circular clock face of radius 14 cm, two straight spokes are drawn from the centre to the "
            "12 mark and to the 3 mark, so that they meet at the centre at 90 degrees. A straight wire is then "
            "stretched directly between the 12 mark and the 3 mark.\n\n"
            "Find the area of the smaller region enclosed between that wire and the clock rim. Take pi as 3.14."
        ),
        "stimulus": None,
        "options": None,
        "correct_answer": "55.86 cm^2",
        "explanation": (
            "The two spokes cut off a quarter of the disc, whose area is (1/4) x 3.14 x 14 x 14 = 153.86 cm^2. "
            "The wire and the two spokes bound a right triangle of area (1/2) x 14 x 14 = 98 cm^2. "
            "The region between the wire and the rim is the quarter disc with that triangle removed, "
            "so its area is 153.86 - 98 = 55.86 cm^2."
        ),
        "source_section": "Mathematics Class X syllabus - Areas Related to Circles: areas of sectors and segments of a circle.",
    },
}
