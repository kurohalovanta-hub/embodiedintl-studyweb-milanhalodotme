// Site-wide ribbon: a strip of film. Halo is part of Nepal Accelerates, and the
// NaccLabs inception is funded by creative work ordered at secondunit.video.
// Static server component — no state, no tracking, no celebration.

// Update by hand when the total changes.
const RAISED = "$120K";
const RAISED_OVER = "nearly a year";

export function FundingReel() {
  return (
    <aside aria-label="Support" className="funding-reel relative z-40 border-b border-line text-[12px] leading-snug">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-4 py-2 sm:justify-between sm:px-6 lg:px-10">
        <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-dim">
          <span>
            A part of{" "}
            <a href="https://nacclabs.com" target="_blank" rel="noopener" className="reel-link text-ink">
              Nepal Accelerates
            </a>
            <span className="text-faint"> · nacclabs.com</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="reel-tally font-mono text-[12px] font-semibold tracking-[0.04em] text-acc-robot">
              {RAISED}
            </span>
            <span>
              raised in {RAISED_OVER} <span className="hidden text-faint sm:inline">· through secondunit.video &amp; the diaspora</span>
            </span>
          </span>
        </span>

        <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-dim">
          <span>
            Want to fund us?{" "}
            <a
              href="https://secondunit.video"
              target="_blank"
              rel="noopener"
              className="reel-cta inline-flex items-center gap-1 rounded-full border border-acc-learn/40 px-2.5 py-0.5 font-medium text-acc-learn transition-colors hover:border-acc-learn hover:bg-acc-learn/10"
            >
              <span aria-hidden>▶</span> Order a creative work at secondunit.video
            </a>
          </span>
          <span className="text-faint">— every frame funds the NaccLabs inception.</span>
        </span>
      </div>
    </aside>
  );
}
