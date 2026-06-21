# GAMtask.md — Implementation Tasks

> Derived from `GAMreq.md`. Tasks are partitioned so two engineers never edit the same file.
> **Track A = pure core (`app/src/gamekit/`)**, **Track B = adapter + integration
> (`app/src/gamification/`, migration, wiring)**. Track B's engine-facing work depends on
> Track A's public API (`index.js`), which is contract-frozen in T0.
>
> Legend: `[ ]` open · `[~]` in progress · `[x]` done. Owner = subagent that did it.

## T0 — API contract freeze (orchestrator, do first)
- [x] **T0.1** Lock the gamekit public API + JSDoc typedefs (`types.js`, `index.js` signatures)
  so Track A and Track B can build in parallel against a stable contract. _Done criteria: types.js
  + index.js stubs exist with exported signatures; both tracks agree._
  Owner: orchestrator. (Captured in GAMreq §3.2–3.4.)

## Track A — Pure Core (`app/src/gamekit/`)

- [x] **A1. matcher.js** — `matchEvent(event, matcher)` + `compare(value, op, target)`. Owner: Engineer-1.
- [x] **A2. reducers.js** — `foldEvents(...)` per-kind folds; gauge skipped; idempotent. Owner: Engineer-1.
- [x] **A3. metrics.js** — `computeMetrics(...)`; gauges from gaugeState; duration→days via clock. Owner: Engineer-1.
- [x] **A4. conditions.js** — `evaluateConditions(...)`; leaf + all/any/not + custom; progress w/ clamped pct. Owner: Engineer-1.
- [x] **A5. engine.js** — `createEngine({metrics,achievements,ports})` → track/evaluate/progress; `while` guard applied in engine. Owner: Engineer-1.
- [x] **A6. index.js** — public surface + `createMemoryPorts()` in-memory fakes for QA reuse. Owner: Engineer-1.

## Track B — Adapter + Integration

- [x] **B1. migration** — `app/supabase/migrations/004_user_metrics.sql` + RLS `user_metrics_own`. Owner: Engineer-2.
- [x] **B2. metricStore.js** — `createMetricStore(supabase)` read-merge-upsert. Owner: Engineer-2.
- [x] **B3. stateProvider.js** — `createStateProvider({getPositions,getCouncilSize})` derives all gauge sources. Owner: Engineer-2.
- [x] **B4. achievementStore.js** — `createAchievementStore(supabase)` earned/award. Owner: Engineer-2.
- [x] **B5. defs.js** — `METRICS` + `ACHIEVEMENTS` for all 15 badges (names from tokens BADGES). Owner: Engineer-2.
- [ ] **B6. useGamification.js** — driver hook: instantiate engine with adapters, evaluate on
  relevant query/route changes, manage **reveal queue** (drain one unlock at a time), silent first
  backfill. Replaces `useAchievementEngine.js`. _Done: mounted once in App; queue drains sequentially._
- [ ] **B7. track() call sites** — emit events: `trade.placed` (usePlaceOrder onSuccess),
  `stock.viewed` (StockDetail mount), `hero.unlocked` (hero selection), `sell.reflected` (reflection
  submit), `chat.sent`+`macro` (useHeroChat). _Done: each call site emits with required props
  (ticker, type, side, dayChange, macro)._
- [ ] **B8. BadgeEarned.jsx + App.jsx wiring** — refactor reveal to consume queue state; swap
  `AchievementEngine` mount for the new driver. _Done: multi-unlock reveals sequentially; no
  hard-coded "First Trade"._
- [ ] **B9. retire old engine** — remove/redirect `app/src/lib/achievements.js` and
  `app/src/hooks/useAchievementEngine.js` and their references; keep or migrate
  `app/src/test/achievements.test.js`. _Done: no dead references; build + lint clean._

## Dependency notes
- A1→A2→A3/A4→A5→A6 within Track A.
- B6/B7/B8 depend on A6 (engine API) + B2–B5.
- Suggested fan-out: **Engineer 1 → Track A (A1–A6)**, **Engineer 2 → Track B infra (B1–B5)**.
  Then a second wave wires B6–B9 once A6 lands.

## Track B — Wiring (second wave)
- [x] **B6. useGamification** — `GamificationProvider` + `useTrack()` + `useReveal()` + reveal queue (React Context); silent first backfill. Owner: Engineer-3.
- [x] **B7. track() call sites** — `trade.placed` (usePlaceOrder, dayChange threaded from BuyScreen), `stock.viewed` (StockDetail), `hero.unlocked` (useChangeHero), `chat.sent`+macro (useHeroChat), `sell.reflected` (TradeReceipt). `position.heldThroughDrop` left as documented stub (no drawdown system). Owner: Engineer-3.
- [x] **B8. BadgeEarned + App.jsx** — reveal consumes queue, drains sequentially; `GamificationProvider` mounted. Owner: Engineer-3.
- [x] **B9. retire old engine** — deleted `lib/achievements.js`, `hooks/useAchievementEngine.js`, old `test/achievements.test.js`; no dead refs. Owner: Engineer-3.

## UX iteration 1 tasks (from GAMreq §9, gamification surfaces only)
- [x] **U1** Badge cards focusable (`role=button`/`tabIndex`/keyboard), visible focus ring, `data-state` earned/locked (UXR-1, UXR-9). _Nav-link part is shared AppShell → moved to §9.X app-wide._
- [x] **U2** Contrast — locked badge title→`ink-700`, desc→`ink-500`; dimming moved off the text (glyph-only) so text meets AA (UXR-2).
- [x] **U3** Removed MOMCAKE: "N badges" label and BadgeEarned title now Barlow Condensed (`font-sans`) (UXR-3).
- [x] **U4** Badges.jsx glyphs: `role="img"`+`aria-label` when labelled, else `aria-hidden` (UXR-4).
- [x] **U5** `role="progressbar"`+aria values on achievements tier bar and BadgeEarned progress card (UXR-5).
- [x] **U6** Semantic `<h1>` on /achievements; Radix Dialog Title provides the heading on /badge-earned (UXR-6).
- [~] **U7** Verified ProgressRing renders (component present). CTA kept white-on-ink — deliberate high-contrast choice for the dark reveal, not a DS violation; documented (UXR-7 partial).
- [x] **U8** AchievementsMobile tier-progression explainer line added (UXR-8).
- [x] **U9** `gamification.a11y.test.jsx` (6 tests) for roles/names/state/font; full suite 904 green.

## Issues found during QA (appended by qa-engineer)
- [x] **ISSUE-1 (Critical, both QA)** — `gamification/useGamification.js` held JSX under a `.js`
  extension; `@vitejs/plugin-react` only transforms `.jsx`, so 9 pre-existing test files failed to
  load and `test:coverage` errored. **Fix:** renamed to `useGamification.jsx` (extensionless imports
  resolve automatically — no import edits). Owner: orchestrator. _Verify via full suite below._
- ISSUE-2 (Low, cosmetic) — v8 coverage table omits `metrics.js` from per-file breakdown though it
  is 100% covered; aggregate is correct. No action.
- **Known stub** — `steady` / `position.heldThroughDrop` intentionally unwired (no drawdown signal
  exists); earnable once price-history drawdown tracking is added. Not a defect.
