"use client";

import { useState } from "react";
import { Katex } from "../ui";
import { Readout, Slider, WBtn, WidgetShell } from "./toolkit";

// 3-D orientation with the quaternion as ground truth. Parameterize it by
// axis-angle or Euler ZYX, watch a body triad + cube; walk into gimbal lock
// and see two Euler axes collapse onto each other.

type Q = [number, number, number, number]; // w x y z
type V3 = [number, number, number];

const qMul = (a: Q, b: Q): Q => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];
const qAxis = (axis: V3, ang: number): Q => {
  const n = Math.hypot(...axis) || 1;
  const s = Math.sin(ang / 2);
  return [Math.cos(ang / 2), (axis[0] / n) * s, (axis[1] / n) * s, (axis[2] / n) * s];
};
const qRot = (q: Q, v: V3): V3 => {
  // v' = q v q*
  const [w, x, y, z] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
};

// fixed viewing rotation (isometric-ish), then orthographic drop of z
const VIEW: Q = qMul(qAxis([1, 0, 0], -0.42), qAxis([0, 1, 0], 0.52));
const project = (v: V3) => {
  const p = qRot(VIEW, v);
  return { x: 230 + p[0] * 92, y: 165 - p[1] * 92, z: p[2] };
};

const CUBE: V3[] = [];
for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) CUBE.push([0.62 * sx, 0.62 * sy, 0.62 * sz]);
const CUBE_EDGES: [number, number][] = [];
for (let i = 0; i < 8; i++)
  for (let j = i + 1; j < 8; j++) {
    let diff = 0;
    for (let k = 0; k < 3; k++) if (CUBE[i][k] !== CUBE[j][k]) diff++;
    if (diff === 1) CUBE_EDGES.push([i, j]);
  }

