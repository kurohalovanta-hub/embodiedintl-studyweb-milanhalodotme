"use client";

import { useState } from "react";
import { Katex } from "../ui";
import { Mapper, Readout, Slider, WBtn, WidgetShell } from "./toolkit";

// N(μ, σ²): shape vs parameters, σ-bands, and the law of large numbers
// via live sampling against the density curve.

const pdf = (x: number, mu: number, s: number) =>
  Math.exp(-((x - mu) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));

const randn = () => {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const BIN = 0.25;
const XMIN = -5;
const XMAX = 5;

export default function GaussianExplorer() {
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);
  const [samples, setSamples] = useState<number[]>([]);
  const m = new Mapper({ w: 460, h: 300, xmin: XMIN, xmax: XMAX, ymin: -0.06, ymax: 1.5 });

  const draw = () => setSamples((s) => [...s, ...Array.from({ length: 300 }, () => mu + sigma * randn())]);

  // density curve
  const curve: string[] = [];
  for (let x = XMIN; x <= XMAX; x += 0.04) curve.push(`${m.sx(x)},${m.sy(pdf(x, mu, sigma))}`);
  const band = (k: number) => {
    const pts: string[] = [`${m.sx(mu - k * sigma)},${m.sy(0)}`];
    for (let x = mu - k * sigma; x <= mu + k * sigma; x += 0.04) pts.push(`${m.sx(x)},${m.sy(pdf(x, mu, sigma))}`);
    pts.push(`${m.sx(mu + k * sigma)},${m.sy(0)}`);
    return pts.join(" ");
  };

  // histogram (density-normalized so it overlays the pdf honestly)
  const bins = new Map<number, number>();
  for (const s of samples) {
    const b = Math.floor((s - XMIN) / BIN);
    bins.set(b, (bins.get(b) ?? 0) + 1);
  }
  const n = samples.length;
  const sampleMean = n ? samples.reduce((a, b) => a + b, 0) / n : 0;
  const sampleStd = n > 1 ? Math.sqrt(samples.reduce((a, b) => a + (b - sampleMean) ** 2, 0) / (n - 1)) : 0;
  const within1 = n ? samples.filter((s) => Math.abs(s - mu) < sigma).length / n : 0;

  return (
    <WidgetShell
      canvas={
        <svg viewBox={`0 0 ${m.v.w} ${m.v.h}`} className="w-full touch-none select-none rounded-md">
          {/* baseline + ticks */}
          <line x1={0} y1={m.sy(0)} x2={m.v.w} y2={m.sy(0)} stroke="#314155" strokeWidth={1.4} />
          {[-4, -2, 0, 2, 4].map((x) => (
            <text key={x} x={m.sx(x)} y={m.sy(0) + 14} fill="#3d4a5c" fontSize={10} fontFamily="var(--font-mono)" textAnchor="middle">{x}</text>
          ))}
          {/* σ bands */}
          <polygon points={band(2)} fill="#4dd6e80e" />
          <polygon points={band(1)} fill="#4dd6e81c" />
          {/* histogram */}
          {n > 0 &&
            [...bins.entries()].map(([b, count]) => {
              const density = count / (n * BIN);
              const x0 = XMIN + b * BIN;
              return (
                <rect
                  key={b}
                  x={m.sx(x0) + 0.5}
                  y={m.sy(density)}
                  width={m.kx() * BIN - 1}
                  height={m.sy(0) - m.sy(density)}
                  fill="#e8b34d55"
                />
              );
            })}
          {/* pdf */}
          <polyline points={curve.join(" ")} fill="none" stroke="#4dd6e8" strokeWidth={2.2} />
          {/* μ and ±σ markers */}
          <line x1={m.sx(mu)} y1={m.sy(0)} x2={m.sx(mu)} y2={m.sy(pdf(mu, mu, sigma))} stroke="#4dd6e888" strokeWidth={1.2} strokeDasharray="4 3" />
          {[1, -1].map((k) => (
            <line key={k} x1={m.sx(mu + k * sigma)} y1={m.sy(0)} x2={m.sx(mu + k * sigma)} y2={m.sy(pdf(mu + k * sigma, mu, sigma))} stroke="#4dd6e844" strokeWidth={1} strokeDasharray="3 3" />
          ))}
          <text x={m.sx(mu)} y={m.sy(pdf(mu, mu, sigma)) - 8} fill="#4dd6e8" fontSize={11} fontFamily="var(--font-mono)" textAnchor="middle">μ</text>
        </svg>
      }
      controls={
        <>
          <Slider tex="\mu" value={mu} min={-3} max={3} step={0.05} onChange={setMu} />
          <Slider tex="\sigma" value={sigma} min={0.3} max={2.5} step={0.05} onChange={setSigma} color="#e8b34d" />
          <div className="flex gap-1.5">
            <WBtn color="#e8b34d" onClick={draw}>sample ×300</WBtn>
            <WBtn onClick={() => setSamples([])} disabled={!n}>clear</WBtn>
          </div>
          <Readout
            items={[
              { label: "n", value: n },
              { label: "sample mean", value: n ? sampleMean.toFixed(3) : "—", color: "#e8b34d" },
              { label: "sample std", value: n > 1 ? sampleStd.toFixed(3) : "—", color: "#e8b34d" },
              { label: "within ±1σ", value: n ? `${(within1 * 100).toFixed(1)}%` : "—", color: "#4dd6e8" },
            ]}
          />
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            <Katex tex="p(x)=\frac{1}{\sigma\sqrt{2\pi}}\,e^{-\frac{(x-\mu)^2}{2\sigma^2}}" block />
            The shaded band is <Katex tex="\mu\pm\sigma" />. It always holds ≈68.3% of the probability,
            no matter how you stretch σ. Sample repeatedly: the histogram converges to the curve, and
            the <b>within ±1σ</b> readout converges to 68.3%. Height is density, not probability.
            Only areas mean anything.
          </div>
        </>
      }
    />
  );
}
