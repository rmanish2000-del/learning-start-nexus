import type { UnitExtension } from "../extension-types";
import type { AuthoredQuestion, AuthoredTopic } from "../authoring";

const O1: AuthoredQuestion[] = [
  {
    kind: "true_false",
    difficulty: 1,
    prompt: "Every integer is a rational number.",
    options: ["True", "False"],
    answer: "True",
    explanation:
      "Any integer n can be written as n/1, which fits the form p/q with q ≠ 0, so it is rational.",
  },
  {
    kind: "mcq",
    difficulty: 1,
    prompt: "Between which two consecutive integers does √20 lie?",
    options: ["3 and 4", "4 and 5", "5 and 6", "2 and 3"],
    answer: "4 and 5",
    explanation: "Since 4² = 16 and 5² = 25, and 16 < 20 < 25, √20 lies between 4 and 5.",
  },
  {
    kind: "short_answer",
    difficulty: 3,
    prompt: "Insert one rational number between 1/4 and 1/3.",
    answer: "7/24",
    explanation:
      "Adding the fractions and halving gives (1/4 + 1/3)/2 = (7/12)/2 = 7/24, which lies strictly between 1/4 and 1/3.",
  },
  {
    kind: "assertion_reason",
    difficulty: 4,
    prompt:
      "Assertion (A): π is an irrational number. Reason (R): The decimal expansion of π is non-terminating and non-recurring.",
    options: [
      "Both A and R are true and R is the correct explanation of A",
      "Both A and R are true but R is not the correct explanation of A",
      "A is true but R is false",
      "A is false but R is true",
    ],
    answer: "Both A and R are true and R is the correct explanation of A",
    explanation:
      "π cannot be expressed as p/q for integers p, q, and its decimal expansion never terminates or repeats, which is exactly why it is irrational.",
  },
  {
    kind: "applied_mcq",
    difficulty: 4,
    prompt:
      "A carpenter measures a plank and records its length as 0.101001000100001... metres, continuing the pattern of adding one more zero each time. What type of number is this length?",
    options: ["Rational, terminating", "Rational, recurring", "Irrational", "Not a real number"],
    answer: "Irrational",
    explanation:
      "The decimal never terminates and never settles into a repeating block, so it cannot be written as p/q and is irrational.",
  },
];

const O2: AuthoredQuestion[] = [
  {
    kind: "mcq",
    difficulty: 2,
    prompt: "The value of (81)^(3/4) is:",
    options: ["27", "9", "3", "81"],
    answer: "27",
    explanation: "81 = 3⁴, so (81)^(3/4) = 3^(4 × 3/4) = 3³ = 27.",
  },
  {
    kind: "true_false",
    difficulty: 2,
    prompt: "√5 × √5 is a rational number.",
    options: ["True", "False"],
    answer: "True",
    explanation: "√5 × √5 = 5, and 5 is an integer, hence rational, even though √5 itself is irrational.",
  },
  {
    kind: "short_answer",
    difficulty: 4,
    prompt: "Rationalise the denominator of 5/(√7 − √2) and give the simplified numerator over the whole-number denominator.",
    answer: "5(√7 + √2)/5, i.e. √7 + √2",
    explanation:
      "Multiplying by the conjugate (√7 + √2) gives denominator 7 − 2 = 5, so 5(√7 + √2)/5 simplifies to √7 + √2.",
  },
  {
    kind: "applied_mcq",
    difficulty: 5,
    prompt:
      "A rectangle has area (3 + √5)(3 − √5) square units. What is its area?",
    options: ["4", "9 − √5", "9 + √5", "14"],
    answer: "4",
    explanation: "This fits (a + b)(a − b) = a² − b² with a = 3, b = √5, giving 9 − 5 = 4.",
  },
];

