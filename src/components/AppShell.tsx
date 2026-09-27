"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-client";
import { startSync } from "@/lib/sync";
import { researchModeActive } from "@/lib/engine/scheduler";
import { dayOfProgram } from "@/lib/engine/pacing";
import { NODES } from "@/content/nodes";
import { currentRank } from "@/lib/engine/mastery";
import { LoginGate } from "./LoginGate";
import { HaloMark } from "./brand/Halo";
import { NavIcon } from "./brand/icons";
import { MasteryMomentHost } from "./MasteryMoment";
import { Rundown } from "./Rundown";

const SearchPalette = dynamic(() => import("./SearchPalette").then((m) => m.SearchPalette));

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}
const NAV_GROUPS: { section: string; items: NavItem[] }[] = [
  {
    section: "operate",
    items: [
      { href: "/", label: "Dashboard", icon: "◉" },
      { href: "/today", label: "Today", icon: "▶" },
      { href: "/tree", label: "Skill Tree", icon: "⬡" },
      { href: "/levels", label: "Levels", icon: "☰" },
    ],
  },
  {
    section: "build",
    items: [
      { href: "/projects", label: "Projects", icon: "⚒" },
      { href: "/bosses", label: "Boss Fights", icon: "◆" },
      { href: "/labs", label: "Labs", icon: "⊞" },
    ],
  },
  {
    section: "research",
    items: [
      { href: "/papers", label: "Paper Room", icon: "¶" },
      { href: "/experiments", label: "Experiments", icon: "Σ" },
      { href: "/ideas", label: "Idea Inbox", icon: "✦" },
      { href: "/frontier", label: "Frontier", icon: "⇗" },
    ],
  },
  {
    section: "system",
    items: [
      { href: "/agent", label: "Agent", icon: ">" },
      { href: "/review", label: "Review", icon: "↻" },
      { href: "/weekly", label: "Weekly", icon: "⑦" },
      { href: "/guide", label: "Field Manual", icon: "?" },
      { href: "/settings", label: "Settings", icon: "⚙" },
      { href: "/admin", label: "Admin", icon: "⛨", adminOnly: true },
    ],
  },
];

const TABS = [
  { href: "/today", label: "Today", icon: "▶" },
  { href: "/tree", label: "Tree", icon: "⬡" },
  { href: "/", label: "Base", icon: "◉" },
  { href: "/review", label: "Review", icon: "↻" },
];

const isFocusSurface = (p: string) => p.startsWith("/learn/") || p.startsWith("/defend/");

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useStore((s) => s.hydrated);
  const auth = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const uiScale = useStore((s) => s.settings.uiScale ?? 1);

  useEffect(() => {
    useStore.persist.rehydrate();
    useAuth.getState().refresh();
  }, []);
  useEffect(() => {
    if (hydrated && auth.status === "authed") startSync();
  }, [hydrated, auth.status]);
  // close the drawer when navigation changes the route (render-time adjustment)
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setDrawerOpen(false);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated || auth.status === "loading") return <BootScreen />;
  if (auth.status === "signedout") return <LoginGate />;

  const focus = isFocusSurface(pathname);
  if (focus) {
    return (
      <>
        {children}
        <MasteryMomentHost />
      </>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar pathname={pathname} onSearch={() => setPaletteOpen(true)} />
      <div className="min-w-0 flex-1">
        <MobileTopBar onMenu={() => setDrawerOpen(true)} onSearch={() => setPaletteOpen(true)} />
        {auth.status === "guest" && <GuestBar onLeave={auth.leaveGuest} />}
        <main className="pb-tabbar px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:pb-6">
          <div className="mx-auto max-w-[1400px]" style={{ zoom: uiScale }}>{children}</div>
        </main>
      </div>
      <MobileTabBar pathname={pathname} onMore={() => setDrawerOpen(true)} />
      {drawerOpen && <MobileDrawer pathname={pathname} onClose={() => setDrawerOpen(false)} />}
      {paletteOpen && <SearchPalette onClose={() => setPaletteOpen(false)} />}
      <MasteryMomentHost />
      <Rundown />
    </div>
  );
}

function GuestBar({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel2/60 px-4 py-2 text-[12px] text-dim sm:px-6 lg:px-10">
      <span>
        <span className="text-ink">Guest view.</span> Nothing here saves to an account, and the tutor needs one.
      </span>
      <button onClick={onLeave} className="btn !min-h-[32px] !px-3 !py-1 text-[12px]">
        Sign in or join
      </button>
    </div>
  );
}

function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 opacity-90"><HaloMark size={22} /><span className="text-[15px] font-semibold tracking-[0.12em] text-ink">Halo</span></div>
        <div className="mt-3 flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="pulse-dot inline-block size-1.5 rounded-full bg-acc"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Capability leads; the calendar is a footnote (it only ever counted against
