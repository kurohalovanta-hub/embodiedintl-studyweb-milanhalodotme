# EMBODIED // OS — project context

A 210-day zero→embodied-intelligence-researcher learning operating system: a Next.js web
app whose content is a mastery-gated skill dependency graph with full in-app interactive
lessons and per-node learning packets, built for one fast learner (PC-first, phone
first-class). Product target: **demonstrable independent capability, never engagement.**

## Authority chain (read in this order)

1. `docs/spec/HANDOVER.md` — the original product + curriculum specification, as
   **recalibrated by** `docs/recalibration/` (2026-08-21): production/repo audits,
   dopamine-loop failure analysis (00–02), evidence-model + tutor + academy design
   (03–04), auth decision (05: keep hardened Redis; Supabase triggers recorded — do
   not migrate for fashion), rebuild plan (06), ten-pass critique with amendments
   Δ1–Δ12 (07), disaster runbook (RECOVERY.md). Where they conflict, recalibration wins.
2. `docs/curation/` — 72 per-node live-research records (shortest sufficient path,
   exact segments, verification dates). Packets cite these; new packets need a record.
3. `docs/research/` — the 2026-08-21 research phase: frontier map (00), resource
   selections (01), dependency-graph design (02), curriculum audit (03), compute
   strategy (04), paper ladder (05), feasibility (06), and `reports/` (ten verified
   domain reports). **Curriculum decisions trace here; do not re-litigate them from
   memory — the field moves fast and these were live-verified.**
4. `docs/architecture/` — ADR-001 (stack), ADR-002 (persistence/sync), ADR-003
   (content model), ADR-004 (accounts/auth), LEARNING-SYSTEM.md (lesson design system,
   widget catalog, quality rubric), IMPLEMENTATION_PLAN.md.

## Hard rules

- **Content single source of truth = `src/content/`** (typed TS). Docs explain *why*;
  content defines *what*. Lessons (`src/content/lessons/`) and learning packets
  (`src/content/packets/`) both follow the manifest + registry pattern (light metadata
  + dynamic imports; the validator enforces sync). No CMS, no content DB.
- **Mastery is derived from evidence — no user action may set a tier.** Append-only
  `EvidenceRecord` log is the source of truth; `NodeProgress` is a derived cache
  (`src/lib/engine/competency.ts`). Honest assessment claims unlock next work
  immediately (mastery-gated, never calendar-gated), but **verified** requires a later
  retention/transfer pass. AI-produced work caps at Silver. Retention failures demote
  semantic state; history is never erased (reset = boundary event).
- **Dopamine defense (recalibration §28):** no XP surfaces, no celebration loops —
  the one overlay fires on *becameVerified* only and is suppressed during binges
  (`bingeSignal`). Reward = "you can now do X independently". Today shows ONE
  bottleneck. Do not add streak mechanics, confetti, or claim-speed affordances.
- **Auth (ADR-004):** first registered user is admin; joining is open (2026-09-27: no
  approval step, every new account is `approved: true`; admin can revoke or delete).
  `rateLimit` fails open when Redis refuses writes so sign-in survives a quota overrun.
  Storage (2026-09-27): when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, `getRedis()`
  returns `SupabaseKV` (`src/lib/server/supabase-kv.ts`, one `kv` table, schema in
  `docs/architecture/supabase-kv.sql`) in place of Upstash. Callers are unchanged.
  scrypt passwords, HMAC session cookies, secret auto-generated into Redis (`SET NX`)
  — zero env vars. Upstash env names `KV_REST_API_URL`/`KV_REST_API_TOKEN` (never
  `Redis.fromEnv()`). No Redis ⇒ graceful local mode. Per-user progress at
  `progress:{username}` via cookie-authed `/api/progress` (4MB cap, 500 new events/PUT,
  20k total, server-side event-id union merge). Self-service: change password + one-time
  recovery code (Settings → `/api/auth/password`, `/recovery-code`; sign-in → `/reset`).
  Break-glass: `ADMIN_RESET_TOKEN` set→use→unset per `docs/recalibration/RECOVERY.md`
  (password reset, or `action:"wipe-users"` so the next registration is admin again).
- **Public repo privacy:** never commit password hashes, emails, API keys, tokens, or
  learner state. Exports (Settings → Export everything, `src/lib/learner-state.ts`)
  are downloads the user holds privately.
- **Tutor bridge is provider-neutral and copy-based** (`src/lib/tutor.ts`, `tutor/`):
  mode contracts forbid solving mastery tasks; pasted summaries ingest as evidence
  with solution-exposure capping at Silver. Don't add server-side AI calls without a
  new ADR.
- Stack: Next 16 App Router + React 19 + Tailwind v4 CSS-first (dark-only, tokens in
  `globals.css` `@theme`) + Zustand 5 + KaTeX **pinned ^0.16** + react-markdown/remark-math.
  No component libraries, no graph libraries — tree, widgets and all visualizations are
  hand-rolled SVG (`src/components/widgets/`, toolkit.tsx primitives).
- Widgets implement the **real equations** (real eigensolves, real DLS iterations, real
  240 Hz plant integration) — simplified in scope, never faked in dynamics. New widget =
  component + `widgets/ids.ts` + `widgets/registry.ts` (ssr:false dynamic import).
- 2026 gotchas: `proxy.ts` not `middleware.ts`; `await params/cookies()`; no `next lint`
  (run eslint directly — react-hooks compiler rules are errors: no ref reads during
  render, no sync setState in effects); no `tailwind.config.js`; JSX attribute strings
  do NOT process backslash escapes (write `tex="\alpha"` in JSX, `"\\alpha"` in TS data).
- Content edits must keep `scripts/validate-content.ts` green (`npm run validate`, also
  in `prebuild`): stable ids, no dangling refs, no cycles, the lesson rubric
  (manifest↔module cross-checks, valid widget ids, ≥4 active interactions, exactly one
  mastery block per lesson), and the packet rubric (manifest↔module minutes match,
  whyNow ≥40 chars, ≥1 practice, implement or derive, prove criteria, deepen when
  node.hours ≥ 8, recall 2–6 with answers, media/url/id checks, researchRecord exists).
- Deploy target: GitHub → Vercel zero-config; works with zero env vars (local mode);
  Upstash Marketplace Redis enables accounts + sync.

## Working agreements

- Curriculum changes = update `src/content/` + (if decision-level) a dated note in the
  relevant docs/research or docs/curation file. Frontier developments land as
  `frontier.ts` entries with a "roadmap change?" verdict before any node edits.
- New packets: research first (a `docs/curation/<node-id>.md` record per its §17
  template — real URLs actually visited, `[unverified]` flags where not), then the
  typed packet citing the record via `researchRecord`, then manifest + registry.
- New lessons follow the LEARNING-SYSTEM.md §2 schema and §5 rubric: intuition →
  formalism → derivation → implementation → application → research connection; honest
  derivations; commit-before-reveal checks; exact robotics connections; no filler.
- Resource URLs live in content records with `lastVerified` dates — never buried in prose.
- The one-line product test for any change: *"What can he now do independently that he
  could not do 30 days ago?"* — it must make learning easier to start, and must not
  make mastery easier to fake.
- Commands: `npm run dev` · `npm run build` · `npm run validate` · `npx eslint src scripts`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
