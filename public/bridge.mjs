#!/usr/bin/env node
// HALO bridge — runs on YOUR machine (PC or any always-on box).
// It answers the website's tutor questions through your own Claude Code
// and/or ChatGPT Codex logins. Nothing to install, no API keys:
//
//   1. Sign in once on this machine:  claude   (and/or)   codex login
//   2. Get a bridge key: HALO → Settings → connections → create bridge key
//   3. Run:  HALO_TOKEN=halo_xxx node bridge.mjs
//
// Optional: HALO_URL=https://your-halo.example (defaults to milanhalo.me)
//           HALO_NO_WEB=1        — forbid the tutor from using web search/fetch
//           HALO_FULL_CONTROL=1  — FULL CONTROL: Claude gets all tools with no
//                                  permission prompts ON THIS MACHINE. Anything you
//                                  ask in the site chat can edit files / run commands
//                                  here. Your machine, your call — off by default.
//           HALO_WORKDIR=path    — where the full-control brain works (default C:\halo\Learn)
//
// Works on macOS, Linux, and Windows (PowerShell:  $env:HALO_TOKEN="halo_xxx"; node bridge.mjs)
// Outbound-only: no ports, no tunnel needed — run it on any box that stays on.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const WIN = process.platform === "win32";
// with shell:true (needed for .cmd shims on Windows) args must be quoted
const spawnCli = (bin, args, cwd) =>
  WIN
    ? spawn(bin, args.map((a) => (/[\s"^&|<>%]/.test(a) ? `"${a.replaceAll('"', '\\"')}"` : a)), { stdio: ["pipe", "pipe", "pipe"], shell: true, cwd })
    : spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"], cwd });

const URL_BASE = (process.env.HALO_URL ?? "https://www.milanhalo.me").replace(/\/+$/, "");
const TOKEN = process.env.HALO_TOKEN ?? "";
if (!TOKEN.startsWith("halo_")) {
  console.error("HALO_TOKEN missing. Create one in HALO → Settings → connections, then:");
  console.error("  HALO_TOKEN=halo_xxx node bridge.mjs");
  process.exit(1);
}

const has = (bin) => {
  try { return spawnSync(bin, ["--version"], { timeout: 15000, shell: WIN }).status === 0; }
  catch { return false; }
};
const HAS_CLAUDE = has("claude");
const HAS_CODEX = has("codex");
if (!HAS_CLAUDE && !HAS_CODEX) {
  console.error("Neither `claude` nor `codex` found on PATH. Install/sign in to at least one first.");
  process.exit(1);
}
const FULL = process.env.HALO_FULL_CONTROL === "1";
const WORKDIR = process.env.HALO_WORKDIR
  ?? (existsSync("C:\\halo\\Learn") ? "C:\\halo\\Learn" : process.cwd());
console.log(`HALO bridge v3 → ${URL_BASE}`);
console.log(`  engines: ${[HAS_CLAUDE && "Claude Code", HAS_CODEX && "ChatGPT Codex"].filter(Boolean).join(" + ")}`);
console.log(FULL
  ? `  mode: FULL CONTROL — Claude has all tools, no prompts, workdir ${WORKDIR}`
  : "  mode: safe — web lookup only (set HALO_FULL_CONTROL=1 for a full agent)");

const api = (path, opts = {}) =>
  fetch(`${URL_BASE}/api/bridge${path}`, {
    ...opts,
    headers: { "x-bridge-token": TOKEN, "content-type": "application/json", ...(opts.headers ?? {}) },
  });

const post = (jobId, payload) =>
  api("", { method: "POST", body: JSON.stringify({ jobId, ...payload }) }).catch(() => {});

const serialize = (messages) =>
  `[Conversation so far — you are TUTOR. Reply ONLY to the last LEARNER message, following your instructions.]\n\n` +
  messages.map((m) => `${m.role === "user" ? "LEARNER" : "TUTOR"}: ${m.content}`).join("\n\n");

const CLAUDE_MODELS = { sonnet: "sonnet", opus: "opus", haiku: "haiku" };

const WEB_TOOLS = process.env.HALO_NO_WEB === "1" ? null : "WebSearch,WebFetch";

function runClaude(job) {
  return new Promise((resolve) => {
    if (job.raw && !FULL) {
      void post(job.id, { error: "FULL CONTROL is not enabled on this bridge - re-run the installer and answer y." }).then(() => resolve());
      return;
    }
    const dir = mkdtempSync(join(tmpdir(), "halo-"));
    const sysFile = join(dir, "system.md");
    writeFileSync(sysFile, job.system, "utf8");
    if (FULL) {
      writeFileSync(sysFile, job.system +
        "\n\nFULL CONTROL: you are running on the learner's own machine with all tools and no permission prompts. Only change files or run commands when the learner explicitly asks for that in this conversation; for ordinary tutoring, just answer.", "utf8");
    }
    const args = job.raw
      // raw terminal: Claude Code with its own defaults, full permissions, in the workdir
      ? [
          "-p", "--output-format", "stream-json", "--include-partial-messages", "--verbose",
          "--dangerously-skip-permissions", "--max-turns", "100",
          "--append-system-prompt", "HALO remote terminal: the prompt may carry prior conversation; act on the owner's LAST message and report concisely.",
        ]
      : [
          "-p", "--output-format", "stream-json", "--include-partial-messages", "--verbose",
          "--system-prompt-file", sysFile,
          ...(FULL
            ? ["--dangerously-skip-permissions", "--max-turns", "40"]
            // web lookup lets the tutor verify links and pull fresh material; nothing else
            : WEB_TOOLS ? ["--tools", WEB_TOOLS, "--max-turns", "6"] : ["--tools", "", "--max-turns", "1"]),
        ];
    const model = CLAUDE_MODELS[job.model];
    if (model) args.push("--model", model);
    const child = spawnCli("claude", args, FULL ? WORKDIR : undefined);

    let pending = [];
    let emitted = false;
    let buf = "";
    const flush = () => {
      if (pending.length) { void post(job.id, { chunks: pending }); pending = []; }
    };
    const flusher = setInterval(flush, 350);
    const killer = setTimeout(() => child.kill("SIGKILL"), job.raw ? 270_000 : 150_000);

    child.stdout.on("data", (data) => {
      buf += data.toString("utf8");
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const evt = JSON.parse(line);
          const d = evt.type === "stream_event" ? evt.event : null;
          if (d?.type === "content_block_delta" && d.delta?.type === "text_delta" && d.delta.text) {
            emitted = true;
            pending.push(d.delta.text);
          }
        } catch { /* non-JSON noise */ }
      }
    });
    child.on("close", (code) => {
      clearInterval(flusher); clearTimeout(killer); flush();
      rmSync(dir, { recursive: true, force: true });
      void post(job.id, emitted ? { done: true } : { error: `Claude Code gave no reply (exit ${code}) — run \`claude\` here to check your login.` })
        .then(() => resolve());
    });
    child.on("error", () => {
      clearInterval(flusher); clearTimeout(killer);
      rmSync(dir, { recursive: true, force: true });
      void post(job.id, { error: "couldn't launch claude on this machine" }).then(() => resolve());
    });
    child.stdin.write(serialize(job.messages));
    child.stdin.end();
  });
}

function runCodex(job) {
  return new Promise((resolve) => {
    const args = ["exec", "-s", FULL ? "workspace-write" : "read-only", "--skip-git-repo-check", "-"];
    if (job.model && /^[\w.-]{2,40}$/.test(job.model)) args.splice(1, 0, "-m", job.model);
    const child = spawnCli("codex", args, FULL ? WORKDIR : undefined);
    let out = "";
    const killer = setTimeout(() => child.kill("SIGKILL"), 150_000);
    child.stdout.on("data", (d) => { out += d.toString("utf8"); });
    child.on("close", (code) => {
      clearTimeout(killer);
      const text = out.trim();
      void post(job.id, text ? { chunks: [text.slice(0, 100_000)], done: true } : { error: `Codex gave no reply (exit ${code}) — run \`codex login status\` here.` })
        .then(() => resolve());
    });
    child.on("error", () => {
      clearTimeout(killer);
      void post(job.id, { error: "couldn't launch codex on this machine" }).then(() => resolve());
    });
    child.stdin.write(`${job.system}\n\n${serialize(job.messages)}`);
    child.stdin.end();
  });
}

// ── local database backups (progress + evidence + tutor chats) ─────
const BACKUP_DIR = join(dirname(process.argv[1] ?? "."), "..", "backups");
async function backup() {
  try {
    const res = await api("/backup");
    if (!res.ok) return;
    const j = await res.json();
    if (!j || j.progress == null) return;
    mkdirSync(BACKUP_DIR, { recursive: true });
    const name = `progress-${j.username}-${new Date().toISOString().slice(0, 10)}.json`;
    writeFileSync(join(BACKUP_DIR, name), JSON.stringify(j, null, 2), "utf8");
    const old = readdirSync(BACKUP_DIR).filter((f) => f.startsWith("progress-")).sort();
    for (const f of old.slice(0, Math.max(0, old.length - 14))) unlinkSync(join(BACKUP_DIR, f));
    console.log(`  backup saved: ${name}`);
  } catch { /* next cycle */ }
}
void backup();
setInterval(() => void backup(), 6 * 3600 * 1000);

let stopping = false;
process.on("SIGINT", () => { stopping = true; console.log("\nbridge stopping…"); });

// Poll fast while a conversation is live, slow when idle. Every poll costs
// the site database requests, and an always-on 1.5s poll used up a whole
// month of the free tier in under two days.
const FAST_MS = 1500;
const IDLE_MS = Math.min(Math.max(Number(process.env.HALO_IDLE_MS) || 20_000, FAST_MS), 40_000);
const FAST_WINDOW_MS = 3 * 60_000;
let lastJobAt = 0;

let failures = 0;
for (;;) {
  if (stopping) process.exit(0);
  try {
    const res = await api("");
    if (res.status === 401) {
      console.error("Bridge key rejected — create a fresh one in Settings → connections.");
      process.exit(1);
    }
    const { job } = await res.json();
    failures = 0;
    if (job) {
      const engine = job.provider === "codex" && HAS_CODEX ? "codex" : HAS_CLAUDE ? "claude" : "codex";
      console.log(`[${new Date().toISOString().slice(11, 19)}] job ${job.id.slice(0, 8)} → ${engine}${job.model ? ` (${job.model})` : ""}`);
      await (engine === "codex" ? runCodex(job) : runClaude(job));
      lastJobAt = Date.now();
      continue; // check for the next job immediately
    }
  } catch {
    failures += 1;
    if (failures === 5) console.error("Can't reach HALO — retrying in the background…");
  }
  await new Promise((r) => setTimeout(r, Date.now() - lastJobAt < FAST_WINDOW_MS ? FAST_MS : IDLE_MS));
}
