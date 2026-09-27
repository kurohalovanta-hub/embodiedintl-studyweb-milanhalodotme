"use client";

import { useRef, useState } from "react";
import { Katex } from "../ui";
import type { WidgetProps } from "./registry";
import { Handle, Mapper, Readout, Slider, WBtn, WidgetShell, useRaf } from "./toolkit";

// A planar arm you can actually reason with: FK (forward map), IK (live
// damped-least-squares iterations toward a draggable target), and the
// Jacobian (columns as per-joint velocity arrows + manipulability ellipse).

const LINKS2 = [1.3, 1.0];
const LINKS3 = [1.15, 0.95, 0.62];

function fk(links: number[], th: number[]) {
  const pts: [number, number][] = [[0, 0]];
  const phis: number[] = [];
  let phi = 0;
  for (let i = 0; i < links.length; i++) {
    phi += th[i];
    phis.push(phi);
    const [px, py] = pts[i];
    pts.push([px + links[i] * Math.cos(phi), py + links[i] * Math.sin(phi)]);
  }
  return { pts, phis };
}
function jacobian(links: number[], phis: number[]) {
  // column i = [−Σ_{k≥i} l_k sin φ_k, Σ_{k≥i} l_k cos φ_k]
  const n = links.length;
  const cols: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    let sx = 0, sy = 0;
    for (let k = i; k < n; k++) {
      sx -= links[k] * Math.sin(phis[k]);
      sy += links[k] * Math.cos(phis[k]);
    }
    cols.push([sx, sy]);
  }
  return cols;
}

const JCOLORS = ["#4dd6e8", "#e8b34d", "#e86ea4"];

