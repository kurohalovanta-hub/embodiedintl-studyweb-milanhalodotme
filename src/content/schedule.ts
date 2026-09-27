import type { Block } from "@/lib/types";

// The daily operating template (HANDOVER §9) — minutes per block at the default
// 6 h/day target; the scheduler scales these to the user's dailyHoursTarget.
export const DAY_TEMPLATE: { block: Block; minutes: number; label: string; hint: string }[] = [
  { block: "math", minutes: 105, label: "Math / theory", hint: "Learn, derive, solve: the math-track frontier node" },
  { block: "implementation", minutes: 90, label: "Implementation", hint: "Code the idea: the code-track frontier node" },
  { block: "specialization", minutes: 90, label: "Core specialization", hint: "The current robotics/ML/embodied topic" },
  { block: "project", minutes: 75, label: "Project / experiment", hint: "Integrate: the active project's next step" },
  { block: "review", minutes: 25, label: "Retrieval & review", hint: "Spaced recall from the review queue, closed book first" },
];

// Research-mode template (Month 7 / HANDOVER §30).
export const RESEARCH_DAY_TEMPLATE: { block: Block; minutes: number; label: string; hint: string }[] = [
  { block: "papers", minutes: 45, label: "Read / think", hint: "Direction-relevant reading; the idea inbox is open" },
  { block: "research", minutes: 240, label: "Experiment loop", hint: "Hypothesize → run → measure → log. The experiment log entry is mandatory" },
  { block: "research", minutes: 45, label: "Write", hint: "The report grows a little every day, with claims tied to evidence" },
  { block: "review", minutes: 20, label: "Review", hint: "Keep the foundations warm" },
];

// Macro phases for the 210-day roadmap band (pacing overlay only — never a lock).
export const PHASES: { month: number; days: [number, number]; title: string; primary: string; deliverable: string }[] = [
  { month: 1, days: [1, 30], title: "Computational + Mathematical Boot", primary: "Python · NumPy · Linux/Git · algebra→calculus begins · vectors", deliverable: "GitHub workflow · numerical programs · linear regression from scratch" },
  { month: 2, days: [31, 60], title: "ML + Deep Learning", primary: "ML foundations · PyTorch · backprop → attention → Transformers · ViT", deliverable: "Classifier · custom training loop · tiny Transformer · first paper notes" },
  { month: 3, days: [61, 90], title: "Robotics Core", primary: "SO(3)/SE(3) · kinematics · Jacobians · control · estimation · MuJoCo deep", deliverable: "PandaKin library · pendulum study · Kalman filter" },
  { month: 4, days: [91, 120], title: "Perception + Planning + Autonomy", primary: "Camera geometry · modern perception tools · ROS 2 · planning · manipulation", deliverable: "Language→3D localization · integrated ROS robot · Tabletop Butler" },
  { month: 5, days: [121, 150], title: "Robot Learning", primary: "RL (PPO/SAC from scratch → GPU-parallel) · BC/DAgger · ACT · Diffusion Policy · flow", deliverable: "The PushT study (Robot Learning Boss)" },
  { month: 6, days: [151, 180], title: "VLA + World Models + Reproduction", primary: "The five-paper spine · SmolVLA + π0 fine-tunes · world models · eval rigor", deliverable: "VLA Boss reproduction report · world-model experiment · P21" },
  { month: 7, days: [181, 210], title: "Original Research Sprint", primary: "One narrow question · baseline · experiments · ablations · writing", deliverable: "Report + reproducible repo + defense (Final Boss)" },
];
