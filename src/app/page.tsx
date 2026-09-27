"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { todaysMission, activeProject, researchModeActive } from "@/lib/engine/scheduler";
import { dashboardStats, warnings } from "@/lib/engine/metrics";
import { clusterScores, currentRank, nextRank, readinessScore, levelCompletion } from "@/lib/engine/mastery";
import { dayOfProgram, currentPhase, pacingStatus } from "@/lib/engine/pacing";
import { frontier, wouldUnlock, nodeState } from "@/lib/engine/graph";
import { reviewQueue } from "@/lib/engine/review";
import { LEVELS } from "@/content/levels";
import { PAPERS } from "@/content/papers";
import { Bar, EmptyState, NodePill, Panel, SectionTitle, Stat } from "@/components/ui";
import { TutorStatusCard } from "@/components/tutor/TutorStatusCard";
import { MemorySync } from "@/components/MemorySync";
import { NODES } from "@/content/nodes";
import { Halo } from "@/components/brand/Halo";

export default function Dashboard() {
  const store = useStore();
  const data = store.exportData();
  const day = dayOfProgram(data.settings);
  const phase = day ? currentPhase(day) : null;
  const research = researchModeActive(data);
  const stats = dashboardStats(data);
  const warns = warnings(data);
  const mission = todaysMission(data);
  const rank = currentRank(data.nodes);
  const nxt = nextRank(data.nodes);
  const readiness = readinessScore(data.nodes);
  const clusters = clusterScores(data.nodes);
  const pace = pacingStatus(data.settings, data.nodes);
  const proj = activeProject(data);
  const reviews = reviewQueue(data.nodes);
  const currentPaper = Object.entries(data.papers).find(([, p]) => ["reading", "deriving", "reproducing"].includes(p.status));
  const paperMeta = currentPaper ? PAPERS.find((p) => p.id === currentPaper[0]) : null;
  const front = frontier(data.nodes);
  const nextUnlocks = front
    .filter((n) => nodeState(n.id, data.nodes) === "available")
    .slice(0, 6)
    .map((n) => ({ n, unlocks: wouldUnlock(n.id, data.nodes).length }));

  const isFresh = stats.focusedHoursTotal === 0 && stats.nodesMastered === 0;
  const beginner = (data.settings.experienceMode ?? "beginner") === "beginner";

  return (
    <div className="space-y-5">
      {/* hero band — crafted aurora, a drawn halo drifting at the edge */}
      <div className="aurora grain relative overflow-hidden rounded-2xl border border-line">
        <div className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 opacity-80">
          <Halo size={260} className="hidden sm:block" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#070a10] via-[#070a10]/70 to-transparent" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
          <div>
            <div className="text-[12.5px] font-medium text-dim">
              {research ? "Research mode" : "Welcome back"}
              {phase && <span className="text-faint"> · {phase.title}{day ? ` · day ${Math.min(day, 210)}` : ""}</span>}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="tabular-nums">{Object.values(data.nodes).filter((p) => p.verified).length}</span>
              <span className="text-dim"> of {NODES.length} skills</span>{" "}
              <span className="text-ink">proven</span>
            </h1>
            <p className="mt-1 text-[13px] text-dim">Every one is something you can now do on your own.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/guide" className="btn">Field manual</Link>
            <Link href="/today" className="btn btn-glow">Start today &rarr;</Link>
          </div>
        </div>
      </div>

      {/* first-run orientation — disappears once real work is logged */}
      {isFresh && (
        <Panel accent="#e8b34d">
          <SectionTitle>New here? Three quick things</SectionTitle>
          <div className="mb-3 space-y-2"><TutorStatusCard /><MemorySync compact /></div>
          <div className="grid gap-2 text-sm text-dim md:grid-cols-3">
            <div>
              <span className="font-mono text-xs text-acc">01</span>{" "}
              The <Link href="/guide" className="text-acc hover:underline">Field Manual</Link> covers tiers, gates, and every screen in 5 minutes.
            </div>
            <div>
              <span className="font-mono text-xs text-acc">02</span>{" "}
              Set your start date and hours in <Link href="/settings" className="text-acc hover:underline">Settings</Link> to
              start the day count.
            </div>
            <div>
              <span className="font-mono text-xs text-acc">03</span>{" "}
              Open <Link href="/today" className="text-acc hover:underline">Today</Link> and take the first ⚡ lesson.
              It picks what comes next for you.
            </div>
          </div>
        </Panel>
      )}

      {/* answer WHAT DO I DO NEXT immediately */}
      <Panel glass>
        <SectionTitle right={<Link href="/today" className="text-xs text-acc hover:underline">see the full plan →</Link>}>
          Start here
        </SectionTitle>
        {mission.slots.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {mission.slots.filter((s) => s.node || s.projectTitle || s.reviewCount != null).slice(0, 6).map((s, i) => (
              <div key={i} className="rounded-lg border border-line bg-panel2/70 px-3 py-2.5 transition-colors hover:border-line2">
                <div className="text-[11px] font-medium text-faint">{s.label} · {s.minutes} min</div>
                {s.node ? (
                  <Link href={`/node/${s.node.id}`} className="mt-0.5 block truncate text-[13px] text-ink hover:text-acc">
                    {s.node.title}
                  </Link>
                ) : s.projectTitle ? (
                  <Link href="/projects" className="mt-0.5 block truncate text-[13px] text-ink hover:text-acc">{s.projectTitle}</Link>
                ) : (
                  <Link href="/review" className="mt-0.5 block text-[13px] text-ink hover:text-acc">
                    {s.reviewCount} retrieval item{s.reviewCount === 1 ? "" : "s"} due
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Log your first session and this fills in" />
        )}
        {mission.blockers.length > 0 && (
          <div className="mt-3 space-y-1">
            {mission.blockers.map((b, i) => (
              <div key={i} className="text-xs text-acc-math">⚠ {b}</div>
            ))}
          </div>
        )}
      </Panel>

      {beginner ? (
        <p className="px-1 text-[12.5px] text-faint">More views (progress, readiness, papers, the skill graph) show up when you switch to Pro from the sidebar. For now, keep it simple.</p>
      ) : (
        <>
      {/* stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="streak" value={`${stats.streakDays}d`} accent="#f2934d" sub="6-day weeks" />
        <Stat label="focused hours" value={stats.focusedHoursTotal} sub={`${stats.focusedHours7d}h this week`} />
        <Stat label="verified" value={`${stats.verifiedCount}`} sub={stats.provisionalCount > 0 ? `+${stats.provisionalCount} claimed, unverified` : "capabilities held"} accent="#52d68a" />
        <Stat label="independence" value={stats.independence != null ? `${stats.independence}%` : "—"} sub="last 30 days" accent="#4dd6e8" />
        <Stat label="papers deep-read" value={stats.papersRead} sub={`${stats.papersReproduced} reproduced`} accent="#a78bfa" />
        <Stat label="review due" value={reviews.length} sub="waiting to review" accent={reviews.length > 10 ? "#f4586e" : "#8b97a7"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* readiness */}
        <Panel className="lg:col-span-1">
          <SectionTitle>Research readiness</SectionTitle>
          <div className="flex items-baseline gap-2">
            <div className="font-mono text-4xl font-bold text-acc">{readiness}</div>
            <div className="text-sm text-faint">/ 100</div>
          </div>
          <div className="mt-3 space-y-2">
            {clusters.map((c) => (
              <div key={c.key}>
                <div className="mb-0.5 flex justify-between text-[11px]">
                  <span className="text-dim">{c.label}</span>
                  <span className="font-mono text-faint">{Math.round(c.score * 100)}%</span>
                </div>
                <Bar value={c.score} color="#4dd6e8" height={4} />
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <div className="mono-label">rank {rank.index} · {rank.title}</div>
            {nxt && <div className="mt-1 text-xs text-dim">Next: <b className="text-ink">{nxt.title}</b> · {nxt.requires}</div>}
            <div className="mt-1 text-[11px] text-faint">score counts verified capability at full value; unverified claims at half</div>
          </div>
        </Panel>

        {/* level progress */}
        <Panel className="lg:col-span-2">
          <SectionTitle right={<Link href="/levels" className="text-xs text-acc hover:underline">all levels →</Link>}>
            Level progress {pace && <span className="ml-2 normal-case tracking-normal" style={{ color: pace.verdict === "far-behind" ? "#f4586e" : pace.verdict === "behind" ? "#e8b34d" : "#52d68a" }}>
              · {pace.verdict}{pace.drift < 0 ? ` (${-pace.drift}d)` : ""}
            </span>}
          </SectionTitle>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {LEVELS.map((l) => {
              const c = levelCompletion(l.id, data.nodes);
              return (
                <Link key={l.id} href={`/levels/${l.id}`} className="group flex items-center gap-2 py-0.5">
                  <span className="w-8 shrink-0 font-mono text-[11px] text-faint">L{l.id}</span>
                  <span className="w-40 shrink-0 truncate text-xs text-dim group-hover:text-ink">{l.title}</span>
                  <span className="flex-1"><Bar value={c} color={l.accent} height={5} /></span>
                  <span className="w-9 text-right font-mono text-[11px] text-faint">{Math.round(c * 100)}%</span>
                </Link>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* current work */}
        <Panel>
          <SectionTitle>What you&apos;re building</SectionTitle>
          {proj ? (
            <Link href="/projects" className="block hover:text-acc">
              <div className="font-mono text-xs text-acc-robot">P{proj.num}</div>
              <div className="text-sm font-medium">{proj.title}</div>
              <div className="mt-1 text-xs text-dim">{proj.purpose}</div>
            </Link>
          ) : (
            <div className="text-sm text-faint">Ladder opens with Level 1.</div>
          )}
          <div className="mt-4 border-t border-line pt-3">
            <SectionTitle>What you&apos;re reading</SectionTitle>
            {paperMeta ? (
              <Link href="/papers" className="block text-sm hover:text-acc">
                <span className="font-mono text-xs text-acc-ml">#{paperMeta.order}</span> {paperMeta.title}
                <span className="ml-2 text-xs text-faint">({currentPaper?.[1].status})</span>
              </Link>
            ) : (
              <div className="text-sm text-faint">Nothing in flight yet. The ladder starts at Rung 1.</div>
            )}
          </div>
        </Panel>

        {/* warnings */}
        <Panel>
          <SectionTitle>Worth a look</SectionTitle>
          {warns.length === 0 ? (
            <div className="text-sm text-acc-robot">✓ No failure modes detected.</div>
          ) : (
            <div className="space-y-2.5">
              {warns.map((w) => (
                <div key={w.id} className="rounded-md border px-3 py-2" style={{ borderColor: w.severity === "alert" ? "#f4586e55" : w.severity === "warn" ? "#e8b34d44" : "#2a3646" }}>
                  <div className="text-[13px] font-medium" style={{ color: w.severity === "alert" ? "#f58a99" : w.severity === "warn" ? "#e8c37d" : "#8b97a7" }}>{w.title}</div>
                  <div className="mt-0.5 text-xs text-dim">{w.detail}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* next unlocks */}
        <Panel>
          <SectionTitle right={<Link href="/tree" className="text-xs text-acc hover:underline">skill tree →</Link>}>Opens up next</SectionTitle>
          {nextUnlocks.length === 0 ? (
            <EmptyState title="Clear a gate to open the next one" />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {nextUnlocks.map(({ n, unlocks: u }) => (
                <div key={n.id} className="max-w-full">
                  <NodePill id={n.id} title={u > 0 ? `${n.title} (+${u})` : n.title} state="available" />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
        </>
      )}
    </div>
  );
}
