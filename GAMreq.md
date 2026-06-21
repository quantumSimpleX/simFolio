# GAMreq.md — Gamification Engine Requirements

> **Status:** Active. This document supersedes the original simplistic, badge-specific
> achievement design (`app/src/lib/achievements.js` + `app/src/hooks/useAchievementEngine.js`).
> It is the single source of truth for the generic gamification engine.

## 1. Goal

Replace the hard-coded 6-rule achievement evaluator with a **generic, configurable
gamification engine** that operates over arbitrary behavior streams. The same engine should be
reusable in any app by supplying configuration and adapters — it must contain **zero simFolio
domain knowledge**. simFolio consumes it through an adapter that maps its events and state onto
the engine's ports.

Success outcome:
- All 15 simFolio badges reachable with **zero per-badge imperative code** — each badge is a
  declarative config entry.
- Multi-unlock reveal queue (two badges earned in one evaluation reveal sequentially).
- A pure, fully unit-tested core that others can configure for their own behaviors.

## 2. Locked Design Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | **Capture model** | **Hybrid.** Gauge metrics read live React Query state on demand. Event-derived metrics fold incrementally into a small **materialized counter store** via `track()`. No full event log is persisted. |
| 2 | **Rule format** | **Declarative + code escape hatch.** Composable primitives (count, distinct, gauge, sum, max, threshold-event, duration, streak) combined with `all` / `any` / `not`, plus an optional `custom` predicate function for rare cases. |
| 3 | **Eval cadence** | **Client-only.** Evaluation runs while the app is open and after relevant actions. Time-based metrics (duration/streak) are checked opportunistically on load and may unlock on the user's next visit. No edge/cron evaluation. |
| 4 | **Scope** | **Standalone, domain-agnostic, ports-and-adapters package.** Realized as a self-contained `app/src/gamekit/` folder with no imports outside itself (extractable to its own npm package later). Not a monorepo workspace. |

## 3. Architecture

Ports-and-adapters (hexagonal). Pure core depends only on configuration + injected ports.

```
behavior events ──track()──▶ metric reducers ──▶ metric values ──▶ conditions ──▶ unlocks
  (host emits)                (materialized      (+ live gauges)    (declarative   (reveal
                               counters)                             config)        queue)
```

### 3.1 Package layout

```
app/src/gamekit/            # PURE, domain-agnostic — NO imports outside this folder
  types.js                  # JSDoc typedefs (repo is JS, no TS)
  matcher.js                # event matching + value comparisons
  reducers.js               # foldEvents() + per-kind fold logic
  metrics.js                # computeMetrics(internalState, gaugeState) -> { [id]: number }
  conditions.js             # evaluateConditions(defs, values, earned) -> { satisfied, progress }
  engine.js                 # createEngine({ metrics, achievements, ports })
  index.js                  # public surface
app/src/gamification/        # simFolio ADAPTER (the only coupling layer)
  metricStore.js            # MetricStore  -> Supabase user_metrics
  stateProvider.js          # StateProvider -> portfolio gauges
  achievementStore.js       # AchievementStore -> existing achievements table
  defs.js                   # metric + achievement config for all 15 badges
  useGamification.js        # driver hook: wires track() call sites + evaluate + reveal queue
```

### 3.2 Core domain model

**Event** (host-emitted):
```js
{ type: 'stock.viewed', ts: 1718900000000, props: { ticker: 'NVDA' } }
```

**Metric definition** — a reducer producing a number; `target` (optional) enables progress bars:
```js
{ id, kind, ...config, target? }
```
Reducer kinds and their materialized internal state:

| kind | config | internal state | value |
|------|--------|----------------|-------|
| `count` | `match` | `{ n }` | `n` |
| `distinct` | `match, prop` | `{ set: string[] }` | `set.length` |
| `sum` | `match, prop` | `{ v }` | `v` |
| `max` | `match, prop` | `{ v }` | `v` |
| `threshold-event` | `match, prop, op, value` | `{ n }` | `n` (counts events whose prop satisfies op/value) |
| `gauge` | `source` | *(none — live)* | `stateProvider.read()[source]` |
| `duration` | `match, since:'first'\|'last', while?` | `{ firstTs, lastTs }` | `clock.now() - firstTs/lastTs` in days, guarded by `while` gauge |
| `streak` | `match, period:'day'\|'week'` | `{ lastPeriod, length }` | `length` |

**Matcher** — declarative event filter:
```js
{ type: 'trade.placed', where: { side: { eq: 'BUY' }, dayChange: { lte: -10 } } }
```
Comparison ops: `eq, ne, gt, gte, lt, lte, in`.

**Achievement definition**:
```js
{ id, name?, description?, tier?, meta?, condition }
```
**Condition** (recursive):
```js
{ metric: 'distinctStockViews', op: '>=', value: 10 }   // leaf
{ all: [Condition, ...] }                                // AND
{ any: [Condition, ...] }                                // OR
{ not: Condition }                                       // NOT
{ custom: (ctx) => boolean }                             // escape hatch; ctx = { values, gauges, now }
```
**Progress** (for UI): for leaf metric conditions with a numeric target, the engine returns
`{ id, value, target, pct }`. Composite conditions report the min child pct (best-effort).