// the learner — progress is mastery-gated, never calendar-gated).
function DayChip() {
  const store = useStore();
  const data = store.exportData();
  const day = dayOfProgram(data.settings);
  const research = researchModeActive(data);
  const verified = Object.values(store.nodes).filter((p) => p.verified).length;
  const total = NODES.length;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded px-1.5 py-0.5 font-mono text-[10.5px] ${
          research ? "bg-acc-frontier/15 text-acc-frontier" : "bg-acc/10 text-acc"
        }`}
      >
        {research ? "Research mode" : `${verified} of ${total} proven`}
      </span>
      {!research && day ? <span className="font-mono text-[10px] text-faint">d{Math.min(day, 210)}</span> : null}
    </span>
  );
}

const ICON_FOR: Record<string, string> = {
  "/": "dashboard", "/today": "today", "/tree": "tree", "/levels": "levels",
  "/projects": "projects", "/bosses": "boss", "/labs": "labs", "/papers": "papers",
  "/experiments": "experiments", "/ideas": "ideas", "/frontier": "frontier", "/agent": "agent",
  "/review": "review", "/weekly": "weekly", "/guide": "guide", "/settings": "settings", "/admin": "admin",
};
const SECTION_NAME: Record<string, string> = { operate: "Your day", build: "Build", research: "Research", system: "System" };

// Beginner mode shows only the essentials — the fewest doors that still let you
// start and keep going. Everything else stays one toggle away, not deleted.
const BEGINNER_HREFS = new Set(["/", "/today", "/tree", "/review", "/guide", "/settings", "/admin"]);

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const isAdmin = useAuth((s) => s.user?.role === "admin");
  const mode = useStore((s) => s.settings.experienceMode ?? "beginner");
  const beginner = mode === "beginner";
  return (
    <>
      {NAV_GROUPS.map((g) => {
        const items = g.items.filter(
          (i) => (!i.adminOnly || isAdmin) && (!beginner || BEGINNER_HREFS.has(i.href)),
        );
        if (!items.length) return null;
        return (
          <div key={g.section}>
            {!beginner && <div className="mb-1 mt-5 px-2.5 text-[11px] font-medium tracking-wide text-faint first:mt-0">{SECTION_NAME[g.section] ?? g.section}</div>}
            {items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  data-tour={item.href}
                  className={`mb-0.5 flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                    active ? "nav-active" : "text-dim hover:bg-panel2/70 hover:text-ink"
                  }`}
                >
                  <NavIcon name={ICON_FOR[item.href] ?? "dashboard"} className={active ? "text-acc" : "text-faint"} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
      <ModeToggle beginner={beginner} />
    </>
  );
}

function ModeToggle({ beginner }: { beginner: boolean }) {
  const update = useStore((s) => s.updateSettings);
  return (
    <button
      onClick={() => update({ experienceMode: beginner ? "pro" : "beginner" })}
      className="mt-5 flex w-full items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-left text-[12px] text-dim transition-colors hover:border-acc/40 hover:text-acc"
    >
      <NavIcon name={beginner ? "frontier" : "today"} className="text-faint" />
      {beginner ? (
        <span>Show everything <span className="text-faint">· switch to Pro</span></span>
      ) : (
        <span>Simplify <span className="text-faint">· back to Beginner</span></span>
      )}
    </button>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <HaloMark size={20} />
      <span className="text-[15px] font-semibold tracking-[0.12em] text-ink">Halo</span>
    </span>
  );
}

function Sidebar({ pathname, onSearch }: { pathname: string; onSearch: () => void }) {
  const store = useStore();
  const rank = currentRank(store.nodes);
  const verifiedCount = Object.values(store.nodes).filter((p) => p.verified).length;
  const user = useAuth((s) => s.user);

  return (
    <aside className="app-sidebar sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line lg:flex">
      <div className="border-b border-line px-5 py-5">
        <Link href="/" className="block">
          <Wordmark />
          <div className="mt-1.5 text-[11px] text-faint">Your climb to mastery</div>
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <DayChip />
          {user && <span className="truncate font-mono text-[10.5px] text-faint">@{user.username}</span>}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <NavLinks pathname={pathname} />
      </nav>

      <div className="border-t border-line px-5 py-4">
        <button
          onClick={onSearch}
          className="mb-3 flex min-h-[38px] w-full items-center justify-between rounded-md border border-line bg-panel2 px-2.5 py-1.5 text-xs text-faint hover:border-line2"
        >
          <span>Search…</span>
          <kbd className="rounded border border-line2 px-1 font-mono text-[10px]">/</kbd>
        </button>
        <div className="text-[11px] font-medium text-faint">Rank {rank.index}</div>
        <div className="text-[13px] font-medium text-ink">{rank.title}</div>
        <div className="mt-1 text-[11px] text-acc-robot">{verifiedCount} skill{verifiedCount === 1 ? "" : "s"} proven</div>
      </div>
    </aside>
  );
}

function MobileTopBar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/90 px-3 py-2 backdrop-blur lg:hidden">
      <button aria-label="Menu" onClick={onMenu} className="btn-ghost btn !min-h-[40px] !px-3">
        ☰
      </button>
      <Link href="/" className="flex min-w-0 flex-1 items-center justify-center"><Wordmark /></Link>
      <DayChip />
      <button aria-label="Search" onClick={onSearch} className="btn-ghost btn !min-h-[40px] !px-3 font-mono">
        /
      </button>
    </header>
  );
}

function MobileTabBar({ pathname, onMore }: { pathname: string; onMore: () => void }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                active ? "text-acc" : "text-faint"
              }`}
            >
              <NavIcon name={t.href === "/" ? "base" : t.href === "/tree" ? "tree" : t.href === "/today" ? "today" : "review"} size={18} />
              {t.label}
            </Link>
          );
        })}
        <button
          onClick={onMore}
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-faint"
        >
          <span aria-hidden className="text-[18px] leading-none">···</span>
          More
        </button>
      </div>
    </nav>
  );
}

function MobileDrawer({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const store = useStore();
  const rank = currentRank(store.nodes);
  const user = useAuth((s) => s.user);
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
      <div className="fade-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="rise-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <Wordmark />
            <div className="mt-0.5 text-[11px] text-faint">
              {user ? `@${user.username} · ` : ""}rank {rank.index} · {rank.title}
            </div>
          </div>
          <button aria-label="Close menu" onClick={onClose} className="btn-ghost btn !min-h-[40px] !px-3">✕</button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <NavLinks pathname={pathname} onNavigate={onClose} />
        </nav>
      </div>
    </div>
  );
}
