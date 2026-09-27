import type { Lesson } from "@/lib/lesson-types";

export const lesson: Lesson = {
  nodeId: "l6-feedback-pid",
  title: "Feedback & PID",
  subtitle: "The 80-year-old controller inside every robot you'll ever touch",
  minutes: 80,
  sections: [
    {
      id: "why",
      title: "Why open-loop always loses",
      depth: "intuition",
      blocks: [
        {
          kind: "prose",
          md: `Command a motor with a pre-computed sequence ("exactly this much current for exactly this long") and reality laughs: friction varies with temperature, the payload changed, a cable drags. **Open-loop control breaks on contact with the world.**

Feedback is the counter-move, and the idea is small: *measure the error, push against it, keep measuring.* It needs no model of friction and no payload estimate. The error itself carries all the information you act on. This loop, running at 1 to 10 kHz, is the bottom layer of every robot in existence, including the ones running billion-parameter VLAs: π0 emits target joint positions at 50 Hz, and **PID controllers chase those targets**. Your learned policy is only as good as the loop underneath it.`,
        },
        {
          kind: "equation",
          tex: "u(t) = K_p\\,e(t) + K_i\\!\\int_0^t e(\\tau)\\,d\\tau + K_d\\,\\dot e(t)",
          label: "PID",
          note: "Push proportional to the error (P), to its accumulated history (I), and against its trend (D). Three knobs; each fixes a specific failure of the others.",
        },
      ],
    },
    {
      id: "drive",
      title: "Tune a real plant, cause every classic failure",
      depth: "intuition",
      blocks: [
        {
          kind: "widget",
          id: "pid-tuner",
          caption: "A simulated mass with damping, integrated at 240 Hz. This is a real control loop, not an animation. Run the labs in order: (1) P only, raise Kp: faster but overshoot+ring. (2) Add Kd: rings damped. (3) Toggle 'constant load' with Ki=0: x settles BELOW the setpoint forever (read the steady-state-error readout). (4) Raise Ki and watch the error die. (5) Press 'kick' to test disturbance rejection. Watch the amber u-trace spike at setpoint jumps: that's derivative kick.",
        },
        {
          kind: "quiz",
          title: "name what you saw",
          items: [
            {
              q: "With P-only and a constant load force, why does the mass settle at an offset (exactly, not approximately)?",
              options: [
                "Because at equilibrium the controller must output a constant force to hold the load, and P-control can only make constant force from constant ERROR: e_ss = F_load/Kp",
                "Numerical error accumulates in the simulator",
                "The damping term absorbs the setpoint",
                "Kp is too small; any larger Kp removes the offset entirely",
              ],
              answerIndex: 0,
              a: "Holding the load needs u = F_load ≠ 0; with u = Kp·e that requires e = F_load/Kp ≠ 0. Bigger Kp shrinks it but never eliminates it. Only I can, by accumulating the residual into a standing command.",
              why: "Each term exists because of a provable limitation of the others.",
            },
            {
              q: "Why does the D term calm the ringing, in one mechanical sentence?",
              a: "Kd·ė pushes against the RATE of approach. It is a brake that acts before overshoot happens (it adds damping), and it converts oscillation energy into a smoother approach.",
            },
          ],
        },
      ],
    },
    {
      id: "derive",
      title: "Derive: what the gains do to the physics",
      depth: "derivation",
      blocks: [
        {
          kind: "derivation",
          title: "PD control rewrites the plant's physics",
          intro: "Plant: mẍ = u − cẋ (the widget's exact equations). Apply PD control u = Kp·e − Kd·ẋ with e = x* − x, and look at what the closed loop became:",
          steps: [
            { text: "Substitute u into the plant:", tex: "m\\ddot x = K_p(x^* - x) - K_d\\dot x - c\\dot x" },
            { text: "Rearrange around the error (x* constant ⇒ ë = −ẍ):", tex: "m\\ddot e + (c + K_d)\\dot e + K_p e = 0" },
            { text: "This is a mass–spring–damper in the ERROR: Kp is a virtual spring stiffness, Kd adds virtual damping. Tuning gains = choosing physics.", tex: "\\omega_n = \\sqrt{K_p/m}, \\qquad \\zeta = \\frac{c + K_d}{2\\sqrt{mK_p}}" },
            { text: "ζ < 1: underdamped (ring); ζ ≈ 1: critical (fastest, no overshoot); ζ > 1: sluggish. Your widget labs were you steering ζ and ωₙ by hand:", tex: "\\zeta = 1 \\iff K_d = 2\\sqrt{mK_p} - c" },
          ],
        },
        {
          kind: "misconception",
          wrong: "More Ki is better. It removes error, so crank it.",
          right: "The integrator is a memory with no brakes: during saturation (|u| at its limit) it keeps accumulating (WINDUP), then discharges as massive overshoot after the error flips. Real controllers, including the widget, gate integration when the actuator saturates ('anti-windup'). High Ki also adds phase lag that can destabilize the loop outright.",
        },
      ],
    },
    {
      id: "implement",
      title: "Implement the loop you'll ship",
      depth: "implementation",
      blocks: [
        {
          kind: "code",
          mode: "predict",
          title: "spot the bug that breaks every first PID",
          source: `class PID:
    def __init__(self, kp, ki, kd, dt):
        self.kp, self.ki, self.kd, self.dt = kp, ki, kd, dt
        self.integ, self.prev_e = 0.0, 0.0

    def step(self, e):
        self.integ += e * self.dt
        d = (e - self.prev_e) / self.dt
        u = self.kp*e + self.ki*self.integ + self.kd*d
        return u`,
          prompt: "One statement is missing from step(); the controller's D term is wrong from the second call onward. What's missing?",
          options: [
            "self.prev_e = e  (update the memory, otherwise d uses a stale error forever)",
            "self.integ *= 0.99  (integrator decay)",
            "u = clip(u)  (saturation)",
            "d needs a low-pass filter",
          ],
          answerIndex: 0,
          explanation: "Without `self.prev_e = e` at the end, the derivative compares against e(0) forever, and D becomes a distorted P. State updates forgotten at the end of a control step are the single most common bug in hand-rolled controllers (filters and estimators too; remember this in l6-kalman).",
        },
        {
          kind: "code",
          mode: "write",
          title: "pid.py: controller + honest test rig",
          source: `# Spec (this grows into p8-pid-system):
# 1. PID class: step(e) with (a) the prev_e fix, (b) anti-windup —
#    integrate only when |u_raw| < u_max or e opposes u, (c) output clamp.
# 2. Plant sim: m=1, c=0.8, dt=1/240:  v += (u - c*v + f_load)/m*dt; x += v*dt
# 3. metrics(traj): rise time 10->90%, overshoot %, settling time (2% band),
#    steady-state error (mean of last second).
# 4. Experiments -> print a table, one row per config:
#    a) Kp=4,Ki=0,Kd=0          b) Kp=12,Ki=0,Kd=0     (faster, rings)
#    c) Kp=12,Ki=0,Kd=2*sqrt(12)-0.8   (your critical-damping formula!)
#    d) config c + f_load=-1.5          (offset appears)
#    e) config d + Ki=3                 (offset gone)
# 5. Windup demo: u_max=2, big setpoint step, Ki=3 with anti-windup
#    ON vs OFF -> print peak overshoot of each.`,
          checks: [
            "Config c shows <2% overshoot (critical damping formula works)",
            "d has |sse| ≈ 1.5/12 = 0.125; e drives it below 0.01",
            "Windup OFF at least doubles peak overshoot vs ON",
            "All metrics computed from the trajectory arrays, not eyeballed",
          ],
        },
      ],
    },
    {
      id: "embodied",
      title: "Under every policy you will ever train",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `- **The stack on a real arm:** VLA (50 Hz, task reasoning) → trajectory interpolation → **joint PID at 1 kHz** (this lesson) → motor drivers. When a learned policy 'feels janky', first ask: is the tracking layer tuned, saturating, winding up?
- **l6-state-space** rewrites today's derivation in matrix form ẋ = Ax + Bu. Your closed-loop error ODE becomes eigenvalue placement (l2-eigen-svd pays off again: stability = eigenvalues in the left half-plane).
- **LQR (l6-lqr)** answers 'which gains are OPTIMAL?'. It is PID's principled big sibling.
- **Sim-to-real (L14):** randomizing m and c during training teaches policies robustness because the low-level loop's ζ and ωₙ shift with the physics, and your derivation says exactly how.`,
        },
        {
          kind: "connection",
          md: "p8-pid-system puts this on a simulated inverted pendulum where P-only provably cannot balance. The state-space node generalizes; Kalman (next-but-one) supplies the clean ẋ your D-term wishes it had.",
          nodeIds: ["l6-state-space", "l6-lqr", "l6-kalman"],
          projectIds: ["p8-pid-system"],
        },
        { kind: "sources", note: "Brian Douglas's PID series (visual, 1.5×) pairs well with the widget; Åström & Murray ch. 10-11 for the honest math. Skip Ziegler–Nichols folklore: you now derive gains from ζ directly." },
      ],
    },
    {
      id: "gate",
      title: "Prove it",
      depth: "application",
      blocks: [
        {
          kind: "prose",
          md: `**The bar:** write the PID class from memory (with the state-update fix and anti-windup); derive the closed-loop error ODE and the critical-damping gain; explain steady-state error and its I-term cure causally; pid.py's table matches predictions. Gold = given a plot of someone else's badly ringing controller, name the term to change, the direction, and why, in under a minute.`,
        },
        { kind: "mastery" },
      ],
    },
  ],
};
