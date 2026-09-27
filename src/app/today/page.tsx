"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { todaysMission } from "@/lib/engine/scheduler";
import { reviewQueue } from "@/lib/engine/review";
import { dayOfProgram, currentPhase } from "@/lib/engine/pacing";
import { NODE_MAP } from "@/content/nodes";
import { PACKET_REGISTRY } from "@/content/packets/registry";
import { hasLesson } from "@/content/lessons/manifest";
import { unlocks } from "@/lib/engine/graph";
import { fallbackPacket } from "@/lib/packet-fallback";
import type { LearningPacket } from "@/lib/packet-types";
import type { Block, Independence, SkillNode } from "@/lib/types";
import { LiveTutor } from "@/components/tutor/LiveTutor";
import { Panel } from "@/components/ui";
import { SmartText } from "@/components/SmartText";

// ONE objective (HANDOVERFINAL §30): the current bottleneck, its capability
// target, the next few packet steps — and nothing else above the fold.


// turn drill-sergeant step labels ("WATCH — 12 min") into a calm human line
function humanStep(label: string): string {
  const m = label.replace("—", "·");
  return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
    .replace("prove it", "Prove it").replace("build / derive", "Build it")
    .replace("read ", "Read ").replace("watch", "Watch").replace("recall", "Recall").replace("work", "Work");
}


// short, human encouragement — names the payoff, never gamified praise
function encouragement(loggedMin: number, unlocks?: string): string {
  if (loggedMin > 0) return "You've already started today. Keep the thread going while it's warm.";
  const lines = [
    unlocks ? `Clear this and ${unlocks} opens up. One block is all it takes.` : "One thing today. That's the whole job.",
    "You don't have to finish it all at once. Start the first step and momentum does the rest.",
    "Small, honest reps beat a heroic all-nighter. Ten focused minutes still counts.",
  ];
  return lines[0];
}

