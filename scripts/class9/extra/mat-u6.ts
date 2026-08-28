import type { UnitExtension } from "../extension-types";
import type { AuthoredQuestion, AuthoredTopic } from "../authoring";

// Existing outcomes (from authoring.ts, chapter 1 of C9-MAT-U6):
//   C9-MAT-U6-CH1-T1-O1 — "Organise raw data into frequency tables and read bar graphs and histograms"
//   C9-MAT-U6-CH1-T2-O1 — "Compute and interpret mean, median and mode of ungrouped data"

const extraForOrganising: AuthoredQuestion[] = [
  {
    kind: "true_false",
    difficulty: 1,
    prompt: "In a frequency distribution, the class width for the class 20–30 is 10.",
    options: ["True", "False"],
    answer: "True",
    explanation: "Class width equals the upper limit minus the lower limit: 30 − 20 = 10.",
  },
  {
    kind: "short_answer",
    difficulty: 3,
    stimulus: "Weekly pocket money (in Rs) of 10 students: 40, 45, 40, 50, 60, 45, 40, 55, 50, 45",
    prompt: "Prepare a tally and state the frequency of the value 45 in this data set.",
    answer: "3",
    explanation: "The value 45 occurs at positions 2, 6 and 10 in the list, so its tally gives a frequency of 3.",
  },
  {
    kind: "applied_mcq",
    difficulty: 3,
    prompt:
      "A histogram is drawn for class intervals 0–10, 10–20, 20–30 with frequencies 4, 9 and 6. What is the height of the bar for the class 10–20 if all class widths are equal?",
    options: ["4 units", "6 units", "9 units", "19 units"],
    answer: "9 units",
    explanation:
      "For equal class widths, the height of each histogram bar is drawn equal to its frequency, so the class 10–20 with frequency 9 has height 9 units.",
  },
  {
    kind: "mcq",
    difficulty: 2,
    prompt: "Which diagram is most suitable for showing how a company's monthly sales figures vary over 12 months?",
    options: ["Pie chart", "Bar graph", "Frequency polygon of grouped data", "Scatter of unrelated points"],
    answer: "Bar graph",
    explanation:
      "A bar graph displays discrete category-wise values, such as sales for each separate month, with bars of heights proportional to the values.",
  },
];

const extraForCentralTendency: AuthoredQuestion[] = [
  {
    kind: "short_answer",
    difficulty: 2,
    stimulus: "Runs scored by a batsman in 6 innings: 25, 40, 25, 60, 25, 45",
    prompt: "Find the mode of the runs scored.",
    answer: "25",
    explanation: "The value 25 appears three times, more often than any other score, so it is the mode.",
  },
  {
    kind: "applied_mcq",
    difficulty: 4,
    prompt:
      "The mean of 10 observations is 24. A new observation of value 46 is added. What is the new mean of the 11 observations?",
    options: ["24", "26", "28", "46"],
    answer: "26",
    explanation:
      "The original sum is 10 × 24 = 240. Adding 46 gives 286, and dividing by 11 observations gives a new mean of 26.",
  },
  {
    kind: "true_false",
    difficulty: 2,
    prompt: "For the data 4, 4, 4, 4, 4, the mean, median and mode are all equal to 4.",
    options: ["True", "False"],
    answer: "True",
    explanation: "Since every observation equals 4, the sum divided by count is 4, the middle value is 4, and 4 is the only repeated value.",
  },
  {
    kind: "short_answer",
    difficulty: 3,
    stimulus: "Ages (in years) of 6 members of a club: 18, 22, 19, 25, 21, 20",
    prompt: "Find the median age of this even-sized data set.",
    answer: "20.5",
    explanation:
      "Arranged in order: 18, 19, 20, 21, 22, 25. With 6 values, the median is the average of the 3rd and 4th values: (20 + 21)/2 = 20.5.",
  },
];

