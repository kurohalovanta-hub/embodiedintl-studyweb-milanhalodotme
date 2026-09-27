import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l5-frames-rotations",
  title: "Frames & Rotations",
  subtitle: "Whose coordinates are these? The question robotics never stops asking",
  minutes: 85,
  sections: [
    {
      id: "why",
      title: "Every number needs an address",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `A camera says the mug is at (0.3, 0.1, 0.5). **In whose coordinates?** The camera's. The arm needs it in the base frame; the gripper controller needs it in the wrist frame. Robotics is a bureaucracy of coordinate frames (base, camera, wrist, object, world), and *most real robot bugs are frame bugs*: a grasp that misses by exactly the camera offset, a rotation applied in the wrong direction because someone mixed up "rotate the frame" with "rotate the point".

The fix is notation discipline you'll use every day from now on: $^A p$ means "point p expressed in frame A", and $^A R_B$ is the rotation taking B-coordinates to A-coordinates:`,
        },
        {
          kind: "equation",
          tex: "^{A}p = {}^{A}R_{B}\\; {}^{B}p",
          label: "the frame-change contract",
          note: "Subscripts must cancel like units: A←B applied to B-stuff yields A-stuff. If the letters don't chain, the equation is wrong, and you know it before you compute anything.",
        },
      ],
    },
    {
      id: "passive-active",
      title: "One matrix, two meanings",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "rotation-2d",
          caption: "Lab 1 (passive): rotate the FRAME. The green point never moves; its body-coordinates do. Lab 2 (active): the same matrix physically moves the point. Drag θ through ±90° in both modes until the difference stops feeling slippery.",
        },
        {
          kind: "misconception",
          wrong: "Rotating a point by θ and expressing it in a frame rotated by θ are the same operation.",
          right: "They are inverses of each other: frame rotated by θ ⇒ coordinates change by R(θ)ᵀ = R(−θ). Half of all frame bugs are this sign flip. The passive/active toggle in the widget IS the bug, made visible.",
        },
        {
          kind: "quiz",
          title: "lock it in",
          items: [
            {
              q: "The camera frame is the base frame rotated +90° about z. A detection reads ᶜp = (1, 0, 0). What is ᵇp?",
              options: ["(0, 1, 0)", "(0, −1, 0)", "(1, 0, 0)", "(−1, 0, 0)"],
              answerIndex: 0,
              a: "ᵇp = ᵇR_c ᶜp = Rz(+90°)(1,0,0) = (0,1,0). The rotation that DESCRIBES the camera's orientation in base is exactly the matrix that converts camera-coordinates to base-coordinates.",
              why: "This identity ('the frame's pose matrix is the coordinate converter') is the single most-used fact in robot software (every tf lookup in ROS).",
            },
          ],
        },
      ],
    },
    {
      id: "formal",
      title: "What makes a matrix a rotation: SO(3)",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `Rotations in 3-D are exactly the matrices in the **special orthogonal group**:

$$SO(3) = \\{R \\in \\mathbb R^{3\\times 3} : R^\\top R = I,\\; \\det R = +1\\}$$

$R^\\top R = I$: columns are orthonormal ⇒ lengths and angles preserved (a rigid motion). $\\det = +1$: no mirror flip. Consequences you'll use daily: $R^{-1} = R^\\top$ (inverting is free), composition stays in the group, and the columns of $^A R_B$ are **B's axes expressed in A**. This is the columns-are-where-the-basis-lands fact from l2-matrices, now with a physical reading.

It's a *group*, not a vector space: $R_1 R_2$ is a rotation, but $R_1 + R_2$ is not, and averaging rotation matrices entry-wise gives garbage. This one fact drives the whole next node (Lie groups) and is why naive "average the quaternions" code corrupts orientations.`,
        },
        {
          kind: "quiz",
          title: "group discipline",
          items: [
            {
              q: "You need ᵂR_g (gripper in world) and you have ᵂR_b (base in world) and ᵇR_g (gripper in base). Write the product. How do you know the order is right?",
              a: "ᵂR_g = ᵂR_b · ᵇR_g. The inner letters (b) cancel, outer letters read W←g. Subscript-chaining catches order errors before any arithmetic.",
            },
            {
              q: "Why is (R₁ + R₂)/2 not a rotation, in one concrete sentence?",
              a: "Averaging I and Rz(180°) gives diag(0,0,1), which squashes the xy-plane to a point (det 0, not orthogonal). SO(3) is a curved surface; the straight line between two points on it leaves the surface.",
            },
          ],
        },
      ],
    },
    {
      id: "three-d",
      title: "3-D orientation, honestly",
      depth: "formalism",
      blocks: [
        {
          kind: "widget",
          id: "so3-explorer",
          caption: "Axis–angle mode first: every orientation is ONE turn about ONE axis (Euler's theorem). Then Euler ZYX mode: drive pitch β to ±90° and watch the purple yaw axis and orange roll axis collapse onto each other: gimbal lock, live. Finish with q → −q: all four numbers flip, the cube doesn't move.",
        },
        {
          kind: "prose",
          md: `Four representations, four trade-offs. You will convert between all of them routinely:

| representation | numbers | good | bad |
|---|---|---|---|
| rotation matrix | 9 | composes, converts | redundant; drifts off SO(3) numerically |
| Euler angles ZYX | 3 | human-readable | **gimbal lock** at β=±90°; 12 conventions |
| axis–angle | 3 to 4 | minimal, geometric | composition is awkward |
| quaternion | 4 | compact, composes, no lock | double cover: q and −q same rotation |

Datasets and policies (Levels 11 to 12) mostly use quaternions or 6-D continuous representations *because* of the failure you just caused: near gimbal lock, tiny orientation changes need huge Euler-angle changes, a discontinuity that poisons learning targets.`,
        },
        {
          kind: "misconception",
          wrong: "Gimbal lock is a mechanical defect of physical gimbals; software with Euler angles is fine.",
          right: "It's a mathematical property of ANY 3-number chart on SO(3): at β=±90° the yaw and roll axes align and a DOF vanishes from the parameterization (the map's Jacobian drops rank). Your software hits it exactly where the widget shows it. Quaternions/matrices don't have this problem because they use more than 3 numbers.",
        },
      ],
    },
    {
      id: "implement",
      title: "Implement the discipline",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "predict",
          title: "the composition trap",
          source: `import numpy as np
def Rz(t):
    c, s = np.cos(t), np.sin(t)
    return np.array([[c,-s,0],[s,c,0],[0,0,1]])
def Ry(t):
    c, s = np.cos(t), np.sin(t)
    return np.array([[c,0,s],[0,1,0],[-s,0,c]])

p = np.array([1., 0., 0.])
a = Rz(np.pi/2) @ Ry(np.pi/2) @ p
b = Ry(np.pi/2) @ Rz(np.pi/2) @ p
print(np.round(a), np.round(b))`,
          prompt: "Rotate (1,0,0): the rightmost matrix acts FIRST. Trace both pipelines, then choose.",
          options: ["[0. 0. -1.] [0. 1. 0.]", "[0. 1. 0.] [0. 0. -1.]", "[0. 1. 0.] [0. 1. 0.]", "[1. 0. 0.] [1. 0. 0.]"],
          answerIndex: 0,
          explanation: "a = Rz(Ry x̂): Ry(90°) sends x̂ → (0,0,−1) (this Ry convention tips +x toward −z), and Rz leaves the z-axis alone → (0,0,−1). b = Ry(Rz x̂): Rz(90°) sends x̂ → ŷ, and Ry fixes its own axis ŷ → (0,1,0). Different answers: 3-D rotations do not commute, and compositions are always read right-to-left. If you got these swapped, you read left-to-right, the #1 kinematic-chain bug.",
        },
        {
          kind: "code",
          mode: "write",
          title: "frames.py",
          source: `# Spec — numpy:
# 1. Rx, Ry, Rz (from memory).
# 2. is_rotation(R): checks R.T@R≈I and det≈+1. Assert it on 50 random
#    compositions of Rx/Ry/Rz with random angles.
# 3. Frame story: camera is base rotated -30° about y then +90° about z
#    (extrinsic, about BASE axes ⇒ left-multiply in that order:
#    bRc = Rz(90°) @ Ry(-30°)).
#    A detection cp = (0.4, 0.0, 0.8). Compute bp. Then invert: recover
#    cp from bp using ONLY transposes. assert np.allclose round-trip.
# 4. Orthonormality drift: compose Rz(0.001) with itself 100_000 times;
#    print ||R.T@R - I||. Then re-orthonormalize with SVD (U@Vt) and
#    print the error again. (This is why real stacks renormalize.)`,
          checks: [
            "is_rotation passes on all 50 compositions",
            "Round-trip camera↔base agrees to 1e-12 using transposes only",
            "Drift experiment shows error growing (~1e-11 or worse), then ~1e-16 after SVD re-orthonormalization",
            "Every variable in step 3 is named with its frame (cp, bp, bRc): the notation IS the tool",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "Where frames run the show",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `- **l5-quaternions** makes the 4-number representation precise (you've already met the double cover in the widget); **l5-lie-se3** adds translation and the calculus on top.
- **ROS 2's tf2 (l7-launch-tf-urdf)** is an entire subsystem whose only job is maintaining the tree of ᴬT_B transforms you're now hand-computing. Your subscript-cancellation habit is exactly what its API enforces.
- **Camera calibration (l8-calibration-opencv)** = estimating ᵇR_c, ᵇt_c from data, the exact matrix from your frames.py story.
- **Policy learning (L11 to 12):** action targets are poses; the Euler discontinuity you caused is why datasets ship quaternions/6-D and why naive angle regression fails near ±180°.`,
        },
        {
          kind: "connection",
          md: "Next node stacks rotation + translation into one 4×4 machine (SE(3)) and gives you the exp/log maps that make interpolation and control principled. The Lie-theory tutorial paper below is your first 'read a real paper with full prerequisites' moment.",
          nodeIds: ["l5-quaternions", "l5-lie-se3", "l5-fk"],
          paperIds: ["paper-lie"],
          projectIds: ["p6-kinematics-viz"],
        },
        { kind: "sources", note: "Modern Robotics ch. 3.1 to 3.2 (the notation here is theirs); 3Blue1Brown's quaternion video for double-cover geometry. Keep the MR appendix of rotation conventions bookmarked; everyone needs it eventually." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** write Rx/Ry/Rz from memory; convert a point between frames with correct subscript chains, both directions; state the SO(3) definition and both consequences; cause and explain gimbal lock; frames.py passes. Gold = the drift experiment explained (why numerical composition leaves the group and how SVD projects back).`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
