"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { hasLesson, lessonMeta } from "@/content/lessons/manifest";
import { WIDGETS } from "@/components/widgets/registry";
import { unlocks } from "@/lib/engine/graph";
import { useStore } from "@/lib/store";
import type { LearningPacket } from "@/lib/packet-types";
import { AssessmentBox } from "./AssessmentBox";
import { LiveTutor } from "./tutor/LiveTutor";
import { TutorTaskLink } from "./tutor/TutorTaskLink";
import { SmartText } from "./SmartText";
import { VideoCard } from "./VideoCard";

/**
 * The academy flow (HANDOVERFINAL §19): one node, one default path, one next
 * step. Every completion is an evidence event, so progress here IS the
 * mastery trail — resumable, syncable, inspectable.
 */
export function PacketRunner({ packet, curated }: { packet: LearningPacket; curated: boolean }) {
  const store = useStore();
  const id = packet.nodeId;
  const ev = useMemo(() => store.events.filter((e) => e.nodeId === id), [store.events, id]);

  const has = (pred: (e: (typeof ev)[number]) => boolean) => ev.some(pred);
  const watchedUrl = (url: string) => has((e) => e.kind === "exposure" && e.note === `watched:${url}`);
  const readTitle = (t: string) => has((e) => e.kind === "exposure" && e.note === `read:${t}`);
  const recallDone = (i: number) => has((e) => e.kind === "retrieval" && e.note === `recall:${i}`);
  const practiceDone = (i: number) => has((e) => e.kind === "problem" && e.note === `practice:${i}`);
  const built = (kind: "implementation" | "derivation") => has((e) => e.kind === kind && e.note === "packet-build" && e.outcome === "pass");
  const proved = has((e) => e.kind === "assessment" && e.outcome === "pass");

  const allWatch = [...(packet.orient ? [packet.orient] : []), ...(packet.coreWatch ?? [])];
  const watchDone = allWatch.length > 0 && allWatch.every((m) => watchedUrl(m.url));
  const recallAll = (packet.recall ?? []).length > 0 && (packet.recall ?? []).every((_, i) => recallDone(i));
  const readAll = (packet.coreRead ?? []).length > 0 && (packet.coreRead ?? []).every((r) => readTitle(r.title));
  const practiceAll = packet.practice.length > 0 && packet.practice.every((_, i) => practiceDone(i));
  const buildNeeded = !!packet.implement || !!packet.derive;
  const buildDone = (!packet.implement || built("implementation")) && (!packet.derive || built("derivation"));

  interface Step { id: string; label: string; done: boolean; skip?: boolean; body: ReactNode }
  const steps: Step[] = [
    allWatch.length > 0 && {
      id: "watch", label: `WATCH: ${allWatch.reduce((s, m) => s + m.minutes, 0)} min`, done: watchDone,
      body: (
        <div className="space-y-3">
          {allWatch.map((m) => (
            <VideoCard
              key={m.url}
              media={m}
              role={m === packet.orient ? "ORIENT" : "CORE WATCH"}
              watched={watchedUrl(m.url)}
              onWatched={() => store.recordEvidence({ nodeId: id, kind: "exposure", outcome: "info", note: `watched:${m.url}`, minutes: m.minutes })}
            />
          ))}
        </div>
      ),
    },
    (packet.recall ?? []).length > 0 && {
      id: "recall", label: `RECALL: ${(packet.recall ?? []).length} questions, closed book`, done: recallAll,
      body: (
        <div className="space-y-2.5">
          {(packet.recall ?? []).map((r, i) => (
            <RecallRow
              key={i}
              q={r.q}
              a={r.a}
              done={recallDone(i)}
              onGrade={(got) => store.recordEvidence({ nodeId: id, kind: "retrieval", outcome: got ? "pass" : "fail", note: `recall:${i}`, minutes: 2 })}
            />
          ))}
        </div>
      ),
    },
    ((packet.interactiveIds ?? []).length > 0 || (packet.lessonId && hasLesson(packet.lessonId))) && {
      id: "interact", label: "SEE IT MOVE: manipulate the mathematics", done: watchDone || readAll || practiceAll,
      skip: true,
      body: (
        <div className="space-y-3">
          {packet.lessonId && hasLesson(packet.lessonId) && (
            <Link href={`/learn/${packet.lessonId}`} className="btn btn-acc !py-1.5 text-xs">
              ⚡ Full interactive lesson · {lessonMeta(packet.lessonId)?.minutes} min
            </Link>
          )}
          {(packet.interactiveIds ?? []).map((wid) => {
            const W = WIDGETS[wid];
            return W ? (
              <div key={wid} className="rounded-lg border border-line bg-panel2/40 p-3">
                <W />
              </div>
            ) : null;
          })}
        </div>
      ),
    },
    (packet.coreRead ?? []).length > 0 && {
      id: "read", label: `READ: exactly these sections`, done: readAll,
      body: (
        <div className="space-y-2">
          {(packet.coreRead ?? []).map((r) => (
            <div key={r.title} className="rounded-md border border-line bg-panel2/50 px-3 py-2.5">
              <div className="flex flex-wrap items-baseline gap-2">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-ink hover:text-acc">{r.title} ↗</a>
                ) : (
                  <span className="text-sm font-medium text-ink">{r.title}</span>
                )}
                <span className="font-mono text-[10.5px] text-faint">~{r.minutes} min</span>
              </div>
              <div className="mt-1 text-[12.5px] text-dim">
                <span className="font-mono text-[10px] uppercase tracking-wider text-acc-robot">study → </span>{r.sections}
              </div>
              {r.whySelected && <div className="mt-0.5 text-[11.5px] text-faint">{r.whySelected}</div>}
              <button
                className={readTitle(r.title) ? "btn mt-2 !py-1 text-xs opacity-60" : "btn mt-2 !py-1 text-xs"}
                disabled={readTitle(r.title)}
                onClick={() => store.recordEvidence({ nodeId: id, kind: "exposure", outcome: "info", note: `read:${r.title}`, minutes: r.minutes })}
              >
                {readTitle(r.title) ? "✓ read" : "read (pen out, actively)"}
              </button>
            </div>
          ))}
        </div>
      ),
    },
    packet.practice.length > 0 && {
      id: "practice", label: `WORK: ${packet.practice.length} practice blocks`, done: practiceAll,
      body: (
        <div className="space-y-2">
          {packet.practice.map((pr, i) => (
            <div key={i} className="rounded-md border border-line bg-panel2/50 px-3 py-2.5">
              <div className="text-[14.5px] leading-[1.7] text-ink"><SmartText>{pr.prompt}</SmartText></div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {pr.source && <a className="text-xs text-acc hover:underline" href={pr.source} target="_blank" rel="noopener noreferrer">source ↗</a>}
                {pr.minutes && <span className="font-mono text-[10.5px] text-faint">~{pr.minutes} min</span>}
                <span className="flex-1" />
                {practiceDone(i) ? (
                  <span className="font-mono text-[11px] text-acc-robot">✓ done</span>
                ) : (
                  <>
                    <button className="btn !py-1 text-xs" onClick={() => store.recordEvidence({ nodeId: id, kind: "problem", outcome: "pass", note: `practice:${i}`, minutes: pr.minutes ?? 15, independence: "independent" })}>
                      solved it
                    </button>
                    <button className="btn !py-1 text-xs" onClick={() => store.recordEvidence({ nodeId: id, kind: "problem", outcome: "fail", note: `practice:${i}`, minutes: pr.minutes ?? 15 })}>
                      struggled, log it
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    buildNeeded && {
      id: "build", label: "BUILD / DERIVE: the artifact is the point", done: buildDone,
      body: (
        <div className="space-y-3">
          {packet.derive && (
            <>
              <ArtifactBlock
                kind="derivation"
                title="derive, on paper"
                spec={packet.derive.spec}
                checks={packet.derive.checks}
                done={built("derivation")}
                onDone={(artifact) => store.recordEvidence({ nodeId: id, kind: "derivation", outcome: "pass", note: "packet-build", artifact, minutes: packet.derive?.minutes ?? 30, independence: "independent" })}
              />
              <TutorTaskLink
                mode="socratic"
                label="▸ work this with the tutor (Socratic, step by step)"
                text={`Work this derivation task with me step by step. Socratic mode — never hand me the result:\n\n${packet.derive.spec}${packet.derive.checks?.length ? `\n\nChecks it must pass: ${packet.derive.checks.join("; ")}` : ""}`}
              />
            </>
          )}
          {packet.implement && (
            <>
              <ArtifactBlock
                kind="implementation"
                title="implement, in your editor"
                spec={packet.implement.spec}
                checks={packet.implement.checks}
                done={built("implementation")}
                onDone={(artifact) => store.recordEvidence({ nodeId: id, kind: "implementation", outcome: "pass", note: "packet-build", artifact, minutes: packet.implement?.minutes ?? 45, independence: "independent" })}
              />
              <TutorTaskLink
                mode="debug"
                label="▸ build this with the tutor (hints and review, not solutions)"
                text={`I'm working on this implementation task. Guide me with hints and review my attempts — don't write it for me:\n\n${packet.implement.spec}${packet.implement.checks?.length ? `\n\nChecks it must pass: ${packet.implement.checks.join("; ")}` : ""}`}
              />
            </>
          )}
        </div>
      ),
    },
    {
      id: "prove", label: "PROVE IT: closed book, then it verifies", done: proved,
      body: (
        <div className="space-y-2">
          <div className="text-[13px] leading-relaxed text-ink">
            <span className="mono-label mr-2 text-acc-robot">the bar →</span><span className="text-[14.5px] leading-[1.65]"><SmartText>{packet.prove.task}</SmartText></span>
          </div>
          <ul className="space-y-0.5 pl-1 text-[12px] text-dim">
            {packet.prove.criteria.map((c, i) => (
              <li key={i}>□ {c}</li>
            ))}
          </ul>
          <TutorTaskLink
            mode="examine"
            label="▸ tutor as examiner: drill me on this bar first"
            text={`Act as my closed-book examiner for this bar. Quiz me, push follow-ups, grade honestly, never reveal answers before I attempt:\n\n${packet.prove.task}\n\nCriteria: ${packet.prove.criteria.join("; ")}`}
          />
          <AssessmentBox id={id} />
          {packet.transfer && proved && (
            <div className="mt-2 rounded-md border border-acc-math/30 bg-acc-math/[0.05] px-3 py-2.5">
              <div className="mono-label mb-1 text-acc-math">transfer: unfamiliar ground</div>
              <div className="text-[13px] text-ink">{packet.transfer.task}</div>
              <div className="mt-1.5 flex gap-2">
                <button className="btn !py-1 text-xs" onClick={() => store.recordEvidence({ nodeId: id, kind: "transfer", outcome: "pass", note: "packet-transfer", independence: "independent" })}>
                  ✓ held on new ground
                </button>
                <button className="btn !py-1 text-xs" onClick={() => store.recordEvidence({ nodeId: id, kind: "transfer", outcome: "fail", note: "packet-transfer" })}>
                  ✗ it broke (honest)
                </button>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ].filter(Boolean) as Step[];

  const firstOpen = steps.findIndex((s) => !s.done);
  const dependents = unlocks(id).slice(0, 5);

  return (
    <div className="space-y-2.5">
      {!curated && (
        <div className="rounded-md border border-line bg-panel2/40 px-3 py-2 text-[11.5px] text-faint">
          This node&apos;s packet is assembled from its verified sources (full micro-curation pending).
          Study only the listed sections; the flow and the bar are the same.
        </div>
      )}
      {steps.map((s, i) => (
        <PacketStep key={s.id} step={s} state={s.done ? "done" : i === firstOpen ? "active" : "later"} />
      ))}

      {/* stuck path — always reachable, never a "step" */}
      <div className="rounded-lg border border-line bg-panel/60 px-4 py-3">
        <div className="mono-label mb-2">stuck? designed exits, not doomscrolling</div>
        {packet.stuck?.alternate && (
          <div className="mb-2 text-[12.5px] text-dim">
            alternate explanation: <a className="text-acc hover:underline" href={packet.stuck.alternate.url} target="_blank" rel="noopener noreferrer">{packet.stuck.alternate.creator}: {packet.stuck.alternate.title} ↗</a> ({packet.stuck.alternate.minutes} min)
          </div>
        )}
        {packet.stuck?.alternateRead && (
          <div className="mb-2 text-[12.5px] text-dim">
            alternate read: <a className="text-acc hover:underline" href={packet.stuck.alternateRead.url} target="_blank" rel="noopener noreferrer">{packet.stuck.alternateRead.title} ↗</a>: {packet.stuck.alternateRead.sections}
          </div>
        )}
        {packet.stuck?.note && <div className="mb-2 text-[12px] text-faint">{packet.stuck.note}</div>}
        <LiveTutor nodeId={id} />
      </div>

      {/* deepen */}
      {packet.deepen && packet.deepen.length > 0 && (
        <details className="rounded-lg border border-line bg-panel/60 px-4 py-3">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-dim hover:text-acc">
            deepen (only if needed)
          </summary>
          <div className="mt-2 space-y-1.5">
            {packet.deepen.map((d) => (
              <div key={d.title} className="text-[12.5px] text-dim">
                {d.url ? <a className="text-ink hover:text-acc" href={d.url} target="_blank" rel="noopener noreferrer">{d.title} ↗</a> : <span className="text-ink">{d.title}</span>}
                {": "}{d.sections} <span className="font-mono text-[10.5px] text-faint">~{d.minutes}m</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* unlocks preview */}
      {proved && dependents.length > 0 && (
        <div className="rise-in rounded-lg border border-acc/25 bg-acc/[0.04] px-4 py-3">
          <div className="mono-label mb-1.5 text-acc">this opened</div>
          <div className="flex flex-wrap gap-1.5">
            {dependents.map((d) => (
              <Link key={d.id} href={`/node/${d.id}`} className="rounded-md border border-line bg-panel2 px-2 py-1 font-mono text-[11px] text-dim hover:border-acc/50 hover:text-acc">
                {d.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {curated && packet.researchRecord && (
        <div className="text-right font-mono text-[10px] text-faint">
          curated from {packet.researchRecord} · packet ≈{Math.round(packet.minutes / 60 * 10) / 10}h
        </div>
      )}
    </div>
  );
}

function PacketStep({ step, state }: { step: { id: string; label: string; done: boolean; body: ReactNode }; state: "done" | "active" | "later" }) {
  const [forceOpen, setForceOpen] = useState(false);
  const open = state === "active" || forceOpen;
  return (
    <div
      className={`overflow-hidden rounded-lg border transition-colors ${state === "active" ? "border-line2 bg-panel" : "border-line bg-panel/60"}`}
      style={state === "later" && !forceOpen ? { opacity: 0.6 } : undefined}
    >
      <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left" onClick={() => state !== "active" && setForceOpen(!forceOpen)} aria-expanded={open}>
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold"
          style={{ color: step.done ? "#52d68a" : "#4dd6e8", background: step.done ? "#52d68a14" : "#4dd6e810" }}
        >
          {step.done ? "✓" : "▸"}
        </span>
        <span className={`font-mono text-[11.5px] font-bold tracking-wider ${step.done ? "text-faint" : "text-ink"}`}>{step.label}</span>
      </button>
      {open && <div className="border-t border-line/60 px-4 py-3.5">{step.body}</div>}
    </div>
  );
}

function RecallRow({ q, a, done, onGrade }: { q: string; a: string; done: boolean; onGrade: (got: boolean) => void }) {
  const [ans, setAns] = useState("");
  const [committed, setCommitted] = useState(false);
  if (done) {
    return <div className="rounded-md border border-line bg-panel2/40 px-3 py-2 text-[12.5px] text-faint">✓ {q}</div>;
  }
  return (
    <div className="rounded-md border border-line bg-panel2/50 px-3 py-2.5">
      <div className="text-[13px] text-ink">{q}</div>
      {!committed ? (
        <div className="mt-1.5 flex gap-2">
          <input value={ans} onChange={(e) => setAns(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ans.trim() && setCommitted(true)} placeholder="answer first…" className="!py-1 font-mono !text-[12.5px]" />
          <button className="btn shrink-0 !py-1 text-xs" disabled={!ans.trim()} onClick={() => setCommitted(true)}>commit</button>
        </div>
      ) : (
        <div className="rise-in mt-1.5">
          <div className="text-[12.5px] text-dim"><span className="text-faint">yours · </span>{ans}</div>
          <div className="text-[12.5px] text-acc-robot"><span className="text-faint">answer · </span>{a}</div>
          <div className="mt-1.5 flex gap-2">
            <button className="btn !py-1 text-xs" onClick={() => onGrade(true)}>✓ had it</button>
            <button className="btn btn-danger !py-1 text-xs" onClick={() => onGrade(false)}>✗ missed</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ArtifactBlock({ kind, title, spec, checks, done, onDone }: {
  kind: string; title: string; spec: string; checks?: string[]; done: boolean; onDone: (artifact: string) => void;
}) {
  const [artifact, setArtifact] = useState("");
  return (
    <div className="rounded-md border border-line bg-panel2/50 px-3 py-2.5">
      <div className="mono-label mb-1 text-acc">{title}</div>
      <div className="text-[13px] leading-relaxed text-ink">{spec}</div>
      {checks && checks.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-[12px] text-dim">
          {checks.map((c, i) => <li key={i}>□ {c}</li>)}
        </ul>
      )}
      {done ? (
        <div className="mt-2 font-mono text-[11px] text-acc-robot">✓ recorded</div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            value={artifact}
            onChange={(e) => setArtifact(e.target.value)}
            placeholder={`where it lives: commit, path, or one-line summary (${kind})`}
            className="!py-1 font-mono !text-[12px]"
          />
          <button className="btn shrink-0 !py-1 text-xs" disabled={artifact.trim().length < 8} onClick={() => onDone(artifact.trim())}>
            record (checks pass)
          </button>
        </div>
      )}
    </div>
  );
}
