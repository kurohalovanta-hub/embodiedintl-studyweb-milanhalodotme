"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { reviewQueue, upcomingReviews, type ReviewOutcome } from "@/lib/engine/review";
import { reviewWithMoment } from "@/components/MasteryMoment";
import { EmptyState, Panel, SectionTitle } from "@/components/ui";

// Retention with teeth (HANDOVERFINAL §27 + Δ5): a typed sketch is required
// before the grade buttons appear, the outcome is recorded as retention
// evidence, and passing here is what turns a provisional claim into VERIFIED.

export default function ReviewPage() {
  const store = useStore();
  const queue = reviewQueue(store.nodes);
  const upcoming = upcomingReviews(store.nodes);
  const [sketches, setSketches] = useState<Record<string, string>>({});
  const [committed, setCommitted] = useState<Record<string, boolean>>({});

  const grade = (nodeId: string, outcome: ReviewOutcome) => {
    reviewWithMoment(nodeId, outcome, sketches[nodeId]);
    setCommitted((r) => ({ ...r, [nodeId]: false }));
    setSketches((s) => ({ ...s, [nodeId]: "" }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <div className="mono-label">retrieval practice: closed book, then grade yourself honestly</div>
        <h1 className="font-mono text-2xl font-bold">REVIEW · {queue.length} due</h1>
        <p className="mt-1 text-xs text-faint">
          Attempt cold, sketch your answer in 1–2 lines, then grade. Passing a review is what turns a
          claimed node into a <span className="text-acc-robot">verified</span> one, and failing honestly
          re-marks it as needing work. Both directions are the system working.
        </p>
      </div>

      {queue.length === 0 ? (
        <EmptyState title="Queue clear" hint="Claimed and mastered nodes surface here on their spaced schedule." />
      ) : (
        <div className="space-y-3">
          {queue.map((item) => {
            const p = store.nodes[item.nodeId];
            return (
              <Panel key={item.nodeId} accent="#f2934d">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/node/${item.nodeId}`} className="text-sm font-semibold hover:text-acc">{item.title}</Link>
                  <span className="flex items-center gap-2 font-mono text-[11px] text-faint">
                    {p?.provisional && <span className="text-acc-math">verifies on pass</span>}
                    {item.overdueDays > 0 ? `${item.overdueDays}d overdue` : "due today"}
                  </span>
                </div>
                <div className="mt-2 rounded-md border border-line bg-panel2 p-3 text-sm text-ink">
                  {item.prompt}
                </div>
                {!committed[item.nodeId] ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={sketches[item.nodeId] ?? ""}
                      onChange={(e) => setSketches((s) => ({ ...s, [item.nodeId]: e.target.value }))}
                      rows={2}
                      className="w-full font-mono text-[13px]"
                      placeholder="Sketch your answer in 1–2 lines (the act of producing it is the review)…"
                    />
                    <button
                      className="btn"
                      disabled={(sketches[item.nodeId] ?? "").trim().length < 10}
                      onClick={() => setCommitted((r) => ({ ...r, [item.nodeId]: true }))}
                    >
                      Commit, now grade me
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn btn-danger" onClick={() => grade(item.nodeId, "failed")}>✗ failed (1d)</button>
                    <button className="btn" onClick={() => grade(item.nodeId, "hard")}>hard</button>
                    <button className="btn" onClick={() => grade(item.nodeId, "good")}>good</button>
                    <button className="btn btn-acc" onClick={() => grade(item.nodeId, "easy")}>easy</button>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      {upcoming.length > 0 && (
        <Panel>
          <SectionTitle>next 7 days</SectionTitle>
          <div className="space-y-1">
            {upcoming.map((u) => (
              <div key={u.nodeId} className="flex justify-between text-xs">
                <Link href={`/node/${u.nodeId}`} className="text-dim hover:text-acc">{u.title}</Link>
                <span className="font-mono text-faint">{new Date(u.due).toISOString().slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
