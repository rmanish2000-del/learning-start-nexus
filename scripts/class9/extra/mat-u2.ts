import type { UnitExtension } from "../extension-types";
import type { AuthoredQuestion, AuthoredTopic } from "../authoring";

const remainderTheoremTopic: AuthoredTopic = {
  title: "Remainder theorem and value of polynomials",
  outcomes: [
    {
      title: "Apply the remainder theorem to find remainders and use it to check factors",
      category: "procedural",
      bloom: "apply",
      difficulty: 3,
      weight: 5,
      types: ["mcq", "short_answer", "true_false", "applied_mcq", "assertion_reason"],
      atoms: [
        "Use the remainder theorem to find the remainder of p(x) on division by (x − a)",
        "Use the remainder/factor theorem to test whether (x − a) is a factor of p(x)",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 1,
          prompt: "By the remainder theorem, what is the remainder when p(x) = x² + 3x + 2 is divided by (x − 1)?",
          options: ["6", "0", "2", "5"],
          answer: "6",
          explanation: "The remainder equals p(1) = 1² + 3(1) + 2 = 6, by the remainder theorem.",
        },
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "Find the remainder when p(x) = x³ − 2x² + x − 1 is divided by (x + 1).",
          options: ["−5", "−1", "5", "1"],
          answer: "−5",
          explanation: "The remainder is p(−1) = −1 − 2 − 1 − 1 = −5, since dividing by (x + 1) uses a = −1.",
        },
        {
          kind: "short_answer",
          difficulty: 2,
          prompt: "Using the remainder theorem, find the remainder when 2x³ − 3x² + 4x − 5 is divided by (x − 2).",
          answer: "7",
          explanation: "The remainder is p(2) = 2(8) − 3(4) + 4(2) − 5 = 16 − 12 + 8 − 5 = 7.",
        },
        {
          kind: "true_false",
          difficulty: 1,
          prompt: "The remainder theorem states that the remainder when a polynomial p(x) is divided by (x − a) equals p(a).",
          options: ["True", "False"],
          answer: "True",
          explanation: "This is the exact statement of the remainder theorem for division by a linear polynomial (x − a).",
        },
        {
          kind: "true_false",
          difficulty: 2,
          prompt: "When p(x) is divided by (x + a), the remainder obtained equals p(a).",
          options: ["True", "False"],
          answer: "False",
          explanation: "Dividing by (x + a) means the zero of the divisor is x = −a, so the remainder is p(−a), not p(a).",
        },
        {
          kind: "applied_mcq",
          difficulty: 3,
          prompt: "For p(x) = x³ − 6x² + 11x − 6, is (x − 2) a factor of p(x)?",
          options: [
            "Yes, since p(2) = 0, so (x − 2) is a factor",
            "No, since p(2) = 4, so (x − 2) is not a factor",
            "Yes, since p(2) = 2",
            "No, since p(−2) = 0",
          ],
          answer: "Yes, since p(2) = 0, so (x − 2) is a factor",
          explanation: "p(2) = 8 − 24 + 22 − 6 = 0. By the factor theorem, a zero remainder at x = 2 means (x − 2) divides p(x) exactly.",
        },
        {
          kind: "assertion_reason",
          difficulty: 4,
          stimulus:
            "Assertion: (x + 3) is a factor of x³ + 3x² − x − 3. Reason: By the factor theorem, (x − a) is a factor of p(x) if and only if p(a) = 0.",
          prompt: "Choose the correct option about the assertion and the reason.",
          options: [
            "Both are true and the reason correctly explains the assertion",
            "Both are true but the reason does not explain the assertion",
            "The assertion is true but the reason is false",
            "The assertion is false but the reason is true",
          ],
          answer: "Both are true and the reason correctly explains the assertion",
          explanation: "p(−3) = −27 + 27 + 3 − 3 = 0, so (x − (−3)) = (x + 3) is a factor, exactly as the stated factor theorem predicts.",
        },
        {
          kind: "mcq",
          difficulty: 5,
          prompt: "For what value of k is (x − 1) a factor of the polynomial kx² + 2x − 3?",
          options: ["1", "2", "−1", "3"],
          answer: "1",
          explanation: "By the factor theorem, p(1) = k + 2 − 3 = k − 1 must equal 0, so k = 1.",
        },
      ],
    },
  ],
};

