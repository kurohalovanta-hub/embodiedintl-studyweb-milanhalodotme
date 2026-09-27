import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l10-mdp",
  title: "MDPs & Value Functions",
  subtitle: "The formal shape of 'act well over time'",
  minutes: 85,
  sections: [
    {
      id: "why",
      title: "Decisions that echo",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `Supervised learning grades each answer immediately. Robotics is crueler: push a block *now* and the consequences arrive twenty steps later, filtered through physics and noise. Acting well when **consequences echo forward through time** needs its own mathematical object: the **Markov Decision Process**, the shared language of ALL of reinforcement learning and most of modern robot learning.

An MDP is five things: states $S$, actions $A$, transition probabilities $P(s'|s,a)$ (the world's dice), rewards $R$, and a discount $\\gamma \\in [0,1)$. The **Markov** part is the load-bearing assumption: the state summarizes everything the past can tell you about the future. Choose the state badly (a single camera frame hiding velocities) and no algorithm downstream can save you. Half of practical RL failure is secretly a state-design failure.`,
        },
        {
          kind: "callout",
          tone: "insight",
          title: "the central quantity",
          md: `Everything revolves around the **value function** $V(s)$: the expected discounted return from s if you act well from now on. It converts 'echoing consequences' into a single number per state, a landscape you can hill-climb greedily. Learn to read V and RL papers become readable.`,
        },
      ],
    },
    {
      id: "drive",
      title: "Watch value flow through a world",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "gridworld-value",
          caption: "Value iteration, one sweep at a time. Labs: (1) press '1 sweep' repeatedly: value leaks outward from the ±1 terminals like heat; count how many sweeps until the far corner feels the goal. (2) Drop γ to 0.5: the far half goes numb (myopia). (3) Toggle 'slip'. With stochastic motion the policy detours around the pit: risk-awareness from pure arithmetic. (4) Build a wall maze mid-run and watch the policy re-route.",
        },
        {
          kind: "quiz",
          title: "read the landscape",
          items: [
            {
              q: "With slip ON, the cell beside the −1 pit shows an arrow pointing AWAY from the shortest path. No line of code mentions 'danger'. Where does the caution come from?",
              options: [
                "From the expectation: the 10% slip probability times the −1 terminal makes the risky cell's Q-value lower than the detour's. This is arithmetic, not rules",
                "From the living cost R = −0.04",
                "The policy is regularized toward smoothness",
                "Value iteration adds a safety margin heuristic",
              ],
              answerIndex: 0,
              a: "Q(s, toward-pit) includes 0.1·(−1) from slipping in; the detour's Q doesn't. max picks the detour. All 'personality' of an optimal policy is expectations over the world's dice.",
              why: "Behavior that looks like judgment is a max over expectations.",
            },
            {
              q: "Why does γ=0.5 kill the far half of the grid?",
              a: "A reward n steps away is worth γⁿ; 0.5¹⁰ ≈ 0.001, invisible next to the living cost. γ sets the planning horizon: effective horizon ≈ 1/(1−γ).",
            },
          ],
        },
      ],
    },
    {
      id: "formal",
      title: "Bellman: the recursion under everything",
      depth: "formalism",
      blocks: [
        {
          kind: "equation",
          tex: "V^*(s) = \\max_a \\sum_{s'} P(s'|s,a)\\big[R(s,a,s') + \\gamma V^*(s')\\big]",
          label: "Bellman optimality",
          note: "Optimal value now = best action's expected (immediate reward + discounted optimal value next). The value function is a fixed point of this equation.",
        },
        {
          kind: "prose",
          md: `Its sibling, the **Q-function** $Q^*(s,a)$, scores state-action pairs: the same recursion with the max moved inside. Q is what deep RL mostly learns, because acting greedily from Q needs no model: $\\pi(s) = \\arg\\max_a Q(s,a)$.

**Value iteration** applies the right-hand side as an update operator, repeatedly, from any initialization. Your widget's 'sweep' button is one application. Why it must converge is a two-line argument worth owning:`,
        },
        {
          kind: "derivation",
          title: "Why value iteration cannot fail (γ-contraction)",
          intro: "Let T be the Bellman update operator. Compare how T treats two different value functions U and V:",
          steps: [
            { text: "For any state, the two updates differ only through the γV(s′) terms inside expectations and max. Both |max_a f − max_a g| ≤ max_a|f−g| and expectations are averages, so:", tex: "|TU(s) - TV(s)| \\le \\gamma \\max_{s'} |U(s') - V(s')|" },
            { text: "In sup-norm: T shrinks distances by γ < 1, so it is a contraction:", tex: "\\|TU - TV\\|_\\infty \\le \\gamma\\, \\|U - V\\|_\\infty" },
            { text: "Banach's fixed-point theorem: a contraction on a complete space has exactly ONE fixed point, and iterating from ANYWHERE converges to it geometrically:", tex: "\\|V_k - V^*\\|_\\infty \\le \\gamma^k \\|V_0 - V^*\\|_\\infty" },
            { text: "That's why the widget's max-Δ readout decays like a geometric series, and why initialization didn't matter. (Deep RL loses this guarantee: function approximation breaks the contraction, which is why it needs target networks and other stabilizers.)", tex: "" },
          ],
        },
        {
          kind: "misconception",
          wrong: "The value function is the reward function, roughly.",
          right: "R is immediate and local (given by the task); V is the ENTIRE discounted future under good behavior (computed, hard-won). A state can have zero reward and enormous value (one step from the goal) or high reward and low value (a cliff-edge cookie). Conflating them makes every RL paper unreadable.",
        },
      ],
    },
    {
      id: "implement",
      title: "Implement value iteration honestly",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "predict",
          title: "the one-liner at the core",
          source: `# V: dict state->float, gamma=0.9, R=-0.04 per step
# two actions from s: a1 -> s1 (V=0.8) surely;
#                     a2 -> s2 (V=1.0) w.p. 0.8, s3 (V=-1.0) w.p. 0.2
q1 = -0.04 + 0.9 * 0.8
q2 = -0.04 + 0.9 * (0.8 * 1.0 + 0.2 * -1.0)
print(round(q1, 3), round(q2, 3), "a1" if q1 > q2 else "a2")`,
          prompt: "Compute both Q-values in your head first. Which action wins?",
          options: ["0.68 0.5 a1", "0.68 0.86 a2", "0.76 0.54 a1", "0.68 0.5 a2"],
          answerIndex: 0,
          explanation: "q1 = −0.04 + 0.72 = 0.68. q2's expectation: 0.8−0.2 = 0.6, so q2 = −0.04 + 0.54 = 0.5. The sure 0.8 beats the gamble on 1.0. This is the pit-detour arithmetic from the widget, in miniature.",
        },
        {
          kind: "code",
          mode: "write",
          title: "vi.py: your own solver",
          source: `# Spec (mirror of the widget, so you can check yourself against it):
# 1. Gridworld 8x6, terminals +1 at (7,0), -1 at (7,1), walls list,
#    living reward -0.04, slip 0.8/0.1/0.1, blocked moves stay.
# 2. value_iteration(gamma, tol=1e-4) -> V, n_sweeps.
#    Synchronous sweeps (update from a frozen copy).
# 3. greedy_policy(V) -> arrows. Print the grid as text (V to 2dp + arrow).
# 4. Experiments:
#    a) gamma 0.95 vs 0.5: print n_sweeps and V at the far corner.
#    b) slip on vs off: find a cell whose ARROW changes; print it.
#    c) verify the contraction: print max-delta per sweep; fit the ratio
#       delta_{k+1}/delta_k for late sweeps — it should approach gamma.
# 5. Policy evaluation: for YOUR greedy policy, run 2000 rollouts from
#    the start cell; compare mean return to V[start] (should match ~1%).`,
          checks: [
            "Your V table matches the widget's (spot-check 3 cells at γ=0.95)",
            "Late-sweep Δ ratio ≈ γ (the contraction, measured!)",
            "Rollout mean return ≈ V[start]: V is an expectation, verified by Monte Carlo",
            "The slip on/off arrow-flip cell is adjacent to the pit (and you can say why)",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "From 48 cells to a robot's world",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `Everything above survives scaling; only the *representation* of V changes:

- **l10-tabular → l10-dqn:** replace the table with a network Q(s,a;θ). You lose the contraction guarantee and take on a bag of stabilizers (replay, target nets) to compensate.
- **l10-policy-gradient / l10-ppo:** skip V-greedy entirely; differentiate expected return w.r.t. policy parameters (l2-optimization, ascending). PPO, the workhorse of locomotion (paper-rudin trains real quadrupeds with it), still uses a learned V as its baseline/critic.
- **Robot manipulation as an MDP:** state = proprio + camera features, actions = pose deltas, γ ≈ 0.99, reward = sparse task success. The Markov trap is real here: a single frame is NOT Markov (no velocities), which is why policies consume short histories or recurrent state.
- **Offline RL (l10-offline-iql)** asks: extract V/Q from logged robot data with no exploration, the case that matters most in industry, where hardware is expensive.`,
        },
        {
          kind: "connection",
          md: "l10-tabular makes today's solver tabular-Q-learning (no model needed); the RL survey paper is now readable front-to-back. Sutton & Barto ch. 3 and 4 formalize today's content.",
          nodeIds: ["l10-tabular", "l10-policy-gradient"],
          paperIds: ["paper-rl-survey"],
          projectIds: ["p16-rl-manipulation"],
        },
        { kind: "sources", note: "Sutton & Barto ch. 3 (MDPs) and 4.4 (value iteration), the field's shared canon; David Silver's lecture 2 if you want it spoken. Do S&B's ch. 3 exercises: they are the classic gate." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** state the 5-tuple and the Markov assumption with a robot example of its violation; write the Bellman optimality equation cold and compute Q-values by hand; sketch the contraction argument; vi.py passes including the Monte-Carlo check. Gold = explain to an empty chair why deep RL needed target networks, using only 'the contraction broke'.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
