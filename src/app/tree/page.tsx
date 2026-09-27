"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { NODES, NODE_MAP } from "@/content/nodes";
import { LEVELS } from "@/content/levels";
import { graphLayout, masteryPath, nodeState } from "@/lib/engine/graph";
import { hasLesson, lessonMeta } from "@/content/lessons/manifest";
import { useStore } from "@/lib/store";
import { STATE_META } from "@/components/ui";
import type { NodeState } from "@/lib/types";

const NODE_W = 200;
const NODE_H = 64;

export default function TreePage() {
  const nodes = useStore((s) => s.nodes);
  const layout = graphLayout();
  const [view, setView] = useState({ x: -20, y: 0, k: 0.85 });
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);
  const moved = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const states = useMemo(() => {
    const m = new Map<string, NodeState>();
    for (const n of NODES) m.set(n.id, nodeState(n.id, nodes));
    return m;
  }, [nodes]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of states.values()) c[s] = (c[s] ?? 0) + 1;
    return c;
  }, [states]);

  // mastery path for the selected node
  const path = useMemo(() => {
    if (!selected) return null;
    const missing = masteryPath(selected, nodes);
    const ids = new Set(missing.map((n) => n.id));
    ids.add(selected);
    return { missing, ids };
  }, [selected, nodes]);

  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    setView((v) => {
      const k = Math.min(2.2, Math.max(0.12, v.k * factor));
      const wx = (cx - v.x) / v.k;
      const wy = (cy - v.y) / v.k;
      return { k, x: cx - wx * k, y: cy - wy * k };
    });
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY > 0 ? 0.92 : 1.08);
    },
    [zoomAt],
  );

  const fit = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const k = Math.max(0.12, Math.min(rect.width / layout.width, rect.height / layout.height) * 0.96);
    setView({ k, x: (rect.width - layout.width * k) / 2, y: (rect.height - layout.height * k) / 2 });
  }, [layout]);

  const zoomBy = useCallback(
    (factor: number) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      zoomAt(rect.width / 2, rect.height / 2, factor);
    },
    [zoomAt],
  );

  const edges = useMemo(() => {
    const out: { from: string; to: string; gold: boolean }[] = [];
    for (const n of NODES) {
      for (const p of n.prereqs) out.push({ from: p.id, to: n.id, gold: p.tier === "gold" });
    }
    return out;
  }, []);

  const selNode = selected ? NODE_MAP.get(selected) : null;
  const selState = selected ? states.get(selected) : null;

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] flex-col md:h-[calc(100vh-3rem)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mono-label">dependency graph · tap a node to inspect, tap again to open</div>
          <h1 className="font-mono text-xl font-bold">SKILL TREE</h1>
        </div>
        <div className="hidden flex-wrap items-center gap-3 md:flex">
          {(Object.keys(STATE_META) as NodeState[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[11px] text-dim">
              <span className="size-2 rounded-full" style={{ background: STATE_META[s].color }} />
              {STATE_META[s].label} <span className="font-mono text-faint">{counts[s] ?? 0}</span>
            </span>
          ))}
        </div>
      </div>

      <div ref={wrapRef} className="grid-backdrop panel relative flex-1 overflow-hidden !bg-bg">
        {/* zoom controls */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
          <button onClick={() => zoomBy(1.25)} aria-label="zoom in"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel font-mono text-sm text-dim transition-colors hover:border-acc/50 hover:text-acc">+</button>
          <button onClick={() => zoomBy(0.8)} aria-label="zoom out"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel font-mono text-sm text-dim transition-colors hover:border-acc/50 hover:text-acc">−</button>
          <button onClick={fit} aria-label="fit graph"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel font-mono text-sm text-dim transition-colors hover:border-acc/50 hover:text-acc">⤢</button>
        </div>

        <svg
          ref={svgRef}
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          onWheel={onWheel}
          onPointerDown={(e) => {
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            moved.current = false;
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
            if (pointers.current.size === 2) {
              const [a, b] = [...pointers.current.values()];
              pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
            }
          }}
          onPointerMove={(e) => {
            const prev = pointers.current.get(e.pointerId);
            if (!prev) return;
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.current.size === 2) {
              // pinch zoom around the midpoint
              const [a, b] = [...pointers.current.values()];
              const d = Math.hypot(a.x - b.x, a.y - b.y);
              if (pinchDist.current > 0) {
                const rect = svgRef.current!.getBoundingClientRect();
                zoomAt((a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, d / pinchDist.current);
              }
              pinchDist.current = d;
              moved.current = true;
              return;
            }
            const dx = e.clientX - prev.x;
            const dy = e.clientY - prev.y;
            if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
            setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId);
            pinchDist.current = 0;
          }}
          onPointerLeave={(e) => {
            pointers.current.delete(e.pointerId);
            pinchDist.current = 0;
          }}
        >
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {/* level bands */}
            {LEVELS.map((l) => (
              <g key={l.id}>
                <rect x={l.id * 240 + 44} y={8} width={232} height={layout.height} fill={l.id % 2 ? "#ffffff03" : "transparent"} />
                <text x={l.id * 240 + 60} y={40} fill={l.accent} fontSize={13} fontFamily="var(--font-mono)" fontWeight={700}>
                  L{l.id}
                </text>
                <text x={l.id * 240 + 92} y={40} fill="#5a6675" fontSize={10.5} fontFamily="var(--font-mono)">
                  {l.codename}
                </text>
              </g>
            ))}

            {/* edges */}
            {edges.map((e, i) => {
              const a = layout.nodes.get(e.from);
              const b = layout.nodes.get(e.to);
              if (!a || !b) return null;
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const mid = (x1 + x2) / 2;
              const onPath = path ? path.ids.has(e.from) && path.ids.has(e.to) : false;
              const related = hover === e.from || hover === e.to;
              const done = states.get(e.from) === "mastered" || states.get(e.from) === "research-level";
              const dimmed = path && !onPath;
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={onPath ? "#e8b34d" : related ? "#4dd6e8" : done ? "#52d68a55" : e.gold ? "#e8b34d33" : "#2a364677"}
                  strokeWidth={onPath ? 2.2 : related ? 2 : 1.2}
                  strokeDasharray={e.gold && !related && !onPath ? "5 3" : undefined}
                  opacity={dimmed ? 0.15 : 1}
                />
              );
            })}

            {/* nodes */}
            {NODES.map((n) => {
              const pos = layout.nodes.get(n.id)!;
              const st = states.get(n.id)!;
              const c = STATE_META[st].color;
              const isHover = hover === n.id;
              const isSel = selected === n.id;
              const onPath = path ? path.ids.has(n.id) : false;
              const locked = st === "locked";
              const dimmed = path && !onPath;
              return (
                <g
                  key={n.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  className="cursor-pointer"
                  onPointerEnter={() => setHover(n.id)}
                  onPointerLeave={() => setHover(null)}
                  onClick={() => {
                    if (moved.current) return;
                    setSelected(isSel ? null : n.id);
                  }}
                  opacity={dimmed ? 0.22 : locked && !isHover && !onPath ? 0.55 : 1}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill={isSel ? "#14202c" : isHover ? "#131a24" : "#0f141c"}
                    stroke={isSel ? "#e8b34d" : onPath ? "#e8b34d88" : isHover ? "#4dd6e8" : `${c}66`}
                    strokeWidth={isSel ? 2 : isHover || onPath ? 1.6 : 1}
                  />
                  <rect width={3} height={NODE_H} rx={1.5} fill={c} />
                  <circle cx={NODE_W - 14} cy={14} r={4} fill={c} />
                  {hasLesson(n.id) && (
                    <text x={NODE_W - 32} y={18} fill="#4dd6e8" fontSize={11} fontFamily="var(--font-mono)">⚡</text>
                  )}
                  <text x={12} y={22} fill="#d7dfe9" fontSize={11.5} fontWeight={600} fontFamily="var(--font-sans)">
                    {n.title.length > 26 ? n.title.slice(0, 25) + "…" : n.title}
                  </text>
                  <text x={12} y={40} fill="#5a6675" fontSize={9.5} fontFamily="var(--font-mono)">
                    {n.track.toUpperCase()} · {n.hours}h {n.optional ? "· STRETCH" : ""}
                  </text>
                  <text x={12} y={54} fill="#46536e" fontSize={9} fontFamily="var(--font-mono)">
                    gate: {n.masteryGate}{n.id.startsWith("boss-") ? " · BOSS" : ""}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* selection card */}
        {selNode && selState && (
          <div className="rise-in absolute inset-x-2 bottom-2 z-10 rounded-lg border border-line2 bg-panel/95 p-3.5 backdrop-blur md:inset-x-auto md:left-3 md:max-w-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mono-label" style={{ color: STATE_META[selState].color }}>
                  {STATE_META[selState].label} · L{selNode.level} · {selNode.track} · gate {selNode.masteryGate}
                </div>
                <div className="mt-0.5 text-[15px] font-semibold text-ink">{selNode.title}</div>
                <p className="mt-1 line-clamp-2 text-xs text-dim">{selNode.why}</p>
              </div>
              <button className="shrink-0 rounded p-1 text-faint hover:text-ink" onClick={() => setSelected(null)} aria-label="close">✕</button>
            </div>

            {path && path.missing.length > 0 && (
              <div className="mt-2 border-t border-line/60 pt-2">
                <div className="text-xs font-medium text-acc-math">
                  You are {path.missing.length} prerequisite gate{path.missing.length === 1 ? "" : "s"} away, path highlighted
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {path.missing.slice(0, 5).map((m) => (
                    <span key={m.id} className="rounded border border-line bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-dim">
                      {m.title.length > 22 ? m.title.slice(0, 21) + "…" : m.title}
                    </span>
                  ))}
                  {path.missing.length > 5 && (
                    <span className="px-1 py-0.5 font-mono text-[10px] text-faint">+{path.missing.length - 5} more</span>
                  )}
                </div>
                <div className="mt-1 font-mono text-[10.5px] text-faint">
                  ≈ {path.missing.reduce((s, m) => s + m.hours, 0)}h of mastery between you and this node
                </div>
              </div>
            )}
            {path && path.missing.length === 0 && selState === "locked" && (
              <div className="mt-2 text-xs text-acc-robot">All prerequisite nodes met. Claim the pending tiers to unlock.</div>
            )}

            <div className="mt-2.5 flex gap-2">
              <Link href={`/node/${selNode.id}`} className="btn btn-acc !py-1.5 text-xs">Open node</Link>
              {hasLesson(selNode.id) && (
                <Link href={`/learn/${selNode.id}`} className="btn !py-1.5 text-xs">
                  ⚡ Lesson · {lessonMeta(selNode.id)?.minutes}m
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