const simultaneousEquationsTopic: AuthoredTopic = {
  title: "Simultaneous linear equations and applications",
  outcomes: [
    {
      title: "Solve real-life problems using linear equations in two variables and represent them graphically",
      category: "application",
      bloom: "analyse",
      difficulty: 3,
      weight: 5,
      types: ["mcq", "short_answer", "true_false", "applied_mcq", "assertion_reason"],
      atoms: [
        "Find the common solution of two linear equations in two variables",
        "Translate a word problem into a pair of linear equations and interpret the graph",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 1,
          prompt: "Which ordered pair satisfies both x + y = 5 and x − y = 1?",
          options: ["(3, 2)", "(2, 3)", "(4, 1)", "(1, 4)"],
          answer: "(3, 2)",
          explanation: "Adding the equations gives 2x = 6, so x = 3; substituting back gives y = 2, which satisfies both equations.",
        },
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "For the line 3x − 2y = 6, what is the value of y when x = 0?",
          options: ["−3", "3", "6", "−6"],
          answer: "−3",
          explanation: "Substituting x = 0 gives −2y = 6, so y = −3. This is the point where the line meets the y-axis.",
        },
        {
          kind: "short_answer",
          difficulty: 2,
          prompt: "Solve the pair of equations x + y = 10 and x − y = 4 for x and y.",
          answer: "x = 7, y = 3",
          explanation: "Adding the equations gives 2x = 14, so x = 7. Substituting into x + y = 10 gives y = 3.",
        },
        {
          kind: "true_false",
          difficulty: 2,
          prompt: "The graphs of x = 5 and y = 3 intersect at the point (5, 3).",
          options: ["True", "False"],
          answer: "True",
          explanation: "x = 5 is a vertical line and y = 3 is a horizontal line; they cross exactly at the point where both hold, namely (5, 3).",
        },
        {
          kind: "true_false",
          difficulty: 3,
          prompt: "The lines represented by 2x + 3y = 6 and 4x + 6y = 12 intersect at exactly one point.",
          options: ["True", "False"],
          answer: "False",
          explanation: "The second equation is just the first multiplied by 2, so both represent the same line and have infinitely many common points, not one.",
        },
        {
          kind: "applied_mcq",
          difficulty: 3,
          prompt: "The sum of two numbers is 18 and their difference is 4. Representing this as a pair of linear equations and solving, what are the two numbers?",
          options: ["11 and 7", "12 and 6", "10 and 8", "13 and 5"],
          answer: "11 and 7",
          explanation: "Let the numbers be x and y with x + y = 18 and x − y = 4. Adding gives 2x = 22, so x = 11 and y = 7.",
        },
        {
          kind: "assertion_reason",
          difficulty: 4,
          stimulus:
            "Assertion: The linear equation 2x + y = 7 has infinitely many solutions. Reason: For every real value chosen for x, a corresponding value of y can be found so that the ordered pair satisfies the equation.",
          prompt: "Choose the correct option about the assertion and the reason.",
          options: [
            "Both are true and the reason correctly explains the assertion",
            "Both are true but the reason does not explain the assertion",
            "The assertion is true but the reason is false",
            "The assertion is false but the reason is true",
          ],
          answer: "Both are true and the reason correctly explains the assertion",
          explanation: "Since y = 7 − 2x can be computed for any real x, there are infinitely many ordered pairs satisfying the equation, which is exactly what the reason describes.",
        },
        {
          kind: "mcq",
          difficulty: 5,
          prompt: "A line passes through the points (1, 2) and (3, 4). Which equation represents this line?",
          options: ["x − y + 1 = 0", "x + y − 3 = 0", "2x − y = 0", "x − y − 1 = 0"],
          answer: "x − y + 1 = 0",
          explanation: "Checking (1, 2): 1 − 2 + 1 = 0. Checking (3, 4): 3 − 4 + 1 = 0. Both points satisfy x − y + 1 = 0.",
        },
      ],
    },
  ],
};

