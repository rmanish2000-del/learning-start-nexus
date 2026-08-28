import type { UnitExtension } from "../extension-types";
import type { AuthoredQuestion, AuthoredTopic } from "../authoring";

// -------- Extra questions for existing outcomes --------

const extraO1_CropVariety: AuthoredQuestion[] = [
  {
    kind: "true_false",
    difficulty: 1,
    prompt: "Kharif crops are sown at the start of the monsoon and harvested in autumn.",
    options: ["True", "False"],
    answer: "True",
    explanation:
      "Kharif crops such as paddy and maize are sown around June-July with the onset of rains and harvested around September-October.",
  },
  {
    kind: "applied_mcq",
    difficulty: 3,
    prompt:
      "A farmer wants a wheat variety that resists lodging in strong wind. Which trait should the seed catalogue highlight for this need?",
    options: ["High protein content", "Short and sturdy stem", "Early maturity", "Attractive grain colour"],
    answer: "Short and sturdy stem",
    explanation:
      "Lodging is the bending or falling of tall, weak stems under wind or rain; a short, sturdy stem resists this and keeps the crop standing.",
  },
  {
    kind: "assertion_reason",
    difficulty: 4,
    prompt:
      "Assertion (A): Excessive use of chemical fertiliser over many years can reduce soil fertility. Reason (R): Fertilisers add only mineral nutrients and do not replenish soil organic matter.",
    options: [
      "Both A and R are true and R is the correct explanation of A",
      "Both A and R are true but R is not the correct explanation of A",
      "A is true but R is false",
      "A is false but R is true",
    ],
    answer: "Both A and R are true and R is the correct explanation of A",
    explanation:
      "Repeated fertiliser use without organic matter can degrade soil structure and microbial activity, since fertilisers supply nutrients but not humus.",
  },
  {
    kind: "mcq",
    difficulty: 2,
    prompt: "Which of these is an example of a desirable agronomic trait bred into an improved crop variety?",
    options: ["Susceptibility to pests", "Resistance to lodging", "Longer maturity period", "Low yield stability"],
    answer: "Resistance to lodging",
    explanation:
      "Crop variety improvement programmes select for traits like lodging resistance, disease resistance, higher yield and better quality that benefit the farmer.",
  },
];

const extraO2_AnimalHusbandry: AuthoredQuestion[] = [
  {
    kind: "mcq",
    difficulty: 2,
    prompt: "Broiler poultry birds are reared mainly for which purpose?",
    options: ["Egg production", "Meat production", "Wool production", "Draught labour"],
    answer: "Meat production",
    explanation:
      "Broilers are chicken varieties selected and reared specifically for meat, growing quickly to market weight, unlike layers which are kept for eggs.",
  },
  {
    kind: "true_false",
    difficulty: 1,
    prompt: "Cross-breeding is used in cattle rearing to combine high milk yield with disease resistance.",
    options: ["True", "False"],
    answer: "True",
    explanation:
      "Cross-breeding mates a high-yielding exotic breed with a disease-resistant local breed so offspring inherit both desirable traits.",
  },
  {
    kind: "applied_mcq",
    difficulty: 3,
    prompt:
      "A dairy farmer notices her cows fall ill often despite giving good milk yield. Which breeding approach would most directly address disease resistance while retaining yield?",
    options: [
      "Inbreeding within the same herd",
      "Cross-breeding with a disease-resistant indigenous breed",
      "Feeding only concentrated feed",
      "Increasing the milking frequency",
    ],
    answer: "Cross-breeding with a disease-resistant indigenous breed",
    explanation:
      "Cross-breeding introduces genes for disease resistance from indigenous breeds while the exotic parentage maintains higher milk yield.",
  },
  {
    kind: "short_answer",
    difficulty: 3,
    prompt: "Name two categories of feed given to dairy cattle to maintain both maintenance and milk production.",
    answer: "Roughage and concentrate",
    explanation:
      "Roughage (fibrous fodder) meets maintenance needs while concentrate (nutrient-dense feed) supports the additional demand of milk production.",
  },
];

// -------- New topic 1: Crop variety improvement and desirable traits --------

