"use client";

import { useState } from "react";
import { Katex } from "../ui";
import { Readout, Slider, WBtn, WidgetShell, useRaf } from "./toolkit";

// Value iteration on a gridworld you can edit. Watch V(s) propagate outward
// from the terminals sweep by sweep, and the greedy policy fall out of it.

const COLS = 8, ROWS = 6;
const LIVING = -0.04;
const key = (c: number, r: number) => r * COLS + c;
const GOAL = key(7, 0);   // +1
const PIT = key(7, 1);    // −1
const DIRS = [
  { dc: 0, dr: -1, ch: "↑" },
  { dc: 0, dr: 1, ch: "↓" },
  { dc: -1, dr: 0, ch: "←" },
  { dc: 1, dr: 0, ch: "→" },
];

const vColor = (v: number) => {
  const t = Math.max(-1, Math.min(1, v));
  return t >= 0 ? `rgba(82,214,138,${(0.06 + 0.5 * t).toFixed(3)})` : `rgba(244,88,110,${(0.06 - 0.5 * t).toFixed(3)})`;
};

export default function GridworldValue() {
  const [walls, setWalls] = useState<Set<number>>(new Set([key(2, 1), key(2, 2), key(2, 3), key(5, 3), key(5, 4)]));
  const [V, setV] = useState<number[]>(() => Array(COLS * ROWS).fill(0));
  const [gamma, setGamma] = useState(0.95);
  const [slip, setSlip] = useState(true);
  const [sweeps, setSweeps] = useState(0);
  const [delta, setDelta] = useState(Infinity);
  const [running, setRunning] = useState(false);

  const isTerminal = (k: number) => k === GOAL || k === PIT;
  const termR = (k: number) => (k === GOAL ? 1 : -1);

  const qValue = (v: number[], c: number, r: number, a: number) => {
    // moves: intended 0.8, each perpendicular 0.1 (if slip), blocked → stay
    const outcomes = slip
      ? [
          { d: DIRS[a], p: 0.8 },
          { d: DIRS[a].dc === 0 ? DIRS[2] : DIRS[0], p: 0.1 },
          { d: DIRS[a].dc === 0 ? DIRS[3] : DIRS[1], p: 0.1 },
        ]
      : [{ d: DIRS[a], p: 1 }];
    let q = 0;
    for (const { d, p } of outcomes) {
      let nc = c + d.dc, nr = r + d.dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || walls.has(key(nc, nr))) { nc = c; nr = r; }
      const nk = key(nc, nr);
      q += p * (isTerminal(nk) ? termR(nk) : LIVING + gamma * v[nk]);
    }
    return q;
  };

  const sweep = () => {
    setV((v) => {
      const nv = [...v];
      let dmax = 0;
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const k = key(c, r);
          if (walls.has(k) || isTerminal(k)) continue;
          const best = Math.max(...DIRS.map((_, a) => qValue(v, c, r, a)));
          dmax = Math.max(dmax, Math.abs(best - v[k]));
          nv[k] = best;
        }
      setDelta(dmax);
      if (dmax < 1e-4) setRunning(false);
      return nv;
    });
    setSweeps((s) => s + 1);
  };

  useRaf(() => sweep(), running);

  const reset = () => { setV(Array(COLS * ROWS).fill(0)); setSweeps(0); setDelta(Infinity); setRunning(false); };
  const toggleWall = (k: number) => {
    if (isTerminal(k)) return;
    setWalls((w) => {
      const n = new Set(w);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  const CELL = 56;
  const W = COLS * CELL, HH = ROWS * CELL;

  return (
    <WidgetShell
      canvas={
        <svg viewBox={`0 0 ${W} ${HH}`} className="w-full touch-none select-none rounded-md">
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const k = key(c, r);
              const wall = walls.has(k);
              const term = isTerminal(k);
              const v = term ? termR(k) : V[k];
              let arrow = "";
              if (!wall && !term && sweeps > 0) {
                const qs = DIRS.map((_, a) => qValue(V, c, r, a));
                arrow = DIRS[qs.indexOf(Math.max(...qs))].ch;
              }
              return (
                <g key={k} style={{ cursor: term ? "default" : "pointer" }} onClick={() => toggleWall(k)}>
                  <rect x={c * CELL + 1} y={r * CELL + 1} width={CELL - 2} height={CELL - 2} rx={4}
                    fill={wall ? "#22303f" : term ? (k === GOAL ? "#52d68a22" : "#f4586e22") : vColor(v)}
                    stroke={term ? (k === GOAL ? "#52d68a" : "#f4586e") : "#1b2634"} strokeWidth={term ? 1.5 : 1} />
                  {!wall && (
                    <text x={c * CELL + CELL / 2} y={r * CELL + (term ? CELL / 2 + 5 : 22)} textAnchor="middle"
                      fill={term ? (k === GOAL ? "#52d68a" : "#f4586e") : "#cfe6ec"}
                      fontSize={term ? 16 : 11} fontFamily="var(--font-mono)" fontWeight={term ? 700 : 400}>
                      {term ? (k === GOAL ? "+1" : "−1") : v.toFixed(2)}
                    </text>
                  )}
                  {arrow && (
                    <text x={c * CELL + CELL / 2} y={r * CELL + 44} textAnchor="middle" fill="#4dd6e8" fontSize={15}>{arrow}</text>
                  )}
                </g>
              );
            }),
          )}
        </svg>
      }
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            <WBtn onClick={sweep}>1 sweep</WBtn>
            <WBtn active={running} color="#52d68a" onClick={() => setRunning(!running)}>{running ? "running…" : "run to convergence"}</WBtn>
            <WBtn onClick={reset}>reset V</WBtn>
            <WBtn active={slip} color="#e8b34d" onClick={() => { setSlip(!slip); }}>slip 80/10/10</WBtn>
          </div>
          <Slider tex="\gamma\ \text{(discount)}" value={gamma} min={0.5} max={0.99} step={0.01} onChange={setGamma} />
          <Readout
            items={[
              { label: "sweeps", value: sweeps },
              { label: "max Δ", value: delta === Infinity ? "—" : delta.toExponential(1), color: delta < 1e-4 ? "#52d68a" : "#e8b34d" },
              ...(delta < 1e-4 ? [{ label: "status", value: "converged", color: "#52d68a" }] : []),
            ]}
          />
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            <Katex tex="V(s)\leftarrow\max_a\sum_{s'}P(s'|s,a)\left[R+\gamma V(s')\right]" block />
            Step one sweep at a time: value leaks outward from the terminals like heat. Click cells to
            build walls and watch the policy re-route. Drop γ to 0.5 and the far half of the map goes
            numb (myopia). Turn <b>slip</b> off and the policy hugs the pit&apos;s edge; turn it on and it
            detours: risk-awareness emerging from arithmetic, not rules. Living cost R = −0.04/step.
          </div>
        </>
      }
    />
  );
}
