import type { Lesson } from "@/lib/lesson-types";

// Zero → first real Python. Assumes nothing. Every example is a robot's state,
// because that is what this Python will be doing for the next 200 days.

export const lesson: Lesson = {
  nodeId: "l1-python-basics",
  title: "Variables, Types & Expressions",
  subtitle: "The atoms every robot program is made of",
  minutes: 75,
  sections: [
    {
      id: "why",
      title: "What a program is",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `A robot program is two things: **state** (numbers describing the world right now: joint angles, a camera frame, a gripper's width) and **transformations** (code that turns current state into the next action). Everything you will build here (training loops, kinematics, VLA fine-tunes) is state flowing through transformations.

Python is how you write both. It isn't fast. It is the language that glues together the entire robot-learning stack (PyTorch, LeRobot, MuJoCo, ROS 2 bindings), so there is no path into this field around it. The core language is small, and you can hold all of it in your head.`,
        },
        {
          kind: "callout",
          tone: "insight",
          title: "the frame for everything below",
          md: `A **variable** is a name stuck onto a value. A **type** is what kind of value it is and what you're allowed to do with it. An **expression** is a computation that produces a value. Read every line of Python you'll ever see through those three words.`,
        },
      ],
    },
    {
      id: "names",
      title: "Variables: names stuck onto values",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `\`=\` in Python does not mean "equals". It means **"stick this name onto this value"**. The value exists first; the name points at it. Names can be re-stuck at any time. That is all "assignment" is.`,
        },
        {
          kind: "code",
          mode: "predict",
          title: "predict before you run",
          source: `gripper_open = 0.08
gripper_open = gripper_open - 0.03
target = gripper_open
gripper_open = 0.0
print(target)`,
          prompt: "What does this print? Reason line by line: what does each name point at?",
          options: ["0.0", "0.05", "0.08", "Error: target was never assigned a number"],
          answerIndex: 1,
          explanation: `Line 2 computes 0.08 − 0.03 = 0.05 and re-sticks \`gripper_open\` onto it. Line 3 sticks \`target\` onto **that same value**, 0.05. Line 4 moves \`gripper_open\` to 0.0, but \`target\` still points at 0.05. Re-assigning one name never moves another name. (For plain numbers this is always safe; lists behave differently, and that trap is coming in the data-structures node.)`,
        },
        {
          kind: "misconception",
          wrong: "A variable is a box that stores a value, and assignment copies things into the box.",
          right: "A variable is a label tied onto a value that already exists. `a = b` ties a's label onto whatever b's label is on. For numbers and strings the difference is invisible; for lists and arrays it is the #1 source of real bugs: two labels on ONE object.",
        },
      ],
    },
    {
      id: "types",
      title: "Types: what a value is, and what it permits",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `Four scalar types carry most robot code, plus one container you'll meet properly next node:

| type | example | robot meaning |
|---|---|---|
| \`int\` | \`7\` | a count: 7 joints, step 3041 |
| \`float\` | \`0.7853\` | a measurement: an angle in radians, a distance in meters |
| \`bool\` | \`True\` | a fact: is_grasped, at_goal |
| \`str\` | \`"pick up the mug"\` | text: an instruction, a file path |
| \`list\` | \`[0.1, -0.4, 1.57]\` | ordered values: a pose, a trajectory |

Types decide what operations mean: \`3 * 2\` is 6, \`"ab" * 2\` is \`"abab"\`, and \`"ab" + 2\` is an error. Python checks types **when the line runs**, not before. A wrong type deep in a 3-hour training run will crash it at hour 2. This is why later nodes make you write type hints and asserts.`,
        },
        {
          kind: "code",
          mode: "predict",
          title: "the division trap",
          source: `n_joints = 7
half = n_joints / 2
pairs = n_joints // 2
print(half, pairs, type(half) == type(pairs))`,
          prompt: "What prints?",
          options: ["3.5 3 False", "3.5 3.5 True", "3 3 True", "3.5 3 True"],
          answerIndex: 0,
          explanation: `\`/\` **always** returns a float (3.5), even for two ints. \`//\` is floor division and returns an int here (3). So the types differ → \`False\`. Indexing an array with the result of \`/\` is a classic crash: \`traj[len(traj)/2]\` fails, \`traj[len(traj)//2]\` works.`,
        },
      ],
    },
    {
      id: "expressions",
      title: "Expressions: computation you can trace",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `An expression evaluates inside-out, with operator precedence you already know from math: \`**\` before \`*\`/\`/\` before \`+\`/\`-\`, comparisons after arithmetic, \`and\`/\`or\` last. When in doubt, parenthesize. Every serious codebase does.

Being able to **trace** evaluation in your head is the skill. Practice it now on a real formula: the linear interpolation every trajectory generator uses.`,
        },
        {
          kind: "code",
          mode: "trace",
          title: "trace lerp by hand",
          source: `start = 0.2
goal = 1.0
t = 0.75
pos = (1 - t) * start + t * goal
err = abs(goal - pos)
done = err < 0.25`,
          prompt: "Reveal each row only after you've computed it yourself.",
          trace: [
            { step: "line 4: (1 - t)", state: "0.25" },
            { step: "line 4: 0.25 * start", state: "0.05" },
            { step: "line 4: t * goal", state: "0.75" },
            { step: "line 4: pos =", state: "0.05 + 0.75 = 0.8" },
            { step: "line 5: err =", state: "abs(1.0 − 0.8) = 0.2" },
            { step: "line 6: done =", state: "0.2 < 0.25 → True" },
          ],
        },
        {
          kind: "prose",
          md: `That formula, $(1-t)\\,\\text{start} + t\\,\\text{goal}$, is **lerp**, and you will write it a dozen more times: blending trajectories, scheduling learning rates, interpolating between poses. At $t=0$ you're at start, at $t=1$ at goal, in between you slide linearly.`,
        },
      ],
    },
    {
      id: "strings",
      title: "Strings and f-strings: your debugging voice",
      depth: "implementation",
      blocks: [
        {
          kind: "prose",
          md: `Until you meet real debuggers (L0 gave you the mindset; tooling comes soon), \`print\` with **f-strings** is how running code talks to you. An f-string embeds any expression in \`{}\` and formats it: \`{angle:.3f}\` means "3 decimal places". Sloppy prints are unreadable at 50 Hz. Precise ones are an instrument panel.`,
        },
        {
          kind: "code",
          mode: "missing",
          title: "complete the status line",
          source: `step = 3041
loss = 0.048231
lr = 0.0003
print(f"step {step:5d} | loss {loss:.4f} | lr {lr:.1e}")`,
          masked: [4],
          prompt: "Write line 4: an f-string printing →  step  3041 | loss 0.0482 | lr 3.0e-04",
          answer: `print(f"step {step:5d} | loss {loss:.4f} | lr {lr:.1e}")`,
          explanation: `\`:5d\` pads the int to width 5 (columns align across thousands of steps), \`:.4f\` fixes 4 decimals, \`:.1e\` is scientific notation. This exact line, more or less, appears in every training loop you'll write from Level 3 on.`,
        },
      ],
    },
    {
      id: "debug",
      title: "Read errors like a professional",
      depth: "implementation",
      blocks: [
        {
          kind: "prose",
          md: `A traceback reads **bottom-up**: last line = what went wrong, lines above = where. Errors are the interpreter telling you precisely which of your beliefs about the program was false. Find the false belief below *before* revealing.`,
        },
        {
          kind: "code",
          mode: "debug",
          title: "one line lies",
          source: `joint_deg = "45"
joint_rad = joint_deg * 3.14159 / 180
print(f"{joint_rad:.3f} rad")`,
          prompt: "This crashes on line 2. Why exactly?",
          options: [
            "You can't divide a string by 180",
            "`joint_deg * 3.14159` fails: can't multiply str by float",
            "The f-string format `:.3f` doesn't work on strings",
            "3.14159 needs to be written as math.pi",
          ],
          answerIndex: 1,
          answer: 'joint_deg = 45  (or: float("45") if it truly arrives as text)',
          explanation: `\`"45"\` is text, not a number. \`str * int\` would repeat it, but \`str * float\` is a TypeError, so the crash happens at the multiplication (evaluation is left-to-right). Values arriving as strings (from files, ROS params, CLI args) and being used as numbers is one of the most common real robot-code bugs. The fix is to convert at the boundary: \`float(joint_deg)\`.`,
        },
      ],
    },
    {
      id: "write",
      title: "Write it: a robot status module",
      depth: "implementation",
      blocks: [
        {
          kind: "prose",
          md: `Open a real editor (VS Code, from your L0 setup), create \`status.py\`, and write this from the spec. No copying from above: recognizing code is not writing code.`,
        },
        {
          kind: "code",
          mode: "write",
          title: "status.py",
          source: `# Spec:
# 1. Variables: arm angle 0.7854 (rad), gripper width 0.08 (m),
#    step count 120 (int), task "stack the red cube" (str).
# 2. Compute angle in degrees:  deg = rad * 180 / 3.14159265
# 3. is_open: True iff gripper width strictly greater than 0.05
# 4. Print exactly one f-string status line, angle to 1 decimal,
#    width to 3 decimals, e.g.:
#    [120] stack the red cube | arm 45.0° | grip 0.080 m | open=True`,
          checks: [
            "Running `python status.py` prints exactly one line, formatted as specced",
            "Angle shows 45.0 (your conversion is right)",
            "Change width to 0.05 → open=False (strict inequality)",
            "Change the angle to 1.5708 → prints 90.0 without touching the print line",
          ],
        },
        {
          kind: "exercise",
          level: 2,
          prompt: "Extend status.py: add battery_v = 11.4. Print a WARNING line (separate print) only when battery_v < 11.1. Then make the threshold a named variable. Why is `LOW_BATTERY_V = 11.1` better than the bare number in the comparison?",
          solution: "A named constant states intent, appears once (change it in one place), and is searchable. 'Magic numbers' scattered in comparisons are how real robot codebases rot.",
        },
      ],
    },
    {
      id: "ahead",
      title: "Where every piece of this reappears",
      depth: "application",
      blocks: [
        {
          kind: "quiz",
          title: "closed-book retrieval",
          items: [
            {
              q: "`a = [1, 2]` then `b = a` then `b.append(3)`. Based on the name-on-value model, what is `a` now? (Reason it out: lists are objects.)",
              options: ["[1, 2]: b is a copy", "[1, 2, 3]: two names, one list", "Error: can't append through b", "[3]: b replaced a"],
              answerIndex: 1,
              a: "[1, 2, 3]",
              why: "Assignment sticks a second name onto the SAME list. Mutating through either name is visible through both. This is the trap the 'label, not box' model predicts, and `numpy` views make it matter even more.",
            },
            {
              q: "Why does `traj[len(traj)/2]` crash even when len(traj) is even?",
              a: "`/` always returns a float, and list indices must be ints. Use `//`.",
            },
            {
              q: "In one sentence: what is an expression?",
              a: "A piece of code that evaluates to a value (e.g. `(1-t)*a + t*b`), as opposed to a statement, which does something.",
            },
          ],
        },
        {
          kind: "connection",
          md: `**Where you'll use this next.** \`l1-control-flow\` makes expressions decide and repeat (the 50 Hz control loop is a \`while\` around expressions like today's lerp). \`l1-data-structures\` turns single values into trajectories and configs, where the two-names-one-list trap becomes real. \`l1-numpy\` replaces one-number-at-a-time with whole-vector expressions, and \`p1-physics-toy\` is where your Python first moves a simulated world.`,
          nodeIds: ["l1-control-flow", "l1-data-structures", "l1-numpy"],
          projectIds: ["p1-physics-toy"],
        },
        { kind: "sources", note: "The primary resource below is your structured practice track for this node. Do its exercises even if this lesson felt easy. Volume builds fluency." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** without references, write a script from a 4-line spec (variables of 4 types, a computed quantity, a formatted status line), predict outputs of assignment chains, and name the type of any expression on sight. If you produced \`status.py\` cleanly and got the quiz cold, claim. If anything felt shaky, redo the section that wobbled first. This node underpins everything that follows.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
