"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { logsInLastDays, totalFocusedHours, independencePct } from "@/lib/engine/metrics";
import { pacingStatus, DESCOPE_LEVERS } from "@/lib/engine/pacing";
import { Panel, SectionTitle, Stat } from "@/components/ui";

// HANDOVER §23 — the seventh-day ritual.
const QUESTIONS: { key: string; label: string; ph: string }[] = [
  { key: "learned", label: "What I truly learned (could rebuild cold)", ph: "Closed-book proof: what did you re-derive/re-implement this week?" },
  { key: "recognized", label: "What I merely recognized", ph: "Honest list. These go back into the queue" },
  { key: "forgot", label: "What I forgot (review-queue evidence)", ph: "Which retrieval prompts failed?" },
  { key: "blockers", label: "What blocks next week", ph: "Concrete, named blockers" },
  { key: "remove", label: "What should be removed from the plan", ph: "Cut with reasons. The audit gives permission" },
  { key: "accelerate", label: "What should be accelerated", ph: "Where did the diagnostics say 'skip ahead'?" },
  { key: "explain", label: "Explain-back (Feynman check)", ph: "Paste your explanation of the week's hardest concept. Where did it wobble?" },
];

function isoWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export default function WeeklyPage() {
  const store = useStore();
  const week = isoWeek();
  const saved = store.weeklies[week];
  const [answers, setAnswers] = useState<Record<string, string>>(saved?.answers ?? {});
  const logs7 = logsInLastDays(store.logs, 7);
  const hours = totalFocusedHours(logs7);
  const indep = independencePct(logs7);
  const pace = pacingStatus(store.settings, store.nodes);
  const byBlock = logs7.reduce<Record<string, number>>((acc, l) => {
    acc[l.block] = (acc[l.block] ?? 0) + l.minutes;
    return acc;
  }, {});

  const pastWeeks = Object.keys(store.weeklies).filter((w) => w !== week).sort().reverse();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <div className="mono-label">the seventh-day ritual (HANDOVER §23)</div>
        <h1 className="font-mono text-2xl font-bold">WEEKLY REVIEW · {week}</h1>
        {saved?.done && <div className="mt-1 text-xs text-acc-robot">✓ completed this week</div>}
      </div>

      {/* audits */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="hours (7d)" value={hours} sub="target 30–42" />
        <Stat label="independence" value={indep != null ? `${indep}%` : "—"} sub="AI-dependence audit" accent={indep != null && indep < 60 ? "#f4586e" : "#4dd6e8"} />
        <Stat label="pace" value={pace ? pace.verdict : "—"} accent={pace?.verdict === "far-behind" ? "#f4586e" : pace?.verdict === "behind" ? "#e8b34d" : "#52d68a"} sub={pace && pace.drift < 0 ? `${-pace.drift}d drift` : "vs 210-day overlay"} />
        <Stat label="creation ratio" value={ratio(byBlock)} sub="build ÷ consume minutes" />
      </div>

      <Panel>
        <SectionTitle>hours by block (7d)</SectionTitle>
        <div className="flex flex-wrap gap-3">
          {Object.entries(byBlock).map(([b, m]) => (
            <span key={b} className="font-mono text-xs text-dim">{b}: <b className="text-ink">{(m / 60).toFixed(1)}h</b></span>
          ))}
          {logs7.length === 0 && <span className="text-sm text-faint">No logs this week.</span>}
        </div>
      </Panel>

      {pace && pace.verdict !== "on-pace" && pace.verdict !== "ahead" && (
        <Panel accent="#e8b34d">
          <SectionTitle>plan adjustment: the pre-agreed levers</SectionTitle>
          {DESCOPE_LEVERS.map((l, i) => (
            <div key={i} className="text-xs text-dim">▸ {l}</div>
          ))}
        </Panel>
      )}

      <div className="space-y-3">
        {QUESTIONS.map((q) => (
          <Panel key={q.key}>
            <div className="mono-label mb-1.5">{q.label}</div>
            <textarea
              rows={2}
              value={answers[q.key] ?? ""}
              placeholder={q.ph}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
              className="text-[13px]"
            />
          </Panel>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          className="btn btn-acc"
          onClick={() => store.saveWeekly({ week, answers, done: true, updatedAt: Date.now() })}
        >
          ✓ Complete weekly review
        </button>
        <button className="btn" onClick={() => store.saveWeekly({ week, answers, done: false, updatedAt: Date.now() })}>
          Save draft
        </button>
      </div>

      {pastWeeks.length > 0 && (
        <Panel>
          <SectionTitle>past weeks</SectionTitle>
          {pastWeeks.map((w) => (
            <details key={w} className="mb-2">
              <summary className="cursor-pointer font-mono text-xs text-dim hover:text-acc">{w} {store.weeklies[w].done ? "✓" : "(draft)"}</summary>
              <div className="mt-2 space-y-2 pl-3">
                {QUESTIONS.map((q) =>
                  store.weeklies[w].answers[q.key] ? (
                    <div key={q.key}>
                      <div className="mono-label">{q.label}</div>
                      <p className="text-xs text-dim">{store.weeklies[w].answers[q.key]}</p>
                    </div>
                  ) : null,
                )}
              </div>
            </details>
          ))}
        </Panel>
      )}
    </div>
  );
}

function ratio(byBlock: Record<string, number>): string {
  const create = (byBlock.implementation ?? 0) + (byBlock.project ?? 0) + (byBlock.research ?? 0);
  const consume = (byBlock.math ?? 0) + (byBlock.specialization ?? 0) + (byBlock.papers ?? 0);
  if (consume === 0) return create > 0 ? "∞" : "—";
  return (create / consume).toFixed(2);
}