const topicVarietyImprovement: AuthoredTopic = {
  title: "Crop variety improvement",
  outcomes: [
    {
      title: "Explain how crop varieties are improved for desirable agronomic traits",
      category: "conceptual",
      bloom: "understand",
      difficulty: 2,
      weight: 3,
      types: ["mcq", "short_answer", "true_false", "applied_mcq"],
      atoms: [
        "List desirable traits sought in improved crop varieties",
        "Describe hybridisation as a method of crop improvement",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 1,
          prompt: "Which of the following is NOT a commonly desired trait in an improved crop variety?",
          options: ["Higher yield", "Disease resistance", "Poor storage quality", "Better grain quality"],
          answer: "Poor storage quality",
          explanation:
            "Breeders aim for traits that benefit farmers and consumers, such as high yield, disease resistance and good storage quality, not poor storage quality.",
        },
        {
          kind: "true_false",
          difficulty: 1,
          prompt: "Hybridisation involves crossing genetically different plants to combine desirable traits in the offspring.",
          options: ["True", "False"],
          answer: "True",
          explanation:
            "Hybridisation crosses two plants with different desirable characters so that the resulting hybrid combines the best traits of both parents.",
        },
        {
          kind: "short_answer",
          difficulty: 2,
          prompt: "State one reason plant breeders develop crop varieties with early maturity.",
          answer: "Early-maturing varieties allow farmers to grow more crops in a year, increasing overall cropping intensity.",
          explanation:
            "A shorter growing period frees the field sooner for the next crop, which raises the number of crop cycles possible per year on the same land.",
        },
        {
          kind: "applied_mcq",
          difficulty: 3,
          prompt:
            "A region frequently faces a fungal leaf blight that reduces rice yield. Which improvement strategy would most directly protect future harvests?",
          options: [
            "Breeding rice varieties resistant to the blight",
            "Increasing irrigation frequency only",
            "Switching to a taller variety",
            "Delaying the sowing date by one month",
          ],
          answer: "Breeding rice varieties resistant to the blight",
          explanation:
            "Introducing genetic resistance to the specific pathogen directly reduces crop losses, whereas irrigation or sowing changes do not address the disease itself.",
        },
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "Improved crop varieties are often selected for wider climatic adaptability so that they can:",
          options: [
            "Grow only in one narrow climate zone",
            "Be grown successfully in varied climatic conditions",
            "Require no water at all",
            "Avoid producing seeds",
          ],
          answer: "Be grown successfully in varied climatic conditions",
          explanation:
            "Wide adaptability allows the same variety to perform well across different regions and seasons, which is valuable for large-scale cultivation.",
        },
        {
          kind: "assertion_reason",
          difficulty: 4,
          prompt:
            "Assertion (A): Improved crop varieties can increase quality of produce along with yield. Reason (R): Quality traits such as protein content or oil content in seeds can be selected for during breeding.",
          options: [
            "Both A and R are true and R is the correct explanation of A",
            "Both A and R are true but R is not the correct explanation of A",
            "A is true but R is false",
            "A is false but R is true",
          ],
          answer: "Both A and R are true and R is the correct explanation of A",
          explanation:
            "Breeding programmes select for nutritional and quality traits alongside yield, so improved varieties can be both higher-yielding and better in quality.",
        },
      ],
    },
  ],
};

// -------- New topic 2: Nutrient management --------