const dataCollectionTopic: AuthoredTopic = {
  title: "Collecting and tabulating data",
  outcomes: [
    {
      title: "Distinguish primary and secondary data and tabulate raw data using tally marks",
      category: "conceptual",
      bloom: "understand",
      difficulty: 2,
      weight: 3,
      types: ["mcq", "short_answer"],
      atoms: [
        "Distinguish primary data collected first-hand from secondary data taken from an existing source",
        "Use tally marks to convert raw data into a frequency table",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 1,
          prompt: "Data collected by a student by directly measuring the heights of classmates is an example of:",
          options: ["Secondary data", "Primary data", "Grouped data only", "A histogram"],
          answer: "Primary data",
          explanation:
            "Primary data is collected first-hand by the investigator for a specific purpose, as with the student's own height measurements.",
        },
        {
          kind: "true_false",
          difficulty: 1,
          prompt: "Data taken from a government census report to study population trends is called primary data.",
          options: ["True", "False"],
          answer: "False",
          explanation:
            "Data taken from an existing published source such as a census report was collected by someone else, so it is secondary data, not primary data.",
        },
        {
          kind: "short_answer",
          difficulty: 2,
          stimulus: "Shoe sizes of 12 students: 6, 7, 6, 8, 7, 6, 9, 7, 8, 6, 7, 8",
          prompt: "Using tally marks, find the frequency of shoe size 7.",
          answer: "4",
          explanation: "Size 7 occurs at 4 places in the list, so its tally frequency is 4.",
        },
        {
          kind: "applied_mcq",
          difficulty: 2,
          prompt:
            "A survey lists the number of siblings of 15 students as raw, ungrouped values. The first step to summarise this data is to:",
          options: [
            "draw a histogram directly",
            "prepare a frequency table using tally marks",
            "compute the mean immediately",
            "discard repeated values",
          ],
          answer: "prepare a frequency table using tally marks",
          explanation:
            "Raw data is first organised into a frequency table with tally marks; graphs and averages are computed afterwards from this table.",
        },
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "In a frequency table, the total of all the frequencies must equal:",
          options: ["The number of classes", "The class width", "The total number of observations", "The mean of the data"],
          answer: "The total number of observations",
          explanation:
            "Every observation is counted exactly once in some class, so summing all frequencies recovers the total number of observations.",
        },
        {
          kind: "short_answer",
          difficulty: 3,
          stimulus: "Number of pets owned by 10 families: 0, 1, 2, 1, 0, 3, 1, 2, 1, 0",
          prompt: "How many families own exactly one pet?",
          answer: "4",
          explanation: "Scanning the list, the value 1 appears 4 times, so 4 families own exactly one pet.",
        },        {
          kind: "mcq",
          difficulty: 3,
          prompt: "A questionnaire filled directly by respondents for a fresh survey produces:",
          options: ["Secondary data", "Primary data", "A histogram", "A class interval"],
          answer: "Primary data",
          explanation: "Data gathered first-hand for the specific purpose of the survey, such as a fresh questionnaire, is primary data.",
        },

      ],
    },
  ],
};

const classIntervalsTopic: AuthoredTopic = {
  title: "Class intervals and grouped frequency distributions",
  outcomes: [
    {
      title: "Form class intervals of a chosen width and build a grouped frequency distribution",
      category: "procedural",
      bloom: "apply",
      difficulty: 3,
      weight: 3,
      types: ["mcq", "applied_mcq", "short_answer"],
      atoms: [
        "Choose a suitable class width and starting point to cover a given range of data",
        "Assign each observation to its correct class interval and tally the frequency",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "In the class interval 40–50, the lower limit and upper limit are respectively:",
          options: ["50 and 40", "40 and 50", "45 and 50", "40 and 45"],
          answer: "40 and 50",
          explanation: "By convention, the smaller boundary 40 is the lower limit and the larger boundary 50 is the upper limit.",
        },
        {
          kind: "applied_mcq",
          difficulty: 3,
          prompt: "Marks obtained lie between 5 and 73. If classes of width 10 start at 0, how many classes are required?",
          options: ["7", "8", "9", "10"],
          answer: "8",
          explanation: "Classes 0–10, 10–20, …, 70–80 are needed to cover up to 73, which is 8 classes in total.",
        },
        {
          kind: "short_answer",
          difficulty: 2,
          stimulus: "Class interval: 25–35",
          prompt: "Find the class size (width) of this interval.",
          answer: "10",
          explanation: "Class size is the difference between the upper and lower limits: 35 − 25 = 10.",
        },
        {
          kind: "applied_mcq",
          difficulty: 3,
          stimulus: "Weights (in kg) of 20 students: 30, 32, 35, 41, 45, 48, 33, 37, 42, 46, 31, 39, 44, 47, 34, 38, 43, 36, 40, 49",
          prompt: "Using class intervals 30–35, 35–40, 40–45, 45–50, how many students fall in the class 40–45?",
          options: ["4", "5", "6", "7"],
          answer: "5",
          explanation:
            "The values 41, 42, 43, 44 and 40 fall in 40–45 (a value equal to the lower limit is counted in that class), giving a frequency of 5.",
        },
        {
          kind: "true_false",
          difficulty: 2,
          prompt: "In the exclusive method of forming class intervals, a value equal to the upper limit of a class is included in the next class.",
          options: ["True", "False"],
          answer: "True",
          explanation:
            "The exclusive method treats the upper limit as not belonging to that class; such a value is placed in the next higher class interval.",
        },
        {
          kind: "mcq",
          difficulty: 4,
          prompt: "The class mark of a class interval is calculated as:",
          options: [
            "upper limit minus lower limit",
            "(upper limit + lower limit) divided by 2",
            "upper limit divided by lower limit",
            "lower limit minus half the class width",
          ],
          answer: "(upper limit + lower limit) divided by 2",
          explanation: "The class mark, or mid-value, is the average of the two limits of the class interval.",
        },        {
          kind: "short_answer",
          difficulty: 3,
          stimulus: "Class intervals used: 10–20, 20–30, 30–40, each of frequency 5, 8 and 7 respectively",
          prompt: "Find the total number of observations represented by these three classes.",
          answer: "20",
          explanation: "Adding the frequencies of all classes gives the total observations: 5 + 8 + 7 = 20.",
        },

      ],
    },
  ],
};

