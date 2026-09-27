import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l2-derivatives",
  title: "Derivatives & the Chain Rule",
  subtitle: "Sensitivity: the number that makes learning possible",
  minutes: 80,
  sections: [
    {
      id: "why",
      title: "One number: how much does the output care?",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `The derivative answers the only question machine learning ever asks: **"if I nudge this input a little, how much does the output move?"**

$f'(x) = 2$ means: wiggle $x$ by a tiny $\\varepsilon$, the output moves by about $2\\varepsilon$. It is a local exchange rate between input and output.

The entire program rests on this concept. Training a network *is* asking "how much does the loss care about each of 3 billion weights?" That is three billion derivatives, computed by one algorithm (backprop), which is today's **chain rule** run backwards through the network. A robot's D-term in PID is a derivative. The Jacobian in Level 5 is a matrix of derivatives. This is the working tool.`,
        },
        {
          kind: "misconception",
          wrong: "The derivative is 'the slope of the tangent line', a geometry fact about graphs.",
          right: "Geometry is one costume. The working meaning is sensitivity: output-change per unit input-change, at this exact point. You'll compute sensitivities of losses w.r.t. weights, of end-effector poses w.r.t. joints, with no graph in sight.",
        },
      ],
    },
    {
      id: "limit",
      title: "Watch the definition happen",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "derivative-explorer",
          caption: "Pick a function, drag x₀, then press 'let h → 0'. The amber secant (average rate over a window) rotates onto the green tangent (instantaneous rate). The 'gap' readout is the limit converging numerically.",
        },
        {
          kind: "equation",
          tex: "f'(x_0) = \\lim_{h\\to 0}\\frac{f(x_0+h)-f(x_0)}{h}",
          label: "the definition",
          note: "Average rate over [x₀, x₀+h], window shrunk to nothing. Every derivative rule below is this limit, evaluated once and cached forever.",
        },
        {
          kind: "quiz",
          title: "read the widget",
          items: [
            {
              q: "On f(x)=x² put x₀ at −2. The slope is −4. In sensitivity language, what does the sign mean?",
              a: "Increasing x slightly moves the output in the negative direction: f drops by ≈4ε per ε of increase. Negative derivative = output falls as input rises. (Gradient descent walks against this sign.)",
            },
            {
              q: "On f(x)=x³−2x, find a point where the secant with h=1 has a very different slope than the tangent. Why is a big h dishonest there?",
              a: "Anywhere the function curves hard (e.g. x₀≈−1). The secant averages over a window where the slope itself changes, and curvature makes finite differences biased. (Same reason big finite-difference steps give bad numerical gradients.)",
            },
          ],
        },
      ],
    },
    {
      id: "derive",
      title: "Derive one rule honestly",
      depth: "derivation",
      blocks: [
        {
          kind: "derivation",
          title: "d/dx x² = 2x, from the definition",
          intro: "Do this once with full honesty and the 'rules' stop being magic:",
          steps: [
            { text: "Set up the quotient for f(x)=x²:", tex: "\\frac{(x+h)^2 - x^2}{h}" },
            { text: "Expand the square:", tex: "\\frac{x^2 + 2xh + h^2 - x^2}{h} = \\frac{2xh + h^2}{h}" },
            { text: "Divide by h (legal, since h ≠ 0 during the limit):", tex: "2x + h" },
            { text: "Send h → 0. The h term dies:", tex: "f'(x) = 2x" },
          ],
        },
        {
          kind: "prose",
          md: `The rules you now get to use freely. Each is this same game played once:

$$\\frac{d}{dx}x^n = nx^{n-1} \\qquad \\frac{d}{dx}e^x = e^x \\qquad \\frac{d}{dx}\\ln x = \\tfrac1x \\qquad \\frac{d}{dx}\\sin x = \\cos x$$

**Sum rule** $(f+g)' = f' + g'$, **product rule** $(fg)' = f'g + fg'$. The rule that matters most is next.`,
        },
      ],
    },
    {
      id: "chain",
      title: "The chain rule: sensitivities multiply",
      depth: "derivation",
      blocks: [
        {
          kind: "equation",
          tex: "\\frac{d}{dx}f(g(x)) = f'(g(x))\\cdot g'(x)",
          label: "chain rule",
          note: "Through a pipeline, exchange rates multiply.",
        },
        {
          kind: "derivation",
          title: "Why multiply? (the honest argument)",
          intro: "No formula-shuffling. Track the wiggle through the pipeline x → g → f:",
          steps: [
            { text: "Nudge x by ε. By definition of g′, the intermediate moves by about:", tex: "\\Delta g \\approx g'(x)\\,\\varepsilon" },
            { text: "That Δg is now the input wiggle to f, so the output moves by about:", tex: "\\Delta f \\approx f'(g(x))\\,\\Delta g" },
            { text: "Substitute the first into the second:", tex: "\\Delta f \\approx f'(g(x))\\,g'(x)\\,\\varepsilon" },
            { text: "Output-wiggle per input-wiggle (the derivative) is the product. For a deep pipeline the products keep chaining:", tex: "\\frac{dL}{dx} = \\frac{dL}{du_n}\\cdot\\frac{du_n}{du_{n-1}}\\cdots\\frac{du_1}{dx}" },
          ],
        },
        {
          kind: "code",
          mode: "predict",
          title: "chain rule, by hand then by eye",
          source: `# f(x) = (3x + 1)^2
# outer: u^2  ->  2u ;  inner: 3x+1  ->  3
def df(x):
    return 2 * (3*x + 1) * 3

print(df(0), df(1))`,
          prompt: "What prints?",
          options: ["6 24", "2 8", "6 8", "18 24"],
          answerIndex: 0,
          explanation: "df(x) = 2(3x+1)·3. At x=0: 2·1·3=6. At x=1: 2·4·3=24. Outer sensitivity evaluated at the INNER value, times inner sensitivity. The evaluation point is where beginners slip.",
        },
        {
          kind: "misconception",
          wrong: "For f(g(x)), you evaluate f′ at x: the answer is f′(x)·g′(x).",
          right: "f′ is evaluated at g(x), the value that entered f. Backprop implementations get this right by caching forward values; when you write backprop from scratch in Level 3, the cached activations exist precisely to evaluate local derivatives at the right point.",
        },
      ],
    },
    {
      id: "implement",
      title: "Implement: numerical vs analytic",
      depth: "implementation",
      blocks: [
        {
          kind: "prose",
          md: `The professional pattern you will use for the rest of the program: **derive analytically, verify numerically.** The centered difference $\\frac{f(x+h)-f(x-h)}{2h}$ is accurate to $O(h^2)$ and is exactly how you will gradient-check your backprop in Level 3.`,
        },
        {
          kind: "code",
          mode: "missing",
          title: "gradient checker v0",
          source: `def num_deriv(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)

def f(x):  return (3*x + 1)**2
def df(x): return 2 * (3*x + 1) * 3

for x in [0.0, 1.0, -2.0]:
    gap = abs(num_deriv(f, x) - df(x))
    assert gap < 1e-6, f"analytic wrong at {x}: gap {gap}"
print("analytic derivative verified")`,
          masked: [2],
          prompt: "Write line 2: the centered difference (one line).",
          answer: "return (f(x + h) - f(x - h)) / (2 * h)",
          explanation: "Centered beats forward difference: the O(h) error terms cancel by symmetry, leaving O(h²). With h=1e-5 that's ~1e-10 error, far below the 1e-6 gate.",
        },
        {
          kind: "code",
          mode: "write",
          title: "sensitivity.py",
          source: `# Spec:
# 1. num_deriv(f, x) — centered difference (above, from memory).
# 2. Analytic derivatives for: f1 = x**3 - 2*x,  f2 = exp(-x**2)  (chain!),
#    f3 = 1/(1+exp(-x))  (sigmoid — derive: s(x)(1-s(x)) )
# 3. Verify each against num_deriv at 20 random points, tol 1e-6.
# 4. Print a table: x, sigmoid(x), sigmoid'(x). Note where the
#    derivative is largest and how tiny it is at |x|>4.`,
          checks: [
            "All three analytic derivatives pass the numeric check at 20 random points",
            "You derived sigmoid' = s(1−s) on paper first (write it in a comment)",
            "The table shows sigmoid' max = 0.25 at x=0 and ≈0 for |x|>4",
            "You can say what ≈0 derivative means for learning (vanishing gradient, L3)",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "Where this cashes out",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `- **Backprop (l3-backprop-theory)** is the chain rule organized as a graph algorithm: local sensitivities at each node, multiplied along paths, summed over paths. You have now derived its entire mathematical content.
- **The sigmoid table you just printed** is the vanishing-gradient problem: sensitivities ≤ 0.25 multiplied across many layers → exponentially small learning signal. This observation drove ReLU, residual connections and normalization, three of the biggest ideas in deep learning.
- **Control:** the D in PID (l6-feedback-pid) is a live derivative of error; noisy derivatives are why real controllers filter it.
- **Kinematics:** stack partial derivatives of a robot's forward map into a matrix and you have the Jacobian (l5-jacobians).`,
        },
        {
          kind: "exercise",
          level: 3,
          prompt: "Boss-level: L(w) = (σ(wx) − y)² with x=2, y=1. Using only today's rules, derive dL/dw symbolically, then verify with your num_deriv at w = 0.5. (This is a one-weight neural network, so you are doing backprop.)",
          solution: "dL/dw = 2(σ(wx) − y) · σ(wx)(1−σ(wx)) · x. At w=0.5: σ(1)=0.731, dL/dw = 2(−0.269)(0.197)(2) ≈ −0.212. Chain: loss→prediction→pre-activation→weight.",
        },
        {
          kind: "connection",
          md: "Next: many inputs at once, with partial derivatives and the gradient (l2-multivariable), then descending it (l2-optimization). The exercise above IS l3-backprop-theory in miniature.",
          nodeIds: ["l2-multivariable", "l2-optimization", "l3-backprop-theory"],
        },
        { kind: "sources", note: "3Blue1Brown 'Essence of Calculus' ch. 2 to 4 animates the limit and chain rule. The primary text's exercise sets are your volume practice. Do them; recognition isn't fluency." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** derive x² from the limit cold; differentiate compositions like $e^{-x^2}$ and σ(x) without notes; state the chain rule as a sentence about sensitivities; and your sensitivity.py passes its own asserts. The level-3 exercise done alone = Gold evidence.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
