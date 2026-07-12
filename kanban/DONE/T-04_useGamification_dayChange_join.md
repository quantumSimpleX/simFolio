# T-04 useGamification.jsx: dayChange join for positions

## Goal
Positions built in `useGamification.jsx` carry a `dayChange` field sourced from the live
quote cache, so the `steady` gauge (T-03) has data to compute against.

## Files/modules touched
- `app/src/gamification/useGamification.jsx` (positionsRef effect, ~lines 40-44)
- `app/src/test/gamification.useGamification.test.jsx`

## Dependencies
None (implementation-independent of T-01/T-03; parallel-safe, though the join is only
useful once T-03 consumes it).

## Context pointers
- Gam2req.md §2.1 `steady` row: "Positions in `positionsRef` (`useGamification.jsx:40-44`) do not carry dayChange — join live quote pct from React Query `['quotes', ticker]` cache inside `getPositions` closure. Opportunistic: 0 when quotes uncached is acceptable."
- CLAUDE.md query key convention: `['quotes', ticker]` is the canonical React Query key for live quotes — use `queryClient.getQueryData(['quotes', ticker])`, do not add a new fetch.
- Do not throw or block if a quote isn't cached — default to omitting/zeroing dayChange for that position.

## Implementation Notes

Added an exported pure helper `joinDayChange(positions, queryClient)` in
`useGamification.jsx` and called it from the `positionsRef` effect:
`positionsRef.current = joinDayChange(positions, qc)`.

Field/shape for the T-03 consumer:
- `p.dayChange` is a **number** — the quote's day-change **percent** (e.g. `-6.2`
  means the position is down 6.2% on the day). Source field is `pct` on the quote
  object (`useQuotes.js` `parseQuote`, confirmed by `usePortfolio.js` `changePct: q?.pct`).
- `dayChange` is **present only when the quote is cached**; otherwise it is
  **omitted** (i.e. `p.dayChange === undefined`). This matches `stateProvider.js`,
  whose comment notes `undefined <= -5` is `false`, so uncached positions are
  naturally excluded from the `steady` count rather than miscounted as flat.

Cache-key reality (important): quotes are NOT stored under a per-ticker key.
`useQuotes` caches under `['quotes', <tickers>.join(',')]` (e.g.
`['quotes','AAPL,MSFT']`) and the value is an **array** of quote objects. A
literal `getQueryData(['quotes', ticker])` would therefore return an array (or
`undefined`), not a single quote. The helper instead scans every `['quotes', …]`
cache via `queryClient.getQueriesData({ queryKey: ['quotes'] })` (partial-key
match) and builds a `ticker → pct` map. This handles both batched (portfolio) and
single-ticker (detail/buy screens) cache entries, and never throws on missing or
partial cache. `['quotes-display', …]` (transient search results) is not matched,
which is correct — only real cached quotes feed the gauge.

Surgical scope: only the two `useGamification.jsx` edits (helper + one effect
line) and the new test block. `stateProvider.js` was left untouched (owned by T-03).

## Test Plan

Unit tests live in `app/src/test/gamification.useGamification.test.jsx`
(`describe('joinDayChange — position dayChange join')`), directly exercising the
pure helper with a real `QueryClient` seeded via `setQueryData`:

1. Batched cache key → join: `['quotes','AAPL,MSFT']` cached; both positions get
   `dayChange` equal to the quote `pct`. Verifies the array/joined-key shape works.
2. Uncached ticker → omit: only `AAPL` cached; `AAPL` gets `dayChange`, `TSLA` has
   no `dayChange` key (`'dayChange' in p === false`).
3. Empty cache → no throw, positions returned unchanged (no `dayChange`).
4. Empty / `undefined` positions → returns `[]` without throwing.

Verification run:
- `npx vitest run src/test/gamification.useGamification.test.jsx` → 9 passed.
- `npx vitest run` (full suite) → 45 files / 952 tests passed (no regressions).
- `npx eslint` on both changed files → clean.

Not covered by unit test (by design): the join is wired through the `positionsRef`
effect and surfaced to the engine's `getPositions` closure. The existing suite
mocks the gamekit engine, so that closure isn't invoked at render time; the pure
helper is tested in isolation instead, which is the observable unit of behavior.

## QA Results