### 3.3 Ports (host implements via adapters)

```js
MetricStore     { get(userId) -> state, apply(userId, deltas) -> nextState }
StateProvider   { read(userId) -> { [source]: number } }     // for gauge metrics
AchievementStore{ earned(userId) -> Set<id>, award(userId, ids) -> void }
Clock           { now() -> ms }                              // injectable for tests + duration
```

### 3.4 Engine API

```js
const engine = createEngine({ metrics, achievements, ports })
engine.track(userId, eventOrEvents)   // cheap: folds deltas into MetricStore, NO evaluation
engine.evaluate(userId)               // -> { unlocked: AchievementDef[], progress: Progress[] }
                                      //    computes values, diffs vs earned, awards new
engine.progress(userId)               // -> Progress[]  (UI bars, no awarding)
```
`track` and `evaluate` are split so writes stay minimal and "evaluate on load / after action"
is natural under the client-only cadence.

Pure, IO-free building blocks (the testable heart):
- `foldEvents(metricDefs, prevState, events, clock) -> { nextState, deltas }`
- `computeMetrics(metricDefs, internalState, gaugeState) -> { [id]: number }`
- `evaluateConditions(achievementDefs, values, earnedSet, ctx) -> { satisfied, progress }`

## 4. Persistence

New Supabase table (migration in `app/supabase/migrations/`, **never** the stale root `supabase/`):

```sql
CREATE TABLE user_metrics (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_id  VARCHAR(64) NOT NULL,
  state      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, metric_id)
);
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_metrics_own ON user_metrics
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```
`MetricStore.apply` = read current rows → merge deltas in JS → upsert. Single-user contention is
negligible, so the lack of server-side atomic increment is acceptable for the client-only model.

## 5. simFolio Badge Mapping (all 15, zero per-badge code)

| Badge id | Metric(s) | Condition |
|----------|-----------|-----------|
| `first_trade` | `tradeCount` (count `trade.placed`) | `>= 1` |
| `limit` | `limitOrders` (count `trade.placed` where `type=LIMIT`) | `>= 1` |
| `diversified` | `heldDistinct` (gauge) | `>= 5` |
| `etf` | `etfHeld` (gauge) | `>= 1` |
| `etf2` | `etfDistinct` (gauge) | `>= 3` |
| `first_crypto` | `cryptoHeld` (gauge) | `>= 1` |
| `researcher` | `distinctStockViews` (distinct `stock.viewed` by ticker) | `>= 10` |
| `contrarian` | `contraBuys` (threshold-event `trade.placed`, `dayChange <= -10`, side BUY) | `>= 1` |
| `momentum` | `momoBuys` (threshold-event `trade.placed`, `dayChange >= 5`, side BUY) | `>= 1` |
| `patient` | `maxHoldDays` (duration, `while: positionOpen`) | `>= 30` |
| `long_term` | `maxHoldDays` | `>= 90` |
| `steady` | `heldThroughDrop` (count `position.heldThroughDrop`) | `>= 1` |
| `reflection` | `reflections` (count `sell.reflected`) | `>= 1` |
| `council` | `councilSize` (gauge) | `>= 2` |
| `macro` | `councilSize` + `macroQuestions` (count `chat.sent` where `macro=true`) | `all: councilSize>=1, macroQuestions>=1` |

Event sources the adapter must emit:
`trade.placed` (usePlaceOrder onSuccess), `stock.viewed` (StockDetail mount),
`hero.unlocked`/`councilSize` (hero selection), `sell.reflected` (reflection submit),
`chat.sent` + `macro` flag (useHeroChat). Gauges (`heldDistinct`, `etfHeld`, `etfDistinct`,
`cryptoHeld`, `councilSize`, `positionOpen`) come from `StateProvider` reading portfolio/hero state.

## 6. Reveal Queue

`evaluate()` may return multiple newly-unlocked achievements. The driver enqueues them and the
reveal UI (`BadgeEarned.jsx`) drains one at a time — dismissing one advances to the next. The
first sync after data load remains a **silent backfill** (no flash for pre-existing badges),
matching current behavior. Tier escalation (badge → medal → trophy) is computed from total
earned count, as today.

## 7. Trust Model

Client-only evaluation is **advisory**, not authoritative — consistent with the existing app
(dev `usePlaceOrder` no-op bypass; RLS on `achievements`/`user_metrics` is the real guard). The
server SQL trigger `check_achievements()` remains as a backstop for execution-derived badges. No
sensitive authority is moved client-side that wasn't already there.

## 8. Acceptance Criteria

