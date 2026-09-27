"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useStore, migrate } from "@/lib/store";
import { useAuth } from "@/lib/auth-client";
import { pullAndMerge, pushNow, resetSyncLifecycle } from "@/lib/sync";
import { TutorStatusCard } from "@/components/tutor/TutorStatusCard";
import { MemorySync } from "@/components/MemorySync";
import { AIConnect } from "@/components/tutor/AIConnect";
import { Panel, SectionTitle } from "@/components/ui";
import type { ProgressData } from "@/lib/types";

export default function SettingsPage() {
  const store = useStore();
  const auth = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const download = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const stamp = () => new Date().toISOString().slice(0, 10);
  const exportJson = () => download(`ei-progress-${stamp()}.json`, JSON.stringify(store.exportData(), null, 2), "application/json");
  const exportEverything = async () => {
    const { buildLearnerStateJson, buildLearnerStateMarkdown, buildHandoffMarkdown } = await import("@/lib/learner-state");
    const data = store.exportData();
    download(`ei-progress-${stamp()}.json`, JSON.stringify(data, null, 2), "application/json");
    download(`CURRENT_STATE-${stamp()}.md`, buildLearnerStateMarkdown(data), "text/markdown");
    download(`current-state-${stamp()}.json`, JSON.stringify(buildLearnerStateJson(data), null, 2), "application/json");
    download(`HANDOFF-${stamp()}.md`, buildHandoffMarkdown(data), "text/markdown");
    setMsg("Exported 4 files: full backup + tutor-readable state + handoff. Store them privately — they are yours, not the repo's.");
  };
  const dataBytes = new Blob([JSON.stringify(store.exportData())]).size;

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as ProgressData;
        if (!data || typeof data !== "object" || !data.nodes) throw new Error("not a progress export");
        store.importData(migrate(data));
        setMsg("Import complete.");
      } catch (e) {
        setMsg(`Import failed: ${(e as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <div className="mono-label">configuration & data</div>
        <h1 className="font-mono text-2xl font-bold">SETTINGS</h1>
      </div>

      {/* account */}
      <Panel accent="#4dd6e8">
        <SectionTitle>account & sync</SectionTitle>
        {auth.status === "authed" && auth.user ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-ink">@{auth.user.username}</span>
              <span
                className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase"
                style={{
                  color: auth.user.role === "admin" ? "#e8b34d" : "#8b97a7",
                  background: auth.user.role === "admin" ? "#e8b34d14" : "#8b97a714",
                }}
              >
                {auth.user.role}
              </span>
              {store.lastSync && (
                <span className={`text-xs ${store.lastSync.ok ? "text-acc-robot" : "text-acc-frontier"}`}>
                  {store.lastSync.message} · {new Date(store.lastSync.at).toLocaleTimeString()}
                </span>
              )}
            </div>
            <p className="text-xs text-dim">
              Progress saves to your account automatically (a few seconds after each change) and follows you
              across devices — sign in anywhere with the same username.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn"
                onClick={async () => {
                  try { setMsg(await pullAndMerge()); } catch (e) { setMsg((e as Error).message); }
                }}
              >
                ↓ Pull & merge
              </button>
              <button
                className="btn"
                onClick={async () => {
                  try { setMsg(await pushNow()); } catch (e) { setMsg((e as Error).message); }
                }}
              >
                ↑ Push now
              </button>
              {auth.user.role === "admin" && (
                <Link href="/admin" className="btn">⛨ Manage users</Link>
              )}

              <button
                className="btn btn-danger"
                onClick={async () => {
                  await auth.logout();
                  resetSyncLifecycle();
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        ) : auth.status === "guest" ? (
          <div className="space-y-3">
            <p className="text-sm text-dim">
              <b className="text-ink">Guest view.</b> Anything you do here stays in this browser only. An
              account saves your progress and unlocks the tutor.
            </p>
            <button className="btn" onClick={auth.leaveGuest}>Sign in or join</button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-dim">
              <b className="text-ink">Local mode.</b> This deployment has no account backend, so progress lives
              in this browser only (plus your JSON exports below).
            </p>
            <p className="text-xs text-faint">
              To enable accounts + cross-device sync: in Vercel open <b>Storage → Create Database → Upstash for
              Redis</b>, link it to the project, redeploy (~3 minutes). The first account registered becomes the
              administrator; later registrations wait for approval. Full steps in the README.
            </p>
          </div>
        )}
        {msg && <div className="mt-2 text-xs text-dim">{msg}</div>}
      </Panel>

      {auth.status === "authed" && <PasswordPanel />}

      {/* tutor */}
      {/* appearance — size the whole UI to taste */}
      <Panel>
        <SectionTitle>Appearance</SectionTitle>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-dim">Text &amp; layout size</span>
              <span className="font-mono text-[12px] text-acc">{Math.round((store.settings.uiScale ?? 1) * 100)}%</span>
            </div>
            <input
              type="range" min={0.85} max={1.4} step={0.05}
              value={store.settings.uiScale ?? 1}
              onChange={(e) => store.updateSettings({ uiScale: Number(e.target.value) })}
              className="mt-2 w-full accent-[var(--color-acc)]"
            />
            <div className="mt-1 flex justify-between text-[10.5px] text-faint"><span>Compact</span><span>Comfortable</span><span>Large</span></div>
          </div>
          <div className="flex gap-1.5">
            {([["Default", 1], ["Bigger", 1.15], ["Biggest", 1.3]] as const).map(([label, v]) => (
              <button
                key={label}
                onClick={() => store.updateSettings({ uiScale: v })}
                className={`rounded-md border px-2.5 py-1.5 text-[12px] transition-colors ${
                  Math.abs((store.settings.uiScale ?? 1) - v) < 0.01 ? "border-acc/50 text-acc" : "border-line2 text-dim hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11.5px] text-faint">Scales everything together, so cards and spacing stay in proportion. Saved to your account.</p>
        <button
          className="btn mt-3 !py-1.5 text-xs"
          onClick={() => window.dispatchEvent(new Event("halo-rundown-replay"))}
        >
          Replay the tour
        </button>
      </Panel>

      <Panel accent="#52d68a">
        <SectionTitle>tutor</SectionTitle>
        <TutorStatusCard />
      </Panel>

      {/* AI connections */}
      <Panel accent="#4dd6e8">
        <SectionTitle>connections — your AI</SectionTitle>
        <AIConnect />
      </Panel>

      {/* AI memory */}
      <Panel accent="#a78bfa">
        <SectionTitle>memory — your AI&apos;s long-term recall</SectionTitle>
        <MemorySync />
      </Panel>

      {/* program */}
      <Panel>
        <SectionTitle>program</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mono-label">day 1 (start date)</span>
            <input
              type="date"
              value={store.settings.startDate ?? ""}
              onChange={(e) => store.updateSettings({ startDate: e.target.value || undefined })}
              className="mt-1"
            />
          </label>
          <label className="block">
            <span className="mono-label">daily focused-hours target</span>
            <input
              type="number" min={3} max={10} step={0.5}
              value={store.settings.dailyHoursTarget}
              onChange={(e) => store.updateSettings({ dailyHoursTarget: Number(e.target.value) })}
              className="mt-1"
            />
          </label>
          <label className="block">
            <span className="mono-label">GPU tier (drives compute notes)</span>
            <select
              value={store.settings.gpuTier}
              onChange={(e) => store.updateSettings({ gpuTier: e.target.value as typeof store.settings.gpuTier })}
              className="mt-1"
            >
              <option value="none">CPU only</option>
              <option value="12">12 GB (4070-class)</option>
              <option value="16">16 GB (4080/5080)</option>
              <option value="24">24 GB (3090/4090) — recommended</option>
              <option value="32+">32 GB+ (5090+)</option>
            </select>
          </label>
          <label className="block">
            <span className="mono-label">research mode (month-7 UI)</span>
            <select
              value={store.settings.researchModeOverride == null ? "auto" : store.settings.researchModeOverride ? "on" : "off"}
              onChange={(e) => {
                const v = e.target.value;
                store.updateSettings({ researchModeOverride: v === "auto" ? undefined : v === "on" });
              }}
              className="mt-1"
            >
              <option value="auto">auto (Day ≥181 or VLA Boss)</option>
              <option value="on">force on</option>
              <option value="off">force off</option>
            </select>
          </label>
        </div>
      </Panel>

      {/* backup */}
      <Panel>
        <SectionTitle>backup / restore</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-acc" onClick={exportEverything}>⬇ Export everything</button>
          <button className="btn" onClick={exportJson}>⬇ JSON only</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬆ Import (merge-replace)</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
        <p className="mt-2 text-xs text-faint">
          &quot;Everything&quot; = full backup + CURRENT_STATE.md / current-state.json / HANDOFF.md — the
          provider-neutral tutor snapshot (paste into any fresh Claude/ChatGPT session). Downloads only:
          nothing is auto-committed to the public repo. Export weekly — a file you hold beats every cloud.
        </p>
        <p className="mt-1 font-mono text-[11px] text-faint">
          data size: {(dataBytes / 1024).toFixed(0)} KB{dataBytes > 2 * 1024 * 1024 ? " — large; export now and keep the habit" : ""} · evidence events: {store.events.length}
        </p>
      </Panel>

      {/* danger */}
      <Panel accent="#f4586e">
        <SectionTitle>danger zone</SectionTitle>
        {!confirmReset ? (
          <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>Reset ALL progress…</button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-acc-frontier">Erases every node, log, experiment and idea on this device. Export first.</span>
            <button className="btn btn-danger" onClick={() => { store.resetAll(); setConfirmReset(false); }}>Yes, erase everything</button>
            <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        )}
      </Panel>

      <div className="text-center text-[11px] text-faint">
        HALO · PROJECT : VANTA HALO · curriculum verified 2026-08-21 · content is code — see docs/ in the repo
      </div>
    </div>
  );
}

// Password change + one-time recovery code. No email infra by design (ADR-004):
// the recovery code is the self-service lockout path; ADMIN_RESET_TOKEN is break-glass.
function PasswordPanel() {
  const auth = useAuth();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const change = async () => {
    if (busy) return;
    if (next !== confirm) { setNote({ tone: "error", text: "New passwords do not match." }); return; }
    setBusy(true); setNote(null);
    try {
      const r = await auth.changePassword(cur, next);
      if (r.ok) { setNote({ tone: "ok", text: r.note ?? "Password changed." }); setCur(""); setNext(""); setConfirm(""); }
      else setNote({ tone: "error", text: r.error ?? "Could not change password." });
    } finally { setBusy(false); }
  };
  const generate = async () => {
    if (busy) return;
    setBusy(true); setNote(null); setCopied(false);
    try {
      const r = await auth.generateRecoveryCode();
      if (r.ok && r.code) setCode(r.code);
      else setNote({ tone: "error", text: r.error ?? "Could not generate a code." });
    } finally { setBusy(false); }
  };
  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setCopied(true); } catch { /* clipboard unavailable; the code is selectable */ }
  };

  return (
    <Panel>
      <SectionTitle>password & recovery</SectionTitle>
      <form onSubmit={(e) => { e.preventDefault(); change(); }} className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mono-label">current password</span>
          <input type="password" autoComplete="current-password" className="mt-1" value={cur} onChange={(e) => setCur(e.target.value)} />
        </label>
        <label className="block">
          <span className="mono-label">new password</span>
          <input type="password" autoComplete="new-password" className="mt-1" placeholder="at least 8 characters" value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        <label className="block">
          <span className="mono-label">confirm new password</span>
          <input type="password" autoComplete="new-password" className="mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <button type="submit" className="btn btn-acc" disabled={busy || !cur || next.length < 8 || !confirm}>Change password</button>
          <span className="text-xs text-faint">Signs out every other device; this one stays signed in.</span>
        </div>
      </form>

      <div className="mt-4 border-t border-line pt-3">
        <p className="text-sm text-dim">
          <b className="text-ink">Recovery code.</b> There is no email reset here, on purpose. If you forget your
          password, this code lets you set a new one from the sign-in screen (&quot;Forgot your password?&quot;).
          It is shown once and works once.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button className="btn" onClick={generate} disabled={busy}>{code ? "Generate a new code" : "Generate recovery code"}</button>
          {code && <button className="btn" onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button>}
        </div>
        {code && (
          <div className="mt-2 rounded-md border border-acc-math/40 bg-panel2 px-3 py-2">
            <div className="select-all font-mono text-[15px] tracking-wider text-ink">{code}</div>
            <div className="mt-1 text-[11px] text-acc-math">
              Save this somewhere private now. It will not be shown again; generating a new one replaces it.
            </div>
          </div>
        )}
      </div>
      {note && <div className={`mt-2 text-xs ${note.tone === "ok" ? "text-acc-robot" : "text-acc-frontier"}`}>{note.text}</div>}
    </Panel>
  );
}