const barGraphHistogramTopic: AuthoredTopic = {
  title: "Bar graphs and histograms",
  outcomes: [
    {
      title: "Construct and interpret bar graphs and histograms for grouped and ungrouped data",
      category: "application",
      bloom: "apply",
      difficulty: 3,
      weight: 3,
      types: ["mcq", "applied_mcq", "short_answer"],
      atoms: [
        "Draw a bar graph for categorical or discrete data with bars of uniform width and equal spacing",
        "Draw a histogram for grouped continuous data with bars touching each other",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "Which feature distinguishes a histogram from a simple bar graph?",
          options: [
            "A histogram uses coloured bars",
            "The bars of a histogram touch each other because the classes are continuous",
            "A histogram never has a vertical axis",
            "A histogram can only show two categories",
          ],
          answer: "The bars of a histogram touch each other because the classes are continuous",
          explanation:
            "Since a histogram represents continuous class intervals with no gaps between classes, adjacent bars are drawn touching each other, unlike a bar graph for discrete categories.",
        },
        {
          kind: "applied_mcq",
          difficulty: 3,
          stimulus: "Histogram class intervals and frequencies: 0–10 (5), 10–20 (12), 20–30 (18), 30–40 (9)",
          prompt: "Which class interval has the tallest bar in this histogram?",
          options: ["0–10", "10–20", "20–30", "30–40"],
          answer: "20–30",
          explanation: "The bar height equals the frequency, and 18 is the largest frequency, corresponding to the class 20–30.",
        },
        {
          kind: "short_answer",
          difficulty: 3,
          stimulus: "Number of books sold by genre: Fiction 40, Comics 25, Biography 15, Science 20",
          prompt: "In a bar graph of this data, which genre has the shortest bar?",
          answer: "Biography",
          explanation: "Biography has the lowest count, 15, so its bar is the shortest among the four genres.",
        },
        {
          kind: "true_false",
          difficulty: 2,
          prompt: "In a bar graph, the width of the bars and the gaps between them carry no numerical meaning.",
          options: ["True", "False"],
          answer: "True",
          explanation:
            "Only the height (or length) of each bar represents the value; the uniform width and spacing are chosen only for a clear appearance.",
        },
        {
          kind: "applied_mcq",
          difficulty: 4,
          stimulus: "Histogram class intervals of unequal width: 0–10 (frequency 8) and 10–30 (frequency 12)",
          prompt: "To fairly compare these two classes of unequal width in a histogram, the bar heights should be adjusted using:",
          options: [
            "the frequency divided by the class width",
            "the frequency multiplied by the class width",
            "the class mark only",
            "the cumulative frequency",
          ],
          answer: "the frequency divided by the class width",
          explanation:
            "When class widths differ, height is taken as frequency density (frequency ÷ width) so the bar area, not just its height, fairly represents the frequency.",
        },
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "A histogram is best suited for displaying:",
          options: [
            "grouped continuous numerical data",
            "the proportion of parts in a whole",
            "trends of a single quantity over time only",
            "unrelated categorical labels",
          ],
          answer: "grouped continuous numerical data",
          explanation:
            "Histograms are designed to show the distribution of continuous data split into class intervals, unlike pie charts or line graphs.",
        },        {
          kind: "short_answer",
          difficulty: 2,
          stimulus: "Bar graph of favourite sports: Cricket 30, Football 22, Badminton 18, Hockey 10",
          prompt: "Which sport is shown by the tallest bar?",
          answer: "Cricket",
          explanation: "Cricket has the highest count, 30, so its bar is the tallest in the bar graph.",
        },

      ],
    },
  ],
};

