import type { UnitExtension } from "../extension-types";

export const EXT: UnitExtension = {
  unitId: "C9-MAT-U3",
  newTopics: [
    {
      chapter: 1,
      topic: {
        title: "Axes, origin and coordinates",
        outcomes: [
          {
            title: "Describe the axes, origin and coordinates of a point in the Cartesian plane",
            category: "conceptual",
            bloom: "remember",
            difficulty: 1,
            weight: 4,
            types: ["mcq", "true_false", "short_answer"],
            atoms: [
              "State the names given to the horizontal and vertical reference lines",
              "State the coordinates of the point where the axes meet",
            ],
            questions: [
              {
                kind: "mcq",
                difficulty: 1,
                prompt: "What is the horizontal reference line in the Cartesian plane called?",
                options: ["x-axis", "y-axis", "origin", "abscissa"],
                answer: "x-axis",
                explanation:
                  "The horizontal number line used as a reference in the plane is named the x-axis, while the vertical one is the y-axis.",
              },
              {
                kind: "mcq",
                difficulty: 1,
                prompt: "What are the coordinates of the origin?",
                options: ["(0, 0)", "(1, 1)", "(0, 1)", "(1, 0)"],
                answer: "(0, 0)",
                explanation:
                  "The origin is the point where the x-axis and y-axis intersect, and both its coordinates are zero.",
              },
              {
                kind: "true_false",
                difficulty: 1,
                prompt: "The vertical reference line in the Cartesian plane is called the y-axis.",
                options: ["True", "False"],
                answer: "True",
                explanation:
                  "By convention the vertical line used to fix positions in the plane is named the y-axis.",
              },
              {
                kind: "short_answer",
                difficulty: 2,
                prompt: "In the ordered pair (7, -2), what name is given to the first number 7?",
                answer: "x-coordinate (abscissa)",
                explanation:
                  "The first entry of an ordered pair gives the distance measured along the x-axis and is called the abscissa.",
              },
              {
                kind: "short_answer",
                difficulty: 2,
                prompt: "In the ordered pair (7, -2), what name is given to the second number -2?",
                answer: "y-coordinate (ordinate)",
                explanation:
                  "The second entry of an ordered pair gives the distance measured along the y-axis and is called the ordinate.",
              },
              {
                kind: "mcq",
                difficulty: 2,
                prompt: "The plane obtained by two number lines intersecting at right angles is called the",
                options: ["Cartesian plane", "number plane", "grid plane", "coordinate axis"],
                answer: "Cartesian plane",
                explanation:
                  "This plane, formed by a horizontal and a vertical number line crossing at right angles, is named the Cartesian plane after Descartes.",
              },
            ],
          },
        ],
      },
    },
    {
      chapter: 1,
      topic: {
        title: "Quadrants and sign rules",
        outcomes: [
          {
            title: "Determine the quadrant of a point using the sign pattern of its coordinates",
            category: "conceptual",
            bloom: "understand",
            difficulty: 2,
            weight: 4,
            types: ["mcq", "assertion_reason", "true_false"],
            atoms: [
              "Match the sign combination (+,+), (-,+), (-,-), (+,-) to quadrants I, II, III, IV",
              "Decide the quadrant of a point given only its sign pattern",
            ],
            questions: [
              {
                kind: "mcq",
                difficulty: 1,
                prompt: "A point with both coordinates negative lies in which quadrant?",
                options: ["First", "Second", "Third", "Fourth"],
                answer: "Third",
                explanation:
                  "Negative x and negative y place the point to the left of and below the origin, which is the third quadrant.",
              },
              {
                kind: "mcq",
                difficulty: 2,
                prompt: "Point P has a positive x-coordinate and a negative y-coordinate. In which quadrant does P lie?",
                options: ["First", "Second", "Third", "Fourth"],
                answer: "Fourth",
                explanation:
                  "Positive x with negative y places the point to the right of the y-axis and below the x-axis, the fourth quadrant.",
              },
              {
                kind: "true_false",
                difficulty: 2,
                prompt: "Every point in the first quadrant has both its coordinates positive.",
                options: ["True", "False"],
                answer: "True",
                explanation:
                  "The first quadrant is defined as the region where x > 0 and y > 0.",
              },
              {
                kind: "assertion_reason",
                difficulty: 3,
                prompt: "Assertion (A): The point (-4, 6) lies in the second quadrant. Reason (R): In the second quadrant, the x-coordinate is negative and the y-coordinate is positive.",
                options: [
                  "Both A and R are true and R is the correct explanation of A",
                  "Both A and R are true but R is not the correct explanation of A",
                  "A is true but R is false",
                  "A is false but R is true",
                ],
                answer: "Both A and R are true and R is the correct explanation of A",
                explanation:
                  "Since -4 is negative and 6 is positive, the point matches the sign rule of the second quadrant, so R correctly explains A.",
              },
              {
                kind: "mcq",
                difficulty: 3,
                prompt: "If the coordinates of a point satisfy x < 0 and y < 0, the point must lie",
                options: [
                  "in the first quadrant",
                  "in the second quadrant",
                  "in the third quadrant",
                  "in the fourth quadrant",
                ],
                answer: "in the third quadrant",
                explanation:
                  "Both coordinates negative means the point is below and to the left of the origin, which is the third quadrant.",
              },
              {
                kind: "mcq",
                difficulty: 2,
                prompt: "Which quadrant contains all points where the x-coordinate is negative and the y-coordinate is positive?",
                options: ["First", "Second", "Third", "Fourth"],
                answer: "Second",
                explanation:
                  "The combination of negative x and positive y is exactly the defining sign rule of the second quadrant.",
              },
            ],
          },
        ],
      },
    },
    {
      chapter: 1,
      topic: {
        title: "Plotting and reading points",
        outcomes: [
          {
            title: "Plot given ordered pairs and read off coordinates of marked points on a grid",
            category: "procedural",
            bloom: "apply",
            difficulty: 2,
            weight: 4,
            types: ["mcq", "applied_mcq", "short_answer"],
            atoms: [
              "Locate a point on a squared grid given its ordered pair",
              "Write the ordered pair for a point already marked on a grid",
            ],
            questions: [
              {
                kind: "mcq",
                difficulty: 2,
                prompt: "To plot the point (4, -3), how many units should you move from the origin and in which directions?",
                options: [
                  "4 units right, then 3 units down",
                  "4 units left, then 3 units up",
                  "3 units right, then 4 units down",
                  "4 units up, then 3 units right",
                ],
                answer: "4 units right, then 3 units down",
                explanation:
                  "The x-coordinate 4 gives 4 units to the right of the origin, and the y-coordinate -3 gives 3 units downward from there.",
              },
              {
                kind: "applied_mcq",
                difficulty: 3,
                prompt: "Starting at the origin, a student moves 5 units left and then 2 units up to mark a point. What are the coordinates of this point?",
                options: ["(-5, 2)", "(5, 2)", "(-5, -2)", "(2, -5)"],
                answer: "(-5, 2)",
                explanation:
                  "Moving left along the x-axis gives a negative x-coordinate of -5, and moving up gives a positive y-coordinate of 2.",
              },
              {
                kind: "short_answer",
                difficulty: 2,
                prompt: "A point is reached by moving 6 units right and 6 units down from the origin. Write its coordinates.",
                answer: "(6, -6)",
                explanation:
                  "Rightward movement gives x = 6 and downward movement gives y = -6, so the point is (6, -6).",
              },
              {
                kind: "mcq",
                difficulty: 3,
                prompt: "On a grid, point Q is located 2 units to the left and 7 units below the origin. Which ordered pair represents Q?",
                options: ["(-2, -7)", "(2, -7)", "(-2, 7)", "(-7, -2)"],
                answer: "(-2, -7)",
                explanation:
                  "Left movement gives a negative x-coordinate and downward movement gives a negative y-coordinate, giving (-2, -7).",
              },
              {
                kind: "applied_mcq",
                difficulty: 3,
                prompt: "Two points A(3, 5) and B(3, -5) are plotted. What is true about their positions relative to the x-axis?",
                options: [
                  "A and B are mirror images of each other across the x-axis",
                  "A and B are mirror images of each other across the y-axis",
                  "A and B coincide with each other",
                  "A and B both lie on the x-axis",
                ],
                answer: "A and B are mirror images of each other across the x-axis",
                explanation:
                  "A and B share the same x-coordinate but have opposite y-coordinates, so they are reflections of each other in the x-axis.",
              },
              {
                kind: "short_answer",
                difficulty: 4,
                prompt: "Point C is plotted and found to be exactly 8 units to the right of the y-axis and 1 unit below the x-axis. Write the coordinates of C.",
                answer: "(8, -1)",
                explanation:
                  "Distance from the y-axis gives the x-coordinate as 8, and being below the x-axis gives the y-coordinate as -1.",
              },
              {
                kind: "mcq",
                difficulty: 2,
                prompt: "Which of these ordered pairs, when plotted, lies farthest to the right of the y-axis?",
                options: ["(9, 1)", "(2, 8)", "(-9, 1)", "(0, 9)"],
                answer: "(9, 1)",
                explanation:
                  "The distance from the y-axis is given by the absolute value of the x-coordinate, and 9 is the largest such value here.",
              },
            ],
          },
        ],
      },
    },
    {
      chapter: 1,
      topic: {
        title: "Points on the axes and distances along an axis",
        outcomes: [
          {
            title: "Identify points lying on the axes and compute distances between points sharing an axis value",
            category: "procedural",
            bloom: "apply",
            difficulty: 2,
            weight: 4,
            types: ["mcq", "true_false", "short_answer", "applied_mcq"],
            atoms: [
              "Recognise that points on the x-axis have y-coordinate 0 and points on the y-axis have x-coordinate 0",
              "Find the distance between two points that lie on the same horizontal or vertical line",
            ],
            questions: [
              {
                kind: "mcq",
                difficulty: 1,
                prompt: "A point lying on the x-axis always has which coordinate equal to zero?",
                options: ["y-coordinate", "x-coordinate", "both coordinates", "neither coordinate"],
                answer: "y-coordinate",
                explanation:
                  "Points on the x-axis are neither above nor below it, so their vertical distance, the y-coordinate, is zero.",
              },
              {
                kind: "true_false",
                difficulty: 1,
                prompt: "The point (0, -9) lies on the y-axis.",
                options: ["True", "False"],
                answer: "True",
                explanation:
                  "Since the x-coordinate is 0, the point is not shifted left or right of the y-axis, so it lies on the y-axis.",
              },
              {
                kind: "short_answer",
                difficulty: 2,
                prompt: "Points A(2, 0) and B(9, 0) lie on the x-axis. Find the distance AB.",
                answer: "7 units",
                explanation:
                  "Both points have y = 0, so the distance between them equals the difference of their x-coordinates: 9 - 2 = 7 units.",
              },
              {
                kind: "applied_mcq",
                difficulty: 3,
                prompt: "Points M(0, 4) and N(0, -6) lie on the y-axis. What is the distance MN?",
                options: ["10 units", "2 units", "6 units", "4 units"],
                answer: "10 units",
                explanation:
                  "On the y-axis, the distance is the difference of y-coordinates: 4 - (-6) = 10 units.",
              },
              {
                kind: "mcq",
                difficulty: 2,
                prompt: "Which of the following points lies on the x-axis?",
                options: ["(6, 0)", "(0, 6)", "(6, 6)", "(-6, -6)"],
                answer: "(6, 0)",
                explanation:
                  "A point lies on the x-axis exactly when its y-coordinate is zero, which holds only for (6, 0) here.",
              },
              {
                kind: "short_answer",
                difficulty: 3,
                prompt: "Points R(-3, 5) and S(4, 5) share the same y-coordinate. Find the distance RS.",
                answer: "7 units",
                explanation:
                  "Since both points lie on the same horizontal line, the distance equals the difference of x-coordinates: 4 - (-3) = 7 units.",
              },
              {
                kind: "short_answer",
                difficulty: 2,
                prompt: "Write the coordinates of the point that lies on the x-axis at a distance of 10 units to the left of the origin.",
                answer: "(-10, 0)",
                explanation:
                  "A point on the x-axis has y-coordinate 0, and being 10 units to the left of the origin gives x = -10.",
              },
              {
                kind: "mcq",
                difficulty: 3,
                prompt: "Which pair of points both lie on the same axis?",
                options: ["(0, 3) and (0, -8)", "(3, 0) and (0, 3)", "(2, 2) and (-2, -2)", "(1, 0) and (0, 1)"],
                answer: "(0, 3) and (0, -8)",
                explanation:
                  "Both points in this pair have x-coordinate 0, so both lie on the y-axis.",
              },
            ],
          },
        ],
      },
    },
    {
      chapter: 1,
      topic: {
        title: "Graphs of linear equations of the form y = mx",
        outcomes: [
          {
            title: "Draw and interpret the graph of a linear equation of the form y = mx passing through the origin",
            category: "application",
            bloom: "apply",
            difficulty: 3,
            weight: 4,
            types: ["mcq", "applied_mcq", "short_answer", "true_false"],
            atoms: [
              "Generate a table of values for y = mx and use it to plot the line",
              "Check whether a given point satisfies an equation of the form y = mx",
            ],
            questions: [
              {
                kind: "mcq",
                difficulty: 2,
                prompt: "The graph of y = 3x passes through which of these points?",
                options: ["(2, 6)", "(2, 5)", "(3, 2)", "(0, 3)"],
                answer: "(2, 6)",
                explanation:
                  "Substituting x = 2 gives y = 3 x 2 = 6, so (2, 6) satisfies the equation y = 3x.",
              },
              {
                kind: "true_false",
                difficulty: 1,
                prompt: "The graph of every equation of the form y = mx passes through the origin.",
                options: ["True", "False"],
                answer: "True",
                explanation:
                  "When x = 0, y = m x 0 = 0 for any value of m, so the origin (0, 0) always satisfies y = mx.",
              },
              {
                kind: "applied_mcq",
                difficulty: 3,
                prompt: "A line has equation y = -2x. Which point does NOT lie on this line?",
                options: ["(1, -2)", "(-3, 6)", "(2, -4)", "(4, 8)"],
                answer: "(4, 8)",
                explanation:
                  "Substituting x = 4 gives y = -2 x 4 = -8, not 8, so (4, 8) does not satisfy y = -2x.",
              },
              {
                kind: "short_answer",
                difficulty: 2,
                prompt: "Find the value of y when x = 5 on the graph of y = 4x.",
                answer: "20",
                explanation:
                  "Substituting x = 5 into y = 4x gives y = 4 x 5 = 20.",
              },
              {
                kind: "mcq",
                difficulty: 3,
                prompt: "If the point (k, 12) lies on the line y = 6x, what is the value of k?",
                options: ["2", "6", "18", "72"],
                answer: "2",
                explanation:
                  "Substituting y = 12 into 12 = 6k gives k = 12 / 6 = 2.",
              },
              {
                kind: "applied_mcq",
                difficulty: 4,
                prompt: "A car's fare in rupees is given by y = 10x, where x is the distance in kilometres. What is the fare for a 7 km ride?",
                options: ["70 rupees", "17 rupees", "7 rupees", "100 rupees"],
                answer: "70 rupees",
                explanation:
                  "Substituting x = 7 into y = 10x gives y = 10 x 7 = 70 rupees.",
              },
              {
                kind: "mcq",
                difficulty: 3,
                prompt: "Which of these tables of values is consistent with the equation y = -x?",
                options: [
                  "x: 1, 2, 3 and y: -1, -2, -3",
                  "x: 1, 2, 3 and y: 1, 2, 3",
                  "x: 1, 2, 3 and y: -1, 2, -3",
                  "x: 1, 2, 3 and y: 0, 0, 0",
                ],
                answer: "x: 1, 2, 3 and y: -1, -2, -3",
                explanation:
                  "For y = -x, each y-value must be the negative of the corresponding x-value, which matches only the first table.",
              },
            ],
          },
        ],
      },
    },
  ],
  extraQuestions: {
    "C9-MAT-U3-CH1-T1-O1": [
      {
        kind: "mcq",
        difficulty: 2,
        prompt: "In which quadrant does the point (6, -8) lie?",
        options: ["First", "Second", "Third", "Fourth"],
        answer: "Fourth",
        explanation:
          "A positive x-coordinate with a negative y-coordinate places the point to the right of the y-axis and below the x-axis, the fourth quadrant.",
      },
      {
        kind: "true_false",
        difficulty: 2,
        prompt: "The point (-4, 0) lies in the third quadrant.",
        options: ["True", "False"],
        answer: "False",
        explanation:
          "Since its y-coordinate is 0, the point (-4, 0) lies on the x-axis and not inside any quadrant.",
      },
      {
        kind: "short_answer",
        difficulty: 3,
        prompt: "A point lies 5 units to the left of the y-axis and 9 units above the x-axis. Write its coordinates and name its quadrant.",
        answer: "(-5, 9), second quadrant",
        explanation:
          "Left of the y-axis gives a negative x-coordinate and above the x-axis gives a positive y-coordinate, placing (-5, 9) in the second quadrant.",
      },
      {
        kind: "applied_mcq",
        difficulty: 3,
        prompt: "A survey marks a location with coordinates (0, -12) on a map grid. Where does this location lie?",
        options: [
          "On the y-axis, below the origin",
          "On the x-axis, to the left of the origin",
          "In the third quadrant",
          "In the fourth quadrant",
        ],
        answer: "On the y-axis, below the origin",
        explanation:
          "Since the x-coordinate is 0, the point lies on the y-axis, and the negative y-value places it below the origin.",
      },
    ],
  },
};
