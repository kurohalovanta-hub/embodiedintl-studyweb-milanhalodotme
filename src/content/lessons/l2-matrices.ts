import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l2-matrices",
  title: "Matrices as Machines",
  subtitle: "Linear maps, composition, and why every layer is a matrix",
  minutes: 80,
  sections: [
    {
      id: "why",
      title: "The machine that moves space",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `Stop thinking of a matrix as a table of numbers. A matrix is a **machine that takes a vector in and gives a vector out**. It is the *only* kind of machine that keeps grids straight and the origin fixed (a *linear* map). Everything in this program is built from these machines:

- a neural network layer: $y = Wx + b$ (a matrix, then a shift)
- a rotation of a robot's wrist: $p' = Rp$
- a camera projecting 3-D points to pixels: $u = KP$
- the Jacobian mapping joint speeds to hand speeds: $\\dot x = J\\dot q$

Learn to *see* the machine and its behavior (stretch, rotate, squash) and all four of those become one idea.`,
        },
        {
          kind: "callout",
          tone: "insight",
          title: "the one fact to carry",
          md: `**The columns of $A$ are where the basis vectors land.** Column 1 = image of $\\hat\\imath$, column 2 = image of $\\hat\\jmath$. If you know where the basis goes, linearity forces where *everything* goes. Every other fact in this lesson falls out of this.`,
        },
      ],
    },
    {
      id: "see",
      title: "Drive the machine",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "matrix-transform",
          caption: "Drag the four entries. Watch the columns (the two arrows): they ARE the matrix. Morph I → A to see the map as motion. Try each preset; end on 'singular' and watch 2-D space flatten to a line.",
        },
        {
          kind: "quiz",
          title: "read the machine",
          items: [
            {
              q: "Without computing: what matrix sends $\\hat\\imath \\to (0,1)$ and $\\hat\\jmath \\to (-1,0)$?",
              options: [
                "$\\begin{bmatrix}0&-1\\\\1&0\\end{bmatrix}$: rotation by 90°",
                "$\\begin{bmatrix}0&1\\\\-1&0\\end{bmatrix}$: rotation by −90°",
                "$\\begin{bmatrix}1&0\\\\0&-1\\end{bmatrix}$: flip",
                "$\\begin{bmatrix}-1&0\\\\0&1\\end{bmatrix}$",
              ],
              answerIndex: 0,
              a: "Columns are the images of the basis: [[0,1],[−1,0]] stacked as columns: the 90° rotation.",
              why: "No arithmetic needed: write the images of î and ĵ as the columns. This is how you should *construct* matrices, not only read them.",
            },
            {
              q: "In the widget, the 'singular' preset flattens the plane onto a line. What is det A there, and what information is lost?",
              a: "det A = 0. All points along the squashed direction map to the same output, so you cannot invert the map. (1·1 − 2·0.5 = 0.)",
            },
          ],
        },
      ],
    },
    {
      id: "formal",
      title: "The formal object",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `A map $f:\\mathbb R^n \\to \\mathbb R^m$ is **linear** iff $f(u+v)=f(u)+f(v)$ and $f(cv)=c\\,f(v)$. Every linear map is multiplication by exactly one $m\\times n$ matrix, and every matrix defines one. Shapes: an $m\\times n$ matrix eats $\\mathbb R^n$ and emits $\\mathbb R^m$: **(out × in)**. A $128\\times 768$ weight matrix takes 768-dim features to 128-dim.`,
        },
        {
          kind: "derivation",
          title: "Why row-times-column is forced (not a convention)",
          intro: "People memorize the matmul rule. It is the only rule consistent with 'columns are where the basis lands'. Derive it:",
          steps: [
            { text: "Any input vector is a recipe of basis vectors:", tex: "x = x_1\\hat e_1 + x_2\\hat e_2 + \\cdots + x_n\\hat e_n" },
            { text: "Apply A; linearity distributes it over the sum:", tex: "Ax = x_1(A\\hat e_1) + x_2(A\\hat e_2) + \\cdots + x_n(A\\hat e_n)" },
            { text: "But $A\\hat e_j$ is by definition the j-th column $a_j$:", tex: "Ax = x_1 a_1 + x_2 a_2 + \\cdots + x_n a_n" },
            { text: "So Ax is a weighted mix of A's columns, weights = entries of x. Reading off row i of that mix gives the familiar formula:", tex: "(Ax)_i = \\sum_j A_{ij}x_j" },
            { text: "The matrix-matrix product is this applied to each column of B, which makes AB 'do B, then A':", tex: "(AB)x = A(Bx)" },
          ],
        },
        {
          kind: "misconception",
          wrong: "Matrix multiplication is a weird arbitrary rule to memorize (row times column, sum).",
          right: "It's forced: Ax must be 'mix A's columns using x's entries' for the columns-are-basis-images picture to hold. If you forget the formula, re-derive it from that in ten seconds.",
        },
      ],
    },
    {
      id: "compose",
      title: "Composition, and why order matters",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `$AB$ means **apply B first, then A** (it acts on x from the right: $ABx = A(Bx)$). Composition of machines is generally order-dependent: rotate-then-stretch ≠ stretch-then-rotate. So $AB \\ne BA$ in general. Matrices don't commute, and the reason is geometric.

Key identities you'll use weekly: $(AB)^\\top = B^\\top A^\\top$, $(AB)^{-1} = B^{-1}A^{-1}$ (both reverse order: "socks then shoes, off in reverse"), $\\det(AB) = \\det A \\det B$ (areas multiply).`,
        },
        {
          kind: "code",
          mode: "predict",
          title: "order matters: predict",
          source: `import numpy as np
R = np.array([[0., -1.], [1., 0.]])   # rotate +90°
S = np.array([[2., 0.], [0., 1.]])    # stretch x by 2
x = np.array([1., 0.])
print(R @ S @ x, S @ R @ x)`,
          prompt: "What prints? Trace each pipeline right-to-left on the vector (1,0).",
          options: ["[0. 2.] [0. 1.]", "[0. 2.] [0. 2.]", "[2. 0.] [0. 2.]", "[0. 1.] [0. 2.]"],
          answerIndex: 0,
          explanation: `R@S@x: stretch first → (2,0), then rotate 90° → (0,2). S@R@x: rotate first → (0,1), then stretch **x** (which is now 0) → (0,1). Different machines. Reading pipelines right-to-left is a skill you'll use on every kinematic chain in Level 5: ${"$"}^W T_{ee} = T_1 T_2 T_3${"$"} applies joint 3 first.`,
        },
      ],
    },
    {
      id: "special",
      title: "The special machines",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `Four machines you must recognize on sight:

- **Identity $I$**: does nothing; ones on the diagonal. $AI = IA = A$.
- **Inverse $A^{-1}$**: the undo machine, which exists iff $\\det A \\ne 0$. $A^{-1}Ax = x$.
- **Transpose $A^\\top$**: flip across the diagonal. Algebraically: $(Ax)\\cdot y = x\\cdot(A^\\top y)$, so it moves a matrix to the other side of a dot product. This is the reason $J^\\top$ maps forces when $J$ maps velocities.
- **Orthogonal $Q$** ($Q^\\top Q = I$): preserves lengths and angles (pure rotations/reflections). Its inverse is free: $Q^{-1} = Q^\\top$. Every rotation matrix in robotics is orthogonal with $\\det = +1$.`,
        },
        {
          kind: "quiz",
          title: "spot check",
          items: [
            {
              q: "R is a rotation matrix. What is $R^\\top R$, and why is that computationally wonderful?",
              a: "$I$. Inverting a rotation costs a transpose, with no linear solve. Robot code inverts rotations thousands of times per second this way.",
            },
            {
              q: "A is 3×7 (Jacobian of a 7-joint arm, position only). What are the shapes of $A^\\top$ and $A^\\top A$, and can A be inverted?",
              a: "$A^\\top$ is 7×3; $A^\\top A$ is 7×7. A is not square so it has no inverse, which is why IK uses pseudo-inverses / DLS (Level 5).",
            },
          ],
        },
      ],
    },
    {
      id: "implement",
      title: "Implement the machine",
      depth: "implementation",
      blocks: [
        {
          kind: "prose",
          md: `NumPy: \`A @ x\` is matrix-vector, \`A @ B\` matrix-matrix, \`A.T\` transpose, \`np.linalg.inv(A)\` inverse (use \`np.linalg.solve(A, b)\` instead when solving $Ax=b$; it is faster and more stable). First, prove you own the formula by writing matvec yourself:`,
        },
        {
          kind: "code",
          mode: "missing",
          title: "matvec from scratch",
          source: `def matvec(A, x):
    """A: list of rows; x: list. Returns Ax."""
    out = []
    for row in A:
        s = sum(a * xi for a, xi in zip(row, x))
        out.append(s)
    return out

R90 = [[0, -1], [1, 0]]
assert matvec(R90, [1, 0]) == [0, 1]`,
          masked: [5],
          prompt: "Write line 5: the dot product of `row` with `x` (one line, zip + sum).",
          answer: "s = sum(a * xi for a, xi in zip(row, x))",
          explanation: "Each output entry is a dot product of one row with x, so matvec is n dot products. Seeing this makes attention (Level 4) instant: QKᵀ is 'every row dotted with every row'.",
        },
        {
          kind: "code",
          mode: "write",
          title: "transforms.py",
          source: `# Spec — with numpy:
# 1. rot(theta): return 2x2 rotation matrix [[c,-s],[s,c]]
# 2. Verify numerically: rot(a) @ rot(b) ≈ rot(a+b)   (np.allclose)
# 3. Verify: rot(t).T @ rot(t) ≈ I  for 100 random t
# 4. det check: np.linalg.det(rot(t)) ≈ 1.0
# 5. Compose rot(pi/2) with stretch S=diag(2,1) both orders;
#    print both results applied to [1,0] — confirm they differ.`,
          checks: [
            "All three numeric verifications pass (np.allclose, atol=1e-9)",
            "The two composition orders give (0,2) vs (0,1) on [1,0]",
            "rot uses np.cos/np.sin, no hardcoded values",
            "You can say aloud why rot(a)@rot(b)=rot(a+b) is geometrically obvious",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "The same machine, four rooms",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `Where exactly you will meet this machine again:

- **Level 3 to 4 (networks):** every layer is $Wx+b$; a Transformer is ~98% matmuls by FLOPs. Shapes (out × in) are how you'll debug them.
- **Level 5 (kinematics):** rotation matrices compose along the arm; $J^\\top$ moves wrenches while $J$ moves twists. That is the transpose identity above at work.
- **Level 8 (vision):** the camera intrinsic matrix $K$ maps 3-D rays to pixels; calibration is estimating one matrix.
- **Attention (paper):** $\\text{softmax}(QK^\\top/\\sqrt d)V$: three matmuls and a normalization. You can already read two-thirds of the most cited equation in ML.`,
        },
        {
          kind: "connection",
          md: "Next: linear maps' deeper structure (rank, null space) in l2-linear-maps, then the directions a machine can't turn (eigenvectors) in l2-eigen-svd. The attention paper becomes readable once those land.",
          nodeIds: ["l2-linear-maps", "l2-eigen-svd"],
          paperIds: ["paper-attention"],
        },
        { kind: "sources", note: "3Blue1Brown 'Essence of Linear Algebra' ch. 3 to 4 is the animated version of this lesson's geometry. It is optional; watch at 1.5× if the widget wasn't enough. The MML book sections are the rigorous backup." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** construct a matrix from a geometric description (columns!), predict a two-machine composition without computing, state and use $(AB)^\\top = B^\\top A^\\top$ and $Q^\\top Q=I$, and your \`transforms.py\` passes all checks. Gold means you could re-derive the matmul formula from linearity on a whiteboard, alone.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
