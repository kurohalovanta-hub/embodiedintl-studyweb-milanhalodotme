"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PAPERS } from "@/content/papers";
import { NODE_MAP } from "@/content/nodes";
import { useStore } from "@/lib/store";
import { isNodeComplete } from "@/lib/engine/graph";
import { Panel } from "@/components/ui";
import type { Paper, PaperStatus } from "@/lib/types";

const KANBAN: (PaperStatus | "queue")[] = ["queue", "triaged", "reading", "deriving", "reproducing", "reproduced", "modified", "research-lead"];
const RUNGS = [
  { rung: 1, label: "R1 · NN & vision foundations" },
  { rung: 2, label: "R2 · Reinforcement learning" },
  { rung: 3, label: "R3 · Imitation & action generation" },
  { rung: 4, label: "R4 · Generalist policies & VLA" },
  { rung: 5, label: "R5 · World models" },
  { rung: 6, label: "R6 · Sim-to-real & evaluation" },
];
const VERDICT_COLOR: Record<string, string> = { READ: "#a78bfa", "READ+RUN": "#52d68a", SKIM: "#8b97a7" };

export default function PapersPage() {
  return (
    <Suspense>
      <PapersInner />
    </Suspense>
  );
}

function PapersInner() {
  const store = useStore();
  const focus = useSearchParams().get("focus");
  const [view, setView] = useState<"ladder" | "kanban">("ladder");

  const statusOf = (id: string): PaperStatus => store.papers[id]?.status ?? "queue";

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of PAPERS) c[statusOf(p.id)] = (c[statusOf(p.id)] ?? 0) + 1;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.papers]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mono-label">the {PAPERS.length}-paper ladder, no paper tourism</div>
          <h1 className="font-mono text-2xl font-bold">PAPER ROOM</h1>
        </div>
        <div className="flex gap-2">
          <button className={`btn ${view === "ladder" ? "btn-acc" : ""}`} onClick={() => setView("ladder")}>Ladder</button>
          <button className={`btn ${view === "kanban" ? "btn-acc" : ""}`} onClick={() => setView("kanban")}>Kanban</button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {KANBAN.map((col) => (
            <div key={col} className="w-60 shrink-0">
              <div className="mono-label mb-2">{col} · {counts[col] ?? 0}</div>
              <div className="space-y-2">
                {PAPERS.filter((p) => statusOf(p.id) === col).map((p) => (
                  <PaperCard key={p.id} paper={p} status={statusOf(p.id)} compact focused={focus === p.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {RUNGS.map((r) => (
            <div key={r.rung}>
              <div className="mono-label mb-2">{r.label}</div>
              <div className="space-y-2">
                {PAPERS.filter((p) => p.rung === r.rung).map((p) => (
                  <PaperCard key={p.id} paper={p} status={statusOf(p.id)} focused={focus === p.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaperCard({ paper: p, status, compact, focused }: { paper: Paper; status: PaperStatus; compact?: boolean; focused?: boolean }) {
  const store = useStore();
  const unlocked = p.prereqNodeIds.every((id) => {
    const n = NODE_MAP.get(id);
    return n ? isNodeComplete(n, store.nodes) : true;
  });
  const [open, setOpen] = useState(!!focused);

  return (
    <Panel className={`${focused ? "!border-acc" : ""} ${!unlocked && status === "queue" ? "opacity-60" : ""} !p-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-faint">#{p.order}</span>
        {p.spine && <span className="rounded bg-acc-frontier/15 px-1 py-0.5 font-mono text-[9px] text-acc-frontier">SPINE</span>}
        <Link href={`/papers/${p.id}`} className={`min-w-0 flex-1 truncate text-left text-[13px] font-medium hover:text-acc ${compact ? "" : "sm:text-sm"}`}>
          {p.title}
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="rounded px-1 font-mono text-[11px] text-faint hover:text-acc"
          aria-label={open ? "collapse" : "quick view"}
        >
          {open ? "▴" : "▾"}
        </button>
        <span className="rounded px-1.5 py-0.5 font-mono text-[9.5px]" style={{ color: VERDICT_COLOR[p.verdict], background: `${VERDICT_COLOR[p.verdict]}14` }}>
          {p.verdict}
        </span>
        {!compact && <span className="font-mono text-[11px] text-faint">{p.year}</span>}
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-line pt-3 text-sm">
          <div className="flex flex-wrap gap-3 text-xs">
            <Link className="text-acc-frontier hover:underline" href={`/papers/${p.id}`}>study page →</Link>
            <a className="text-acc hover:underline" href={p.url} target="_blank" rel="noopener noreferrer">paper ↗</a>
            {p.codeUrl && <a className="text-acc-robot hover:underline" href={p.codeUrl} target="_blank" rel="noopener noreferrer">code ↗</a>}
            <span className="text-faint">{p.authors}{p.venue ? ` · ${p.venue}` : ""}</span>
          </div>
          <p className="text-[13px] text-dim">{p.whyItMatters}</p>
          <div>
            <div className="mono-label mb-1">key ideas</div>
            {p.keyIdeas.map((k, i) => <div key={i} className="text-xs text-ink">▸ {k}</div>)}
          </div>
          <div>
            <div className="mono-label mb-1">questions to answer in your notes</div>
            {p.questions.map((q, i) => <div key={i} className="text-xs text-dim">? {q}</div>)}
          </div>
          {p.reproduction && (
            <div className="text-xs">
              <span className="mono-label">reproduction:</span>{" "}
              <span className="text-acc-robot">{p.reproduction.feasibility}</span>
              {p.reproduction.plan && <span className="text-dim">: {p.reproduction.plan}</span>}
              {p.reproduction.compute && <span className="text-faint"> ({p.reproduction.compute})</span>}
            </div>
          )}
          {p.prereqNodeIds.length > 0 && (
            <div className="text-xs">
              <span className="mono-label">ready when:</span>{" "}
              {p.prereqNodeIds.map((nid) => (
                <Link key={nid} href={`/node/${nid}`} className={`mr-2 hover:underline ${unlocked ? "text-acc-robot" : "text-acc-math"}`}>
                  {NODE_MAP.get(nid)?.title ?? nid}
                </Link>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
            <span className="mono-label">status:</span>
            <select
              value={status}
              onChange={(e) => store.setPaperStatus(p.id, e.target.value as PaperStatus)}
              className="!w-auto !py-1 text-xs"
            >
              {KANBAN.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <NotesBox paperId={p.id} />
          </div>
        </div>
      )}
    </Panel>
  );
}

function NotesBox({ paperId }: { paperId: string }) {
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const notes = store.papers[paperId]?.notes ?? "";
  if (!editing)
    return (
      <button className="btn !py-1 text-xs" onClick={() => setEditing(true)}>
        {notes ? "edit notes" : "+ notes"}
      </button>
    );
  return (
    <textarea
      autoFocus
      defaultValue={notes}
      rows={4}
      className="w-full font-mono text-xs"
      placeholder="Claims / evidence / assumptions / questions (3-pass template)…"
      onBlur={(e) => {
        store.setPaperStatus(paperId, store.papers[paperId]?.status ?? "queue", e.target.value);
        setEditing(false);
      }}
    />
  );
}
