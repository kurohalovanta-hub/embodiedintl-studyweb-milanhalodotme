"use client";

// Tutor connection status. The happy path is per-account: connect YOUR Claude
// or ChatGPT once, tutor works everywhere. Local Claude Code and a deployment
// key are quieter fallbacks, never homework for the user.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AIConnect } from "@/components/tutor/AIConnect";

type Backend = "bridge-claude" | "bridge-codex" | "your-claude" | "your-chatgpt" | "cli" | "deployment";
type Status =
  | { state: "checking" }
  | { state: "connected"; backend: Backend }
  | { state: "off"; reason: string };

const BACKEND_LABEL: Record<Backend, string> = {
  "bridge-claude": "your Claude Code subscription (via your bridge)",
  "bridge-codex": "your ChatGPT Codex subscription (via your bridge)",
  "your-claude": "your Claude key",
  "your-chatgpt": "your ChatGPT key",
  "cli": "your Claude Code subscription (this machine)",
  "deployment": "this deployment's shared key",
};

export function TutorStatusCard() {
  const [status, setStatus] = useState<Status>({ state: "checking" });

  // state changes happen only in async continuations (hooks-compiler safe)
  const check = useCallback(() => {
    fetch("/api/tutor")
      .then((r) => r.json())
      .then((j: { available?: boolean; reason?: string; backend?: Backend }) => {
        setStatus(
          j.available && j.backend
            ? { state: "connected", backend: j.backend }
            : { state: "off", reason: j.reason ?? "no-key" },
        );
      })
      .catch(() => setStatus({ state: "off", reason: "no-key" }));
  }, []);

  useEffect(() => { check(); }, [check]);

  const probe = () => {
    setStatus({ state: "checking" });
    check();
  };

  const dot =
    status.state === "connected" ? "#52d68a" : status.state === "checking" ? "#8b97a7" : "#e8b34d";

  return (
    <div className="rounded-md border border-line bg-panel2/50 p-3">
      <div className="flex items-center gap-2">
        <span className="inline-block size-2 rounded-full" style={{ background: dot }} />
        <span className="text-[11px] font-medium text-faint">Your tutor</span>
        <button
          className="ml-auto font-mono text-[11px] text-dim underline-offset-2 hover:text-acc hover:underline"
          onClick={probe}
        >
          check again
        </button>
      </div>
      <div className="mt-1.5 text-[12.5px] leading-relaxed text-dim">
        {status.state === "checking" && "checking…"}
        {status.state === "connected" && (
          <><b className="text-acc-robot">Live, running on {BACKEND_LABEL[status.backend]}.</b> Ask anything from Today or any node; every conversation is saved to your account.</>
        )}
        {status.state === "off" && status.reason === "sign-in" && (
          <><b className="text-warn">Sign in to wake your tutor.</b> Claude Max 20x plan recommended. A lot of projects unlock as your total skills proven goes up. Keep your GitHub handy to save your data.</>
        )}
        {status.state === "off" && status.reason === "connect" && (
          <div className="space-y-2">
            <div><b className="text-warn">One step left:</b> connect your Claude or ChatGPT and the tutor comes alive, here, on your phone, everywhere.</div>
            <AIConnect compact />
          </div>
        )}
        {status.state === "off" && (status.reason === "no-key" || status.reason === "needs-accounts") && (
          <><b className="text-warn">Tutor offline on this deployment.</b> Accounts have to be enabled first, then every user connects their own AI in <Link href="/settings" className="text-acc hover:underline">Settings</Link>.</>
        )}
      </div>
    </div>
  );
}
