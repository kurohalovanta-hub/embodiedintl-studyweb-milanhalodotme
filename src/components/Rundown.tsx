"use client";

// First-login guided tour. Highlights each real UI area with a spotlight and
// explains what it does, one step at a time. Completing or skipping it sets
// settings.rundownDone (synced), so it shows once and can be replayed from
// Settings. Steps whose target element isn't on screen are skipped gracefully.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-client";

interface Step {
  target?: string;        // [data-tour="..."] selector value; omit for a centered card
  title: string;
  body: string;
  adminOnly?: boolean;
}

const STEPS: Step[] = [
  { title: "Welcome to Halo", body: "A quick 60-second look at the place, so nothing feels like a maze. You can skip any time." },
  { target: "/today", title: "Today", body: "Your home base. It shows the one thing to work on right now, the steps to do it, and a tutor that already knows where you are. Start here every day." },
  { target: "/tree", title: "Skill Tree", body: "The whole map. See how skills connect, what you've proven, and what opens up next. Zoom out here when you want the big picture." },
  { target: "/review", title: "Review", body: "Short recall sessions. Passing a review is what turns a claim into something proven, so nothing you learn quietly slips away." },
  { target: "/guide", title: "Field Manual", body: "The how-it-works handbook. Five minutes here explains tiers, gates, and every screen. Come back whenever something's unclear." },
  { target: "/settings", title: "Settings", body: "Make the text bigger or smaller, switch between Beginner and the full toolkit (Pro), and connect your own Claude or ChatGPT to the tutor." },
  { target: "/admin", title: "Admin", body: "See who has joined, switch off or delete accounts, and share your tutor with the people you choose.", adminOnly: true },
  { title: "That's the tour", body: "Your one thing is waiting on Today. Take the first step and the rest lays itself out. You can replay this from Settings any time." },
];

interface Rect { top: number; left: number; width: number; height: number }

export function Rundown() {
  const store = useStore();
  const auth = useAuth();
  const isAdmin = auth.user?.role === "admin";
  const done = store.settings.rundownDone;
  const hydrated = store.hydrated;

  const steps = useMemo(() => STEPS.filter((s) => !s.adminOnly || isAdmin), [isAdmin]);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // open on first login (desktop only — the tour points at the sidebar)
  useEffect(() => {
    if (!hydrated || done || auth.status !== "authed") return;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [hydrated, done, auth.status]);

  // allow Settings to trigger a replay
  useEffect(() => {
    const onReplay = () => { setI(0); setOpen(true); };
    window.addEventListener("halo-rundown-replay", onReplay);
    return () => window.removeEventListener("halo-rundown-replay", onReplay);
  }, []);

  const measure = useCallback(() => {
    const step = steps[i];
    if (!step?.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 });
  }, [i, steps]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(measure); // defer so it's not a sync setState in the effect
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  if (!open) return null;

  const step = steps[i];
  const last = i === steps.length - 1;

  const finish = () => {
    setOpen(false);
    store.updateSettings({ rundownDone: true });
  };
  const next = () => (last ? finish() : setI((n) => n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  // card sits beside the highlighted element, or centered when there's no target
  const cardStyle: React.CSSProperties = rect
    ? { position: "fixed", top: Math.min(rect.top, window.innerHeight - 240), left: rect.left + rect.width + 16, maxWidth: 340 }
    : { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxWidth: 400 };

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal aria-label="Product tour">
      {/* dim + spotlight hole via a big box-shadow on the highlighted rect */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl transition-all duration-300"
          style={{
            top: rect.top, left: rect.left, width: rect.width, height: rect.height,
            boxShadow: "0 0 0 9999px rgba(8,7,10,0.72), 0 0 0 2px var(--color-acc)",
          }}
          aria-hidden
        />
      ) : (
        <div className="fixed inset-0 bg-[#08070a]/72" aria-hidden />
      )}

      <div className="rise-in halo-glass rounded-2xl p-5 shadow-2xl" style={cardStyle}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-faint">{i + 1} of {steps.length}</span>
          <button className="text-[12px] text-faint hover:text-dim" onClick={finish}>Skip tour</button>
        </div>
        <h3 className="mt-2 text-[17px] font-semibold tracking-tight">{step.title}</h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-dim">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, k) => (
              <span key={k} className="size-1.5 rounded-full" style={{ background: k === i ? "var(--color-acc)" : "var(--color-line2)" }} />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && <button className="btn !py-1.5 text-xs" onClick={back}>Back</button>}
            <button className="btn btn-glow !py-1.5 text-xs" onClick={next}>{last ? "Start" : "Next"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
