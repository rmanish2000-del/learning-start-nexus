"""Diagnostic and reassessment capacity restoration for LO_5.1.1.1.

The 2026-27 Class 10 Science corpus carried a single reassessment item on
"Define life processes and explain why simple diffusion is inadequate for
multicellular organisms" and no diagnostic item, so that outcome could not be
diagnosed at all. Four independently authored items are added here: two
diagnostic and two reassessment, matching the two-diagnostic baseline used
across the rest of the corpus.

Every item is written from the underlying biological facts and the stored
curriculum outcome only. No official textbook wording, exercise, answer key or
diagram is reproduced. These are automated, founder-authorised items — not a
named-human SME decision, not an official CBSE/NCERT certification, and not a
copyright clearance.
"""

from __future__ import annotations

# ruff: noqa: E501

OUTCOME_ID = "b076ee43-f955-4415-a98f-d9a19f33d0df"
BOOK_ID = "9a9ee914-468e-4ef2-9269-eab8c9ba85a8"
SUBJECT = "Science"

CAPACITY_ITEMS: list[dict] = [
    {
        "external_ref": "C10-2627-SCI-REQ022-DIAG-001",
        "kind": "mcq",
        "difficulty": 1,
        "prompt": "Which of the following best describes what is meant by a life process?",
        "options": [
            "Any movement that an organism makes in response to light",
            "A maintenance function that an organism must carry out continuously to stay alive",
            "The stage of growth at which an organism becomes capable of reproduction",
            "A change in an organism's body brought about only by its surroundings",
        ],
        "correct_answer": "A maintenance function that an organism must carry out continuously to stay alive",
        "explanation": (
            "Life processes are the maintenance functions that keep an organism alive even when it is doing nothing "
            "visible, such as nutrition, respiration, transport and excretion. They must run continuously because "
            "molecular wear and tear continues at all times. The correct option is: a maintenance function that an "
            "organism must carry out continuously to stay alive."
        ),
        "expected_answer_fragment": "maintenance function",
    },
    {
        "external_ref": "C10-2627-SCI-REQ022-DIAG-002",
        "kind": "mcq",
        "difficulty": 2,
        "prompt": "As an organism's body gets larger, why does simple diffusion become inadequate for supplying oxygen to its inner cells?",
        "options": [
            "The surface area to volume ratio falls and the distance to the inner cells rises",
            "Oxygen molecules become heavier inside a larger body",
            "Diffusion stops completely once a body exceeds one centimetre in width",
            "Larger organisms stop respiring in their inner cells",
        ],
        "correct_answer": "The surface area to volume ratio falls and the distance to the inner cells rises",
        "explanation": (
            "Volume grows faster than surface area, so a larger body has less exchange surface per unit of living "
            "tissue, and its inner cells sit much further from that surface. Diffusion is only fast over very short "
            "distances, so oxygen cannot arrive quickly enough. The correct option is: the surface area to volume "
            "ratio falls and the distance to the inner cells rises."
        ),
        "expected_answer_fragment": "surface area to volume ratio falls",
    },
    {
        "external_ref": "C10-2627-SCI-REQ022-REASS-002",
        "kind": "mcq",
        "difficulty": 2,
        "prompt": "A unicellular organism living in pond water meets all of its gas exchange needs by diffusion. Which feature makes this possible?",
        "options": [
            "Its whole body surface is in contact with the water and no part of it is far from that surface",
            "It has a specialised respiratory pigment in its cytoplasm",
            "It carries out respiration only at night, when oxygen demand is lower",
            "It stores enough oxygen during the day to last the rest of its life",
        ],
        "correct_answer": "Its whole body surface is in contact with the water and no part of it is far from that surface",
        "explanation": (
            "In a single-celled organism the cell membrane is the exchange surface and every part of the cytoplasm "
            "lies within a very short distance of it, so diffusion alone moves gases fast enough. The correct option "
            "is: its whole body surface is in contact with the water and no part of it is far from that surface."
        ),
        "expected_answer_fragment": "whole body surface is in contact with the water",
    },
    {
        "external_ref": "C10-2627-SCI-REQ022-REASS-003",
        "kind": "mcq",
        "difficulty": 3,
        "prompt": "Which consequence follows directly from a multicellular animal being unable to rely on diffusion alone for transport?",
        "options": [
            "It must develop a circulatory system that carries substances between exchange surfaces and cells",
            "It must reduce the number of cells in its body until diffusion is sufficient",
            "It must stop excreting waste products from its inner tissues",
            "It must live only in water that is richer in oxygen than air",
        ],
        "correct_answer": "It must develop a circulatory system that carries substances between exchange surfaces and cells",
        "explanation": (
            "Because diffusion cannot cover the distance to inner cells quickly enough, a bulk transport route is "
            "required: a circulatory system moves oxygen and nutrients from the exchange surfaces to every tissue and "
            "carries waste away. The correct option is: it must develop a circulatory system that carries substances "
            "between exchange surfaces and cells."
        ),
        "expected_answer_fragment": "circulatory system",
    },
]
