// Extra question bank for C9-SCI-U3 (Motion, Force and Work).
// Original items, aligned to existing outcomes. Draft + unverified.

import type { UnitExtension } from "../extension-types";

export const EXT: UnitExtension = {
  unitId: "C9-SCI-U3",
  newTopics: [],
  extraQuestions: {
    "C9-SCI-U3-CH1-T1-O1": [
      {
        kind: "applied_mcq",
        difficulty: 2,
        prompt:
          "A car starts from rest and accelerates uniformly at 2 m/s² for 5 s. What is its final velocity?",
        options: ["5 m/s", "10 m/s", "15 m/s", "20 m/s"],
        answer: "10 m/s",
        explanation: "Using v = u + at: v = 0 + 2 x 5 = 10 m/s.",
      },
      {
        kind: "short_answer",
        difficulty: 3,
        prompt:
          "A cyclist covers 300 m north then 400 m east in 100 s. Find the magnitude of displacement.",
        answer: "500 m",
        explanation:
          "Displacement magnitude = sqrt(300^2 + 400^2) = sqrt(90000+160000) = sqrt(250000) = 500 m.",
      },
    ],
    "C9-SCI-U3-CH1-T2-O1": [
      {
        kind: "mcq",
        difficulty: 2,
        prompt:
          "On a velocity-time graph, a straight horizontal line parallel to the time axis represents",
        options: [
          "uniform acceleration",
          "uniform velocity",
          "uniform retardation",
          "an object at rest",
        ],
        answer: "uniform velocity",
        explanation:
          "A horizontal v-t line has zero slope, so acceleration is zero and velocity stays constant.",
      },
      {
        kind: "applied_mcq",
        difficulty: 3,
        prompt:
          "A body moves in a circle of radius 7 m at constant speed, completing one round in 22 s. Its speed is (use pi = 22/7)",
        options: ["1 m/s", "2 m/s", "3 m/s", "4 m/s"],
        answer: "2 m/s",
        explanation:
          "Speed = circumference / time = (2 x 22/7 x 7) / 22 = 44/22 = 2 m/s.",
      },
    ],
    "C9-SCI-U3-CH2-T1-O1": [
      {
        kind: "true_false",
        difficulty: 1,
        prompt:
          "A passenger standing in a bus tends to fall backward when the bus suddenly starts moving forward, due to inertia of rest.",
        options: ["True", "False"],
        answer: "True",
        explanation:
          "By Newton's first law, the passenger's body resists the sudden change from rest, causing a backward lurch.",
      },
      {
        kind: "applied_mcq",
        difficulty: 3,
        prompt:
          "A net force of 15 N acts on a block of mass 3 kg initially at rest. What acceleration does it produce?",
        options: ["3 m/s²", "5 m/s²", "8 m/s²", "45 m/s²"],
        answer: "5 m/s²",
        explanation: "Using F = ma: a = F/m = 15/3 = 5 m/s².",
      },
    ],
    "C9-SCI-U3-CH2-T2-O1": [
      {
        kind: "short_answer",
        difficulty: 2,
        prompt: "Calculate the momentum of a 4 kg object moving at 6 m/s.",
        answer: "24 kg m/s",
        explanation: "Momentum p = mv = 4 x 6 = 24 kg m/s.",
      },
      {
        kind: "applied_mcq",
        difficulty: 4,
        prompt:
          "A 2 kg trolley moving at 3 m/s collides with a stationary 1 kg trolley and they stick together. Find their common velocity.",
        options: ["1 m/s", "2 m/s", "3 m/s", "4 m/s"],
        answer: "2 m/s",
        explanation:
          "By conservation of momentum: 2x3 + 1x0 = (2+1)v, so 6 = 3v, v = 2 m/s.",
      },
    ],
    "C9-SCI-U3-CH3-T1-O1": [
      {
        kind: "mcq",
        difficulty: 2,
        prompt:
          "The weight of an object of mass 5 kg on Earth's surface (g = 10 m/s²) is",
        options: ["5 N", "10 N", "50 N", "500 N"],
        answer: "50 N",
        explanation: "Weight W = mg = 5 x 10 = 50 N.",
      },
      {
        kind: "assertion_reason",
        difficulty: 4,
        prompt:
          "Assertion: The mass of an object is the same on the Earth and on the Moon. Reason: The gravitational force of attraction on an object depends on the mass of the planet.",
        options: [
          "Both assertion and reason are true, and reason correctly explains assertion",
          "Both assertion and reason are true, but reason does not correctly explain assertion",
          "Assertion is true but reason is false",
          "Assertion is false but reason is true",
        ],
        answer:
          "Both assertion and reason are true, but reason does not correctly explain assertion",
        explanation:
          "Mass stays constant everywhere as it depends only on the object, while weight changes because g differs on the Moon; the reason is a true fact but does not explain why mass is constant.",
      },
    ],
    "C9-SCI-U3-CH3-T2-O1": [
      {
        kind: "applied_mcq",
        difficulty: 3,
        prompt:
          "A force of 40 N acts perpendicularly on an area of 2 m². The pressure exerted is",
        options: ["10 Pa", "20 Pa", "40 Pa", "80 Pa"],
        answer: "20 Pa",
        explanation: "Pressure P = F/A = 40/2 = 20 Pa.",
      },
      {
        kind: "true_false",
        difficulty: 2,
        prompt:
          "According to Archimedes' principle, an object floats only if its density is less than or equal to the density of the fluid it is placed in.",
        options: ["True", "False"],
        answer: "True",
        explanation:
          "An object floats when the upthrust from displaced fluid equals its weight, which occurs when its average density does not exceed the fluid's density.",
      },
    ],
    "C9-SCI-U3-CH4-T1-O1": [
      {
        kind: "applied_mcq",
        difficulty: 2,
        prompt:
          "A boy pushes a box with a force of 20 N and moves it 5 m in the direction of the force. The work done is",
        options: ["4 J", "15 J", "25 J", "100 J"],
        answer: "100 J",
        explanation: "Work W = F x d = 20 x 5 = 100 J.",
      },
      {
        kind: "short_answer",
        difficulty: 3,
        prompt:
          "Find the kinetic energy of a 2 kg ball moving with a speed of 5 m/s.",
        answer: "25 J",
        explanation: "KE = 1/2 m v^2 = 0.5 x 2 x 25 = 25 J.",
      },
    ],
    "C9-SCI-U3-CH4-T2-O1": [
      {
        kind: "applied_mcq",
        difficulty: 3,
        prompt:
          "A motor does 600 J of work in 20 s. What is its power output?",
        options: ["10 W", "30 W", "600 W", "12000 W"],
        answer: "30 W",
        explanation: "Power P = W/t = 600/20 = 30 W.",
      },
      {
        kind: "mcq",
        difficulty: 2,
        prompt:
          "When a ball is dropped from a height and falls freely under gravity, ignoring air resistance, its",
        options: [
          "kinetic energy decreases and potential energy increases",
          "total mechanical energy remains constant",
          "total mechanical energy keeps decreasing",
          "potential energy alone remains constant",
        ],
        answer: "total mechanical energy remains constant",
        explanation:
          "By the law of conservation of energy, potential energy converts to kinetic energy so their sum stays constant in free fall without friction.",
      },
    ],
    "C9-SCI-U3-CH5-T1-O1": [
      {
        kind: "mcq",
        difficulty: 2,
        prompt:
          "Sound waves travelling through air are best described as",
        options: [
          "transverse waves",
          "longitudinal waves",
          "electromagnetic waves",
          "standing waves only",
        ],
        answer: "longitudinal waves",
        explanation:
          "In sound waves, particles of the medium vibrate parallel to the direction of wave propagation, which defines a longitudinal wave.",
      },
      {
        kind: "applied_mcq",
        difficulty: 3,
        prompt:
          "A sound wave has a frequency of 250 Hz and wavelength of 1.4 m. What is its speed?",
        options: ["178.6 m/s", "251.4 m/s", "350 m/s", "500 m/s"],
        answer: "350 m/s",
        explanation: "Speed v = frequency x wavelength = 250 x 1.4 = 350 m/s.",
      },
    ],
    "C9-SCI-U3-CH5-T2-O1": [
      {
        kind: "applied_mcq",
        difficulty: 4,
        prompt:
          "A ship sends a SONAR signal that returns after 4 s. If the speed of sound in water is 1500 m/s, how deep is the sea below the ship?",
        options: ["750 m", "1500 m", "3000 m", "6000 m"],
        answer: "3000 m",
        explanation:
          "Distance travelled by sound = speed x time = 1500 x 4 = 6000 m, and depth is half of that (down and back): 6000/2 = 3000 m.",
      },
      {
        kind: "short_answer",
        difficulty: 3,
        prompt:
          "State the minimum distance between a listener and a reflecting surface needed to hear a distinct echo, taking the speed of sound as 340 m/s (persistence of hearing is 0.1 s).",
        answer: "17 m",
        explanation:
          "Minimum distance = (speed x time)/2 = (340 x 0.1)/2 = 34/2 = 17 m.",
      },
    ],
  },
};
