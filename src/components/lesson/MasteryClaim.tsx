"use client";

import Link from "next/link";
import type { SkillNode } from "@/lib/types";
import { useStore } from "@/lib/store";
import { nodeState } from "@/lib/engine/graph";
import { AssessmentBox } from "../AssessmentBox";

/** The gate, embedded at the end of a lesson: prove it, then it verifies. */
export function MasteryClaim({ node }: { node: SkillNode }) {
  const store = useStore();
  const p = store.nodes[node.id];
  const state = nodeState(node.id, store.nodes);
  const locked = state === "locked";

  return (
    <div className="overflow-hidden rounded-lg border border-acc-robot/30">
      <div className="border-b border-acc-robot/20 bg-acc-robot/[0.06] px-4 py-2.5">
        <div className="mono-label text-acc-robot">the mastery gate: prove it, then it verifies</div>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-[13.5px] leading-relaxed text-ink">
          <span className="mono-label mr-2 text-acc-robot">the bar →</span>
          {node.masteryTest}
        </p>
        {p?.verified && (
          <div className="text-xs text-acc-robot">✓ Independently verified: an assessment plus a later review both held.</div>
        )}
        {p?.provisional && (
          <div className="text-xs text-acc-math">
            {p.legacy
              ? "Current tier rests on a legacy claim. Re-prove it below to verify."
              : "Claimed, not yet verified. Passing the ~2-day review verifies it."}
          </div>
        )}
        {locked ? (
          <div className="text-xs text-faint">
            Locked. Clear the prerequisite gates first (or prove them via their test-outs on the{" "}
            <Link href={`/node/${node.id}`} className="text-acc hover:underline">node page</Link>).
          </div>
        ) : (
          <AssessmentBox id={node.id} />
        )}
      </div>
    </div>
  );
}
