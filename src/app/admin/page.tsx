"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-client";
import { EmptyState, Panel, SectionTitle } from "@/components/ui";

interface AdminUser {
  username: string;
  role: "admin" | "user";
  approved: boolean;
  createdAt: number;
}

export default function AdminPage() {
  const auth = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [msg, setMsg] = useState("");
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.ok) setUsers(((await res.json()) as { users: AdminUser[] }).users);
    else setMsg(`Failed to load users (HTTP ${res.status}).`);
  }, []);

  useEffect(() => {
    if (auth.status !== "authed" || auth.user?.role !== "admin") return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [auth.status, auth.user?.role, load]);

  const act = async (username: string, action: string, extra?: Record<string, unknown>) => {
    setMsg("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, action, ...extra }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setMsg(data.error ?? `Action failed (HTTP ${res.status}).`);
    else setMsg(`${action} → ${username} ✓`);
    load();
  };

  if (auth.status !== "authed" || auth.user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg pt-16">
        <EmptyState title="Administrators only" hint="Sign in with an admin account to manage access." />
      </div>
    );
  }

  const pending = users?.filter((u) => !u.approved) ?? [];
  const active = users?.filter((u) => u.approved) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <div className="mono-label">access control</div>
        <h1 className="font-mono text-2xl font-bold">ADMIN</h1>
        <p className="mt-1 text-sm text-dim">
          Anyone can join and sign in straight away. Revoke an account to switch it off and sign that person out everywhere, or delete it.
        </p>
      </div>

      {msg && <div className="text-xs text-acc-math">{msg}</div>}

      <SharingPanel />

      {pending.length > 0 && (
      <Panel accent="#e8b34d">
        <SectionTitle>switched off · {pending.length}</SectionTitle>
        {(
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.username} className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel2 px-3 py-2">
                <span className="min-w-0 flex-1 font-mono text-sm">{u.username}</span>
                <span className="text-[11px] text-faint">{new Date(u.createdAt).toLocaleDateString()}</span>
                <button className="btn btn-acc !py-1" onClick={() => act(u.username, "approve")}>Switch on</button>
                <button className="btn btn-danger !py-1" onClick={() => act(u.username, "delete")}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </Panel>
      )}

      <Panel>
        <SectionTitle>active accounts · {active.length}</SectionTitle>
        <div className="space-y-2">
          {active.map((u) => (
            <div key={u.username} className="rounded-md border border-line bg-panel2 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 font-mono text-sm">
                  {u.username}
                  {u.username === auth.user?.username && <span className="ml-2 text-[10px] text-faint">(you)</span>}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase"
                  style={{ color: u.role === "admin" ? "#e8b34d" : "#8b97a7", background: u.role === "admin" ? "#e8b34d14" : "#8b97a714" }}
                >
                  {u.role}
                </span>
                {u.username !== auth.user?.username && (
                  <>
                    {u.role === "user" ? (
                      <button className="btn !py-1 text-xs" onClick={() => act(u.username, "promote")}>promote</button>
                    ) : (
                      <button className="btn !py-1 text-xs" onClick={() => act(u.username, "demote")}>demote</button>
                    )}
                    <button className="btn !py-1 text-xs" onClick={() => act(u.username, "revoke")}>revoke</button>
                    <button className="btn btn-danger !py-1 text-xs" onClick={() => act(u.username, "delete")}>delete</button>
                  </>
                )}
                <button className="btn !py-1 text-xs" onClick={() => { setResetFor(resetFor === u.username ? null : u.username); setNewPw(""); }}>
                  reset pw
                </button>
              </div>
              {resetFor === u.username && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="password"
                    placeholder="new password (min 8)"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                  />
                  <button
                    className="btn btn-acc shrink-0 !py-1"
                    disabled={newPw.length < 8}
                    onClick={() => { act(u.username, "reset-password", { newPassword: newPw }); setResetFor(null); }}
                  >
                    set
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

interface Share { enabled: boolean; owner: string | null; allow: string[]; cap: number }

function SharingPanel() {
  const [cfg, setCfg] = useState<Share | null>(null);
  const [add, setAdd] = useState("");
  const [cap, setCap] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/sharing", { cache: "no-store" });
    if (r.ok) { const c = (await r.json()) as Share; setCfg(c); setCap(String(c.cap || "")); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const put = async (body: Record<string, unknown>) => {
    const r = await fetch("/api/admin/sharing", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { setCfg((await r.json()) as Share); setMsg(""); } else setMsg(`Failed (HTTP ${r.status}).`);
  };

  if (!cfg) return null;
  return (
    <Panel accent="#4dd6e8">
      <SectionTitle>Share your tutor</SectionTitle>
      <p className="mb-2 text-[13px] leading-relaxed text-dim">
        Lend your Claude Code bridge to specific people. Their questions run on your subscription in safe, web-only
        mode; their progress and chats stay in their own accounts, never mixed with yours. Nothing on your machine
        changes. For this to stay safe, keep your bridge in normal mode, not full-control.
      </p>
      <div className="mb-3 rounded-md border border-line bg-panel2/50 px-3 py-2 text-[12px] leading-relaxed text-faint">
        The order: a person joins at your site (www.milanhalo.me), they show up under <b className="text-dim">active accounts</b> below, then you add their username here.
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className={cfg.enabled ? "btn btn-acc !py-1.5" : "btn !py-1.5"}
          onClick={() => put({ enabled: !cfg.enabled })}
        >
          {cfg.enabled ? "Sharing is ON" : "Turn sharing on"}
        </button>
        {cfg.enabled && cfg.owner && <span className="text-[12px] text-faint">served by @{cfg.owner}&apos;s bridge</span>}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="text-[11.5px] font-medium text-faint">daily questions per person (blank = unlimited)</span>
          <input
            className="mt-1 !w-56 font-mono !text-[12.5px]"
            inputMode="numeric"
            placeholder="unlimited"
            value={cap}
            onChange={(e) => setCap(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </label>
        <button className="btn !py-1.5" onClick={() => put({ cap: cap === "" ? 0 : Number(cap) })}>Set cap</button>
      </div>

      <div className="mt-4">
        <div className="text-[11.5px] font-medium text-faint">people who can use your tutor</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {cfg.allow.length === 0 && <span className="text-[12px] text-faint">nobody yet</span>}
          {cfg.allow.map((u) => (
            <span key={u} className="inline-flex items-center gap-1.5 rounded-md border border-line2 bg-panel2 px-2 py-1 text-[12px] text-ink">
              @{u}
              <button className="text-faint hover:text-alert" onClick={() => put({ remove: u })}>×</button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className="!w-56 font-mono !text-[12.5px]"
            placeholder="username to add"
            autoCapitalize="none"
            value={add}
            onChange={(e) => setAdd(e.target.value)}
          />
          <button className="btn btn-acc !py-1.5" disabled={add.trim().length < 3} onClick={() => { put({ add: add.trim() }); setAdd(""); }}>Add</button>
        </div>
      </div>
      {msg && <div className="mt-2 text-[11.5px] text-acc-math">{msg}</div>}
    </Panel>
  );
}
