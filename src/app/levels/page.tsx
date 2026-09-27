"use client";

import Link from "next/link";
import { LEVELS } from "@/content/levels";
import { nodesForLevel } from "@/content/nodes";
import { useStore } from "@/lib/store";
import { levelCompletion, bossPassed } from "@/lib/engine/mastery";
import { Bar, Panel } from "@/components/ui";
import { PHASES } from "@/content/schedule";
import { dayOfProgram } from "@/lib/engine/pacing";

export default function LevelsPage() {
  const store = useStore();
  const progress = store.nodes;
  const day = dayOfProgram(store.settings);

  return (
    <div className="space-y-5">
      <div>
        <div className="mono-label">the 210-day macro-map</div>
        <h1 className="font-mono text-2xl font-bold">LEVELS</h1>
      </div>

      {/* phase band */}
      <Panel>
        <div className="flex gap-1">
          {PHASES.map((p) => {
            const active = day != null && day >= p.days[0] && day <= p.days[1];
            return (
              <div key={p.month} className="flex-1" title={`${p.title}: ${p.primary}`}>
                <div
                  className="h-2 rounded-sm"
                  style={{ background: active ? "#4dd6e8" : "#1d2733" }}
                />
                <div className={`mt-1 text-center font-mono text-[10px] ${active ? "text-acc" : "text-faint"}`}>M{p.month}</div>
              </div>
            );
          })}
        </div>
        {day != null && (
          <div className="mt-1 text-center text-xs text-dim">
            {PHASES.find((p) => day >= p.days[0] && day <= p.days[1])?.title ?? "Research sprint"}. The calendar paces, mastery gates.
          </div>
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {LEVELS.map((l) => {
          const nodes = nodesForLevel(l.id);
          const core = nodes.filter((n) => !n.optional);
          const hours = core.reduce((s, n) => s + n.hours, 0);
          const completion = levelCompletion(l.id, progress);
          const boss = l.bossId ? bossPassed(l.bossId, progress) : null;
          return (
            <Link key={l.id} href={`/levels/${l.id}`}>
              <Panel className="hover-raise h-full" accent={l.accent}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="mono-label" style={{ color: l.accent }}>
                      L{l.id} · {l.codename} · days {l.phase.startDay}–{l.phase.endDay}
                    </div>
                    <div className="mt-0.5 text-[15px] font-semibold">{l.title}</div>
                  </div>
                  {l.bossId && (
                    <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${boss ? "bg-acc-robot/15 text-acc-robot" : "bg-panel2 text-faint"}`}>
                      {boss ? "BOSS ✓" : "BOSS"}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-dim">{l.goal}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1"><Bar value={completion} color={l.accent} /></div>
                  <span className="font-mono text-[11px] text-faint">
                    {Math.round(completion * 100)}% · {core.length} nodes · {hours}h
                  </span>
                </div>
              </Panel>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