const topicNutrientManagement: AuthoredTopic = {
  title: "Nutrient management in crop production",
  outcomes: [
    {
      title: "Compare sources of plant nutrients and methods of nutrient management",
      category: "conceptual",
      bloom: "understand",
      difficulty: 2,
      weight: 3,
      types: ["mcq", "short_answer", "true_false", "applied_mcq"],
      atoms: [
        "Distinguish macro-nutrients and micro-nutrients required by plants",
        "Compare organic manure, biofertilisers and chemical fertilisers",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "Which of the following is a macro-nutrient required by plants in relatively large amounts?",
          options: ["Nitrogen", "Boron", "Zinc", "Molybdenum"],
          answer: "Nitrogen",
          explanation:
            "Nitrogen, phosphorus and potassium are macro-nutrients needed in large quantities, while boron, zinc and molybdenum are micro-nutrients needed in traces.",
        },
        {
          kind: "true_false",
          difficulty: 1,
          prompt: "Biofertilisers use living microorganisms to enrich soil with nutrients such as nitrogen.",
          options: ["True", "False"],
          answer: "True",
          explanation:
            "Biofertilisers contain organisms like nitrogen-fixing bacteria that convert atmospheric nitrogen into forms plants can absorb, enriching the soil biologically.",
        },
        {
          kind: "short_answer",
          difficulty: 3,
          prompt: "Explain why compost is considered environmentally beneficial compared to synthetic fertiliser overuse.",
          answer:
            "Compost recycles organic waste into humus that improves soil structure without the runoff and pollution risks of excess synthetic fertiliser.",
          explanation:
            "Compost is made from decomposed organic matter, improving soil texture and water retention, whereas excess synthetic fertiliser can leach into water bodies and cause pollution such as eutrophication.",
        },
        {
          kind: "applied_mcq",
          difficulty: 4,
          prompt:
            "A field has been fertilised heavily every season for years, and nearby ponds show excessive algal growth. Which practice most likely caused the pond problem?",
          options: [
            "Crop rotation with legumes",
            "Nutrient runoff from excess chemical fertiliser",
            "Use of organic compost only",
            "Intercropping with pulses",
          ],
          answer: "Nutrient runoff from excess chemical fertiliser",
          explanation:
            "Excess nitrogen and phosphorus from over-fertilised fields can wash into water bodies, causing eutrophication and excessive algal growth.",
        },
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "Growing a leguminous crop between two cereal crops mainly helps to replenish which nutrient in the soil?",
          options: ["Nitrogen", "Potassium", "Iron", "Sulphur"],
          answer: "Nitrogen",
          explanation:
            "Leguminous plants host nitrogen-fixing bacteria in root nodules that convert atmospheric nitrogen into usable compounds, enriching soil nitrogen.",
        },
        {
          kind: "true_false",
          difficulty: 2,
          prompt: "Chemical fertilisers act more slowly than organic manure in supplying nutrients to plants.",
          options: ["True", "False"],
          answer: "False",
          explanation:
            "Chemical fertilisers are readily soluble and act quickly, whereas organic manure releases nutrients gradually as it decomposes.",
        },
        {
          kind: "short_answer",
          difficulty: 3,
          prompt: "Give one reason crop rotation with different nutrient demands helps maintain soil fertility.",
          answer: "It prevents the depletion of any one nutrient because different crops draw on different nutrients from the soil.",
          explanation:
            "Continuous cultivation of the same crop depletes specific nutrients; rotating crops with different nutrient requirements balances nutrient use and helps restore fertility.",
        },
      ],
    },
  ],
};

// -------- New topic 3: Irrigation and cropping patterns --------

const topicIrrigationCropping: AuthoredTopic = {
  title: "Irrigation methods and cropping patterns",
  outcomes: [
    {
      title: "Describe irrigation methods and cropping patterns that improve water-use efficiency and yield",
      category: "application",
      bloom: "apply",
      difficulty: 3,
      weight: 3,
      types: ["mcq", "short_answer", "true_false", "applied_mcq"],
      atoms: [
        "Compare traditional irrigation sources with modern methods such as drip irrigation",
        "Distinguish mixed cropping, intercropping and crop rotation",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "Drip irrigation is preferred in water-scarce regions mainly because it:",
          options: [
            "Floods the entire field uniformly",
            "Delivers water drop by drop directly near the plant roots, reducing wastage",
            "Requires no water source at all",
            "Increases water evaporation from the soil surface",
          ],
          answer: "Delivers water drop by drop directly near the plant roots, reducing wastage",
          explanation:
            "Drip irrigation supplies water precisely at the root zone in small measured amounts, minimising evaporation and runoff losses compared to flood irrigation.",
        },
        {
          kind: "true_false",
          difficulty: 1,
          prompt: "Intercropping means growing two or more crops in a definite row pattern in the same field at the same time.",
          options: ["True", "False"],
          answer: "True",
          explanation:
            "Intercropping arranges different crops in alternating rows in the same season, allowing efficient use of resources and reducing pest spread.",
        },
        {
          kind: "applied_mcq",
          difficulty: 4,
          prompt:
            "A farmer in a drought-prone area wants to conserve water while still irrigating a vegetable field regularly. Which method best suits this need?",
          options: ["Flood irrigation", "Sprinkler or drip irrigation", "Leaving the field unirrigated", "Digging an open uncovered canal"],
          answer: "Sprinkler or drip irrigation",
          explanation:
            "Sprinkler and drip systems apply water efficiently in controlled amounts, conserving water compared to flood irrigation, which is important in drought-prone regions.",
        },
        {
          kind: "short_answer",
          difficulty: 3,
          prompt: "Differentiate mixed cropping from intercropping in one sentence.",
          answer:
            "In mixed cropping, seeds of two or more crops are sown together without a fixed row pattern, while intercropping grows crops in a defined alternating row pattern.",
          explanation:
            "Mixed cropping mixes seeds randomly to reduce risk of total crop failure, whereas intercropping deliberately arranges rows of different crops for efficient resource use.",
        },
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "Which of these is a traditional source of irrigation water still used in many Indian villages?",
          options: ["Drip irrigation", "Wells and tanks", "Fertigation", "Sprinkler system"],
          answer: "Wells and tanks",
          explanation:
            "Wells, tanks, canals and rivers are traditional irrigation sources, while drip and sprinkler systems are modern water-efficient methods.",
        },
        {
          kind: "assertion_reason",
          difficulty: 4,
          prompt:
            "Assertion (A): Crop rotation with a legume crop can reduce the need for nitrogen fertiliser in the following season. Reason (R): Legume roots host bacteria that fix atmospheric nitrogen into the soil.",
          options: [
            "Both A and R are true and R is the correct explanation of A",
            "Both A and R are true but R is not the correct explanation of A",
            "A is true but R is false",
            "A is false but R is true",
          ],
          answer: "Both A and R are true and R is the correct explanation of A",
          explanation:
            "Legumes enrich soil nitrogen through their root-nodule bacteria, so a following cereal crop needs less added nitrogen fertiliser.",
        },
      ],
    },
  ],
};

