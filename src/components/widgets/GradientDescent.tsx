"use client";

import { useMemo, useRef, useState } from "react";
import { Katex } from "../ui";
import { Handle, Mapper, Readout, Slider, WBtn, WidgetShell, useRaf } from "./toolkit";

// Gradient descent on real loss landscapes: bowl, ravine (why momentum),
// saddle (why "local minimum" isn't the usual failure), and a curved valley.

type Land = {
  name: string;
  f: (x: number, y: number) => number;
  g: (x: number, y: number) => [number, number];
  start: [number, number];
};
const LANDS: Land[] = [
  { name: "bowl", f: (x, y) => 0.5 * (x * x + y * y), g: (x, y) => [x, y], start: [-2.4, 1.8] },
  { name: "ravine", f: (x, y) => 0.5 * (x * x + 12 * y * y), g: (x, y) => [x, 12 * y], start: [-2.6, 1.2] },
  { name: "saddle", f: (x, y) => 0.5 * (x * x - y * y), g: (x, y) => [x, -y], start: [-2.5, 0.02] },
  {
    name: "valley",
    f: (x, y) => (1 - x) ** 2 + 5 * (y - x * x) ** 2,
    g: (x, y) => [-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x)],
    start: [-1.6, 2.4],
  },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ramp = (t: number) => {
  // dark navy → teal → amber (low → high loss)
  const c1 = [10, 20, 34], c2 = [26, 82, 96], c3 = [232, 179, 77];
  const [r, g, b] =
    t < 0.55
      ? [lerp(c1[0], c2[0], t / 0.55), lerp(c1[1], c2[1], t / 0.55), lerp(c1[2], c2[2], t / 0.55)]
      : [lerp(c2[0], c3[0], (t - 0.55) / 0.45), lerp(c2[1], c3[1], (t - 0.55) / 0.45), lerp(c2[2], c3[2], (t - 0.55) / 0.45)];
  return `rgb(${r | 0},${g | 0},${b | 0})`;
};

const NX = 46, NY = 34;

