"use client";

import type { MediaItem } from "@/lib/packet-types";

/** Source card (§50): embedded privacy-enhanced player, role framing, no autoplay. */
export function VideoCard({
  media, watched, onWatched, role = "WATCH",
}: {
  media: MediaItem;
  watched: boolean;
  onWatched: () => void;
  role?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel2/40">
      <div className="flex flex-wrap items-baseline gap-2 border-b border-line/60 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-acc">{role}: {media.minutes} min{media.unverified ? " (approx)" : ""}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{media.creator}: {media.title}</span>
      </div>
      {media.embedUrl ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={media.embedUrl}
            title={media.title}
            loading="lazy"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full"
          />
        </div>
      ) : (
        <div className="px-3 py-3 text-sm text-dim">
          Not embeddable here. Open it directly, watch the listed span, then come back.
        </div>
      )}
      <div className="space-y-2 px-3 py-2.5">
        <p className="text-[12.5px] leading-relaxed text-dim">
          <span className="text-faint">why this one · </span>{media.whySelected}
        </p>
        {media.leaveWith && media.leaveWith.length > 0 && (
          <div className="text-[12px] text-dim">
            <span className="font-mono text-[10px] uppercase tracking-wider text-acc-robot">leave with → </span>
            {media.leaveWith.join(" · ")}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <a className="text-xs text-acc hover:underline" href={media.url} target="_blank" rel="noopener noreferrer">
            open original ↗
          </a>
          {media.startSeconds != null && (
            <span className="font-mono text-[10.5px] text-faint">
              segment {Math.floor(media.startSeconds / 60)}:{String(media.startSeconds % 60).padStart(2, "0")}
              {media.endSeconds ? `–${Math.floor(media.endSeconds / 60)}:${String(media.endSeconds % 60).padStart(2, "0")}` : ""}
            </span>
          )}
          <span className="flex-1" />
          <button
            className={watched ? "btn !py-1 text-xs opacity-60" : "btn btn-acc !py-1 text-xs"}
            onClick={onWatched}
            disabled={watched}
          >
            {watched ? "✓ watched" : "I watched it actively"}
          </button>
        </div>
      </div>
    </div>
  );
}
