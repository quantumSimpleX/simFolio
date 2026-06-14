# unittest.md — simFolio Test Plan (target ~90% line coverage)

Companion to `uitask.md`. The existing 11-file Vitest suite is the **regression net** for the
shadcn refactor; this plan keeps it green and adds the suites needed to push aggregate **line
coverage to ~90%**. The enforced gate in `vite.config.js` stays at **80%** (no mid-migration CI
surprises); 90% is the working target we measure against.

## Conventions (reuse existing infrastructure — do not reinvent)

- Render via `src/test/renderWithProviders.jsx` (`MemoryRouter` + `QueryClientProvider`
  `retry:false` + Auth/Theme/Language providers). Use `{ route, path }` for param routes,
  `{ withRouter:false }` for `<App/>`.
- Mock Supabase via `src/test/supabaseMock.js`: `__setTableData(table, rows)` to seed,
  `supabase.functions.invoke.mockResolvedValue(...)` for edge calls, `__reset()` in teardown
  (already wired in `setup.js`, alongside `cleanup()` + `localStorage.clear()`).
- Interactions: `fireEvent` + `screen.getByText/findByText/findByPlaceholderText`.
- Time-dependent logic: `vi.useFakeTimers()` + `vi.setSystemTime(iso)`, restore in `afterEach`.
- Hooks: `renderHook` from `@testing-library/react` with a provider `wrapper`.
- **Assert behavior/output, not styling.** Do not assert inline-style strings or Tailwind class
  names — that's what makes the suite survive the refactor. Query by role/text/test-id.
- During Phase 4 migration, add `data-testid` only where a screen lacks a stable text/role anchor.

---

## A. Existing suites — keep, adapt selectors only

Behavior assertions stay **identical**; touch only selectors broken by markup changes.

| File | Covers | Refactor action |
|---|---|---|
| `execution.test.js` | `isMarketOpen`, `placedBeforeToday`, `priceExecution`, `fillQuantity` | none (pure logic) |
| `heroes.test.js` | `HERO_DATA`, `matchHeroes`, `rankHeroesForSelection` | none |
| `marketHours.test.js` | client market hours + fees | none |
| `charts.test.jsx` | `MiniChart`, `ChartPanel`, `RangeButtons`, `Sparkline`, `PortfolioChart` | re-verify after Phase 2 |
| `primitives.test.jsx` | buttons, fields, pills, avatars, nav, toggles | adapt selectors (Phase 2) |
| `screens.smoke.test.jsx` | 27 render smoke cases across all screens | adapt selectors (Phase 4) |
| `trade.test.jsx` | buy/sell, limit/market, place order, TIF | adapt selectors (Phase 4) |
| `orders.test.jsx` | pending/filled/cancelled tabs, cancel, exec detail | adapt selectors |
| `auth.screens.test.jsx` | SignIn/SignUp/Welcome + validation | adapt selectors |
| `onboarding.flow.test.jsx` | goals multi-select, free text, hero select, stock input | adapt selectors |
| `misc.test.jsx` | chat messages, TradeReceipt variants, Markets search | adapt selectors |

---

## B. New suites — close the gap to ~90%

### B1. `ui.test.jsx` — shadcn primitive layer (`components/ui/*`)
- **Button**: renders label; `primary`/`danger`/`ghost`/`link` variants render; `disabled` blocks
  `onClick`; `loading` shows spinner + disables; `cta` size renders.
- **Input + Label + Textarea**: value/onChange round-trip; label `htmlFor` ↔ input `id`; error slot shows `errorMsg`.
- **Badge**: each status variant renders its label.
- **Avatar**: shows initials fallback when no image; respects size/color props.
- **Tabs**: clicking a tab swaps the active panel; default tab visible on mount.
- **Dialog**: closed by default; opens on trigger; closes on Esc + close button; focus trapped.
- **Sheet**: opens/closes; mobile bottom-sheet content visible.
- **Tooltip**: content appears on hover/focus, hidden otherwise.
- **Select / ToggleGroup**: selection changes fire `onValueChange`; single-select enforced.

### B2. Extend `primitives.test.jsx` — re-homed atoms
- **TermUnderline**: desktop → `ui/tooltip` shows glossary definition on hover; mobile
  (`useIsMobile` mocked true) → `ui/sheet` opens with EN/繁中 `ui/tabs`, tab switch swaps language;
  unknown term renders plain text (no trigger).
