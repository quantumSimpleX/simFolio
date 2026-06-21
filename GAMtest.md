# GAMtest.md — Test Plan

> Target: **>90% line coverage** on `src/gamekit/**` and `src/gamification/**`; pure core should
> approach 100%. Tests use Vitest + Testing Library, colocated in `app/src/test/`. Run with
> `npm run test` and `npm run test:coverage` from `app/`.
>
> Legend: `[ ]` not run/failing · `[x]` passing. Each item is one test file or describe-block.

## Unit — Pure Core (`gamekit/`)  → target ~100%

### UT-A1 matcher.test.js
- [x] matches by `type`; rejects mismatched type
- [x] `where` comparisons: eq, ne, gt, gte, lt, lte, in
- [x] missing/undefined props do not throw and do not match gt/lt
- [x] empty matcher `{}` matches any event

### UT-A2 reducers.test.js
- [x] `count` increments per matching event; ignores non-matching
- [x] `distinct` dedupes by prop; state holds unique set
- [x] `sum` / `max` fold numeric prop correctly
- [x] `threshold-event` counts only events whose prop satisfies op/value
- [x] `duration` records firstTs (since:'first') and lastTs (since:'last')
- [x] `streak` increments on consecutive periods, resets on gap (day + week)
- [x] gauge kinds produce no internal state / no deltas
- [x] empty event list returns prevState unchanged (idempotent)

### UT-A3 metrics.test.js
- [x] each kind resolves to a number from internal state
- [x] gauge resolves from gaugeState; missing source -> 0
- [x] duration converts firstTs→days using injected clock
- [x] unknown metric id / empty state -> 0

### UT-A4 conditions.test.js
- [x] leaf `{metric,op,value}` for all ops
- [x] `all` (AND), `any` (OR), `not` composition
- [x] `custom` predicate receives ctx and gates unlock
- [x] progress: value/target/pct for leaf targets; clamped at 100%
- [x] already-earned ids excluded from `satisfied`

### UT-A5 engine.test.js (with in-memory fake ports)
- [x] `track` folds deltas into MetricStore without awarding
- [x] `evaluate` awards newly-satisfied, returns `unlocked`
- [x] `evaluate` returns **multiple** unlocks when two conditions newly satisfied (reveal queue source)
- [x] re-`evaluate` with no change returns empty unlocked
- [x] gauge-only badge unlocks from StateProvider without any track()
- [x] `progress()` returns bars without awarding

## Unit — Adapter (`gamification/`)  → target >90%

### UT-B2 metricStore.test.js (mocked supabase)
- [x] `get` returns merged state map; missing rows -> {}
- [x] `apply` read-merge-upserts; merges deltas into existing state

### UT-B3 stateProvider.test.js
- [x] derives heldDistinct / etfHeld / etfDistinct / cryptoHeld from positions
- [x] derives councilSize / positionOpen from hero + positions
- [x] zero-qty positions excluded from held gauges

### UT-B4 achievementStore.test.js (mocked supabase)
- [x] `earned` returns Set of ids
- [x] `award` upserts with ignoreDuplicates onConflict

### UT-B5 defs.test.js
- [x] all 15 badge ids present and unique
- [x] every achievement metric id resolves to a defined metric or gauge source
- [x] no badge requires imperative code (config-only assertion)

## Integration / Component

### IT-B6 useGamification.test.jsx
- [x] first sync is a silent backfill (no reveal navigation)
- [x] later unlock pushes to reveal queue
- [x] queue drains one unlock at a time on dismiss

### IT-B7 track-callsites.test.jsx
- [x] trade.placed emitted on order success with type/side/dayChange
- [x] stock.viewed emitted on StockDetail mount with ticker
- [x] sell.reflected / chat.sent(macro) / hero.unlocked emitted at their sources

### IT-B8 BadgeEarned.test.jsx
- [x] renders passed badge (data-driven, not hard-coded First Trade)
- [x] sequential reveal: dismiss advances to next queued badge
- [x] medal/trophy tiers still render; no-state fallback still smoke-passes

## E2E badge-unlock scenarios (engine + adapters, fake ports)
- [x] first_trade unlocks after one trade.placed
- [x] researcher unlocks after 10 distinct stock.viewed
- [x] contrarian unlocks on a BUY with dayChange ≤ -10
- [x] diversified unlocks when held distinct reaches 5 (gauge)
- [x] council unlocks at councilSize ≥ 2 (gauge)
- [x] patient unlocks when maxHoldDays ≥ 30 on opportunistic load (clock-advanced)
- [x] macro unlocks only when councilSize≥1 AND a macro chat.sent (composite all)

## Regression
- [x] full existing suite (`npm run test`) stays green
- [x] `npm run lint` clean
- [x] `npm run build` succeeds (pre-existing chunk-size warning allowed)
- [x] `npm run test:coverage` ≥ 90% on gamekit + gamification

## Results (final)
- **Suite:** 44 files, **898/898 tests pass = 100%** (> 95% gate).
- **Coverage:** `src/gamekit` 100% lines / 92.9% branches; `src/gamification` 95.55% lines /
  93.65% branches (both > 90% target). Global lines 87.63% (> 85% repo threshold).
- **lint** clean · **build** succeeds (only pre-existing chunk-size warning).

## Issues / failures log
- ISSUE-1 (Critical) — JSX in `useGamification.js` broke 9 suites + coverage. **Resolved** by rename
  to `.jsx` (see GAMtask.md). Re-verified: all suites green.
- ISSUE-2 (Low, cosmetic) — v8 coverage table omits `metrics.js` row; file is 100% covered. No action.
- Lint nits in two QA test files (unused `ports`, unused `beforeEach`) — fixed by orchestrator.
