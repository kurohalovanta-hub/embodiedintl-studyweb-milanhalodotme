"use client";

import { useState } from "react";
import { Katex } from "../ui";
import { Readout, Slider, WBtn, WidgetShell } from "./toolkit";

// A one-neuron network as an explicit computation graph:
// u = w·x,  z = u+b,  a = σ(z),  d = a−y,  L = d².
// Forward values (cyan) flow left→right; gradients ∂L/∂· (amber) flow back.

const sig = (z: number) => 1 / (1 + Math.exp(-z));

type NodeBox = { id: string; label: string; x: number; y: number };
const BOXES: NodeBox[] = [
  { id: "w", label: "w", x: 26, y: 30 },
  { id: "x", label: "x", x: 26, y: 100 },
  { id: "b", label: "b", x: 26, y: 170 },
  { id: "y", label: "y", x: 26, y: 240 },
  { id: "u", label: "u = w·x", x: 150, y: 65 },
  { id: "z", label: "z = u+b", x: 258, y: 118 },
  { id: "a", label: "a = σ(z)", x: 360, y: 118 },
  { id: "d", label: "d = a−y", x: 360, y: 212 },
  { id: "L", label: "L = d²", x: 258, y: 258 },
];
const EDGES: [string, string, string][] = [
  ["w", "u", "∂u/∂w = x"],
  ["x", "u", "∂u/∂x = w"],
  ["u", "z", "∂z/∂u = 1"],
  ["b", "z", "∂z/∂b = 1"],
  ["z", "a", "σ′= a(1−a)"],
  ["a", "d", "∂d/∂a = 1"],
  ["y", "d", "∂d/∂y = −1"],
  ["d", "L", "∂L/∂d = 2d"],
];
const BW = 92, BH = 46;

export default function BackpropGraph() {
  const [w, setW] = useState(0.8);
  const [b, setB] = useState(-0.5);
  const [x, setX] = useState(1.5);
  const [y, setY] = useState(1.0);
  const [eta, setEta] = useState(0.5);
  const [lossHist, setLossHist] = useState<number[]>([]);

  // forward
  const u = w * x;
  const z = u + b;
  const a = sig(z);
  const d = a - y;
  const L = d * d;
  // backward (chain rule, exact)
  const dL_dd = 2 * d;
  const dL_da = dL_dd;
  const dL_dz = dL_da * a * (1 - a);
  const dL_du = dL_dz;
  const dL_db = dL_dz;
  const dL_dw = dL_du * x;
  const dL_dx = dL_du * w;
  const dL_dy = -dL_dd;

  const vals: Record<string, number> = { w, x, b, y, u, z, a, d, L };
  const grads: Record<string, number> = {
    w: dL_dw, x: dL_dx, b: dL_db, y: dL_dy, u: dL_du, z: dL_dz, a: dL_da, d: dL_dd, L: 1,
  };

  const gstep = () => {
    setW((v) => v - eta * dL_dw);
    setB((v) => v - eta * dL_db);
    setLossHist((h) => [...h.slice(-39), L]);
  };
  const box = (id: string) => BOXES.find((n) => n.id === id)!;
  const isParam = (id: string) => id === "w" || id === "b";
  const maxHist = Math.max(0.0001, ...lossHist);

  return (
    <WidgetShell
      canvas={
        <svg viewBox="0 0 470 320" className="w-full touch-none select-none rounded-md">
          {EDGES.map(([from, to, lbl]) => {
            const f = box(from), t = box(to);
            const x1 = f.x + BW, y1 = f.y + BH / 2, x2 = t.x, y2 = t.y + BH / 2;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            return (
              <g key={`${from}-${to}`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#31415588" strokeWidth={1.4} />
                <text x={mx} y={my - 5} fill="#5b6b7d" fontSize={8.5} fontFamily="var(--font-mono)" textAnchor="middle">{lbl}</text>
              </g>
            );
          })}
          {BOXES.map((n) => (
            <g key={n.id}>
              <rect
                x={n.x} y={n.y} width={BW} height={BH} rx={6}
                fill={isParam(n.id) ? "#4dd6e80e" : n.id === "L" ? "#f4586e12" : "#111927"}
                stroke={isParam(n.id) ? "#4dd6e866" : n.id === "L" ? "#f4586e66" : "#314155"}
                strokeWidth={1.2}
              />
              <text x={n.x + BW / 2} y={n.y + 13} fill="#8b97a7" fontSize={9.5} fontFamily="var(--font-mono)" textAnchor="middle">{n.label}</text>
              <text x={n.x + BW / 2} y={n.y + 26} fill="#4dd6e8" fontSize={10.5} fontFamily="var(--font-mono)" textAnchor="middle">
                {vals[n.id].toFixed(3)}
              </text>
              <text x={n.x + BW / 2} y={n.y + 39} fill="#e8b34d" fontSize={9.5} fontFamily="var(--font-mono)" textAnchor="middle">
                ∇ {grads[n.id].toFixed(3)}
              </text>
            </g>
          ))}
          {/* loss sparkline */}
          {lossHist.length > 1 && (
            <g>
              <text x={26} y={296} fill="#5b6b7d" fontSize={9} fontFamily="var(--font-mono)">loss</text>
              <polyline
                points={lossHist.map((l, i) => `${60 + (i / 39) * 160},${312 - (l / maxHist) * 26}`).join(" ")}
                fill="none" stroke="#f2934d" strokeWidth={1.5}
              />
            </g>
          )}
        </svg>
      }
      controls={
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <Slider tex="w" value={w} min={-3} max={3} step={0.01} onChange={setW} />
            <Slider tex="b" value={b} min={-3} max={3} step={0.01} onChange={setB} />
            <Slider tex="x\ \text{(input)}" value={x} min={-2} max={2} step={0.01} onChange={setX} color="#8b97a7" />
            <Slider tex="y\ \text{(target)}" value={y} min={0} max={1} step={0.01} onChange={setY} color="#8b97a7" />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Slider tex="\eta" value={eta} min={0.05} max={2} step={0.05} onChange={setEta} color="#52d68a" />
            </div>
            <WBtn color="#52d68a" onClick={gstep}>step: θ ← θ − η∇L</WBtn>
          </div>
          <Readout
            items={[
              { label: "L", value: L.toFixed(4), color: "#f2934d" },
              { label: "∂L/∂w", value: dL_dw.toFixed(4), color: "#e8b34d" },
              { label: "∂L/∂b", value: dL_db.toFixed(4), color: "#e8b34d" },
            ]}
          />
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            Every amber number is a full chain-rule product, e.g.{" "}
            <Katex tex="\frac{\partial L}{\partial w}=\underbrace{2d}_{L\to d}\cdot\underbrace{1}_{d\to a}\cdot\underbrace{a(1-a)}_{a\to z}\cdot\underbrace{1}_{z\to u}\cdot\underbrace{x}_{u\to w}" />.
            Move a slider and watch gradients update; press <b>step</b> repeatedly: only the boxed
            parameters w, b move, and the loss sparkline falls. That loop <i>is</i> training.
          </div>
        </>
      }
    />
  );
}
