"use client";

// AGENT — direct terminal to the full-control brain. Whatever you type goes
// straight to `claude --dangerously-skip-permissions` in the project folder
// on YOUR machine via your bridge. No tutor rules. Your account only.

import { useEffect, useRef, useState } from "react";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export default function AgentPage() {
  const [avail, setAvail] = useState<"checking" | "ready" | "offline">("checking");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/agent")
      .then((r) => r.json())
      .then((j: { available?: boolean; models?: string[] }) => {
        if (!alive) return;
        setAvail(j.available ? "ready" : "offline");
        setModels(j.models ?? []);
      })
      .catch(() => { if (alive) setAvail("offline"); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  const run = async () => {
    const text = input.trim();
    if (!text || running) return;
    setInput("");
    const history: Turn[] = [...turns, { role: "user", content: text }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setRunning(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history, ...(model ? { model } : {}) }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setTurns([...history, { role: "assistant", content: `⚠ ${j?.error ?? `agent unavailable (${res.status})`}` }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setTurns([...history, { role: "assistant", content: full }]);
      }
    } catch {
      setTurns([...history, { role: "assistant", content: "⚠ connection dropped, send again." }]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="mono-label text-acc">agent · direct terminal</div>
          <h1 className="font-mono text-xl font-bold tracking-tight">&gt;_ your machine</h1>
        </div>
        <span className={`rounded px-1.5 py-0.5 font-mono text-[10.5px] ${avail === "ready" ? "bg-acc-robot/15 text-acc-robot" : "bg-warn/15 text-warn"}`}>
          {avail === "checking" ? "…" : avail === "ready" ? "BRIDGE ONLINE: FULL CONTROL" : "BRIDGE OFFLINE"}
        </span>
        {models.length > 0 && (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={running}
            className="ml-auto !w-auto !py-1 font-mono !text-[11.5px]"
            aria-label="model"
          >
            <option value="">model: auto</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      <p className="text-[12px] leading-relaxed text-faint">
        Talks straight to Claude Code with full permissions in <code>C:\halo\Learn</code> on your machine.
        It can edit the site, run commands, push to GitHub. No tutor rules apply here, and nothing done
        here counts as learning evidence.
      </p>

      {avail === "offline" && (
        <div className="rounded-md border border-warn/40 bg-warn/5 px-3 py-2 text-[12.5px] text-warn">
          Your bridge isn&apos;t reachable. Start it on your machine (it auto-starts at logon), then reload.
        </div>
      )}

      <div ref={scrollRef} className="h-[52vh] overflow-y-auto rounded-lg border border-line bg-bg/80 p-3 font-mono text-[12.5px] leading-relaxed">
        {turns.length === 0 && (
          <div className="text-faint">$ waiting. Try: &quot;list the files you can see&quot; or &quot;what changed in the last commit?&quot;</div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "mt-3 text-acc" : "mt-1 whitespace-pre-wrap text-ink"}>
            {t.role === "user" ? `$ ${t.content}` : (t.content || <span className="text-faint">working…</span>)}
          </div>
        ))}
      </div>

      <div className="flex items-end gap-1.5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void run(); }
          }}
          rows={2}
          placeholder={avail === "ready" ? "tell your machine what to do (Enter runs it)" : "bridge offline"}
          disabled={avail !== "ready"}
          className="flex-1 resize-y font-mono !text-[12.5px]"
        />
        <button className="btn btn-acc !py-2 text-xs" disabled={avail !== "ready" || running || !input.trim()} onClick={() => void run()}>
          {running ? "running…" : "run"}
        </button>
        {turns.length > 0 && !running && (
          <button className="btn !py-2 text-xs" onClick={() => setTurns([])}>clear</button>
        )}
      </div>
    </div>
  );
}
