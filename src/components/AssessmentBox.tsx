"use client";

import { useState } from "react";
import { NODE_MAP } from "@/content/nodes";
import { assessWithMoment, type AssessmentResult } from "@/components/MasteryMoment";
import { independenceFromChoice } from "@/lib/engine/competency";
import { openTutorTask } from "@/lib/tutor-task";

/**
 * The prove-it flow (HANDOVERFINAL §26): typed closed-book attempt → commit →
 * self-verdict against the stated bar with an explicit honesty declaration.
 * No tier buttons anywhere. State is derived from the recorded evidence.
 */
export function AssessmentBox({ id, diagnostic }: { id: string; diagnostic?: boolean }) {
  const node = NODE_MAP.get(id)!;
  const [attempt, setAttempt] = useState("");
  const [committed, setCommitted] = useState(false);
  const [choice, setChoice] = useState<"myself" | "hints" | "ai" | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  // L0–L1 prove-its are do-tasks (paste output); short commits are legitimate there (Δ3)
  const minLen = node.level <= 1 ? 20 : 40;

  const record = (passed: boolean) => {
    if (!choice) return;
    const res = assessWithMoment(id, {
      attempt,
      passed,
      independence: independenceFromChoice(choice),
      diagnostic,
    });
    setResult(res);
  };

  if (result) {
    return (
      <div className="rise-in rounded-md border border-line bg-panel2/70 px-3 py-2.5 text-sm">
        {result.verified ? (
          <span className="text-acc-robot">✓ Verified.</span>
        ) : result.provisional ? (
          <span className="text-dim">
            <span className="text-acc-robot">Recorded.</span> Gate reached,{" "}
            <span className="text-acc-math">verifies at your next review (≈2 days)</span>. Unlocks are live now.
          </span>
        ) : (
          <span className="text-dim">
            Recorded honestly. The gap you found is what to study next. Work the practice again, then retry.
          </span>
        )}
        <button
          className="btn mt-2 block !py-1 text-xs"
          onClick={() => { setResult(null); setAttempt(""); setCommitted(false); setChoice(null); }}
        >
          new attempt
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!committed ? (
        <>
          <textarea
            value={attempt}
            onChange={(e) => setAttempt(e.target.value)}
            rows={4}
            className="w-full font-mono text-[13px]"
            placeholder={
              diagnostic
                ? "Closed book: answer the test-out above here (or do it in your editor and paste the result)…"
                : "Closed book: work the bar above here: derivation, answer, or paste your artifact/output…"
            }
          />
          <button className="btn btn-acc !py-1.5 text-xs" disabled={attempt.trim().length < minLen} onClick={() => setCommitted(true)}>
            Commit attempt{attempt.trim().length < minLen ? ` (${minLen - attempt.trim().length} more chars)` : ""}
          </button>
        </>
      ) : (
        <div className="rise-in space-y-2">
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 font-mono text-[12px] text-dim">
            {attempt.length > 400 ? attempt.slice(0, 400) + "…" : attempt}
          </div>
          <button
            className="rounded-md border border-acc-robot/40 bg-panel2 px-2.5 py-1.5 font-mono text-[11.5px] text-acc-robot transition-colors hover:bg-acc-robot/10"
            onClick={() => openTutorTask({
              mode: diagnostic ? "diagnose" : "examine",
              text: `Grade my ${diagnostic ? "diagnostic" : "closed-book"} attempt for "${node.title}" against this bar:\n\n${diagnostic ? node.diagnostic : node.masteryTest}\n\nMY ATTEMPT:\n${attempt}\n\nBe a strict examiner: say clearly whether it holds, name every gap or error, and end with a one-line verdict (PASS / NOT YET). Do not soften it. I still record my own honest verdict below.`,
            })}
          >
            ▸ have Claude grade this
          </button>
          <div className="text-xs text-dim">Then judge it against the bar yourself, honestly. How did you produce this?</div>
          <div className="flex flex-wrap gap-1.5">
            {([
              ["myself", "I did this myself"],
              ["hints", "I used hints"],
              ["ai", "AI produced much of it"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setChoice(k)}
                className="rounded-md border px-2.5 py-1.5 text-xs transition-colors"
                style={{
                  borderColor: choice === k ? "#4dd6e888" : "var(--color-line2)",
                  color: choice === k ? "#4dd6e8" : "var(--color-dim)",
                  background: choice === k ? "#4dd6e814" : "var(--color-panel2)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {choice === "ai" && (
            <div className="text-[11px] text-acc-math">
              Honest answer. This attempt can reach Silver at most. Redo it yourself later for the gate.
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn btn-acc !py-1.5 text-xs" disabled={!choice} onClick={() => record(true)}>
              ✓ It held
            </button>
            <button className="btn btn-danger !py-1.5 text-xs" disabled={!choice} onClick={() => record(false)}>
              ✗ It didn&apos;t hold
            </button>
            <button className="btn !py-1.5 text-xs" onClick={() => setCommitted(false)}>edit</button>
          </div>
        </div>
      )}
    </div>
  );
}
