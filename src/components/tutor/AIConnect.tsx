"use client";

// Connect your AI to HALO. The headline path is the BRIDGE: a tiny script on
// your PC (or any always-on box) that answers through your own Claude Code /
// ChatGPT Codex logins — no API keys anywhere. API keys remain as an
// advanced fallback for when no machine of yours is running.

import { useCallback, useEffect, useState } from "react";

type Provider = "anthropic" | "openai";
type Engine = "claude" | "codex";

interface Linked {
  anthropic: boolean;
  openai: boolean;
  prefer: Provider;
  bridge: Engine;
}

const NAMES: Record<Provider, string> = { anthropic: "Claude", openai: "ChatGPT" };
const KEY_URLS: Record<Provider, string> = {
  anthropic: "console.anthropic.com/settings/keys",
  openai: "platform.openai.com/api-keys",
};

export function AIConnect({ compact }: { compact?: boolean }) {
  const [linked, setLinked] = useState<Linked | null | "unauthed">(null);
  const [bridge, setBridge] = useState<{ exists: boolean; online: boolean } | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [open, setOpen] = useState<Provider | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/tutor/config")
      .then(async (r) => {
        if (!r.ok) return setLinked("unauthed");
        setLinked((await r.json()) as Linked);
      })
      .catch(() => setLinked("unauthed"));
    fetch("/api/bridge/token")
      .then(async (r) => { if (r.ok) setBridge((await r.json()) as { exists: boolean; online: boolean }); })
      .catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const makeToken = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/bridge/token", { method: "POST" });
      const j = (await r.json()) as { ok?: boolean; token?: string };
      if (j.ok && j.token) { setFreshToken(j.token); refresh(); }
      else setMsg("✗ couldn't create a bridge key");
    } finally {
      setBusy(false);
    }
  };

  const setEngine = async (engine: Engine) => {
    await fetch("/api/tutor/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bridge: engine }),
    }).catch(() => {});
    refresh();
  };

  const connect = async (provider: Provider) => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/tutor/config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, key }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (j.ok) { setMsg(`✓ ${NAMES[provider]} key linked.`); setKey(""); setOpen(null); refresh(); }
      else setMsg(`✗ ${j.error ?? `failed (${r.status})`}`);
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (provider: Provider) => {
    setBusy(true); setMsg(null);
    await fetch("/api/tutor/config", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider }),
    }).catch(() => {});
    setBusy(false); refresh();
  };

  if (linked === null) return null;
  if (linked === "unauthed") {
    if (compact) return null;
    return <div className="text-[12.5px] text-faint">Sign in first. AI connections are per account.</div>;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.milanhalo.me";
  const tok = freshToken ?? "halo_YOUR_KEY";
  const command = `curl -fsSL ${origin}/bridge.mjs -o halo-bridge.mjs\nHALO_TOKEN=${tok} node halo-bridge.mjs`;
  const commandWin = `curl.exe -fsSL ${origin}/bridge.mjs -o halo-bridge.mjs\n$env:HALO_TOKEN="${tok}"; node halo-bridge.mjs`;

  return (
    <div className="space-y-3">
      {/* the bridge — your subscriptions, the headline path */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ background: bridge?.online ? "#52d68a" : "#e8b34d" }} />
          <span className="font-mono text-[12.5px] text-ink">your subscriptions</span>
          <span className="text-[11.5px] text-faint">Claude Code · ChatGPT Codex</span>
          {bridge?.online
            ? <span className="text-[11.5px] text-acc-robot">bridge online, tutor runs on your plan</span>
            : <span className="text-[11.5px] text-warn">{bridge?.exists ? "bridge offline, start it on your machine" : "not set up yet"}</span>}
        </div>

        {bridge?.online && (
          <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-dim">
            answer with:
            {(["claude", "codex"] as Engine[]).map((e) => (
              <button
                key={e}
                className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${linked.bridge === e ? "border-acc/50 text-acc" : "border-line2 text-faint hover:text-dim"}`}
                onClick={() => void setEngine(e)}
              >
                {e === "claude" ? "Claude Code" : "Codex"}
              </button>
            ))}
          </div>
        )}

        {!bridge?.online && (
          <div className="mt-2 space-y-2 rounded-md border border-line bg-panel2/50 p-3 text-[12px] text-faint">
            <div>
              One-time setup on your PC (or any box that stays on): make sure <code>claude</code> and/or{" "}
              <code>codex</code> are signed in there, then:
            </div>
            {freshToken ? (
              <>
                <div className="mono-label">mac / linux</div>
                <pre className="overflow-x-auto rounded bg-bg/60 p-2 font-mono text-[11.5px] whitespace-pre text-ink">{command}</pre>
                <div className="mono-label">windows (powershell, e.g. your RDP)</div>
                <pre className="overflow-x-auto rounded bg-bg/60 p-2 font-mono text-[11.5px] whitespace-pre text-ink">{commandWin}</pre>
                <div className="flex gap-2">
                  <button
                    className="btn !py-1 text-xs"
                    onClick={() => { void navigator.clipboard.writeText(command).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                  >
                    {copied ? "✓ copied" : "copy command"}
                  </button>
                  <button className="font-mono text-[11px] text-faint underline-offset-2 hover:underline" onClick={refresh}>
                    I ran it, check again
                  </button>
                </div>
                <div className="text-[11px] text-faint">This key is shown once. Leave the script running. It answers the site&apos;s tutor through your own logins.</div>
              </>
            ) : (
              <button className="btn !py-1.5 text-xs" disabled={busy} onClick={() => void makeToken()}>
                {bridge?.exists ? "create a fresh bridge key" : "create bridge key"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* advanced: API keys */}
      <details className="text-[12px]">
        <summary className="cursor-pointer font-mono text-[11px] text-faint hover:text-dim">
          advanced: API keys (works with no machine of yours running)
        </summary>
        <div className="mt-2 space-y-2">
          {(["anthropic", "openai"] as Provider[]).map((provider) => {
            const on = linked[provider];
            return (
              <div key={provider} className="flex flex-wrap items-center gap-2">
                <span className="inline-block size-2 rounded-full" style={{ background: on ? "#52d68a" : "#2a3646" }} />
                <span className="w-16 font-mono text-[12.5px] text-ink">{NAMES[provider]}</span>
                {on ? (
                  <>
                    <span className="text-[11.5px] text-acc-robot">key linked</span>
                    <button
                      className="font-mono text-[11px] text-faint underline-offset-2 hover:text-alert hover:underline"
                      disabled={busy}
                      onClick={() => void disconnect(provider)}
                    >
                      disconnect
                    </button>
                  </>
                ) : (
                  <button
                    className="rounded-md border border-line2 bg-panel2 px-2.5 py-1 text-[12px] text-dim transition-colors hover:border-acc/40 hover:text-acc"
                    onClick={() => { setOpen(open === provider ? null : provider); setKey(""); setMsg(null); }}
                  >
                    {open === provider ? "close" : `link ${NAMES[provider]} key`}
                  </button>
                )}
              </div>
            );
          })}
          {open && (
            <div className="rise-in space-y-2 rounded-md border border-line bg-panel2/50 p-3">
              <div className="text-[12px] text-faint">
                Get a key at <b className="text-dim">{KEY_URLS[open]}</b>. Stored with your account, used only for your tutoring.
              </div>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={open === "anthropic" ? "sk-ant-…" : "sk-…"}
                type="password"
                className="w-full font-mono !text-[12.5px]"
                autoComplete="off"
              />
              <button className="btn !py-1.5 text-xs" disabled={busy || key.trim().length < 20} onClick={() => void connect(open)}>
                {busy ? "checking key…" : `link ${NAMES[open]} key`}
              </button>
            </div>
          )}
        </div>
      </details>

      {msg && <div className="text-[11.5px] text-dim">{msg}</div>}
    </div>
  );
}
