import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l2-eigen-svd",
  title: "Eigenvectors & the SVD",
  subtitle: "Every machine's true axes, and the theorem that runs robotics",
  minutes: 85,
  sections: [
    {
      id: "why",
      title: "The directions a machine cannot turn",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `Run any matrix machine on every direction of the plane. Most directions get rotated *and* stretched. But some machines have special directions that come out **parallel to how they went in**, only scaled. Those are **eigenvectors**; the scale factor is the **eigenvalue** λ.

Why should a robot-learning person care about a machine's stubborn directions?

- **Stability:** iterate $x \\leftarrow Ax$ (a dynamical system, a recurrent net). Components along eigenvectors with $|\\lambda|>1$ explode; $|\\lambda|<1$ die. Exploding/vanishing gradients *are* this sentence.
- **Manipulability:** at a given pose, an arm moves its hand easily in some directions and barely in others. Those axes and their gains are singular vectors/values of the Jacobian, the ellipse you'll see in Level 5.
- **Structure of data:** PCA is "find the eigenvectors of the covariance", the axes along which the data varies.`,
        },
        {
          kind: "widget",
          id: "matrix-transform",
          caption: "Toggle 'eigenvectors' on. The pink lines are the machine's own axes: points on them only slide along them. Try 'shear': one eigen-direction, doubled. Try 'rotate 45°': no pink lines at all, because a pure rotation turns EVERY direction (complex eigenvalues).",
          params: { eigen: true },
        },
      ],
    },
    {
      id: "formal",
      title: "The defining equation",
      depth: "formalism",
      blocks: [
        {
          kind: "equation",
          tex: "Av = \\lambda v, \\qquad v \\ne 0",
          label: "eigen-equation",
          note: "A acts on v like a scalar. All the structure of A hides in which v's satisfy this.",
        },
        {
          kind: "prose",
          md: `To find them, rewrite as $(A - \\lambda I)v = 0$. A nonzero $v$ exists iff $A-\\lambda I$ squashes space (is singular), i.e. $\\det(A-\\lambda I) = 0$, the **characteristic polynomial**. For 2×2, this is a quadratic: at most 2 eigenvalues, sometimes none real (rotations).

Facts you'll lean on constantly: eigenvalues of a **symmetric** matrix are always real and its eigenvectors are orthogonal (spectral theorem), and covariance matrices, $J J^\\top$, and Hessians are all symmetric. That is why the pretty perpendicular-axes picture is the *common* case in practice.`,
        },
        {
          kind: "quiz",
          title: "compute one, reason one",
          items: [
            {
              q: "Find the eigenvalues of $A=\\begin{bmatrix}3&0\\\\0&\\tfrac12\\end{bmatrix}$, no algebra needed. What are the eigenvectors?",
              a: "λ = 3 with v = (1,0); λ = ½ with v = (0,1). A diagonal matrix wears its eigen-structure openly: it stretches its own axes.",
              why: "Diagonalization is the reverse trick: rewrite any (nice) A as 'a diagonal machine seen in rotated coordinates', A = PDP⁻¹.",
            },
            {
              q: "Iterate x ← Ax with the matrix above, starting from (1,1). What does x look like after 10 steps, roughly?",
              options: [
                "≈ (59049, 0.001): dominated by the λ=3 axis",
                "≈ (30, 5): grows evenly",
                "≈ (1,1): eigenvectors don't move",
                "≈ (0,0): everything shrinks",
              ],
              answerIndex: 0,
              a: "(3¹⁰, 0.5¹⁰) ≈ (59049, 0.00098). The biggest |λ| wins by an exponential margin.",
              why: "This is power iteration, gradient explosion, and 'the spectral radius decides stability', all in one picture.",
            },
          ],
        },
      ],
    },
    {
      id: "derive",
      title: "Derive: why symmetric ⇒ orthogonal axes",
      depth: "derivation",
      blocks: [
        {
          kind: "derivation",
          title: "Spectral theorem, the 4-line core",
          intro: "Let S be symmetric (Sᵀ=S), with Sv₁=λ₁v₁, Sv₂=λ₂v₂ and λ₁≠λ₂. Show v₁ ⟂ v₂:",
          steps: [
            { text: "Hit the first eigen-equation with v₂ᵀ:", tex: "v_2^\\top S v_1 = \\lambda_1 v_2^\\top v_1" },
            { text: "Symmetry lets S hop across the dot product (that's what Sᵀ=S means):", tex: "v_2^\\top S v_1 = (S v_2)^\\top v_1 = \\lambda_2 v_2^\\top v_1" },
            { text: "Two expressions for the same number. Subtract:", tex: "(\\lambda_1 - \\lambda_2)\\, v_2^\\top v_1 = 0" },
            { text: "λ₁ ≠ λ₂ forces the other factor to zero:", tex: "v_2^\\top v_1 = 0 \\;\\;\\blacksquare" },
          ],
        },
        {
          kind: "prose",
          md: `So a symmetric machine is completely described as: **rotate to its axes, stretch each axis by a real λ, rotate back**, $S = Q\\Lambda Q^\\top$ with $Q$ orthogonal. Keep that sentence; the SVD is one step away.`,
        },
      ],
    },
    {
      id: "svd",
      title: "SVD: every matrix, no exceptions",
      depth: "formalism",
      blocks: [
        {
          kind: "equation",
          tex: "A = U\\,\\Sigma\\,V^\\top",
          label: "singular value decomposition",
          note: "Rotate (Vᵀ) → stretch along axes by σ₁ ≥ σ₂ ≥ … ≥ 0 (Σ) → rotate (U). EVERY matrix (rectangular, singular, anything) is exactly this.",
        },
        {
          kind: "prose",
          md: `Eigendecomposition needs a square, nice matrix. The **SVD works on everything**, including the 3×7 Jacobian of a 7-DoF arm. The recipe: $A^\\top A$ is symmetric ⇒ spectral theorem gives orthogonal $V$ and real nonneg eigenvalues $\\sigma_i^2$; define $u_i = Av_i/\\sigma_i$. Done.

Read it as capability analysis: feed the machine the unit circle; out comes an **ellipse** with semi-axes $\\sigma_1 u_1, \\sigma_2 u_2$. For a Jacobian: the ellipse of hand-velocities reachable with unit joint effort. $\\sigma_{\\min} \\to 0$ = a direction the hand *cannot* move = **singularity**. The condition number $\\sigma_{\\max}/\\sigma_{\\min}$ tells you how numerically nasty inverting the machine is.`,
        },
        {
          kind: "misconception",
          wrong: "Singular values are just the absolute values of eigenvalues.",
          right: "Only for symmetric positive semi-definite matrices. In general they're different objects: σᵢ = √(eigenvalues of AᵀA). A rotation has NO real eigenvectors yet σ₁=σ₂=1; a shear [[1,1],[0,1]] has eigenvalues {1,1} but σ ≈ {1.618, 0.618}. Conflating them will silently wreck your reasoning about Jacobians.",
        },
      ],
    },
    {
      id: "implement",
      title: "Implement: see a matrix's skeleton",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "predict",
          title: "svd of a squash",
          source: `import numpy as np
A = np.array([[1., 2.], [0.5, 1.]])   # the 'singular' preset
U, s, Vt = np.linalg.svd(A)
print(np.round(s, 3))`,
          prompt: "det A = 0 here. What are the singular values, qualitatively?",
          options: ["[2.55 0.  ]: one axis dead", "[1.58 1.58]: equal", "[0. 0.]: both dead", "[2.55 2.55]"],
          answerIndex: 0,
          explanation: "Rank 1 ⇒ exactly one nonzero σ. The machine flattens the plane onto a line: one direction survives (σ₁≈2.55), one is annihilated (σ₂=0). det A = ±σ₁σ₂ = 0. This is what a robot-arm singularity looks like in numbers.",
        },
        {
          kind: "code",
          mode: "write",
          title: "spectral.py",
          source: `# Spec — numpy only:
# 1. power_iter(A, iters=50): return dominant eigenvector+value by
#    repeated x = Ax / ||Ax||  (start from random x). Verify against
#    np.linalg.eig on a random SYMMETRIC 4x4 (S = B + B.T).
# 2. For J = np.array([[1., 0.8, 0.2],[0., 0.6, 0.9]])  (2x3 'Jacobian'):
#    - svd; print sigma. Feed 200 unit vectors u (random angles in R^3? no —
#      random unit vectors in R^3), plot/print max and min ||J u||.
#    - confirm max ≈ sigma_1 and min over the unit sphere ≈ sigma_min...
#      (careful: for a 2x3 map min over the 3-sphere is 0 — the null space!
#      confirm the min is ~0 and explain why in a comment)
# 3. cond(A) = s[0]/s[-1] for the singular preset above -> inf-ish; print it.`,
          checks: [
            "power_iter matches np.linalg.eig's top eigenpair (up to sign) on a symmetric 4×4",
            "max ‖Ju‖ over sampled unit vectors ≈ σ₁ (within 2%)",
            "Comment correctly explains the min is ≈0 because a 2×3 map has a null direction",
            "cond of the singular matrix prints > 1e15 (numerically infinite)",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "Where the skeleton shows up",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `- **l5-jacobians:** the manipulability ellipse in the PlanarArm widget is $U\\Sigma$ of the Jacobian, drawn at the hand. Damped least squares adds λ²I exactly to lift σ_min off zero before inverting.
- **Training dynamics (L3/L4):** gradient explosion/vanishing tracks the spectrum of repeated Jacobians; spectral norm (σ₁) bounds a layer's Lipschitz constant; Adam's per-parameter scaling is a cheap fix for bad conditioning σ₁/σ_min.
- **PCA / representation learning (L8):** the top singular vectors of a data matrix are the directions of maximal variance, the 'shape' of a dataset.
- **Low-rank fine-tuning (LoRA, used on VLAs in L12):** keep only the top-k singular directions of a weight update. The SVD is why that works.`,
        },
        {
          kind: "connection",
          md: "The eigen/SVD picture returns with force in l5-jacobians (manipulability, DLS) and quietly underneath l3-sgd-optimizers (conditioning). The Attention paper's $1/\\sqrt{d}$ scaling is a variance/spectrum argument you can now read.",
          nodeIds: ["l5-jacobians", "l3-sgd-optimizers"],
          paperIds: ["paper-attention"],
        },
        { kind: "sources", note: "3Blue1Brown ch. 14 for eigen-intuition; the MML book §4.2/4.4-4.5 for the spectral theorem and SVD done rigorously. Optional: Steve Brunton's SVD series if you want the data-driven angle on video." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** find eigenpairs of a 2×2 by hand; reproduce the symmetric-⇒-orthogonal derivation cold; state what σ's mean geometrically (unit circle → ellipse) and physically for a Jacobian; spectral.py passes. Gold = you can explain to an empty chair why DLS damping fixes near-singular IK, using only σ's.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