export default function GradientDescent() {
  const [li, setLi] = useState(0);
  const [lr, setLr] = useState(0.12);
  const [beta, setBeta] = useState(0);
  const land = LANDS[li];
  const [path, setPath] = useState<[number, number][]>([land.start]);
  const vel = useRef<[number, number]>([0, 0]);
  const [playing, setPlaying] = useState(false);
  const acc = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const m = new Mapper({ w: 460, h: 340, xmin: -3, xmax: 3, ymin: -2.2, ymax: 2.8 });

  const heat = useMemo(() => {
    const cells: { x: number; y: number; c: string }[] = [];
    let max = 0;
    const vals: number[][] = [];
    for (let i = 0; i < NX; i++) {
      vals.push([]);
      for (let j = 0; j < NY; j++) {
        const x = m.v.xmin + ((i + 0.5) / NX) * (m.v.xmax - m.v.xmin);
        const y = m.v.ymin + ((j + 0.5) / NY) * (m.v.ymax - m.v.ymin);
        const v = Math.log1p(Math.abs(land.f(x, y)));
        vals[i].push(v);
        if (v > max) max = v;
      }
    }
    for (let i = 0; i < NX; i++)
      for (let j = 0; j < NY; j++)
        cells.push({ x: (i / NX) * m.v.w, y: m.v.h - ((j + 1) / NY) * m.v.h, c: ramp(vals[i][j] / (max || 1)) });
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [li]);

  const cur = path[path.length - 1];
  const grad = land.g(cur[0], cur[1]);
  const gnorm = Math.hypot(grad[0], grad[1]);
  const diverged = Math.abs(cur[0]) > 50 || Math.abs(cur[1]) > 50;
  const converged = gnorm < 1e-3 && !diverged;

  const step = () => {
    setPath((p) => {
      const [x, y] = p[p.length - 1];
      if (Math.abs(x) > 50 || Math.abs(y) > 50) return p;
      const [gx, gy] = land.g(x, y);
      vel.current = [beta * vel.current[0] - lr * gx, beta * vel.current[1] - lr * gy];
      return [...p, [x + vel.current[0], y + vel.current[1]]];
    });
  };
  useRaf((dt) => {
    acc.current += dt;
    while (acc.current > 1 / 20) {
      acc.current -= 1 / 20;
      step();
    }
    if (diverged || converged) setPlaying(false);
  }, playing);

  const reset = (startAt?: [number, number]) => {
    vel.current = [0, 0];
    acc.current = 0;
    setPath([startAt ?? land.start]);
    setPlaying(false);
  };

  return (
    <WidgetShell
      canvas={
        <svg ref={svgRef} viewBox={`0 0 ${m.v.w} ${m.v.h}`} className="w-full touch-none select-none rounded-md">
          {heat.map((c, i) => (
            <rect key={i} x={c.x} y={c.y} width={m.v.w / NX + 0.6} height={m.v.h / NY + 0.6} fill={c.c} />
          ))}
          {/* minimum marker (valley min at (1,1); others at origin) */}
          <circle cx={m.sx(li === 3 ? 1 : 0)} cy={m.sy(li === 3 ? 1 : 0)} r={4} fill="none" stroke="#52d68a" strokeWidth={1.5} strokeDasharray="2 2" />
          <polyline
            points={path.map(([x, y]) => `${m.sx(x)},${m.sy(y)}`).join(" ")}
            fill="none" stroke="#4dd6e8" strokeWidth={1.8} opacity={0.9}
          />
          {path.map(([x, y], i) => (
            i % Math.max(1, Math.floor(path.length / 60)) === 0 && (
              <circle key={i} cx={m.sx(x)} cy={m.sy(y)} r={2} fill="#4dd6e8" opacity={0.35 + 0.65 * (i / path.length)} />
            )
          ))}
          {!diverged && <circle cx={m.sx(cur[0])} cy={m.sy(cur[1])} r={5.5} fill="#f2934d" stroke="#0a0e14" strokeWidth={1.6} />}
          <Handle m={m} at={path[0]} color="#e86ea4" svgRef={svgRef} r={6} onDrag={(x, y) => reset([x, y])} />
        </svg>
      }
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            {LANDS.map((l, i) => (
              <WBtn key={l.name} active={li === i} onClick={() => { setLi(i); vel.current = [0, 0]; setPath([LANDS[i].start]); setPlaying(false); }}>
                {l.name}
              </WBtn>
            ))}
          </div>
          <Slider tex="\eta\ \text{(learning rate)}" value={lr} min={0.005} max={1.2} step={0.005} onChange={setLr} />
          <Slider tex="\beta\ \text{(momentum)}" value={beta} min={0} max={0.95} step={0.01} onChange={setBeta} color="#a78bfa" />
          <div className="flex flex-wrap gap-1.5">
            <WBtn onClick={step}>step</WBtn>
            <WBtn active={playing} color="#52d68a" onClick={() => setPlaying(!playing)}>{playing ? "pause" : "run"}</WBtn>
            <WBtn onClick={() => reset()}>reset</WBtn>
          </div>
          <Readout
            items={[
              { label: "steps", value: path.length - 1 },
              { label: "f(θ)", value: diverged ? "∞" : land.f(cur[0], cur[1]).toFixed(4), color: diverged ? "#f4586e" : "#4dd6e8" },
              { label: "‖∇f‖", value: diverged ? "—" : gnorm.toFixed(4) },
              ...(diverged ? [{ label: "status", value: "DIVERGED", color: "#f4586e" }] : []),
              ...(converged ? [{ label: "status", value: "converged", color: "#52d68a" }] : []),
            ]}
          />
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            <Katex tex="v \leftarrow \beta v - \eta\nabla f,\quad \theta \leftarrow \theta + v" />. Drag the
            pink start point. On <b>ravine</b>, plain descent (β=0) zig-zags across the steep axis; raise η
            and it diverges, raise β instead and it glides. On <b>saddle</b>, start exactly on the axis and
            descent stalls at a non-minimum. Nudge the start off-axis and it escapes. This is the actual
            optimizer you will write for every network in this program.
          </div>
        </>
      }
    />
  );
}
