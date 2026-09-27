"use client";

import { useState } from "react";
import { Halo, HaloMark } from "@/components/brand/Halo";
import { TutorStatusCard } from "@/components/tutor/TutorStatusCard";
import { useAuth } from "@/lib/auth-client";
import { startSync } from "@/lib/sync";

export function LoginGate() {
  const auth = useAuth();
  const firstRun = !auth.bootstrapped;
  const [mode, setMode] = useState<"login" | "register" | "recover">(firstRun ? "register" : "login");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "register") {
        const r = await auth.register(username, password);
        if (!r.ok) setMsg({ tone: "error", text: r.error ?? "That didn't work." });
        else if (r.approved) {
          const l = await auth.login(username, password);
          if (l.ok) startSync();
          else setMsg({ tone: "ok", text: "You're set up. Sign in." });
        } else {
          setMsg({ tone: "ok", text: "You're set up. Sign in." });
          setMode("login");
        }
      } else if (mode === "recover") {
        const r = await auth.resetWithCode(username, code, password);
        if (r.ok) {
          setMsg({ tone: "ok", text: r.note ?? "Password reset. Sign in with it now." });
          setMode("login");
          setCode("");
          setPassword("");
        } else setMsg({ tone: "error", text: r.error ?? "That didn't work." });
      } else {
        const r = await auth.login(username, password);
        if (r.ok) startSync();
        else setMsg({ tone: "error", text: r.error ?? "Wrong username or password." });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* hero — crafted aurora + a drawn halo, the climb */}
      <div className="aurora grain relative flex min-h-[42vh] flex-1 items-end overflow-hidden lg:min-h-screen">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070a10] via-[#070a10]/10 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#070a10]/30 lg:to-[#070a10]/70" aria-hidden />
        <div className="pointer-events-none absolute right-0 top-1/2 z-[1] -translate-y-1/2 opacity-95 lg:right-10 xl:right-24">
          <Halo size={480} className="hidden max-w-[48vw] lg:block" />
          <Halo size={250} className="lg:hidden" />
        </div>
        <div className="relative z-10 max-w-xl p-8 lg:p-14">
          <div className="flex items-center gap-2.5">
            <HaloMark size={26} />
            <span className="text-lg font-semibold tracking-[0.24em] text-ink">HALO</span>
          </div>
          <h1 className="mt-5 text-[26px] font-semibold leading-[1.15] text-ink sm:text-4xl">
            One thing a day,<br className="hidden sm:block" /> until you can build the real thing.
          </h1>
          <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-dim">
            A patient climb from zero to embodied-intelligence research. You prove what you know;
            a tutor that remembers you fills the gaps. No streaks, no busywork.
          </p>
        </div>
      </div>

      {/* sign-in — frosted glass over the dark */}
      <div className="flex flex-1 items-center justify-center p-6 lg:max-w-[460px]">
        <div className="w-full max-w-sm">
          <div className="halo-glass rounded-2xl p-6">
            {firstRun ? (
              <div className="mb-4">
                <div className="mono-label text-acc">you&apos;re first</div>
                <div className="mt-1 text-[16px] font-semibold">Set up your account</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
                  Nobody&apos;s here yet, so this one runs the place. Pick a name and password you&apos;ll remember. Anyone who joins later gets in straight away, and you can remove them from Admin.
                </p>
              </div>
            ) : mode === "recover" ? (
              <div className="mb-4">
                <div className="mono-label text-acc">recovery</div>
                <div className="mt-1 text-[16px] font-semibold">Reset your password</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
                  Your username, the recovery code you saved from Settings, and a new password. The code works once. No code? An admin can reset it for you.
                </p>
              </div>
            ) : (
              <div className="mb-4 flex gap-1 rounded-xl border border-line bg-panel2/60 p-1">
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setMsg(null); }}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      mode === m ? "bg-acc/15 text-acc" : "text-dim hover:text-ink"
                    }`}
                  >
                    {m === "login" ? "Sign in" : "Join"}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
              <label className="block">
                <span className="mono-label">username</span>
                <input
                  className="mt-1"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="letters, numbers, _ or -"
                />
              </label>
              {mode === "recover" && (
                <label className="block">
                  <span className="mono-label">recovery code</span>
                  <input
                    className="mt-1 font-mono"
                    autoComplete="one-time-code"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                  />
                </label>
              )}
              <label className="block">
                <span className="mono-label">{mode === "recover" ? "new password" : "password"}</span>
                <input
                  className="mt-1"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "login" ? "••••••••" : "at least 8 characters"}
                />
              </label>

              {msg && (
                <div
                  className="rounded-lg border px-3 py-2 text-xs"
                  style={{
                    borderColor: msg.tone === "error" ? "#f4586e55" : "#52d68a55",
                    color: msg.tone === "error" ? "#f58a99" : "#7de0a8",
                  }}
                >
                  {msg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !username || !password || (mode === "recover" && !code)}
                className="btn btn-glow w-full justify-center !py-2.5 disabled:opacity-40"
              >
                {busy ? "…" : firstRun ? "Create my account" : mode === "login" ? "Sign in" : mode === "recover" ? "Reset password" : "Join"}
              </button>
            </form>

            {!firstRun && (
              <div className="mt-3 text-center">
                {mode === "recover" ? (
                  <button type="button" className="text-xs text-dim hover:text-acc" onClick={() => { setMode("login"); setMsg(null); }}>
                    ← back to sign in
                  </button>
                ) : (
                  <button type="button" className="text-xs text-faint hover:text-acc" onClick={() => { setMode("recover"); setMsg(null); }}>
                    Forgot your password?
                  </button>
                )}
              </div>
            )}
          </div>

          {!firstRun && (
            <button
              type="button"
              onClick={auth.enterGuest}
              className="btn mt-3 w-full justify-center !py-2.5"
            >
              Look around as a guest
            </button>
          )}

          <div className="mt-4"><TutorStatusCard /></div>

          <p className="mt-4 text-center text-[11px] text-faint">
            Your progress and tutor chats save to your account and follow you across devices.
            Guests can see everything, but it only saves in this browser.
          </p>
        </div>
      </div>
    </div>
  );
}
