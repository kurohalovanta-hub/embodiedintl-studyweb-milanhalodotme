import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l5-jacobians",
  title: "The Jacobian",
  subtitle: "The matrix between joint space and the world",
  minutes: 90,
  sections: [
    {
      id: "why",
      title: "The exchange rate between two spaces",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `Your arm lives in **joint space** (angles θ); the task lives in **task space** (where the hand is). Forward kinematics $x = f(\\theta)$ connects them, but it's nonlinear, so it can't directly answer the operational questions: *if joint 2 speeds up, which way does the hand move? Which joints should move to nudge the hand 1 cm left? Near which poses does the arm go helpless?*

The **Jacobian** answers them. It is the matrix of all partial derivatives of the forward map: the multivariable derivative from l2-multivariable, applied to an arm. Locally, the nonlinear map IS this matrix:`,
        },
        {
          kind: "equation",
          tex: "\\dot x = J(\\theta)\\,\\dot\\theta, \\qquad J_{ij} = \\frac{\\partial f_i}{\\partial \\theta_j}",
          label: "the velocity map",
          note: "Column j = where the hand goes if ONLY joint j moves at 1 rad/s. Columns-are-images-of-basis (l2-matrices), now with motors.",
        },
      ],
    },
    {
      id: "see",
      title: "See the columns move a real arm",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "planar-arm",
          caption: "Jacobian mode: each colored arrow at the hand is one COLUMN of J: joint i's contribution to hand velocity. The green ellipse is every velocity reachable with ‖θ̇‖=1 (axes = singular values, straight from l2-eigen-svd). Lab: slowly straighten the arm and watch the ellipse collapse to a line. That collapse is a singularity.",
          params: { mode: "jac" },
        },
        {
          kind: "quiz",
          title: "read the machine",
          items: [
            {
              q: "For a 2-link planar arm, why is column 2 of J always perpendicular to link 2 (and shorter than column 1)?",
              a: "Joint 2 rotates only link 2 about the elbow: the hand instantaneously moves perpendicular to the elbow-to-hand segment, with speed = that segment's length. Column 1 does the same about the base: longer lever, longer arrow.",
              why: "Each column is 'rotate everything downstream of me about my axis', so you can sketch J for any planar arm with no algebra.",
            },
            {
              q: "At the straight-arm singularity, σ₂ = 0. State physically what the arm cannot do there.",
              a: "No joint velocity at all produces hand motion along the lost ellipse axis (radially, further outward). The map's range has dropped a dimension; commanding motion that way demands infinite joint speed.",
            },
          ],
        },
      ],
    },
    {
      id: "derive",
      title: "Derive J for the 2-link arm in full",
      depth: "derivation",
      blocks: [
        {
          kind: "derivation",
          title: "From forward kinematics to every entry",
          intro: "FK for links ℓ₁, ℓ₂ (φ₂ = θ₁+θ₂ is link 2's absolute angle). Differentiate with the chain rule on every term:",
          steps: [
            { text: "Forward kinematics:", tex: "x = \\ell_1\\cos\\theta_1 + \\ell_2\\cos(\\theta_1{+}\\theta_2), \\quad y = \\ell_1\\sin\\theta_1 + \\ell_2\\sin(\\theta_1{+}\\theta_2)" },
            { text: "∂x/∂θ₁ (both terms contain θ₁):", tex: "\\tfrac{\\partial x}{\\partial \\theta_1} = -\\ell_1\\sin\\theta_1 - \\ell_2\\sin(\\theta_1{+}\\theta_2)" },
            { text: "∂x/∂θ₂ (only the second term):", tex: "\\tfrac{\\partial x}{\\partial \\theta_2} = -\\ell_2\\sin(\\theta_1{+}\\theta_2)" },
            { text: "Same for y; assemble:", tex: "J = \\begin{bmatrix} -\\ell_1 s_1 - \\ell_2 s_{12} & -\\ell_2 s_{12} \\\\ \\ \\ \\ell_1 c_1 + \\ell_2 c_{12} & \\ \\ \\ell_2 c_{12} \\end{bmatrix}" },
            { text: "Sanity: column 2 is ℓ₂·(−s₁₂, c₁₂): length ℓ₂, perpendicular to link 2, which proves the quiz answer. And det J = ℓ₁ℓ₂ sin θ₂ → zero exactly when the elbow straightens (θ₂ = 0 or π).", tex: "\\det J = \\ell_1\\ell_2\\sin\\theta_2" },
          ],
        },
        {
          kind: "misconception",
          wrong: "Singularities are numerical edge cases you can ignore with double precision.",
          right: "det J = ℓ₁ℓ₂ sinθ₂ says the singularity is a PHYSICAL configuration (straight or folded elbow), not a float problem. Near it, J⁻¹ has entries ~1/sinθ₂ → commanded joint speeds explode and real arms fault out. Precision doesn't help; damping (below) does.",
        },
      ],
    },
    {
      id: "transpose",
      title: "The transpose moves forces",
      depth: "formalism",
      blocks: [
        {
          kind: "derivation",
          title: "Why J maps velocities out but Jᵀ maps forces in",
          intro: "One line of physics: power must match on both sides of the mechanism (no energy hides in massless links):",
          steps: [
            { text: "Power in task space = power in joint space, for every possible motion:", tex: "F^\\top \\dot x = \\tau^\\top \\dot\\theta" },
            { text: "Substitute the velocity map ẋ = Jθ̇:", tex: "F^\\top J\\,\\dot\\theta = \\tau^\\top \\dot\\theta \\quad \\forall \\dot\\theta" },
            { text: "Holding for ALL θ̇ forces the coefficients equal:", tex: "\\tau = J^\\top F" },
          ],
        },
        {
          kind: "prose",
          md: `So the joint torques needed to exert hand force $F$ are $\\tau = J^\\top F$, with no inverse required, valid even at singularities. This duality (J for motion out, $J^\\top$ for force in) is the transpose-across-the-dot-product identity from l2-matrices, now doing physics. It's how impedance controllers, force control, and the "gravity compensation" mode of every collaborative arm are written.`,
        },
      ],
    },
    {
      id: "ik",
      title: "Inverting the map: IK as damped least squares",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `To move the hand toward a target, invert the velocity map. J may be non-square or singular, so use least squares with **damping** (Levenberg–Marquardt in robot clothing):

$$\\Delta\\theta = J^\\top (JJ^\\top + \\lambda^2 I)^{-1} e$$

where $e$ is the task-space error. The λ²I term lifts the smallest singular value: in SVD terms each direction gets gain $\\sigma_i/(\\sigma_i^2 + \\lambda^2)$, behaving like $1/\\sigma_i$ when healthy, smoothly rolling to 0 as $\\sigma_i \\to 0$ instead of exploding. That is the σ-story you built in l2-eigen-svd.`,
        },
        {
          kind: "widget",
          id: "planar-arm",
          caption: "IK mode: drag the target; each frame runs one DLS step. Labs: (1) target near the reach boundary with λ small and watch joints thrash; (2) raise λ: calm but slower; (3) drag the target OUTSIDE the circle and the arm points at it, the least-squares answer to an impossible demand.",
          params: { mode: "ik" },
        },
      ],
    },
    {
      id: "implement",
      title: "Implement: your own IK",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "missing",
          title: "one DLS step",
          source: `import numpy as np

def jacobian(l, th):
    phi = np.cumsum(th)
    J = np.zeros((2, len(th)))
    for i in range(len(th)):
        J[0, i] = -np.sum(l[i:] * np.sin(phi[i:]))
        J[1, i] =  np.sum(l[i:] * np.cos(phi[i:]))
    return J

def dls_step(l, th, target, lam=0.1):
    J = jacobian(l, th)
    e = target - fk(l, th)
    dth = J.T @ np.linalg.solve(J @ J.T + lam**2 * np.eye(2), e)
    return th + dth`,
          masked: [14],
          prompt: "Write line 14: the DLS update Δθ = Jᵀ(JJᵀ+λ²I)⁻¹e using np.linalg.solve (never inv).",
          answer: "dth = J.T @ np.linalg.solve(J @ J.T + lam**2 * np.eye(2), e)",
          explanation: "solve(A, e) computes A⁻¹e stably without forming the inverse. JJᵀ is 2×2 regardless of joint count, so DLS scales to 7-DoF arms for free. The general column formula in `jacobian` (sum over downstream links) is the derivation's pattern for any planar chain.",
        },
        {
          kind: "code",
          mode: "write",
          title: "ik.py",
          source: `# Spec — numpy (you'll reuse this in p7-arm-kinematics):
# 1. fk(l, th) -> end-effector xy  (cumulative angles; from memory).
# 2. jacobian(l, th) analytically (above), VERIFIED against centered
#    finite differences of fk at 20 random configurations (tol 1e-6).
# 3. ik(l, th0, target, lam, iters=200): iterate dls_step until
#    ||e|| < 1e-4; return (theta, n_iters, converged).
# 4. Experiments (print a small table):
#    a) easy target, lam=0.1  -> converges in tens of iters
#    b) target ON the reach boundary, lam=0.01 vs lam=0.3 —
#       compare max |dtheta| per step (thrash vs calm)
#    c) unreachable target -> arm points at it, ||e|| plateaus at
#       dist - reach. Explain the plateau in a comment (least squares!)
# 5. torque check: tau = J.T @ F for F=(0,-1) (hand pushing down) at a
#    stretched vs folded pose — which pose needs bigger shoulder torque?`,
          checks: [
            "Analytic J matches finite differences at all 20 configs",
            "Boundary experiment shows max|Δθ| at least 5× larger with λ=0.01 than λ=0.3",
            "Unreachable case: ‖e‖ plateaus ≈ distance − reach, and your comment explains why",
            "Torque check: stretched pose needs more shoulder torque (longer lever), which matches your J's column-1 length",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "One matrix, everywhere",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `- **l5-ik** deepens today's solver (null-space motion for redundant arms lives in the σ=… directions DLS ignores); **l5-dynamics-lite** puts mass behind Jᵀ.
- **Manipulability** σ₁σ₂…σₘ (your ellipse's area) is used by grasp planners (l9-grasping) to choose poses where the arm is strong in the directions the task needs.
- **Deep-learning bridge:** backprop through a network computes vector–Jacobian products, the SAME object. A policy network's sensitivity of action to observation is a Jacobian you'll inspect when debugging VLA behavior.
- **Diffusion/flow policies (L11 to 12)** output task-space actions that a downstream IK (today's DLS, industrial-strength) turns into joint commands on real robots. Your ik.py is a working miniature of that layer.`,
        },
        {
          kind: "connection",
          md: "p7-arm-kinematics upgrades ik.py to 3 links + orientation + nullspace. Modern Robotics ch. 5 is now a codified version of what you derived; the manipulability ellipse there is your widget's.",
          nodeIds: ["l5-ik", "l5-dynamics-lite"],
          projectIds: ["p7-arm-kinematics"],
        },
        { kind: "sources", note: "Modern Robotics 5.1 (space/body Jacobians formalize 'columns = downstream twists'); keep your own derivation page: you'll re-derive J twice more (spatial, then geometric) and the pattern repeats." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** derive the 2-link J and det J = ℓ₁ℓ₂sinθ₂ cold; give the power-matching proof of τ = JᵀF; explain DLS via singular values (gain σ/(σ²+λ²)); ik.py passes everything. Gold = predict, before running, how the ellipse and the thrashing change if ℓ₂ → 0.2·ℓ₁, then run it and check yourself.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
