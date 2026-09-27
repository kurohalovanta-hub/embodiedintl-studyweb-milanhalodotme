import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l2-optimization",
  title: "Gradient Descent",
  subtitle: "Following the slope: the algorithm that trains everything",
  minutes: 75,
  sections: [
    {
      id: "why",
      title: "One algorithm to train them all",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `Every model you will train (the linear regressor in Level 3, the Transformer in Level 4, the π0-style VLA fine-tune in Level 12) is trained by the *same* algorithm, and you can state it in one line:

**measure which way is uphill, take a small step downhill, repeat.**

The gradient $\\nabla f$ is the vector of partial derivatives. It points in the direction of steepest *increase* (you saw why in l2-multivariable: it's the direction that maximizes the directional derivative). So learning is:`,
        },
        {
          kind: "equation",
          tex: "\\theta_{t+1} = \\theta_t - \\eta\\,\\nabla f(\\theta_t)",
          label: "gradient descent",
          note: "η (learning rate) is the step size, the single most consequential hyperparameter in deep learning.",
        },
        {
          kind: "prose",
          md: `The interesting part is *where it goes wrong*: steps too big diverge, narrow valleys cause zig-zag, saddle points stall, curved valleys crawl. Deep-learning lore ("use momentum", "warm up the LR") is a bag of fixes for exactly these failures. Today you'll cause every failure yourself, on purpose, and fix each one.`,
        },
      ],
    },
    {
      id: "drive",
      title: "Cause every failure yourself",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "gradient-descent",
          caption: "Four labs: (1) bowl: raise η past 1.0 until it diverges; (2) ravine: watch β=0 zig-zag across the steep axis, then raise β to 0.9; (3) saddle: start ON the axis (drag the pink point to y≈0) and watch it stall at a non-minimum, then nudge off-axis; (4) valley: the curved canyon where small η crawls and momentum flies.",
        },
        {
          kind: "quiz",
          title: "what you just saw, named",
          items: [
            {
              q: "On 'ravine' (f = ½(x² + 12y²)), why does plain GD zig-zag instead of heading straight for the minimum?",
              options: [
                "The gradient is mostly in the steep (y) direction, so steps overshoot across the valley while barely progressing along it",
                "The learning rate is randomized each step",
                "Floating point error accumulates",
                "The gradient points at the minimum but η rounds it",
              ],
              answerIndex: 0,
              a: "The gradient is dominated by the steep direction (12y vs x); each step overshoots across the valley and only inches along it. Ill-conditioning = ratio of curvatures = ratio of Hessian eigenvalues, the spectrum from l2-eigen-svd.",
              why: "This is why 'condition number' appears in every optimization text, and why Adam normalizes per-coordinate.",
            },
            {
              q: "What did momentum (β=0.9) change, mechanically?",
              a: "Velocity averages recent gradients: the alternating cross-valley components cancel, the consistent along-valley components accumulate. The zig-zag is damped and progress compounds.",
            },
          ],
        },
      ],
    },
    {
      id: "derive",
      title: "Derive: why steepest descent, and when η is too big",
      depth: "derivation",
      blocks: [
        {
          kind: "derivation",
          title: "The quadratic that predicts divergence",
          intro: "On f(x) = ½ax² (a = curvature), gradient descent is fully solvable, and it tells you exactly when you blow up:",
          steps: [
            { text: "The update with f′(x) = ax:", tex: "x_{t+1} = x_t - \\eta\\,a x_t = (1-\\eta a)\\,x_t" },
            { text: "So after t steps:", tex: "x_t = (1-\\eta a)^t\\,x_0" },
            { text: "Convergence iff the factor has magnitude < 1:", tex: "|1-\\eta a| < 1 \\iff 0 < \\eta < \\tfrac{2}{a}" },
            { text: "In many dimensions, a becomes the Hessian's eigenvalues; the steepest direction (λ_max) sets the ceiling:", tex: "\\eta < \\frac{2}{\\lambda_{\\max}}" },
            { text: "And the SLOWEST direction converges like (1−ηλ_min)ᵗ. The condition number λ_max/λ_min bounds how fast you can possibly go. That explains the ravine.", tex: "\\text{rate} \\sim \\left(1 - \\tfrac{2\\lambda_{\\min}}{\\lambda_{\\max}}\\right)^t" },
          ],
        },
        {
          kind: "misconception",
          wrong: "Divergence means the code has a bug; a smaller loss is always one more epoch away.",
          right: "Divergence at large η is a mathematical property of the loss's curvature. Your derivation above predicts the exact threshold on a quadratic. When a real training run's loss explodes, your FIRST hypothesis should be η vs curvature, not a bug.",
        },
      ],
    },
    {
      id: "implement",
      title: "Implement the optimizer you'll use for months",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "predict",
          title: "predict the trajectory",
          source: `def gd(grad, x0, lr, steps):
    x = x0
    for _ in range(steps):
        x = x - lr * grad(x)
    return x

# f(x) = x^2, grad = 2x, so factor per step is (1 - 2*lr)
print(round(gd(lambda x: 2*x, 1.0, 0.4, 3), 4))
print(round(gd(lambda x: 2*x, 1.0, 1.1, 3), 4))`,
          prompt: "Two runs on f=x² from x₀=1: lr=0.4 and lr=1.1. What prints?",
          options: ["0.008 -1.728", "0.008 1.728", "0.2 -1.2", "0.4306 0.9"],
          answerIndex: 0,
          explanation: "Factor = 1−2η. η=0.4 → 0.2³ = 0.008: fast decay. η=1.1 → (−1.2)³ = −1.728: oscillating **divergence**, exactly as the derivation predicts (threshold η = 2/a = 1).",
        },
        {
          kind: "code",
          mode: "write",
          title: "optim.py: your own optimizer",
          source: `# Spec — numpy:
# 1. gd(grad, x0, lr, steps) and momentum(grad, x0, lr, beta, steps),
#    each returning the full path (list of points).
# 2. Ravine: f = 0.5*(x**2 + 12*y**2). Run both from (-2.6, 1.2),
#    lr=0.15, beta=0.9, 60 steps. Print final ||xy|| for each.
# 3. Sweep lr in [0.01 ... 0.2] on the ravine (no momentum):
#    print the largest lr that still converges; compare to 2/12 = 0.167.
# 4. Rosenbrock-lite: f = (1-x)**2 + 5*(y-x**2)**2 — derive the gradient
#    BY HAND into a comment, verify one point numerically (centered diff).`,
          checks: [
            "momentum beats plain gd on the ravine by >100× in final distance",
            "Your empirical divergence threshold lands near 2/λ_max = 0.167",
            "Hand-derived Rosenbrock gradient matches centered difference to 1e-5",
            "Paths stored, not just endpoints (you'll plot them in l1-matplotlib style)",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "From toy bowls to 3-billion-parameter bowls",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `Everything transfers directly:

- **SGD** (l3-sgd-optimizers) = today's algorithm with *noisy* gradients from mini-batches; **Adam** = momentum + per-coordinate step scaling (a poor man's fix for the ravine you just met). You will read the Adam paper and recognize every term.
- **LR warmup/decay schedules** in Transformer training (L4) manage the η-vs-curvature ceiling as curvature changes during training.
- **Policy gradient RL** (L10) is gradient *ascent* on expected reward: the same machine with a flipped sign and noisier gradients.
- **Real robot fine-tuning** (L12): compute is scarce; understanding conditioning and LR is the difference between a 2-hour and a 2-week fine-tune.

And a limit to respect: gradient descent finds *local* structure. Modern deep nets work not because the landscape is nice, but because in high dimensions most bad-looking critical points are saddles (your widget's saddle escape, scaled up).`,
        },
        {
          kind: "connection",
          md: "Immediate payoff: l3-linear-regression trains a real model with exactly optim.py's loop; l3-sgd-optimizers turns it stochastic; the Adam paper is now a short read.",
          nodeIds: ["l3-linear-regression", "l3-sgd-optimizers"],
          paperIds: ["paper-adam"],
        },
        { kind: "sources", note: "The primary text's optimization chapter formalizes convexity and convergence rates. Read it AFTER playing the widget, and skim the proofs; the quadratic analysis you derived is the load-bearing case." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** write GD + momentum from memory; predict divergence thresholds on quadratics (and verify); explain zig-zag and its momentum fix in terms of gradient components; optim.py passes all checks. Gold = the η < 2/λ_max derivation reproduced cold, and one sentence on why mini-batch noise doesn't break the picture.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