const topicSquaresCubes: AuthoredTopic = {
  title: "Squares, cubes and estimation of roots",
  outcomes: [
    {
      title: "Estimate and verify square roots and cube roots of numbers using known perfect powers",
      category: "procedural",
      bloom: "apply",
      difficulty: 2,
      weight: 5,
      types: ["mcq", "short_answer"],
      atoms: [
        "Estimate the square root of a non-perfect-square number using nearby perfect squares",
        "Estimate the cube root of a non-perfect-cube number using nearby perfect cubes",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 1,
          prompt: "√50 lies between which pair of consecutive integers?",
          options: ["6 and 7", "7 and 8", "5 and 6", "8 and 9"],
          answer: "7 and 8",
          explanation: "7² = 49 and 8² = 64, and 49 < 50 < 64, so √50 lies between 7 and 8.",
        },
        {
          kind: "short_answer",
          difficulty: 2,
          prompt: "Find the best whole-number estimate for the cube root of 66.",
          answer: "4",
          explanation: "4³ = 64 and 5³ = 125; since 66 is much closer to 64, the best whole-number estimate is 4.",
        },
        {
          kind: "true_false",
          difficulty: 1,
          prompt: "The cube root of 27 is a rational number.",
          options: ["True", "False"],
          answer: "True",
          explanation: "27 = 3³, so its cube root is exactly 3, an integer, which is rational.",
        },
        {
          kind: "applied_mcq",
          difficulty: 3,
          prompt:
            "A square garden has area 90 m². Between which two consecutive whole numbers does the side length lie?",
          options: ["8 and 9", "9 and 10", "7 and 8", "10 and 11"],
          answer: "9 and 10",
          explanation: "Side length = √90; since 9² = 81 and 10² = 100, and 81 < 90 < 100, it lies between 9 and 10.",
        },
        {
          kind: "mcq",
          difficulty: 4,
          prompt: "Which of these is the closest integer estimate to √0.99 × √99?",
          options: ["9", "10", "99", "1"],
          answer: "10",
          explanation:
            "√0.99 × √99 = √(0.99 × 99) = √98.01, which is very close to √100 = 10.",
        },
        {
          kind: "short_answer",
          difficulty: 2,
          prompt: "Estimate the square root of 145 to the nearest whole number.",
          answer: "12",
          explanation: "12² = 144 and 13² = 169; since 145 is very close to 144, the nearest whole-number estimate is 12.",
        },
      ],
    },
  ],
};

const topicNumberLine: AuthoredTopic = {
  title: "Representing real numbers on the number line",
  outcomes: [
    {
      title: "Locate rational and irrational numbers on the number line using geometric and successive magnification methods",
      category: "conceptual",
      bloom: "apply",
      difficulty: 3,
      weight: 5,
      types: ["mcq", "short_answer", "true_false"],
      atoms: [
        "Represent √n geometrically using the Pythagoras theorem construction on a number line",
        "Locate a given decimal number between two points using successive magnification",
      ],
      questions: [
        {
          kind: "short_answer",
          difficulty: 3,
          prompt:
            "To represent √13 on the number line using the standard construction, a right triangle with one leg 3 units and hypotenuse √13 units is used. What is the length of the other leg?",
          answer: "2 units",
          explanation:
            "By Pythagoras theorem, leg² = 13 − 3² = 13 − 9 = 4, so the other leg is √4 = 2 units.",
        },
        {
          kind: "mcq",
          difficulty: 2,
          prompt:
            "Using successive magnification, 2.35 lies between which pair of numbers at the first step of zooming into the interval [2, 3]?",
          options: ["2.3 and 2.4", "2.0 and 2.1", "2.4 and 2.5", "3.0 and 3.1"],
          answer: "2.3 and 2.4",
          explanation:
            "Since 2.35 starts with digits 2.3, the first zoom step narrows the interval [2, 3] down to [2.3, 2.4].",
        },
        {
          kind: "true_false",
          difficulty: 2,
          prompt: "Every point on the number line represents a unique real number.",
          options: ["True", "False"],
          answer: "True",
          explanation:
            "This is the fundamental correspondence between points on the number line and the set of real numbers.",
        },
        {
          kind: "applied_mcq",
          difficulty: 4,
          prompt:
            "A number line diagram shows a right triangle drawn with legs 1 unit and 1 unit to mark a point using a compass. Which irrational number is being represented on the number line?",
          options: ["√2", "√3", "√1", "2"],
          answer: "√2",
          explanation:
            "By Pythagoras theorem, the hypotenuse of a right triangle with both legs 1 unit is √(1² + 1²) = √2.",
        },
        {
          kind: "short_answer",
          difficulty: 3,
          prompt: "State the interval obtained after zooming once into [0, 1] to locate the number 0.68.",
          answer: "[0.6, 0.7]",
          explanation:
            "Since 0.68 begins with digits 0.6, the first magnification step narrows [0, 1] to the interval [0.6, 0.7].",
        },
        {
          kind: "mcq",
          difficulty: 5,
          prompt:
            "To geometrically construct √5 on the number line in one step from a segment of length 2 units, what length must the perpendicular leg be?",
          options: ["1 unit", "3 units", "√3 units", "2 units"],
          answer: "1 unit",
          explanation:
            "Pythagoras theorem requires 2² + leg² = 5, so leg² = 1 and leg = 1 unit.",
        },
        {
          kind: "mcq",
          difficulty: 3,
          prompt: "Which point below best represents √7 constructed on the number line from a segment of length 3 units?",
          options: ["A perpendicular leg of length √(7-9)", "A perpendicular leg of length √2 with base 3 as one leg", "A hypotenuse of length 3 with one leg √7", "A perpendicular leg of length √7 with hypotenuse 3"],
          answer: "A hypotenuse of length 3 with one leg √7",
          explanation:
            "Constructing √7 needs a right triangle where the hypotenuse works out to √7; using legs 2 and √3 satisfies 2² + (√3)² = 7, so a hypotenuse equal to √7 is drawn using compasses.",
        },
      ],
    },
  ],
};

