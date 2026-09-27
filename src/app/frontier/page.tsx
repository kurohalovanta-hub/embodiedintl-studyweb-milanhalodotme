"use client";

import { FRONTIER } from "@/content/frontier";
import { LEVELS } from "@/content/levels";
import Link from "next/link";
import { Panel } from "@/components/ui";

const IMPACT_COLOR: Record<string, string> = {
  none: "#5a6675", watch: "#4dd6e8", minor: "#e8b34d", major: "#f4586e",
};
const KIND_ICON: Record<string, string> = {
  model: "◈", paper: "¶", dataset: "▤", benchmark: "☰", tool: "⚒", event: "◔", debate: "⚖",
};

export default function FrontierPage() {
  const entries = [...FRONTIER].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <div className="mono-label">the field moves, the roadmap versions itself · verified 2026-08-21</div>
        <h1 className="font-mono text-2xl font-bold">FRONTIER TRACKER</h1>
        <p className="mt-1 text-sm text-dim">
          Every entry answers: what changed, and does the roadmap change? New developments get logged here
          FIRST; curriculum edits follow the verdict, never hype. (Breadth addiction and premature frontier
          obsession are named failure modes.)
        </p>
      </div>

      <div className="space-y-3">
        {entries.map((e) => {
          const level = e.relatedLevel != null ? LEVELS.find((l) => l.id === e.relatedLevel) : null;
          return (
            <Panel key={e.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg" style={{ color: IMPACT_COLOR[e.roadmapImpact] }}>{KIND_ICON[e.kind] ?? "◈"}</span>
                <span className="font-mono text-[11px] text-faint">{e.date}</span>
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[15px] font-semibold hover:text-acc">
                    {e.title} ↗
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{e.title}</span>
                )}
                <span className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: IMPACT_COLOR[e.roadmapImpact], background: `${IMPACT_COLOR[e.roadmapImpact]}14` }}>
                  {e.roadmapImpact === "major" ? "roadmap changed" : e.roadmapImpact}
                </span>
              </div>
              <div className="mt-1 text-xs text-faint">{e.org} · {e.kind}</div>
              <p className="mt-2 text-sm text-dim">{e.whatChanged}</p>
              <div className="mt-2 rounded-md border border-line bg-panel2 px-3 py-2 text-[13px]">
                <span className="mono-label mr-2">verdict</span>
                <span className="text-ink">{e.verdict}</span>
                <span className="ml-2 font-mono text-[10px] uppercase text-acc-robot">study: {e.studyWhen}</span>
                {level && (
                  <Link href={`/levels/${level.id}`} className="ml-2 font-mono text-[10px] uppercase text-acc hover:underline">
                    → L{level.id} {level.codename}
                  </Link>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel>
        <div className="text-xs text-faint">
          Refresh ritual: monthly (and at CoRL/ICRA/RSS weeks). Sweep arXiv/lab blogs for your directions, add entries with verdicts,
          and only then edit the curriculum. The awesome-vla-2026 index and the WM survey&apos;s living repo are the entry points.
        </div>
      </Panel>
    </div>
  );
}
