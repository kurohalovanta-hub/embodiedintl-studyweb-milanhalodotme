"use client";

import { useRef, useState } from "react";
import { Katex } from "../ui";
import { Readout, Slider, WBtn, WidgetShell, useRaf } from "./toolkit";

// A real second-order plant (mass + damping, optional constant load),
// integrated live at 240 Hz under your PID. Rise time, overshoot and
// steady-state error are measured from the actual trajectory.

const M = 1.0;       // mass
const C = 0.8;       // viscous damping
const UMAX = 6;      // actuator saturation
const WINDOW = 8;    // seconds of history shown
const H = 1 / 240;   // physics substep

type Sample = { t: number; x: number; sp: number; u: number };
type Sim = {
  t: number; x: number; v: number; integ: number; prevE: number; sp: number;
  lastFlip: number; stepT: number; stepFrom: number; lastU: number; hist: Sample[];
};
type View = { t: number; sp: number; stepT: number; stepFrom: number; hist: Sample[] };

const freshSim = (): Sim => ({
  t: 0, x: 0, v: 0, integ: 0, prevE: 0, sp: 1, lastFlip: 0, stepT: 0, stepFrom: 0, lastU: 0, hist: [],
});

export default function PIDTuner() {
  const [kp, setKp] = useState(4);
  const [ki, setKi] = useState(0);
  const [kd, setKd] = useState(0.8);
  const [load, setLoad] = useState(false);
  const [autoStep, setAutoStep] = useState(true);
  const [running, setRunning] = useState(true);
  const S = useRef<Sim>(freshSim());
  const [view, setView] = useState<View>({ t: 0, sp: 1, stepT: 0, stepFrom: 0, hist: [] });

  useRaf((dt) => {
    const s = S.current;
    let steps = Math.max(1, Math.min(60, Math.round(dt / H)));
    while (steps-- > 0) {
      s.t += H;
      if (autoStep && s.t - s.lastFlip > 4) {
        s.lastFlip = s.t;
        s.stepT = s.t;
        s.stepFrom = s.sp;
        s.sp = s.sp > 0.5 ? 0 : 1;
      }
      const e = s.sp - s.x;
      const dEdt = (e - s.prevE) / H;
      s.prevE = e;
      const uRaw = kp * e + ki * s.integ + kd * dEdt;
      const u = Math.max(-UMAX, Math.min(UMAX, uRaw));
      // conditional integration anti-windup: don't integrate while pushing further into saturation
      if (u === uRaw || e * uRaw < 0) s.integ += e * H;
      s.lastU = u;
      const f = u - C * s.v + (load ? -1.5 : 0);
      s.v += (f / M) * H;
      s.x += s.v * H;
    }
    const last = s.hist[s.hist.length - 1];
    if (!last || s.t - last.t > 1 / 60) {
      s.hist.push({ t: s.t, x: s.x, sp: s.sp, u: s.lastU });
      while (s.hist.length && s.hist[0].t < s.t - WINDOW) s.hist.shift();
    }
    setView({ t: s.t, sp: s.sp, stepT: s.stepT, stepFrom: s.stepFrom, hist: [...s.hist] });
  }, running);

  // metrics since the last setpoint change
  const seg = view.hist.filter((p) => p.t >= view.stepT);
  const dSp = view.sp - view.stepFrom;
  let rise = "—", over = "—", sse = "—";
  if (seg.length > 4 && Math.abs(dSp) > 1e-6) {
    const frac = (p: Sample) => (p.x - view.stepFrom) / dSp;
    const t10 = seg.find((p) => frac(p) >= 0.1)?.t;
    const t90 = seg.find((p) => frac(p) >= 0.9)?.t;
    if (t10 != null && t90 != null) rise = `${(t90 - t10).toFixed(2)}s`;
    const peak = Math.max(...seg.map(frac));
    if (peak > 1) over = `${((peak - 1) * 100).toFixed(0)}%`;
    else if (t90 != null) over = "0%";
    const tail = seg.filter((p) => p.t > view.t - 0.6);
    if (view.t - view.stepT > 2.5 && tail.length)
      sse = (view.sp - tail.reduce((a, p) => a + p.x, 0) / tail.length).toFixed(3);
  }

  const W = 460, HH = 250;
  const tx = (t: number) => ((t - (view.t - WINDOW)) / WINDOW) * W;
  const xy = (x: number) => HH - ((x + 0.6) / 2.4) * HH;
  const uy = (u: number) => HH - ((u / UMAX + 1) / 2) * 40 - 4;

  return (
    <WidgetShell
      canvas={
        <svg viewBox={`0 0 ${W} ${HH + 4}`} className="w-full touch-none select-none rounded-md">
          {[0, 1].map((v) => (
            <line key={v} x1={0} y1={xy(v)} x2={W} y2={xy(v)} stroke="#1b263444" strokeWidth={1} />
          ))}
          {view.hist.length > 1 && (
            <>
              <polyline points={view.hist.map((p) => `${tx(p.t)},${xy(p.sp)}`).join(" ")} fill="none" stroke="#5b6b7d" strokeWidth={1.3} strokeDasharray="5 4" />
              <polyline points={view.hist.map((p) => `${tx(p.t)},${uy(p.u)}`).join(" ")} fill="none" stroke="#e8b34d66" strokeWidth={1.2} />
              <polyline points={view.hist.map((p) => `${tx(p.t)},${xy(p.x)}`).join(" ")} fill="none" stroke="#4dd6e8" strokeWidth={2} />
            </>
          )}
          <text x={8} y={xy(1) - 6} fill="#5b6b7d" fontSize={9.5} fontFamily="var(--font-mono)">setpoint</text>
          <text x={8} y={uy(0) - 26} fill="#e8b34d88" fontSize={9.5} fontFamily="var(--font-mono)">u (scaled)</text>
          <text x={8} y={16} fill="#4dd6e8" fontSize={9.5} fontFamily="var(--font-mono)">x(t)</text>
        </svg>
      }
      controls={
        <>
          <Slider tex="K_p" value={kp} min={0} max={14} step={0.1} onChange={setKp} />
          <Slider tex="K_i" value={ki} min={0} max={6} step={0.05} onChange={setKi} color="#52d68a" />
          <Slider tex="K_d" value={kd} min={0} max={4} step={0.05} onChange={setKd} color="#e8b34d" />
          <div className="flex flex-wrap gap-1.5">
            <WBtn active={running} color="#52d68a" onClick={() => setRunning(!running)}>{running ? "running" : "paused"}</WBtn>
            <WBtn active={autoStep} onClick={() => setAutoStep(!autoStep)}>auto step</WBtn>
            <WBtn onClick={() => { const st = S.current; st.stepT = st.t; st.stepFrom = st.sp; st.sp = st.sp > 0.5 ? 0 : 1; st.lastFlip = st.t; }}>step now</WBtn>
            <WBtn color="#f2934d" onClick={() => { S.current.v += 2; }}>kick</WBtn>
            <WBtn active={load} color="#e86ea4" onClick={() => setLoad(!load)}>constant load</WBtn>
            <WBtn onClick={() => { S.current = freshSim(); setView({ t: 0, sp: 1, stepT: 0, stepFrom: 0, hist: [] }); }}>reset</WBtn>
          </div>
          <Readout
            items={[
              { label: "rise 10→90", value: rise, color: "#4dd6e8" },
              { label: "overshoot", value: over, color: over !== "—" && over !== "0%" ? "#f2934d" : "#52d68a" },
              { label: "steady-state err", value: sse, color: sse !== "—" && Math.abs(Number(sse)) > 0.02 ? "#f4586e" : "#52d68a" },
            ]}
          />
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            <Katex tex="u=K_p e+K_i\!\int\! e\,dt+K_d\dot e" />, plant <Katex tex="m\ddot x=u-c\dot x" />.
            Run the classic experiment: P alone with <b>constant load</b> → the error readout never reaches
            zero (the controller needs a nonzero e to hold force). Add K<sub>i</sub> → it does. Push
            K<sub>p</sub> high → overshoot and ring; K<sub>d</sub> damps it. The spike in the amber u-trace
            at each setpoint jump is <i>derivative kick</i>. Real controllers differentiate the
            measurement, not the error, to avoid it.
          </div>
        </>
      }
    />
  );
}
