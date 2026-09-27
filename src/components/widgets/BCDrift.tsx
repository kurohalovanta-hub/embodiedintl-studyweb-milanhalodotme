"use client";

import { useMemo, useState } from "react";
import { Katex } from "../ui";
import { Mapper, Readout, Slider, WBtn, WidgetShell } from "./toolkit";

// Why behavior cloning fails quietly: the policy is good on states the expert
// visited, unreliable outside them, and its own small errors carry it outside.
// DAgger closes the loop by labeling the learner's *own* states.

const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const S_MAX = 10;
const DS = 0.1;
const N_ROLL = 14;
const K_GOOD = 2.4;
const centerline = (s: number) => 1.05 * Math.sin(0.85 * s);

export default function BCDrift() {
  const [eta, setEta] = useState(0.18);       // policy error scale
  const [wData, setWData] = useState(0.45);   // half-width of expert data coverage
  const [dagger, setDagger] = useState(false);
  const [seed, setSeed] = useState(1);
  const W_CORR = 0.9;                          // corridor half-width

  const m = new Mapper({ w: 460, h: 280, xmin: -0.3, xmax: 10.3, ymin: -2.5, ymax: 2.5 });

  const { rolls, meanAbs, successes } = useMemo(() => {
    const rolls: { pts: [number, number][]; ok: boolean }[] = [];
    const sums = Array(Math.floor(S_MAX / DS) + 1).fill(0);
    let successes = 0;
    for (let n = 0; n < N_ROLL; n++) {
      const rnd = mulberry32(seed * 1000 + n * 17);
      const randn = () => {
        const u = 1 - rnd();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
      };
      let e = 0;
      let ok = true;
      const pts: [number, number][] = [];
      let i = 0;
      for (let s = 0; s <= S_MAX; s += DS, i++) {
        pts.push([s, centerline(s) + e]);
        sums[i] += Math.abs(e);
        if (Math.abs(e) > W_CORR) ok = false;
        const inData = dagger || Math.abs(e) < wData;
        // in-distribution: near-expert corrections; OOD: barely corrective, noisier
        const a = inData ? -K_GOOD * e + eta * randn() : -0.12 * e + 2.6 * eta * randn();
        e += a * DS + 0.1 * Math.sqrt(DS) * randn();
      }
      if (ok) successes++;
      rolls.push({ pts, ok });
    }
    return { rolls, meanAbs: sums.map((v) => v / N_ROLL), successes };
  }, [seed, eta, wData, dagger]);

  const finalMean = meanAbs[meanAbs.length - 1];

  return (
    <WidgetShell
      canvas={
        <svg viewBox={`0 0 ${m.v.w} ${m.v.h + 60}`} className="w-full touch-none select-none rounded-md">
          {/* corridor */}
          <path
            d={`M ${Array.from({ length: 101 }, (_, i) => {
              const s = (i / 100) * S_MAX;
              return `${m.sx(s)},${m.sy(centerline(s) + W_CORR)}`;
            }).join(" L ")} L ${Array.from({ length: 101 }, (_, i) => {
              const s = S_MAX - (i / 100) * S_MAX;
              return `${m.sx(s)},${m.sy(centerline(s) - W_CORR)}`;
            }).join(" L ")} Z`}
            fill="#11192755" stroke="#314155" strokeWidth={1}
          />
          {/* expert data band */}
          {!dagger && (
            <path
              d={`M ${Array.from({ length: 101 }, (_, i) => {
                const s = (i / 100) * S_MAX;
                return `${m.sx(s)},${m.sy(centerline(s) + wData)}`;
              }).join(" L ")} L ${Array.from({ length: 101 }, (_, i) => {
                const s = S_MAX - (i / 100) * S_MAX;
                return `${m.sx(s)},${m.sy(centerline(s) - wData)}`;
              }).join(" L ")} Z`}
              fill="#52d68a10" stroke="#52d68a44" strokeWidth={1} strokeDasharray="4 4"
            />
          )}
          {/* expert path */}
          <polyline
            points={Array.from({ length: 101 }, (_, i) => {
              const s = (i / 100) * S_MAX;
              return `${m.sx(s)},${m.sy(centerline(s))}`;
            }).join(" ")}
            fill="none" stroke="#52d68a" strokeWidth={1.6} strokeDasharray="7 5"
          />
          {/* rollouts */}
          {rolls.map((r, i) => (
            <polyline key={i}
              points={r.pts.map(([s, y]) => `${m.sx(s)},${m.sy(Math.max(-2.4, Math.min(2.4, y)))}`).join(" ")}
              fill="none" stroke={r.ok ? "#4dd6e8" : "#f4586e"} strokeWidth={1.2} opacity={0.25 + 0.5 * (i / N_ROLL)} />
          ))}
          <text x={m.sx(0.1)} y={m.sy(centerline(0) - W_CORR) + 14} fill="#5b6b7d" fontSize={9.5} fontFamily="var(--font-mono)">corridor</text>
          {!dagger && <text x={m.sx(3.2)} y={m.sy(centerline(3.2) + wData) - 5} fill="#52d68a99" fontSize={9.5} fontFamily="var(--font-mono)">expert data coverage</text>}
          {/* mean |e| vs s strip */}
          <text x={8} y={m.v.h + 16} fill="#5b6b7d" fontSize={9.5} fontFamily="var(--font-mono)">mean |offset| vs distance</text>
          <line x1={0} y1={m.v.h + 52} x2={m.v.w} y2={m.v.h + 52} stroke="#1b2634" />
          <polyline
            points={meanAbs.map((v, i) => `${(i / (meanAbs.length - 1)) * m.v.w},${m.v.h + 52 - Math.min(30, v * 30)}`).join(" ")}
            fill="none" stroke={dagger ? "#52d68a" : "#f2934d"} strokeWidth={1.8}
          />
        </svg>
      }
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            <WBtn active={!dagger} color="#f2934d" onClick={() => setDagger(false)}>behavior cloning</WBtn>
            <WBtn active={dagger} color="#52d68a" onClick={() => setDagger(true)}>+ DAgger</WBtn>
            <WBtn onClick={() => setSeed((s) => s + 1)}>rerun ×{N_ROLL}</WBtn>
          </div>
          <Slider tex="\eta\ \text{(model error)}" value={eta} min={0.02} max={0.5} step={0.01} onChange={setEta} color="#f2934d" />
          <Slider tex="\text{data coverage width}" value={wData} min={0.15} max={1.5} step={0.01} onChange={setWData} color="#52d68a" />
          <Readout
            items={[
              { label: "reached end", value: `${successes}/${N_ROLL}`, color: successes === N_ROLL ? "#52d68a" : successes < N_ROLL / 2 ? "#f4586e" : "#f2934d" },
              { label: "mean |e| at end", value: finalMean.toFixed(2), color: finalMean < 0.3 ? "#52d68a" : "#f2934d" },
            ]}
          />
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            Inside the green band the cloned policy has expert labels and corrects well; outside, it has
            never seen these states and barely corrects. Small errors → drift out of the band → bigger
            errors: compounding, <Katex tex="O(\varepsilon T^2)" /> regret (Ross &amp; Bagnell). Narrow the
            coverage or raise η and watch trajectories peel off mid-corridor. <b>+ DAgger</b> collects
            expert labels on the <i>learner&apos;s own states</i>: coverage follows the learner, error stays{" "}
            <Katex tex="O(\varepsilon T)" />, and the same η suddenly succeeds. This exact failure is why
            robot imitation learning collects corrective data.
          </div>
        </>
      }
    />
  );
}
