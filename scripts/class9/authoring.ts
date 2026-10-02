// Wave 1 authoring source for CBSE Class 9 Mathematics and Science.
//
// Original, source-grounded content. No copyrighted exercise text is copied;
// every item is written for EduOS and mapped to the NCERT/CBSE structure by
// citation only. Everything here is PREPARATION material: it is emitted as
// inactive, draft, unverified content.

export type AuthoredQuestion = {
  kind: "mcq" | "true_false" | "short_answer" | "assertion_reason" | "applied_mcq";
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
  stimulus?: string;
};

export type AuthoredOutcome = {
  title: string;
  category: "conceptual" | "procedural" | "application" | "analysis";
  bloom: "remember" | "understand" | "apply" | "analyse" | "evaluate" | "create";
  difficulty: 1 | 2 | 3 | 4 | 5;
  weight: number;
  types: string[];
  atoms: string[];
  prerequisites?: string[];
  questions: AuthoredQuestion[];
};

export type AuthoredTopic = { title: string; outcomes: AuthoredOutcome[] };
export type AuthoredChapter = { ncert: number; title: string; topics: AuthoredTopic[] };
export type AuthoredUnit = { title: string; marks: number; chapters: AuthoredChapter[] };

export type AuthoredSubject = {
  subjectCode: "MAT" | "SCI";
  subjectKey: "Mathematics" | "Science";
  catalogueCode: string;
  sourceId: string;
  ambiguities: string[];
  units: AuthoredUnit[];
};

const NCERT_MATH = "NCERT-C9-MAT-2026-27";
const NCERT_SCI = "NCERT-C9-SCI-2026-27";

