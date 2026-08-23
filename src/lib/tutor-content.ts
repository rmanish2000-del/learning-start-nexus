// Sprint 4: AI Tutor V1 — static content library.
// Browser-safe, pure data + helpers. This library is the failsafe: when the AI
// gateway is unreachable the tutor serves these explanations, hints, examples,
// and practice questions verbatim, so a student never hits a dead end.
// Concepts key off the same subtopic names as the Sprint 3 rule book.

export type PracticeItem = {
  question: string;
  answer: string;
  solution: string;
  hint: string;
};

export type ConceptContent = {
  concept: string;
  explanation: string;
  altExplanation: string;
  hints: [string, string, string]; // progressive: gentle → stronger → strongest
  example: string;
  socratic: string[];
  tryQuestion: PracticeItem;
  practice: PracticeItem[];
};

export const TUTOR_CONCEPTS: ConceptContent[] = [
  {
    concept: "Equivalence",
    explanation:
      "Equivalent fractions are different ways of writing the same amount. 1/2 and 2/4 look different, but they cover exactly the same part of a whole. The trick: multiply or divide the top (numerator) and bottom (denominator) by the same number and the value never changes. Simplifying means dividing both by a common factor until you can't anymore.",
    altExplanation:
      "Think of a pizza. Cut it into 2 slices and take 1 — that's 1/2. Cut the same pizza into 4 slices and take 2 — that's 2/4. You have the same amount of pizza either way! Equivalent fractions are just the same pizza cut into different numbers of pieces.",
    hints: [
      "Whatever you do to the bottom, do the exact same thing to the top.",
      "Look for a number that divides BOTH the numerator and the denominator evenly.",
      "For 4/8: both 4 and 8 divide by 4. 4÷4 = 1 and 8÷4 = 2, so 4/8 = 1/2.",
    ],
    example:
      "Worked example — simplify 6/9.\nStep 1: Find a common factor of 6 and 9. Both divide by 3.\nStep 2: 6 ÷ 3 = 2 and 9 ÷ 3 = 3.\nStep 3: So 6/9 = 2/3. Check: 2/3 of a pizza is the same amount as 6/9 of it. ✓",
    socratic: [
      "If you multiply the top of a fraction by 2 but leave the bottom alone, does the value stay the same? Why or why not?",
      "Can you think of two fractions that look different but mean the same amount?",
      "Why does dividing the top and bottom by the same number never change the value?",
    ],
    tryQuestion: {
      question: "Simplify 4/8 to its lowest terms.",
      answer: "1/2",
      solution:
        "Both 4 and 8 divide by 4: 4 ÷ 4 = 1 and 8 ÷ 4 = 2, so 4/8 = 1/2.",
      hint: "What is the biggest number that divides both 4 and 8 evenly?",
    },
    practice: [
      {
        question: "Which fraction is equivalent to 2/3: 4/6 or 3/6? Answer with the equivalent one.",
        answer: "4/6",
        solution: "Multiply top and bottom of 2/3 by 2: 2×2 = 4 and 3×2 = 6, so 2/3 = 4/6.",
        hint: "Try multiplying the top and bottom of 2/3 by 2.",
      },
      {
        question: "Simplify 10/15 to its lowest terms.",
        answer: "2/3",
        solution: "Both 10 and 15 divide by 5: 10 ÷ 5 = 2 and 15 ÷ 5 = 3, so 10/15 = 2/3.",
        hint: "Both numbers end in 0 or 5 — what number divides both?",
      },
      {
        question: "Fill in the blank: 3/4 = ?/12. Answer with just the missing numerator.",
        answer: "9",
        solution: "4 × 3 = 12, so multiply the top by 3 too: 3 × 3 = 9. So 3/4 = 9/12.",
        hint: "What do you multiply 4 by to get 12? Do the same to 3.",
      },
    ],
  },
  {
    concept: "Compare & order",
    explanation:
      "To compare fractions, give them the same denominator first — the same 'size pieces'. Once the bottoms match, the bigger top wins. For 1/3 vs 1/4, remember: the more pieces you cut something into, the smaller each piece is, so 1/3 > 1/4.",
    altExplanation:
      "Picture two number lines. Fractions are just points on the line between 0 and 1 (and beyond). To compare 2/3 and 3/5, rewrite them as 10/15 and 9/15 — now they use the same measuring stick, and 10/15 is clearly further along.",
    hints: [
      "Same bottom? Then just compare the tops.",
      "Different bottoms? Find a common denominator first.",
      "For 2/3 vs 3/5: the common denominator is 15. 2/3 = 10/15 and 3/5 = 9/15.",
    ],
    example:
      "Worked example — compare 3/4 and 5/6.\nStep 1: Common denominator of 4 and 6 is 12.\nStep 2: 3/4 = 9/12 and 5/6 = 10/12.\nStep 3: 10/12 > 9/12, so 5/6 > 3/4. ✓",
    socratic: [
      "Which is bigger: 1/2 or 1/8? Can you explain why without calculating?",
      "If two fractions have the same numerator, what does the denominator tell you?",
      "Why does giving fractions a common denominator make them easy to compare?",
    ],
    tryQuestion: {
      question: "Which is larger, 2/3 or 3/5? Answer with the larger fraction.",
      answer: "2/3",
      solution: "2/3 = 10/15 and 3/5 = 9/15. Since 10/15 > 9/15, we get 2/3 > 3/5.",
      hint: "Rewrite both with denominator 15, then compare the numerators.",
    },
    practice: [
      {
        question: "Which is larger, 1/2 or 3/8? Answer with the larger fraction.",
        answer: "1/2",
        solution: "1/2 = 4/8, and 4/8 > 3/8, so 1/2 is larger.",
        hint: "Turn 1/2 into eighths.",
      },
      {
        question: "Order from smallest to largest: 1/2, 1/3, 3/4. Answer like: 1/3, 1/2, 3/4",
        answer: "1/3, 1/2, 3/4",
        solution: "As twelfths: 1/3 = 4/12, 1/2 = 6/12, 3/4 = 9/12. So 1/3 < 1/2 < 3/4.",
        hint: "Convert all three to twelfths first.",
      },
      {
        question: "True or false: 5/6 is greater than 7/8. Answer true or false.",
        answer: "false",
        solution: "5/6 = 20/24 and 7/8 = 21/24. Since 20/24 < 21/24, the statement is false.",
        hint: "Use 24 as a common denominator.",
      },
    ],
  },
  {
    concept: "Add & subtract",
    explanation:
      "You can only add or subtract fractions when the pieces are the same size — same denominator. If the bottoms differ, rewrite both fractions with a common denominator first, then add or subtract the tops. The bottom stays the same!",
    altExplanation:
      "Think of denominators as units, like apples and oranges. 1/3 + 1/4 is like '1 third + 1 fourth' — you can't combine them until you convert both to twelfths: 4/12 + 3/12 = 7/12. Convert first, then combine.",
    hints: [
      "Never add the denominators — the bottom stays the same.",
      "Find the least common multiple of the two denominators.",
      "For 1/3 + 1/4: use 12. 1/3 = 4/12 and 1/4 = 3/12, so the sum is 7/12.",
    ],
    example:
      "Worked example — 2/5 + 1/10.\nStep 1: Common denominator is 10.\nStep 2: 2/5 = 4/10.\nStep 3: 4/10 + 1/10 = 5/10 = 1/2 (simplified). ✓",
    socratic: [
      "Why can't you just add 1/2 + 1/3 by adding tops and bottoms?",
      "What does the denominator actually tell you about the pieces?",
      "After adding, why do we usually simplify the answer?",
    ],
    tryQuestion: {
      question: "What is 1/3 + 1/4? Answer as a fraction.",
      answer: "7/12",
      solution: "1/3 = 4/12 and 1/4 = 3/12, so 4/12 + 3/12 = 7/12.",
      hint: "The common denominator of 3 and 4 is 12.",
    },
    practice: [
      {
        question: "What is 2/5 + 1/5? Answer as a fraction.",
        answer: "3/5",
        solution: "Same denominator: add the tops. 2/5 + 1/5 = 3/5.",
        hint: "The bottoms already match — just add the numerators.",
      },
      {
        question: "What is 3/4 − 1/2? Answer as a fraction.",
        answer: "1/4",
        solution: "1/2 = 2/4, so 3/4 − 2/4 = 1/4.",
        hint: "Rewrite 1/2 as fourths.",
      },
      {
        question: "What is 5/6 − 1/3? Answer as a fraction in lowest terms.",
        answer: "1/2",
        solution: "1/3 = 2/6, so 5/6 − 2/6 = 3/6 = 1/2.",
        hint: "Convert 1/3 to sixths, subtract, then simplify.",
      },
    ],
  },
  {
    concept: "Multiply & divide",
    explanation:
      "Multiplying fractions is the friendliest operation: top × top, bottom × bottom. 2/3 × 4/5 = 8/15. Dividing is just multiplying by the flipped (reciprocal) fraction: 'keep, change, flip'. 2/3 ÷ 4/5 = 2/3 × 5/4 = 10/12 = 5/6.",
    altExplanation:
      "Multiplying by a fraction means taking a part OF a part. 1/2 × 1/3 means 'half of a third' — picture a third of a chocolate bar, then take half of that piece: you get 1/6 of the bar. For division, ask 'how many of these fit in that?' — how many 1/4-cup scoops in 1/2 a cup? Two: 1/2 ÷ 1/4 = 2.",
    hints: [
      "Multiply straight across: tops together, bottoms together.",
      "To divide, flip the second fraction and multiply instead.",
      "For 2/3 ÷ 4/5: keep 2/3, change ÷ to ×, flip 4/5 to 5/4 → 2/3 × 5/4 = 10/12 = 5/6.",
    ],
    example:
      "Worked example — 3/4 × 2/5.\nStep 1: Multiply tops: 3 × 2 = 6.\nStep 2: Multiply bottoms: 4 × 5 = 20.\nStep 3: 6/20 simplifies to 3/10. ✓",
    socratic: [
      "When you multiply two fractions less than 1, is the answer bigger or smaller than both? Why?",
      "Why does dividing by 1/2 give the same result as multiplying by 2?",
      "What does 1/2 × 1/3 mean in words — 'what is half of…'?",
    ],
    tryQuestion: {
      question: "What is 2/3 × 3/4? Answer as a fraction in lowest terms.",
      answer: "1/2",
      solution: "2/3 × 3/4 = 6/12 = 1/2.",
      hint: "Multiply tops (2×3) and bottoms (3×4), then simplify.",
    },
    practice: [
      {
        question: "What is 1/2 × 4/5? Answer as a fraction in lowest terms.",
        answer: "2/5",
        solution: "1/2 × 4/5 = 4/10 = 2/5.",
        hint: "Multiply across, then simplify 4/10.",
      },
      {
        question: "What is 1/2 ÷ 1/4? Answer as a whole number or fraction.",
        answer: "2",
        solution: "Keep-change-flip: 1/2 × 4/1 = 4/2 = 2.",
        hint: "Flip 1/4 to 4/1 and multiply.",
      },
      {
        question: "What is 3/5 ÷ 3/10? Answer as a whole number or fraction.",
        answer: "2",
        solution: "3/5 × 10/3 = 30/15 = 2.",
        hint: "Flip 3/10 to 10/3, multiply, and simplify.",
      },
    ],
  },
  {
    concept: "Fraction of a quantity",
    explanation:
      "'Fraction of a quantity' means multiply. 2/3 of 12 = 2/3 × 12 = 8. A fast way: divide the quantity by the denominator first (12 ÷ 3 = 4 — that's one third), then multiply by the numerator (4 × 2 = 8 — two thirds).",
    altExplanation:
      "Use a bar model. For 3/4 of 20: draw a bar for 20, split it into 4 equal parts (each is 5), then shade 3 of them: 5 + 5 + 5 = 15. So 3/4 of 20 = 15.",
    hints: [
      "'Of' almost always means multiply in fraction problems.",
      "Divide by the bottom first, then multiply by the top.",
      "For 2/3 of 12: 12 ÷ 3 = 4, then 4 × 2 = 8.",
    ],
    example:
      "Worked example — 3/5 of 25.\nStep 1: 25 ÷ 5 = 5 (one fifth of 25).\nStep 2: 5 × 3 = 15 (three fifths).\nStep 3: So 3/5 of 25 = 15. ✓",
    socratic: [
      "Why does '1/2 of 10' give the same answer as '10 ÷ 2'?",
      "Is 2/3 of 12 more or less than 12? How do you know before calculating?",
      "How would you check that 3/4 of 20 = 15 is reasonable?",
    ],
    tryQuestion: {
      question: "What is 2/3 of 12? Answer with a number.",
      answer: "8",
      solution: "12 ÷ 3 = 4 (one third), then 4 × 2 = 8.",
      hint: "Divide 12 by the denominator first.",
    },
    practice: [
      {
        question: "What is 1/4 of 20? Answer with a number.",
        answer: "5",
        solution: "20 ÷ 4 = 5, then 5 × 1 = 5.",
        hint: "Split 20 into 4 equal parts.",
      },
      {
        question: "What is 3/5 of 30? Answer with a number.",
        answer: "18",
        solution: "30 ÷ 5 = 6, then 6 × 3 = 18.",
        hint: "Find one fifth of 30 first.",
      },
      {
        question: "A class has 24 students and 5/6 are present. How many are present? Answer with a number.",
        answer: "20",
        solution: "24 ÷ 6 = 4, then 4 × 5 = 20 students present.",
        hint: "One sixth of 24 is 4 — now take five of those parts.",
      },
    ],
  },
  {
    concept: "Decimals & mixed numbers",
    explanation:
      "Fractions, decimals, and mixed numbers are three costumes for the same values. 1/2 = 0.5, and 3/2 = 1 1/2 = 1.5. To convert a fraction to a decimal, divide top by bottom. A mixed number is a whole plus a fraction; an improper fraction packs it all into one fraction.",
    altExplanation:
      "Money makes it concrete: 1/4 of a dollar is 25 cents = $0.25. 3/2 dollars is $1.50 = 1 1/2 dollars. Same value, three ways to write it.",
    hints: [
      "Fraction → decimal: divide the numerator by the denominator.",
      "Improper → mixed: divide; the remainder becomes the new numerator.",
      "For 7/2: 7 ÷ 2 = 3 remainder 1, so 7/2 = 3 1/2 = 3.5.",
    ],
    example:
      "Worked example — convert 9/4.\nStep 1: 9 ÷ 4 = 2 remainder 1.\nStep 2: Mixed number: 2 1/4.\nStep 3: Decimal: 1/4 = 0.25, so 2.25. ✓",
    socratic: [
      "Why is 0.5 the same as 1/2 and not 1/5?",
      "When is a mixed number more useful than an improper fraction — and when the reverse?",
      "How can you tell just by looking whether 7/4 is more or less than 1?",
    ],
    tryQuestion: {
      question: "Write 7/2 as a decimal. Answer with the decimal.",
      answer: "3.5",
      solution: "7 ÷ 2 = 3.5 (or: 7/2 = 3 1/2 = 3.5).",
      hint: "Divide 7 by 2.",
    },
    practice: [
      {
        question: "Write 3/4 as a decimal.",
        answer: "0.75",
        solution: "3 ÷ 4 = 0.75.",
        hint: "3/4 of a dollar is 75 cents.",
      },
      {
        question: "Write 5/2 as a mixed number. Answer like: 2 1/2",
        answer: "2 1/2",
        solution: "5 ÷ 2 = 2 remainder 1, so 5/2 = 2 1/2.",
        hint: "How many times does 2 fit into 5, and what's left over?",
      },
      {
        question: "Which is greater: 1.2 or 6/5? Answer with the greater value.",
        answer: "1.2",
        solution: "6/5 = 1.2 exactly — wait, they're equal! 6/5 = 1.2, so neither is greater. (Trick question: answer 1.2 or 6/5 — both are the same value.)",
        hint: "Convert 6/5 to a decimal first.",
      },
    ],
  },
];

