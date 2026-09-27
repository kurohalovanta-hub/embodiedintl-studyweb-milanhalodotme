import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l12-vla-anatomy",
  title: "VLA Anatomy",
  subtitle: "How vision-language-action models work, with every tensor accounted for",
  minutes: 90,
  sections: [
    {
      id: "why",
      title: "The bet the field made",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `Robot learning's oldest constraint: robot data is brutally expensive (a teleoperated demo costs minutes of human time; the internet's text and images cost nothing). The **VLA bet**: start from a vision-language model that already understands objects, spatial relations and instructions from internet scale, then teach it *actions* with comparatively little robot data. Semantic generalization is inherited, not bought with teleop hours.

This is the architecture at the frontier you're training toward: RT-2 proved the transfer, OpenVLA open-sourced it, π0 made it fast and dexterous. Everything you've built converges here: the Transformer (L4) is the chassis; imitation learning (L11) is the training signal; SE(3) and frames (L5) shape the action space; and today you learn how the pieces bolt together, precisely enough to fine-tune one (l12-smolvla-finetune) and read any VLA paper's architecture figure without slowing down.`,
        },
        {
          kind: "callout",
          tone: "insight",
          title: "one sentence to rule the level",
          md: `A VLA = a pretrained VLM backbone fusing [image patches + instruction tokens + proprio token] into one sequence, plus an **action decoder** that turns the fused context into a **chunk of future actions**. Every VLA differs mainly in one place: how the action decoder works.`,
        },
      ],
    },
    {
      id: "drive",
      title: "Walk the pipeline",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "vla-flow",
          caption: "Tap every block and read its tensor shapes (π0-class numbers). Then flip the toggle between the two action-decoder families (flow-matching expert vs FAST autoregressive tokens) and notice that the rest of the diagram doesn't change. That invariance is the lesson.",
        },
        {
          kind: "quiz",
          title: "shapes are understanding",
          items: [
            {
              q: "Why does proprioception (joint angles) enter as its own token instead of being painted into the image?",
              options: [
                "A linear projection to one token is exact, cheap, and lets attention relate body state to any patch or word directly; recovering joint angles from pixels is lossy and indirect",
                "Images have no room for more channels",
                "Proprio changes too fast for the vision encoder",
                "It's historical accident from RT-1",
              ],
              answerIndex: 0,
              a: "The model needs its body state precisely (grasp decisions hinge on centimeters); a dedicated token gives attention direct, lossless access. Tokens-as-universal-interface is the design pattern of the whole architecture.",
              why: "Same pattern accepts new sensors: force-torque, tactile, audio. Each is 'project to tokens, join the sequence'.",
            },
            {
              q: "The chunk block says H=50 at 50 Hz. Connect that to l11-bc-dagger in one sentence.",
              a: "One inference commits a full second of actions: 50× fewer feedback interactions per episode, which attacks the compounding-error T (and hides inference latency).",
            },
          ],
        },
      ],
    },
    {
      id: "formal",
      title: "The two action-decoder families",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `**Family 1: discrete tokens (RT-2, OpenVLA, π0-FAST).** Actions become tokens in the language-model vocabulary; the backbone keeps generating. Naive per-dimension binning (256 bins × 7 DoF, RT-2/OpenVLA) is simple but slow (one token per dimension per step) and quantized. **FAST** (paper-fast) compresses first (DCT over the chunk, quantize, byte-pair encode) down to ≈30 to 60 tokens for a whole 50-step chunk: the same trick as JPEG, applied to motion. Trained with plain next-token cross-entropy.

**Family 2: continuous flow/diffusion expert (π0, l12-pi0-flow).** A separate small transformer (the **action expert**, ~300M beside the 3B backbone) generates the chunk by iterative denoising: start from Gaussian noise $a^0 \\sim \\mathcal N$, integrate a learned velocity field ~10 steps toward the data distribution, reading the backbone through cross-attention (Q from actions; K,V from the fused context, which is your l4-attention in use). Trained with flow matching:`,
        },
        {
          kind: "equation",
          tex: "\\mathcal L = \\mathbb E_{\\tau, \\varepsilon}\\;\\big\\| v_\\theta(a^\\tau, \\tau, \\text{ctx}) - (\\varepsilon - a) \\big\\|^2, \\qquad a^\\tau = \\tau a + (1-\\tau)\\varepsilon",
          label: "flow matching (π0 form)",
          note: "Regress the straight-line velocity from noise ε toward the true chunk a, at every mixing time τ. Inference = integrate v_θ from noise to action.",
        },
        {
          kind: "prose",
          md: `The trade, in numbers that matter on hardware: autoregressive detokenization runs ~2 to 5 Hz on a 7B model (too slow for reactive manipulation); a flow expert emits the whole chunk in one denoising pass, and π0 controls at 50 Hz. Continuous output also dodges quantization error and represents multimodal action distributions natively (the l11-diffusion insight, inherited).`,
        },
        {
          kind: "misconception",
          wrong: "A VLA is a chatbot that outputs action text: the language model 'decides' and some glue code executes.",
          right: "There is no glue layer: gradients flow from action loss THROUGH the backbone. Fine-tuning reshapes the VLM's own representations toward control. That's also the risk: naive fine-tuning erodes the inherited semantics (catastrophic forgetting), which is why recipes freeze the vision encoder early, mix language data back in (π0.5), or use LoRA (your l2-eigen-svd low-rank story) on the backbone.",
        },
      ],
    },
    {
      id: "derive",
      title: "Derive the budget: why chunking and FAST were inevitable",
      depth: "derivation",
      blocks: [
        {
          kind: "derivation",
          title: "Latency arithmetic every VLA team does on a whiteboard",
          intro: "Ballpark an OpenVLA-class 7B autoregressive model on a single strong GPU (~30 tokens/s decode) controlling a 7-DoF arm:",
          steps: [
            { text: "Naive binning: 7 tokens per action step. Control at 50 Hz needs:", tex: "7 \\times 50 = 350 \\text{ tokens/s} \\;\\gg\\; 30 \\text{ tokens/s}" },
            { text: "Off by 10×. Option A (emit a chunk per inference): H=50 steps × 7 = 350 tokens per chunk at 30 tok/s ≈ 11.7 s per second of motion. Worse! Autoregression doesn't amortize:", tex: "t_{chunk} \\approx 350/30 \\approx 11.7\\,\\mathrm s" },
            { text: "Option B (compress the chunk with FAST): ~40 tokens per 1-second chunk:", tex: "t_{chunk} \\approx 40/30 \\approx 1.3\\,\\mathrm s \\;\\to\\; \\text{borderline real-time}" },
            { text: "Option C (flow expert): one forward pass through 300M + 10 small denoise steps, no token-by-token loop: tens of milliseconds. Real-time with headroom. The architecture zoo is this arithmetic, solved three ways:", tex: "t_{chunk} \\sim 50\\text{–}100\\,\\mathrm{ms}" },
          ],
        },
      ],
    },
    {
      id: "implement",
      title: "Implement the interfaces (shapes first, weights later)",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "predict",
          title: "count the context",
          source: `# pi0-class context assembly (per timestep)
n_views, patches_per_view = 2, 256
lang_tokens = 12
proprio_tokens = 1
H, act_dim = 50, 7

ctx = n_views * patches_per_view + lang_tokens + proprio_tokens
attn_scores_per_head = (ctx + H) ** 2   # expert attends over all
print(ctx, attn_scores_per_head > 300_000)`,
          prompt: "What prints?",
          options: ["525 True", "525 False", "269 False", "781 True"],
          answerIndex: 0,
          explanation: "ctx = 512 + 12 + 1 = 525; (525+50)² = 330,625 > 300k → True. A third camera or a longer instruction lands directly in that n², which is why VLA papers report token counts and prune patches.",
        },
        {
          kind: "code",
          mode: "write",
          title: "vla_skeleton.py: the whole dataflow, no weights",
          source: `# Spec — numpy only. Build the SHAPE-TRUE skeleton of a VLA:
# 1. patchify(img 224x224x3, patch=14) -> (256, 588) then project
#    with a random W to (256, d), d=64 (stand-in for SigLIP).
# 2. embed_text(instr) -> (n_words, d) via a toy hash-embedding.
#    embed_proprio(q7) -> (1, d) linear.
# 3. backbone(tokens) -> 2 layers of YOUR l4-attention + MLP (reuse
#    your numpy attention!) -> fused context (n, d).
# 4. Decoder A - fast_tokens(chunk 50x7): DCT (scipy-free: matmul with
#    cosine basis), keep top-k coeffs, uniform-quantize to ints.
#    Reconstruct; print max reconstruction error for k=40 vs k=350.
# 5. Decoder B - flow_step(a_tau, tau, ctx): one cross-attention
#    (Q from actions, K/V from ctx) + linear -> velocity (50, 7).
#    Integrate 10 Euler steps from noise; verify output shape.
# 6. Print an honest end-to-end shape trace: image->patches->ctx->chunk.`,
          checks: [
            "Shape trace prints every tensor: (256,d) + (n_lang,d) + (1,d) → ctx → (50,7)",
            "DCT with k=40 reconstructs a smooth chunk to <5% error (smooth trajectories compress, which is the idea behind FAST)",
            "Cross-attention Q comes from action tokens, K/V from context. Assert the shapes force it",
            "You reused your own l4 attention function unchanged (proof the chassis is the same)",
          ],
        },
      ],
    },
    {
      id: "research",
      title: "The frontier, mapped onto today's diagram",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `Every 2024 to 2026 headline system is a delta on the diagram you can now draw:

- **π0.5 / recap-style:** co-train the SAME backbone on robot data + web VQA + subtask prediction, which defends inherited semantics while learning control (the forgetting fix, institutionalized).
- **Dual-system designs (GR00T-class):** big slow VLM reasons at ~5 Hz, small fast expert acts at 50 to 120 Hz: the latency arithmetic, split across two brains.
- **RL-on-VLA (l12-rl-vla, SimpleVLA-RL):** BC ceilings (your l11 lesson!) pushed past with on-policy improvement on top of a VLA prior.
- **Cross-embodiment (paper-oxe, l12-cross-embodiment):** one model, many robots, with action spaces normalized so the chunk interface stays fixed.

When you fine-tune SmolVLA (l12-smolvla-finetune) and reproduce a π0-style pipeline (p19-vla-reproduction), you will be editing the blocks you tapped in the widget, and nothing in the papers' architecture sections will be new to you.`,
        },
        {
          kind: "connection",
          md: "Read π0 (§ architecture + flow matching) and FAST back-to-back this week. You have every prerequisite, including the √d, the cross-attention, the εT², and the latency arithmetic. Then l12-pi0-flow goes deep on the expert.",
          nodeIds: ["l12-pi0-flow", "l12-action-tokenization", "l12-openvla-code"],
          paperIds: ["paper-pi0", "paper-fast", "paper-openvla"],
          projectIds: ["p19-vla-reproduction"],
        },
        { kind: "sources", note: "π0 paper §3 (the architecture is your widget with weights); FAST paper §3 to 4 (your DCT exercise, industrialized); OpenVLA §3 for the discrete-token baseline. Read in that order." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** draw the full dataflow from memory with tensor shapes at every edge; explain both decoder families and reproduce the latency arithmetic that separates them; state the flow-matching loss and what each symbol is; vla_skeleton.py passes. Gold = defend, as if to a skeptical reviewer, why chunking + flow beats per-step autoregression for dexterous control, using numbers, the εT² result, and one honest counterpoint (chunks react slower to disturbances mid-chunk).`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
