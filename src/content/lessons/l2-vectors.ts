import type { Lesson } from "@/lib/lesson-types";

// Grounded in: VMLS ch 1,3 (+ Python companion), 3B1B Essence of LA ch 1–2, 9.
// Written for the 210-day graph: every claim points at a consumer node.
export const lesson: Lesson = {
  nodeId: "l2-vectors",
  title: "Vectors & Dot Products",
  subtitle: "The data type of this entire field, and the one operation you will use every day",
  minutes: 70,
  sections: [
    {
      id: "why",
      title: "Everything here is a vector",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `Open any robot-learning system and look at what flows through it. A robot arm's pose: seven joint angles, $[\\theta_1, \\dots, \\theta_7]$. A camera image, to a neural network: a long list of pixel brightnesses. The word "grasp", inside a language model: 4,096 numbers. The action a policy outputs: a short list of motor targets.

**All of it is the same object: an ordered list of numbers, called a vector.**

This is the *data type* of embodied intelligence. Every system you will build in the next 200 days (the MLP in Level 3, the Transformer in Level 4, the kinematics library in Level 5, the VLA fine-tune in Level 12) consumes vectors, transforms vectors, and emits vectors.`,
        },
        {
          kind: "callout",
          tone: "insight",
          title: "the one operation to watch for",
          md: `Almost every one of those systems runs on one recurring operation, the **dot product**: multiply matching entries, add them up. Attention in a Transformer is dot products between query and key vectors. "How similar are these two images" in CLIP is a dot product. The torque a force produces through a robot's joints is dot products (via $J^\\top f$, Level 5). Learn this one operation well today and you will keep recognizing it for months.`,
        },
        {
          kind: "quiz",
          items: [
            {
              q: "A SO-101 robot arm has 6 motors. As a vector, its joint configuration lives in which space?",
              options: ["$\\mathbb{R}^2$: it's a 2D drawing", "$\\mathbb{R}^6$: one number per joint", "$\\mathbb{R}^3$: physical space is 3D", "It's not a vector"],
              answerIndex: 1,
              a: "ℝ⁶: one real number (an angle) per joint.",
              why: "The arm exists in 3D *space*, but its **configuration** is a point in 6-dimensional joint space. Getting comfortable with 'spaces' that aren't physical space is half of this level.",
            },
          ],
        },
      ],
    },
    {
      id: "two-views",
      title: "Two views of the same object",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `Hold both of these pictures at once. You will switch between them constantly:

- **The arrow view** (geometry): $a = [2, 1]$ is an arrow from the origin: 2 right, 1 up. Length and direction are what matter. This view powers intuition about rotations, projections, and robot motion.
- **The data view** (computation): $a = [2, 1]$ is a container of measurements, maybe \`[gripper_width, wrist_angle]\`. This view is what NumPy sees, and what neural networks eat.

In linear algebra, *geometric* reasoning in the arrow view gives you *computational* recipes in the data view, even in 4,096 dimensions where nobody can picture arrows.`,
        },
        {
          kind: "widget",
          id: "vector-playground",
          caption: "Drag the tips of a and b. Watch the readouts: length ‖a‖, the dot product a·b, the angle between them. Make a·b exactly zero. What angle do you land on? Then toggle a+b and notice the parallelogram: addition means 'walk along a, then along b'.",
        },
        {
          kind: "misconception",
          wrong: "\"A vector IS its coordinates: $[2,1]$ is the vector.\"",
          right: "The arrow is the vector; $[2,1]$ is its *description in a coordinate frame*. Change the frame (tilt the axes) and the same arrow gets different numbers. This distinction feels pedantic today. In Level 5 it matters everywhere: a robot's gripper position has *different coordinates* in the camera frame, the base frame, and the world frame, and mixing them up is the #1 practical bug in robotics.",
        },
      ],
    },
    {
      id: "algebra",
      title: "The algebra: add, scale, measure",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `Three primitive operations, all entrywise, all exactly what your intuition wants:

**Addition** (walk one, then the other): $a + b = [a_1{+}b_1,\\; a_2{+}b_2, \\dots]$

**Scaling** (stretch or flip): $c\\,a = [c\\,a_1,\\; c\\,a_2, \\dots]$. Negative $c$ reverses direction.

**Length (norm)**, Pythagoras in any dimension:`,
        },
        {
          kind: "equation",
          tex: "\\|a\\| = \\sqrt{a_1^2 + a_2^2 + \\cdots + a_n^2}",
          label: "euclidean norm",
          note: "In n dimensions you can't draw it, but the formula, and everything built on it, works identically.",
        },
        {
          kind: "prose",
          md: `A **unit vector** has length 1: pure direction, no magnitude. Any nonzero $a$ becomes one by dividing by its own length: $\\hat{a} = a / \\|a\\|$. You will normalize vectors hundreds of times: embeddings before cosine similarity, axes of rotation in Level 5, gradient directions in optimization.`,
        },
        {
          kind: "quiz",
          items: [
            {
              q: "Compute in your head: $\\|\\,[3, 4]\\,\\|$, then $\\| -2\\,[3,4] \\,\\|$.",
              a: "5, then 10.",
              why: "3-4-5 triangle; scaling by $c$ scales the norm by $|c|$. The sign flips direction, not length.",
            },
            {
              q: "Two policies output action vectors $u_1 = [0.2, 0.1]$ and $u_2 = [-0.2, -0.1]$ (wheel velocities). What does $u_1 + u_2$ command, physically?",
              options: ["Full speed ahead", "The zero vector: the commands cancel and the robot doesn't move", "A turn in place", "Undefined"],
              answerIndex: 1,
              a: "The zero vector: exact cancellation.",
              why: "Vector addition is how control commands, forces, and velocity contributions combine. Cancellation is a feature (and sometimes a bug you'll debug).",
            },
          ],
        },
      ],
    },
    {
      id: "dot",
      title: "The dot product: one number, two meanings",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `The dot product takes two vectors and returns **one number**:`,
        },
        {
          kind: "equation",
          tex: "a \\cdot b \\;=\\; \\sum_i a_i b_i \\;=\\; \\|a\\|\\,\\|b\\|\\cos\\theta",
          label: "the algebraic and geometric faces",
          note: "The left side is what you compute (multiply-and-add). The right side is what it means (aligned-ness). The next section proves they are the same thing.",
        },
        {
          kind: "prose",
          md: `Read the geometric face as a **similarity meter**:

- $a \\cdot b > 0$: pointing broadly the *same way* ($\\theta < 90°$)
- $a \\cdot b = 0$: **perpendicular**; the vectors carry no information about each other
- $a \\cdot b < 0$: pointing broadly *opposite* ways

This is how a Transformer decides which words attend to which (query·key), how CLIP scores image-caption match, and how you'll measure whether a policy's action agrees with an expert's.`,
        },
        {
          kind: "quiz",
          title: "similarity intuition",
          items: [
            {
              q: "$a=[1,0,2]$, $b=[2,1,-1]$. Compute $a\\cdot b$ and interpret the sign.",
              a: "1·2 + 0·1 + 2·(−1) = 0, so exactly perpendicular.",
              why: "Multiply matching slots, add. Zero means: knowing a tells you nothing about b along its direction.",
            },
            {
              q: "In attention, the score between query $q$ and key $k$ is $q\\cdot k$. If a token should attend STRONGLY to another, their q/k vectors must be…",
              options: ["perpendicular", "pointing in similar directions (large positive dot)", "both unit length", "in different spaces"],
              answerIndex: 1,
              a: "Aligned: large positive dot product.",
              why: "Attention is 'route information where the dot product is big'. You will build this in Level 4 (l4-attention) with this exact intuition.",
            },
          ],
        },
      ],
    },
    {
      id: "derive-cos",
      title: "Derive it: why multiply-and-add measures angle",
      depth: "derivation",
      blocks: [
        {
          kind: "prose",
          md: `The identity $\\sum_i a_i b_i = \\|a\\|\\|b\\|\\cos\\theta$ is the first real derivation of your program. Work each step before revealing the next. The goal is that *you* could reproduce this on paper tomorrow.

First, a warm-up you'll use inside the proof:`,
        },
        {
          kind: "derivation",
          title: "‖a‖² = a·a",
          steps: [
            { text: "Write the dot product of a vector with itself:", tex: "a\\cdot a = \\sum_i a_i a_i = \\sum_i a_i^2" },
            { text: "Compare with the norm definition:", tex: "\\|a\\|=\\sqrt{\\textstyle\\sum_i a_i^2}\\;\\;\\Rightarrow\\;\\; \\|a\\|^2 = \\sum_i a_i^2" },
            { text: "They are the same sum. So the norm is the dot product in disguise:", tex: "\\boxed{\\;\\|a\\|^2 = a\\cdot a\\;}" },
          ],
        },
        {
          kind: "derivation",
          title: "the cosine identity",
          intro: "Strategy: compute the squared length of the difference a−b two ways, once with algebra and once with the law of cosines, and compare.",
          steps: [
            {
              text: "**Algebraically.** Expand using ‖v‖² = v·v and the fact that the dot product distributes over addition (check this entrywise; it's multiplication distributing):",
              tex: "\\|a-b\\|^2 = (a-b)\\cdot(a-b) = a\\cdot a - 2\\,a\\cdot b + b\\cdot b = \\|a\\|^2 + \\|b\\|^2 - 2\\,a\\cdot b",
            },
            {
              text: "**Geometrically.** The vectors a, b and the difference a−b form a triangle with sides ‖a‖, ‖b‖, ‖a−b‖ and angle θ between a and b. The law of cosines (trig from your repair track, earning rent) says:",
              tex: "\\|a-b\\|^2 = \\|a\\|^2 + \\|b\\|^2 - 2\\,\\|a\\|\\|b\\|\\cos\\theta",
            },
            {
              text: "Two expressions for the same quantity. Cancel the shared ‖a‖² + ‖b‖² terms and divide by −2:",
              tex: "\\boxed{\\;a\\cdot b = \\|a\\|\\,\\|b\\|\\cos\\theta\\;}",
            },
            {
              text: "Pause on what happened: a *coordinate computation* (multiply-and-add) turned out to equal a *coordinate-free geometric statement* (lengths and angle). This is why the dot product means the same thing in ℝ⁴⁰⁹⁶ as in ℝ². Angles between embeddings are not a metaphor.",
            },
          ],
        },
        {
          kind: "exercise",
          level: 1,
          prompt: "Close the page. Reproduce both derivations on paper from memory. (This is tomorrow's review prompt too. Do it now and tomorrow is easy.)",
          hint: "The only two ingredients: ‖v‖² = v·v, and the law of cosines on the triangle a, b, a−b.",
        },
      ],
    },
    {
      id: "projection",
      title: "Projection: the shadow that runs the field",
      depth: "derivation",
      blocks: [
        {
          kind: "prose",
          md: `**Question:** given vectors $a$ and $b$, what multiple of $b$ best approximates $a$? Geometrically: drop a perpendicular from the tip of $a$ onto the line through $b$. The foot of that perpendicular is the shadow. This one construction is least-squares regression (Level 3), the heart of attention's weighted sums, and how you'll decompose forces along robot axes.`,
        },
        {
          kind: "derivation",
          title: "projection formula from orthogonality",
          intro: "We want the scalar c that makes c·b closest to a. 'Closest' means the leftover error is perpendicular to b.",
          steps: [
            { text: "Name the error, what's left of a after removing the part along b:", tex: "e = a - c\\,b" },
            { text: "Impose the geometric condition: at the best c, the error is perpendicular to b (any remaining component along b could be removed by adjusting c):", tex: "e \\cdot b = 0" },
            { text: "Substitute and distribute:", tex: "(a - c\\,b)\\cdot b = a\\cdot b - c\\,(b\\cdot b) = 0" },
            { text: "Solve for c, then write the projection itself:", tex: "c = \\frac{a\\cdot b}{b\\cdot b}\\qquad \\operatorname{proj}_b a = \\frac{a\\cdot b}{b\\cdot b}\\, b" },
            { text: "Sanity checks you should run in your head: if a ⟂ b, the projection is the zero vector (dot is 0 ✓). If a is already a multiple of b, the projection returns a exactly ✓.", },
          ],
        },
        {
          kind: "widget",
          id: "vector-playground",
          caption: "Toggle 'projection'. Drag a around a fixed b: watch the shadow grow, shrink, vanish at 90°, and flip negative past it. That sign flip is the dot product's sign, made visible.",
        },
        {
          kind: "exercise",
          level: 2,
          prompt: "Derive the projection formula yourself starting from a different principle: minimize the squared error $f(c) = \\|a - cb\\|^2$ using ordinary 1-variable calculus (expand, differentiate w.r.t. $c$, set to zero). Confirm you get the same $c$.",
          hint: "Expand $f(c) = a\\cdot a - 2c\\,(a\\cdot b) + c^2 (b\\cdot b)$, a parabola in $c$.",
          solution: "$f'(c) = -2\\,a\\cdot b + 2c\\,(b\\cdot b) = 0 \\Rightarrow c = (a\\cdot b)/(b\\cdot b)$. Same answer: orthogonality and minimization are the same condition. That equivalence IS least squares, and you will meet it again in l2-linear-maps as the normal equations.",
        },
      ],
    },
    {
      id: "implement",
      title: "Implement it: NumPy is vector-native",
      depth: "implementation",
      blocks: [
        {
          kind: "prose",
          md: `Everything above is a few characters of NumPy. The skill to build now is *predict before you run*, a habit that will save you hundreds of debugging hours.`,
        },
        {
          kind: "code",
          mode: "predict",
          title: "predict the output",
          source: `import numpy as np

a = np.array([3.0, 4.0])
b = np.array([4.0, -3.0])

print(np.linalg.norm(a))
print(a @ b)`,
          prompt: "Two lines print. Commit to both values before revealing.",
          answer: "5.0 then 0.0",
          explanation: "‖[3,4]‖ = 5 (the 3-4-5 triangle). And 3·4 + 4·(−3) = 0, so these vectors are perpendicular. `@` is the dot product for 1-D arrays; you'll use it daily.",
        },
        {
          kind: "code",
          mode: "missing",
          title: "cosine similarity: write the missing line",
          source: `def cosine_similarity(a, b):
    """Angle-based similarity in [-1, 1], used from CLIP to embeddings."""
    na = np.linalg.norm(a)
    nb = np.linalg.norm(b)
    return ____________________`,
          masked: [5],
          prompt: "Write the return line. (Guard against division by zero mentally; production code would.)",
          answer: "return (a @ b) / (na * nb)",
          explanation: "Straight from $\\cos\\theta = \\frac{a\\cdot b}{\\|a\\|\\|b\\|}$. When you compare learned embeddings in Level 4 and probe robot representations in Level 8, this exact function is what runs.",
        },
        {
          kind: "code",
          mode: "write",
          title: "implementation from spec",
          source: `# vectors.py — your first library module (goes in your exercises repo)
# Implement WITHOUT importing numpy (lists + loops only), then again WITH numpy.
#
#   norm(a)        -> float
#   dot(a, b)      -> float
#   angle(a, b)    -> float (radians)
#   project(a, b)  -> list/array  (projection of a onto b)`,
          prompt: "Do this in your real editor: pure-Python first (loops make the definitions concrete), then the NumPy one-liners.",
          checks: [
            "norm([3,4]) == 5.0 and dot([1,0,2],[2,1,-1]) == 0.0",
            "angle([1,0],[0,1]) ≈ π/2 to 6 decimals",
            "project([2,1],[1,0]) == [2,0], and project(a,b) + (a − project(a,b)) reassembles a",
            "your NumPy version matches your loop version on 5 random vectors (write the comparison loop)",
          ],
        },
        {
          kind: "connection",
          md: "The habit you just practiced (implement from the math, verify against a second implementation) is the workflow of your Level 5 kinematics library (your code vs. MuJoCo's) and every reproduction in Month 6.",
          nodeIds: ["l1-numpy", "l1-vectorization-craft"],
        },
      ],
    },
    {
      id: "embodied",
      title: "Where you'll meet it again (sooner than you think)",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `Four appearances of today's material, spread across your next five months:

1. **Level 3, next week-ish:** linear regression's predictions are dot products $\\hat y = w \\cdot x$; least squares IS the projection you derived today, upgraded to matrices.
2. **Level 4:** attention scores are dot products $q\\cdot k/\\sqrt{d}$, and each output token is a *weighted vector sum*: today's addition and scaling at industrial scale.
3. **Level 5:** joint-space distance $\\|\\theta_1 - \\theta_2\\|$ decides whether two arm configurations are 'close', and motion planning depends on it. Torque transmits through $\\tau = J^\\top f$: rows of dot products.
4. **Level 12:** whether a VLA's predicted action chunk matches the demonstration is measured with the operations from this lesson.`,
        },
        {
          kind: "quiz",
          title: "transfer check",
          items: [
            {
              q: "A grasp-quality network scores candidate grasps. Internally, a learned 'good grasp direction' vector $g$ is dotted with each candidate's feature vector $f$. A candidate scores $g\\cdot f = -3.2$. Interpret the score.",
              a: "The candidate's features point away from the learned good-grasp direction: a poor grasp, and confidently so (large magnitude, negative sign).",
              why: "Sign = agreement/opposition, magnitude = strength. Reading dot products like this is a daily literacy in robot learning.",
            },
            {
              q: "Why does normalizing embeddings to unit length before dotting them (cosine similarity) sometimes matter for retrieval?",
              a: "Raw dot products conflate direction-similarity with vector length: a 'louder' (longer) embedding wins regardless of direction. Normalizing makes the comparison purely about angle.",
              why: "CLIP normalizes; many retrieval systems do. When you probe robot representations in l8-repr-learning, you'll choose deliberately.",
            },
          ],
        },
      ],
    },
    {
      id: "gate",
      title: "Prove it, then go deeper",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `The gate below is the node's Gold test. Honest rules: the derivation from a blank page, the code from an empty file. If you cruised through this lesson, claim now. The graph unlocks **matrices** (where these vectors start *moving*).`,
        },
        { kind: "mastery" },
        {
          kind: "sources",
          note: "This lesson is the fast path; these are the full treatments it was distilled from.",
        },
        {
          kind: "connection",
          md: "Unlocks next: matrices as *machines that move vectors*, and from there the road to rotations, transformations, and your robot's frames.",
          nodeIds: ["l2-matrices", "l2-linear-maps"],
          paperIds: ["paper-attention"],
        },
      ],
    },
  ],
};