export default function TodayPage() {
  const store = useStore();
  const data = store.exportData();
  const mission = todaysMission(data);
  const day = dayOfProgram(data.settings);
  const phase = day ? currentPhase(day) : null;
  const reviews = reviewQueue(data.nodes);
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = data.logs.filter((l) => l.date === today);
  const loggedMin = todayLogs.reduce((s, l) => s + l.minutes, 0);
  const beginner = (data.settings.experienceMode ?? "beginner") === "beginner";

  // the bottleneck: most recently worked incomplete node, else the scheduler's pick
  const bottleneck: SkillNode | null = useMemo(() => {
    const recent = [...store.events].reverse().find((e) => {
      const n = NODE_MAP.get(e.nodeId);
      const p = store.nodes[e.nodeId];
      return !!n && e.kind !== "manual-override" && (!p || p.status !== "mastered");
    });
    if (recent) return NODE_MAP.get(recent.nodeId) ?? null;
    const slot = mission.slots.find((s) => s.node)?.node;
    return slot ?? (mission.masteryCheck ? NODE_MAP.get(mission.masteryCheck.nodeId) ?? null : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.events, store.nodes]);

  // curated packets load async; the loaded state is keyed by node id so a stale
  // packet never renders for a new bottleneck (and no sync setState in the effect)
  const [loaded, setLoaded] = useState<{ id: string; packet: LearningPacket } | null>(null);
  useEffect(() => {
    if (!bottleneck || !PACKET_REGISTRY[bottleneck.id]) return;
    let alive = true;
    PACKET_REGISTRY[bottleneck.id]().then((m) => {
      if (alive) setLoaded({ id: bottleneck.id, packet: m.packet });
    });
    return () => { alive = false; };
  }, [bottleneck]);
  const packet = useMemo<LearningPacket | null>(() => {
    if (!bottleneck) return null;
    if (loaded?.id === bottleneck.id) return loaded.packet;
    return PACKET_REGISTRY[bottleneck.id] ? null : fallbackPacket(bottleneck);
  }, [bottleneck, loaded]);

  const ev = useMemo(
    () => (bottleneck ? store.events.filter((e) => e.nodeId === bottleneck.id) : []),
    [store.events, bottleneck],
  );
  const stepStates = useMemo(() => {
    if (!packet) return [];
    const has = (pred: (e: (typeof ev)[number]) => boolean) => ev.some(pred);
    const allWatch = [...(packet.orient ? [packet.orient] : []), ...(packet.coreWatch ?? [])];
    const out: { label: string; done: boolean }[] = [];
    if (allWatch.length)
      out.push({ label: `WATCH — ${allWatch.reduce((s, m) => s + m.minutes, 0)} min`, done: allWatch.every((m) => has((e) => e.kind === "exposure" && e.note === `watched:${m.url}`)) });
    if (packet.recall?.length)
      out.push({ label: `RECALL — ${packet.recall.length} questions`, done: packet.recall.every((_, i) => has((e) => e.kind === "retrieval" && e.note === `recall:${i}`)) });
    if (packet.coreRead?.length)
      out.push({ label: "READ — the exact sections", done: packet.coreRead.every((r) => has((e) => e.kind === "exposure" && e.note === `read:${r.title}`)) });
    if (packet.practice.length)
      out.push({ label: `WORK — ${packet.practice.length} practice blocks`, done: packet.practice.every((_, i) => has((e) => e.kind === "problem" && e.note === `practice:${i}`)) });
    if (packet.implement || packet.derive)
      out.push({
        label: "BUILD / DERIVE",
        done: (!packet.implement || has((e) => e.kind === "implementation" && e.note === "packet-build" && e.outcome === "pass")) &&
              (!packet.derive || has((e) => e.kind === "derivation" && e.note === "packet-build" && e.outcome === "pass")),
      });
    out.push({ label: "PROVE IT — closed book", done: has((e) => e.kind === "assessment" && e.outcome === "pass") });
    return out;
  }, [packet, ev]);

  const firstOpen = stepStates.findIndex((s) => !s.done);
  const nextUnlock = bottleneck ? unlocks(bottleneck.id).find((d) => store.nodes[d.id]?.status !== "mastered") : null;

  if (mission.researchMode) return <ResearchToday />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* header — a line a person reads, not a status code */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[13px] font-medium text-dim">
          {phase ? phase.title : "Getting started"}{day ? <span className="text-faint"> · day {Math.min(day, 210)}</span> : null}
        </div>
        <span className="text-[11.5px] text-faint">
          {loggedMin > 0 ? `${(loggedMin / 60).toFixed(1)}h in today` : "one solid block is plenty"}
        </span>
      </div>

      {mission.blockers.length > 0 && (
        <div className="space-y-1">
          {mission.blockers.map((b, i) => (
            <div key={i} className="rounded-md border border-acc-math/30 bg-acc-math/[0.06] px-3 py-2 text-xs text-acc-math">⚠ {b}</div>
          ))}
        </div>
      )}

      {bottleneck ? (
        <div className="halo-glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="halo-ring mt-1 size-8 shrink-0" aria-hidden />
            <div>
              <div className="text-[11.5px] font-medium text-acc">The one thing today</div>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                <Link href={`/node/${bottleneck.id}`} className="hover:text-acc">{bottleneck.title}</Link>
              </h1>
            </div>
          </div>
          <p className="mt-3 rounded-lg bg-acc/[0.07] px-3 py-2 text-[12.5px] text-acc-robot">
            {encouragement(loggedMin, nextUnlock?.title)}
          </p>

          <div className="mt-4">
            <div className="text-[13px] font-medium text-dim">By tonight, you&apos;ll be able to:</div>
            <p className="mt-1.5 text-[15.5px] leading-[1.7] text-ink"><SmartText>{packet?.prove.task ?? bottleneck.masteryTest}</SmartText></p>
          </div>
          <div className="mt-3">
            <div className="text-[13px] font-medium text-dim">Why this first</div>
            <p className="mt-1 text-[14px] leading-[1.65] text-dim">
              {bottleneck.why}{" "}
              {nextUnlock && <span className="text-faint">It opens up {nextUnlock.title}.</span>}
            </p>
          </div>

          {/* the steps — the rising stairway of light */}
          {stepStates.length > 0 && (
            <div className="relative mt-5 space-y-1.5 pl-4">
              <div className="absolute bottom-3 left-[7px] top-3 w-px bg-gradient-to-t from-acc-robot/50 via-acc/40 to-acc/0" aria-hidden />
              {stepStates.map((s, i) => (
                <Link
                  key={s.label}
                  href={`/node/${bottleneck.id}`}
                  className="relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-panel2/60"
                  style={{ opacity: s.done ? 0.6 : i === firstOpen ? 1 : 0.82 }}
                >
                  <span
                    className="absolute -left-4 size-3.5 rounded-full border-2"
                    style={{
                      borderColor: s.done ? "#52d68a" : i === firstOpen ? "#4dd6e8" : "var(--color-line2)",
                      background: s.done ? "#52d68a" : i === firstOpen ? "#4dd6e8" : "var(--color-bg)",
                      boxShadow: i === firstOpen && !s.done ? "0 0 10px 0 #4dd6e8aa" : "none",
                    }}
                    aria-hidden
                  />
                  <span className={`text-[14px] ${s.done ? "text-faint line-through" : i === firstOpen ? "font-medium text-ink" : "text-dim"}`}>
                    {humanStep(s.label)}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/node/${bottleneck.id}`} className="btn btn-glow">Start &rarr;</Link>
            {hasLesson(bottleneck.id) && (
              <Link href={`/learn/${bottleneck.id}`} className="btn">Interactive lesson</Link>
            )}
          </div>

          <div className="mt-5 border-t border-line/60 pt-4">
            <div className="mb-2 text-[12px] font-medium text-dim">Stuck on any of it? Ask the tutor. It knows where you are.</div>
            <LiveTutor nodeId={bottleneck.id} />
          </div>

          {nextUnlock && (
            <div className="mt-3 text-[11.5px] text-faint">
              finishing this opens → <Link href={`/node/${nextUnlock.id}`} className="text-acc hover:underline">{nextUnlock.title}</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="halo-glass rounded-2xl p-6">
          <div className="text-[16px] font-semibold">Let&apos;s pick your starting point</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-dim">
            Set a start date in <Link href="/settings" className="text-acc hover:underline">Settings</Link>,
            then open the first skill. From there it lays out what to do next, one thing at a time.
          </p>
          <Link href="/tree" className="btn btn-acc mt-4">Open the skill tree</Link>
        </div>
      )}

      {/* secondary — hidden in beginner mode to keep the focus on the one thing */}
      {!beginner && (
      <div className="space-y-2">
        <SecondaryRow
          href="/review"
          label={reviews.length > 0 ? `Review · ${reviews.length} waiting` : "Review · all caught up"}
          hot={reviews.length > 0}
          detail={reviews.length > 0 ? "Closed book first. A clean review is what makes a claim real." : "A quick recall of yesterday's key idea."}
        />
        {mission.slots.find((s) => s.projectTitle) && (
          <SecondaryRow
            href="/projects"
            label={`Project · ${mission.slots.find((s) => s.projectTitle)?.projectTitle}`}
            detail={mission.slots.find((s) => s.projectTitle)?.projectStep ?? ""}
          />
        )}
        {mission.slots
          .filter((s) => s.node && s.node.id !== bottleneck?.id)
          .slice(0, 1)
          .map((s) => (
            <SecondaryRow
              key={s.node!.id}
              href={`/node/${s.node!.id}`}
              label={`Also open · ${s.node!.title}`}
              detail="Save this for after the main thing moves, so there is less to juggle at once."
            />
          ))}
      </div>
      )}

      {!beginner && <ShipLine />}

      {todayLogs.length > 0 && (
        <div className="space-y-1 px-1">
          {todayLogs.map((l) => (
            <div key={l.id} className="flex items-center justify-between text-[11.5px] text-faint">
              <span>
                {l.block}{l.nodeId ? ` · ${NODE_MAP.get(l.nodeId)?.title}` : ""}{l.note ? ` · ${l.note}` : ""}
              </span>
              <span className="flex items-center gap-2 font-mono">
                {l.minutes > 0 && `${l.minutes}m`}
                <button onClick={() => store.deleteLog(l.id)} className="hover:text-acc-frontier">×</button>
              </span>
            </div>
          ))}
        </div>
      )}
      <QuickLogRow nodeId={bottleneck?.id} />
    </div>
  );
}

function SecondaryRow({ href, label, detail, hot }: { href: string; label: string; detail: string; hot?: boolean }) {
  return (
    <Link
      href={href}
      className="block rounded-md border px-3.5 py-2.5 transition-colors hover:border-acc/40"
      style={{ borderColor: hot ? "#f2934d44" : "var(--color-line)", opacity: hot ? 1 : 0.8 }}
    >
      <div className={`font-mono text-[12px] ${hot ? "text-acc-review" : "text-dim"}`} style={hot ? { color: "#f2934d" } : undefined}>
        {label}
      </div>
      {detail && <div className="mt-0.5 text-[11.5px] text-faint">{detail}</div>}
    </Link>
  );
}

function ResearchToday() {
  const store = useStore();
  const data = store.exportData();
  const day = dayOfProgram(data.settings);
  const open = data.experiments.find((e) => e.status === "running") ?? data.experiments.find((e) => e.status === "planned");
  const paper = Object.entries(data.papers).find(([, p]) => ["reading", "deriving", "reproducing"].includes(p.status));
  const reviews = reviewQueue(data.nodes);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="mono-label">day {day ?? "—"} · research loop</div>
      <Panel accent="#e86ea4" className="!p-5">
        <div className="mono-label text-acc-frontier">the loop: hypothesize → run → measure → write</div>
        {open ? (
          <div className="mt-2">
            <div className="text-[15px] font-semibold text-ink">{open.title || "(untitled experiment)"}</div>
            <p className="mt-1 text-[13px] text-dim">{open.hypothesis || "No hypothesis written. That is today's first task."}</p>
            <Link href="/experiments" className="btn btn-acc mt-3">Open experiment</Link>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-acc-math">No planned or running experiment. Pre-register the next one before anything else. The log entry is the deliverable.</p>
            <Link href="/experiments" className="btn btn-acc mt-3">Pre-register</Link>
          </div>
        )}
        <div className="mt-4 space-y-1.5 border-t border-line/60 pt-3 text-[12.5px] text-dim">
          <div>▸ <b className="text-ink">Read/think 45m</b>{paper ? <>: continue <Link className="text-acc hover:underline" href={`/papers/${paper[0]}`}>{paper[0]}</Link></> : ": pick from the ladder"}</div>
          <div>▸ <b className="text-ink">Write</b>: the report grows a little every day; claims tied to evidence.</div>
          <div>▸ <b className="text-ink">Review{reviews.length > 0 ? ` (${reviews.length} due)` : ""}</b>: <Link className="text-acc hover:underline" href="/review">keep the foundations warm</Link>.</div>
        </div>
      </Panel>
      <ShipLine />
    </div>
  );
}

function QuickLogRow({ nodeId }: { nodeId?: string }) {
  const addLog = useStore((s) => s.addLog);
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(60);
  const [block, setBlock] = useState<Block>("math");
  const [indep, setIndep] = useState<Independence>("independent");
  if (!open)
    return (
      <button className="btn w-full justify-center !py-2 text-xs" onClick={() => setOpen(true)}>
        ✓ log focused time
      </button>
    );
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-line p-2.5">
      <input type="number" value={min} min={5} step={5} onChange={(e) => setMin(Number(e.target.value))} className="!w-20 !py-1 text-center font-mono text-xs" />
      <select value={block} onChange={(e) => setBlock(e.target.value as Block)} className="!w-auto !py-1 text-xs">
        {["math", "implementation", "specialization", "project", "review", "papers", "research"].map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      <select value={indep} onChange={(e) => setIndep(e.target.value as Independence)} className="!w-auto !py-1 text-xs">
        <option value="independent">independent</option>
        <option value="hints">hint-assisted</option>
        <option value="heavy_ai">heavy AI</option>
        <option value="copied">copied</option>
      </select>
      <button
        className="btn btn-acc !py-1"
        onClick={() => {
          addLog({ date: new Date().toISOString().slice(0, 10), minutes: min, block, nodeId, independence: indep });
          setOpen(false);
        }}
      >
        save
      </button>
      <button className="btn !py-1" onClick={() => setOpen(false)}>×</button>
    </div>
  );
}

function ShipLine() {
  const store = useStore();
  const [note, setNote] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const ships = store.logs.filter((l) => l.date === today && l.note?.startsWith("SHIP:"));
  const ship = () => {
    if (!note.trim()) return;
    store.addLog({ date: today, minutes: 0, block: "project", note: `SHIP: ${note.trim()}` });
    setNote("");
  };
  return (
    <div className="rounded-md border border-line p-3">
      <div className="mono-label mb-1.5">ship: what exists now that didn&apos;t this morning?</div>
      <div className="flex gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ship()} placeholder="a commit, a passing check, a derivation page…" />
        <button className="btn shrink-0 !py-1.5 text-xs" disabled={!note.trim()} onClick={ship}>Ship</button>
      </div>
      {ships.map((l) => (
        <div key={l.id} className="mt-1 text-xs text-acc-robot">▸ {l.note?.slice(6)}</div>
      ))}
    </div>
  );
}
