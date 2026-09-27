"use client";

import { useState } from "react";
import { WBtn, WidgetShell, useRaf } from "./toolkit";

// Anatomy of a π0-class vision-language-action model: what flows where,
// at what shape, and how the two action-decoding families differ.

type Stage = {
  id: string; label: string; sub: string; x: number; y: number; w: number; h: number;
  color: string; shape: string; role: string; trains: string;
};

const STAGES: Stage[] = [
  {
    id: "img", label: "camera(s)", sub: "224×224×3", x: 8, y: 22, w: 92, h: 54, color: "#4dd6e8",
    shape: "1–3 RGB views → ViT patchify → ~256 tokens × 1152-d each",
    role: "What the scene looks like right now. Multiple views reduce occlusion ambiguity.",
    trains: "Vision encoder usually starts from VLM pretraining (SigLIP-class), then fine-tunes on robot data.",
  },
  {
    id: "lang", label: "instruction", sub: "“put mug on shelf”", x: 8, y: 96, w: 92, h: 54, color: "#a78bfa",
    shape: "~5–30 text tokens, same embedding width as the VLM's vocabulary",
    role: "The task specification, the only thing that changes between tasks at deploy time.",
    trains: "Tokenizer + embeddings inherited from the language model, frozen or lightly tuned.",
  },
  {
    id: "state", label: "proprio qₜ", sub: "joints, gripper", x: 8, y: 170, w: 92, h: 54, color: "#e8b34d",
    shape: "joint angles + gripper (7–18 dims) → linear projection → 1 token",
    role: "Where the body actually is. Without it the model guesses its own configuration from pixels.",
    trains: "Projection learned from scratch during robot fine-tuning.",
  },
  {
    id: "vlm", label: "VLM backbone", sub: "≈3B params", x: 152, y: 74, w: 128, h: 100, color: "#52d68a",
    shape: "all tokens concatenated → N transformer blocks → contextual features (+ KV cache)",
    role: "Fuses image, language and state. Its internet-scale pretraining is where semantic generalization comes from.",
    trains: "Pretrained as a VLM (e.g. PaliGemma-class), then fine-tuned on cross-embodiment robot demos.",
  },
  {
    id: "expert", label: "action expert", sub: "≈300M · flow", x: 330, y: 30, w: 122, h: 64, color: "#e86ea4",
    shape: "noisy chunk a^τ (H×d) + τ → attends into backbone KV → vector field v_θ",
    role: "A small transformer that iteratively denoises a whole action chunk (≈10 integration steps).",
    trains: "Flow-matching loss: regress v_θ(a^τ, τ, context) toward (ε − a). Continuous actions, no quantization.",
  },
  {
    id: "fast", label: "FAST tokens", sub: "autoregressive", x: 330, y: 30, w: 122, h: 64, color: "#f2934d",
    shape: "action chunk → DCT → quantize → BPE ≈ 30–60 discrete tokens, decoded one by one",
    role: "Actions become text-like tokens the VLM can emit directly, one softmax per token.",
    trains: "Plain next-token cross-entropy: simple and stable, but decoding is ~10× slower at control time.",
  },
  {
    id: "chunk", label: "action chunk", sub: "H=50 × 7-DoF", x: 330, y: 138, w: 122, h: 54, color: "#cfe6ec",
    shape: "50 future actions × (6 arm + 1 gripper) executed at 50 Hz before re-planning",
    role: "Chunking smooths control and halves compounding error. One inference covers a full second.",
    trains: "—",
  },
];

const EDGES: [string, string][] = [["img", "vlm"], ["lang", "vlm"], ["state", "vlm"], ["vlm", "TOP"], ["TOP", "chunk"]];

