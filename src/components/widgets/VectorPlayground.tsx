"use client";

import { useRef, useState } from "react";
import { Katex } from "../ui";
import { Arrow, Axes, Handle, Mapper, Readout, WBtn, WidgetShell } from "./toolkit";

// Drag two vectors; watch sum, dot product, angle and projection live.
export default function VectorPlayground() {
  const [a, setA] = useState<[number, number]>([2, 1]);
  const [b, setB] = useState<[number, number]>([1, 2.5]);
  const [show, setShow] = useState<{ sum: boolean; proj: boolean }>({ sum: true, proj: false });
  const svgRef = useRef<SVGSVGElement>(null);

  const m = new Mapper({ w: 460, h: 340, xmin: -4.6, xmax: 4.6, ymin: -3.4, ymax: 3.4 });
  const dot = a[0] * b[0] + a[1] * b[1];
  const na = Math.hypot(a[0], a[1]);
  const nb = Math.hypot(b[0], b[1]);
  const cos = na && nb ? dot / (na * nb) : 0;
  const angle = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  const projScale = nb > 1e-9 ? dot / (nb * nb) : 0;
  const proj: [number, number] = [projScale * b[0], projScale * b[1]];

  const snap = (v: number) => Math.round(v * 10) / 10;

  return (
    <WidgetShell
      canvas={
        <svg ref={svgRef} viewBox={`0 0 ${m.v.w} ${m.v.h}`} className="w-full touch-none select-none rounded-md">
          <Axes m={m} />
          {show.sum && (
            <>
              <Arrow m={m} from={a} to={[a[0] + b[0], a[1] + b[1]]} color="#a78bfa55" dash="4 4" />
              <Arrow m={m} from={b} to={[a[0] + b[0], a[1] + b[1]]} color="#a78bfa55" dash="4 4" />
              <Arrow m={m} from={[0, 0]} to={[a[0] + b[0], a[1] + b[1]]} color="#a78bfa" label="a+b" />
            </>
          )}
          {show.proj && nb > 0.05 && (
            <>
              <line
                x1={m.sx(a[0])} y1={m.sy(a[1])} x2={m.sx(proj[0])} y2={m.sy(proj[1])}
                stroke="#8b97a7" strokeWidth={1.2} strokeDasharray="3 3"
              />
              <Arrow m={m} from={[0, 0]} to={proj} color="#f2934d" width={3.5} label="projᵦa" />
            </>
          )}
          <Arrow m={m} from={[0, 0]} to={a} color="#4dd6e8" label="a" />
          <Arrow m={m} from={[0, 0]} to={b} color="#e8b34d" label="b" />
          <Handle m={m} at={a} color="#4dd6e8" svgRef={svgRef} onDrag={(x, y) => setA([snap(x), snap(y)])} />
          <Handle m={m} at={b} color="#e8b34d" svgRef={svgRef} onDrag={(x, y) => setB([snap(x), snap(y)])} />
        </svg>
      }
      controls={
        <>
          <Readout
            items={[
              { label: "a", value: `[${a[0].toFixed(1)}, ${a[1].toFixed(1)}]`, color: "#4dd6e8" },
              { label: "b", value: `[${b[0].toFixed(1)}, ${b[1].toFixed(1)}]`, color: "#e8b34d" },
              { label: "‖a‖", value: na.toFixed(2), color: "#4dd6e8" },
              { label: "a·b", value: dot.toFixed(2), color: dot > 0.05 ? "#52d68a" : dot < -0.05 ? "#f4586e" : "#8b97a7" },
              { label: "θ", value: `${angle.toFixed(0)}°` },
              { label: "cos θ", value: cos.toFixed(2) },
            ]}
          />
          <div className="flex flex-wrap gap-1.5">
            <WBtn active={show.sum} color="#a78bfa" onClick={() => setShow((s) => ({ ...s, sum: !s.sum }))}>a+b</WBtn>
            <WBtn active={show.proj} color="#f2934d" onClick={() => setShow((s) => ({ ...s, proj: !s.proj }))}>projection</WBtn>
            <WBtn onClick={() => { setA([2, 1]); setB([1, 2.5]); }}>reset</WBtn>
            <WBtn color="#52d68a" onClick={() => setB([-a[1], a[0]])}>make ⟂</WBtn>
          </div>
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            <Katex tex="a\cdot b = \|a\|\,\|b\|\cos\theta" />. Drag until <Katex tex="a\cdot b" /> is
            zero and look at the angle. Then toggle the projection: it is the shadow of{" "}
            <span className="text-acc">a</span> along <span className="text-acc-math">b</span>, length{" "}
            <Katex tex="(a\cdot b)/\|b\|" />.
          </div>
        </>
      }
    />
  );
}
