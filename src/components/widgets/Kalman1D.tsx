"use client";

import { useRef, useState } from "react";
import { Katex } from "../ui";
import { Readout, Slider, WBtn, WidgetShell, useRaf } from "./toolkit";

// The Kalman filter's two moves, made physical: PREDICT slides the belief
// forward and inflates it (Q); UPDATE pulls it toward a noisy measurement
// and tightens it, with gain K deciding whom to trust.

const randn = () => {
  const u = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};
const DRIFT = 0.4;

type Snap = { mu: number; sd: number; kind: "predict" | "update" };

export default function Kalman1D() {
  const [Q, setQ] = useState(0.06);
  const [R, setR] = useState(0.5);
  const [auto, setAuto] = useState(false);
  const [showTrue, setShowTrue] = useState(true);
  const [st, setSt] = useState({
    mu: 0, va: 1.2, trueX: 0.3, z: null as number | null, K: null as number | null,
    hist: [] as Snap[],
  });
  const clock = useRef(0);
  const phase = useRef<"predict" | "update">("predict");

  const predict = () =>
    setSt((s) => {
      const trueX = s.trueX + DRIFT + Math.sqrt(Q) * randn();
      const mu = s.mu + DRIFT;
      const va = s.va + Q;
      if (trueX > 9.6) {
        return { mu: 0, va: 1.2, trueX: 0.3, z: null, K: null, hist: [] };
      }
      return { ...s, trueX, mu, va, z: null, hist: [...s.hist.slice(-13), { mu, sd: Math.sqrt(va), kind: "predict" as const }] };
    });
  const update = () =>
    setSt((s) => {
      const z = s.trueX + Math.sqrt(R) * randn();
      const K = s.va / (s.va + R);
      const mu = s.mu + K * (z - s.mu);
      const va = (1 - K) * s.va;
      return { ...s, mu, va, z, K, hist: [...s.hist.slice(-13), { mu, sd: Math.sqrt(va), kind: "update" as const }] };
    });

  useRaf((dt) => {
    clock.current += dt;
    if (clock.current > 0.55) {
      clock.current = 0;
      if (phase.current === "predict") { predict(); phase.current = "update"; }
      else { update(); phase.current = "predict"; }
    }
  }, auto);

  const W = 460, HH = 300;
  const X = (x: number) => ((x + 1) / 12) * W;
  const sd = Math.sqrt(st.va);
  const curveTop = 60;
  const curve: string[] = [];
  const peak = 1 / (sd * Math.sqrt(2 * Math.PI));
  for (let x = -1; x <= 11; x += 0.05) {
    const p = Math.exp(-((x - st.mu) ** 2) / (2 * st.va)) / (sd * Math.sqrt(2 * Math.PI));
    curve.push(`${X(x)},${190 - (p / Math.max(peak, 0.9)) * (190 - curveTop)}`);
  }

  return (
    <WidgetShell
      canvas={
        <svg viewBox={`0 0 ${W} ${HH}`} className="w-full touch-none select-none rounded-md">
          <line x1={0} y1={190} x2={W} y2={190} stroke="#314155" strokeWidth={1.4} />
          {[0, 2, 4, 6, 8, 10].map((x) => (
            <text key={x} x={X(x)} y={204} fill="#3d4a5c" fontSize={9.5} fontFamily="var(--font-mono)" textAnchor="middle">{x}</text>
          ))}
          {/* belief */}
          <polygon points={`${X(st.mu - 3 * sd)},190 ${curve.join(" ")} ${X(st.mu + 3 * sd)},190`} fill="#4dd6e814" stroke="none" />
          <polyline points={curve.join(" ")} fill="none" stroke="#4dd6e8" strokeWidth={2} />
          <line x1={X(st.mu)} y1={190} x2={X(st.mu)} y2={curveTop} stroke="#4dd6e855" strokeWidth={1} strokeDasharray="4 3" />
          <text x={X(st.mu)} y={curveTop - 8} fill="#4dd6e8" fontSize={10.5} fontFamily="var(--font-mono)" textAnchor="middle">belief μ±σ</text>
          {/* truth */}
          {showTrue && (
            <>
              <line x1={X(st.trueX)} y1={190} x2={X(st.trueX)} y2={120} stroke="#52d68a" strokeWidth={1.6} strokeDasharray="5 4" />
              <text x={X(st.trueX)} y={112} fill="#52d68a" fontSize={10} fontFamily="var(--font-mono)" textAnchor="middle">true x</text>
            </>
          )}
          {/* measurement */}
          {st.z != null && (
            <>
              <line x1={X(st.z)} y1={190} x2={X(st.z)} y2={140} stroke="#e8b34d" strokeWidth={2} />
              <text x={X(st.z)} y={132} fill="#e8b34d" fontSize={10} fontFamily="var(--font-mono)" textAnchor="middle">z</text>
            </>
          )}
          {/* history strip */}
          <text x={8} y={226} fill="#5b6b7d" fontSize={9} fontFamily="var(--font-mono)">history (μ ± σ)</text>
          {st.hist.map((h, i) => {
            const y = 236 + i * 4.2;
            const op = 0.25 + 0.75 * (i / Math.max(1, st.hist.length - 1));
            const col = h.kind === "predict" ? "#a78bfa" : "#4dd6e8";
            return (
              <g key={i} opacity={op}>
                <line x1={X(h.mu - h.sd)} y1={y} x2={X(h.mu + h.sd)} y2={y} stroke={col} strokeWidth={2} />
                <circle cx={X(h.mu)} cy={y} r={1.8} fill={col} />
              </g>
            );
          })}
        </svg>
      }
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            <WBtn color="#a78bfa" onClick={predict}>predict (move + Q)</WBtn>
            <WBtn color="#e8b34d" onClick={update}>measure + update</WBtn>
            <WBtn active={auto} color="#52d68a" onClick={() => setAuto(!auto)}>auto</WBtn>
            <WBtn active={showTrue} onClick={() => setShowTrue(!showTrue)}>show truth</WBtn>
          </div>
          <Slider tex="Q\ \text{(process noise)}" value={Q} min={0.001} max={0.5} step={0.001} onChange={setQ} color="#a78bfa" fmt={(v) => v.toFixed(3)} />
          <Slider tex="R\ \text{(sensor noise)}" value={R} min={0.01} max={2} step={0.01} onChange={setR} color="#e8b34d" />
          <Readout
            items={[
              { label: "μ", value: st.mu.toFixed(2), color: "#4dd6e8" },
              { label: "σ", value: sd.toFixed(2), color: "#4dd6e8" },
              { label: "K", value: st.K != null ? st.K.toFixed(2) : "—", color: "#52d68a" },
              { label: "|μ−x|", value: Math.abs(st.mu - st.trueX).toFixed(2) },
            ]}
          />
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            <Katex tex="K=\frac{\sigma^2}{\sigma^2+R},\quad \mu\leftarrow\mu+K(z-\mu),\quad \sigma^2\leftarrow(1-K)\,\sigma^2" block />
            K is a trust ratio. Press <b>predict</b> five times in a row: the belief spreads without bound.
            Motion without sensing is amnesia. Then one update snaps it tight. Crank R up: K → 0 and
            updates barely move μ (sensor distrusted). Purple bars in the history are predicts (widening),
            cyan are updates (tightening). Estimation is this heartbeat, repeated forever.
          </div>
        </>
      }
    />
  );
}
