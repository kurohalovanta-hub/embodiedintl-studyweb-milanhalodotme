"use client";

import { useState } from "react";
import { Katex } from "../ui";
import { Axes, Mapper, Readout, Slider, WBtn, WidgetShell, useRaf } from "./toolkit";

// The derivative as the limit of secant slopes: pick f, drag x₀, shrink h,
// watch the secant line rotate into the tangent.

type Fn = { name: string; tex: string; f: (x: number) => number; df: (x: number) => number };
const FNS: Fn[] = [
  { name: "x²", tex: "f(x)=x^2", f: (x) => x * x, df: (x) => 2 * x },
  { name: "sin x", tex: "f(x)=\\sin x", f: Math.sin, df: Math.cos },
  { name: "x³−2x", tex: "f(x)=x^3-2x", f: (x) => x ** 3 - 2 * x, df: (x) => 3 * x * x - 2 },
  { name: "eˣᐟ²", tex: "f(x)=e^{x/2}", f: (x) => Math.exp(x / 2), df: (x) => 0.5 * Math.exp(x / 2) },
];

export default function DerivativeExplorer() {
  const [fi, setFi] = useState(0);
  const [x0, setX0] = useState(0.8);
  const [h, setH] = useState(1.6);
  const [shrinking, setShrinking] = useState(false);
  const { f, df } = FNS[fi];
  const m = new Mapper({ w: 460, h: 340, xmin: -3.4, xmax: 3.4, ymin: -3, ymax: 4.2 });

  useRaf((dt) => {
    setH((prev) => {
      const next = prev * Math.exp(-2.6 * dt);
      if (next <= 0.012) {
        setShrinking(false);
        return 0.01;
      }
      return next;
    });
  }, shrinking);

  const secant = h > 1e-9 ? (f(x0 + h) - f(x0)) / h : df(x0);
  const tangent = df(x0);

  // sample the curve
  const pts: string[] = [];
  for (let x = m.v.xmin; x <= m.v.xmax; x += 0.03) {
    const y = f(x);
    if (y > m.v.ymin - 2 && y < m.v.ymax + 2) pts.push(`${m.sx(x)},${m.sy(y)}`);
  }
  const line = (slope: number) => {
    const y = (x: number) => f(x0) + slope * (x - x0);
    return { x1: m.sx(m.v.xmin), y1: m.sy(y(m.v.xmin)), x2: m.sx(m.v.xmax), y2: m.sy(y(m.v.xmax)) };
  };
  const sec = line(secant);
  const tan = line(tangent);

  return (
    <WidgetShell
      canvas={
        <svg viewBox={`0 0 ${m.v.w} ${m.v.h}`} className="w-full touch-none select-none rounded-md">
          <Axes m={m} />
          <polyline points={pts.join(" ")} fill="none" stroke="#8b97a7" strokeWidth={2} />
          {/* tangent (truth) */}
          <line {...tan} stroke="#52d68a88" strokeWidth={1.6} strokeDasharray="6 5" />
          {/* secant */}
          <line {...sec} stroke="#e8b34d" strokeWidth={2} />
          {/* rise/run triangle */}
          <path
            d={`M ${m.sx(x0)} ${m.sy(f(x0))} L ${m.sx(x0 + h)} ${m.sy(f(x0))} L ${m.sx(x0 + h)} ${m.sy(f(x0 + h))}`}
            fill="none" stroke="#e8b34d66" strokeWidth={1.2}
          />
          <circle cx={m.sx(x0)} cy={m.sy(f(x0))} r={5.5} fill="#4dd6e8" stroke="#0a0e14" strokeWidth={1.6} />
          <circle cx={m.sx(x0 + h)} cy={m.sy(f(x0 + h))} r={5} fill="#e8b34d" stroke="#0a0e14" strokeWidth={1.6} />
          <text x={m.sx(x0)} y={m.sy(f(x0)) + 18} fill="#4dd6e8" fontSize={11} fontFamily="var(--font-mono)" textAnchor="middle">x₀</text>
          <text x={m.sx(x0 + h)} y={m.sy(f(x0 + h)) - 10} fill="#e8b34d" fontSize={11} fontFamily="var(--font-mono)" textAnchor="middle">x₀+h</text>
        </svg>
      }
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            {FNS.map((fn, i) => (
              <WBtn key={fn.name} active={fi === i} onClick={() => { setFi(i); setShrinking(false); setH(1.6); }}>
                {fn.name}
              </WBtn>
            ))}
          </div>
          <Slider tex="x_0" value={x0} min={-2.4} max={2.4} step={0.05} onChange={setX0} />
          <Slider tex="h" value={h} min={0.01} max={2} step={0.01} onChange={(v) => { setShrinking(false); setH(v); }} color="#e8b34d" fmt={(v) => v.toFixed(2)} />
          <div className="flex gap-1.5">
            <WBtn color="#52d68a" active={shrinking} onClick={() => setShrinking(!shrinking)}>
              {shrinking ? "shrinking…" : "let h → 0"}
            </WBtn>
            <WBtn onClick={() => { setShrinking(false); setH(1.6); }}>reset h</WBtn>
          </div>
          <Readout
            items={[
              { label: "secant (f(x₀+h)−f(x₀))/h", value: secant.toFixed(4), color: "#e8b34d" },
              { label: "true f′(x₀)", value: tangent.toFixed(4), color: "#52d68a" },
              { label: "gap", value: Math.abs(secant - tangent).toFixed(4), color: Math.abs(secant - tangent) < 0.01 ? "#52d68a" : "#8b97a7" },
            ]}
          />
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            <Katex tex="f'(x_0)=\lim_{h\to 0}\frac{f(x_0+h)-f(x_0)}{h}" block />
            The amber secant is the average rate over <Katex tex="[x_0,x_0+h]" />. Press{" "}
            <span className="text-acc2">let h → 0</span> and watch it rotate onto the green tangent.
            The gap readout is the limit happening numerically.
          </div>
        </>
      }
    />
  );
}
