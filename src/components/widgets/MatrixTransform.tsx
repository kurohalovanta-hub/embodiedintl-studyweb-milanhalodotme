"use client";

import { useMemo, useState } from "react";
import { Katex } from "../ui";
import type { WidgetProps } from "./registry";
import { Arrow, Axes, Mapper, Readout, Slider, WBtn, WidgetShell } from "./toolkit";

// A 2×2 matrix as a machine that moves space: morph the grid I → A,
// watch det scale area, reveal eigenvectors as the directions that don't turn.

const PRESETS: Record<string, [number, number, number, number]> = {
  identity: [1, 0, 0, 1],
  "rotate 45°": [0.71, -0.71, 0.71, 0.71],
  "scale 2×½": [2, 0, 0, 0.5],
  shear: [1, 1, 0, 1],
  reflect: [0, 1, 1, 0],
  singular: [1, 2, 0.5, 1],
};

function eig2(a: number, b: number, c: number, d: number) {
  // eigen of [[a,b],[c,d]] — real case only
  const tr = a + d;
  const det = a * d - b * c;
  const disc = (tr * tr) / 4 - det;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const l1 = tr / 2 + s;
  const l2 = tr / 2 - s;
  const vec = (l: number): [number, number] => {
    // (A - λI)v = 0
    if (Math.abs(b) > 1e-9) return norm2([b, l - a]);
    if (Math.abs(c) > 1e-9) return norm2([l - d, c]);
    return Math.abs(a - l) < 1e-9 ? [1, 0] : [0, 1];
  };
  return { l1, l2, v1: vec(l1), v2: vec(l2) };
}
const norm2 = (v: [number, number]): [number, number] => {
  const n = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / n, v[1] / n];
};

export default function MatrixTransform({ params }: WidgetProps) {
  const showEigen = params?.eigen !== false;
  const [A, setA] = useState<[number, number, number, number]>([1.5, 0.5, 0.3, 1]);
  const [t, setT] = useState(1); // morph I → A
  const [eigenOn, setEigenOn] = useState(false);
  const m = new Mapper({ w: 460, h: 340, xmin: -4.6, xmax: 4.6, ymin: -3.4, ymax: 3.4 });

  const [a, b, c, d] = A;
  // interpolated map M(t) = (1-t) I + t A
  const M = useMemo<[number, number, number, number]>(
    () => [1 + (a - 1) * t, b * t, c * t, d * t],
    [a, b, c, d, t],
  );
  const ap = (x: number, y: number): [number, number] => [M[0] * x + M[1] * y, M[2] * x + M[3] * y];
  const det = a * d - b * c;
  const detT = M[0] * M[3] - M[1] * M[2];
  const eig = useMemo(() => eig2(a, b, c, d), [a, b, c, d]);

  const gridLines = useMemo(() => {
    const lines: [number, number][][] = [];
    for (let x = -4; x <= 4; x++) {
      const pts: [number, number][] = [];
      for (let y = -4; y <= 4; y += 0.25) pts.push(ap(x, y));
      lines.push(pts);
    }
    for (let y = -4; y <= 4; y++) {
      const pts: [number, number][] = [];
      for (let x = -4; x <= 4; x += 0.25) pts.push(ap(x, y));
      lines.push(pts);
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [M]);

  const unitSquare: [number, number][] = [ap(0, 0), ap(1, 0), ap(1, 1), ap(0, 1)];

  return (
    <WidgetShell
      canvas={
        <svg viewBox={`0 0 ${m.v.w} ${m.v.h}`} className="w-full touch-none select-none rounded-md">
          <Axes m={m} labels={false} />
          {gridLines.map((pts, i) => (
            <polyline
              key={i}
              points={pts.map(([x, y]) => `${m.sx(x)},${m.sy(y)}`).join(" ")}
              fill="none"
              stroke="#2a4a5a55"
              strokeWidth={1}
            />
          ))}
          {/* unit square image */}
          <polygon
            points={unitSquare.map(([x, y]) => `${m.sx(x)},${m.sy(y)}`).join(" ")}
            fill={detT >= 0 ? "#4dd6e81e" : "#f4586e1e"}
            stroke={detT >= 0 ? "#4dd6e8" : "#f4586e"}
            strokeWidth={1.5}
          />
          {/* basis vectors */}
          <Arrow m={m} from={[0, 0]} to={ap(1, 0)} color="#4dd6e8" label="î→" />
          <Arrow m={m} from={[0, 0]} to={ap(0, 1)} color="#e8b34d" label="ĵ→" />
          {/* eigenvectors */}
          {eigenOn && eig && (
            <>
              {[{ v: eig.v1, l: eig.l1 }, { v: eig.v2, l: eig.l2 }].map(({ v, l }, i) => (
                <g key={i}>
                  <line
                    x1={m.sx(-4 * v[0])} y1={m.sy(-4 * v[1])} x2={m.sx(4 * v[0])} y2={m.sy(4 * v[1])}
                    stroke="#e86ea466" strokeWidth={1} strokeDasharray="5 4"
                  />
                  <Arrow m={m} from={[0, 0]} to={[v[0] * l * t + v[0] * (1 - t), v[1] * l * t + v[1] * (1 - t)]} color="#e86ea4" width={2.6}
                    label={i === 0 ? `λ=${l.toFixed(2)}` : `λ=${eig.l2.toFixed(2)}`} />
                </g>
              ))}
            </>
          )}
        </svg>
      }
      controls={
        <>
          <div className="rounded-md border border-line bg-panel2/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Katex tex={`A=\\begin{bmatrix}${a.toFixed(1)} & ${b.toFixed(1)}\\\\ ${c.toFixed(1)} & ${d.toFixed(1)}\\end{bmatrix}`} />
              <Readout items={[{ label: "det A", value: det.toFixed(2), color: Math.abs(det) < 0.05 ? "#f4586e" : "#52d68a" }]} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <Slider label="a₁₁" value={a} min={-2} max={2} step={0.1} onChange={(v) => setA([v, b, c, d])} />
              <Slider label="a₁₂" value={b} min={-2} max={2} step={0.1} onChange={(v) => setA([a, v, c, d])} color="#e8b34d" />
              <Slider label="a₂₁" value={c} min={-2} max={2} step={0.1} onChange={(v) => setA([a, b, v, d])} color="#e8b34d" />
              <Slider label="a₂₂" value={d} min={-2} max={2} step={0.1} onChange={(v) => setA([a, b, c, v])} />
            </div>
          </div>
          <Slider label="morph  I → A" value={t} min={0} max={1} step={0.01} onChange={setT} color="#a78bfa" />
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PRESETS).map(([name, mat]) => (
              <WBtn key={name} onClick={() => { setA(mat); setT(1); }}>{name}</WBtn>
            ))}
            {showEigen && (
              <WBtn active={eigenOn} color="#e86ea4" onClick={() => setEigenOn(!eigenOn)}>
                eigenvectors
              </WBtn>
            )}
          </div>
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            The columns of <Katex tex="A" /> are where <Katex tex="\hat{\imath}" /> and <Katex tex="\hat{\jmath}" /> land.
            The shaded square&apos;s area is <Katex tex="|\det A|" />. Drag toward <b>singular</b> and watch space flatten.
            {eigenOn && eig && " Eigenvector directions (pink) don't rotate. They only stretch by λ."}
            {eigenOn && !eig && " No real eigenvectors here. This map rotates every direction (complex eigenvalues)."}
          </div>
        </>
      }
    />
  );
}
