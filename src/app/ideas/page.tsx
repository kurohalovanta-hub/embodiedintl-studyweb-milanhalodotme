"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { EmptyState, Panel, SectionTitle } from "@/components/ui";
import type { Idea } from "@/lib/types";

// HANDOVER §16 scoring dimensions
const DIMENSIONS = [
  "novelty", "importance", "tractability", "data availability", "sim feasibility",
  "hardware independence", "benchmark quality", "time to first experiment", "measurable result odds", "learning value",
];

const STATUS_COLOR: Record<Idea["status"], string> = {
  inbox: "#4dd6e8", scored: "#e8b34d", promoted: "#52d68a", dropped: "#5a6675",
};

export default function IdeasPage() {
  const store = useStore();
  const [draft, setDraft] = useState("");
  const ideas = [...store.ideas].sort((a, b) => (total(b) - total(a)) || b.createdAt - a.createdAt);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <div className="mono-label">capture during learning · score later · promote in month 7</div>
        <h1 className="font-mono text-2xl font-bold">RESEARCH IDEA INBOX</h1>
      </div>

      <Panel accent="#e86ea4">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && draft.trim() && (store.upsertIdea({ title: draft.trim() }), setDraft(""))}
            placeholder="What if… (capture now, judge later)"
          />
          <button className="btn btn-acc shrink-0" disabled={!draft.trim()} onClick={() => { store.upsertIdea({ title: draft.trim() }); setDraft(""); }}>
            Capture
          </button>
        </div>
      </Panel>

      {ideas.length === 0 ? (
        <EmptyState title="Inbox empty" hint="Questions you can't answer yet are research leads. Write them down mid-node." />
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
}

function total(i: Idea): number {
  if (!i.scores) return -1;
  return Object.values(i.scores).reduce((a, b) => a + b, 0);
}

function IdeaCard({ idea }: { idea: Idea }) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const t = total(idea);

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[idea.status] }} />
        <button onClick={() => setOpen(!open)} className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-acc">
          {idea.title}
        </button>
        {t >= 0 && <span className="font-mono text-xs text-acc-math">{t}/{DIMENSIONS.length * 5}</span>}
        <select
          value={idea.status}
          onChange={(e) => store.upsertIdea({ id: idea.id, status: e.target.value as Idea["status"] })}
          className="!w-auto !py-1 text-xs"
        >
          {Object.keys(STATUS_COLOR).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-danger !py-1 text-xs" onClick={() => store.deleteIdea(idea.id)}>×</button>
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <textarea
            rows={2}
            placeholder="Sharpen it: what's the falsifiable version? the first experiment?"
            value={idea.note ?? ""}
            onChange={(e) => store.upsertIdea({ id: idea.id, note: e.target.value })}
            className="text-[13px]"
          />
          <div>
            <SectionTitle>score (1–5 each · HANDOVER §16)</SectionTitle>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {DIMENSIONS.map((d) => (
                <div key={d} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-dim">{d}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => store.upsertIdea({ id: idea.id, status: idea.status === "inbox" ? "scored" : idea.status, scores: { ...idea.scores, [d]: v } })}
                        className="size-5 rounded text-[10px] font-mono"
                        style={{
                          background: (idea.scores?.[d] ?? 0) >= v ? "#e8b34d33" : "#1a2431",
                          color: (idea.scores?.[d] ?? 0) >= v ? "#e8b34d" : "#5a6675",
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
