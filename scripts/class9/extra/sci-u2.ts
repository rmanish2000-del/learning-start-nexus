import type { UnitExtension } from "../extension-types";

export const EXT: UnitExtension = {
  unitId: "C9-SCI-U2",
  newTopics: [
    {
      chapter: 1,
      topic: {
        title: "Cell theory and prokaryotic vs eukaryotic organisation",
        outcomes: [
          {
            title: "Explain the cell theory and differentiate prokaryotic from eukaryotic cells",
            category: "conceptual",
            bloom: "understand",
            difficulty: 2,
            weight: 5,
            types: ["mcq", "true_false", "short_answer", "assertion_reason"],
            atoms: [
              "State the cell theory and identify the cell as the basic structural unit",
              "Compare prokaryotic and eukaryotic cells on the basis of a membrane-bound nucleus",
            ],
            questions: [
              {
                kind: "mcq",
                difficulty: 1,
                prompt: "The cell theory states that all living organisms are composed of cells and that:",
                options: [
                  "cells arise only from pre-existing cells",
                  "every cell contains chlorophyll",
                  "cells always occur singly, never in groups",
                  "only plants are made of cells",
                ],
                answer: "cells arise only from pre-existing cells",
                explanation:
                  "The cell theory holds that the cell is the basic unit of life, all organisms are made of one or more cells, and new cells form by division of existing cells.",
              },
              {
                kind: "true_false",
                difficulty: 1,
                prompt: "A bacterial cell has a well-defined nuclear membrane enclosing its genetic material.",
                options: ["True", "False"],
                answer: "False",
                explanation:
                  "Bacteria are prokaryotes: their genetic material lies free in the cytoplasm as a nucleoid, without a surrounding nuclear membrane.",
              },
              {
                kind: "short_answer",
                difficulty: 2,
                prompt: "Give one structural feature that distinguishes a eukaryotic cell from a prokaryotic cell.",
                answer: "A eukaryotic cell has a nucleus enclosed by a nuclear membrane, unlike a prokaryotic cell.",
                explanation:
                  "Eukaryotic cells possess a true, membrane-bound nucleus and membrane-bound organelles, while prokaryotic cells lack both.",
              },
              {
                kind: "assertion_reason",
                difficulty: 3,
                stimulus:
                  "Assertion: An onion cell and a cheek cell are both classified as eukaryotic cells. Reason: Both cells possess a nucleus enclosed within a nuclear membrane.",
                prompt: "Read the assertion and the reason on cell theory above, then select the statement that judges both correctly.",
                options: [
                  "Both are true and the reason correctly explains the assertion",
                  "Both are true but the reason does not explain the assertion",
                  "The assertion is true but the reason is false",
                  "The assertion is false but the reason is true",
                ],
                answer: "Both are true and the reason correctly explains the assertion",
                explanation:
                  "Both onion and cheek cells have a nuclear membrane enclosing their genetic material, which is precisely why they are grouped as eukaryotic cells.",
              },
            ],
          },
        ],
      },
    },
    {
      chapter: 2,
      topic: {
        title: "Simple permanent plant tissues",
        outcomes: [
          {
            title: "Distinguish parenchyma, collenchyma and sclerenchyma by structure and role",
            category: "conceptual",
            bloom: "understand",
            difficulty: 2,
            weight: 5,
            types: ["mcq", "true_false", "short_answer", "applied_mcq"],
            atoms: [
              "Identify parenchyma, collenchyma and sclerenchyma from cell wall thickness and living status",
              "Relate sclerenchyma's dead, lignified cells to a mechanical support function",
            ],
            questions: [
              {
                kind: "mcq",
                difficulty: 1,
                prompt: "Which simple tissue consists of loosely packed, thin-walled living cells and mainly stores food?",
                options: ["Parenchyma", "Sclerenchyma", "Xylem", "Cambium"],
                answer: "Parenchyma",
                explanation:
                  "Parenchyma cells are living, thin-walled and loosely packed with intercellular spaces, and commonly store food and water in soft plant parts.",
              },
              {
                kind: "true_false",
                difficulty: 2,
                prompt: "Sclerenchyma cells are living at maturity and provide flexibility to plant organs.",
                options: ["True", "False"],
                answer: "False",
                explanation:
                  "Sclerenchyma cells are dead at maturity, with thick lignified walls, and they provide rigidity and mechanical strength rather than flexibility.",
              },
              {
                kind: "short_answer",
                difficulty: 2,
                prompt: "Which simple tissue gives flexibility to the stems of young plants and allows them to bend without breaking?",
                answer: "Collenchyma",
                explanation:
                  "Collenchyma cells have unevenly thickened corners and remain living, giving mechanical support while still permitting some flexibility and growth.",
              },
              {
                kind: "applied_mcq",
                difficulty: 3,
                prompt: "Biting into a pear or guava, one often feels hard gritty specks in the pulp. These specks are groups of:",
                options: ["Parenchyma cells", "Sclerenchyma cells (sclereids)", "Collenchyma cells", "Meristematic cells"],
                answer: "Sclerenchyma cells (sclereids)",
                explanation:
                  "Sclereids are a type of sclerenchyma with extremely thick, lignified walls, forming the hard, gritty groups of cells found in fruits such as guava and pear.",
              },
            ],
          },
        ],
      },
    },
  ],
  extraQuestions: {
    "C9-SCI-U2-CH1-T1-O1": [
      {
        kind: "mcq",
        difficulty: 1,
        prompt: "Which organelle is described as the powerhouse of the cell because it releases energy by respiration?",
        options: ["Mitochondrion", "Ribosome", "Golgi apparatus", "Vacuole"],
        answer: "Mitochondrion",
        explanation:
          "Mitochondria break down food molecules to release energy and store it as ATP, which is why they are called the powerhouses of the cell.",
      },
      {
        kind: "true_false",
        difficulty: 2,
        prompt: "Ribosomes are the sites where proteins are synthesised inside a cell.",
        options: ["True", "False"],
        answer: "True",
        explanation:
          "Ribosomes translate genetic information into polypeptide chains, making them the cell's protein-synthesising machinery.",
      },
      {
        kind: "short_answer",
        difficulty: 3,
        prompt: "What role does the Golgi apparatus play after proteins are made in the endoplasmic reticulum?",
        answer: "It modifies, packages and dispatches these proteins to their destinations inside or outside the cell.",
        explanation:
          "The Golgi apparatus receives materials from the endoplasmic reticulum, packs them into vesicles after chemical modification, and sends them to the correct location.",
      },
      {
        kind: "assertion_reason",
        difficulty: 4,
        stimulus:
          "Assertion: Muscle cells of an athlete contain an unusually large number of mitochondria. Reason: Mitochondria are the main site of ATP generation, and muscle activity demands a continuous energy supply.",
        prompt: "Study the given assertion and reason about cell organelles, and pick the judgement that fits both statements.",
        options: [
          "Both are true and the reason correctly explains the assertion",
          "Both are true but the reason does not explain the assertion",
          "The assertion is true but the reason is false",
          "The assertion is false but the reason is true",
        ],
        answer: "Both are true and the reason correctly explains the assertion",
        explanation:
          "Cells with high energy demand, such as active muscle cells, contain more mitochondria to meet their greater requirement for ATP generated during respiration.",
      },
      {
        kind: "mcq",
        difficulty: 3,
        prompt: "The smooth endoplasmic reticulum in liver cells is chiefly associated with which function?",
        options: [
          "Synthesis of lipids and detoxification of substances",
          "Synthesis of proteins on attached ribosomes",
          "Digestion of worn-out cell organelles",
          "Storage of the cell's genetic material",
        ],
        answer: "Synthesis of lipids and detoxification of substances",
        explanation:
          "Smooth endoplasmic reticulum lacks ribosomes and is mainly involved in lipid synthesis and in detoxifying drugs and poisons, notably in liver cells.",
      },
      {
        kind: "applied_mcq",
        difficulty: 4,
        prompt: "Which cell organelle appears as a large fluid-filled sac that occupies most of a mature plant cell and stores sap?",
        options: ["Vacuole", "Nucleus", "Mitochondrion", "Golgi apparatus"],
        answer: "Vacuole",
        explanation:
          "Mature plant cells typically have one large central vacuole bound by the tonoplast that stores water, sap and wastes, and maintains turgidity.",
      },
    ],
    "C9-SCI-U2-CH1-T2-O1": [
      {
        kind: "mcq",
        difficulty: 1,
        prompt: "The net movement of a substance from a region of its higher concentration to a region of its lower concentration, without using energy, is called:",
        options: ["Diffusion", "Active transport", "Plasmolysis", "Turgor"],
        answer: "Diffusion",
        explanation:
          "Diffusion is the passive movement of particles down their concentration gradient and does not require the cell to expend energy.",
      },
      {
        kind: "true_false",
        difficulty: 2,
        prompt: "Osmosis is the diffusion of water molecules from a region of lower water concentration to a region of higher water concentration across a semi-permeable membrane.",
        options: ["True", "False"],
        answer: "False",
        explanation:
          "Osmosis moves water from a region of higher water concentration (dilute solution) to a region of lower water concentration (concentrated solution) across a semi-permeable membrane.",
      },
      {
        kind: "short_answer",
        difficulty: 2,
        prompt: "State what happens to red blood cells when they are placed in distilled water.",
        answer: "They gain water by osmosis, swell and may burst because distilled water is hypotonic to the cell contents.",
        explanation:
          "Distilled water has a very high water concentration compared with the cell interior, so water enters the cells by osmosis, causing swelling and possible bursting since red blood cells lack a rigid wall.",
      },
      {
        kind: "applied_mcq",
        difficulty: 3,
        prompt: "Raisins soaked in plain water swell up after some time. This happens mainly because:",
        options: [
          "water enters the raisin cells by osmosis as the surrounding water is hypotonic",
          "water leaves the raisin cells by osmosis into the surrounding solution",
          "sugar diffuses out of the raisin faster than water enters",
          "the raisin cells undergo active transport of water",
        ],
        answer: "water enters the raisin cells by osmosis as the surrounding water is hypotonic",
        explanation:
          "The dried raisin has a low internal water concentration, so when placed in plain water, water moves into the cells by osmosis, making the raisin swell.",
      },
      {
        kind: "assertion_reason",
        difficulty: 4,
        stimulus:
          "Assertion: Farmers avoid applying excess chemical fertiliser too close to plant roots. Reason: A highly concentrated fertiliser solution around the roots can draw water out of root cells by osmosis and damage them.",
        prompt: "Considering the assertion and reason on movement of substances across membranes, which single evaluation holds?",
        options: [
          "Both are true and the reason correctly explains the assertion",
          "Both are true but the reason does not explain the assertion",
          "The assertion is true but the reason is false",
          "The assertion is false but the reason is true",
        ],
        answer: "Both are true and the reason correctly explains the assertion",
        explanation:
          "Excess fertiliser makes the soil solution hypertonic to root cells, so water moves out of the roots by osmosis, causing wilting, which is why farmers avoid over-concentration near roots.",
      },
      {
        kind: "mcq",
        difficulty: 3,
        prompt: "State the term for the firm, swollen condition reached when a walled cell absorbs the maximum water it can hold.",
        options: ["Turgidity", "Plasmolysis", "Flaccidity", "Dehydration"],
        answer: "Turgidity",
        explanation:
          "The rigid cell wall resists excess water entry and pushes back on the swollen protoplast, so the cell becomes firm and turgid instead of bursting.",
      },
    ],
    "C9-SCI-U2-CH2-T1-O1": [
      {
        kind: "mcq",
        difficulty: 1,
        prompt: "Which meristem is located at the tips of roots and shoots and is responsible for increase in length?",
        options: ["Apical meristem", "Lateral meristem", "Intercalary meristem", "Ground meristem"],
        answer: "Apical meristem",
        explanation:
          "Apical meristems occur at root and shoot tips and their continuous cell division brings about growth in the length of the plant.",
      },
      {
        kind: "true_false",
        difficulty: 2,
        prompt: "Lateral meristem is responsible for increase in the girth (thickness) of stems and roots.",
        options: ["True", "False"],
        answer: "True",
        explanation:
          "Lateral meristem, such as the vascular cambium, lies parallel to the long axis of the organ and its division increases the diameter of stems and roots.",
      },
      {
        kind: "short_answer",
        difficulty: 3,
        prompt: "Why does grass regain its height quickly after being cut close to the ground?",
        answer: "Because intercalary meristem present at the base of the leaves and internodes keeps dividing and adds new tissue.",
        explanation:
          "Intercalary meristem occurs at the base of leaves or internodes, away from the tip, and its activity allows rapid regrowth after cutting or grazing.",
      },
      {
        kind: "applied_mcq",
        difficulty: 3,
        prompt: "A ring of new wood is added around the stem of a tree every year, increasing its girth. Which tissue is responsible for this?",
        options: ["Vascular cambium (a lateral meristem)", "Apical meristem", "Epidermis", "Sclerenchyma"],
        answer: "Vascular cambium (a lateral meristem)",
        explanation:
          "The vascular cambium is a lateral meristem between xylem and phloem; its cell division each growing season produces the annual growth rings seen in tree trunks.",
      },
      {
        kind: "mcq",
        difficulty: 2,
        prompt: "Phloem mainly functions to transport:",
        options: [
          "Food materials such as sugars from leaves to other plant parts",
          "Water and minerals from roots to leaves",
          "Oxygen from stomata to internal tissues",
          "Waste products out of the plant body",
        ],
        answer: "Food materials such as sugars from leaves to other plant parts",
        explanation:
          "Phloem, made of sieve tubes and companion cells, conducts the products of photosynthesis from leaves to the rest of the plant, in contrast to xylem, which conducts water.",
      },
      {
        kind: "short_answer",
        difficulty: 4,
        prompt: "How do the cells of meristematic tissue generally differ in shape from the cells of permanent tissue?",
        answer: "Meristematic cells are small, thin-walled and roughly spherical or polygonal with dense cytoplasm, while permanent tissue cells are larger and often specialised in shape.",
        explanation:
          "Because meristematic cells divide repeatedly, they stay compact with little vacuolation and dense cytoplasm; once they differentiate into permanent tissue, they enlarge and take on shapes suited to a specific function.",
      },
    ],
    "C9-SCI-U2-CH2-T2-O1": [
      {
        kind: "mcq",
        difficulty: 1,
        prompt: "Which tissue forms the outer covering of the body and lines internal cavities such as the gut?",
        options: ["Epithelial tissue", "Connective tissue", "Muscular tissue", "Nervous tissue"],
        answer: "Epithelial tissue",
        explanation:
          "Epithelial tissue consists of closely packed cells forming continuous sheets that cover body surfaces and line internal organs and cavities.",
      },
      {
        kind: "true_false",
        difficulty: 2,
        prompt: "Neurons, the structural units of nervous tissue, are specialised to conduct electrical impulses over long distances.",
        options: ["True", "False"],
        answer: "True",
        explanation:
          "A neuron has a cell body with long extensions called axons and dendrites that allow it to receive and transmit nerve impulses rapidly across distances.",
      },
      {
        kind: "short_answer",
        difficulty: 3,
        prompt: "Name the connective tissue that binds bones to each other at joints, and state one feature suited to this role.",
        answer: "Ligament; it is fibrous and elastic, allowing some flexibility while firmly holding bones together at a joint.",
        explanation:
          "Ligaments are strong yet slightly elastic bands of connective tissue that connect bone to bone, stabilising joints while permitting a controlled range of movement.",
      },
      {
        kind: "applied_mcq",
        difficulty: 3,
        prompt: "Which epithelial type consists of a single layer of elongated, pillar-shaped cells lining the intestine for efficient nutrient uptake?",
        options: [
          "Columnar epithelium",
          "Squamous epithelium",
          "Cardiac muscle",
          "Adipose tissue",
        ],
        answer: "Columnar epithelium",
        explanation:
          "Columnar epithelial cells are tall and pillar-like, often bearing microvilli, and line the intestine where their shape and arrangement favour absorption and secretion.",
      },
      {
        kind: "mcq",
        difficulty: 2,
        prompt: "Which type of muscle tissue is spindle-shaped, unstriated and found in the walls of the stomach and blood vessels?",
        options: ["Smooth muscle", "Skeletal muscle", "Cardiac muscle", "Areolar tissue"],
        answer: "Smooth muscle",
        explanation:
          "Smooth (unstriated) muscle cells are spindle-shaped and involuntary, forming the walls of internal organs such as the stomach, intestine and blood vessels.",
      },
      {
        kind: "assertion_reason",
        difficulty: 4,
        stimulus:
          "Assertion: Adipose tissue is classified as a connective tissue. Reason: Its cells are packed with fat and are embedded in a matrix, similar to other connective tissues.",
        prompt: "Evaluate the assertion together with its reason on animal tissues and identify the correct verdict.",
        options: [
          "Both are true and the reason correctly explains the assertion",
          "Both are true but the reason does not explain the assertion",
          "The assertion is true but the reason is false",
          "The assertion is false but the reason is true",
        ],
        answer: "Both are true and the reason correctly explains the assertion",
        explanation:
          "Adipose tissue stores fat within cells set in a sparse matrix, and this matrix-embedded cellular arrangement is the defining feature that places it among connective tissues.",
      },
    ],
  },
};