- **LangToggle**: switching updates `LanguageContext` (EN ↔ 繁中).
- **ThemeToggle**: toggling sets `document` `data-theme` to `dark`/`light` and persists.

### B3. `components.test.jsx` — extracted shared components
- **OrderCard / FilledRow / EmptyState**: render order fields; empty state copy when no orders.
- **Fundamentals**: renders P/E, market cap, div yield, 52w high; handles missing values gracefully.
- **WatchRow / SearchResultRow / WatchlistButton**: ticker/name/price render; `onClick` fires;
  watchlist toggle add/remove state.
- **PositionCard**: qty, value, cost basis, P&L sign + color semantics (gain aqua / loss red).
- **PriceCard**: market vs limit display; fee + total math shown.
- **AppShell**: renders TopNav + content + BottomNav (mobile); `active` tab highlighted.
- **HoldingRow / StockRow**: gain/loss formatting; `highlighted`, `compact`, `badge`, `onClick` props.
- **Badges**: `BadgeGlyphForIndex` maps index→glyph+color; earned vs unearned opacity; Medal/Trophy render.
- **HeroChatPanel**: renders `HeroMessage`/`UserMessage`/`SageMsg`; composer submit fires handler;
  hero message rendered italic + question form (assert text content, not style).
  - **Pending indicator**: while `isPending`, shows `Calling {hero name}…` (e.g. "Calling Warren
    Buffett…"); falls back to "Calling your council…" for an unknown `heroId`.
  - **Model label**: after a reply (`!isPending`, history non-empty), shows `answered by {model}`
    with the OpenRouter provider prefix stripped (`openai/gpt-oss-120b:free` → `gpt-oss-120b:free`),
    surfacing which model in the fallback chain answered. Hidden while pending and when no model is set.
  - **modelLabel(model)**: pure helper — strips the `provider/` prefix; returns `''` for falsy input.

### B4. `context.test.jsx` — providers
- **AuthContext**: `signIn`/`signUp`/`signOut` update `user` via Supabase mock; error path surfaces error.
- **ThemeContext**: `toggle` flips `data-theme`; initial value respected.
- **LanguageContext**: `setLang` switches; default = EN.

### B5. `hooks.test.jsx` — hooks (currently only indirectly covered)
- **useBreakpoint / useIsMobile**: matchMedia mock → `mobile`(<768) / `tablet`(768–1023) / `desktop`(≥1024).
- **useWatchlist**: add/remove/list against seeded table.
- **useOrders**: returns seeded orders; query key `['orders']`.
- **usePlaceOrder**: QUEUED vs FILLED branch on `invoke` result; **no-op when `session` null**
  (current dev stub); error path.
- **useAchievements**: badge/medal/trophy progression counts.
- **useHeroSelections**: selection list, max-council = 3 enforced.
- **useSymbolSearch**: returns matches; empty query → empty result.

### B6. `fees.test.js` — `lib/fees.js`
- Fee calculation across amounts (not just the constant); rounding; zero/edge amounts.

### B7. `marketCache.test.js` — `lib/marketCache.js`
- Write then read quote round-trips via Supabase mock.
- TTL: entry older than 5h treated as expired; fresh entry returned.
- Fundamentals persist across a quote refresh (separate persistence path).

---

## C. Coverage bookkeeping & exit criteria

- Run `npm run test:coverage`; record per-file line % here as a living checklist after each phase.
- **Counted toward target** automatically (config `include: src/**/*.{js,jsx}`): all `components/ui/*`,
  extracted components, contexts, hooks, `lib/fees.js`, `lib/marketCache.js`.
- **Out of the 90% target** (documented; gate stays 80%): `main.jsx` (excluded), `lib/supabase.js`
  (excluded real client), `tokens.js` + `data/*` + `questionLabels.js` (static constants), and
  the pixel-geometry branches in `Charts.jsx` (rendered/smoke-tested, not exhaustively asserted).

**Exit criteria:**
1. Every existing suite green.
2. New suites B1–B7 added and green.
3. `npm run test:coverage` aggregate **lines ≥ ~90%**; enforced 80% gate passes.
4. No test asserts inline styles or Tailwind class names (refactor-resilient).