export const MATHEMATICS: AuthoredSubject = {
  subjectCode: "MAT",
  subjectKey: "Mathematics",
  catalogueCode: "CBSE-2026-27-C9-MAT",
  sourceId: NCERT_MATH,
  ambiguities: [
    "Unit mark weights follow the CBSE Class 9 Mathematics syllabus split (Number Systems 10, Algebra 20, Coordinate Geometry 4, Geometry 27, Mensuration 13, Statistics 6 = 80). A subject expert must confirm the 2026-27 circular before any activation.",
    "Chapter list assumes the rationalised 12-chapter NCERT structure (Constructions, Areas of Parallelograms and Triangles, and Probability removed). Reviewer must confirm no reinstatement for 2026-27.",
  ],
  units: [
    {
      title: "Number Systems",
      marks: 10,
      chapters: [
        {
          ncert: 1,
          title: "Number Systems",
          topics: [
            {
              title: "Rational and irrational numbers",
              outcomes: [
                {
                  title: "Classify real numbers as rational or irrational and place them on the number line",
                  category: "conceptual",
                  bloom: "understand",
                  difficulty: 2,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Recognise a rational number as p/q with q ≠ 0 and integers p, q",
                    "Identify non-terminating non-recurring decimals as irrational",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Which of the following numbers is irrational?",
                      options: ["0.75", "√49", "√11", "22/7"],
                      answer: "√11",
                      explanation:
                        "11 is not a perfect square, so √11 has a non-terminating, non-recurring decimal expansion and cannot be written as p/q. 0.75 and 22/7 are ratios of integers, and √49 = 7.",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 3,
                      prompt:
                        "A student writes 0.323232... as a fraction. Which fraction is correct?",
                      options: ["32/99", "32/100", "323/999", "16/33"],
                      answer: "32/99",
                      explanation:
                        "Let x = 0.323232.... Then 100x = 32.323232..., so 99x = 32 and x = 32/99. Note 32/99 is already in lowest terms because 32 and 99 share no common factor.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Exponents, surds and rationalisation",
              outcomes: [
                {
                  title: "Apply the laws of exponents for real bases and rationalise simple denominators",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Simplify expressions using a^m × a^n = a^(m+n) and (a^m)^n = a^(mn)",
                    "Rationalise a denominator of the form 1/(a + √b)",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Simplify: 2^(1/3) × 2^(1/6).",
                      options: ["2^(1/2)", "2^(1/9)", "2^(1/18)", "4^(1/2)"],
                      answer: "2^(1/2)",
                      explanation:
                        "With the same base, exponents add: 1/3 + 1/6 = 1/2, so the product is 2^(1/2) = √2.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "Rationalise the denominator of 1/(3 + √2) and give the result in simplest form.",
                      answer: "(3 − √2)/7",
                      explanation:
                        "Multiply numerator and denominator by the conjugate (3 − √2): the denominator becomes 3² − (√2)² = 9 − 2 = 7, giving (3 − √2)/7.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Algebra",
      marks: 20,
      chapters: [
        {
          ncert: 2,
          title: "Polynomials",
          topics: [
            {
              title: "Polynomials, degree and zeroes",
              outcomes: [
                {
                  title: "Determine the degree of a polynomial and verify whether a value is a zero",
                  category: "conceptual",
                  bloom: "apply",
                  difficulty: 2,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "State the degree of a polynomial in one variable",
                    "Evaluate p(a) to test whether a is a zero of p(x)",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "What is the degree of the polynomial 5x³ − 4x² + 7x − 9?",
                      options: ["1", "2", "3", "4"],
                      answer: "3",
                      explanation:
                        "The degree is the highest power of the variable that appears with a non-zero coefficient, which is 3 in 5x³.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "If p(x) = x² − 5x + 6, find p(2) and state whether 2 is a zero of p(x).",
                      answer: "p(2) = 0, so 2 is a zero",
                      explanation:
                        "p(2) = 4 − 10 + 6 = 0. Because the value of the polynomial at x = 2 is zero, x = 2 is a zero of p(x).",
                    },
                  ],
                },
              ],
            },
            {
              title: "Algebraic identities and factorisation",
              outcomes: [
                {
                  title: "Factorise quadratic and cubic expressions using standard identities and the factor theorem",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Use (a + b)² , (a − b)² and a² − b² to factorise",
                    "Apply the factor theorem to factorise a cubic polynomial",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Factorise x² − 16.",
                      options: ["(x − 4)(x + 4)", "(x − 8)(x + 2)", "(x − 16)(x + 1)", "(x − 4)²"],
                      answer: "(x − 4)(x + 4)",
                      explanation:
                        "This is a difference of squares: a² − b² = (a − b)(a + b) with a = x and b = 4.",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 4,
                      prompt: "Given that (x − 1) is a factor of x³ − 6x² + 11x − 6, which is the complete factorisation?",
                      options: [
                        "(x − 1)(x − 2)(x − 3)",
                        "(x − 1)(x + 2)(x + 3)",
                        "(x − 1)(x − 6)(x + 1)",
                        "(x − 1)(x² + 5x + 6)",
                      ],
                      answer: "(x − 1)(x − 2)(x − 3)",
                      explanation:
                        "Dividing by (x − 1) gives x² − 5x + 6, which factorises as (x − 2)(x − 3). Checking: 1 + 2 + 3 = 6 matches the coefficient of x², and 1 × 2 × 3 = 6 matches the constant.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 4,
          title: "Linear Equations in Two Variables",
          topics: [
            {
              title: "Solutions of a linear equation in two variables",
              outcomes: [
                {
                  title: "Express a linear equation in the form ax + by + c = 0 and find its solutions",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 2,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Write a statement as a linear equation in two variables",
                    "Verify that an ordered pair satisfies a linear equation",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Which ordered pair is a solution of 2x + 3y = 12?",
                      options: ["(3, 2)", "(2, 3)", "(1, 4)", "(4, 2)"],
                      answer: "(3, 2)",
                      explanation:
                        "Substituting x = 3 and y = 2 gives 2(3) + 3(2) = 6 + 6 = 12, which satisfies the equation. The other pairs give 13, 14 and 14 respectively.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt:
                        "The cost of 1 notebook is ₹x and 1 pen is ₹y. Two notebooks and three pens together cost ₹110. Write this as a linear equation in two variables.",
                      answer: "2x + 3y = 110",
                      explanation:
                        "Two notebooks cost 2x and three pens cost 3y. Their total is ₹110, giving the linear equation 2x + 3y = 110.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Graph of a linear equation",
              outcomes: [
                {
                  title: "Draw and interpret the graph of a linear equation in two variables",
                  category: "application",
                  bloom: "analyse",
                  difficulty: 3,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Plot at least two solutions and join them to graph the equation",
                    "Interpret intercepts of the line with the axes",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt: "The graph of the equation y = 4 is a line that is:",
                      options: [
                        "parallel to the x-axis, 4 units above it",
                        "parallel to the y-axis, 4 units to the right",
                        "passing through the origin",
                        "inclined at 45° to the x-axis",
                      ],
                      answer: "parallel to the x-axis, 4 units above it",
                      explanation:
                        "Every point with y-coordinate 4 satisfies y = 4 regardless of x, so the solution set is a horizontal line 4 units above the x-axis.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "Find the point where the line x + y = 7 cuts the x-axis.",
                      answer: "(7, 0)",
                      explanation:
                        "On the x-axis, y = 0. Substituting gives x = 7, so the line meets the x-axis at (7, 0).",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Coordinate Geometry",
      marks: 4,
      chapters: [
        {
          ncert: 3,
          title: "Coordinate Geometry",
          topics: [
            {
              title: "The Cartesian plane and plotting points",
              outcomes: [
                {
                  title: "Plot points in the Cartesian plane and identify quadrants and axes",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 2,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Name the quadrant of a point from the signs of its coordinates",
                    "Identify points lying on the x-axis or y-axis",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 1,
                      prompt: "In which quadrant does the point (−5, 3) lie?",
                      options: ["First", "Second", "Third", "Fourth"],
                      answer: "Second",
                      explanation:
                        "A negative x-coordinate with a positive y-coordinate places the point to the left of the y-axis and above the x-axis, which is the second quadrant.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 2,
                      prompt: "Where does every point of the form (0, k), with k ≠ 0, lie?",
                      answer: "On the y-axis",
                      explanation:
                        "An x-coordinate of 0 means the point is neither left nor right of the origin, so it lies on the y-axis at a distance |k| from the origin.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Geometry",
      marks: 27,
      chapters: [
        {
          ncert: 5,
          title: "Introduction to Euclid's Geometry",
          topics: [
            {
              title: "Euclid's axioms and postulates",
              outcomes: [
                {
                  title: "Distinguish Euclid's axioms from his postulates and use them in simple reasoning",
                  category: "conceptual",
                  bloom: "understand",
                  difficulty: 2,
                  weight: 3,
                  types: ["mcq", "assertion_reason"],
                  atoms: [
                    "State Euclid's five postulates",
                    "Use the axiom 'things equal to the same thing are equal to one another'",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Which statement is one of Euclid's postulates?",
                      options: [
                        "A straight line may be drawn from any one point to any other point",
                        "The whole is greater than the part",
                        "Things which are equal to the same thing are equal to one another",
                        "If equals are added to equals, the wholes are equal",
                      ],
                      answer: "A straight line may be drawn from any one point to any other point",
                      explanation:
                        "Postulates are assumptions specific to geometry; the other three statements are Euclid's common notions (axioms), which apply to magnitudes in general.",
                    },
                    {
                      kind: "assertion_reason",
                      difficulty: 3,
                      stimulus:
                        "Assertion: If A, B and C are three points on a line and AB = BC, then B is the midpoint of AC. Reason: Things which are halves of the same thing are equal to one another.",
                      prompt: "Choose the correct option about the assertion and the reason.",
                      options: [
                        "Both are true and the reason correctly explains the assertion",
                        "Both are true but the reason does not explain the assertion",
                        "The assertion is true but the reason is false",
                        "The assertion is false but the reason is true",
                      ],
                      answer: "Both are true but the reason does not explain the assertion",
                      explanation:
                        "B is the midpoint because AB = BC and B lies between A and C, which follows from the definition of a midpoint rather than from the halves axiom. Both statements are true, but the reason does not justify the assertion.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 6,
          title: "Lines and Angles",
          topics: [
            {
              title: "Angle pairs and parallel lines",
              outcomes: [
                {
                  title: "Use linear pair, vertically opposite and transversal angle relations to find unknown angles",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 6,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Apply the linear pair axiom (angles on a straight line sum to 180°)",
                    "Use corresponding, alternate and co-interior angles for parallel lines",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt:
                        "Two angles form a linear pair. If one angle measures 65°, what is the other angle?",
                      options: ["25°", "115°", "125°", "295°"],
                      answer: "115°",
                      explanation:
                        "Angles in a linear pair are supplementary, so the second angle is 180° − 65° = 115°.",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 3,
                      prompt:
                        "A transversal cuts two parallel lines. One interior angle on the same side of the transversal is 70°. What is the other co-interior angle?",
                      options: ["70°", "110°", "20°", "140°"],
                      answer: "110°",
                      explanation:
                        "Co-interior (allied) angles between parallel lines are supplementary, so the other angle is 180° − 70° = 110°.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 7,
          title: "Triangles",
          topics: [
            {
              title: "Congruence criteria for triangles",
              outcomes: [
                {
                  title: "Select and justify the correct congruence criterion (SSS, SAS, ASA, AAS, RHS)",
                  category: "analysis",
                  bloom: "analyse",
                  difficulty: 3,
                  weight: 6,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Match given data to the appropriate congruence rule",
                    "Recognise that SSA is not a valid congruence criterion",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt:
                        "In triangles ABC and PQR, AB = PQ, ∠A = ∠P and AC = PR. Which criterion proves the triangles congruent?",
                      options: ["SSS", "SAS", "ASA", "RHS"],
                      answer: "SAS",
                      explanation:
                        "Two pairs of sides are equal and the angles between those sides are equal, which is exactly the Side-Angle-Side criterion.",
                    },
                    {
                      kind: "true_false",
                      difficulty: 3,
                      prompt:
                        "State whether the following is true or false: two triangles with two equal sides and one equal non-included angle are always congruent.",
                      options: ["True", "False"],
                      answer: "False",
                      explanation:
                        "SSA is not a congruence criterion; two different triangles can be built from the same two sides and a non-included angle, so congruence is not guaranteed.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Properties and inequalities in triangles",
              outcomes: [
                {
                  title: "Apply angle-sum, isosceles-triangle and triangle-inequality properties",
                  category: "application",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Use the angle sum property of a triangle (180°)",
                    "Compare sides and opposite angles using the triangle inequality",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Two angles of a triangle measure 48° and 62°. What is the third angle?",
                      options: ["60°", "70°", "80°", "110°"],
                      answer: "70°",
                      explanation:
                        "The angles of a triangle sum to 180°, so the third angle is 180° − (48° + 62°) = 70°.",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 3,
                      prompt: "Which set of lengths (in cm) can form a triangle?",
                      options: ["3, 4, 8", "2, 2, 5", "6, 7, 12", "1, 2, 3"],
                      answer: "6, 7, 12",
                      explanation:
                        "The sum of any two sides must exceed the third. For 6, 7, 12: 6 + 7 = 13 > 12, and the other checks pass. Each other set fails the inequality (for 1, 2, 3 the sum equals the third side, giving a straight line, not a triangle).",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 8,
          title: "Quadrilaterals",
          topics: [
            {
              title: "Properties of parallelograms",
              outcomes: [
                {
                  title: "Use and justify the defining properties of a parallelogram and its special cases",
                  category: "conceptual",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Opposite sides and opposite angles of a parallelogram are equal",
                    "Diagonals of a parallelogram bisect each other",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "In a parallelogram, one angle measures 105°. What is the adjacent angle?",
                      options: ["75°", "105°", "85°", "95°"],
                      answer: "75°",
                      explanation:
                        "Adjacent angles of a parallelogram are supplementary because the opposite sides are parallel, so the angle is 180° − 105° = 75°.",
                    },
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt: "Which property holds for a rhombus but not for every parallelogram?",
                      options: [
                        "Opposite angles are equal",
                        "Diagonals bisect each other",
                        "Diagonals intersect at right angles",
                        "Opposite sides are parallel",
                      ],
                      answer: "Diagonals intersect at right angles",
                      explanation:
                        "All parallelograms share the other three properties. Perpendicular diagonals occur only when all four sides are equal, that is, in a rhombus (and hence a square).",
                    },
                  ],
                },
              ],
            },
            {
              title: "The midpoint theorem",
              outcomes: [
                {
                  title: "Apply the midpoint theorem and its converse in a triangle or quadrilateral",
                  category: "application",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 3,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "The segment joining midpoints of two sides is parallel to and half the third side",
                    "Use the converse to locate a midpoint",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt:
                        "In triangle ABC, D and E are the midpoints of AB and AC. If BC = 14 cm, find DE.",
                      answer: "7 cm",
                      explanation:
                        "By the midpoint theorem, DE is parallel to BC and DE = ½ × BC = ½ × 14 = 7 cm.",
                    },
                    {
                      kind: "mcq",
                      difficulty: 4,
                      prompt:
                        "Joining the midpoints of the sides of any quadrilateral, in order, always produces which figure?",
                      options: ["A rectangle", "A rhombus", "A parallelogram", "A square"],
                      answer: "A parallelogram",
                      explanation:
                        "Each side of the new figure is parallel to a diagonal of the original quadrilateral and half its length, so both pairs of opposite sides are parallel and equal — a parallelogram (Varignon's result).",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 9,
          title: "Circles",
          topics: [
            {
              title: "Chords, arcs and angles subtended",
              outcomes: [
                {
                  title: "Relate chords, their distances from the centre, and the angles they subtend",
                  category: "conceptual",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 3,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Equal chords are equidistant from the centre",
                    "The angle at the centre is twice the angle at any point on the remaining arc",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt:
                        "An arc of a circle subtends an angle of 80° at the centre. What angle does it subtend at a point on the major arc?",
                      options: ["40°", "80°", "100°", "160°"],
                      answer: "40°",
                      explanation:
                        "The angle at the centre is twice the angle subtended at any point on the remaining part of the circle, so the required angle is 80° ÷ 2 = 40°.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt:
                        "A chord of length 16 cm lies in a circle of radius 10 cm. How far is the chord from the centre?",
                      answer: "6 cm",
                      explanation:
                        "The perpendicular from the centre bisects the chord, forming a right triangle with legs 8 cm and d, and hypotenuse 10 cm. So d = √(10² − 8²) = √36 = 6 cm.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Cyclic quadrilaterals",
              outcomes: [
                {
                  title: "Use the cyclic-quadrilateral angle property and its converse",
                  category: "application",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 3,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Opposite angles of a cyclic quadrilateral are supplementary",
                    "Angles in the same segment are equal",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt:
                        "In a cyclic quadrilateral ABCD, ∠A = 95°. What is ∠C?",
                      options: ["85°", "95°", "105°", "185°"],
                      answer: "85°",
                      explanation:
                        "Opposite angles of a cyclic quadrilateral are supplementary, so ∠C = 180° − 95° = 85°.",
                    },
                    {
                      kind: "true_false",
                      difficulty: 3,
                      prompt:
                        "State whether the following is true or false: every parallelogram that can be inscribed in a circle must be a rectangle.",
                      options: ["True", "False"],
                      answer: "True",
                      explanation:
                        "Opposite angles of a parallelogram are equal, and in a cyclic figure they are supplementary. Equal and supplementary angles are each 90°, so the parallelogram is a rectangle.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Mensuration",
      marks: 13,
      chapters: [
        {
          ncert: 10,
          title: "Heron's Formula",
          topics: [
            {
              title: "Area of triangles using Heron's formula",
              outcomes: [
                {
                  title: "Compute areas of triangles and composite figures using Heron's formula",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Compute the semi-perimeter s = (a + b + c)/2",
                    "Apply Area = √(s(s−a)(s−b)(s−c))",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "Find the area of a triangle whose sides are 3 cm, 4 cm and 5 cm using Heron's formula.",
                      answer: "6 cm²",
                      explanation:
                        "s = (3 + 4 + 5)/2 = 6. Area = √(6 × 3 × 2 × 1) = √36 = 6 cm². (The triangle is right-angled, and ½ × 3 × 4 = 6 confirms the result.)",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 4,
                      prompt:
                        "A triangular park has sides 40 m, 24 m and 32 m. What is its area?",
                      options: ["384 m²", "480 m²", "320 m²", "768 m²"],
                      answer: "384 m²",
                      explanation:
                        "s = (40 + 24 + 32)/2 = 48. Area = √(48 × 8 × 24 × 16) = √147456 = 384 m².",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 11,
          title: "Surface Areas and Volumes",
          topics: [
            {
              title: "Surface areas of solids",
              outcomes: [
                {
                  title: "Calculate curved and total surface areas of cones, cylinders and spheres",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Apply CSA of a cylinder = 2πrh and of a cone = πrl",
                    "Apply surface area of a sphere = 4πr²",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt:
                        "Find the curved surface area of a cylinder of radius 7 cm and height 10 cm. Take π = 22/7.",
                      answer: "440 cm²",
                      explanation:
                        "CSA = 2πrh = 2 × (22/7) × 7 × 10 = 440 cm².",
                    },
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt: "If the radius of a sphere is doubled, its surface area becomes:",
                      options: ["twice as large", "three times as large", "four times as large", "unchanged"],
                      answer: "four times as large",
                      explanation:
                        "Surface area = 4πr² varies with the square of the radius, so doubling r multiplies the area by 2² = 4.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Volumes of solids",
              outcomes: [
                {
                  title: "Calculate volumes of cylinders, cones and spheres and solve capacity problems",
                  category: "application",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Apply volume of a cylinder = πr²h and of a cone = ⅓πr²h",
                    "Convert between cm³ and litres in capacity problems",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt:
                        "A cone and a cylinder have the same radius and the same height. The volume of the cone is what fraction of the cylinder's volume?",
                      options: ["1/2", "1/3", "2/3", "3/4"],
                      answer: "1/3",
                      explanation:
                        "Volume of a cone = ⅓πr²h while the cylinder is πr²h, so the cone holds one third as much.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 4,
                      prompt:
                        "A cylindrical water tank has radius 70 cm and height 100 cm. How many litres can it hold? Take π = 22/7.",
                      answer: "1540 litres",
                      explanation:
                        "Volume = πr²h = (22/7) × 70 × 70 × 100 = 1 540 000 cm³. Since 1000 cm³ = 1 litre, the capacity is 1540 litres.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Statistics",
      marks: 6,
      chapters: [
        {
          ncert: 12,
          title: "Statistics",
          topics: [
            {
              title: "Organising and representing data",
              outcomes: [
                {
                  title: "Organise raw data into frequency tables and read bar graphs and histograms",
                  category: "procedural",
                  bloom: "understand",
                  difficulty: 2,
                  weight: 3,
                  types: ["mcq", "data_interpretation"],
                  atoms: [
                    "Build a grouped frequency distribution with equal class intervals",
                    "Read values from a histogram or bar graph",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt:
                        "Marks range from 12 to 96 and are grouped into classes of width 10 starting at 10. How many classes are needed?",
                      options: ["8", "9", "10", "11"],
                      answer: "9",
                      explanation:
                        "The classes run 10–20, 20–30, …, 90–100. Counting them gives 9 classes, which covers the lowest value 12 and the highest value 96.",
                    },
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "In a grouped frequency distribution, the class mark of the class 30–40 is:",
                      options: ["30", "35", "40", "10"],
                      answer: "35",
                      explanation:
                        "The class mark is the average of the lower and upper limits: (30 + 40)/2 = 35.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Measures of central tendency",
              outcomes: [
                {
                  title: "Compute and interpret mean, median and mode of ungrouped data",
                  category: "application",
                  bloom: "analyse",
                  difficulty: 3,
                  weight: 3,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Compute the mean as the sum of observations divided by their number",
                    "Find the median of an even and an odd number of observations",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 2,
                      prompt: "Find the median of the observations 7, 3, 9, 5, 11.",
                      answer: "7",
                      explanation:
                        "Arranged in order the data is 3, 5, 7, 9, 11. With five observations the median is the third value, which is 7.",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 4,
                      prompt:
                        "The mean of five numbers is 18. If one number is removed, the mean of the remaining four becomes 16. Which number was removed?",
                      options: ["18", "22", "26", "30"],
                      answer: "26",
                      explanation:
                        "The original total is 5 × 18 = 90 and the new total is 4 × 16 = 64. The removed number is 90 − 64 = 26.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const SCIENCE: AuthoredSubject = {
  subjectCode: "SCI",
  subjectKey: "Science",
  catalogueCode: "CBSE-2026-27-C9-SCI",
  sourceId: NCERT_SCI,
  ambiguities: [
    "Unit mark weights follow the CBSE Class 9 Science syllabus split (Matter 25, Organization in the Living World 22, Motion/Force/Work 27, Food Production 6 = 80). Reviewer must confirm the 2026-27 circular.",
    "Chapter list assumes the rationalised 12-chapter NCERT structure (Diversity in Living Organisms, Why Do We Fall Ill, and Natural Resources removed). Reviewer must confirm no reinstatement for 2026-27.",
    "Practical/internal assessment components are out of scope for this preparation pack.",
  ],
  units: [
    {
      title: "Matter — Its Nature and Behaviour",
      marks: 25,
      chapters: [
        {
          ncert: 1,
          title: "Matter in Our Surroundings",
          topics: [
            {
              title: "States of matter and change of state",
              outcomes: [
                {
                  title: "Explain the particle nature of matter and interpret changes of state",
                  category: "conceptual",
                  bloom: "understand",
                  difficulty: 2,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Compare intermolecular force and spacing across solid, liquid and gas",
                    "Use melting point and boiling point to describe a change of state",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "During the melting of ice at 0 °C, the temperature of the mixture stays constant because the supplied heat:",
                      options: [
                        "is lost to the surroundings",
                        "is used to overcome the forces between particles",
                        "increases the kinetic energy of the particles",
                        "is converted into pressure",
                      ],
                      answer: "is used to overcome the forces between particles",
                      explanation:
                        "The energy supplied during melting is the latent heat of fusion; it breaks the attractions holding the particles in a fixed lattice rather than raising their average kinetic energy, so the temperature does not change.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "Why does a gas exert pressure on the walls of its container?",
                      answer:
                        "Because its particles move randomly at high speed and collide with the walls, and the force of these collisions per unit area is the pressure.",
                      explanation:
                        "Gas particles have large spacing and negligible attraction, so they move freely in all directions. Each collision with the wall exerts a small force; the total force per unit area is the observed pressure.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Evaporation and cooling",
              outcomes: [
                {
                  title: "Relate evaporation rate to surface area, temperature, humidity and wind speed",
                  category: "application",
                  bloom: "analyse",
                  difficulty: 2,
                  weight: 3,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "List the factors that affect the rate of evaporation",
                    "Explain cooling produced by evaporation",
                  ],
                  questions: [
                    {
                      kind: "applied_mcq",
                      difficulty: 3,
                      prompt: "Wet clothes dry fastest on a day that is:",
                      options: ["hot and humid", "hot, dry and windy", "cold and windy", "cold and humid"],
                      answer: "hot, dry and windy",
                      explanation:
                        "High temperature gives particles more energy to escape, low humidity leaves room for more vapour in the air, and wind carries vapour away — all three raise the rate of evaporation.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 2,
                      prompt: "Why does water kept in an earthen pot stay cool in summer?",
                      answer:
                        "Water seeps through the pores and evaporates, taking latent heat from the remaining water and cooling it.",
                      explanation:
                        "Evaporation is a cooling process: the escaping particles carry away energy drawn from the surface they leave, so the water inside the porous pot loses heat and its temperature falls.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 2,
          title: "Is Matter Around Us Pure",
          topics: [
            {
              title: "Mixtures, solutions and concentration",
              outcomes: [
                {
                  title: "Classify matter as element, compound or mixture and compute solution concentration",
                  category: "conceptual",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Distinguish homogeneous and heterogeneous mixtures",
                    "Compute mass-by-mass percentage concentration of a solution",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt:
                        "A solution contains 20 g of salt dissolved in 180 g of water. Calculate the mass percentage of the solute.",
                      answer: "10%",
                      explanation:
                        "Mass of solution = 20 + 180 = 200 g. Mass percentage = (20/200) × 100 = 10%.",
                    },
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Which of the following is a compound?",
                      options: ["Air", "Brass", "Carbon dioxide", "Soil"],
                      answer: "Carbon dioxide",
                      explanation:
                        "Carbon dioxide has elements combined chemically in a fixed ratio with new properties. Air and soil are heterogeneous or homogeneous mixtures, and brass is an alloy, which is also a mixture.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Separation of mixtures",
              outcomes: [
                {
                  title: "Choose an appropriate separation technique for a given mixture and justify it",
                  category: "application",
                  bloom: "analyse",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Match technique to property difference (density, solubility, boiling point)",
                    "Describe centrifugation, chromatography and fractional distillation",
                  ],
                  questions: [
                    {
                      kind: "applied_mcq",
                      difficulty: 3,
                      prompt:
                        "Which technique best separates two miscible liquids whose boiling points differ by 15 K?",
                      options: [
                        "Simple distillation",
                        "Fractional distillation",
                        "Filtration",
                        "Separating funnel",
                      ],
                      answer: "Fractional distillation",
                      explanation:
                        "Simple distillation works when boiling points differ by more than about 25 K. For a smaller difference the vapour must be repeatedly condensed and vaporised in a fractionating column, which is fractional distillation.",
                    },
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Cream is separated from milk mainly by:",
                      options: ["Filtration", "Centrifugation", "Sublimation", "Chromatography"],
                      answer: "Centrifugation",
                      explanation:
                        "Rapid spinning throws the denser liquid outward while the lighter cream collects near the centre, separating components that are too finely suspended for filtration.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 3,
          title: "Atoms and Molecules",
          topics: [
            {
              title: "Laws of chemical combination and the mole concept",
              outcomes: [
                {
                  title: "Apply the law of conservation of mass and convert between mass, moles and particles",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "State and use the law of conservation of mass",
                    "Use n = m/M and Avogadro's number 6.022 × 10²³",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "How many moles are present in 36 g of water (molar mass 18 g/mol)?",
                      answer: "2 moles",
                      explanation:
                        "Number of moles = mass ÷ molar mass = 36 ÷ 18 = 2 mol, which corresponds to 2 × 6.022 × 10²³ water molecules.",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 3,
                      prompt:
                        "In a sealed flask, 5.0 g of a metal reacts completely with 3.2 g of oxygen. What mass of product forms?",
                      options: ["1.8 g", "5.0 g", "8.2 g", "3.2 g"],
                      answer: "8.2 g",
                      explanation:
                        "Mass is conserved in a closed system, so the product mass equals the total reactant mass: 5.0 + 3.2 = 8.2 g.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Chemical formulae and molecular masses",
              outcomes: [
                {
                  title: "Write chemical formulae from valencies and compute formula unit masses",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 3,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Use the criss-cross method with valencies to write formulae",
                    "Add atomic masses to obtain molecular or formula unit mass",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "What is the chemical formula of aluminium oxide?",
                      options: ["AlO", "Al₂O₃", "Al₃O₂", "AlO₂"],
                      answer: "Al₂O₃",
                      explanation:
                        "Aluminium has valency 3 and oxygen valency 2. Exchanging the valencies gives Al₂O₃, in which the total positive and negative charges balance.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt:
                        "Calculate the molecular mass of CO₂ (atomic masses: C = 12 u, O = 16 u).",
                      answer: "44 u",
                      explanation:
                        "One carbon atom contributes 12 u and two oxygen atoms contribute 2 × 16 = 32 u, giving 12 + 32 = 44 u.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 4,
          title: "Structure of the Atom",
          topics: [
            {
              title: "Atomic models and subatomic particles",
              outcomes: [
                {
                  title: "Compare atomic models and describe the distribution of subatomic particles",
                  category: "conceptual",
                  bloom: "understand",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "assertion_reason"],
                  atoms: [
                    "State the conclusions of Rutherford's α-particle scattering experiment",
                    "Give the charge, mass and location of electron, proton and neutron",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt:
                        "In the α-particle scattering experiment, the fact that a very small fraction of particles bounced back showed that:",
                      options: [
                        "the atom is mostly empty space",
                        "the positive charge is concentrated in a tiny nucleus",
                        "electrons revolve in fixed shells",
                        "neutrons are present in the nucleus",
                      ],
                      answer: "the positive charge is concentrated in a tiny nucleus",
                      explanation:
                        "Only a dense, highly charged and very small region could repel a fast α-particle straight back. Straight-through passage of most particles is what indicated the empty space.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 2,
                      prompt: "An atom has 11 protons, 12 neutrons and 11 electrons. State its mass number and charge.",
                      answer: "Mass number 23; the atom is neutral (charge 0)",
                      explanation:
                        "Mass number = protons + neutrons = 11 + 12 = 23. Equal numbers of protons and electrons make the net charge zero.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Electronic configuration, valency and isotopes",
              outcomes: [
                {
                  title: "Write electronic configurations and use them to deduce valency; distinguish isotopes and isobars",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 3,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Fill shells using the 2n² rule",
                    "Distinguish isotopes (same Z) from isobars (same A)",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt: "The valency of an element with atomic number 17 is:",
                      options: ["1", "2", "3", "7"],
                      answer: "1",
                      explanation:
                        "The configuration is 2, 8, 7. The atom needs one more electron to complete its outermost shell, so its valency is 1.",
                    },
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Two atoms with the same atomic number but different mass numbers are called:",
                      options: ["Isobars", "Isotopes", "Ions", "Isomers"],
                      answer: "Isotopes",
                      explanation:
                        "Isotopes share the proton count (atomic number) but differ in neutron count, so their mass numbers differ. Isobars are the reverse case.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Organization in the Living World",
      marks: 22,
      chapters: [
        {
          ncert: 5,
          title: "The Fundamental Unit of Life",
          topics: [
            {
              title: "Cell structure and organelles",
              outcomes: [
                {
                  title: "Relate the structure of cell organelles to their functions and compare plant and animal cells",
                  category: "conceptual",
                  bloom: "understand",
                  difficulty: 2,
                  weight: 6,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Match organelle to function (mitochondria, ribosome, lysosome, plastid)",
                    "List structures present in plant cells but absent in animal cells",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Lysosomes are called the 'suicide bags' of the cell because they:",
                      options: [
                        "store the cell's genetic material",
                        "contain digestive enzymes that can break down the cell's own material",
                        "make proteins for export",
                        "release energy as ATP",
                      ],
                      answer: "contain digestive enzymes that can break down the cell's own material",
                      explanation:
                        "Lysosomes hold powerful hydrolytic enzymes. If the cell is damaged, these enzymes are released and digest the cell's own contents.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 2,
                      prompt: "Name two structures present in a plant cell but absent in an animal cell.",
                      answer: "Cell wall and plastids (chloroplasts); a large central vacuole is also typical",
                      explanation:
                        "The rigid cellulose cell wall gives shape and support, and plastids such as chloroplasts carry out photosynthesis. Animal cells have neither.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Diffusion, osmosis and the plasma membrane",
              outcomes: [
                {
                  title: "Predict the behaviour of cells in hypotonic, isotonic and hypertonic solutions",
                  category: "application",
                  bloom: "analyse",
                  difficulty: 3,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Define osmosis as movement of water across a semi-permeable membrane",
                    "Explain plasmolysis in a plant cell",
                  ],
                  questions: [
                    {
                      kind: "applied_mcq",
                      difficulty: 3,
                      prompt: "A plant cell placed in a concentrated sugar solution will:",
                      options: [
                        "swell and burst",
                        "lose water and undergo plasmolysis",
                        "stay exactly the same",
                        "gain water and become turgid",
                      ],
                      answer: "lose water and undergo plasmolysis",
                      explanation:
                        "The surrounding solution is hypertonic, so water leaves the cell by osmosis. The protoplasm shrinks away from the cell wall — plasmolysis. The wall prevents bursting in the opposite case.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "Why is the plasma membrane called selectively permeable?",
                      answer:
                        "Because it allows only certain substances to pass through it while restricting others.",
                      explanation:
                        "The lipid–protein membrane lets small or specific molecules such as water, oxygen and carbon dioxide move across, but controls or blocks the passage of many other solutes.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 6,
          title: "Tissues",
          topics: [
            {
              title: "Plant tissues",
              outcomes: [
                {
                  title: "Distinguish meristematic and permanent plant tissues and their functions",
                  category: "conceptual",
                  bloom: "understand",
                  difficulty: 2,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Compare apical, lateral and intercalary meristems",
                    "Relate xylem and phloem structure to transport function",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Which tissue transports water and dissolved minerals from the root to the leaves?",
                      options: ["Phloem", "Xylem", "Collenchyma", "Parenchyma"],
                      answer: "Xylem",
                      explanation:
                        "Xylem consists of tracheids and vessels with thick lignified walls that form continuous tubes conducting water upward. Phloem transports food.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "Why does the growth in the length of a stem occur mainly at its tip?",
                      answer: "Because apical meristem, which divides actively, is located at the tip.",
                      explanation:
                        "Meristematic tissue has thin-walled cells with dense cytoplasm that divide continuously. Apical meristem at the shoot and root tips increases length.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Animal tissues",
              outcomes: [
                {
                  title: "Classify animal tissues and relate each type to its location and role",
                  category: "conceptual",
                  bloom: "understand",
                  difficulty: 3,
                  weight: 6,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Identify epithelial, connective, muscular and nervous tissue",
                    "Distinguish striated, unstriated and cardiac muscle",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt: "Which muscle tissue is involuntary and shows striations?",
                      options: ["Skeletal muscle", "Smooth muscle", "Cardiac muscle", "Tendon"],
                      answer: "Cardiac muscle",
                      explanation:
                        "Cardiac muscle in the heart is striated like skeletal muscle but works without conscious control, so it is involuntary. Smooth muscle is involuntary but not striated.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 2,
                      prompt: "Name the connective tissue that transports gases and nutrients around the body.",
                      answer: "Blood",
                      explanation:
                        "Blood is a fluid connective tissue whose plasma matrix carries cells, dissolved gases, nutrients and wastes throughout the body.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Motion, Force and Work",
      marks: 27,
      chapters: [
        {
          ncert: 7,
          title: "Motion",
          topics: [
            {
              title: "Describing motion and equations of motion",
              outcomes: [
                {
                  title: "Distinguish distance from displacement and apply the equations of uniformly accelerated motion",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Differentiate scalar distance from vector displacement",
                    "Apply v = u + at, s = ut + ½at² and v² = u² + 2as",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt:
                        "A car starting from rest accelerates uniformly at 2 m/s² for 6 s. Find its final speed and the distance covered.",
                      answer: "12 m/s and 36 m",
                      explanation:
                        "v = u + at = 0 + 2 × 6 = 12 m/s. s = ut + ½at² = 0 + ½ × 2 × 36 = 36 m.",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 3,
                      prompt:
                        "An athlete runs once around a circular track of circumference 400 m and returns to the start. Distance and displacement are:",
                      options: ["400 m and 400 m", "400 m and 0 m", "0 m and 400 m", "200 m and 400 m"],
                      answer: "400 m and 0 m",
                      explanation:
                        "Distance is the total path length, 400 m. Displacement is the straight-line change in position; since the athlete finishes where they started, it is zero.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Graphical representation and uniform circular motion",
              outcomes: [
                {
                  title: "Interpret distance–time and velocity–time graphs and describe uniform circular motion",
                  category: "analysis",
                  bloom: "analyse",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "data_interpretation"],
                  atoms: [
                    "Read speed as the slope of a distance–time graph",
                    "Obtain displacement as the area under a velocity–time graph",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt: "A horizontal straight line on a velocity–time graph represents motion with:",
                      options: [
                        "zero velocity",
                        "constant velocity and zero acceleration",
                        "uniform acceleration",
                        "increasing acceleration",
                      ],
                      answer: "constant velocity and zero acceleration",
                      explanation:
                        "The height of the line gives the velocity, which is unchanging, and the slope — which is the acceleration — is zero.",
                    },
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt: "Uniform circular motion is described as accelerated motion because:",
                      options: [
                        "the speed keeps increasing",
                        "the direction of velocity changes continuously",
                        "the distance covered increases",
                        "the radius changes",
                      ],
                      answer: "the direction of velocity changes continuously",
                      explanation:
                        "Velocity is a vector. Even at constant speed, a continuously changing direction means the velocity changes, so the motion is accelerated.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 8,
          title: "Force and Laws of Motion",
          topics: [
            {
              title: "Newton's laws of motion",
              outcomes: [
                {
                  title: "State and apply Newton's three laws to everyday situations",
                  category: "application",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Explain inertia and relate it to mass",
                    "Apply F = ma to compute force, mass or acceleration",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 2,
                      prompt: "A force of 20 N acts on a body of mass 4 kg. Calculate its acceleration.",
                      answer: "5 m/s²",
                      explanation:
                        "From Newton's second law, a = F/m = 20 ÷ 4 = 5 m/s².",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 3,
                      prompt:
                        "A passenger standing in a bus falls backward when the bus starts suddenly. This is explained by:",
                      options: [
                        "inertia of rest",
                        "inertia of motion",
                        "conservation of momentum",
                        "the third law of motion",
                      ],
                      answer: "inertia of rest",
                      explanation:
                        "The lower body moves with the bus while the upper body tends to remain at rest because of inertia of rest, so the passenger falls backward.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Momentum and its conservation",
              outcomes: [
                {
                  title: "Compute momentum and apply conservation of momentum to collisions",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 4,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Compute p = mv with correct SI units",
                    "Apply conservation of momentum to a two-body interaction",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "Calculate the momentum of a 1500 kg car moving at 20 m/s.",
                      answer: "30 000 kg·m/s",
                      explanation:
                        "Momentum p = mv = 1500 × 20 = 30 000 kg·m/s in the direction of motion.",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 4,
                      prompt:
                        "A 2 kg trolley moving at 3 m/s collides with a stationary 4 kg trolley and they move off together. Their common speed is:",
                      options: ["0.5 m/s", "1 m/s", "1.5 m/s", "3 m/s"],
                      answer: "1 m/s",
                      explanation:
                        "Total momentum before = 2 × 3 = 6 kg·m/s. After the collision the combined mass is 6 kg, so v = 6 ÷ 6 = 1 m/s.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 9,
          title: "Gravitation",
          topics: [
            {
              title: "Universal gravitation, free fall and weight",
              outcomes: [
                {
                  title: "Apply the universal law of gravitation and distinguish mass from weight",
                  category: "conceptual",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Use F = G·m₁m₂/r² qualitatively",
                    "Compute weight as W = mg and contrast it with mass",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 2,
                      prompt: "A body has a mass of 12 kg. Find its weight on Earth (g = 9.8 m/s²).",
                      answer: "117.6 N",
                      explanation:
                        "W = mg = 12 × 9.8 = 117.6 N. Mass stays 12 kg everywhere, while weight depends on the local value of g.",
                    },
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt:
                        "If the distance between two bodies is doubled, the gravitational force between them becomes:",
                      options: ["half", "one-fourth", "double", "four times"],
                      answer: "one-fourth",
                      explanation:
                        "Gravitational force is inversely proportional to the square of the distance, so doubling r divides the force by 2² = 4.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Thrust, pressure and buoyancy",
              outcomes: [
                {
                  title: "Compute pressure and apply Archimedes' principle to floating and sinking",
                  category: "application",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Compute pressure as thrust per unit area",
                    "Use relative density to predict floating or sinking",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "A force of 200 N acts on an area of 0.5 m². Calculate the pressure exerted.",
                      answer: "400 Pa",
                      explanation:
                        "Pressure = thrust ÷ area = 200 ÷ 0.5 = 400 N/m², that is 400 pascal.",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 3,
                      prompt: "An object floats in water. This means its density is:",
                      options: [
                        "greater than that of water",
                        "less than that of water",
                        "exactly zero",
                        "equal to its weight",
                      ],
                      answer: "less than that of water",
                      explanation:
                        "A floating object displaces a weight of liquid equal to its own weight, which is possible only when its average density is lower than that of the liquid.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 10,
          title: "Work and Energy",
          topics: [
            {
              title: "Work and forms of energy",
              outcomes: [
                {
                  title: "Compute work done and kinetic or potential energy in simple situations",
                  category: "procedural",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 5,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Apply W = F·s·cosθ for a force along the displacement",
                    "Apply KE = ½mv² and PE = mgh",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt:
                        "A boy lifts a 10 kg box to a shelf 1.5 m high. Calculate the work done against gravity (g = 10 m/s²).",
                      answer: "150 J",
                      explanation:
                        "Work against gravity = mgh = 10 × 10 × 1.5 = 150 J, which is stored as gravitational potential energy.",
                    },
                    {
                      kind: "mcq",
                      difficulty: 3,
                      prompt:
                        "A coolie carries a load horizontally at constant speed. The work done by him against gravity is:",
                      options: ["maximum", "zero", "equal to mgh", "negative"],
                      answer: "zero",
                      explanation:
                        "The gravitational force acts vertically while the displacement is horizontal. With the force perpendicular to displacement, the work done against gravity is zero.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Power and conservation of energy",
              outcomes: [
                {
                  title: "Compute power and apply the law of conservation of energy",
                  category: "application",
                  bloom: "analyse",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Compute P = W/t and convert between watt and kilowatt-hour",
                    "Trace potential-to-kinetic energy conversion in a falling body",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "A machine does 900 J of work in 30 s. Calculate its power.",
                      answer: "30 W",
                      explanation:
                        "Power = work ÷ time = 900 ÷ 30 = 30 J/s, that is 30 watt.",
                    },
                    {
                      kind: "applied_mcq",
                      difficulty: 4,
                      prompt:
                        "A ball is dropped from a height. Just before hitting the ground (ignoring air resistance), its energy is:",
                      options: [
                        "entirely potential",
                        "entirely kinetic",
                        "half potential and half kinetic",
                        "zero",
                      ],
                      answer: "entirely kinetic",
                      explanation:
                        "As the height falls to zero the potential energy mgh becomes zero, and by conservation of energy all of it has converted into kinetic energy.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          ncert: 11,
          title: "Sound",
          topics: [
            {
              title: "Production, propagation and characteristics of sound",
              outcomes: [
                {
                  title: "Explain sound as a longitudinal wave and relate frequency, wavelength and speed",
                  category: "conceptual",
                  bloom: "apply",
                  difficulty: 3,
                  weight: 4,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Describe compressions and rarefactions in a medium",
                    "Apply v = fλ",
                  ],
                  questions: [
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt:
                        "A sound wave has frequency 500 Hz and wavelength 0.66 m. Calculate its speed.",
                      answer: "330 m/s",
                      explanation:
                        "v = fλ = 500 × 0.66 = 330 m/s, which is close to the speed of sound in air at room temperature.",
                    },
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Sound cannot travel through vacuum because:",
                      options: [
                        "it is a transverse wave",
                        "it needs a material medium whose particles can vibrate",
                        "its frequency becomes zero",
                        "light travels faster",
                      ],
                      answer: "it needs a material medium whose particles can vibrate",
                      explanation:
                        "Sound propagates as compressions and rarefactions of particles. A vacuum has no particles, so there is nothing to carry the disturbance.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Reflection of sound and its applications",
              outcomes: [
                {
                  title: "Apply reflection of sound to echoes, reverberation and SONAR calculations",
                  category: "application",
                  bloom: "apply",
                  difficulty: 4,
                  weight: 3,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "State the minimum distance for an echo to be heard distinctly",
                    "Use distance = ½ × speed × total time for SONAR/echo problems",
                  ],
                  questions: [
                    {
                      kind: "applied_mcq",
                      difficulty: 4,
                      prompt:
                        "A SONAR pulse returns from the seabed after 4 s. If the speed of sound in water is 1500 m/s, the depth is:",
                      options: ["1500 m", "3000 m", "6000 m", "750 m"],
                      answer: "3000 m",
                      explanation:
                        "The pulse travels down and back, so the one-way time is 2 s. Depth = 1500 × 2 = 3000 m.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt:
                        "Why must a reflecting surface be at least about 17 m away for a distinct echo in air?",
                      answer:
                        "Because the ear retains a sound for about 0.1 s, and in that time sound at 344 m/s travels about 34 m to and fro, that is roughly 17 m each way.",
                      explanation:
                        "The persistence of hearing is about 0.1 s. For the echo to be heard separately the total path must take at least this long: 344 × 0.1 ≈ 34 m, so the obstacle must be about 17 m away.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Food; Food Production",
      marks: 6,
      chapters: [
        {
          ncert: 12,
          title: "Improvement in Food Resources",
          topics: [
            {
              title: "Crop production and management",
              outcomes: [
                {
                  title: "Describe crop variety improvement, nutrient management and cropping patterns",
                  category: "conceptual",
                  bloom: "understand",
                  difficulty: 2,
                  weight: 3,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Distinguish kharif and rabi crops",
                    "Compare manure and fertiliser in nutrient management",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Which of the following is a rabi crop?",
                      options: ["Paddy", "Maize", "Wheat", "Groundnut"],
                      answer: "Wheat",
                      explanation:
                        "Rabi crops are sown in winter, from about November to April; wheat is the classic example. Paddy, maize and groundnut are kharif crops grown in the rainy season.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "State one advantage of using manure over chemical fertilisers.",
                      answer:
                        "Manure adds organic matter that improves soil structure and water-holding capacity, unlike chemical fertilisers.",
                      explanation:
                        "Manure supplies nutrients slowly and enriches the soil with humus, improving texture, aeration and microbial life. Fertilisers give quick nutrients but can degrade soil fertility with prolonged use.",
                    },
                  ],
                },
              ],
            },
            {
              title: "Animal husbandry",
              outcomes: [
                {
                  title: "Describe practices in cattle, poultry and fish farming and beekeeping",
                  category: "conceptual",
                  bloom: "understand",
                  difficulty: 2,
                  weight: 3,
                  types: ["mcq", "short_answer"],
                  atoms: [
                    "Distinguish milch and draught animals",
                    "Compare capture fishery with aquaculture",
                  ],
                  questions: [
                    {
                      kind: "mcq",
                      difficulty: 2,
                      prompt: "Milch animals are those reared mainly for:",
                      options: ["Farm labour", "Milk production", "Egg production", "Honey production"],
                      answer: "Milk production",
                      explanation:
                        "'Milch' refers to milk-yielding animals such as dairy cows and buffaloes. Draught animals are kept for farm work.",
                    },
                    {
                      kind: "short_answer",
                      difficulty: 3,
                      prompt: "How does composite fish culture increase yield from a single pond?",
                      answer:
                        "By stocking species that feed at different levels of the pond, so all available food is used without competition.",
                      explanation:
                        "Surface feeders, mid-zone feeders, bottom feeders and weed feeders are combined so that each ecological niche of the pond is exploited, raising total production.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const SUBJECTS: AuthoredSubject[] = [MATHEMATICS, SCIENCE];
