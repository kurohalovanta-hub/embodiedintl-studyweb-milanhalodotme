import type { FrontierEntry } from "@/lib/types";

// Frontier Tracker seed — the verified Aug-2026 state (docs/research/00-frontier-2026.md).
// New entries are added over time; each carries a "does the roadmap change?" verdict.
export const FRONTIER: FrontierEntry[] = [
  {
    id: "f-pi07", date: "2026-04", title: "π0.7: steerable generalist policies", org: "Physical Intelligence", kind: "model",
    url: "https://arxiv.org/abs/2604.15483",
    whatChanged: "Multimodal prompting (language/metadata/visual subgoals), emergent skill recombination, matches RL-finetuned specialists out of the box. Closed weights; open releases lag ~2 versions (openpi stops at π0.5).",
    roadmapImpact: "minor", verdict: "SKIM at L12 for steerability ideas; capstone stays π0/π0.5 (the runnable lineage).", studyWhen: "at-level", relatedLevel: 12,
  },
  {
    id: "f-gemini-robotics-2", date: "2026-07", title: "Gemini Robotics 2 (whole-body, ER-2, On-Device-2)", org: "Google DeepMind", kind: "model",
    whatChanged: "Whole-body control 'feet to fingertips' on Apptronik Apollo 2; multi-robot collaboration; early access only, no paper/weights yet.",
    roadmapImpact: "watch", verdict: "Blog-level awareness; whole-body VLAs remain out of solo-learner reach. Watch for the tech report.", studyWhen: "later", relatedLevel: 12,
  },
  {
    id: "f-groot-n17", date: "2026-04", title: "GR00T N1.7 (Cosmos-Reason2 backbone)", org: "NVIDIA", kind: "model",
    url: "https://github.com/NVIDIA/Isaac-GR00T",
    whatChanged: "Current GA open-weights humanoid VLA (3B); in LeRobot as --policy.type=groot; inference 16 GB, fine-tune 40 GB+.",
    roadmapImpact: "minor", verdict: "The humanoid-flavor alternative in L12; not the capstone (fine-tune floor too high for most local rigs).", studyWhen: "at-level", relatedLevel: 12,
  },
  {
    id: "f-gen01", date: "2026-04", title: "GEN-0 → GEN-1 scaling-law claims", org: "Generalist AI", kind: "debate",
    whatChanged: "Claimed robotics scaling laws incl. a ~7B 'capability threshold' from 270k+ hrs of dexterous data; GEN-1 claims 99% where SOTA gets 64%. No papers, no weights.",
    roadmapImpact: "watch", verdict: "Critical-reading exercise in L12 (the skeptic's memo); would upgrade to major if independently replicated on open data.", studyWhen: "at-level", relatedLevel: 12,
  },
  {
    id: "f-molmoact2", date: "2026-05", title: "MolmoAct2 + OpenFAST (fully open stack)", org: "Allen Institute for AI", kind: "model",
    url: "https://arxiv.org/abs/2605.02881",
    whatChanged: "Weights + data + open action tokenizer + embodied-reasoning backbone; their eval places it above OpenVLA-OFT and π0.5 on real robots.",
    roadmapImpact: "minor", verdict: "SKIM→STUDY if the research month touches action reasoning or evaluation; OpenFAST is a usable asset.", studyWhen: "at-level", relatedLevel: 12,
  },
  {
    id: "f-libero-saturation", date: "2026-06", title: "LIBERO saturation + robustness collapse (LIBERO-Plus, CVPR 2026)", org: "community", kind: "benchmark",
    url: "https://arxiv.org/abs/2510.13626",
    whatChanged: "Multiple models ≥97% on LIBERO while perturbation suites collapse them below 30%; models shown ignoring language and memorizing trajectories.",
    roadmapImpact: "major", verdict: "ADOPTED into the curriculum: eval statistics are a first-class node (l11-eval-statistics) and every VLA eval pairs LIBERO with a perturbation suite.", studyWhen: "at-level", relatedLevel: 11,
  },
  {
    id: "f-rl-experience", date: "2025-11", title: "RL-from-experience goes mainstream (RECAP, GR-RL, SimpleVLA-RL)", org: "PI / ByteDance / Tsinghua", kind: "paper",
    url: "https://arxiv.org/abs/2511.14759",
    whatChanged: "Value functions and advantage conditioning on real deployments; ICLR 2026 canon for sim-scale VLA-RL. 'BC then hope' is no longer the frontier story.",
    roadmapImpact: "major", verdict: "ADOPTED: the PPO/SAC/IQL spine is retained at full depth and L12 gains the RL×VLA reading module.", studyWhen: "at-level", relatedLevel: 12,
  },
  {
    id: "f-wam-debate", date: "2026-03", title: "The world-action-model debate (VLA-JEPA, 'Do WAMs generalize better?')", org: "community", kind: "debate",
    url: "https://arxiv.org/abs/2603.22078",
    whatChanged: "A named empirical question: do models that predict the world before acting generalize better than VLAs? AMI Labs' ~$1B latent bet vs the generative-video wave.",
    roadmapImpact: "minor", verdict: "L13 teaches both sides; a strong Month-7 direction lives inside this debate at toy scale.", studyWhen: "at-level", relatedLevel: 13,
  },
  {
    id: "f-cosmos3", date: "2026-06", title: "Cosmos 3 open omnimodel (+ Cosmos Policy)", org: "NVIDIA", kind: "model",
    url: "https://github.com/NVIDIA/Cosmos",
    whatChanged: "Open MoT family unifying reasoning + world generation + action (64B/16B/4B-edge); Cosmos Policy hits 98.5% LIBERO with 6–10 GB inference.",
    roadmapImpact: "minor", verdict: "SKIM the platform at L13; Cosmos-Policy checkpoints are a usable eval asset on 24 GB.", studyWhen: "at-level", relatedLevel: 13,
  },
  {
    id: "f-dreamdojo", date: "2026-02", title: "DreamDojo: generalist robot world model from 44.7k hrs of human video", org: "NVIDIA GEAR", kind: "model",
    url: "https://github.com/NVIDIA/DreamDojo",
    whatChanged: "ICML 2026; fully open 2B/14B checkpoints; distilled to 10 FPS real-time interaction; the open frontier of robot video world models.",
    roadmapImpact: "watch", verdict: "L13 literacy material; too heavy to train solo, but the checkpoints are usable for study.", studyWhen: "at-level", relatedLevel: 13,
  },
  {
    id: "f-vjepa21", date: "2026-03", title: "V-JEPA 2.1 (dense features, 80M→2B)", org: "Meta FAIR", kind: "model",
    url: "https://github.com/facebookresearch/vjepa2",
    whatChanged: "Dense predictive loss → SOTA dense tasks + reported ~+20% robotic grasp improvement; LeCun departed Meta for AMI Labs (~$1B) but FAIR keeps shipping.",
    roadmapImpact: "none", verdict: "Covered inside l13-video-wm; use 2.1 checkpoints where the node says V-JEPA 2.", studyWhen: "at-level", relatedLevel: 13,
  },
  {
    id: "f-dreamer4-code", date: "2026-08", title: "Dreamer 4 official code: still unreleased", org: "Google DeepMind", kind: "event",
    whatChanged: "Community reimplementations (nicklashansen/, lucidrains/) are load-bearing; a hallucination-analysis follow-up (MMBench2) shipped with ≥4 GB-GPU checkpoints.",
    roadmapImpact: "none", verdict: "Paper stays STUDY; hands-on stays TD-MPC2/DINO-WM. Re-check for official code monthly.", studyWhen: "at-level", relatedLevel: 13,
  },
  {
    id: "f-lerobot-06", date: "2026-07", title: "LeRobot v0.6 'Imagine / Evaluate / Improve' + NVIDIA partnership", org: "Hugging Face", kind: "tool",
    url: "https://github.com/huggingface/lerobot",
    whatChanged: "World-model policies, reward models, six benchmark suites under lerobot-eval, DAgger-style correction rollouts, GR00T N1.7 GA, dataset v3 streaming. ICLR 2026 paper.",
    roadmapImpact: "major", verdict: "ADOPTED as the curriculum's workbench end-to-end (l11-lerobot onward). Track releases monthly.", studyWhen: "now", relatedLevel: 11,
  },
  {
    id: "f-mujoco-newton", date: "2026-06", title: "MuJoCo Warp GA + Newton 1.5 + Isaac Lab 3.0 beta", org: "DeepMind + NVIDIA + Disney (Linux Foundation)", kind: "tool",
    whatChanged: "MJCF semantics now run GPU-batched inside both Google and NVIDIA stacks; Isaac Lab 3.0's physics is Newton/MJWarp; mjlab re-hosts Isaac's API on Warp.",
    roadmapImpact: "major", verdict: "ADOPTED: MuJoCo-first strategy confirmed as the transferable investment; Isaac Lab remains a triggered elective until 3.0 stabilizes.", studyWhen: "now", relatedLevel: 7,
  },
  {
    id: "f-ros-lyrical", date: "2026-05", title: "ROS 2 Lyrical Luth LTS (Ubuntu 26.04)", org: "OSRA", kind: "tool",
    whatChanged: "New LTS to May 2031, Tier-1 only on Ubuntu 26.04, which Isaac/CUDA stacks don't yet support. Kilted dies Dec 2026.",
    roadmapImpact: "none", verdict: "Stay on Jazzy/24.04 (audited decision); revisit when Isaac supports 26.04.", studyWhen: "skip", relatedLevel: 7,
  },
  {
    id: "f-sam3", date: "2026-03", title: "SAM 3 / 3.1 (concept-prompted segmentation)", org: "Meta AI", kind: "tool",
    url: "https://github.com/facebookresearch/sam3",
    whatChanged: "Open-vocabulary text/exemplar prompts, segment+track, image+video. Subsumes most Grounding-DINO+SAM-2 pipelines.",
    roadmapImpact: "minor", verdict: "ADOPTED as the L8 default segmentation tool.", studyWhen: "at-level", relatedLevel: 8,
  },
  {
    id: "f-open-vla-wave", date: "2026-07", title: "The open-weights VLA wave (LingBot-VLA 2.0, Xiaomi-Robotics-0, RDT2, X-VLA)", org: "Ant / Xiaomi / Tsinghua / THU-AIR", kind: "model",
    whatChanged: "Multiple Apache-2.0 VLAs with competitive LIBERO scores; RDT2 trained on 10k hrs of UMI *human* data with zero-shot cross-embodiment claims.",
    roadmapImpact: "watch", verdict: "Ecosystem literacy at L12 (pick ONE matching your research direction); RDT2 upgrades to STUDY if the human-data route is chosen.", studyWhen: "at-level", relatedLevel: 12,
  },
  {
    id: "f-corl-2026", date: "2026-11", title: "CoRL 2026 (Austin, Nov 9 to 12), upcoming", org: "conference", kind: "event",
    whatChanged: "Expected to be the RL-for-VLA and evaluation showdown; ICRA 2026's best-paper went to camera-conditioning/view-invariance work.",
    roadmapImpact: "watch", verdict: "Calendar it: proceedings week is a Frontier-Tracker refresh milestone during the research month.", studyWhen: "later", relatedLevel: 16,
  },
];
