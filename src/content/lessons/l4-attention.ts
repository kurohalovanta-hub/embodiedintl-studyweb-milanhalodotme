import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l4-attention",
  title: "Attention",
  subtitle: "softmax(QKᵀ/√d)V, the equation your robot runs on",
  minutes: 85,
  sections: [
    {
      id: "why",
      title: "The layer that ended recurrence",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `A robot policy must relate things across a context: the word "mug" to the pixels containing a mug; the current gripper state to the grasp it attempted a second ago. Before 2017, models passed information step-by-step through recurrence, a game of telephone that degraded over distance and refused to parallelize.

Attention replaced it with a simpler idea: **let every token directly look at every other token, and take a weighted average of what it finds.** The weights aren't fixed; they're computed *from the content itself*, with dot products (your l2-vectors similarity meter). It is one equation and three matmuls, and it is the backbone of GPT, ViT, CLIP, and every VLA in your Level 12. π0's backbone spends most of its FLOPs computing what you'll learn today.`,
        },
        {
          kind: "callout",
          tone: "insight",
          title: "the database metaphor (load-bearing)",
          md: `Each token publishes a **query** ("what am I looking for?"), a **key** ("what am I about?"), and a **value** ("what do I carry?"). Score = query · key. Weights = softmax(scores). Output = weight-averaged values. A soft, differentiable dictionary lookup.`,
        },
      ],
    },
    {
      id: "drive",
      title: "Drive it with your hands",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "attention-vis",
          caption: "Four tokens as draggable embeddings; the heatmap is softmax of their pairwise dot products; select a row to see the mixing. Do the labs: (1) drag 'mug' near 'robot' and watch its row concentrate and the green output arrow slide; (2) lower τ toward 0.1 for near-hard selection; raise it for uniform blur; (3) toggle the causal mask and explain which half dies and why.",
        },
        {
          kind: "quiz",
          title: "what you just manipulated",
          items: [
            {
              q: "With the causal mask ON, why is the top-right triangle of the matrix −∞ (and not just 0)?",
              options: [
                "So softmax assigns exactly zero weight: e^{−∞}=0; a 0 score would still get weight e⁰=1 before normalizing",
                "To save memory",
                "Because future keys are unit vectors",
                "It's a numerical-stability trick only",
              ],
              answerIndex: 0,
              a: "Masking must happen in score space BEFORE softmax: −∞ → weight 0. Setting scores to 0 would give future tokens weight proportional to e⁰, a real, common implementation bug.",
              why: "You will implement this mask in l4-transformer; getting it wrong trains a model that cheats by seeing the future, then mysteriously fails at generation.",
            },
            {
              q: "Temperature τ up = weights blur toward uniform; τ down = argmax. Which regime has near-zero gradients through the weights, and why is that a training problem?",
              a: "τ → 0 (hard selection): softmax saturates, ∂weights/∂scores → 0 (same saturation you saw in σ in backprop). Differentiable soft selection is the point: it lets gradients teach the model WHERE to look.",
            },
          ],
        },
      ],
    },
    {
      id: "formal",
      title: "The full equation, dimension by dimension",
      depth: "formalism",
      blocks: [
        {
          kind: "equation",
          tex: "\\mathrm{Attention}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V",
          label: "scaled dot-product attention",
        },
        {
          kind: "prose",
          md: `Shapes tell the story. For n tokens with model width $d$: $X \\in \\mathbb R^{n\\times d}$, and the layer *learns* three projections $W_Q, W_K, W_V$ giving $Q = XW_Q$, $K = XW_K$, $V = XW_V$ (each $n \\times d_k$).

- $QK^\\top \\in \\mathbb R^{n\\times n}$: every query dotted with every key, the all-pairs similarity table (your widget, with learned lenses instead of raw embeddings).
- softmax is applied **row-wise**: each token's outgoing attention sums to 1.
- The product with $V$: each output row is a convex mix of value rows. Attention *moves information between positions*; it never transforms it nonlinearly. That's the MLP block's job (l4-transformer).

**Multi-head:** run $h$ smaller attentions ($d_k = d/h$) in parallel and concatenate. Different heads learn different relations (syntax vs. position vs. object identity), and the cost is identical to one full-width head.`,
        },
        {
          kind: "misconception",
          wrong: "Q, K, V are three different inputs fed to the layer from outside.",
          right: "In self-attention all three are the SAME input X through three learned matrices: three views of one sequence. (In cross-attention, Q comes from one stream and K,V from another, which is how π0's action expert reads the VLM backbone in Level 12.)",
        },
      ],
    },
    {
      id: "derive",
      title: "Derive the √d, the term everyone hand-waves",
      depth: "derivation",
      blocks: [
        {
          kind: "derivation",
          title: "Why scores must be scaled by exactly √d_k",
          intro: "Assume (as at initialization) query and key entries are independent with mean 0, variance 1. What is the variance of one score q·k?",
          steps: [
            { text: "A score is a sum of d_k products:", tex: "s = \\sum_{i=1}^{d_k} q_i k_i" },
            { text: "Each product has mean 0 and variance E[q²]E[k²] = 1. Independent terms ⇒ variances add:", tex: "\\mathrm{Var}(s) = d_k" },
            { text: "So typical score magnitude grows like √d_k: at d_k = 64, scores of ±8 are routine. Softmax of ±8 is a one-hot: saturated, with gradients ≈ 0 (your temperature lab, forced on you by dimension).", tex: "s \\sim \\pm\\sqrt{d_k}" },
            { text: "Dividing by √d_k restores unit variance at any width, so softmax stays in its responsive regime and gradients flow:", tex: "\\mathrm{Var}\\!\\left(\\tfrac{s}{\\sqrt{d_k}}\\right) = 1" },
          ],
        },
        {
          kind: "prose",
          md: `This is a **variance-propagation** argument, the same style that gives Xavier/He initialization (l4-training-dynamics). Frontier-model debugging is substantially this argument applied over and over.`,
        },
      ],
    },
    {
      id: "implement",
      title: "Implement it in eight lines",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "missing",
          title: "attention in numpy",
          source: `import numpy as np

def softmax(s):
    e = np.exp(s - s.max(axis=-1, keepdims=True))  # stability shift
    return e / e.sum(axis=-1, keepdims=True)

def attention(Q, K, V, causal=False):
    d = Q.shape[-1]
    S = Q @ K.T / np.sqrt(d)
    if causal:
        S = np.where(np.tril(np.ones_like(S)) == 1, S, -1e9)
    return softmax(S) @ V`,
          masked: [9],
          prompt: "Write line 9: the scaled score matrix (one line).",
          answer: "S = Q @ K.T / np.sqrt(d)",
          explanation: "QKᵀ gives n×n scores; ÷√d is the variance fix you just derived. Note the max-subtraction in softmax: exp overflows without it. These 8 lines, batched and multi-headed, are the core of every frontier model.",
        },
        {
          kind: "code",
          mode: "predict",
          title: "predict the lookup",
          source: `import numpy as np
K = np.array([[1., 0.], [0., 1.], [-1., 0.]])
V = np.array([[10., 0.], [0., 10.], [99., 99.]])
q = np.array([[5., 0.]])          # strongly matches key 0
S = q @ K.T / np.sqrt(2)
W = np.exp(S) / np.exp(S).sum()
print(np.round(W @ V, 1))`,
          prompt: "q aligns with key 0, is orthogonal to key 1, anti-aligned with key 2. Roughly what comes out?",
          options: ["[[9.7 0.2]]: nearly pure value 0", "[[36.3 36.3]]: the average", "[[99. 99.]]: the biggest value wins", "[[10. 10.]]"],
          answerIndex: 0,
          explanation: "Scores ≈ (3.54, 0, −3.54) → weights ≈ (0.97, 0.028, 0.001). Output ≈ 0.97·(10,0) + 0.03·(0,10) ≈ (9.7, 0.3). The anti-aligned token's huge value (99,99) is irrelevant: retrieval is decided by keys, content delivered by values. That separation is the design.",
        },
        {
          kind: "exercise",
          level: 2,
          prompt: "Complexity audit: for n tokens, width d, how do compute and memory of attention scale with n? A robot streams 50 timesteps × 256 image patches. What does your answer imply, and name one mitigation you'd look for.",
          solution: "Scores are n×n: O(n²d) compute, O(n²) memory. 50×256 = 12,800 tokens → 164M scores per head per layer. Mitigations to look for: KV-caching across timesteps, windowed/sparse attention, token pruning/pooling of patches. All appear in real VLA systems.",
        },
      ],
    },
    {
      id: "embodied",
      title: "Attention in the robot stack",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `Where you will meet these exact matrices again:

- **l4-transformer:** wrap today's layer with residuals + LayerNorm + MLP → the full block; stack it → GPT.
- **l4-vit:** image patches become tokens; attention relates distant parts of a scene. This is the vision half of every VLA.
- **l12-vla-anatomy / π0:** a VLA is attention over [image patches | language tokens | proprio token | action tokens]. Cross-attention from the action expert into the backbone's KV cache is 'Q from actions, K,V from perception'.
- **ACT (l11-act):** action chunking with Transformers: attention over a horizon of future actions, trained on demos. The paper's core figure is your widget with different labels.`,
        },
        {
          kind: "connection",
          md: "Read the source now: Vaswani et al. 2017 §3.2 is today's lesson in the authors' words, and you have derived its one mysterious constant. Then RoPE (how positions enter Q·K) completes the modern picture.",
          nodeIds: ["l4-transformer", "l4-vit"],
          paperIds: ["paper-attention", "paper-rope"],
        },
        { kind: "sources", note: "'Attention Is All You Need' §3.1 to 3.3 (30 min, do it today while this is hot); Karpathy's 'Let's build GPT' for the from-scratch batched implementation. Your l4-transformer node builds on it." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** write the 8-line numpy attention from memory (mask included, correctly in score space); reproduce the √d variance derivation; predict a lookup's output from q/K geometry; state the O(n²) cost and one mitigation. Gold = explain multi-head's why (different relations, same FLOPs) and where cross-attention appears in π0.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