export default function SO3Explorer() {
  const [mode, setMode] = useState<"axis" | "euler">("axis");
  // axis-angle params
  const [az, setAz] = useState(0.8); // azimuth of axis
  const [el, setEl] = useState(0.5); // elevation
  const [ang, setAng] = useState(1.0);
  // euler ZYX params
  const [yaw, setYaw] = useState(0.5);
  const [pitch, setPitch] = useState(0.3);
  const [roll, setRoll] = useState(0.2);
  const [negate, setNegate] = useState(false);

  const axis: V3 = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  let q: Q =
    mode === "axis"
      ? qAxis(axis, ang)
      : qMul(qAxis([0, 0, 1], yaw), qMul(qAxis([0, 1, 0], pitch), qAxis([1, 0, 0], roll)));
  if (negate) q = [-q[0], -q[1], -q[2], -q[3]];

  const ex = qRot(q, [1.15, 0, 0]);
  const ey = qRot(q, [0, 1.15, 0]);
  const ez = qRot(q, [0, 0, 1.15]);
  const cube = CUBE.map((v) => project(qRot(q, v)));

  // Euler elemental axes (world z; x after yaw·pitch)
  const yawAxis: V3 = [0, 0, 1];
  const rollAxis = qRot(qMul(qAxis([0, 0, 1], yaw), qAxis([0, 1, 0], pitch)), [1, 0, 0]);
  const locked = mode === "euler" && Math.abs(Math.cos(pitch)) < 0.12;
  const alignment = Math.abs(yawAxis[0] * rollAxis[0] + yawAxis[1] * rollAxis[1] + yawAxis[2] * rollAxis[2]);

  const triad = (v: V3, color: string, label: string) => {
    const o = project([0, 0, 0]);
    const p = project(v);
    const op = 0.55 + 0.45 * Math.max(0, Math.min(1, (p.z + 1.3) / 2.6));
    return (
      <g opacity={op}>
        <line x1={o.x} y1={o.y} x2={p.x} y2={p.y} stroke={color} strokeWidth={2.6} />
        <circle cx={p.x} cy={p.y} r={3.4} fill={color} />
        <text x={p.x + 9} y={p.y + 3} fill={color} fontSize={12} fontFamily="var(--font-mono)" fontWeight={700}>{label}</text>
      </g>
    );
  };
  const axisLine = (v: V3, color: string, label: string) => {
    const a = project([-1.7 * v[0], -1.7 * v[1], -1.7 * v[2]]);
    const b = project([1.7 * v[0], 1.7 * v[1], 1.7 * v[2]]);
    return (
      <g>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={locked ? 2.2 : 1.2} strokeDasharray="6 4" opacity={0.8} />
        <text x={b.x + 4} y={b.y} fill={color} fontSize={10} fontFamily="var(--font-mono)">{label}</text>
      </g>
    );
  };

  return (
    <WidgetShell
      canvas={
        <svg viewBox="0 0 460 330" className="w-full touch-none select-none rounded-md">
          {/* faint world triad */}
          {([[1.4, 0, 0], [0, 1.4, 0], [0, 0, 1.4]] as V3[]).map((v, i) => {
            const o = project([0, 0, 0]);
            const p = project(v);
            return (
              <g key={i} opacity={0.32}>
                <line x1={o.x} y1={o.y} x2={p.x} y2={p.y} stroke="#5b6b7d" strokeWidth={1.2} />
                <text x={p.x + 5} y={p.y} fill="#5b6b7d" fontSize={9.5} fontFamily="var(--font-mono)">{["xᵂ", "yᵂ", "zᵂ"][i]}</text>
              </g>
            );
          })}
          {/* cube wireframe */}
          {CUBE_EDGES.map(([i, j], k) => {
            const zAvg = (cube[i].z + cube[j].z) / 2;
            return (
              <line key={k} x1={cube[i].x} y1={cube[i].y} x2={cube[j].x} y2={cube[j].y}
                stroke="#4dd6e8" strokeWidth={1.1} opacity={0.2 + 0.4 * Math.max(0, Math.min(1, (zAvg + 1.3) / 2.6))} />
            );
          })}
          {/* rotation axis (axis-angle mode) */}
          {mode === "axis" && axisLine(axis, "#e86ea4", "n̂")}
          {/* euler elemental axes */}
          {mode === "euler" && (
            <>
              {axisLine(yawAxis, locked ? "#f4586e" : "#a78bfa", "yaw z")}
              {axisLine(rollAxis, locked ? "#f4586e" : "#f2934d", "roll x″")}
            </>
          )}
          {triad(ex, "#4dd6e8", "xᴮ")}
          {triad(ey, "#e8b34d", "yᴮ")}
          {triad(ez, "#e86ea4", "zᴮ")}
          {locked && (
            <text x={230} y={318} fill="#f4586e" fontSize={11.5} fontFamily="var(--font-mono)" textAnchor="middle" fontWeight={700}>
              GIMBAL LOCK: yaw and roll axes aligned (|cos| = {alignment.toFixed(2)}) · one DOF lost
            </text>
          )}
        </svg>
      }
      controls={
        <>
          <div className="flex gap-1.5">
            <WBtn active={mode === "axis"} onClick={() => setMode("axis")}>axis–angle</WBtn>
            <WBtn active={mode === "euler"} color="#a78bfa" onClick={() => setMode("euler")}>Euler ZYX</WBtn>
          </div>
          {mode === "axis" ? (
            <>
              <Slider tex="\theta\ \text{(angle)}" value={ang} min={-Math.PI} max={Math.PI} step={0.01} onChange={setAng} fmt={(v) => `${((v * 180) / Math.PI).toFixed(0)}°`} />
              <Slider tex="\text{axis azimuth}" value={az} min={-Math.PI} max={Math.PI} step={0.01} onChange={setAz} color="#e86ea4" fmt={(v) => `${((v * 180) / Math.PI).toFixed(0)}°`} />
              <Slider tex="\text{axis elevation}" value={el} min={-1.4} max={1.4} step={0.01} onChange={setEl} color="#e86ea4" fmt={(v) => `${((v * 180) / Math.PI).toFixed(0)}°`} />
            </>
          ) : (
            <>
              <Slider tex="\alpha\ \text{(yaw, about }z\text{)}" value={yaw} min={-Math.PI} max={Math.PI} step={0.01} onChange={setYaw} color="#a78bfa" fmt={(v) => `${((v * 180) / Math.PI).toFixed(0)}°`} />
              <Slider tex="\beta\ \text{(pitch, about }y'\text{)}" value={pitch} min={-Math.PI / 2} max={Math.PI / 2} step={0.01} onChange={setPitch} color="#e8b34d" fmt={(v) => `${((v * 180) / Math.PI).toFixed(0)}°`} />
              <Slider tex="\gamma\ \text{(roll, about }x''\text{)}" value={roll} min={-Math.PI} max={Math.PI} step={0.01} onChange={setRoll} color="#f2934d" fmt={(v) => `${((v * 180) / Math.PI).toFixed(0)}°`} />
            </>
          )}
          <div className="flex items-center gap-2">
            <WBtn color="#e86ea4" active={negate} onClick={() => setNegate(!negate)}>q → −q</WBtn>
            <span className="font-mono text-[11px] text-faint">orientation unchanged (double cover)</span>
          </div>
          <Readout
            items={[
              { label: "q", value: `[${q.map((v) => v.toFixed(2)).join(", ")}]`, color: "#4dd6e8" },
              { label: "‖q‖", value: Math.hypot(...q).toFixed(3) },
            ]}
          />
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            {mode === "axis" ? (
              <>
                <Katex tex="q=\left(\cos\tfrac\theta2,\ \hat n\sin\tfrac\theta2\right)" />: every rotation
                is one turn about one axis (Euler&apos;s theorem). Press <b>q → −q</b>: all four numbers flip,
                the cube doesn&apos;t move. Two quaternions per orientation, which is why training targets use geodesic
                distance, not quaternion subtraction.
              </>
            ) : (
              <>
                Drag <span className="text-acc-math">β to ±90°</span>: the purple yaw axis and orange roll
                axis fall on top of each other, so α and γ now spin the body the same way: a whole DOF
                gone. This is why flight software and robot arms carry quaternions internally and use Euler
                angles only at the UI boundary.
              </>
            )}
          </div>
        </>
      }
    />
  );
}
