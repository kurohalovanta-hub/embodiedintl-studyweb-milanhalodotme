import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l3-backprop-theory",
  title: "Backpropagation",
  subtitle: "The chain rule as an algorithm: every gradient, one backward sweep",
  minutes: 90,
  sections: [
    {
      id: "why",
      title: "Three billion sensitivities, one sweep",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `Training needs $\\partial L/\\partial \\theta$ for **every** parameter. A 3-billion-parameter VLA would need 3 billion chain-rule computations, and done naïvely each one walks the whole network. Backprop works because those computations share almost all of their work. Organize the network as a **computation graph**, sweep it once forward (compute values), once backward (compute sensitivities), and every gradient falls out for roughly the cost of **two** forward passes instead of 3 billion.

That factor made the deep-learning era possible. You already own both ingredients: the chain rule (l2-derivatives: sensitivities multiply along a pipeline) and one new rule for when pipelines branch.`,
        },
        {
          kind: "callout",
          tone: "insight",
          title: "the whole algorithm in two rules",
          md: `**Along a path, multiply** local sensitivities (chain rule). **Where paths merge, add** their contributions. Multiply along edges, sum over paths. That is all of backprop.`,
        },
      ],
    },
    {
      id: "graph",
      title: "Walk the graph",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "backprop-graph",
          caption: "A one-neuron network: u=w·x, z=u+b, a=σ(z), L=(a−y)². Cyan numbers flow forward (values); amber flow backward (∂L/∂·). Move w and watch every gradient react. Then press 'step' repeatedly: you are watching gradient descent train a neuron, with nothing hidden.",
        },
        {
          kind: "quiz",
          title: "read the sweep",
          items: [
            {
              q: "In the widget, set w so that z is large (say z > 4). What happens to ∂L/∂w, and through which local factor?",
              options: [
                "It collapses toward 0: σ′(z)=a(1−a) ≈ 0 kills the whole product",
                "It grows: large z means large gradient",
                "Nothing: ∂L/∂w doesn't depend on z",
                "It flips sign",
              ],
              answerIndex: 0,
              a: "σ saturates: a ≈ 1, so a(1−a) ≈ 0, and that factor multiplies EVERYTHING upstream. The neuron stops learning.",
              why: "You just watched the vanishing gradient, the disease that shaped a decade of architecture design (ReLU, residuals, normalization).",
            },
            {
              q: "Why does ∂L/∂b equal ∂L/∂z exactly, always?",
              a: "The local derivative ∂z/∂b of z=u+b is 1, so addition passes gradients through unchanged. (Adds are 'gradient wires'; that's also why residual connections rescue deep nets.)",
            },
          ],
        },
      ],
    },
    {
      id: "formal",
      title: "The algorithm, stated properly",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `A computation graph: nodes are primitive ops with known local derivatives; edges carry values forward. Define for every node $v$ its **adjoint** $\\bar v = \\partial L/\\partial v$, meaning "how much the final loss cares about this node".

**Forward pass:** compute every node's value, cache them (you'll need them to evaluate local derivatives at the right point, which engineers away the l2-derivatives misconception).

**Backward pass:** start at the output with $\\bar L = 1$; visit nodes in reverse topological order; each node sends to each input $u$:`,
        },
        {
          kind: "equation",
          tex: "\\bar u \\mathrel{+}= \\bar v \\cdot \\frac{\\partial v}{\\partial u}",
          label: "the backprop update",
          note: "Multiply by the local derivative, ACCUMULATE (+=) because a value used in several places receives a contribution from each. This is the sum-over-paths rule.",
        },
        {
          kind: "misconception",
          wrong: "Backprop is a special algorithm for neural networks, distinct from calculus.",
          right: "Backprop is reverse-mode automatic differentiation: the chain rule scheduled cleverly on a graph. It differentiates ANY program made of differentiable ops: a physics simulator, a rendering pipeline, a Kalman filter. 'Differentiable simulation' in robotics is this exact algorithm pointed at physics.",
        },
      ],
    },
    {
      id: "derive",
      title: "Derive the layer gradients you'll implement",
      depth: "derivation",
      blocks: [
        {
          kind: "derivation",
          title: "Linear layer z = Wx + b: all three adjoints",
          intro: "Given z̄ = ∂L/∂z (arriving from above), derive what the layer must emit. Shapes: x ∈ ℝⁿ, z ∈ ℝᵐ, W ∈ ℝ^{m×n}. Work entry-wise, then recognize the matrix forms:",
          steps: [
            { text: "Entry-wise, z_i = Σ_j W_{ij} x_j + b_i. The bias is a wire:", tex: "\\bar b_i = \\bar z_i \\quad\\Rightarrow\\quad \\bar b = \\bar z" },
            { text: "Each weight touches exactly one output, so one term survives the chain rule:", tex: "\\bar W_{ij} = \\bar z_i\\, x_j \\quad\\Rightarrow\\quad \\bar W = \\bar z\\, x^\\top \\;\\text{(outer product!)}" },
            { text: "Each input x_j feeds EVERY output, so sum over paths:", tex: "\\bar x_j = \\sum_i \\bar z_i W_{ij} \\quad\\Rightarrow\\quad \\bar x = W^\\top \\bar z" },
            { text: "Sanity-check shapes: z̄ xᵀ is (m×1)(1×n) = m×n ✓, Wᵀz̄ is (n×m)(m×1) = n×1 ✓. Note the transpose: gradients flow backward through Wᵀ, which is the l2-matrices transpose identity at work.", tex: "\\bar W \\in \\mathbb R^{m\\times n},\\;\\; \\bar x \\in \\mathbb R^{n}" },
          ],
        },
        {
          kind: "prose",
          md: `These three lines ($\\bar b = \\bar z$, $\\bar W = \\bar z x^\\top$, $\\bar x = W^\\top \\bar z$) are what you will type in \`l3-mlp-numpy\` next. Every framework's Linear layer backward is these three lines with batching.`,
        },
      ],
    },
    {
      id: "implement",
      title: "Implement: a micro-autograd",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "trace",
          title: "trace the backward sweep by hand",
          source: `# L = (sigma(w*x + b) - y)^2
# forward:  x=2, w=0.5, b=-0.5, y=1
#   u = w*x = 1.0
#   z = u+b = 0.5
#   a = sigma(0.5) = 0.6225
#   d = a-y = -0.3775
#   L = d*d = 0.1425
# backward (adjoints):`,
          prompt: "Compute each adjoint yourself before revealing. σ′ = a(1−a).",
          trace: [
            { step: "L̄ (seed)", state: "1" },
            { step: "d̄ = L̄ · ∂L/∂d = 1 · 2d", state: "−0.7550" },
            { step: "ā = d̄ · ∂d/∂a = d̄ · 1", state: "−0.7550" },
            { step: "z̄ = ā · a(1−a) = −0.755 · 0.235", state: "−0.1774" },
            { step: "b̄ = z̄ · 1", state: "−0.1774" },
            { step: "ū = z̄ · 1", state: "−0.1774" },
            { step: "w̄ = ū · x = −0.1774 · 2", state: "−0.3549" },
            { step: "x̄ = ū · w = −0.1774 · 0.5", state: "−0.0887" },
          ],
        },
        {
          kind: "code",
          mode: "write",
          title: "micrograd.py: 60 lines, full autograd",
          source: `# Spec (this is the heart of PyTorch, in miniature):
# 1. class Value: holds .data, .grad=0, ._backward=lambda:None, ._prev=set()
# 2. Overload __add__ and __mul__: each returns a new Value whose
#    _backward closure adds the correct local-derivative contribution
#    to each parent's .grad  (out.grad * 1 for add; out.grad * other.data
#    for mul — the += is the sum-over-paths rule!)
# 3. sigmoid() method: s = 1/(1+exp(-x)); local derivative s*(1-s).
# 4. backward(): topological sort from the output, seed grad=1, call
#    each node's _backward in reverse order.
# 5. Rebuild the widget's neuron: L = (sigmoid(w*x+b)-y)**2 with the
#    trace's numbers. Assert w.grad ≈ -0.3549 and b.grad ≈ -0.1774.
# 6. Gradient-check w.grad with your l2-derivatives centered difference.`,
          checks: [
            "Asserts in step 5 pass: your autograd reproduces the hand trace",
            "Centered-difference check agrees to 1e-6",
            "A value used twice (e.g. L = a*a) accumulates BOTH contributions. Test it: d(a*a)/da = 2a only works because of +=",
            "You can explain topological order in one sentence (a node runs backward only after everything downstream of it has)",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "What this buys you in robotics",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `- **Every training run** from here to Level 16 calls loss.backward(). You now know the exact algorithm behind that line, including why activations must be cached (memory cost!) and why activation checkpointing trades compute for memory on big VLA fine-tunes.
- **Vanishing/exploding** gradients are products of local sensitivities along deep paths (your quiz observation, times 100 layers). Residual connections add identity paths (gradient wires), which is why 100-layer nets train at all. You'll see this measurably in l4-training-dynamics.
- **Differentiable everything:** MJX (MuJoCo-in-JAX) backprops through contact physics; gradient-through-simulation policy training is a live research direction you'll touch in the world-model levels.
- The trace-table discipline (adjoints, one node at a time) is how you'll debug NaN gradients in real runs: walk backward, find the node whose local derivative exploded.`,
        },
        {
          kind: "connection",
          md: "Immediate next: l3-mlp-numpy implements the Linear-layer formulas you derived, at batch scale, training a real classifier. The AlexNet paper, the moment this algorithm changed the world, is now fully readable.",
          nodeIds: ["l3-mlp-numpy", "l4-training-dynamics"],
          paperIds: ["paper-alexnet"],
          projectIds: ["p3-numpy-net"],
        },
        { kind: "sources", note: "Karpathy's micrograd video builds steps 1 to 5 of your write-spec on camera. Watch AFTER attempting it yourself, as a debrief. CS231n notes are the reference for the batched matrix forms." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** hand-trace adjoints through a 5-node graph without error; derive the three Linear-layer gradients with shape checks; micrograd.py passes its asserts and gradient-check. Gold = your += accumulation test passes AND you can say why reverse mode (not forward mode) is the right choice when outputs are scalar and inputs are billions.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
