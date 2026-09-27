"use client";

import Link from "next/link";
import { BOSSES } from "@/content/bosses";
import { NODE_MAP } from "@/content/nodes";
import { levelById } from "@/content/levels";
import { useStore } from "@/lib/store";
import { nodeState, missingPrereqs } from "@/lib/engine/graph";
import { bossPassed } from "@/lib/engine/mastery";
import { Panel, SectionTitle } from "@/components/ui";

export default function BossesPage() {
  const store = useStore();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <div className="mono-label">synthesis gates: evidence, not attendance</div>
        <h1 className="font-mono text-2xl font-bold">BOSS FIGHTS</h1>
      </div>

      <div className="space-y-4">
        {BOSSES.map((b) => {
          const node = NODE_MAP.get(b.id)!;
          const level = levelById(b.level);
          const passed = bossPassed(b.id, store.nodes);
          const state = nodeState(b.id, store.nodes);
          const missing = missingPrereqs(node, store.nodes);
          const attempts = store.bossAttempts.filter((a) => a.bossId === b.id);
          return (
            <Panel key={b.id} accent={passed ? "#52d68a" : level.accent} className={state === "locked" && !passed ? "opacity-70" : ""}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl" style={{ color: passed ? "#52d68a" : "#f4586e" }}>◆</span>
                  <div>
                    <div className="mono-label" style={{ color: level.accent }}>level {b.level} gate · ~{b.hours}h</div>
                    <div className="text-lg font-bold">{b.title}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {passed ? (
                    <span className="rounded bg-acc-robot/15 px-2 py-1 font-mono text-xs text-acc-robot">DEFEATED</span>
                  ) : state === "locked" ? (
                    <span className="rounded bg-panel2 px-2 py-1 font-mono text-xs text-faint">LOCKED · {missing.length} gate(s) remain</span>
                  ) : (
                    <span className="rounded bg-acc/10 px-2 py-1 font-mono text-xs text-acc pulse-dot">CHALLENGEABLE</span>
                  )}
                  <Link href={`/node/${b.id}`} className="btn">open arena →</Link>
                </div>
              </div>
              <p className="mt-3 text-sm text-dim">{b.scenario}</p>
              {!passed && missing.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="mono-label mr-2">unlock by:</span>
                  {missing.map((m) => (
                    <Link key={m.id} href={`/node/${m.id}`} className="mr-3 text-acc-math hover:underline">
                      {NODE_MAP.get(m.id)?.title} → {(m.tier ?? "silver").toUpperCase()}
                    </Link>
                  ))}
                </div>
              )}
              {attempts.length > 0 && (
                <div className="mt-3 border-t border-line pt-2">
                  <SectionTitle>history</SectionTitle>
                  {attempts.map((a) => (
                    <div key={a.id} className="text-xs">
                      <span className={a.passed ? "text-acc-robot" : "text-acc-frontier"}>{a.passed ? "✓" : "✗"}</span>
                      <span className="ml-2 font-mono text-faint">{a.date}</span>
                      {a.notes && <span className="ml-2 text-dim">{a.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
