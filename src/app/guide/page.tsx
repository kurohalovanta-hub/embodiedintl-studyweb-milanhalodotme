import Link from "next/link";
import { Panel, SectionTitle } from "@/components/ui";

export const metadata = { title: "Field Manual" };

// The operating manual: everything the dashboard assumes, in plain language.
// Static by design — this page must load instantly and read in ~5 minutes.

const TIERS = [
  { t: "BRONZE", c: "#c9803a", desc: "You worked through it with help. You recognize the ideas." },
  { t: "SILVER", c: "#9fb2c8", desc: "You can solve standard problems without references." },
  { t: "GOLD", c: "#e8b34d", desc: "You can implement/derive it from scratch AND explain it aloud. Core nodes gate here." },
  { t: "PLATINUM", c: "#8fd3e8", desc: "You can teach it, debug it blind, and connect it across domains." },
  { t: "RESEARCH", c: "#e86ea4", desc: "You can extend it: critique papers that use it, propose variations." },
];

const SURFACES: { href: string; name: string; what: string; when: string }[] = [
  { href: "/today", name: "Today", what: "One current bottleneck, one capability target, the next few steps of its learning packet (watch → recall → work → build → prove), and a stuck-path with AI-tutor buttons. Secondary rows (review, project) stay collapsed below.", when: "Start here every day. It picks the single highest-leverage thing and hides the rest." },
  { href: "/tree", name: "Skill Tree", what: "The full 149-node dependency graph. Tap any node, even a far one, to see how many gates away it is, with the path highlighted. ⚡ marks nodes with built-in interactive lessons.", when: "When you want to know where you are and why today's work matters." },
  { href: "/levels", name: "Levels", what: "The 17 levels (L0 terminal basics → L16 original research) as browsable lists with bosses.", when: "Planning a level push; checking what a boss requires." },
  { href: "/papers", name: "Paper Room", what: "The 63-paper ladder. Each paper has a study page: readiness check against your actual mastery, key equations, lineage, reproduction path, and Defense Mode, a closed-book interrogation.", when: "Papers unlock as their prerequisite nodes complete. Never read a paper the tree says you're not ready for. That's paper tourism." },
  { href: "/projects", name: "Projects", what: "The 22-project ladder from a physics toy to original research. Projects are where nodes become capability.", when: "One project is always 'active'. Today's APPLY step points at it." },
  { href: "/review", name: "Review", what: "Spaced retrieval queue (SM-2). Mastered nodes come due for closed-book recall; grading yourself honestly reschedules them.", when: "Daily, in the PROVE IT step. Review debt above ~10 items is a system warning." },
  { href: "/labs", name: "Labs", what: "All 15 interactive instruments (gradient descent, planar arm IK, Kalman, attention…) in one place, outside their lessons.", when: "Free exploration; re-deriving intuition before a boss fight." },
  { href: "/weekly", name: "Weekly", what: "Weekly review ritual: what shipped, what stalled, honest pace check.", when: "Once a week, ~15 minutes." },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <div className="mono-label">field manual · 5-minute read</div>
        <h1 className="mt-1 font-mono text-2xl font-bold">HOW THIS SYSTEM WORKS</h1>
        <p className="mt-2 text-sm leading-relaxed text-dim">
          This is a 210-day operating system for going from zero to embodied-intelligence researcher.
          It is <b className="text-ink">mastery-gated, not calendar-gated</b>: nothing unlocks because a week
          passed, and nothing is locked because you&apos;re &quot;too early&quot;. Only demonstrated skill moves you.
          The calendar is a pacing overlay, never a gate.
        </p>
      </div>

      <Panel accent="#4dd6e8">
        <SectionTitle>your first 15 minutes</SectionTitle>
        <ol className="space-y-2 text-sm text-dim">
          <li><span className="font-mono text-acc">1.</span> Open <Link href="/settings" className="text-acc hover:underline">Settings</Link> → set your start date and daily hours target. This boots the Day counter and the scheduler.</li>
          <li><span className="font-mono text-acc">2.</span> Open <Link href="/today" className="text-acc hover:underline">Today</Link>. It has already chosen your frontier. The brief tells you what you&apos;ll be able to do by tonight.</li>
          <li><span className="font-mono text-acc">3.</span> Work step 01. If the node has a <span className="text-acc">⚡ lesson</span>, take it in-app. Lessons teach the full material with interactive math labs; external links are optional backup, not required reading.</li>
          <li><span className="font-mono text-acc">4.</span> When you can meet a node&apos;s stated bar, PROVE IT on its page: type a closed-book attempt, declare how you produced it, judge it honestly. Unlocks fire immediately; the claim becomes <b className="text-ink">verified</b> only after a short review a couple of days later holds.</li>
        </ol>
      </Panel>

      <Panel>
        <SectionTitle>mastery tiers: derived from evidence, never self-set</SectionTitle>
        <p className="mb-3 text-sm text-dim">
          Tiers are computed from your evidence log: retrieval answers, practice, built artifacts, a
          typed closed-book assessment, and delayed reviews. There is no button that sets a tier.
          Attempts where AI produced the work cap at Silver; a claim counts as <b className="text-ink">verified</b> only
          after a later review (or a transfer task) holds. Progress means capability, never time spent,
          and the system is honest in both directions: forgetting demotes.
        </p>
        <div className="space-y-1.5">
          {TIERS.map((t) => (
            <div key={t.t} className="flex items-baseline gap-3">
              <span className="w-24 shrink-0 font-mono text-xs font-bold" style={{ color: t.c }}>{t.t}</span>
              <span className="text-[13px] text-dim">{t.desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-line/60 pt-2.5 text-xs text-faint">
          Gates: a node unlocks when its prerequisites hit their required tiers (usually Silver, core edges Gold).
          Bosses are checkpoint exams for whole levels. Ranks (E→S) summarize boss progress.
        </p>
      </Panel>

      <Panel>
        <SectionTitle>the surfaces: what each screen is for</SectionTitle>
        <div className="space-y-3">
          {SURFACES.map((s) => (
            <div key={s.href} className="border-b border-line/40 pb-2.5 last:border-0 last:pb-0">
              <Link href={s.href} className="text-[14px] font-medium text-ink hover:text-acc">{s.name} →</Link>
              <p className="mt-0.5 text-[13px] text-dim">{s.what}</p>
              <p className="mt-0.5 text-xs text-faint">{s.when}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle>lessons vs. external resources</SectionTitle>
        <p className="text-sm leading-relaxed text-dim">
          Nodes marked <span className="text-acc">⚡</span> have full interactive lessons built into this app:
          intuition → formalism → derivation → implementation → application → research connection, with
          manipulable math labs, code exercises you grade honestly, and an embedded mastery gate.
          <b className="text-ink"> The app is designed to be sufficient on its own.</b> Every node also
          carries curated external sources (textbook sections, videos, courses) with exact section
          references. Use them when you want a second angle or more volume, not because you must.
        </p>
      </Panel>

      <Panel>
        <SectionTitle>reading the interface</SectionTitle>
        <div className="grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#8b97a7]" /> <span className="text-dim">locked: prerequisites not yet met</span></div>
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#4dd6e8]" /> <span className="text-dim">available: you can start now</span></div>
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#e8b34d]" /> <span className="text-dim">learning: in progress</span></div>
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#52d68a]" /> <span className="text-dim">mastered: at or above its gate</span></div>
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#f2934d]" /> <span className="text-dim">review due: retrieval scheduled</span></div>
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#e86ea4]" /> <span className="text-dim">research-level: extended beyond the gate</span></div>
        </div>
        <p className="mt-3 border-t border-line/60 pt-2.5 text-xs text-faint">
          Keyboard: <kbd className="rounded border border-line bg-panel2 px-1">/</kbd> search anywhere ·
          in lessons <kbd className="rounded border border-line bg-panel2 px-1">←→</kbd> navigate,{" "}
          <kbd className="rounded border border-line bg-panel2 px-1">esc</kbd> exit. On phone: bottom tabs +
          swipe between lesson sections. Your position is always saved.
        </p>
      </Panel>

      <Panel>
        <SectionTitle>progress & accounts</SectionTitle>
        <p className="text-sm leading-relaxed text-dim">
          Progress lives on your device. When you&apos;re signed in it also syncs to the server,
          so phone and PC stay in step. The first account registered becomes admin. Anyone else can
          join and sign in straight away. No account? Everything still works locally, and you can export or import backups from{" "}
          <Link href="/settings" className="text-acc hover:underline">Settings</Link>.
        </p>
      </Panel>

      <div className="pb-2 text-center">
        <Link href="/today" className="btn btn-acc">▶ Start today&apos;s mission</Link>
      </div>
    </div>
  );
}