Verdict: **PASS**. Re-ran the full test plan against the actual code (not just
re-trusted the dev-engineer's report) and independently cross-checked the
cache-shape/field claims against `useQuotes.js`, `usePortfolio.js`, and
`stateProvider.js`. No real issues found.

Test plan items (all PASS):
1. Batched cache key → join — PASS. `['quotes','AAPL,MSFT']` seeded, both
   positions get `dayChange` equal to the quote's `pct`.
2. Uncached ticker → omit — PASS. Only `AAPL` cached; `TSLA` correctly has no
   `dayChange` key at all (not `undefined`-valued, actually absent — verified
   via `'dayChange' in p === false`, matters because `p.dayChange <= -5` in
   `stateProvider.js:25` needs `undefined`, and an absent key does yield
   `undefined` on read, so this is equivalent and safe).
3. Empty cache → no throw, positions unchanged — PASS.
4. Empty/`undefined` positions → returns `[]` without throwing — PASS.

Verification commands re-run directly (not taken on faith):
- `npx vitest run src/test/gamification.useGamification.test.jsx` → 9 passed
  (matches claim).
- `npx vitest run` (full suite) → 45 files / 952 tests passed, 0 failures
  (matches claim, no regressions).
- `npx eslint src/gamification/useGamification.jsx src/test/gamification.useGamification.test.jsx`
  → clean (matches claim).
- `git diff --stat` on both changed files → 65 insertions / 2 deletions total,
  confirms the "surgical scope" claim (one helper + one effect line + one test
  block, nothing else touched).

Cross-checks performed:
- **`pct` field is really day-change percent**: confirmed in `useQuotes.js`
  `parseQuote()` (`pct = prev > 0 ? (change / prev) * 100 : 0`) and
  independently corroborated by `usePortfolio.js:44` (`changePct: q?.pct ?? 0`).
  The dev-engineer's claim is correct.
- **Cache-key scanning approach is sound, not fragile**: `queryClient.getQueriesData({ queryKey: ['quotes'] })`
  uses React Query's `partialMatchKey`, which does element-wise array
  comparison, not string-prefix matching — confirmed against the TanStack
  Query source via Context7. `['quotes-display', 'AAPL']` (transient search
  results) does NOT match filter key `['quotes']` because index 0
  (`'quotes-display'` vs `'quotes'`) fails strict equality. So the transient
  display cache is correctly excluded, as claimed. Also confirmed every real
  write site in the codebase (`useQuotes.js:160`, `useMarketDataPreload.js:17`)
  always stores an array under `['quotes', joinedTickers]`, even for a single
  ticker — there is no alternate "single-object" cache shape in this codebase,
  so the helper's array-only handling is complete, not just opportunistic.
- **Deviation from the task file's literal `getQueryData(['quotes', ticker])`
  wording**: this is correct engineering, not scope creep. The literal
  instruction doesn't match the real cache shape (`useQuotes.js` always
  batches all requested tickers into one entry keyed by the joined ticker
  string — `['quotes', symbols.join(',')]` — never one entry per ticker), so a
  literal implementation would silently return `dayChange: undefined` for
  every position whenever more than one ticker is on screen, which is most of
  the time (portfolio view). The `getQueriesData` scan is the only approach
  that actually works against the real cache, and it's the minimal correct
  fix — not an expansion of scope.
- **`undefined <= -5` semantics for T-03's `steady` gauge**: confirmed in
  `stateProvider.js:22-25` — `heldThroughDrop: held.filter((p) => p.dayChange <= -5).length`.
  Since `joinDayChange` omits the key entirely rather than setting
  `dayChange: 0` or `dayChange: undefined` explicitly, `p.dayChange` reads as
  `undefined` for uncached positions, and `undefined <= -5` is `false` in JS —
  so uncached positions are correctly excluded from the "held through a >=5%
  drop" count rather than being miscounted. This matches T-03's documented
  expectation exactly.

Minor gaps noted (non-blocking, informational only):
- No unit test explicitly exercises the `['quotes-display', …]` exclusion
  claim from the implementation notes (verified instead by reasoning about
  `partialMatchKey` + reading real cache write sites, since the current
  codebase never stores multiple quote entries where such a collision could
  occur in a single test). Low risk — the exclusion follows directly from
  React Query's documented matching semantics, not from
  application-specific logic that could silently drift.
- The task file's Implementation Notes describe "handling both batched
  multi-ticker and single-ticker cache shapes" as if these were two distinct
  code paths. In the real codebase they're the same shape (an array, always
  keyed `['quotes', joinedTickers]`) — the helper doesn't special-case
  anything for a single ticker, it's just an array of length 1. Not a bug,
  just slightly overstated documentation language; no action needed.
- Per the task file's own note, the join is not exercised end-to-end through
  the `positionsRef` effect / `getPositions` closure in any test (the driver
  test suite mocks the gamekit engine, so that closure is never invoked
  during rendering). This is a reasonable, explicitly-flagged limitation
  given the existing test architecture, not a defect — but if a future
  integration test un-mocks the engine, this join is the first place a real
  end-to-end assertion on `dayChange` should be added.

## Status
Status: TODO