const frequencyPolygonTopic: AuthoredTopic = {
  title: "Frequency polygons and interpreting graphical displays",
  outcomes: [
    {
      title: "Construct a frequency polygon from a histogram or frequency table and draw conclusions from graphical displays",
      category: "analysis",
      bloom: "analyse",
      difficulty: 3,
      weight: 3,
      types: ["mcq", "applied_mcq", "short_answer"],
      atoms: [
        "Plot class marks against frequencies and join them to form a frequency polygon",
        "Compare distributions and draw conclusions using bar graphs, histograms or frequency polygons",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "A frequency polygon is obtained by plotting frequency against:",
          options: ["the lower limit of each class", "the upper limit of each class", "the class mark of each class", "the class width"],
          answer: "the class mark of each class",
          explanation: "Each point of a frequency polygon is plotted at the class mark (mid-value) of a class against its frequency.",
        },
        {
          kind: "applied_mcq",
          difficulty: 3,
          stimulus: "Class intervals with frequencies: 10–20 (6), 20–30 (14), 30–40 (10)",
          prompt: "To complete the frequency polygon at both ends, imaginary classes with what frequency are added just before and after the given classes?",
          options: ["0", "6", "10", "14"],
          answer: "0",
          explanation:
            "Extra classes of zero frequency are added immediately before the first and after the last class so the polygon meets the horizontal axis at both ends.",
        },
        {
          kind: "short_answer",
          difficulty: 3,
          stimulus: "Class marks and frequencies: 15 (6), 25 (14), 35 (10)",
          prompt: "Which class mark corresponds to the highest point of the frequency polygon?",
          answer: "25",
          explanation: "The frequency 14 is the largest of the three, and it is plotted against the class mark 25.",
        },
        {
          kind: "true_false",
          difficulty: 2,
          prompt: "A frequency polygon can be drawn without first drawing a histogram, using only the class marks and frequencies.",
          options: ["True", "False"],
          answer: "True",
          explanation:
            "Class marks can be computed directly from the class limits and plotted against frequencies, so a histogram is not required to draw the polygon.",
        },
        {
          kind: "applied_mcq",
          difficulty: 4,
          stimulus: "Two frequency polygons for Test 1 and Test 2 marks of the same class are drawn on the same axes; the Test 2 polygon peaks at a higher class mark than Test 1.",
          prompt: "What can be concluded by comparing the two polygons?",
          options: [
            "Students generally scored higher in Test 2 than in Test 1",
            "Test 1 and Test 2 had the same number of students",
            "The class width used must have been different",
            "No comparison is possible from a frequency polygon",
          ],
          answer: "Students generally scored higher in Test 2 than in Test 1",
          explanation:
            "Since the Test 2 polygon peaks at a higher class mark, more students clustered around higher marks in Test 2, indicating generally better performance than in Test 1.",
        },
        {
          kind: "mcq",
          difficulty: 3,
          prompt: "Compared to a histogram, a key advantage of a frequency polygon is that it:",
          options: [
            "cannot show more than one distribution at a time",
            "allows two or more distributions to be compared easily on the same axes",
            "requires unequal class widths",
            "does not need any frequency data",
          ],
          answer: "allows two or more distributions to be compared easily on the same axes",
          explanation:
            "Because a frequency polygon is a line graph rather than solid bars, multiple polygons can be overlaid on the same axes for easy visual comparison.",
        },        {
          kind: "short_answer",
          difficulty: 3,
          stimulus: "Class marks and frequencies: 5 (0, boundary), 15 (6), 25 (14), 35 (10), 45 (0, boundary)",
          prompt: "How many points in total are plotted to draw this frequency polygon, including the two zero-frequency boundary points?",
          answer: "5",
          explanation: "The polygon plots one point per class mark plus the two added zero-frequency boundary points, giving 3 + 2 = 5 points.",
        },

      ],
    },
  ],
};

export const EXT: UnitExtension = {
  unitId: "C9-MAT-U6",
  newTopics: [
    { chapter: 1, topic: dataCollectionTopic },
    { chapter: 1, topic: classIntervalsTopic },
    { chapter: 1, topic: barGraphHistogramTopic },
    { chapter: 1, topic: frequencyPolygonTopic },
  ],
  extraQuestions: {
    "C9-MAT-U6-CH1-T1-O1": extraForOrganising,
    "C9-MAT-U6-CH1-T2-O1": extraForCentralTendency,
  },
};
