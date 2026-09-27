"use client";

import { useRef, useState } from "react";
import { Katex } from "../ui";
import { Arrow, Axes, Handle, Mapper, Readout, Slider, WBtn, WidgetShell } from "./toolkit";

// One matrix, two meanings: rotate the frame (passive — re-express the same
// point) vs rotate the point (active). The classic robotics confusion, live.

export default function Rotation2D() {
  const [th, setTh] = useState(0.6);
  const [p, setP] = useState<[number, number]>([2, 1]);
  const [mode, setMode] = useState<"frame" | "point">("frame");
  const svgRef = useRef<SVGSVGElement>(null);
  const m = new Mapper({ w: 460, h: 340, xmin: -3.9, xmax: 3.9, ymin: -2.9, ymax: 2.9 });

  const c = Math.cos(th);
  const s = Math.sin(th);
  // body-frame axes expressed in world
  const bx: [number, number] = [c, s];
  const by: [number, number] = [-s, c];
  // passive: same point, body coordinates  ᴮp = R(θ)ᵀ ᵂp
  const pB: [number, number] = [c * p[0] + s * p[1], -s * p[0] + c * p[1]];
  // active: rotated point  p′ = R(θ) p
  const pRot: [number, number] = [c * p[0] - s * p[1], s * p[0] + c * p[1]];

  const snap = (v: number) => Math.round(v * 10) / 10;
  const deg = ((th * 180) / Math.PI).toFixed(0);

  // arc for the active rotation
  const r0 = Math.hypot(p[0], p[1]);
  const a0 = Math.atan2(p[1], p[0]);
  const arc = (() => {
    if (mode !== "point" || r0 < 0.1) return null;
    const steps = 24;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (th * i) / steps;
      pts.push(`${m.sx(r0 * Math.cos(a))},${m.sy(r0 * Math.sin(a))}`);
    }
    return pts.join(" ");
  })();

  return (
    <WidgetShell
      canvas={
        <svg ref={svgRef} viewBox={`0 0 ${m.v.w} ${m.v.h}`} className="w-full touch-none select-none rounded-md">
          <Axes m={m} labels={false} />
          {/* world frame */}
          <Arrow m={m} from={[0, 0]} to={[1.4, 0]} color="#5b6b7d" width={2} label="xᵂ" />
          <Arrow m={m} from={[0, 0]} to={[0, 1.4]} color="#5b6b7d" width={2} label="yᵂ" />
          {mode === "frame" && (
            <>
              {/* body frame */}
              <Arrow m={m} from={[0, 0]} to={[bx[0] * 1.6, bx[1] * 1.6]} color="#4dd6e8" label="xᴮ" />
              <Arrow m={m} from={[0, 0]} to={[by[0] * 1.6, by[1] * 1.6]} color="#e8b34d" label="yᴮ" />
              {/* component decomposition along body axes */}
              <line
                x1={m.sx(0)} y1={m.sy(0)} x2={m.sx(bx[0] * pB[0])} y2={m.sy(bx[1] * pB[0])}
                stroke="#4dd6e855" strokeWidth={3}
              />
              <line
                x1={m.sx(bx[0] * pB[0])} y1={m.sy(bx[1] * pB[0])} x2={m.sx(p[0])} y2={m.sy(p[1])}
                stroke="#e8b34d55" strokeWidth={3}
              />
            </>
          )}
          {mode === "point" && (
            <>
              {arc && <polyline points={arc} fill="none" stroke="#e86ea466" strokeWidth={1.4} strokeDasharray="4 4" />}
              <Arrow m={m} from={[0, 0]} to={pRot} color="#e86ea4" label="Rp" />
            </>
          )}
          <Arrow m={m} from={[0, 0]} to={p} color="#52d68a" label="p" />
          <Handle m={m} at={p} color="#52d68a" svgRef={svgRef} onDrag={(x, y) => setP([snap(x), snap(y)])} />
        </svg>
      }
      controls={
        <>
          <div className="flex gap-1.5">
            <WBtn active={mode === "frame"} onClick={() => setMode("frame")}>rotate frame (passive)</WBtn>
            <WBtn active={mode === "point"} color="#e86ea4" onClick={() => setMode("point")}>rotate point (active)</WBtn>
          </div>
          <Slider tex="\theta" value={th} min={-Math.PI} max={Math.PI} step={0.01} onChange={setTh} fmt={() => `${deg}°`} />
          <div className="rounded-md border border-line bg-panel2/60 p-3">
            <Katex tex={`R(\\theta)=\\begin{bmatrix}${c.toFixed(2)} & ${(-s).toFixed(2)}\\\\ ${s.toFixed(2)} & ${c.toFixed(2)}\\end{bmatrix}`} />
          </div>
          <Readout
            items={
              mode === "frame"
                ? [
                    { label: "ᵂp", value: `[${p[0].toFixed(1)}, ${p[1].toFixed(1)}]`, color: "#52d68a" },
                    { label: "ᴮp = Rᵀ ᵂp", value: `[${pB[0].toFixed(2)}, ${pB[1].toFixed(2)}]`, color: "#4dd6e8" },
                  ]
                : [
                    { label: "p", value: `[${p[0].toFixed(1)}, ${p[1].toFixed(1)}]`, color: "#52d68a" },
                    { label: "Rp", value: `[${pRot[0].toFixed(2)}, ${pRot[1].toFixed(2)}]`, color: "#e86ea4" },
                    { label: "‖p‖ = ‖Rp‖", value: r0.toFixed(2) },
                  ]
            }
          />
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            {mode === "frame" ? (
              <>
                Same physical point, two descriptions. The green point never moves. Only the{" "}
                <span className="text-acc">body frame</span> turns, and its coordinates{" "}
                <Katex tex="{}^{B}p=R^\top\,{}^{W}p" /> change. This is exactly how a robot re-expresses
                a camera detection in its gripper frame.
              </>
            ) : (
              <>
                Now the same matrix physically moves the point: <Katex tex="p'=R\,p" />. Length is
                preserved (<Katex tex="R^\top R=I" />): rotation never stretches. Passive vs active
                is only a choice of what you hold fixed; mixing them up flips the sign of θ.
              </>
            )}
          </div>
        </>
      }
    />
  );
}