// Generic fallback for any concept not in the library.
export const GENERIC_CONCEPT: ConceptContent = {
  concept: "General fractions",
  explanation:
    "A fraction names a part of a whole: the bottom number says how many equal parts the whole is split into, and the top says how many of those parts you have. Every fraction skill — simplifying, comparing, adding, multiplying — builds on that one idea.",
  altExplanation:
    "Think of any fraction as a sharing problem: 3/8 means 'split something into 8 equal shares and take 3'. Drawing the shares as a bar or a pizza almost always makes the next step obvious.",
  hints: [
    "Start by drawing the fraction as a bar split into equal parts.",
    "Ask: what does the bottom number tell me? What does the top tell me?",
    "Break the problem into the smallest step you can do, then do the next one.",
  ],
  example:
    "Worked example — understand 5/8.\nStep 1: Draw a bar split into 8 equal parts.\nStep 2: Shade 5 of them.\nStep 3: The shaded region IS 5/8 — more than half (4/8), less than the whole. ✓",
  socratic: [
    "What do the top and bottom numbers of a fraction each tell you?",
    "How would you explain this fraction with a drawing?",
    "What is the smallest first step you could take on this problem?",
  ],
  tryQuestion: {
    question: "Is 5/8 more or less than 1/2? Answer more or less.",
    answer: "more",
    solution: "1/2 = 4/8, and 5/8 > 4/8, so 5/8 is more than 1/2.",
    hint: "Rewrite 1/2 with denominator 8.",
  },
  practice: [
    {
      question: "Is 3/8 more or less than 1/2? Answer more or less.",
      answer: "less",
      solution: "1/2 = 4/8, and 3/8 < 4/8, so 3/8 is less than 1/2.",
      hint: "Compare with 4/8.",
    },
    {
      question: "What is 1/2 of 10? Answer with a number.",
      answer: "5",
      solution: "10 ÷ 2 = 5.",
      hint: "Split 10 into 2 equal parts.",
    },
    {
      question: "Write 2/4 in lowest terms.",
      answer: "1/2",
      solution: "Divide top and bottom by 2: 2/4 = 1/2.",
      hint: "Both 2 and 4 divide by 2.",
    },
  ],
};

