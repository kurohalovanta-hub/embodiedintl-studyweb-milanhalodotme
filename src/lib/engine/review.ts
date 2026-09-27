import type { NodeProgress, ReviewState } from "@/lib/types";
import { NODE_MAP } from "@/content/nodes";

const DAY = 86_400_000;

/** SM-2-flavored schedule, tuned for concept retrieval (not flashcard trivia). */
export function initialReview(now = Date.now()): ReviewState {
  return { due: now + 3 * DAY, interval: 3, ease: 2.5, reps: 0, lapses: 0 };
}

export type ReviewOutcome = "failed" | "hard" | "good" | "easy";

export function nextReview(r: ReviewState, outcome: ReviewOutcome, now = Date.now()): ReviewState {
  if (outcome === "failed") {
    return { due: now + DAY, interval: 1, ease: Math.max(1.3, r.ease - 0.2), reps: 0, lapses: r.lapses + 1 };
  }
  const easeDelta = outcome === "hard" ? -0.15 : outcome === "easy" ? 0.1 : 0;
  const ease = Math.min(3.0, Math.max(1.3, r.ease + easeDelta));
  const factor = outcome === "hard" ? 1.2 : ease;
  const interval = Math.min(90, Math.max(1, Math.round(r.interval * factor)));
  return { due: now + interval * DAY, interval, ease, reps: r.reps + 1, lapses: r.lapses };
}

export interface ReviewItem {
  nodeId: string;
  title: string;
  prompt: string;
  due: number;
  overdueDays: number;
}

/** The retrieval queue: mastered nodes whose review is due. Prompt = the diagnostic (retrieval-first). */
export function reviewQueue(progress: Record<string, NodeProgress>, now = Date.now()): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const [id, p] of Object.entries(progress)) {
    if (!p.review || p.status !== "mastered") continue;
    if (p.review.due > now) continue;
    const node = NODE_MAP.get(id);
    if (!node) continue;
    items.push({
      nodeId: id,
      title: node.title,
      // project and boss nodes carry a placeholder diagnostic; review those on the mastery test
      prompt: node.diagnostic.startsWith("No separate diagnostic") ? node.masteryTest : node.diagnostic,
      due: p.review.due,
      overdueDays: Math.floor((now - p.review.due) / DAY),
    });
  }
  return items.sort((a, b) => a.due - b.due);
}

export function upcomingReviews(progress: Record<string, NodeProgress>, now = Date.now(), horizonDays = 7) {
  const items: { nodeId: string; title: string; due: number }[] = [];
  for (const [id, p] of Object.entries(progress)) {
    if (!p.review || p.status !== "mastered") continue;
    if (p.review.due <= now || p.review.due > now + horizonDays * DAY) continue;
    const node = NODE_MAP.get(id);
    if (node) items.push({ nodeId: id, title: node.title, due: p.review.due });
  }
  return items.sort((a, b) => a.due - b.due);
}