const degreeZeroExtra: AuthoredQuestion[] = [
  {
    kind: "mcq",
    difficulty: 1,
    prompt: "What is the degree of the constant polynomial p(x) = 7?",
    options: ["0", "1", "7", "undefined"],
    answer: "0",
    explanation: "A non-zero constant can be written as 7x⁰, so its degree is 0.",
  },
  {
    kind: "true_false",
    difficulty: 2,
    prompt: "The polynomial 3x⁴ + 2x³ − x + 5 has degree 3.",
    options: ["True", "False"],
    answer: "False",
    explanation: "The highest power of x with a non-zero coefficient is 4, from the term 3x⁴, so the degree is 4, not 3.",
  },
  {
    kind: "short_answer",
    difficulty: 3,
    prompt: "Check whether x = 3 is a zero of p(x) = x² − 4x + 3.",
    answer: "Yes, p(3) = 0",
    explanation: "p(3) = 9 − 12 + 3 = 0, so x = 3 makes the polynomial equal to zero and is therefore a zero of p(x).",
  },
  {
    kind: "applied_mcq",
    difficulty: 4,
    prompt: "A polynomial in one variable has terms with powers 0, 2, 5 and 3, each with non-zero coefficients. What is its degree?",
    options: ["5", "3", "2", "10"],
    answer: "5",
    explanation: "The degree of a polynomial is the highest power of the variable present with a non-zero coefficient, which is 5 here.",
  },
];

const factorisationExtra: AuthoredQuestion[] = [
  {
    kind: "mcq",
    difficulty: 2,
    prompt: "Factorise x² + 10x + 25.",
    options: ["(x + 5)²", "(x + 25)²", "(x + 5)(x − 5)", "(x + 10)(x + 25)"],
    answer: "(x + 5)²",
    explanation: "This matches the identity a² + 2ab + b² = (a + b)² with a = x and b = 5, since 2(x)(5) = 10x.",
  },
  {
    kind: "short_answer",
    difficulty: 3,
    prompt: "Factorise 27x³ − 8 using a standard identity.",
    answer: "(3x − 2)(9x² + 6x + 4)",
    explanation: "Using a³ − b³ = (a − b)(a² + ab + b²) with a = 3x and b = 2 gives (3x − 2)(9x² + 6x + 4).",
  },
  {
    kind: "true_false",
    difficulty: 2,
    prompt: "The expression x² − 9 can be factorised as (x − 3)(x + 3).",
    options: ["True", "False"],
    answer: "True",
    explanation: "x² − 9 is a difference of squares, a² − b² = (a − b)(a + b), with a = x and b = 3.",
  },
  {
    kind: "assertion_reason",
    difficulty: 4,
    stimulus:
      "Assertion: x³ + 8 factorises as (x + 2)(x² − 2x + 4). Reason: a³ + b³ = (a + b)(a² − ab + b²) for all real a and b.",
    prompt: "Choose the correct option about the assertion and the reason.",
    options: [
      "Both are true and the reason correctly explains the assertion",
      "Both are true but the reason does not explain the assertion",
      "The assertion is true but the reason is false",
      "The assertion is false but the reason is true",
    ],
    answer: "Both are true and the reason correctly explains the assertion",
    explanation: "With a = x and b = 2, the identity a³ + b³ = (a + b)(a² − ab + b²) gives exactly (x + 2)(x² − 2x + 4), matching the assertion.",
  },
];

