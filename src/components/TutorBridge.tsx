"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  buildTutorPacket, parseTutorSummary, summaryToEvidence,
  TUTOR_MODE_LABELS, type TutorMode,
} from "@/lib/tutor";

/**
 * Contextual Ask-AI entry points (§51) + session-summary ingestion (§23).
 * `modes` limits the buttons shown at a given step; default shows the core set.
 */
export function TutorBridge({
  nodeId, bottleneck, modes, compact,
}: {
  nodeId: string;
  bottleneck?: string;
  modes?: TutorMode[];
  compact?: boolean;
}) {
  const store = useStore();
  const [copied, setCopied] = useState<TutorMode | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const shown = modes ?? (["diagnose", "socratic", "practice", "debug", "examine"] as TutorMode[]);

  const copy = async (mode: TutorMode) => {
    const packet = buildTutorPacket(mode, nodeId, { nodes: store.nodes, events: store.events, logs: store.logs }, bottleneck);
    try {
      await navigator.clipboard.writeText(packet);
      setCopied(mode);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setMsg("Clipboard blocked. Long-press/select the packet from the node page instead.");
    }
  };

  const ingest = () => {
    const parsed = parseTutorSummary(paste);
    if (!parsed.ok) {
      setMsg(`✗ ${parsed.error}`);
      return;
    }
    const evs = summaryToEvidence(parsed.summary);
    for (const e of evs) store.recordEvidence(e);
    setMsg(`✓ Session recorded: ${evs.length} evidence entries for ${parsed.summary.node_id}. A tutor session supports progress; the typed prove-it is still yours to do.`);
    setPaste("");
    setIngesting(false);
  };

  return (
    <div className={compact ? "" : "rounded-md border border-line bg-panel2/50 p-3"}>
      {!compact && <div className="mono-label mb-2">stuck? bring a tutor. The packet includes your exact state</div>}
      <div className="flex flex-wrap gap-1.5">
        {shown.map((m) => (
          <button
            key={m}
            className="rounded-md border border-line2 bg-panel2 px-2.5 py-1.5 font-mono text-[11.5px] text-dim transition-colors hover:border-acc/50 hover:text-acc"
            onClick={() => copy(m)}
            title="Copies a context packet. Paste it into Claude or ChatGPT"
          >
            {copied === m ? "✓ copied" : TUTOR_MODE_LABELS[m]}
          </button>
        ))}
        <button
          className="rounded-md border border-acc-robot/40 bg-panel2 px-2.5 py-1.5 font-mono text-[11.5px] text-acc-robot"
          onClick={() => { setIngesting(!ingesting); setMsg(null); }}
        >
          {ingesting ? "close" : "paste session summary"}
        </button>
      </div>
      {copied && (
        <div className="mt-1.5 text-[11px] text-faint">
          Packet copied. Paste it into Claude or ChatGPT. It carries your goal, state, the honesty rules,
          and the summary format to bring back here.
        </div>
      )}
      {ingesting && (
        <div className="rise-in mt-2 space-y-2">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={4}
            className="w-full font-mono text-[12px]"
            placeholder='Paste the tutor&apos;s end-of-session JSON ({"node_id": …}) here…'
          />
          <button className="btn !py-1.5 text-xs" disabled={paste.trim().length < 10} onClick={ingest}>
            Save as evidence
          </button>
        </div>
      )}
      {msg && <div className="mt-1.5 text-[11.5px] text-dim">{msg}</div>}
    </div>
  );
}
