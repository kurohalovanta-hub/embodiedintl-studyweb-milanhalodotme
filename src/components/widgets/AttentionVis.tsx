"use client";

import { useRef, useState } from "react";
import { Katex } from "../ui";
import { Arrow, Axes, Handle, Mapper, Slider, WBtn, WidgetShell } from "./toolkit";

// Attention with nothing hidden: 4 tokens live as draggable 2-D embeddings,
// scores are literal dot products, softmax rows become the heatmap, and the
// selected token's output is the weighted blend of the others.

const LABELS = ["the", "robot", "grips", "mug"] as const;
const COLORS = ["#8b97a7", "#4dd6e8", "#e8b34d", "#e86ea4"];

export default function AttentionVis() {
  const [E, setE] = useState<[number, number][]>([
    [-1.6, 0.4],
    [1.3, 1.3],
    [0.9, -1.3],
    [1.6, 0.8],
  ]);
  const [tau, setTau] = useState(1);
  const [causal, setCausal] = useState(false);
  const [sel, setSel] = useState(3);
  const svgRef = useRef<SVGSVGElement>(null);
  const m = new Mapper({ w: 300, h: 260, xmin: -2.3, xmax: 2.3, ymin: -2, ymax: 2 });

  const scale = 1 / Math.sqrt(2); // 1/√d, d=2
  const scores = E.map((ei, i) =>
    E.map((ej, j) => {
      if (causal && j > i) return -Infinity;
      return ((ei[0] * ej[0] + ei[1] * ej[1]) * scale) / tau;
    }),
  );
  const W = scores.map((row) => {
    const mx = Math.max(...row.filter((v) => v > -Infinity));
    const ex = row.map((v) => (v === -Infinity ? 0 : Math.exp(v - mx)));
    const s = ex.reduce((a, b) => a + b, 0) || 1;
    return ex.map((e) => e / s);
  });
  const out: [number, number] = [
    W[sel].reduce((a, w, j) => a + w * E[j][0], 0),
    W[sel].reduce((a, w, j) => a + w * E[j][1], 0),
  ];

  const CELL = 40;
  const HX = 66, HY = 34;

  return (
    <WidgetShell
      wide
      canvas={
        <div className="grid gap-3 sm:grid-cols-2">
          <svg ref={svgRef} viewBox={`0 0 ${m.v.w} ${m.v.h}`} className="w-full touch-none select-none rounded-md border border-line bg-panel2/40">
            <Axes m={m} labels={false} />
            {/* output = weighted blend for selected token */}
            <Arrow m={m} from={[0, 0]} to={out} color="#52d68a" width={2.6} dash="6 4" label="out" />
            {E.map((e, i) => (
              <g key={i}>
                <Arrow m={m} from={[0, 0]} to={e} color={i === sel ? COLORS[i] : `${COLORS[i]}99`} width={i === sel ? 2.8 : 2} label={LABELS[i]} />
                <Handle m={m} at={e} color={COLORS[i]} r={6} svgRef={svgRef}
                  onDrag={(x, y) => setE((prev) => prev.map((v, k) => (k === i ? [Math.max(-2.2, Math.min(2.2, x)), Math.max(-1.9, Math.min(1.9, y))] as [number, number] : v)))} />
              </g>
            ))}
          </svg>
          <svg viewBox="0 0 300 260" className="w-full select-none rounded-md border border-line bg-panel2/40">
            <text x={HX + 2 * CELL} y={14} fill="#5b6b7d" fontSize={10} fontFamily="var(--font-mono)" textAnchor="middle">
              softmax(e·eᵀ/τ√d), keys →
            </text>
            {LABELS.map((l, j) => (
              <text key={l} x={HX + j * CELL + CELL / 2} y={28} fill={COLORS[j]} fontSize={9.5} fontFamily="var(--font-mono)" textAnchor="middle">{l}</text>
            ))}
            {LABELS.map((l, i) => (
              <text key={l} x={HX - 6} y={HY + i * CELL + CELL / 2 + 3} fill={i === sel ? COLORS[i] : "#5b6b7d"} fontSize={9.5}
                fontFamily="var(--font-mono)" textAnchor="end" style={{ cursor: "pointer" }} onClick={() => setSel(i)}>
                {i === sel ? "▸ " : ""}{l}
              </text>
            ))}
            {W.map((row, i) =>
              row.map((w, j) => {
                const masked = causal && j > i;
                return (
                  <g key={`${i}${j}`} style={{ cursor: "pointer" }} onClick={() => setSel(i)}>
                    <rect
                      x={HX + j * CELL + 1.5} y={HY + i * CELL + 1.5} width={CELL - 3} height={CELL - 3} rx={4}
                      fill={masked ? "#0d1420" : `rgba(77,214,232,${(0.08 + 0.85 * w).toFixed(3)})`}
                      stroke={i === sel ? "#4dd6e8aa" : "#1b2634"} strokeWidth={i === sel ? 1.4 : 1}
                    />
                    <text x={HX + j * CELL + CELL / 2} y={HY + i * CELL + CELL / 2 + 3.5}
                      fill={masked ? "#3d4a5c" : w > 0.45 ? "#08222a" : "#cfe6ec"} fontSize={9.5} fontFamily="var(--font-mono)" textAnchor="middle">
                      {masked ? "−∞" : w.toFixed(2)}
                    </text>
                  </g>
                );
              }),
            )}
            {/* mixing bars for the selected row */}
            <text x={HX - 6} y={HY + 4 * CELL + 26} fill="#5b6b7d" fontSize={9.5} fontFamily="var(--font-mono)" textAnchor="end">mix</text>
            {W[sel].map((w, j) => (
              <g key={j}>
                <rect x={HX + j * CELL + 4} y={HY + 4 * CELL + 34 - w * 22} width={CELL - 8} height={w * 22} fill={COLORS[j]} opacity={0.85} rx={2} />
                <rect x={HX + j * CELL + 4} y={HY + 4 * CELL + 12} width={CELL - 8} height={22} fill="none" stroke="#1b2634" rx={2} />
              </g>
            ))}
          </svg>
        </div>
      }
      controls={
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-2.5">
            <Slider tex="\tau\ \text{(temperature)}" value={tau} min={0.1} max={3} step={0.05} onChange={setTau} />
            <div className="flex gap-1.5">
              <WBtn active={causal} color="#e86ea4" onClick={() => setCausal(!causal)}>causal mask</WBtn>
              <WBtn onClick={() => setE([[-1.6, 0.4], [1.3, 1.3], [0.9, -1.3], [1.6, 0.8]])}>reset</WBtn>
            </div>
          </div>
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            <Katex tex="\mathrm{out}_i=\sum_j \mathrm{softmax}_j\!\left(\tfrac{e_i\cdot e_j}{\tau\sqrt d}\right) e_j" />.
            Drag <b>mug</b> toward <b>robot</b> and watch its row concentrate; the green <b>out</b> arrow
            slides toward whatever wins. Lower τ → nearly hard selection; raise τ → uniform blur. Here
            queries, keys and values are all the raw embedding; a real Transformer first maps them through
            learned <Katex tex="W_Q,W_K,W_V" />. That is the <i>only</i> difference.
          </div>
        </div>
      }
    />
  );
}