const topicOperations: AuthoredTopic = {
  title: "Operations on real numbers",
  outcomes: [
    {
      title: "Perform addition, subtraction, multiplication and division involving rational and irrational numbers correctly",
      category: "procedural",
      bloom: "apply",
      difficulty: 3,
      weight: 5,
      types: ["mcq", "short_answer", "applied_mcq"],
      atoms: [
        "Add or subtract two surds after expressing them with the same irrational part",
        "Determine whether the sum, difference, product or quotient of a rational and an irrational number is rational or irrational",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "Simplify: 3√2 + 5√2 − √2.",
          options: ["7√2", "8√2", "9√2", "7"],
          answer: "7√2",
          explanation: "Since all terms share the irrational part √2, combine coefficients: 3 + 5 − 1 = 7, giving 7√2.",
        },
        {
          kind: "true_false",
          difficulty: 2,
          prompt: "The sum of a non-zero rational number and an irrational number is always irrational.",
          options: ["True", "False"],
          answer: "True",
          explanation:
            "If the sum were rational, subtracting the rational number would make the irrational number equal to a rational number, which is impossible.",
        },
        {
          kind: "short_answer",
          difficulty: 3,
          prompt: "Simplify: √3 × √12.",
          answer: "6",
          explanation: "√3 × √12 = √(3 × 12) = √36 = 6.",
        },
        {
          kind: "applied_mcq",
          difficulty: 4,
          prompt:
            "A student claims that the product of two irrational numbers is always irrational, citing √2 × √3 = √6 as evidence. Which example disproves this claim?",
          options: ["√2 × √8", "√2 × √3", "√5 × √7", "√6 × √10"],
          answer: "√2 × √8",
          explanation:
            "√2 × √8 = √16 = 4, which is rational, showing that two irrational numbers can multiply to give a rational result.",
        },
        {
          kind: "mcq",
          difficulty: 4,
          prompt: "Which expression equals a rational number?",
          options: ["(2 + √3) + (2 − √3)", "(2 + √3) + (3 + √3)", "√3 + √5", "√3 × √5"],
          answer: "(2 + √3) + (2 − √3)",
          explanation: "(2 + √3) + (2 − √3) = 4, since the surd terms cancel out, leaving a rational number.",
        },
        {
          kind: "true_false",
          difficulty: 3,
          prompt: "The quotient of two irrational numbers is always irrational.",
          options: ["True", "False"],
          answer: "False",
          explanation: "For example, √8 ÷ √2 = √4 = 2, which is rational, so the quotient of two irrationals can be rational.",
        },
        {
          kind: "short_answer",
          difficulty: 2,
          prompt: "Simplify: 4√5 − 2√5 + √5.",
          answer: "3√5",
          explanation: "Combining like surd terms: 4 − 2 + 1 = 3, giving 3√5.",
        },
      ],
    },
  ],
};

