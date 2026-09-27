"use client";

import Link from "next/link";
import { useState } from "react";
import { PAPERS, paperById } from "@/content/papers";
import { NODE_MAP } from "@/content/nodes";
import { isNodeComplete, nodeState } from "@/lib/engine/graph";
import { useStore } from "@/lib/store";
import { Katex, Panel, SectionTitle, STATE_META } from "@/components/ui";
import type { PaperStatus } from "@/lib/types";

const STATUSES: PaperStatus[] = ["triaged", "reading", "deriving", "reproducing", "reproduced", "modified", "research-lead"];
const VERDICT_COLOR: Record<string, string> = { READ: "#a78bfa", "READ+RUN": "#52d68a", SKIM: "#8b97a7" };

export function PaperView({ paperId }: { paperId: string }) {
  const p = paperById(paperId)!;
  const store = useStore();
  const progress = store.papers[paperId];
  const status = progress?.status ?? "queue";
  const defense = progress?.defense;

  const prereqs = p.prereqNodeIds
    .map((id) => NODE_MAP.get(id))
    .filter((n): n is NonNullable<typeof n> => !!n);
  const ready = prereqs.every((n) => isNodeComplete(n, store.nodes));

  const ancestors = PAPERS.filter((a) => a.followUpIds?.includes(p.id));
  const descendants = (p.followUpIds ?? []).map((id) => paperById(id)).filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/papers" className="font-mono text-[11px] text-faint hover:text-acc">← paper room</Link>
          <span className="font-mono text-[11px] text-faint">· #{p.order} · rung {p.rung}</span>
          {p.spine && <span className="rounded bg-acc-frontier/15 px-1.5 py-0.5 font-mono text-[9.5px] text-acc-frontier">SPINE</span>}
          <span className="rounded px-1.5 py-0.5 font-mono text-[9.5px]" style={{ color: VERDICT_COLOR[p.verdict], background: `${VERDICT_COLOR[p.verdict]}14` }}>
            {p.verdict}
          </span>
          <span className="font-mono text-[11px] text-acc-math" title="difficulty">
            {"▮".repeat(p.difficulty)}{"▯".repeat(5 - p.difficulty)}
          </span>
        </div>
        <h1 className="mt-1.5 text-xl font-bold leading-snug text-ink">{p.title}</h1>
        <div className="mt-1 text-xs text-dim">
          {p.authors} · {p.venue ? `${p.venue} ` : ""}{p.year}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <a className="text-acc hover:underline" href={p.url} target="_blank" rel="noopener noreferrer">paper ↗</a>
          {p.codeUrl && <a className="text-acc-robot hover:underline" href={p.codeUrl} target="_blank" rel="noopener noreferrer">code ↗</a>}
        </div>
      </div>

      {/* why + readiness */}
      <Panel accent={ready ? "#52d68a" : "#e8b34d"}>
        <SectionTitle>why this paper is on the ladder</SectionTitle>
        <p className="text-sm leading-relaxed text-dim">{p.whyItMatters}</p>
        {prereqs.length > 0 && (
          <div className="mt-3 border-t border-line/60 pt-2.5">
            <div className={`text-xs font-medium ${ready ? "text-acc-robot" : "text-acc-math"}`}>
              {ready ? "◉ You have every prerequisite. Read it with full power." : "◌ Not ready yet. Clear these gates first:"}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {prereqs.map((n) => {
                const st = nodeState(n.id, store.nodes);
                const done = isNodeComplete(n, store.nodes);
                return (
                  <Link
                    key={n.id}
                    href={`/node/${n.id}`}
                    className="rounded-md border px-2 py-1 font-mono text-[10.5px] transition-colors hover:border-acc/60"
                    style={{
                      borderColor: done ? "#52d68a44" : "var(--color-line2)",
                      color: done ? "#52d68a" : STATE_META[st].color,
                      background: done ? "#52d68a0d" : "var(--color-panel2)",
                    }}
                  >
                    {done ? "✓ " : ""}{n.title}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      {/* key ideas + equations */}
      <Panel>
        <SectionTitle>the ideas (know these cold before defending)</SectionTitle>
        <div className="space-y-1.5">
          {p.keyIdeas.map((k, i) => (
            <div key={i} className="flex gap-2 text-[13px] text-ink">
              <span className="font-mono text-[11px] text-acc">{String(i + 1).padStart(2, "0")}</span>
              <span>{k}</span>
            </div>
          ))}
        </div>
        {p.keyEquations && p.keyEquations.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-line/60 pt-3">
            {p.keyEquations.map((eq, i) => (
              <div key={i} className="overflow-x-auto rounded-md border border-line bg-panel2/60 px-3 py-2.5">
                <Katex tex={eq} block />
              </div>
            ))}
            <div className="text-[11px] text-faint">Every symbol above should be explainable. Defense Mode will ask.</div>
          </div>
        )}
      </Panel>

      {/* lineage */}
      {(ancestors.length > 0 || descendants.length > 0) && (
        <Panel>
          <SectionTitle>lineage</SectionTitle>
          <div className="space-y-1 text-xs">
            {ancestors.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <span className="text-faint">▲ builds on:</span>
                <Link href={`/papers/${a.id}`} className="text-dim hover:text-acc">{a.title}</Link>
              </div>
            ))}
            <div className="flex items-center gap-2 font-medium text-ink">
              <span className="text-acc">●</span> {p.title} <span className="font-mono text-[10px] text-faint">({p.year})</span>
            </div>
            {descendants.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <span className="text-faint">▼ leads to:</span>
                <Link href={`/papers/${d.id}`} className="text-dim hover:text-acc">{d.title}</Link>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* reproduction */}
      {p.reproduction && (
        <Panel accent="#52d68a">
          <SectionTitle>reproduction path</SectionTitle>
          <div className="text-sm">
            <span className="font-mono text-xs text-acc-robot">{p.reproduction.feasibility.toUpperCase()}</span>
            {p.reproduction.plan && <p className="mt-1 text-[13px] text-dim">{p.reproduction.plan}</p>}
            {p.reproduction.compute && <div className="mt-1 font-mono text-[11px] text-faint">compute: {p.reproduction.compute}</div>}
          </div>
        </Panel>
      )}

      {/* defense */}
      <Panel accent="#e86ea4">
        <SectionTitle>paper defense</SectionTitle>
        <p className="text-[13px] text-dim">
          {p.questions.length + 3} interrogation questions, closed book. The app doesn&apos;t grade you.
          You grade yourself, honestly, answer by answer. Defended means you own this paper.
        </p>
        {defense && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span
              className="rounded px-2 py-0.5 font-mono"
              style={{
                color: defense.verdict === "defended" ? "#52d68a" : defense.verdict === "partial" ? "#e8b34d" : "#f4586e",
                background: defense.verdict === "defended" ? "#52d68a14" : defense.verdict === "partial" ? "#e8b34d14" : "#f4586e14",
              }}
            >
              {defense.verdict.toUpperCase()} · {defense.score}/{defense.total}
            </span>
            <span className="text-faint">last attempt {defense.date}</span>
          </div>
        )}
        <Link href={`/defend/${p.id}`} className="btn btn-acc mt-3">
          {defense ? "Defend again" : "Enter Defense Mode"}
        </Link>
      </Panel>

      {/* status + notes */}
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono-label">status:</span>
          <select
            value={status}
            onChange={(e) => store.setPaperStatus(p.id, e.target.value as PaperStatus)}
            className="!w-auto !py-1 text-xs"
          >
            <option value="queue">queue</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <NotesArea paperId={p.id} />
      </Panel>
    </div>
  );
}

function NotesArea({ paperId }: { paperId: string }) {
  const store = useStore();
  const notes = store.papers[paperId]?.notes ?? "";
  const [val, setVal] = useState(notes);
  return (
    <div className="mt-3">
      <div className="mono-label mb-1">notes: claims / evidence / assumptions / questions</div>
      <textarea
        value={val}
        rows={5}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => store.setPaperStatus(paperId, store.papers[paperId]?.status ?? "queue", val)}
        className="w-full font-mono text-xs"
        placeholder="Three-pass template: (1) claim and contribution, (2) how it works, (3) what you'd probe…"
      />
    </div>
  );
}
