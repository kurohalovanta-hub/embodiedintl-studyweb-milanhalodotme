"use client";

// Link a PRIVATE GitHub repo as this account's AI memory. The app commits an
// AI-readable digest there (progress + weaknesses + recent tutor chats) so any
// assistant — the in-app tutor, ChatGPT, a fresh Claude — can pick up where
// the last one left off. Token is stored server-side and never echoed back.

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-client";
import { buildProgressDigest } from "@/lib/memory-digest";

type State =
  | { s: "loading" }
  | { s: "unauthed" }
  | { s: "unlinked" }
  | { s: "linked"; repo: string; source: "user" | "env" };

export function MemorySync({ compact }: { compact?: boolean }) {
  const store = useStore();
  const auth = useAuth();
  const [state, setState] = useState<State>({ s: "loading" });
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/memory")
      .then(async (r) => {
        if (r.status === 401 || r.status === 501) return setState({ s: "unauthed" });
        const j = (await r.json()) as { configured?: boolean; repo?: string; source?: "user" | "env" };
        setState(j.configured && j.repo ? { s: "linked", repo: j.repo, source: j.source ?? "user" } : { s: "unlinked" });
      })
      .catch(() => setState({ s: "unauthed" }));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const link = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/memory", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repo, token }),
      });
      const j = (await r.json()) as { ok?: boolean; repo?: string; error?: string };
      if (j.ok) {
        setMsg(`✓ Linked ${j.repo}. Syncing your memory there now.`);
        setToken(""); setFormOpen(false);
        refresh();
        await syncNow(true);
      } else setMsg(`✗ ${j.error ?? `failed (${r.status})`}`);
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async (silent = false) => {
    setBusy(true);
    if (!silent) setMsg(null);
    try {
      const digest = buildProgressDigest({ nodes: store.nodes, events: store.events, logs: store.logs, tutorChats: store.tutorChats, weeklies: store.weeklies, ideas: store.ideas, experiments: store.experiments, papers: store.papers });
      const r = await fetch("/api/memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ digest }),
      });
      const j = (await r.json()) as { ok?: boolean; path?: string; repo?: string; error?: string };
      setMsg(j.ok ? `✓ Memory synced → ${j.repo}/${j.path}` : `✗ ${j.error ?? `sync failed (${r.status})`}`);
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true); setMsg(null);
    await fetch("/api/memory", { method: "DELETE" }).catch(() => {});
    setBusy(false);
    setMsg("Unlinked. The repo and its history stay yours. The app stops writing there.");
    refresh();
  };

  if (state.s === "loading") return null;
  if (state.s === "unauthed") {
    if (compact) return null;
    return (
      <div className="text-[12.5px] text-faint">
        Sign in first. Memory is per account{auth.status === "local" ? " (this deployment has no accounts yet)" : ""}.
      </div>
    );
  }

  return (
    <div className={compact ? "" : "space-y-2"}>
      {state.s === "linked" ? (
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-dim">
          <span className="inline-block size-2 rounded-full bg-acc-robot" />
          <span>AI memory → <b className="text-ink">{state.repo}</b>{state.source === "env" && " (deployment default)"}</span>
          <button className="btn !py-1 text-xs" disabled={busy} onClick={() => void syncNow()}>⇪ sync now</button>
          {state.source === "user" && (
            <button className="font-mono text-[11px] text-faint underline-offset-2 hover:text-alert hover:underline" disabled={busy} onClick={() => void unlink()}>
              unlink
            </button>
          )}
        </div>
      ) : (
        <div className="text-[12.5px] leading-relaxed text-dim">
          <b className="text-ink">No memory repo linked.</b> Link a <b>private</b> GitHub repo and the app keeps an
          AI-readable file there (progress, weaknesses, recent tutor chats) so any assistant (Claude here,
          ChatGPT elsewhere) can pick up exactly where the last one stopped.{" "}
          <button className="text-acc underline-offset-2 hover:underline" onClick={() => setFormOpen(!formOpen)}>
            {formOpen ? "close" : "link one →"}
          </button>
        </div>
      )}

      {formOpen && state.s !== "linked" && (
        <div className="rise-in space-y-2 rounded-md border border-line bg-panel2/50 p-3">
          <ol className="list-decimal space-y-1 pl-4 text-[12px] text-faint">
            <li>Create a <b className="text-dim">private</b> repo on GitHub (e.g. <code>my-learning-memory</code>).</li>
            <li>Make a fine-grained token at github.com → Settings → Developer settings → Fine-grained tokens: access to <b className="text-dim">only that repo</b>, permission <b className="text-dim">Contents: read &amp; write</b>.</li>
          </ol>
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo  (e.g. milan/my-learning-memory)"
            className="w-full font-mono !text-[12.5px]"
            autoComplete="off"
          />
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_…"
            type="password"
            className="w-full font-mono !text-[12.5px]"
            autoComplete="off"
          />
          <button className="btn !py-1.5 text-xs" disabled={busy || !repo || !token} onClick={() => void link()}>
            {busy ? "…" : "link & first sync"}
          </button>
        </div>
      )}

      {msg && <div className="text-[11.5px] text-dim">{msg}</div>}
    </div>
  );
}