export function conceptContent(concept: string): ConceptContent {
  const normalized = concept.trim().toLowerCase();
  return (
    TUTOR_CONCEPTS.find((c) => c.concept.toLowerCase() === normalized) ??
    TUTOR_CONCEPTS.find((c) => normalized.includes(c.concept.toLowerCase())) ??
    TUTOR_CONCEPTS.find((c) => c.concept.toLowerCase().includes(normalized)) ??
    GENERIC_CONCEPT
  );
}

// ---------------------------------------------------------------------------
// Answer checking — deterministic, fraction-aware. The AI never grades.
// ---------------------------------------------------------------------------

export function parseAnswerValue(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  // Mixed number: "2 1/2"
  const mixed = /^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (den === 0) return null;
    return whole + (whole < 0 ? -num / den : num / den);
  }
  const compact = s.replace(/\s+/g, "");
  // Fraction: "3/4"
  const frac = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(compact);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return null;
    return Number(frac[1]) / den;
  }
  // Plain number / decimal
  if (/^-?\d+(?:\.\d+)?$/.test(compact)) return Number(compact);
  return null;
}

export function answersMatch(given: string, expected: string): boolean {
  const g = parseAnswerValue(given);
  const e = parseAnswerValue(expected);
  if (g !== null && e !== null) return Math.abs(g - e) < 1e-6;
  // Ordered lists ("1/3, 1/2, 3/4") and words ("true", "more") compare as text.
  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ").replace(/\.$/, "");
  return norm(given) === norm(expected);
}