export default function PlanarArm({ params }: WidgetProps) {
  const initialMode = (params?.mode as "fk" | "ik" | "jac") ?? "fk";
  const [mode, setMode] = useState<"fk" | "ik" | "jac">(initialMode);
  const [nLinks, setNLinks] = useState<2 | 3>(2);
  const [th, setTh] = useState<number[]>([0.7, 0.6, 0.4]);
  const [target, setTarget] = useState<[number, number]>([1.5, 1.2]);
  const [lambda, setLambda] = useState(0.12);
  const svgRef = useRef<SVGSVGElement>(null);
  const m = new Mapper({ w: 460, h: 360, xmin: -2.9, xmax: 2.9, ymin: -2.2, ymax: 2.35 });

  const links = nLinks === 2 ? LINKS2 : LINKS3;
  const thetas = th.slice(0, nLinks);
  const { pts, phis } = fk(links, thetas);
  const ee = pts[pts.length - 1];
  const J = jacobian(links, phis);
  const reach = links.reduce((a, b) => a + b, 0);

  const err: [number, number] = [target[0] - ee[0], target[1] - ee[1]];
  const errNorm = Math.hypot(err[0], err[1]);

  // DLS: Δθ = Jᵀ (JJᵀ + λ²I)⁻¹ e  — animated while in IK mode
  useRaf(() => {
    if (errNorm < 0.004) return;
    setTh((prev) => {
      const t = prev.slice(0, nLinks);
      const { phis: ph, pts: p } = fk(links, t);
      const Jc = jacobian(links, ph);
      const e: [number, number] = [target[0] - p[p.length - 1][0], target[1] - p[p.length - 1][1]];
      // JJᵀ (2×2)
      let a = 0, b = 0, d = 0;
      for (const [cx, cy] of Jc) {
        a += cx * cx;
        b += cx * cy;
        d += cy * cy;
      }
      a += lambda * lambda;
      d += lambda * lambda;
      const det = a * d - b * b;
      if (Math.abs(det) < 1e-12) return prev;
      const ix = (d * e[0] - b * e[1]) / det;
      const iy = (-b * e[0] + a * e[1]) / det;
      const next = [...prev];
      for (let i = 0; i < nLinks; i++) {
        const dth = 0.35 * (Jc[i][0] * ix + Jc[i][1] * iy);
        next[i] = prev[i] + Math.max(-0.12, Math.min(0.12, dth));
      }
      return next;
    });
  }, mode === "ik");

  // manipulability ellipse from JJᵀ eigen-decomposition
  let a0 = 0, b0 = 0, d0 = 0;
  for (const [cx, cy] of J) {
    a0 += cx * cx;
    b0 += cx * cy;
    d0 += cy * cy;
  }
  const tr = a0 + d0;
  const det0 = a0 * d0 - b0 * b0;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det0));
  const lam1 = tr / 2 + disc;
  const lam2 = Math.max(0, tr / 2 - disc);
  const s1 = Math.sqrt(lam1);
  const s2 = Math.sqrt(lam2);
  const u1: [number, number] =
    Math.abs(b0) > 1e-9 ? [b0, lam1 - a0] : a0 >= d0 ? [1, 0] : [0, 1];
  const u1n = Math.hypot(u1[0], u1[1]) || 1;
  const ellAngle = (Math.atan2(u1[1] / u1n, u1[0] / u1n) * 180) / Math.PI;
  const manip = Math.sqrt(Math.max(0, det0));
  const nearSingular = s1 > 1e-6 && s2 / s1 < 0.09;

  const setJoint = (i: number, v: number) => setTh((p) => p.map((x, k) => (k === i ? v : x)));

  return (
    <WidgetShell
      canvas={
        <svg ref={svgRef} viewBox={`0 0 ${m.v.w} ${m.v.h}`} className="w-full touch-none select-none rounded-md">
          {/* reach boundary */}
          <circle cx={m.sx(0)} cy={m.sy(0)} r={m.kx() * reach} fill="none" stroke="#31415566" strokeWidth={1} strokeDasharray="4 5" />
          {/* base */}
          <rect x={m.sx(0) - 13} y={m.sy(0) - 4} width={26} height={16} rx={3} fill="#1b2634" stroke="#314155" />
          {/* manipulability ellipse */}
          {mode === "jac" && s1 > 1e-6 && (
            <g transform={`translate(${m.sx(ee[0])},${m.sy(ee[1])}) rotate(${-ellAngle})`}>
              <ellipse cx={0} cy={0} rx={m.kx() * s1 * 0.55} ry={m.kx() * s2 * 0.55}
                fill={nearSingular ? "#f4586e14" : "#52d68a12"} stroke={nearSingular ? "#f4586e" : "#52d68a"} strokeWidth={1.5} />
            </g>
          )}
          {/* Jacobian columns as velocity arrows at EE */}
          {mode === "jac" &&
            J.map((col, i) => {
              const tip: [number, number] = [ee[0] + col[0] * 0.55, ee[1] + col[1] * 0.55];
              return (
                <g key={i}>
                  <line x1={m.sx(ee[0])} y1={m.sy(ee[1])} x2={m.sx(tip[0])} y2={m.sy(tip[1])} stroke={JCOLORS[i]} strokeWidth={2.4} />
                  <circle cx={m.sx(tip[0])} cy={m.sy(tip[1])} r={3} fill={JCOLORS[i]} />
                  <text x={m.sx(tip[0]) + 8} y={m.sy(tip[1])} fill={JCOLORS[i]} fontSize={11} fontFamily="var(--font-mono)">J·e{i + 1}</text>
                </g>
              );
            })}
          {/* arm */}
          {pts.slice(0, -1).map(([x, y], i) => {
            const [nx, ny] = pts[i + 1];
            return (
              <g key={i}>
                <line x1={m.sx(x)} y1={m.sy(y)} x2={m.sx(nx)} y2={m.sy(ny)} stroke="#8fa3b8" strokeWidth={7} strokeLinecap="round" />
                <line x1={m.sx(x)} y1={m.sy(y)} x2={m.sx(nx)} y2={m.sy(ny)} stroke="#c8d6e5" strokeWidth={2.5} strokeLinecap="round" />
              </g>
            );
          })}
          {pts.map(([x, y], i) => (
            <circle key={i} cx={m.sx(x)} cy={m.sy(y)} r={i === 0 ? 6 : i === pts.length - 1 ? 5 : 5.5}
              fill={i === pts.length - 1 ? "#4dd6e8" : "#22303f"} stroke={i === pts.length - 1 ? "#0a0e14" : "#5b6b7d"} strokeWidth={1.6} />
          ))}
          {/* target */}
          {mode === "ik" && (
            <>
              <line x1={m.sx(ee[0])} y1={m.sy(ee[1])} x2={m.sx(target[0])} y2={m.sy(target[1])} stroke="#f2934d55" strokeWidth={1.2} strokeDasharray="3 3" />
              <g>
                <circle cx={m.sx(target[0])} cy={m.sy(target[1])} r={8} fill="none" stroke="#f2934d" strokeWidth={1.6} />
                <circle cx={m.sx(target[0])} cy={m.sy(target[1])} r={2.2} fill="#f2934d" />
              </g>
              <Handle m={m} at={target} color="#f2934d00" r={10} svgRef={svgRef} onDrag={(x, y) => setTarget([x, y])} />
            </>
          )}
        </svg>
      }
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            <WBtn active={mode === "fk"} onClick={() => setMode("fk")}>FK</WBtn>
            <WBtn active={mode === "ik"} color="#f2934d" onClick={() => setMode("ik")}>IK (DLS)</WBtn>
            <WBtn active={mode === "jac"} color="#52d68a" onClick={() => setMode("jac")}>Jacobian</WBtn>
            <span className="mx-1 border-l border-line" />
            <WBtn active={nLinks === 2} onClick={() => setNLinks(2)}>2-link</WBtn>
            <WBtn active={nLinks === 3} onClick={() => setNLinks(3)}>3-link</WBtn>
          </div>
          {(mode === "fk" || mode === "jac") &&
            thetas.map((t, i) => (
              <Slider key={i} tex={`\\theta_{${i + 1}}`} value={t} min={-Math.PI} max={Math.PI} step={0.01}
                onChange={(v) => setJoint(i, v)} color={JCOLORS[i]} fmt={(v) => `${((v * 180) / Math.PI).toFixed(0)}°`} />
            ))}
          {mode === "ik" && (
            <Slider tex="\lambda\ \text{(damping)}" value={lambda} min={0.01} max={0.8} step={0.01} onChange={setLambda} color="#f2934d" />
          )}
          <Readout
            items={[
              { label: "EE", value: `(${ee[0].toFixed(2)}, ${ee[1].toFixed(2)})`, color: "#4dd6e8" },
              ...(mode === "ik"
                ? [{ label: "‖error‖", value: errNorm.toFixed(3), color: errNorm < 0.01 ? "#52d68a" : "#f2934d" }]
                : []),
              ...(mode === "jac"
                ? [
                    { label: "σ₁", value: s1.toFixed(2), color: "#52d68a" },
                    { label: "σ₂", value: s2.toFixed(2), color: nearSingular ? "#f4586e" : "#52d68a" },
                    { label: "manipulability √det JJᵀ", value: manip.toFixed(3), color: nearSingular ? "#f4586e" : "#52d68a" },
                  ]
                : []),
            ]}
          />
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            {mode === "fk" && (
              <>
                Forward kinematics is accumulated rotation: joint i turns everything after it.{" "}
                <Katex tex="p_{ee}=\sum_i \ell_i\,[\cos\phi_i,\ \sin\phi_i],\ \ \phi_i=\theta_1+\cdots+\theta_i" />:
                a unique pose for every θ. The dashed circle is the reachable workspace boundary.
              </>
            )}
            {mode === "ik" && (
              <>
                Drag the target. Each frame runs one damped-least-squares update{" "}
                <Katex tex="\Delta\theta=J^\top(JJ^\top+\lambda^2 I)^{-1}e" />. Put the target near the
                boundary with λ small: joints thrash near the singularity. Raise λ: motion calms but
                converges slower. Outside the circle the arm points at the unreachable target, the
                least-squares answer.
              </>
            )}
            {mode === "jac" && (
              <>
                Each colored arrow is a <i>column</i> of J: where the end-effector goes if only that joint
                moves at 1 rad/s. The ellipse is every velocity reachable with ‖θ̇‖=1 (axes = singular
                values). Straighten the arm: the ellipse collapses to a line (σ₂→0), and no joint motion
                can move the hand along the lost direction. That is a singularity, seen rather than defined.
              </>
            )}
          </div>
        </>
      }
    />
  );
}
