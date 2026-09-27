import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l5-lie-se3",
  title: "SE(3) & Lie Basics",
  subtitle: "Rigid motions as a group, and the exp/log bridge that makes them computable",
  minutes: 90,
  sections: [
    {
      id: "why",
      title: "Poses aren't vectors, so stop treating them like vectors",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `A robot pose = rotation + translation. You now know rotations live on a curved surface (SO(3)) where + is illegal. Add translation and you get **SE(3)**, the group of rigid motions. Everything a robot does is a trajectory through SE(3).

The practical problem: learning and control *need* vector operations. Interpolate between two grasp poses. Average pose estimates. Compute "pose error" for a controller or a loss function. Do any of these naively (subtract matrices, lerp Euler angles) and you get non-rigid garbage or gimbal artifacts, which are real bugs in real pipelines.

**Lie theory is the fix, and it's smaller than its reputation:** a curved group + a flat vector space (the tangent space at identity, the *Lie algebra*) + two maps between them, exp and log. Do group things (compose, invert) on the group; do vector things (add, average, interpolate, differentiate) in the algebra; convert with exp/log. That one sentence is the entire toolkit.`,
        },
        {
          kind: "callout",
          tone: "insight",
          title: "why you personally need this",
          md: `π0-style VLAs and diffusion policies output **pose deltas**; their losses measure **pose error**; SLAM and calibration optimize over poses. All of it is written in exp/log language. This node is the difference between using those systems and reading their source.`,
        },
      ],
    },
    {
      id: "se3",
      title: "SE(3): the 4×4 machine",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `Package rotation and translation into one matrix acting on homogeneous points $\\tilde p = (p, 1)$:

$$T = \\begin{bmatrix} R & t \\\\ 0 & 1 \\end{bmatrix} \\in SE(3), \\qquad T\\tilde p = \\begin{bmatrix} Rp + t \\\\ 1\\end{bmatrix}$$

Composition is matrix product; frames chain exactly as before: $^W T_{ee} = {}^W T_b \\, {}^b T_{ee}$. The inverse has closed form. Derive it once and reuse it:`,
        },
        {
          kind: "derivation",
          title: "Invert a pose without a linear solver",
          intro: "Find T⁻¹ by asking: what undoes 'rotate by R, then translate by t'?",
          steps: [
            { text: "Solve p' = Rp + t for p:", tex: "p = R^{-1}(p' - t) = R^\\top p' - R^\\top t" },
            { text: "Read off the blocks: the undo is 'rotate by Rᵀ, translate by −Rᵀt':", tex: "T^{-1} = \\begin{bmatrix} R^\\top & -R^\\top t \\\\ 0 & 1 \\end{bmatrix}" },
            { text: "Check: the inverse's translation is NOT −t. (This is a real-bug generator: negating t alone leaves a rotation-warped offset.)", tex: "T^{-1}T = I" },
          ],
        },
        {
          kind: "quiz",
          title: "frame fluency at 4×4",
          items: [
            {
              q: "You have ᵂT_cam and ᵂT_obj. Write the object's pose in the camera frame.",
              a: "ᶜᵃᵐT_obj = (ᵂT_cam)⁻¹ · ᵂT_obj. Inner W's cancel after inverting the first factor. It is the same subscript chaining, now with translations riding along.",
            },
            {
              q: "Why homogeneous coordinates at all? What does the extra 1 buy?",
              a: "It turns the AFFINE map p→Rp+t into a LINEAR map on (p,1), so composition of motions becomes plain matrix multiplication and whole kinematic chains collapse into one product.",
            },
          ],
        },
      ],
    },
    {
      id: "algebra",
      title: "The tangent space: where velocity lives",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `Differentiate a rotation trajectory $R(t)$: since $R^\\top R = I$ always, $\\dot R^\\top R + R^\\top \\dot R = 0$, so $R^\\top\\dot R$ is **skew-symmetric**. Skew matrices are the derivative-of-rotation space, the Lie algebra $\\mathfrak{so}(3)$, and they're 3-vectors in disguise:

$$\\omega = \\begin{bmatrix}\\omega_1\\\\\\omega_2\\\\\\omega_3\\end{bmatrix} \\;\\leftrightarrow\\; [\\omega]_\\times = \\begin{bmatrix} 0 & -\\omega_3 & \\omega_2 \\\\ \\omega_3 & 0 & -\\omega_1 \\\\ -\\omega_2 & \\omega_1 & 0\\end{bmatrix}, \\qquad [\\omega]_\\times p = \\omega \\times p$$

$\\omega$ is exactly the physical **angular velocity**. For SE(3), append linear velocity: a **twist** $\\xi = (\\omega, v) \\in \\mathbb R^6$, six honest numbers you can add, scale, and average. This ℝ⁶ is where robot velocity commands, pose deltas, and pose errors live.`,
        },
        {
          kind: "widget",
          id: "so3-explorer",
          caption: "Axis–angle mode IS the exp map: the slider triple (axis, angle) is ω̂θ ∈ ℝ³, and the cube shows exp([ω̂θ]ₓ). You have been driving the Lie algebra all along, and now you know its name. Verify: doubling θ composes the rotation with itself.",
        },
      ],
    },
    {
      id: "exp",
      title: "exp and log: the bridge",
      depth: "derivation",
      blocks: [
        {
          kind: "derivation",
          title: "Exponential = integrating constant spin (Rodrigues)",
          intro: "Spin at constant ω for one second. What rotation results? Solve Ṙ = [ω]ₓR, R(0)=I:",
          steps: [
            { text: "The matrix ODE has the same solution as the scalar one:", tex: "R(1) = \\exp([\\omega]_\\times) = \\sum_k \\tfrac{1}{k!}[\\omega]_\\times^k" },
            { text: "Key algebraic fact (check by multiplying): powers of a unit-axis skew cycle:", tex: "[\\hat\\omega]_\\times^3 = -[\\hat\\omega]_\\times" },
            { text: "So the series folds into sin/cos coefficients on THREE terms, which is Rodrigues' formula:", tex: "\\exp([\\hat\\omega]_\\times\\theta) = I + \\sin\\theta\\,[\\hat\\omega]_\\times + (1-\\cos\\theta)\\,[\\hat\\omega]_\\times^2" },
            { text: "log is the inverse: recover θ from the trace, then the axis from the skew part:", tex: "\\theta = \\arccos\\!\\Big(\\tfrac{\\mathrm{tr}(R)-1}{2}\\Big),\\qquad [\\hat\\omega]_\\times = \\tfrac{R - R^\\top}{2\\sin\\theta}" },
          ],
        },
        {
          kind: "prose",
          md: `Now every "illegal" operation becomes legal by round-tripping:

- **Interpolate poses:** $R_1 \\exp\\big(s\\cdot\\log(R_1^\\top R_2)\\big)$, a constant-speed rotation from $R_1$ to $R_2$ (this *is* slerp).
- **Pose error for control/losses:** $e = \\log(T_{target}^{-1} T_{current}) \\in \\mathbb R^6$, an honest 6-vector with no Euler discontinuities.
- **Average orientations:** mean in the algebra around a base point, exp back (the correct version of the broken quaternion-averaging).`,
        },
        {
          kind: "misconception",
          wrong: "exp/log of matrices is exotic math you can substitute with small-angle approximations.",
          right: "For small motions exp([ω]ₓ) ≈ I + [ω]ₓ IS the small-angle approximation. Lie theory contains it and tells you exactly when it breaks (θ not small) and what to use instead (Rodrigues, closed form, 3 terms). The exact map costs barely more than the approximation.",
        },
      ],
    },
    {
      id: "implement",
      title: "Implement the bridge",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "missing",
          title: "Rodrigues, from the derivation",
          source: `import numpy as np

def skew(w):
    return np.array([[0, -w[2], w[1]],
                     [w[2], 0, -w[0]],
                     [-w[1], w[0], 0]])

def exp_so3(w):
    th = np.linalg.norm(w)
    if th < 1e-10:
        return np.eye(3) + skew(w)          # small-angle limit
    K = skew(w / th)
    return np.eye(3) + np.sin(th) * K + (1 - np.cos(th)) * K @ K`,
          masked: [13],
          prompt: "Write line 13: Rodrigues' formula (I + sinθ·K + (1−cosθ)·K²).",
          answer: "return np.eye(3) + np.sin(th) * K + (1 - np.cos(th)) * K @ K",
          explanation: "Exactly the three surviving series terms. Note the θ→0 branch: log/exp implementations live and die by their small-angle handling, and every serious robotics library (Sophus, pin, MR code) has this branch.",
        },
        {
          kind: "code",
          mode: "write",
          title: "lie.py",
          source: `# Spec — numpy (your personal mini-Sophus; p7 will import it):
# 1. skew, exp_so3 (above, from memory), log_so3 (trace formula + branch).
# 2. Round-trip: 100 random w (theta in (0, pi)):
#    assert log_so3(exp_so3(w)) ≈ w.
# 3. slerp_R(R1, R2, s) = R1 @ exp_so3(s * log_so3(R1.T @ R2)).
#    Check: s=0 -> R1, s=1 -> R2, and angular speed is constant:
#    the angle of log(R(s).T @ R(s+ds)) is the same for all s.
# 4. THE MONEY DEMO — interpolate R1=I to R2=Rz(170°) two ways:
#    (a) naive: lerp the matrices entrywise, (b) slerp_R.
#    For s=0.5 print det and R.T@R error of each. Naive should be
#    visibly NOT a rotation; slerp perfect.
# 5. pose_error(T_tgt, T_cur) -> 6-vector (log of relative pose;
#    translation part can be plain difference for now).`,
          checks: [
            "Round-trip passes for 100 random rotations",
            "slerp endpoint + constant-speed checks pass",
            "Money demo: naive midpoint has det ≈ 0.03 (collapsed!), slerp_R has det = 1.000",
            "You can state in one sentence where the s=0.5 naive matrix sends the plane (nearly to a line: matrix lerp through a big rotation passes near singular)",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "Reading the field's notation",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `You can now read, in the primary sources:

- **The micro-Lie paper (Solà et al.)**, the field's shared reference for ⊞/⊟ notation: $T \\oplus \\xi := T\\exp(\\xi)$, $T_1 \\ominus T_2 := \\log(T_2^{-1}T_1)$. State estimation (l6-ekf-pf), SLAM (l8-slam-bridge) and pose-graph optimization are written entirely in it.
- **Diffusion/flow policies (l11-diffusion-policy, l12-pi0-flow):** noising and denoising *orientations* correctly means doing it in the tangent space. The papers' "SO(3) diffusion" sections are your exp/log bridge, verbatim.
- **IMU preintegration, visual odometry, calibration** all optimize in the algebra, then retract to the group. Your lie.py is the same architecture at 1% scale.`,
        },
        {
          kind: "connection",
          md: "FK (next) becomes elegant with today's tools: the product-of-exponentials formula writes a whole arm as exp(ξ₁θ₁)···exp(ξₙθₙ)M. Read the micro-Lie paper's §I to IV this week. You have every prerequisite.",
          nodeIds: ["l5-fk", "l5-trajectories"],
          paperIds: ["paper-lie"],
          projectIds: ["p7-arm-kinematics"],
        },
        { kind: "sources", note: "Solà 'Micro Lie theory' §I to IV (your first full research-paper read; budget 2 sessions); Modern Robotics ch. 3.3 for the twist/PoE view. The two use slightly different notation; translating between them is itself excellent training." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** derive T⁻¹ blocks and Rodrigues cold; explain why R'ᵀR is skew (differentiate the constraint); implement exp/log with correct small-angle branches; the naive-vs-slerp demo runs and you can narrate it. Gold = write pose interpolation and pose error for a grasp controller using only exp/log, and say why Euler-based versions fail near ±180°.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