export default function VLAFlow() {
  const [mode, setMode] = useState<"flow" | "fast">("flow");
  const [sel, setSel] = useState<string>("vlm");
  const [running, setRunning] = useState(true);
  const [t, setT] = useState(0);

  useRaf((dt) => setT((v) => v + dt), running);

  const topId = mode === "flow" ? "expert" : "fast";
  const visible = STAGES.filter((s) => s.id !== (mode === "flow" ? "fast" : "expert"));
  const get = (id: string) => STAGES.find((s) => s.id === (id === "TOP" ? topId : id))!;
  const selected = get(sel === "expert" || sel === "fast" ? topId : sel);

  const edgePath = (a: Stage, b: Stage) => {
    const x1 = a.x + a.w, y1 = a.y + a.h / 2;
    const x2 = b.x, y2 = b.y + b.h / 2;
    return { x1, y1, x2, y2 };
  };

  return (
    <WidgetShell
      canvas={
        <svg viewBox="0 0 470 240" className="w-full touch-none select-none rounded-md">
          {EDGES.map(([fa, fb]) => {
            const a = get(fa), b = get(fb);
            const { x1, y1, x2, y2 } = edgePath(a, b);
            const phase = (t * 0.45 + (fa.charCodeAt(0) % 5) * 0.19) % 1;
            const px = x1 + (x2 - x1) * phase;
            const py = y1 + (y2 - y1) * phase;
            return (
              <g key={`${fa}${fb}`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#31415588" strokeWidth={1.4} />
                <circle cx={px} cy={py} r={3} fill={a.color} opacity={0.9} />
              </g>
            );
          })}
          {/* flow-matching denoise loop */}
          {mode === "flow" && (
            <g>
              <path d="M 452 46 C 466 46 466 78 452 78" fill="none" stroke="#e86ea488" strokeWidth={1.4} />
              <text x={468} y={66} fill="#e86ea4" fontSize={8.5} fontFamily="var(--font-mono)" textAnchor="end" transform="rotate(90 462 62)">×10 steps</text>
            </g>
          )}
          {visible.map((s) => (
            <g key={s.id} style={{ cursor: "pointer" }} onClick={() => setSel(s.id)}>
              <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={7}
                fill={sel === s.id || (sel === topId && s.id === topId) ? `${s.color}1c` : "#111927"}
                stroke={sel === s.id ? s.color : `${s.color}55`} strokeWidth={sel === s.id ? 1.6 : 1.2} />
              <text x={s.x + s.w / 2} y={s.y + s.h / 2 - 4} fill={s.color} fontSize={11} fontFamily="var(--font-mono)" fontWeight={700} textAnchor="middle">
                {s.label}
              </text>
              <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 12} fill="#8b97a7" fontSize={9} fontFamily="var(--font-mono)" textAnchor="middle">
                {s.sub}
              </text>
            </g>
          ))}
          {/* robot glyph */}
          <g transform="translate(408, 205)">
            <line x1={0} y1={20} x2={18} y2={2} stroke="#8fa3b8" strokeWidth={4} strokeLinecap="round" />
            <line x1={18} y1={2} x2={38} y2={12} stroke="#8fa3b8" strokeWidth={3.4} strokeLinecap="round" />
            <circle cx={0} cy={20} r={4.5} fill="#22303f" stroke="#5b6b7d" />
            <circle cx={18} cy={2} r={3.5} fill="#22303f" stroke="#5b6b7d" />
            <circle cx={38} cy={12} r={3} fill="#4dd6e8" />
          </g>
          <line x1={391} y1={192} x2={412} y2={212} stroke="#31415588" strokeWidth={1.4} strokeDasharray="3 3" />
          <text x={330} y={230} fill="#5b6b7d" fontSize={9} fontFamily="var(--font-mono)">50 Hz control</text>
        </svg>
      }
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            <WBtn active={mode === "flow"} color="#e86ea4" onClick={() => { setMode("flow"); setSel("expert"); }}>
              flow-matching expert (π0)
            </WBtn>
            <WBtn active={mode === "fast"} color="#f2934d" onClick={() => { setMode("fast"); setSel("fast"); }}>
              FAST autoregressive
            </WBtn>
            <WBtn active={running} onClick={() => setRunning(!running)}>{running ? "pause" : "animate"}</WBtn>
          </div>
          <div className="rounded-md border border-line bg-panel2/60 p-3">
            <div className="mb-1 font-mono text-[11px] font-bold" style={{ color: selected.color }}>
              {selected.label.toUpperCase()}
            </div>
            <div className="space-y-1.5 text-[12px] leading-relaxed text-dim">
              <p><span className="text-faint">shape · </span>{selected.shape}</p>
              <p><span className="text-faint">role · </span>{selected.role}</p>
              {selected.trains !== "—" && <p><span className="text-faint">training · </span>{selected.trains}</p>}
            </div>
          </div>
          <div className="rounded-md border border-line bg-panel2/60 px-3 py-2 text-[12px] leading-relaxed text-dim">
            Tap each block. The architecture is three ideas: <b>inherit semantics</b> from a pretrained
            VLM, <b>fuse</b> vision, language and proprioception as one token sequence, and <b>decode a
            chunk</b> of future actions, either continuously (flow expert, fast at inference) or as
            discrete tokens (FAST, simpler to train). Numbers shown are π0-class (2024–26 frontier);
            every VLA you will read this year is a variation on this diagram.
          </div>
        </>
      }
    />
  );
}
