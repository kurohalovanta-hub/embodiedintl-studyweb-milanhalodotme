"use client";

import Link from "next/link";
import { useEffect } from "react";
import { create } from "zustand";
import { useStore } from "@/lib/store";
import { masteryDelta, type MasteryDelta } from "@/lib/engine/delta";
import { bingeSignal } from "@/lib/engine/competency";
import type { IndependenceLevel } from "@/lib/types";
import { TIER_COLORS } from "./ui";

interface MomentState {
  delta: MasteryDelta | null;
  show: (d: MasteryDelta) => void;
  dismiss: () => void;
}

export const useMasteryMoment = create<MomentState>((set) => ({
  delta: null,
  show: (delta) => set({ delta }),
  dismiss: () => set({ delta: null }),
}));

export interface AssessmentResult {
  delta: MasteryDelta | null;
  /** Gate reached but not yet verified — caller should show the quiet inline note. */
  provisional: boolean;
  verified: boolean;
}

/**
 * The one way to record a prove-it/diagnostic from UI (HANDOVERFINAL §26).
 * Appends assessment evidence; state is derived. The full-screen moment fires
 * ONLY on transition into independently-verified (§28: reward follows
 * verification, not the click) — and never while the binge signal is active.
 */
export function assessWithMoment(
  nodeId: string,
  a: { attempt: string; passed: boolean; independence: IndependenceLevel; diagnostic?: boolean; note?: string },
): AssessmentResult {
  const before = useStore.getState().nodes;
  useStore.getState().recordAssessment(nodeId, a);
  const s = useStore.getState();
  const after = s.nodes;
  const delta = masteryDelta(nodeId, before, after);
  const p = after[nodeId];
  const binge = bingeSignal(s.events).active;
  if (delta?.becameVerified && !binge) useMasteryMoment.getState().show(delta);
  return { delta, provisional: !!p?.provisional, verified: !!p?.verified };
}

/** Retention/review path: fires the moment when a review pass completes verification. */
export function reviewWithMoment(nodeId: string, outcome: "failed" | "hard" | "good" | "easy", sketch?: string) {
  const before = useStore.getState().nodes;
  useStore.getState().reviewNode(nodeId, outcome, sketch);
  const s = useStore.getState();
  const delta = masteryDelta(nodeId, before, s.nodes);
  if (delta?.becameVerified && !bingeSignal(s.events).active) useMasteryMoment.getState().show(delta);
  return delta;
}

export function MasteryMomentHost() {
  const { delta, dismiss } = useMasteryMoment();

  useEffect(() => {
    if (!delta) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [delta, dismiss]);

  if (!delta) return null;
  const rankUp = delta.rankAfter.index > delta.rankBefore.index;
  const tierColor = TIER_COLORS[delta.tier];

  return (
    <div
      className="fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      onClick={dismiss}
    >
      <div
        className="scale-in w-full max-w-md overflow-hidden rounded-xl border bg-panel"
        style={{ borderColor: `${tierColor}55` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-6 pt-6 pb-5">
          <div className="mono-label" style={{ color: tierColor }}>
            verified · {delta.tier}
          </div>
          <h2 className="mt-2 font-mono text-lg font-bold tracking-tight text-white">
            {delta.title}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-dim">
            <span className="text-faint">You can now: </span>
            <span className="text-ink">{delta.capability}</span>
          </p>
          {rankUp && (
            <div className="mt-3 rounded-md border border-acc-math/40 bg-acc-math/10 px-3 py-2 text-[13px] text-acc-math">
              Rank {delta.rankAfter.index}: {delta.rankAfter.title}
            </div>
          )}
        </div>

        {(delta.unlockedNodes.length > 0 || delta.readyPapers.length > 0 || delta.readyProjects.length > 0) && (
          <div className="max-h-[44vh] space-y-4 overflow-y-auto px-6 py-5">
            {delta.unlockedNodes.length > 0 && (
              <div>
                <div className="mono-label mb-2 text-acc">unlocked</div>
                <div className="space-y-1.5">
                  {delta.unlockedNodes.map((n) => (
                    <Link
                      key={n.id}
                      href={`/node/${n.id}`}
                      onClick={dismiss}
                      className="flex items-center gap-2 rounded-md border border-acc/25 bg-acc/5 px-3 py-2 text-[13px] text-ink hover:border-acc/60"
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-acc" />
                      <span className="min-w-0 flex-1 truncate">{n.title}</span>
                      <span className="font-mono text-[10px] text-faint">L{n.level}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {delta.readyPapers.length > 0 && (
              <div>
                <div className="mono-label mb-2 text-acc-ml">papers now readable</div>
                {delta.readyPapers.map((p) => (
                  <Link
                    key={p.id}
                    href={`/papers/${p.id}`}
                    onClick={dismiss}
                    className="block truncate py-1 text-[13px] text-acc-ml hover:underline"
                  >
                    ¶ {p.title}
                  </Link>
                ))}
              </div>
            )}
            {delta.readyProjects.length > 0 && (
              <div>
                <div className="mono-label mb-2 text-acc-robot">projects unlocked</div>
                {delta.readyProjects.map((p) => (
                  <Link
                    key={p.id}
                    href="/projects"
                    onClick={dismiss}
                    className="block truncate py-1 text-[13px] text-acc-robot hover:underline"
                  >
                    ⚒ P{p.num} · {p.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-line px-6 py-4">
          <button onClick={dismiss} className="btn btn-acc w-full justify-center">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
