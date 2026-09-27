"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  CalloutBlock, CodeBlockSpec, ConnectionBlock, DerivationBlock, EquationBlock,
  ExerciseBlock, LessonBlock, MisconceptionBlock, QuizBlock,
} from "@/lib/lesson-types";
import type { SkillNode } from "@/lib/types";
import { NODE_MAP } from "@/content/nodes";
import { paperById } from "@/content/papers";
import { projectById } from "@/content/projects";
import { resourceById } from "@/content/resources";
import { useStore } from "@/lib/store";
import { Katex } from "../ui";
import { CodeBlock } from "../CodeBlock";
import { Markdown } from "./Markdown";
import { WIDGETS } from "../widgets/registry";
import { MasteryClaim } from "./MasteryClaim";

/** Inline text with $…$ math — for option labels and short strings inside buttons. */
function MathText({ children }: { children: string }) {
  const parts = children.split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.length > 2 && p.startsWith("$") && p.endsWith("$") ? (
          <Katex key={i} tex={p.slice(1, -1)} />
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function BlockRenderer({
  block, node, sectionId, index,
}: {
  block: LessonBlock;
  node: SkillNode;
  sectionId: string;
  index: number;
}) {
  switch (block.kind) {
    case "prose":
      return <Markdown>{block.md}</Markdown>;
    case "equation":
      return <Equation block={block} />;
    case "derivation":
      return <Derivation block={block} />;
    case "widget":
      return <Widget id={block.id} caption={block.caption} params={block.params} />;
    case "code":
      return <CodeExercise block={block} checkId={`${sectionId}:code:${index}`} nodeId={node.id} />;
    case "quiz":
      return <Quiz block={block} sectionId={sectionId} nodeId={node.id} index={index} />;
    case "exercise":
      return <Exercise block={block} />;
    case "misconception":
      return <Misconception block={block} />;
    case "connection":
      return <Connection block={block} />;
    case "sources":
      return <Sources node={node} note={block.note} />;
    case "mastery":
      return <MasteryClaim node={node} />;
    case "callout":
      return <Callout block={block} />;
    default:
      return null;
  }
}

/* ── equation ─────────────────────────────────────────────────────── */
function Equation({ block }: { block: EquationBlock }) {
  return (
    <figure className="rounded-lg border border-line bg-panel2/60 px-4 py-3">
      {block.label && <figcaption className="mono-label mb-1.5">{block.label}</figcaption>}
      <Katex tex={block.tex} block />
      {block.note && <div className="mt-1.5 text-[12.5px] text-dim">{block.note}</div>}
    </figure>
  );
}

/* ── derivation stepper ───────────────────────────────────────────── */
function Derivation({ block }: { block: DerivationBlock }) {
  const [shown, setShown] = useState(1);
  const done = shown >= block.steps.length;
  return (
    <div className="overflow-hidden rounded-lg border border-acc-math/25">
      <div className="border-b border-acc-math/20 bg-acc-math/[0.06] px-4 py-2.5">
        <div className="mono-label text-acc-math">derivation{block.title ? `: ${block.title}` : ""}</div>
        {block.intro && <div className="mt-1 text-[13px] text-dim">{block.intro}</div>}
      </div>
      <ol className="space-y-0 px-4 py-2">
        {block.steps.slice(0, shown).map((s, i) => (
          <li key={i} className="rise-in flex gap-3 border-b border-line/40 py-3 last:border-0">
            <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-acc-math/40 text-center font-mono text-[10.5px] leading-[18px] text-acc-math">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Markdown className="!text-[13.5px]">{s.text}</Markdown>
              {s.tex && (
                <div className="mt-1.5 overflow-x-auto">
                  <Katex tex={s.tex} block />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="border-t border-line/60 px-4 py-2.5">
        {!done ? (
          <button className="btn btn-acc !py-1.5" onClick={() => setShown((s) => s + 1)}>
            Next step · {shown}/{block.steps.length}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-acc-robot">■ Derivation complete. Now close the page and reproduce it.</span>
            <button className="btn-ghost btn !py-1 text-xs" onClick={() => setShown(1)}>restart</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── widget host ──────────────────────────────────────────────────── */
function Widget({ id, caption, params }: { id: string; caption?: string; params?: Record<string, unknown> }) {
  const W = WIDGETS[id];
  return (
    <figure className="overflow-hidden rounded-lg border border-acc/25">
      <div className="flex items-center justify-between border-b border-acc/15 bg-acc/[0.05] px-4 py-2">
        <span className="mono-label text-acc">interactive · {id}</span>
        <span className="hidden text-[10.5px] text-faint sm:block">drag and slide, the math is live</span>
      </div>
      <div className="bg-[#0b1017] p-3 sm:p-4">
        {W ? <W params={params} /> : <div className="py-8 text-center text-sm text-faint">widget “{id}” unavailable</div>}
      </div>
      {caption && <figcaption className="border-t border-line/60 px-4 py-2 text-[12.5px] text-dim">{caption}</figcaption>}
    </figure>
  );
}

/* ── code interactions ────────────────────────────────────────────── */
function CodeExercise({ block, checkId, nodeId }: { block: CodeBlockSpec; checkId: string; nodeId: string }) {
  const grade = useStore((s) => s.gradeLessonCheck);
  const prior = useStore((s) => s.lessons[nodeId]?.checks[checkId]);
  const [committed, setCommitted] = useState<string | number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [free, setFree] = useState("");
  const [traceShown, setTraceShown] = useState(0);

  const modeLabels: Record<string, string> = {
    read: "read", predict: "predict the output", trace: "trace the state",
    missing: "write the missing line", debug: "find the bug", write: "implement from spec",
  };
  const auto = block.options != null && block.answerIndex != null;

  const commitChoice = (i: number) => {
    if (committed !== null) return;
    setCommitted(i);
    setRevealed(true);
    grade(nodeId, checkId, i === block.answerIndex ? "got" : "missed");
  };
  const commitFree = () => {
    if (!free.trim()) return;
    setCommitted(free);
    setRevealed(true);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-acc-robot/25">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-acc-robot/20 bg-acc-robot/[0.05] px-4 py-2">
        <span className="mono-label text-acc-robot">code · {modeLabels[block.mode]}</span>
        {prior && (
          <span className={`font-mono text-[10px] ${prior === "got" ? "text-acc-robot" : "text-acc-frontier"}`}>
            {prior === "got" ? "✓ solved" : "✗ missed, retry welcome"}
          </span>
        )}
      </div>
      <div className="space-y-3 p-3 sm:p-4">
        {block.prompt && <Markdown className="!text-[13.5px]">{block.prompt}</Markdown>}
        <CodeBlock
          source={block.source}
          lang={block.lang ?? "python"}
          title={block.title}
          highlight={block.highlight}
          masked={block.masked}
        />

        {block.mode === "trace" && block.trace && (
          <div className="rounded-md border border-line bg-panel2/60">
            <table className="w-full font-mono text-[12px]">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-faint">
                  <th className="px-3 py-1.5">step</th>
                  <th className="px-3 py-1.5">state</th>
                </tr>
              </thead>
              <tbody>
                {block.trace.slice(0, traceShown).map((row, i) => (
                  <tr key={i} className="rise-in border-b border-line/40 last:border-0">
                    <td className="px-3 py-1.5 text-dim">{row.step}</td>
                    <td className="px-3 py-1.5 text-ink">{row.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 py-2">
              {traceShown < block.trace.length ? (
                <button
                  className="btn !py-1 text-xs"
                  onClick={() => setTraceShown((t) => t + 1)}
                >
                  {traceShown === 0 ? "Predict the first row in your head, then reveal" : `Reveal step ${traceShown + 1}/${block.trace.length}`}
                </button>
              ) : (
                <span className="text-xs text-acc-robot">■ trace complete</span>
              )}
            </div>
          </div>
        )}

        {block.mode === "write" && block.checks && (
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2">
            <div className="mono-label mb-1">acceptance checks: verify in your own editor</div>
            {block.checks.map((c, i) => (
              <div key={i} className="py-0.5 text-[13px] text-ink">□ {c}</div>
            ))}
          </div>
        )}

        {block.options && (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {block.options.map((o, i) => {
              const isAnswer = i === block.answerIndex;
              const chosen = committed === i;
              return (
                <button
                  key={i}
                  onClick={() => commitChoice(i)}
                  disabled={committed !== null}
                  className="rounded-md border px-3 py-2 text-left font-mono text-[12.5px] transition-colors disabled:cursor-default"
                  style={{
                    borderColor: revealed && isAnswer ? "#52d68a88" : chosen ? "#f4586e88" : "var(--color-line2)",
                    background: revealed && isAnswer ? "#52d68a12" : chosen ? "#f4586e10" : "var(--color-panel2)",
                    color: "var(--color-ink)",
                  }}
                >
                  <MathText>{o}</MathText>
                </button>
              );
            })}
          </div>
        )}

        {!auto && block.mode !== "read" && block.mode !== "trace" && !revealed && (
          <div className="flex gap-2">
            <input
              value={free}
              onChange={(e) => setFree(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitFree()}
              placeholder={block.mode === "predict" ? "exact output…" : block.mode === "missing" ? "the missing line…" : "your answer…"}
              className="font-mono !text-[13px]"
            />
            <button className="btn shrink-0" onClick={commitFree} disabled={!free.trim()}>Commit</button>
          </div>
        )}

        {revealed && (block.answer || block.explanation) && (
          <div className="rise-in rounded-md border border-line bg-panel2/70 px-3 py-2.5">
            {block.answer && (
              <div className="font-mono text-[13px] text-acc-robot">
                ▸ {block.answer}
              </div>
            )}
            {block.explanation && <Markdown className="mt-1.5 !text-[13px]">{block.explanation}</Markdown>}
            {!auto && committed !== null && (
              <div className="mt-2 flex items-center gap-2 border-t border-line/50 pt-2">
                <span className="text-[11px] text-faint">your commit: <span className="font-mono text-dim">{String(committed)}</span>. Honest grade:</span>
                <button className="btn !min-h-0 !py-1 text-xs" onClick={() => grade(nodeId, checkId, "got")}>✓ I had it</button>
                <button className="btn btn-danger !min-h-0 !py-1 text-xs" onClick={() => grade(nodeId, checkId, "missed")}>✗ I missed</button>
              </div>
            )}
          </div>
        )}

        {!revealed && (block.answer || block.explanation) && block.mode !== "read" && !block.options && (
          <button className="btn-ghost btn !py-1 text-[11.5px]" onClick={() => setRevealed(true)}>
            reveal without committing (counts as missed)
          </button>
        )}
      </div>
    </div>
  );
}

/* ── retrieval quiz ───────────────────────────────────────────────── */
function Quiz({ block, sectionId, nodeId, index }: { block: QuizBlock; sectionId: string; nodeId: string; index: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-acc-learn/25">
      <div className="border-b border-acc-learn/20 bg-acc-learn/[0.05] px-4 py-2">
        <span className="mono-label text-acc-learn">{block.title ?? "retrieval check"}, closed book</span>
      </div>
      <div className="divide-y divide-line/50">
        {block.items.map((item, i) => (
          <QuizItem key={i} item={item} checkId={`${sectionId}:quiz:${index}:${i}`} nodeId={nodeId} n={i + 1} />
        ))}
      </div>
    </div>
  );
}

function QuizItem({
  item, checkId, nodeId, n,
}: {
  item: QuizBlock["items"][number];
  checkId: string;
  nodeId: string;
  n: number;
}) {
  const grade = useStore((s) => s.gradeLessonCheck);
  const prior = useStore((s) => s.lessons[nodeId]?.checks[checkId]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const mcq = item.options && item.options.length > 0;

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 font-mono text-[11px] text-faint">Q{n}</span>
        <div className="min-w-0 flex-1">
          <Markdown className="!text-[14px]">{item.q}</Markdown>

          {mcq && (
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {item.options!.map((o, i) => {
                const isAnswer = i === item.answerIndex;
                const isChosen = chosen === i;
                return (
                  <button
                    key={i}
                    disabled={chosen !== null}
                    onClick={() => {
                      setChosen(i);
                      setRevealed(true);
                      grade(nodeId, checkId, i === item.answerIndex ? "got" : "missed");
                    }}
                    className="rounded-md border px-3 py-1.5 text-left text-[13px] transition-colors disabled:cursor-default"
                    style={{
                      borderColor: revealed && isAnswer ? "#52d68a88" : isChosen ? "#f4586e88" : "var(--color-line2)",
                      background: revealed && isAnswer ? "#52d68a12" : isChosen ? "#f4586e10" : "var(--color-panel2)",
                    }}
                  >
                    <MathText>{o}</MathText>
                  </button>
                );
              })}
            </div>
          )}

          {!mcq && !revealed && (
            <button className="btn mt-2 !py-1.5 text-xs" onClick={() => setRevealed(true)}>
              I answered aloud/on paper, reveal
            </button>
          )}

          {revealed && (
            <div className="rise-in mt-2 rounded-md border border-line bg-panel2/70 px-3 py-2">
              <div className="text-[13px] text-acc-robot">▸ {item.a}</div>
              {item.why && <Markdown className="mt-1 !text-[12.5px]">{item.why}</Markdown>}
              {!mcq && (
                <div className="mt-2 flex items-center gap-2 border-t border-line/50 pt-2">
                  <button className="btn !min-h-0 !py-1 text-xs" onClick={() => grade(nodeId, checkId, "got")}>✓ got it</button>
                  <button className="btn btn-danger !min-h-0 !py-1 text-xs" onClick={() => grade(nodeId, checkId, "missed")}>✗ missed</button>
                  {prior && <span className="text-[10.5px] text-faint">recorded: {prior}</span>}
                </div>
              )}
            </div>
          )}
        </div>
        {prior && mcq && (
          <span className={`font-mono text-[10px] ${prior === "got" ? "text-acc-robot" : "text-acc-frontier"}`}>
            {prior === "got" ? "✓" : "✗"}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── progressive exercise ─────────────────────────────────────────── */
function Exercise({ block }: { block: ExerciseBlock }) {
  const marks = ["I", "II", "III"] as const;
  const colors = ["#4dd6e8", "#e8b34d", "#f4586e"] as const;
  const c = colors[block.level - 1];
  return (
    <div className="rounded-lg border px-4 py-3" style={{ borderColor: `${c}33` }}>
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold"
          style={{ color: c, background: `${c}14`, border: `1px solid ${c}44` }}
        >
          {marks[block.level - 1]}
        </span>
        <div className="min-w-0 flex-1">
          <Markdown className="!text-[13.5px]">{block.prompt}</Markdown>
          {block.hint && (
            <details className="mt-2">
              <summary className="text-[12px] text-acc hover:underline">hint</summary>
              <Markdown className="mt-1 !text-[13px] opacity-90">{block.hint}</Markdown>
            </details>
          )}
          {block.solution && (
            <details className="mt-1.5">
              <summary className="text-[12px] text-faint hover:text-acc-math hover:underline">
                solution (only after an honest attempt)
              </summary>
              <Markdown className="mt-1 !text-[13px] opacity-90">{block.solution}</Markdown>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── misconception ────────────────────────────────────────────────── */
function Misconception({ block }: { block: MisconceptionBlock }) {
  return (
    <div className="overflow-hidden rounded-lg border border-acc-frontier/25">
      <div className="border-b border-acc-frontier/20 bg-acc-frontier/[0.05] px-4 py-1.5">
        <span className="mono-label text-acc-frontier">common misconception</span>
      </div>
      <div className="space-y-2 px-4 py-3">
        <div className="flex gap-2 text-[13.5px]">
          <span className="mt-0.5 shrink-0 text-acc-frontier">✗</span>
          <Markdown className="!text-[13.5px] opacity-85">{block.wrong}</Markdown>
        </div>
        <div className="flex gap-2 text-[13.5px]">
          <span className="mt-0.5 shrink-0 text-acc-robot">✓</span>
          <Markdown className="!text-[13.5px]">{block.right}</Markdown>
        </div>
      </div>
    </div>
  );
}

/* ── connection ───────────────────────────────────────────────────── */
function Connection({ block }: { block: ConnectionBlock }) {
  return (
    <div className="rounded-lg border border-acc-research/25 bg-acc-research/[0.04] px-4 py-3">
      <div className="mono-label mb-1.5 text-acc-research">where this goes</div>
      <Markdown className="!text-[13.5px]">{block.md}</Markdown>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {block.nodeIds?.map((id) => {
          const n = NODE_MAP.get(id);
          return n ? (
            <Link key={id} href={`/node/${id}`} className="rounded-md border border-acc/30 bg-acc/5 px-2 py-1 text-[11.5px] text-acc hover:border-acc/60">
              ⬡ {n.title}
            </Link>
          ) : null;
        })}
        {block.paperIds?.map((id) => {
          const p = paperById(id);
          return p ? (
            <Link key={id} href={`/papers/${id}`} className="rounded-md border border-acc-ml/30 bg-acc-ml/5 px-2 py-1 text-[11.5px] text-acc-ml hover:border-acc-ml/60">
              ¶ {p.title.length > 40 ? p.title.slice(0, 38) + "…" : p.title}
            </Link>
          ) : null;
        })}
        {block.projectIds?.map((id) => {
          const p = projectById(id);
          return p ? (
            <Link key={id} href="/projects" className="rounded-md border border-acc-robot/30 bg-acc-robot/5 px-2 py-1 text-[11.5px] text-acc-robot hover:border-acc-robot/60">
              ⚒ P{p.num} {p.title}
            </Link>
          ) : null;
        })}
      </div>
    </div>
  );
}

/* ── sources ──────────────────────────────────────────────────────── */
function Sources({ node, note }: { node: SkillNode; note?: string }) {
  const bindings = [
    node.primary && { role: "primary", b: node.primary },
    node.backup && { role: "backup", b: node.backup },
    ...(node.references ?? []).map((b) => ({ role: "reference", b })),
  ].filter(Boolean) as { role: string; b: NonNullable<SkillNode["primary"]> }[];
  return (
    <div className="rounded-lg border border-line bg-panel2/50 px-4 py-3">
      <div className="mono-label mb-2">go deeper: the verified sources</div>
      {note && <p className="mb-2 text-[12.5px] text-dim">{note}</p>}
      <div className="space-y-2">
        {bindings.map(({ role, b }, i) => {
          const r = resourceById(b.resourceId);
          if (!r) return null;
          const c = role === "primary" ? "#4dd6e8" : role === "backup" ? "#e8b34d" : "#8b97a7";
          return (
            <div key={i} className="text-[13px]">
              <span className="mr-2 rounded px-1.5 py-0.5 font-mono text-[9.5px] uppercase" style={{ color: c, background: `${c}14` }}>
                {role}
              </span>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink hover:text-acc">
                {r.title} ↗
              </a>
              <div className="mt-0.5 pl-0.5 text-[12px] text-dim">▸ {b.sections}</div>
            </div>
          );
        })}
        {bindings.length === 0 && <div className="text-[13px] text-faint">Self-contained node. This lesson is the material.</div>}
      </div>
    </div>
  );
}

/* ── callout ──────────────────────────────────────────────────────── */
function Callout({ block }: { block: CalloutBlock }) {
  const tones = {
    info: { c: "#4dd6e8", label: block.title ?? "note" },
    warn: { c: "#e8b34d", label: block.title ?? "careful" },
    insight: { c: "#a78bfa", label: block.title ?? "the deeper point" },
  } as const;
  const t = tones[block.tone];
  return (
    <div className="rounded-lg border px-4 py-3" style={{ borderColor: `${t.c}33`, background: `${t.c}08` }}>
      <div className="mono-label mb-1" style={{ color: t.c }}>{t.label}</div>
      <Markdown className="!text-[13.5px]">{block.md}</Markdown>
    </div>
  );
}