// -------- New topic 4: Crop protection and storage --------

const topicProtectionStorage: AuthoredTopic = {
  title: "Crop protection and storage of grains",
  outcomes: [
    {
      title: "Explain methods of protecting standing crops and stored grain from losses",
      category: "conceptual",
      bloom: "understand",
      difficulty: 3,
      weight: 3,
      types: ["mcq", "short_answer", "true_false", "applied_mcq"],
      atoms: [
        "Identify weeds, insect pests and pathogens as causes of crop loss",
        "Describe conditions that prevent grain spoilage during storage",
      ],
      questions: [
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "Weeds compete with the main crop mainly for:",
          options: ["Shade only", "Water, nutrients, space and light", "Carbon dioxide only", "Pollinators only"],
          answer: "Water, nutrients, space and light",
          explanation:
            "Weeds are unwanted plants that grow alongside crops and compete for the same resources — water, nutrients, space and sunlight — reducing crop yield.",
        },
        {
          kind: "true_false",
          difficulty: 1,
          prompt: "Storing grain with high moisture content increases the risk of fungal attack and spoilage.",
          options: ["True", "False"],
          answer: "True",
          explanation:
            "Moist grain provides a favourable environment for fungi and insects to grow, leading to spoilage, so grain must be dried before storage.",
        },
        {
          kind: "short_answer",
          difficulty: 3,
          prompt: "Name two factors, besides insects, that cause deterioration of grain during storage.",
          answer: "Moisture and inappropriate temperature",
          explanation:
            "Excess moisture encourages fungal growth and germination, while unsuitable temperature also promotes spoilage; both must be controlled in storage.",
        },
        {
          kind: "applied_mcq",
          difficulty: 4,
          prompt:
            "A farmer stores wheat in sacks in a damp, poorly ventilated room and later finds fungal growth on the grain. What was the most likely primary cause?",
          options: [
            "Excess grain moisture combined with poor ventilation",
            "Too much sunlight exposure",
            "Using pest-resistant seed variety",
            "Storing grain in metal bins",
          ],
          answer: "Excess grain moisture combined with poor ventilation",
          explanation:
            "Damp, poorly ventilated storage keeps grain moisture high, creating ideal conditions for fungal growth and spoilage.",
        },
        {
          kind: "mcq",
          difficulty: 2,
          prompt: "Which practice helps control insect pests on a standing crop without harming it excessively?",
          options: [
            "Timely application of appropriate pesticide at recommended dose",
            "Flooding the field permanently",
            "Removing all irrigation water",
            "Sowing seeds without any prior treatment",
          ],
          answer: "Timely application of appropriate pesticide at recommended dose",
          explanation:
            "Applying the correct pesticide at the right time and dose controls pests effectively while minimising damage to the crop and environment.",
        },
        {
          kind: "true_false",
          difficulty: 2,
          prompt: "Weeding is unnecessary once a crop variety resistant to weeds has been sown.",
          options: ["True", "False"],
          answer: "False",
          explanation:
            "No crop variety eliminates weed competition entirely, so weeding or weed control measures remain necessary even with resistant varieties.",
        },
      ],
    },
  ],
};

export const EXT: UnitExtension = {
  unitId: "C9-SCI-U4",
  newTopics: [
    { chapter: 1, topic: topicVarietyImprovement },
    { chapter: 1, topic: topicNutrientManagement },
    { chapter: 1, topic: topicIrrigationCropping },
    { chapter: 1, topic: topicProtectionStorage },
  ],
  extraQuestions: {
    "C9-SCI-U4-CH1-T1-O1": extraO1_CropVariety,
    "C9-SCI-U4-CH1-T2-O1": extraO2_AnimalHusbandry,
  },
};
