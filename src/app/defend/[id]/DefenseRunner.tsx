"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { paperById } from "@/content/papers";
import { useStore } from "@/lib/store";

// Full-screen interrogation. The app asks; you answer out loud or on paper,
// commit, compare against your own understanding, and grade honestly.
// No confetti. A defended paper is one you can argue for and against.

const STANDARD_PROBES = [
  "State the paper's core claim in two sentences, then name the single strongest piece of evidence the authors give for it.",
  "Architecture and objective: what exactly is trained, with what loss, on what data? Write the loss if you can.",
  "Where does it break? Name the weakest assumption, or a failure mode the authors did not test.",
];

type Phase = "brief" | "question" | "done";

export function DefenseRunner({ paperId }: { paperId: string }) {
  const p = paperById(paperId)!;
  const router = useRouter();
  const recordDefense = useStore((s) => s.recordDefense);
  const prior = useStore((s) => s.papers[paperId]?.defense);

  const questions = useMemo(() => {
    const curated = p.questions.map((q) => ({ q, kind: "from your reading list" }));
    const probes = STANDARD_PROBES.map((q) => ({ q, kind: "standard probe" }));
    return [...curated, ...probes];
  }, [p]);

  const [phase, setPhase] = useState<Phase>("brief");
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [committed, setCommitted] = useState(false);
  const [grades, setGrades] = useState<boolean[]>([]);

  const score = grades.filter(Boolean).length;
  const total = questions.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(`/papers/${paperId}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, paperId]);

  const grade = (got: boolean) => {
    const g = [...grades, got];
    setGrades(g);
    setAnswer("");
    setCommitted(false);
    if (idx + 1 >= total) {
      const s = g.filter(Boolean).length;
      const verdict = s / total >= 0.8 ? "defended" : s / total >= 0.5 ? "partial" : "undefended";
      recordDefense(
        paperId,
        { date: new Date().toISOString().slice(0, 10), score: s, total, verdict },
        p.prereqNodeIds, // a defended paper is integration evidence for its prerequisite nodes
      );
      setPhase("done");
    } else {
      setIdx(idx + 1);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* header */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-4">
        <Link href={`/papers/${paperId}`} className="font-mono text-[11px] text-faint hover:text-acc">✕ esc</Link>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[11px] text-acc-frontier">DEFENSE MODE · {p.title}</div>
        </div>
        {phase === "question" && (
          <span className="font-mono text-[11px] text-dim">{idx + 1} / {total}</span>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8">
        {phase === "brief" && (
          <div className="rise-in">
            <div className="mono-label text-acc-frontier">the rules</div>
            <h1 className="mt-2 text-2xl font-bold text-ink">Defend {p.title.split(":")[0]}</h1>
            <ul className="mt-4 space-y-2 text-sm text-dim">
              <li>▸ <b className="text-ink">Closed book.</b> No paper, no notes, no tabs.</li>
              <li>▸ Answer each question <b className="text-ink">out loud or on paper</b>. Give a full answer, then commit.</li>
              <li>▸ After committing you grade yourself. <b className="text-ink">Honest misses are worth more than dishonest hits</b>. A fake &quot;defended&quot; only costs you later, in front of real people.</li>
              <li>▸ {total} questions: {p.questions.length} from this paper&apos;s reading list plus 3 standard probes.</li>
              <li>▸ Defended ≥ 80% · Partial ≥ 50%.</li>
            </ul>
            {prior && (
              <div className="mt-4 font-mono text-xs text-faint">
                previous attempt: {prior.verdict} · {prior.score}/{prior.total} · {prior.date}
              </div>
            )}
            <button className="btn btn-acc mt-6" onClick={() => setPhase("question")}>Begin interrogation</button>
          </div>
        )}

        {phase === "question" && (
          <div key={idx} className="rise-in">
            <div className="mono-label text-acc-frontier">
              Q{idx + 1} · {questions[idx].kind}
            </div>
            <h2 className="mt-3 text-lg font-medium leading-relaxed text-ink">{questions[idx].q}</h2>

            {!committed ? (
              <div className="mt-5">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={5}
                  autoFocus
                  className="w-full font-mono text-[13px]"
                  placeholder="Sketch your answer here (or answer fully on paper)…"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn btn-acc" disabled={answer.trim().length < 3} onClick={() => setCommitted(true)}>
                    Commit answer
                  </button>
                  <button className="btn" onClick={() => { setAnswer("(answered on paper)"); setCommitted(true); }}>
                    I answered on paper
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                {answer !== "(answered on paper)" && (
                  <div className="rounded-md border border-line bg-panel2/60 px-3 py-2.5 font-mono text-[12.5px] text-dim">
                    {answer}
                  </div>
                )}
                <p className="mt-3 text-sm text-dim">
                  Now interrogate your own answer: is it <i>specific</i> (numbers, names, mechanisms), and could you
                  defend it against a follow-up &quot;why&quot;? Then grade it.
                </p>
                <div className="mt-3 flex gap-2">
                  <button className="btn btn-acc" onClick={() => grade(true)}>✓ I had it</button>
                  <button className="btn btn-danger" onClick={() => grade(false)}>✗ I missed it</button>
                </div>
              </div>
            )}

            <div className="mt-8 h-1 overflow-hidden rounded-full bg-panel2">
              <div className="h-full rounded-full bg-acc-frontier transition-all" style={{ width: `${(idx / total) * 100}%` }} />
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="scale-in text-center">
            <div className="mono-label text-acc-frontier">verdict</div>
            <h1
              className="mt-2 font-mono text-4xl font-bold tracking-widest"
              style={{ color: score / total >= 0.8 ? "#52d68a" : score / total >= 0.5 ? "#e8b34d" : "#f4586e" }}
            >
              {score / total >= 0.8 ? "DEFENDED" : score / total >= 0.5 ? "PARTIAL" : "UNDEFENDED"}
            </h1>
            <div className="mt-2 font-mono text-sm text-dim">{score} / {total}</div>
            <p className="mx-auto mt-4 max-w-md text-sm text-dim">
              {score / total >= 0.8
                ? "You own this paper. Log the misses in your notes anyway. They're your sharpest review questions."
                : score / total >= 0.5
                  ? "Real gaps, honestly found. Re-read only the sections behind your misses, not the whole paper, then defend again."
                  : "This paper isn't yours yet, and now you know precisely where. That's the whole point of the exercise. Re-read with the missed questions open beside you."}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href={`/papers/${paperId}`} className="btn btn-acc">Back to paper</Link>
              <button
                className="btn"
                onClick={() => { setPhase("brief"); setIdx(0); setGrades([]); setAnswer(""); setCommitted(false); }}
              >
                Defend again
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
