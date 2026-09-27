import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l6-kalman",
  title: "The Kalman Filter",
  subtitle: "Believing under uncertainty: predict, measure, blend, forever",
  minutes: 85,
  sections: [
    {
      id: "why",
      title: "Sensors lie a little, motion lies a little. Believe anyway",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `A robot never knows where it is. Encoders drift, cameras are noisy and late, wheels slip. Yet it must act on *some* estimate. The way out is to **stop tracking a position and start tracking a belief**, a probability distribution over positions.

The Kalman filter is the optimal way to maintain a *Gaussian* belief through two alternating moves, repeated forever:

- **Predict:** push the belief through your motion model. Motion is imperfect → the belief **spreads** (uncertainty grows by Q).
- **Update:** blend the belief with a new measurement. Information arrives → the belief **tightens**.

That heartbeat (spread, tighten, spread, tighten) runs inside every drone autopilot, every SLAM system, every robot-arm state estimator, and (as the smoother/filter duality) inside how you'll *evaluate* noisy policy metrics later. It's the Bayes filter of the previous node, made exact for Gaussians.`,
        },
        {
          kind: "widget",
          id: "gaussian-explorer",
          caption: "Warm-up: the belief object itself. μ = best guess, σ = honest ignorance. Everything the filter does is move and reshape THIS. (Slide σ and internalize: a wide Gaussian is not 'wrong', it is honest.)",
        },
      ],
    },
    {
      id: "drive",
      title: "Run the heartbeat by hand",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "kalman-1d",
          caption: "Labs: (1) press 'predict' five times in a row. With no sensing, the belief spreads without bound: motion-only = amnesia. (2) One 'measure+update' and the belief snaps tight. (3) Crank R (bad sensor): K drops, updates barely move μ. (4) Crank Q (sloppy motion): the filter leans on measurements instead. (5) 'auto' and watch σ settle into a steady rhythm: it stops shrinking. Ask yourself why before the next section tells you.",
        },
        {
          kind: "quiz",
          title: "read the gain",
          items: [
            {
              q: "K = σ²/(σ² + R). Read it as a sentence about trust.",
              options: [
                "K is the fraction of the innovation (z − μ) you accept: confident belief (small σ²) or bad sensor (big R) → small K → trust yourself; uncertain belief or great sensor → K near 1 → trust the measurement",
                "K is the probability the measurement is an outlier",
                "K is the sensor's accuracy specification",
                "K balances Q against R directly",
              ],
              answerIndex: 0,
              a: "K = (my uncertainty) / (my uncertainty + sensor's uncertainty), a trust ratio. The filter is this ratio recomputed every step.",
              why: "Every fancy estimator you'll meet (EKF, UKF, factor graphs) is this trust arithmetic with more elaborate bookkeeping.",
            },
            {
              q: "In auto mode σ stops shrinking at a floor. Why can't the filter become certain?",
              a: "Each predict ADDS Q; each update multiplies variance by (1−K)<1. The equilibrium where injection balances contraction is the steady-state σ. With Q>0 the filter can never become certain; it can only hold that equilibrium.",
            },
          ],
        },
      ],
    },
    {
      id: "derive",
      title: "Derive the update: it's precision-weighted averaging",
      depth: "derivation",
      blocks: [
        {
          kind: "derivation",
          title: "Product of two Gaussians ⇒ the Kalman update",
          intro: "Belief N(μ, σ²), measurement likelihood N(z, R). Bayes says: multiply and renormalize. Multiply the exponents (1-D, no matrix fog):",
          steps: [
            { text: "Sum of two quadratics in x is a quadratic, so the posterior is Gaussian too. Collect the x² coefficients:", tex: "\\frac{1}{\\sigma_{new}^2} = \\frac{1}{\\sigma^2} + \\frac{1}{R}" },
            { text: "Precisions (1/variance) ADD, so every measurement can only sharpen the belief. Collect the linear terms:", tex: "\\mu_{new} = \\sigma_{new}^2\\Big(\\frac{\\mu}{\\sigma^2} + \\frac{z}{R}\\Big)" },
            { text: "The new mean is a precision-weighted average of guess and measurement. Now define K = σ²/(σ²+R) and rearrange both lines:", tex: "\\mu_{new} = \\mu + K(z-\\mu), \\qquad \\sigma^2_{new} = (1-K)\\,\\sigma^2" },
            { text: "The 'mysterious' Kalman gain form is the weighted average, refactored. Predict is even easier: adding independent Gaussian motion noise adds variances:", tex: "\\mu \\leftarrow \\mu + u, \\qquad \\sigma^2 \\leftarrow \\sigma^2 + Q" },
          ],
        },
        {
          kind: "misconception",
          wrong: "The Kalman filter smooths data. It's a fancy moving average.",
          right: "A moving average has no model and lags by construction. The KF carries a MOTION MODEL (predict) and an honest uncertainty, so it can anticipate, fuse sensors with different noise levels optimally, and TELL YOU how sure it is. The σ it reports is as much the product as the μ, because downstream controllers act differently on uncertain state.",
        },
      ],
    },
    {
      id: "implement",
      title: "Implement it: 15 lines, then break it honestly",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "missing",
          title: "the whole 1-D filter",
          source: `def predict(mu, var, u, Q):
    return mu + u, var + Q

def update(mu, var, z, R):
    K = var / (var + R)
    mu = mu + K * (z - mu)
    var = (1 - K) * var
    return mu, var, K`,
          masked: [5],
          prompt: "Write line 5: the Kalman gain.",
          answer: "K = var / (var + R)",
          explanation: "The trust ratio. Notice what is NOT here: no history buffer, no matrix of past data. The Gaussian (μ, σ²) is a sufficient statistic, so the filter is O(1) memory forever. That's why it runs at kHz on microcontrollers.",
        },
        {
          kind: "code",
          mode: "write",
          title: "kf.py: filter + honest evaluation",
          source: `# Spec (seeds of p10-kf-localization):
# 1. Simulate truth: x += 0.4 + N(0, Q_true), 200 steps, Q_true=0.05.
#    Measurements z = x + N(0, R_true), R_true=0.6.
# 2. Run your filter (predict+update per step) with matched Q, R.
# 3. Baselines: raw measurements; moving average (window 8).
#    Print RMSE of all three vs truth. KF should win.
# 4. Consistency check (the pro move): ~68% of steps should have
#    |mu - x_true| < sigma. Print the actual fraction.
# 5. LIE to the filter: run with R = R_true/100 (overconfident sensor)
#    and with Q = 0 (overconfident motion). For each: RMSE + the
#    68% check. Watch consistency collapse even when RMSE looks OK.
# 6. Drop 40% of measurements at random (camera dropout): predict-only
#    on missing steps. Plot/print sigma over time - the breathing.`,
          checks: [
            "KF RMSE beats raw z and the moving average",
            "Matched filter: within-1σ fraction lands near 68% (±6%)",
            "Q=0 run: sigma → 0, filter stops listening, consistency check fails badly. Write one comment sentence on why this is the dangerous failure (confident AND wrong)",
            "Dropout run shows σ growing during gaps and snapping down at each measurement",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "From this toy to real state estimation",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `The 1-D scalar filter generalizes by substitution, not new ideas: state becomes a vector, σ² becomes a covariance matrix P, the motion model becomes ẋ = Ax + Bu (l6-state-space), and K = PHᵀ(HPHᵀ+R)⁻¹. Precision still adds; trust is still a ratio.

- **l6-ekf-pf:** real robots are nonlinear. The EKF linearizes with a Jacobian (l5's Jacobian, reused on dynamics); particle filters drop Gaussians entirely.
- **p10-kf-localization:** you'll fuse wheel odometry (predict) with noisy landmark sightings (update). It is your dropout experiment, made spatial.
- **Where learning meets filtering:** VLA inputs on real robots are filtered proprioception; training on raw vs filtered state changes policy quality measurably. And your step-5 'lie' experiment is the exact pathology of overconfident learned perception: a model that reports tiny R about a wrong detection poisons the whole fusion stack. Recognizing that failure pattern is a research-grade skill.`,
        },
        {
          kind: "connection",
          md: "Next: matrices for the state (l6-state-space), then nonlinearity (l6-ekf-pf). The Bayes-filter node you just came from is the general theory; today was its closed-form Gaussian case.",
          nodeIds: ["l6-state-space", "l6-ekf-pf"],
          projectIds: ["p10-kf-localization"],
        },
        { kind: "sources", note: "Kalman-and-Bayesian-Filters-in-Python (Labbe) ch. 4 to 6: interactive notebooks that extend today's labs; Probabilistic Robotics ch. 3 for the rigorous matrix derivation when you're ready for it." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "research",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** write predict/update from memory; derive the update from the product of Gaussians (precisions add!); read K as a trust ratio with both limits; kf.py passes, including the consistency checks. Gold = explain the Q=0 failure and why 'confident and wrong' is worse than 'uncertain and right' for a downstream controller, with the 68% numbers to back it.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
