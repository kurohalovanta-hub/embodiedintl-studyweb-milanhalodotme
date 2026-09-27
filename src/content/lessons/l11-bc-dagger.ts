import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l11-bc-dagger",
  title: "Behavior Cloning & DAgger",
  subtitle: "Imitation's quiet failure mode, and the fix that defined a field",
  minutes: 80,
  sections: [
    {
      id: "why",
      title: "Just copy the expert. What could go wrong?",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `**Behavior cloning (BC)** is the obvious idea: record an expert's (observation, action) pairs, fit a network with supervised learning, deploy. No reward design, no exploration, no simulator. It is *the* workhorse of modern robot learning: ACT, Diffusion Policy, and every VLA in Level 12 are behavior cloning with better function classes.

So why did imitation learning need thirty years of research? Because BC has a failure mode that **does not show up in your validation loss.** Your held-out metrics can be superb while the robot drifts off the table. Understanding exactly why, and what fixes it, separates someone who runs LeRobot scripts from someone who can debug a policy that 'trained fine' but fails on hardware.`,
        },
        {
          kind: "callout",
          tone: "insight",
          title: "the crack in the frame",
          md: `Supervised learning's guarantee assumes test inputs come from the SAME distribution as training inputs. But a policy's test inputs are **states its own past actions produced.** The moment it errs, it manufactures inputs the expert never visited, and its guarantee no longer holds. This is **covariate shift by feedback**, and it is unique to sequential decision making.`,
        },
      ],
    },
    {
      id: "drive",
      title: "Watch the drift compound",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "bc-drift",
          caption: "A corridor task. Green dashes: expert path. Green band: where expert data exists. Cyan/red: 14 policy rollouts. Labs: (1) raise η (model error) and watch trajectories peel off mid-corridor. Note they fail LATE, having started fine. (2) Narrow the data band: earlier failures. (3) Toggle + DAgger with the SAME η: the same imperfect policy now succeeds. (4) Watch the mean-|offset| strip: BC bends upward (compounding); DAgger stays flat.",
        },
        {
          kind: "quiz",
          title: "diagnose like a researcher",
          items: [
            {
              q: "Rollouts start perfectly and fail late. Why is failure back-loaded, mechanically?",
              options: [
                "Small in-band errors accumulate as a random walk until |offset| exits the data band; outside, the policy barely corrects, so drift accelerates: error compounds with horizon",
                "The corridor narrows near the end",
                "The policy's weights degrade over the rollout",
                "Later states are intrinsically harder",
              ],
              answerIndex: 0,
              a: "In-distribution the policy is good (tiny errors); those errors random-walk the state toward the band edge; past it, corrections die and drift explodes. The failure is a property of the LOOP, not of any single prediction.",
              why: "This is why validation loss (computed on expert states!) cannot see the problem: the bad inputs don't exist in the dataset.",
            },
            {
              q: "What, precisely, does DAgger change about the data (not about the model)?",
              a: "It relabels states VISITED BY THE LEARNER with expert actions, so the training distribution follows the learner's own induced distribution. The architecture and loss stay the same; only the data-collection loop changes.",
            },
          ],
        },
      ],
    },
    {
      id: "formal",
      title: "The theory: ε T² vs ε T",
      depth: "formalism",
      blocks: [
        {
          kind: "prose",
          md: `Ross & Bagnell made the picture into theorems (paper-dagger, which you'll read this week). Suppose the learned policy errs with probability ≤ ε on states from the *expert's* distribution, over a horizon of T steps:

- **BC:** once off-distribution, no guarantee for the rest of the episode. Worst-case cost: the first error (prob ~εT over the episode) forfeits the remaining ~T steps →`,
        },
        {
          kind: "equation",
          tex: "J(\\pi_{BC}) \\le J(\\pi^*) + \\varepsilon T^2 \\qquad\\text{vs.}\\qquad J(\\pi_{DAgger}) \\le J(\\pi^*) + O(\\varepsilon T)",
          label: "compounding vs linear regret",
          note: "Quadratic vs linear in horizon. At T=400 control steps, that gap is the difference between a demo and a product.",
        },
        {
          kind: "derivation",
          title: "Where the T² comes from",
          intro: "The two-line heart of the BC bound, worth deriving yourself rather than memorizing:",
          steps: [
            { text: "P(at least one error in T steps), errors ≤ ε per step on-distribution:", tex: "P(\\text{fail}) \\le \\varepsilon T" },
            { text: "After the FIRST error, states leave the expert distribution; assume nothing: the worst case forfeits the rest, up to T cost:", tex: "\\text{extra cost} \\le \\underbrace{\\varepsilon T}_{\\text{prob}} \\times \\underbrace{T}_{\\text{damage}} = \\varepsilon T^2" },
            { text: "DAgger's fix: ε now holds on the LEARNER's own distribution (expert labeled those very states), so each step's damage stays O(ε) and costs merely add:", tex: "\\text{extra cost} \\le \\varepsilon T" },
          ],
        },
        {
          kind: "misconception",
          wrong: "More demonstrations fix BC drift. It's a data-quantity problem.",
          right: "More perfect-expert demos concentrate MORE data on the expert's narrow tube of states, and the off-tube desert stays empty. What helps is data COVERAGE of recovery states: DAgger (query the expert on learner states), or noise-injected demos, or teleoperators who make and fix mistakes. This is why 'sloppy' human demos with corrections often train better policies than flawless ones, and why UMI/ALOHA-style data collection deliberately includes recoveries.",
        },
      ],
    },
    {
      id: "implement",
      title: "Implement both loops",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "predict",
          title: "the interaction loop is the algorithm",
          source: `# pseudo-ish python; expert(s) returns the correct action
def rollout(policy, T):
    s, states = env.reset(), []
    for _ in range(T):
        states.append(s)
        s = env.step(policy(s))
    return states

# --- DAgger, iteration k ---
states = rollout(current_policy, T)     # learner drives!
data += [(s, expert(s)) for s in states]  # expert labels learner's states
current_policy = train(data)`,
          prompt: "In DAgger's rollout, whose actions move the environment, and whose actions go into the dataset?",
          options: [
            "Learner's actions drive; expert's labels are stored. That mismatch IS the algorithm",
            "Expert drives; expert labels stored",
            "Learner drives; learner's actions stored",
            "They alternate steps",
          ],
          answerIndex: 0,
          explanation: "The learner steers (so states come from ITS distribution); the expert only labels (so targets are correct). Store expert-driven states instead and you've silently reimplemented BC, a common bug in imitation codebases.",
        },
        {
          kind: "code",
          mode: "write",
          title: "drift_lab.py: reproduce the theory",
          source: `# Spec — numpy; mirrors the widget so you can sanity-check visually:
# 1. Corridor env: state = (s, e); e' = e + a*ds + noise; success iff
#    |e| < 0.9 for all 100 steps. Expert: a* = -2.4*e.
# 2. 'Trained' policy: a = -2.4*e + eta*randn() if |e| < w_data else
#    -0.1*e + 3*eta*randn()   (in/out of data support).
# 3. success_rate(policy, n=500). Sweep eta in [0.05..0.5]:
#    print table BC success vs eta.
# 4. DAgger loop, 5 iterations: rollout learner, 'query expert' by
#    widening w_data to cover the 95th percentile of |e| visited.
#    Print success after each iteration (should climb toward ~1.0).
# 5. THE MONEY PLOT (text is fine): mean |e| vs t for BC and DAgger
#    at the same eta — one curves up (T^2 flavor), one stays flat (T).`,
          checks: [
            "BC success degrades sharply with η; DAgger holds ≥90% at η where BC < 50%",
            "DAgger's success climbs monotonically over iterations",
            "Mean-|e| curves reproduce the widget's shapes (bending vs flat)",
            "One comment sentence: why widening w_data is a fair stand-in for expert relabeling",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "This lesson is the skeleton key to Levels 11 and 12",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `Almost every design choice in modern imitation is a response to today's failure mode:

- **Action chunking (ACT, l11-act):** predicting H=50-step chunks cuts the number of feedback interactions per episode by 50×, so there are fewer chances to drift. (Chunking attacks the T in εT².)
- **Diffusion/flow policies (l11-diffusion-policy, l12-pi0-flow):** multimodal action distributions avoid the 'average of two good actions is a bad action' pathology that inflates ε on real, multi-solution tasks.
- **Data collection culture:** UMI's handheld grippers and ALOHA's teleop capture natural human recoveries: coverage of off-nominal states without an oracle in the loop. HG-DAgger/hg-style interventions ('human grabs the leash when the robot drifts') are DAgger adapted to hardware reality.
- **Evaluation (l11-eval-statistics):** because validation loss is blind to compounding, real robot papers report ROLLOUT success over many trials.`,
        },
        {
          kind: "connection",
          md: "Read paper-dagger now: it's short, and you've derived its main theorem's shape. Then ACT and Diffusion Policy read as two escalating answers to the same ε and T. Your p17-bc-task will make you feel the gap between val-loss and rollout success firsthand.",
          nodeIds: ["l11-act", "l11-diffusion-policy", "l11-data-quality"],
          paperIds: ["paper-dagger", "paper-act", "paper-umi"],
          projectIds: ["p17-bc-task"],
        },
        { kind: "sources", note: "Ross, Gordon & Bagnell 2011 (AISTATS) §1 to 3, the primary source, now readable; LeRobot's imitation tutorials for the modern practice you'll use in l11-lerobot." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** explain covariate-shift-by-feedback without notes (and why val loss can't see it); reproduce the εT² vs εT argument; state exactly what DAgger changes (data distribution, not model); drift_lab.py passes. Gold = given a failing real-robot BC policy, list your first three diagnostic questions. All three should be about the DATA distribution, and you should be able to defend that ordering.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
