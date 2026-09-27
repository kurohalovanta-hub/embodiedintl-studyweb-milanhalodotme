"use client";

import Link from "next/link";
import { PROJECTS } from "@/content/projects";
import { NODE_MAP } from "@/content/nodes";
import { useStore } from "@/lib/store";
import { isNodeComplete } from "@/lib/engine/graph";
import { Panel, SectionTitle } from "@/components/ui";
import type { ProjectStatus } from "@/lib/types";

const STATUS_META: Record<ProjectStatus | "locked", { label: string; color: string }> = {
  locked: { label: "locked", color: "#5a6675" },
  todo: { label: "unlocked", color: "#4dd6e8" },
  active: { label: "active", color: "#e8b34d" },
  done: { label: "shipped", color: "#52d68a" },
};

export default function ProjectsPage() {
  const store = useStore();

  return (
    <div className="space-y-5">
      <div>
        <div className="mono-label">the cumulative ladder: each reuses earlier work</div>
        <h1 className="font-mono text-2xl font-bold">PROJECTS</h1>
      </div>

      <div className="space-y-3">
        {PROJECTS.map((p) => {
          const stored = store.projects[p.id]?.status;
          const unlocked = p.prereqNodeIds.every((id) => {
            const n = NODE_MAP.get(id);
            return n ? isNodeComplete(n, store.nodes) : true;
          });
          const status = (stored ?? (unlocked ? "todo" : "locked")) as ProjectStatus | "locked";
          const m = STATUS_META[status];
          return (
            <Panel key={p.id} className={status === "locked" ? "opacity-60" : ""}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-acc-robot">P{p.num}</span>
                    <span className="text-[15px] font-semibold">{p.title}</span>
                    <span className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: m.color, background: `${m.color}14` }}>
                      {m.label}
                    </span>
                    <span className="font-mono text-[11px] text-faint">~{p.hours}h · L{p.levelWindow[0]}{p.levelWindow[1] !== p.levelWindow[0] ? `–${p.levelWindow[1]}` : ""}</span>
                  </div>
                  <p className="mt-1 text-sm text-dim">{p.purpose}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {status !== "locked" && status !== "done" && (
                    <button className="btn" onClick={() => store.setProjectStatus(p.id, status === "active" ? "todo" : "active")}>
                      {status === "active" ? "pause" : "▶ activate"}
                    </button>
                  )}
                  {status === "active" && (
                    <button className="btn btn-acc" onClick={() => store.setProjectStatus(p.id, "done")}>✓ shipped</button>
                  )}
                  {status === "done" && (
                    <button className="btn" onClick={() => store.setProjectStatus(p.id, "todo")}>reopen</button>
                  )}
                </div>
              </div>

              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-acc hover:underline">full spec</summary>
                <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <SectionTitle>minimum implementation</SectionTitle>
                    <ul className="space-y-1">{p.minimum.map((x, i) => <li key={i} className="text-xs text-ink">□ {x}</li>)}</ul>
                    <SectionTitle>stretch</SectionTitle>
                    <ul className="space-y-1">{p.stretch.map((x, i) => <li key={i} className="text-xs text-dim">◇ {x}</li>)}</ul>
                  </div>
                  <div>
                    <SectionTitle>metrics</SectionTitle>
                    <ul className="space-y-1">{p.metrics.map((x, i) => <li key={i} className="text-xs text-ink">▸ {x}</li>)}</ul>
                    <SectionTitle>common failure modes</SectionTitle>
                    <ul className="space-y-1">{p.failureModes.map((x, i) => <li key={i} className="text-xs text-acc-math">⚠ {x}</li>)}</ul>
                    <SectionTitle>research connection</SectionTitle>
                    <p className="text-xs text-dim">{p.researchConnection}</p>
                    <SectionTitle>portfolio artifact</SectionTitle>
                    <p className="text-xs text-dim">{p.artifact}</p>
                    {p.computeNote && (<><SectionTitle>compute</SectionTitle><p className="text-xs text-faint">{p.computeNote}</p></>)}
                  </div>
                </div>
                <div className="mt-3 border-t border-line pt-2">
                  <span className="mono-label mr-2">prereq nodes:</span>
                  {p.prereqNodeIds.map((nid) => (
                    <Link key={nid} href={`/node/${nid}`} className="mr-3 text-xs text-acc hover:underline">
                      {NODE_MAP.get(nid)?.title ?? nid}
                    </Link>
                  ))}
                </div>
              </details>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
