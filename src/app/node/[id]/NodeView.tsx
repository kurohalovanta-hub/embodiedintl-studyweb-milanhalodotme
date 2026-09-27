"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";
import { NODE_MAP } from "@/content/nodes";
import { paperById } from "@/content/papers";
import { projectById } from "@/content/projects";
import { bossById } from "@/content/bosses";
import { levelById } from "@/content/levels";
import { hasLesson, lessonMeta } from "@/content/lessons/manifest";
import { useStore } from "@/lib/store";
import { nodeState, missingPrereqs, unlocks, DEFAULT_EDGE_TIER } from "@/lib/engine/graph";
import { Katex, NodePill, Panel, SectionTitle, StateBadge, TierBadge, TIER_COLORS } from "@/components/ui";
import { assessWithMoment } from "@/components/MasteryMoment";
import { SmartText } from "@/components/SmartText";
import { AssessmentBox } from "@/components/AssessmentBox";
import { PacketRunner } from "@/components/PacketRunner";
import { independenceFromChoice } from "@/lib/engine/competency";
import { fallbackPacket } from "@/lib/packet-fallback";
import type { LearningPacket } from "@/lib/packet-types";
import { tierAtLeast } from "@/lib/types";

export function NodeView({ id, packet }: { id: string; packet?: LearningPacket | null }) {
  const node = NODE_MAP.get(id);
  const store = useStore();
  if (!node) notFound();
  const level = levelById(node.level);
  const progress = store.nodes;
  const state = nodeState(id, progress);
  const p = progress[id];
  const missing = missingPrereqs(node, progress);
  const boss = bossById(id);
  const dependents = unlocks(id);
  const pk = packet ?? fallbackPacket(node);
  const curated = !!packet;
  const unverifiedPrereqs = node.prereqs
    .map((pr) => ({ pr, prog: progress[pr.id] }))
    .filter((x) => x.prog && tierAtLeast(x.prog.tier, x.pr.tier ?? DEFAULT_EDGE_TIER) && !x.prog.verified)
    .map((x) => NODE_MAP.get(x.pr.id)?.title ?? x.pr.id);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* header — a cinematic glass band with a level-tinted glow */}
      <div
        className="halo-glass relative flex flex-wrap items-start justify-between gap-4 overflow-hidden rounded-2xl p-5 sm:p-6"
        style={{ backgroundImage: `radial-gradient(60% 120% at 100% 0%, ${level.accent}1f 0%, transparent 55%)` }}
      >
        <div className="min-w-0">
          <div className="text-[12px] font-medium">
            <Link href={`/levels/${node.level}`} className="hover:underline" style={{ color: level.accent }}>
              Level {node.level} · {level.title}
            </Link>
            <span className="ml-2 text-dim">{node.track}</span>
            {node.optional && <span className="ml-2 text-acc-math">optional</span>}
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">{node.title}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <StateBadge state={state} />
            {p && p.tier !== "none" && <TierBadge tier={p.tier} />}
            {p?.verified && <span className="rounded bg-acc-robot/15 px-1.5 py-0.5 font-mono text-[10px] text-acc-robot">✓ verified</span>}
            {p?.provisional && (
              <span className="rounded bg-acc-math/15 px-1.5 py-0.5 font-mono text-[10px] text-acc-math">
                {p.legacy ? "legacy claim, unverified" : "claimed, not yet verified"}
              </span>
            )}
            <span className="font-mono text-xs text-faint">packet ≈{Math.round(pk.minutes / 6) / 10}h</span>
            <span className="font-mono text-xs text-faint">gate: {node.masteryGate}</span>
          </div>
          {unverifiedPrereqs.length > 0 && (
            <div className="mt-1 text-[11px] text-faint">
              still shaky underneath: {unverifiedPrereqs.slice(0, 3).join(" · ")}
              {unverifiedPrereqs.length > 3 ? ` +${unverifiedPrereqs.length - 3}` : ""}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {hasLesson(id) && (
            <Link href={`/learn/${id}`} className="btn btn-acc" onClick={() => store.startNode(id)}>
              ⚡ {store.lessons[id]?.completedAt ? "Reopen lesson" : store.lessons[id] ? "Continue lesson" : "Open lesson"}
              <span className="font-mono text-[10px] opacity-70">{lessonMeta(id)?.minutes}m</span>
            </Link>
          )}
          {state !== "locked" && p?.status !== "mastered" && (
            <button className={`btn ${hasLesson(id) ? "" : "btn-acc"}`} onClick={() => store.startNode(id)}>
              {p?.status === "learning" ? "In progress" : "▶ Start"}
            </button>
          )}
        </div>
      </div>

      {/* why */}
      <Panel accent={level.accent}>
        <SectionTitle>Why this is worth your time</SectionTitle>
        <p className="text-[15.5px] leading-[1.7] text-ink"><SmartText>{pk.whyNow}</SmartText></p>
      </Panel>

      {/* repair-class nodes lead with the test-out (Δ1: test out first, patch only gaps) */}
      {pk.diagnostic?.repair && (
        <Panel accent="#e8b34d">
          <SectionTitle>Test out first, then fix only what breaks</SectionTitle>
          <p className="text-[14.5px] leading-[1.7] text-dim"><SmartText>{pk.diagnostic.prompt}</SmartText></p>
          <p className="mt-1 mb-2 text-[11px] text-faint">
            ~{pk.diagnostic.minutes} min. Pass → skip this node. Everything below is only for
            patching what the diagnostic exposes.
          </p>
          <AssessmentBox id={id} diagnostic />
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* objectives */}
          <Panel>
            <SectionTitle>What you&apos;ll be able to do</SectionTitle>
            <ul className="space-y-1.5">
              {node.objectives.map((o, i) => (
                <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-ink">
                  <span className="text-acc">▸</span>
                  {o}
                </li>
              ))}
            </ul>
            {node.skip && node.skip.length > 0 && (
              <div className="mt-3 border-t border-line pt-2">
                <div className="mb-1 text-[11px] font-medium text-faint">Skip these</div>
                {node.skip.map((s, i) => (
                  <div key={i} className="text-xs text-faint">⊘ {s}</div>
                ))}
              </div>
            )}
          </Panel>

          {/* equations */}
          {node.equations && node.equations.length > 0 && (
            <Panel>
              <SectionTitle>The equations you&apos;ll use</SectionTitle>
              <div className="space-y-2 rounded-md bg-panel2 p-3">
                {node.equations.map((eq, i) => (
                  <Katex key={i} tex={eq} block />
                ))}
              </div>
            </Panel>
          )}

          {/* the academy path (§19) */}
          <div>
            <div className="section-title mb-2.5">Your path, one step at a time</div>
            <PacketRunner packet={pk} curated={curated} />
          </div>

          {/* misconceptions */}
          {node.misconceptions && node.misconceptions.length > 0 && (
            <Panel>
              <SectionTitle>Where people trip up</SectionTitle>
              {node.misconceptions.map((m, i) => (
                <div key={i} className="text-[14.5px] leading-relaxed text-dim">✗ {m}</div>
              ))}
            </Panel>
          )}

          {/* boss extras */}
          {boss && (
            <Panel accent="#f4586e">
              <SectionTitle>The test that proves it</SectionTitle>
              <p className="text-sm text-ink">{boss.scenario}</p>
              <div className="mono-label mt-3 mb-1">pass criteria</div>
              <ul className="space-y-1">
                {boss.passCriteria.map((c, i) => (
                  <li key={i} className="text-sm text-dim">□ {c}</li>
                ))}
              </ul>
              <div className="mono-label mt-3 mb-1">on failure → remediation quests</div>
              <div className="space-y-1.5">
                {boss.remediation.map((r, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-acc-math">{r.weakness}:</span>{" "}
                    {r.nodeIds.map((nid) => (
                      <Link key={nid} href={`/node/${nid}`} className="mr-2 text-acc hover:underline">
                        {NODE_MAP.get(nid)?.title}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
              <BossAttemptBox bossId={id} />
            </Panel>
          )}

        </div>

        {/* sidebar */}
        <div className="space-y-5">
          <Panel>
            <SectionTitle>Comes before this</SectionTitle>
            {node.prereqs.length === 0 ? (
              <div className="text-sm text-faint">None. This is a root node.</div>
            ) : (
              <div className="space-y-1.5">
                {node.prereqs.map((pr) => {
                  const pn = NODE_MAP.get(pr.id)!;
                  const ok = !missing.some((m) => m.id === pr.id);
                  return (
                    <div key={pr.id} className="flex items-center gap-2">
                      <span className={ok ? "text-acc-robot" : "text-faint"}>{ok ? "✓" : "○"}</span>
                      <Link href={`/node/${pr.id}`} className="min-w-0 flex-1 truncate text-sm text-ink hover:text-acc">
                        {pn.title}
                      </Link>
                      <span className="font-mono text-[10px]" style={{ color: TIER_COLORS[pr.tier ?? DEFAULT_EDGE_TIER] }}>
                        ≥{pr.tier ?? DEFAULT_EDGE_TIER}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionTitle>Opens up next</SectionTitle>
            {dependents.length === 0 ? (
              <div className="text-sm text-faint">Terminal node.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {dependents.map((d) => (
                  <NodePill key={d.id} id={d.id} title={d.title} state={nodeState(d.id, progress)} />
                ))}
              </div>
            )}
          </Panel>

          {(node.projectIds?.length || node.paperIds?.length) && (
            <Panel>
              <SectionTitle>Related work</SectionTitle>
              {node.projectIds?.map((pid) => {
                const proj = projectById(pid);
                return proj ? (
                  <Link key={pid} href="/projects" className="block text-sm text-acc-robot hover:underline">
                    ⚒ P{proj.num} · {proj.title}
                  </Link>
                ) : null;
              })}
              {node.paperIds?.map((pid) => {
                const paper = paperById(pid);
                return paper ? (
                  <Link key={pid} href={`/papers?focus=${pid}`} className="block text-sm text-acc-ml hover:underline">
                    ¶ {paper.title}
                  </Link>
                ) : null;
              })}
            </Panel>
          )}

          {node.computeNote && (
            <Panel>
              <SectionTitle>Compute you&apos;ll need</SectionTitle>
              <p className="text-xs text-dim">{node.computeNote}</p>
            </Panel>
          )}

          <Panel>
            <details>
              <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-dim hover:text-acc">
                already know this? test out
              </summary>
              <p className="mt-2 text-sm text-dim"><SmartText>{node.diagnostic}</SmartText></p>
              <p className="mt-1 text-[11px] text-faint">
                Prove it cold below. Passing skips this node now (never wait on the calendar). A quick
                review lands in ~2 days to make sure it was real.
              </p>
              <AssessmentBox id={id} diagnostic />
            </details>
          </Panel>
        </div>
      </div>
    </div>
  );
}



function BossAttemptBox({ bossId }: { bossId: string }) {
  const store = useStore();
  const boss = bossById(bossId);
  const [notes, setNotes] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [choice, setChoice] = useState<"myself" | "hints" | "ai" | null>(null);
  const attempts = store.bossAttempts.filter((a) => a.bossId === bossId);
  const criteria = boss?.passCriteria ?? [];
  const allChecked = criteria.length > 0 && checked.size === criteria.length;
  const canPass = allChecked && notes.trim().length >= 30 && !!choice;

  const toggle = (i: number) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });

  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="mono-label mb-1.5">attempts</div>
      {attempts.map((a) => (
        <div key={a.id} className="mb-1 text-xs">
          <span className={a.passed ? "text-acc-robot" : "text-acc-frontier"}>{a.passed ? "✓ PASSED" : "✗ failed"}</span>
          <span className="ml-2 font-mono text-faint">{a.date}</span>
          {a.notes && <span className="ml-2 text-dim">{a.notes}</span>}
        </div>
      ))}
      <div className="mono-label mb-1 mt-3">pass criteria: check each only when it is true</div>
      <div className="space-y-1">
        {criteria.map((c, i) => (
          <label key={i} className="flex cursor-pointer items-start gap-2 text-[13px] text-dim">
            <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} className="mt-0.5 !w-auto" />
            <span>{c}</span>
          </label>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="mt-2 w-full text-[13px]"
        placeholder="What you built / where the run lives / weaknesses found (min 30 chars)…"
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {([["myself", "did it myself"], ["hints", "with hints"], ["ai", "AI-heavy"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setChoice(k)}
            className="rounded-md border px-2 py-1 text-[11px]"
            style={{
              borderColor: choice === k ? "#4dd6e888" : "var(--color-line2)",
              color: choice === k ? "#4dd6e8" : "var(--color-dim)",
            }}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 border-l border-line" />
        <button
          className="btn !py-1.5 text-xs"
          onClick={() => {
            store.recordBossAttempt({ bossId, date: new Date().toISOString().slice(0, 10), passed: false, notes });
            store.recordEvidence({ nodeId: bossId, kind: "assessment", outcome: "fail", attempt: notes, note: "boss attempt" });
            setNotes(""); setChecked(new Set()); setChoice(null);
          }}
        >
          Log fail
        </button>
        <button
          className="btn btn-acc !py-1.5 text-xs disabled:opacity-35"
          disabled={!canPass}
          title={!canPass ? "All criteria checked, notes, and an honesty declaration are required" : undefined}
          onClick={() => {
            if (!choice) return;
            store.recordBossAttempt({ bossId, date: new Date().toISOString().slice(0, 10), passed: true, notes });
            assessWithMoment(bossId, {
              attempt: `criteria: ${criteria.map((_, i) => (checked.has(i) ? "✓" : "✗")).join("")} · ${notes}`,
              passed: true,
              independence: independenceFromChoice(choice),
              note: "boss",
            });
            setNotes(""); setChecked(new Set()); setChoice(null);
          }}
        >
          ✓ Passed
        </button>
      </div>
    </div>
  );
}