const topicLaws: AuthoredTopic = {
  title: "Laws of exponents for real numbers",
  outcomes: [
    {
      title: "Use the laws of exponents to simplify expressions involving rational exponents and negative powers",
      category: "procedural",
      bloom: "apply",
      difficulty: 3,
      weight: 5,
      types: ["mcq", "short_answer", "true_false"],
      atoms: [
        "Simplify expressions using a^m ÷ a^n = a^(m−n) and (ab)^m = a^m × b^m",
        "Evaluate expressions with zero and negative rational exponents",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "Simplify: 5^7 ÷ 5^4.",
          options: ["5^3", "5^11", "5^(7/4)", "5^28"],
          answer: "5^3",
          explanation: "For the same base, dividing subtracts exponents: 5^7 ÷ 5^4 = 5^(7−4) = 5^3.",
        },
        {
          kind: "short_answer",
          difficulty: 3,
          prompt: "Evaluate: 4^(−1/2).",
          answer: "1/2",
          explanation: "4^(−1/2) = 1/4^(1/2) = 1/√4 = 1/2.",
        },
        {
          kind: "true_false",
          difficulty: 1,
          prompt: "For any non-zero real number a, a^0 = 1.",
          options: ["True", "False"],
          answer: "True",
          explanation: "By the definition and laws of exponents, any non-zero base raised to the power zero equals 1.",
        },
        {
          kind: "applied_mcq",
          difficulty: 4,
          prompt: "Simplify (2^3 × 3^3) into a single base-product power using the law (ab)^m = a^m × b^m in reverse.",
          options: ["6^3", "5^3", "6^6", "6^9"],
          answer: "6^3",
          explanation: "Since 2^3 × 3^3 = (2 × 3)^3 = 6^3 by the combined-power law applied in reverse.",
        },
        {
          kind: "mcq",
          difficulty: 5,
          prompt: "Simplify: (x^(2/3))^(3/4) × x^(1/2), where x > 0.",
          options: ["x^1", "x^(5/4)", "x^(3/2)", "x^(2/3)"],
          answer: "x^1",
          explanation:
            "(x^(2/3))^(3/4) = x^((2/3)(3/4)) = x^(1/2), and x^(1/2) × x^(1/2) = x^(1/2 + 1/2) = x^1.",
        },
        {
          kind: "short_answer",
          difficulty: 3,
          prompt: "Evaluate: 8^(2/3) ÷ 8^(1/3).",
          answer: "2",
          explanation: "8^(2/3) ÷ 8^(1/3) = 8^(2/3 − 1/3) = 8^(1/3) = 2.",
        },
        {
          kind: "true_false",
          difficulty: 2,
          prompt: "For a > 0, a^(-2) is always a positive real number.",
          options: ["True", "False"],
          answer: "True",
          explanation: "a^(-2) = 1/a², and since a² is positive for a > 0, its reciprocal is also positive.",
        },
      ],
    },
  ],
};

export const EXT: UnitExtension = {
  unitId: "C9-MAT-U1",
  newTopics: [
    { chapter: 1, topic: topicSquaresCubes },
    { chapter: 1, topic: topicNumberLine },
    { chapter: 1, topic: topicOperations },
    { chapter: 1, topic: topicLaws },
  ],
  extraQuestions: {
    "C9-MAT-U1-CH1-T1-O1": O1,
    "C9-MAT-U1-CH1-T2-O1": O2,
  },
};