- AC1: `gamekit/` has no import from outside its folder (lint-enforced or reviewed).
- AC2: All 15 badges defined purely as config in `gamification/defs.js`.
- AC3: `evaluate()` returns and the queue reveals multiple unlocks sequentially.
- AC4: Gauge badges (diversified/etf/etf2/first_crypto/council) unlock from live state; event
  badges (first_trade/limit/researcher/contrarian/momentum/reflection/macro) unlock from `track()`;
  duration badges (patient/long_term) unlock opportunistically on load.
- AC5: `npm run test:coverage` ≥ 90% lines on `src/gamekit/**` and `src/gamification/**`.
- AC6: `npm run lint` clean; `npm run build` succeeds.
- AC7: Existing test suite stays green; old `lib/achievements.js` evaluator removed or fully
  superseded with no dead references.

## 9. UX Requirements (appended by UX audit iterations)

### Iteration 1 — source: `GAMux-audit.md` (2026-06-20)

Scope note: the audit covered the whole app. The requirements below are the items on the
**gamification surfaces this feature owns** — `/achievements` (`AchievementsMobile.jsx`),
`/badge-earned` (`BadgeEarned.jsx`), and the badge glyph components (`components/Badges.jsx`).
Broader, pre-existing app-wide gaps are logged in §9.X as out-of-scope for this loop.

- **UXR-1 (P0) — Keyboard accessibility on `/achievements`.** Badge cards and the bottom nav are
  non-focusable `<div>`s (WCAG 2.1.1 fail). Nav items → `<a>`/`<Link>`; badge cards → focusable
  interactive elements (`role="button"` + `tabIndex=0` or `<button>`) with visible focus.
- **UXR-2 (P0) — Text contrast ≥ AA.** Badge title (`#7E8794`, 3.47:1) and description (`#A6ADB7`,
  2.16:1) on paper fail 4.5:1. Use a darker ink token (e.g. `ink-600`/`ink-700`) for these.
- **UXR-3 (P0) — MOMCAKE only on bare numerals.** The "0 badges" compound label and the
  `/badge-earned` badge *name* must use Barlow Condensed, not MOMCAKE. MOMCAKE may remain on the
  single progress numeral. (Wordmark "simFolio" is an allowed exception — see §9.X.)
- **UXR-4 (P0) — Accessible names on badge/medal/trophy SVGs.** The 19 glyphs in `Badges.jsx` need
  `role="img"`+`aria-label` (earned/locked conveyed in the label) or `aria-hidden` when a text label
  already names them.
- **UXR-5 (P0) — Progress semantics.** Progress indicators (achievements tiers + `BadgeEarned`
  `ProgressRing`) need `role="progressbar"` with `aria-valuenow/min/max`.
- **UXR-6 (P0) — Semantic headings.** `/achievements` and `/badge-earned` need a real `<h1>` (and
  section `<h2>`s) instead of `<div>` titles.
- **UXR-7 (P1) — `/badge-earned` CTA + ring.** CTA is white-on-ink (inverted); use ame-400 fill or
  outlined treatment per DS for dark surfaces. Verify the `ProgressRing` actually renders the arc
  (audit reported it as plain text) and that the MOMCAKE numeral sits on the ring fraction.
- **UXR-8 (P1) — Tier map on `/achievements`.** Explain the 10 badges → medal → 10 medals → trophy
  progression; the three counters currently read as disconnected.
- **UXR-9 (P1) — Programmatic earned/locked state.** Add `data-state="earned|locked"` +
  differentiated accessible name on badge cards.

### Iteration 2 — re-audit result (2026-06-20)

All 13 iteration-1 fixes verified PASS on `/achievements` and `/badge-earned`. **No new P0/P1
gamification requirements.** The UX loop has converged for the gamification surfaces — no further
requirements to add. (Remaining items are the app-wide §9.X set below, intentionally out of scope.)

### 9.X Pre-existing / app-wide (logged, OUT OF SCOPE for this gamification loop)

These predate the gamification feature and span the whole app; tracked here but not implemented in
this loop to keep changes surgical: app-wide missing `<nav>` landmark & semantic headings; unlabeled
inputs on `/markets` search and `/buy` fields; `/receipt` numbers not in Source Code Pro; generic
`<title>"app"`; wordmark MOMCAKE carve-out (add explicit DS exception); onboarding goal-button
height variance; `<blockquote>/<cite>` for hero quotes; 10px medal/trophy labels below 11px min.

**Resolved 2026-06-21** (commit follows the GAMux-audit fix pass): all of the above are now
addressed — `<nav>` landmark + keyboard-accessible nav buttons; `<h1>`/`<h2>` headings app-wide;
`aria-label` on markets search and buy/sell inputs; receipt values in Source Code Pro; per-route
`document.title`; wordmark MOMCAKE exception documented in `CLAUDE.md`; onboarding goal buttons given
a `min-h-[64px]` floor; hero quotes wrapped in `<blockquote>`/`<cite>`; medal/trophy labels bumped to
11px.
