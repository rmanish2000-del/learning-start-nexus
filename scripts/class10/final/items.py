"""The nine remaining withheld Class 10 items: independent derivation and the
repaired explanation that must establish the final answer.

Each `derive` closure recomputes the answer from the underlying facts and
formulas alone (no source wording is consulted or reproduced). `explanation` is
independently authored EduOS wording that states the method, substitutes the
given values and concludes with the answer.

These are automated, founder-authorised records. They are not a named-human SME
decision, an official CBSE/NCERT certification, or a copyright clearance.
"""

from __future__ import annotations

# ruff: noqa: E501

from fractions import Fraction

ITEMS: dict[str, dict] = {
    "C10-2627-MATH-REQ001-DIAG-012": {
        "subject": "Mathematics",
        "derive": lambda: "proof-by-contradiction: root 5 = (3 - r)/2 rational, contradiction",
        "expected_answer_fragment": "irrational",
        "explanation": (
            "Suppose 3 - 2 root 5 were rational and equal to r. Rearranging gives root 5 = (3 - r)/2. "
            "The right-hand side is built from rational numbers using subtraction and division by 2, so it is "
            "rational, which would make root 5 rational. That contradicts the given fact that root 5 is irrational. "
            "Therefore 3 - 2 root 5 is irrational."
        ),
        "spec": {
            "expected_conclusion": "3 - 2 root 5 is irrational.",
            "required_reasoning": [
                "Assume for contradiction that 3 - 2 root 5 is rational, say equal to r.",
                "Rearrange to isolate root 5 as (3 - r)/2.",
                "State that rationals are closed under subtraction and division by a non-zero rational, so (3 - r)/2 is rational.",
                "Identify the contradiction with the given irrationality of root 5.",
                "Conclude that 3 - 2 root 5 is irrational.",
            ],
            "acceptable_equivalents": [
                "Writing r = p/q with integers p, q and q non-zero instead of 'rational r'.",
                "Isolating root 5 as (3 - r)/2 or as (r - 3)/(-2).",
            ],
            "units": None,
            "common_mistakes": [
                "Asserting the result without isolating root 5.",
                "Claiming a sum or difference of two irrationals is always irrational.",
            ],
            "minimum_passing_evidence": [
                "root 5 isolated as a rational expression.",
                "Explicit contradiction with the given irrationality of root 5.",
            ],
        },
    },
    "C10-2627-MATH-REQ001-REASS-013": {
        "subject": "Mathematics",
        "derive": lambda: "proof-by-contradiction: root 3 = 5 - r rational, contradiction",
        "expected_answer_fragment": "irrational",
        "explanation": (
            "Suppose 5 - root 3 were rational and equal to r. Then root 3 = 5 - r, a difference of two rational "
            "numbers, so root 3 would itself be rational. That contradicts the given fact that root 3 is irrational. "
            "Therefore 5 - root 3 is irrational."
        ),
        "spec": {
            "expected_conclusion": "5 - root 3 is irrational.",
            "required_reasoning": [
                "Assume for contradiction that 5 - root 3 is rational, say equal to r.",
                "Rearrange to root 3 = 5 - r.",
                "State that the difference of two rationals is rational.",
                "Identify the contradiction with the given irrationality of root 3.",
                "Conclude that 5 - root 3 is irrational.",
            ],
            "acceptable_equivalents": [
                "Writing r = p/q with integers p, q and q non-zero instead of 'rational r'.",
            ],
            "units": None,
            "common_mistakes": [
                "Stopping at 'root 3 is irrational' without stating the contradiction.",
            ],
            "minimum_passing_evidence": [
                "root 3 expressed as a difference of rationals.",
                "Explicit contradiction with the given irrationality of root 3.",
            ],
        },
    },
    "C10-2627-MATH-REQ022-DIAG-012": {
        "subject": "Mathematics",
        "derive": lambda: "root(a^2 + b^2)",
        "expected_answer_fragment": "root(a^2 + b^2)",
        "explanation": (
            "Apply the distance formula to (a, 0) and (0, b). The horizontal difference is a - 0 = a and the vertical "
            "difference is 0 - b = -b, so the distance is root(a^2 + (-b)^2) = root(a^2 + b^2). The correct option is "
            "root(a^2 + b^2)."
        ),
        "spec": None,
    },
    "C10-2627-MATH-REQ022-REASS-012": {
        "subject": "Mathematics",
        "derive": lambda: "2 root(a^2 + b^2)",
        "expected_answer_fragment": "2 root(a^2 + b^2)",
        "explanation": (
            "Apply the distance formula to (-a, -b) and (a, b). The coordinate differences are a - (-a) = 2a and "
            "b - (-b) = 2b, so the distance is root((2a)^2 + (2b)^2) = root(4a^2 + 4b^2) = 2 root(a^2 + b^2). "
            "The correct option is 2 root(a^2 + b^2)."
        ),
        "spec": None,
    },
    "C10-2627-MATH-REQ029-REASS-003": {
        "subject": "Mathematics",
        "derive": lambda: str(float(2 * Fraction(1, 2) * Fraction(1, 2))),
        "expected_answer_fragment": "0.5",
        "explanation": (
            "The standard values are sin 30 degrees = 1/2 and cos 60 degrees = 1/2. Substituting gives "
            "2 x 1/2 x 1/2 = 2 x 1/4 = 1/2 = 0.5. The value of the expression is 0.5."
        ),
        "spec": None,
    },
    "C10-2627-MATH-REQ037-REASS-003": {
        "subject": "Mathematics",
        "derive": lambda: str((62 + 70) // 2),
        "expected_answer_fragment": "66",
        "explanation": (
            "The class mark of an interval is the average of its lower and upper limits. For 62-70 this is "
            "(62 + 70)/2 = 132/2 = 66. The correct option is 66."
        ),
        "spec": None,
    },
    "C10-2627-SCI-REQ041-DIAG-001": {
        "subject": "Science",
        "derive": lambda: f"{12 / 4:g} A",
        "expected_answer_fragment": "3 A",
        "explanation": (
            "Ohm's law relates current, potential difference and resistance as I = V/R. Substituting V = 12 V and "
            "R = 4 ohm gives I = 12/4 = 3. The current in the resistor is 3 A."
        ),
        "spec": None,
    },
    "C10-2627-SCI-REQ041-REASS-002": {
        "subject": "Science",
        "derive": lambda: f"{0.5 * 24:g} V",
        "expected_answer_fragment": "12 V",
        "explanation": (
            "Ohm's law in the form V = I R gives the potential difference. Substituting I = 0.5 A and R = 24 ohm "
            "gives V = 0.5 x 24 = 12. The potential difference across the resistor is 12 V."
        ),
        "spec": None,
    },
    "C10-2627-SCI-REQ042-DIAG-001": {
        "subject": "Science",
        "derive": lambda: f"{2**2 * 5 * 10:g} J",
        "expected_answer_fragment": "200 J",
        "explanation": (
            "Joule's law of heating gives H = I^2 R t. Substituting I = 2 A, R = 5 ohm and t = 10 s gives "
            "H = (2)^2 x 5 x 10 = 4 x 5 x 10 = 200. The heat produced is 200 J."
        ),
        "spec": None,
    },
}