const linearSolutionsExtra: AuthoredQuestion[] = [
  {
    kind: "mcq",
    difficulty: 1,
    prompt: "Which of these is a linear equation in two variables?",
    options: ["3x + 4y = 12", "x² + y = 5", "xy = 6", "3x + 4y² = 12"],
    answer: "3x + 4y = 12",
    explanation: "A linear equation in two variables has both variables appearing only to the first power, as in 3x + 4y = 12.",
  },
  {
    kind: "short_answer",
    difficulty: 2,
    prompt: "A bag of rice costs ₹x and a bag of wheat costs ₹y. Three bags of rice and two bags of wheat cost ₹560. Write this as a linear equation.",
    answer: "3x + 2y = 560",
    explanation: "Three bags of rice cost 3x and two bags of wheat cost 2y; their total is ₹560, giving 3x + 2y = 560.",
  },
  {
    kind: "true_false",
    difficulty: 3,
    prompt: "The point (2, −1) is a solution of the equation 4x + 3y = 5.",
    options: ["True", "False"],
    answer: "True",
    explanation: "Substituting x = 2 and y = −1 gives 4(2) + 3(−1) = 8 − 3 = 5, which matches the right-hand side.",
  },
  {
    kind: "applied_mcq",
    difficulty: 4,
    prompt: "If the equation 2x + ky = 10 has (1, 2) as a solution, what is the value of k?",
    options: ["4", "2", "5", "8"],
    answer: "4",
    explanation: "Substituting x = 1 and y = 2 gives 2 + 2k = 10, so 2k = 8 and k = 4.",
  },
];

const graphExtra: AuthoredQuestion[] = [
  {
    kind: "mcq",
    difficulty: 2,
    prompt: "The graph of the equation x = −3 is a line that is:",
    options: [
      "parallel to the y-axis, 3 units to the left of it",
      "parallel to the x-axis, 3 units below it",
      "passing through the origin",
      "inclined at 45° to the x-axis",
    ],
    answer: "parallel to the y-axis, 3 units to the left of it",
    explanation: "Every point with x-coordinate −3 satisfies x = −3 regardless of y, giving a vertical line 3 units left of the y-axis.",
  },
  {
    kind: "short_answer",
    difficulty: 3,
    prompt: "Find the point where the line 2x − y = 6 cuts the y-axis.",
    answer: "(0, −6)",
    explanation: "On the y-axis, x = 0. Substituting gives −y = 6, so y = −6, meaning the line meets the y-axis at (0, −6).",
  },
  {
    kind: "true_false",
    difficulty: 2,
    prompt: "Every point lying on the graph of 5x + 2y = 10 is a solution of the equation.",
    options: ["True", "False"],
    answer: "True",
    explanation: "By definition, the graph of a linear equation is the set of all points (x, y) that satisfy that equation.",
  },
  {
    kind: "assertion_reason",
    difficulty: 5,
    stimulus:
      "Assertion: The lines y = 2x + 1 and y = 2x − 3 never meet. Reason: Two distinct lines with the same slope are parallel and do not intersect.",
    prompt: "Choose the correct option about the assertion and the reason.",
    options: [
      "Both are true and the reason correctly explains the assertion",
      "Both are true but the reason does not explain the assertion",
      "The assertion is true but the reason is false",
      "The assertion is false but the reason is true",
    ],
    answer: "Both are true and the reason correctly explains the assertion",
    explanation: "Both lines have slope 2 but different y-intercepts (1 and −3), so they are parallel and never intersect, exactly as the reason states.",
  },
];

export const EXT: UnitExtension = {
  unitId: "C9-MAT-U2",
  newTopics: [
    { chapter: 1, topic: remainderTheoremTopic },
    { chapter: 2, topic: simultaneousEquationsTopic },
  ],
  extraQuestions: {
    "C9-MAT-U2-CH1-T1-O1": degreeZeroExtra,
    "C9-MAT-U2-CH1-T2-O1": factorisationExtra,
    "C9-MAT-U2-CH2-T1-O1": linearSolutionsExtra,
    "C9-MAT-U2-CH2-T2-O1": graphExtra,
  },
};
