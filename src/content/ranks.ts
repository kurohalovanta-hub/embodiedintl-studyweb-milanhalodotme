import type { RankDef } from "@/lib/types";

// Rank ladder (HANDOVER §21): evidence-gated, never time-gated.
// levelCompletion: [level, fraction of that level's core nodes at >= their gate tier].
export const RANKS: RankDef[] = [
  { index: 0, title: "Initiate", requires: "Begin.", },
  {
    index: 1, title: "Computational Apprentice",
    requires: "Level 0 survival complete: you operate a research environment.",
    levelCompletion: [[0, 0.9]],
  },
  {
    index: 2, title: "Mathematical Operator",
    requires: "Programming Boss + Math Boss defeated; the bootloader holds.",
    bossIds: ["boss-programming", "boss-math"],
    levelCompletion: [[1, 0.8], [2, 0.8]],
  },
  {
    index: 3, title: "ML Builder",
    requires: "Learning systems derived and built from raw NumPy.",
    levelCompletion: [[3, 0.9]],
  },
  {
    index: 4, title: "Deep Learning Practitioner",
    requires: "DL Boss defeated. You can build transformers and fix them when they break.",
    bossIds: ["boss-dl"],
    levelCompletion: [[4, 0.8]],
  },
  {
    index: 5, title: "Roboticist",
    requires: "Robotics Boss defeated + control/estimation project gates passed.",
    bossIds: ["boss-robotics"],
    levelCompletion: [[5, 0.8], [6, 0.7]],
  },
  {
    index: 6, title: "Autonomous Systems Builder",
    requires: "Autonomy Boss defeated: the classical stack, integrated by you.",
    bossIds: ["boss-autonomy"],
    levelCompletion: [[7, 0.7], [8, 0.7], [9, 0.7]],
  },
  {
    index: 7, title: "Robot Learning Practitioner",
    requires: "Robot Learning Boss defeated: policies trained, compared, and understood statistically.",
    bossIds: ["boss-robot-learning"],
    levelCompletion: [[10, 0.7], [11, 0.8]],
  },
  {
    index: 8, title: "Embodied AI Practitioner",
    requires: "VLA Boss defeated: a frontier-lineage fine-tune evaluated like a researcher.",
    bossIds: ["boss-vla"],
    levelCompletion: [[12, 0.8]],
  },
  {
    index: 9, title: "Research Apprentice",
    requires: "The rigorous reproduction shipped; methodology nodes Gold.",
    levelCompletion: [[13, 0.6], [15, 0.85]],
  },
  {
    index: 10, title: "Independent Researcher",
    requires: "Final Boss: an original hypothesis tested rigorously and defended.",
    bossIds: ["boss-final"],
    levelCompletion: [[16, 0.9]],
  },
];
