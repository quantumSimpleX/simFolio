# simFolio — Building Out All Dynamic Features

## Context

`simFolio` today is a **static, frontend-only React 19 + Vite prototype**. Every screen renders
hardcoded mock data (`app/src/tokens.js` plus inline arrays in each screen). There is **no backend,
no auth, no data fetching, no global state, no dark mode, and no i18n** — `LangToggle` is a
non-functional UI shell. The PRD (`designV1/uploads/simFolio_v01_00_MVP.md`) already ships a
migration-ready PostgreSQL schema (Appendix A2) and core API/computation logic (Appendix A3),
which this plan builds on directly.

Goal: make all six dynamic capabilities real —
(1) LLM-voiced Sage + Heroes, (2) real-time market data driving live portfolio valuation,
(3) Buy/Sell flow persisted to the database, (4) auth + per-user tracking, (5) a persisted
achievement system — while honoring (6) mobile/desktop, light/dark, and EN/繁中 requirements.

### Locked decisions
- **Backend / DB / Auth:** Supabase (managed Postgres + Auth + Row-Level Security + Edge Functions).
- **Market data:** Finnhub (free tier), proxied through a Supabase Edge Function so the key stays server-side.
- **LLM (Sage + Heroes):** a free open-weight model via **OpenRouter** (OpenAI-compatible REST,
  e.g. `meta-llama/llama-3.3-70b-instruct:free` or `qwen/...:free`), called from a Supabase Edge
  Function so the key stays server-side. Hero responses are always English (per PRD).
- **Data layer:** add **TanStack Query** (`@tanstack/react-query`) for fetching/caching/polling of
  market + portfolio data. Keeps loading/refetch/cache logic out of components.

---

## Architecture overview

```
React (Vite)                Supabase                         External
─────────────               ────────────────────────         ──────────────
Auth/Theme/Lang Context  →  Auth (email/password)
TanStack Query hooks     →  Postgres (PRD A2 schema, RLS)
  · useQuotes()          →  Edge Fn: market-data  ───────→   Finnhub REST
  · usePortfolio()       →  Edge Fn: place-order (A3 logic)→  Finnhub (exec price)
  · useHeroChat()        →  Edge Fn: hero-chat     ───────→  OpenRouter (open model)
                            Postgres triggers → achievements
```

Three Edge Functions hold all secrets (Finnhub key, OpenRouter key, service-role writes).
The browser only ever talks to Supabase with the anon key + the user's JWT.

---

## Phase 0 — Foundation (Supabase + env + providers)

1. **Supabase project + schema.** Create project. Apply the PRD Appendix A2 DDL as the first
   migration (`users`/`user_balances`/`hero_selections`/`orders`/`executions`/`positions`), plus
   add tables the PRD names but doesn't fully DDL: `achievements`, `hero_conversations`,
   and extend `users` with `language_preference` / `theme_preference` (already in A2). Enable
   **RLS** on every table: a user may read/write only rows where `user_id = auth.uid()`.
2. **Install deps** in `app/`: `@supabase/supabase-js`, `@tanstack/react-query`.
3. **Client + env.** `app/src/lib/supabase.js` (createClient from `import.meta.env.VITE_SUPABASE_URL`
   / `VITE_SUPABASE_ANON_KEY`). Add `app/.env.local` (gitignored) for the two public client vars.
   Finnhub + OpenRouter keys are **Edge Function secrets only**, never in the client bundle.
4. **Providers** wrap `<App/>` in `app/src/main.jsx`: `QueryClientProvider`, `AuthProvider`,
   `ThemeProvider`, `LanguageProvider` (the last three are new contexts under `app/src/context/`).
   - Verify: app boots, `supabase.auth.getSession()` returns null, no console errors.

## Phase 1 — Authentication & user tracking

- `app/src/context/AuthContext.jsx`: wraps `supabase.auth` (signUp, signInWithPassword, signOut,
  `onAuthStateChange`). Exposes `{ user, session, loading }`.
- Wire the existing auth screens (`screens/auth/SignUp.jsx`, `SignIn.jsx`, `ReturningUser.jsx`) —
  currently static forms — to call the context. On first sign-up, create the `user_balances` row
  (starting capital from onboarding) and persist `hero_selections`.
- Route guard in `app/src/App.jsx`: unauthenticated users → `/`; authenticated but no portfolio →
  `/onboarding`; else `/portfolio`.
- Onboarding (`screens/onboarding/Onboarding.jsx`) persists interview answers; capital answer seeds
  `user_balances.starting_capital` + `cash_balance`. The existing hero-recommendation step writes
  `hero_selections`.
  - Verify: sign up → onboarding → land on portfolio; refresh keeps you logged in; sign out works.

## Phase 2 — Real-time market data (do Markets screen first)

- **Edge Function `market-data`**: accepts `symbols[]`, calls Finnhub `/quote` (and `/profile2`,
  `/stock/candle` for detail/charts), returns normalized `{ ticker, price, change, pct, ... }`.
  Index row uses ETF proxies (SPY→S&P 500, QQQ→NASDAQ, DIA→Dow, IWM→Russell). Caches briefly to
  respect the 60 calls/min free tier.
- **Hooks** (`app/src/hooks/useQuotes.js`, `useStockDetail.js`) via TanStack Query with a polling
  `refetchInterval` (e.g. 15–30s) and a market-hours check (only poll Mon–Fri 9:30–16:00 ET).
- **Wire screens** by replacing the hardcoded arrays:
  `markets/MarketsDesktop.jsx`, `markets/MarketsMobile.jsx` (INDICES, STOCKS/WATCHLIST),
  `markets/StockDetail.jsx` (STOCK_DATA + candle chart via existing `components/Charts.jsx`).
  Keep the exact field shape the components already consume (`{price, change, pct, pos}`) so JSX is
  untouched; only the data source changes. Add loading/empty states.
  - Verify: Markets shows live prices that refresh; a known ticker matches Finnhub's site.

## Phase 3 — Portfolio persistence + Buy/Sell + order engine

- **Edge Function `place-order`** implements PRD Appendix A3:
  - Market-hours check (Mon–Fri 9:30–16:00 ET). Closed + MARKET → insert `orders` as `QUEUED`.
  - On execution: fetch live price (Finnhub), inject simulated **0.01%–0.05% slippage**, write
    `executions`, decrement/increment `user_balances.cash_balance`, recompute
    `positions.average_cost_basis`. All in one transaction (Postgres function / RPC) for financial
    integrity using the A2 `NUMERIC` types.
- **Hooks**: `usePortfolio()` computes valuation = `cash_balance + Σ(position.qty × live price)` by
  joining `positions` with `useQuotes`. `usePlaceOrder()` mutation invalidates portfolio queries.
- **Wire screens** (replace mock + the hardcoded `16000` cash, `STOCK_DATA`, `POSITION_DATA`):
  `trade/BuyScreen.jsx`, `trade/SellScreen.jsx`, `trade/TradeReceipt.jsx` (real executed price +
  slippage card — slippage education card always shows when exec≠order price, per design rules),
  `portfolio/PortfolioDesktop.jsx` / `PortfolioMobile.jsx` (HOLDINGS, value, today's change, cash),
  `orders/OrdersMobile.jsx` (pending/queued/filled from `orders`+`executions`).
  - Verify: buy executes, cash drops, position appears, receipt shows real slippage; an after-hours
    market order goes to QUEUED and shows on Orders.

## Phase 4 — LLM: Sage + Heroes (OpenRouter)

- **Edge Function `hero-chat`**: builds a system prompt per the PRD "Hero Response Inputs" (hero
  identity + philosophy, user onboarding profile, current holdings/portfolio, current market data,
  conversation history), calls OpenRouter (OpenAI-compatible `/chat/completions`) with a free
  open-weight model, returns the reply. Persists turn to `hero_conversations`. Enforces design
  rules: heroes speak in first person, **always English**, hero inline comments are
  question/observation form (never directives).
- **Hero persona data** (currently missing): create `app/src/data/heroes.js` (or a `heroes` table)
  with persona/philosophy text for Sage + the PRD's six heroes (Buffett, Munger, Lynch, Bogle,
  Dalio, Wood). Used to build the system prompt.
- **Hooks/UI**: `useHeroChat()` (mutation + history query). Wire `portfolio/AskTab.jsx` and the
  desktop hero sidebar in `PortfolioDesktop.jsx`, plus `components/HeroMessage.jsx`, replacing the
  hardcoded chat arrays. Sage guides onboarding and steps back after first trade; Heroes appear
  only after first trade (per CLAUDE.md/handoff rules) — gate on `executions` count.
  - Verify: ask a hero a question → in-character English reply grounded in your real holdings;
    history persists across refresh.

## Phase 5 — Achievement system (persisted)

- **Server-side evaluation**: a Postgres trigger/function on `executions` (and other events) inserts
  into `achievements` when criteria are met (First Trade, First ETF, Diversified = 5 securities,
  etc. — the badge list already in `tokens.js BADGES`). Keeps awarding authoritative, not client-spoofable.
- **Hooks/UI**: `useAchievements()` reads the user's earned badges; wire
  `achievements/AchievementsMobile.jsx`, `achievements/BadgeEarned.jsx`, `components/Badges.jsx`
  (replace `earned:true/false` mock). Badge-earned moment triggers when a new row appears.
  Progress math: 10 badges→medal→…→Master of Trading.
  - Verify: first buy awards "First Trade"; holding 5 distinct securities awards "Diversified".

## Cross-cutting (fold into the phases above)

### Dark mode (light is the only current palette)
- Convert `app/src/tokens.css` `:root` vars into theme-scoped vars: keep light values on
  `:root`/`[data-theme="light"]`, add a dark palette under `[data-theme="dark"]`.
- **Make `app/src/tokens.js` `C` resolve to CSS variables** (e.g. `paper: 'var(--paper)'`). Because
  every component already uses `C.xxx` in inline styles, this single change themes the whole app with
  **zero component edits**. `ThemeProvider` sets `document.documentElement.dataset.theme` and persists
  to `users.theme_preference`. Wire the existing theme toggle control (add to global nav).
- Verify: toggling theme recolors all screens; preference survives refresh + re-login.

### i18n — EN / 繁中 (scoped, per PRD: UI is English-only)
- Only **educational tooltips** and **onboarding** are bilingual; **hero responses stay English**.
- Create `app/src/data/glossary.json` (PRD Appendix A1 structure: `{ term: { en, zh-TW } }`) covering
  the ~15 terms the handoff lists (market_order, limit_order, slippage, cost_basis, P/E, ETF, …).
## Feature — LLM Hero Ranking (onboarding)

When the user does not name an admired investor, rank the top 7 of the 19 non-Warren heroes via the
LLM using all onboarding answers; the selection grid shows Warren + those 7. Falls back to
deterministic rule-based ranking when the LLM is unavailable. (Plan: `i-want-you-to-dynamic-thompson.md`.)

- [x] HR-1  Expand HERO_DATA to 20 heroes (heroes.js) from mentor.md; extend affinity maps for fallback.
- [x] HR-2  Add resolveSelectionHeroes() + candidateHeroes() + heroIdFromName() pure helpers to heroes.js.
- [x] HR-3  Create edge function app/supabase/functions/rank-heroes/ (OpenRouter, JWT, parse.ts/parseRankedIds).
- [x] HR-4  Add useHeroRanking.js hook (React Query, fallback-on-error, enabled gating).
- [x] HR-5  Wire ranking into Onboarding HeroSelect (LLM when no heroMention; loading skeleton + fallback).
- [x] HR-6  Update MVP PRD Hero Library (20) + Recommendation Engine (LLM ranking requirement).
- [x] HR-7  Add hero-chat personas + avatars for the 14 non-default heroes. `HERO_PERSONAS` in
            `hero-chat/index.ts` now covers graham, soros, templeton, tudorjones, druckenmiller, tepper,
            icahn, ackman, loeb, chamath, simons, griffin, livermore, burry (no longer Sage fallback);
            `HERO_MAP` in `HeroMessage.jsx` gained matching initials + QSXC colors so each renders its own
            avatar. (Edge fn needs `supabase functions deploy hero-chat` to take effect in prod.)
- [x] HR-8  Tests: unit (resolver, HERO_DATA, heroIdFromName), hook (success/malformed/error/disabled/no-session),
            Deno parser; ≥85% line coverage on new app/src feature files; suite green; build + lint clean.
            **Result: 188/188 Vitest pass (100%). Coverage — heroes.js 93.18% lines, useHeroRanking.js 100% lines
            (both ≥85%); global 84.95% (80% gate cleared). Lint + build clean. Deno parse.test.ts (8 cases)
            runs via `deno test` — not installed in this env, run manually.**

### QA findings — Round 1 (from test run)
- **[fixed] Brittle pre-existing test `rankHeroesForSelection > ranks diversification-aligned heroes higher`.**
  Adding `griffin`/`simons` to the diversification affinity list pushed `cathie` out of the default
  top-8 for that goal, so `ids.indexOf('cathie')` became `-1` and `indexOf('ray') < -1` failed.
  Implementation is correct (Ray still ranks above Cathie); the assertion was brittle. Re-anchored the
  test to compare positions within the full 21-long ordering (`count = 21`) so both heroes are present.
- **[fixed] Deno `parse.test.ts` was picked up by Vitest** (matches `**/*.test.ts`) and failed as a suite
  because it uses Deno APIs. Added `test.exclude: [...,'supabase/**']` to `vite.config.js` so edge-function
  tests run only under `deno test`. (Coverage gate untouched.)
- **Outcome:** 188/188 Vitest pass (100% > 95% target). No remaining failures.

### QA findings — Round 2 (HR-7 personas/avatars + full re-run)
- HR-7 added 14 chat personas + 14 avatar entries. No new tests required: `hero-chat` is Deno (excluded
  from Vitest) and `HERO_MAP` is static data exercised on `HeroMessage` render.
- **Re-run:** 188/188 Vitest pass (100%). Coverage — heroes.js 93.18%, useHeroRanking.js 100% lines;
  global 84.95% lines (80% gate cleared). `npm run lint` clean, `npm run build` ✓. Deno parser test still
  pending manual `deno test` (Deno not installed in this env).
- **Outcome:** All HR tasks (HR-1…HR-8) complete; pass rate 100% > 95% target.

- `LanguageContext` holds `lang` (`en` | `zh-TW`), persists to `users.language_preference`, and powers
  the existing `TermUnderline` tooltip primitive (desktop card / mobile bottom sheet with EN/繁中 tabs)
  and the onboarding strings. Wire the existing `LangToggle` (currently inert).
- Verify: toggling language switches tooltip + onboarding copy; hero chat remains English.

### Mobile vs desktop
- No new pattern needed — the app already branches at 1024px in `App.jsx` and ships mobile/desktop
  screen variants. All new hooks/contexts are layout-agnostic; each wired screen keeps its existing
  responsive variant.

---

## Suggested build order
0 (Supabase+providers) → 1 (auth) → 2 (market data) → 3 (portfolio/trade) → 4 (heroes) → 5 (achievements),
with **dark mode** foldable any time after Phase 0 and **i18n** alongside onboarding (Phase 1) and trade (Phase 3).

## Critical files
- New: `app/src/lib/supabase.js`; `app/src/context/{AuthContext,ThemeContext,LanguageContext}.jsx`;
  `app/src/hooks/{useQuotes,useStockDetail,usePortfolio,usePlaceOrder,useHeroChat,useAchievements}.js`;
  `app/src/data/{heroes.js,glossary.json}`; Supabase `supabase/functions/{market-data,place-order,hero-chat}/`;
  migrations from PRD Appendix A2/A3.
- Modified (data source swap, shapes preserved): `app/src/tokens.js`, `app/src/tokens.css`,
  `app/src/main.jsx`, `app/src/App.jsx`, all `screens/**` that hold mock arrays, `components/HeroMessage.jsx`,
  `components/Badges.jsx`, `components/Primitives.jsx` (LangToggle/TermUnderline).

## End-to-end verification
Run `npm run dev`; sign up → onboarding seeds capital + heroes → Markets shows live Finnhub prices →
buy a stock (cash drops, position + receipt with real slippage) → "First Trade" badge appears →
ask a Hero (in-character English reply grounded in holdings) → toggle dark mode and 繁中 tooltips →
sign out / back in: portfolio, badges, theme, language all persisted.

---

## Feature — Clickable Asset Mentions in Chat

**Requirement (PRD "Interactive Asset Mentions"):** whenever a stock / ETF / crypto asset is
mentioned in any chat message (hero, Sage, or user), render it as an underlined, clickable link.
Clicking anywhere in the chat window opens that asset exactly like a Markets search hit
(`/stock/<TICKER>`).

### Design
- Detection lives in a pure module so it is fully unit-testable in isolation.
- A small presentational component turns detected mentions into accessible links.
- Wiring is a single prop threaded down the existing chat render path — no new data fetching.

### Plan & checklist
- [x] AM-1  `app/src/lib/assetLinks.js` — `ASSET_REGISTRY`, `findAssetMentions(text,{extraTickers})`
            (cashtag + company-name + bare-ticker detection, stopword guard, overlap resolution),
            and `splitTextWithAssets()`.
- [x] AM-2  `app/src/components/AssetText.jsx` — renders plain/asset segments; asset segments are
            `role="link"` spans (click + Enter/Space) that `navigate('/stock/<TICKER>')` by default,
            or call an injected `onAssetClick` (tests).
- [x] AM-3  Wire into `components/HeroMessage.jsx` (`HeroMessage` + `UserMessage` via `AssetText`).
- [x] AM-4  Thread `assetTickers` through `components/HeroChatPanel.jsx` `ChatMessages` and pass the
            user's `positions + watchlist` from `AskTab.jsx` and `PortfolioDesktop.jsx` so personal
            symbols always link.
- [x] AM-5  PRD: add "Interactive Asset Mentions" requirement to `simFolio_v01_00_MVP.md`.
- [x] AM-6  Tests per `unittest.md`; ≥80% line coverage on new feature files; full suite green;
            build clean.
            **Result: 235/235 Vitest pass (100% > 95% target), incl. 27 new feature cases.
            Coverage — assetLinks.js 100% lines, AssetText.jsx 100% lines (both ≥80%).
            `npm run build` ✓.**

### QA findings — asset-mention feature
- **[fixed] Standalone `HeroMessage` render broke under Router-less test.** `misc.test.jsx`'s "renders
  every hero" case rendered `HeroMessage` with no Router; `AssetText` calls `useNavigate`, which throws
  outside a `<Router>`. Real screens (and the chat component tests in `components.test.jsx`) always have
  a router, so wrapped that one test in `MemoryRouter` (mirrors the existing `wrap()` pattern). Minimal,
  justified test update — the component now contains links and so legitimately requires router context.
- **[pre-existing, not introduced] `npm run lint` reports one error** in `HeroChatPanel.jsx:10`
  (`react-refresh/only-export-components` on the long-standing `modelLabel` export). Verified present on
  a clean `git stash` checkout, so it predates this feature and is out of scope. New feature files
  (`assetLinks.js`, `AssetText.jsx`) lint clean.
- **Outcome:** 235/235 Vitest pass (100% > 95% target). No remaining failures attributable to the feature.

### Iteration 2 — live market-data validation (broaden coverage)
Reported gap: companies/stocks mentioned by name but absent from the curated registry (e.g.
"Palantir", "AMD") were not linked. Per user decision, detection now **validates candidates against
live market data** instead of relying on a static list alone.

- [x] AM-7  `lib/assetLinks.js`: replace `findAssetMentions`/`splitTextWithAssets` with
            `findAssetSpans()` that classifies each span as **trusted** (registry / holdings /
            watchlist / known cashtag → link immediately) or **validate** (unknown cashtag, ALL-CAPS
            token, or capitalized proper noun → carries a `query`). Added `COMMON_WORDS` thrift filter
            and `resolutionKey()`.
- [x] AM-8  `lib/resolveSymbol.js`: `resolveSymbol(query,type)` + `matchRows()` confirm a candidate
            against TwelveData `symbol_search` (US Common Stock/ETF), memoized in localStorage
            (positives and negatives) so each term is looked up once.
- [x] AM-9  `hooks/useAssetResolution.js`: batches validation candidates through React Query
            (`useQueries`, `staleTime: Infinity`, deduped); returns a key→ticker map.
- [x] AM-10 `components/AssetText.jsx`: renders trusted spans synchronously and validated spans once
            resolved; unresolved/unknown candidates stay plain text.
- [x] AM-11 Tests reworked in `assetLinks.test.jsx` (findAssetSpans, matchRows/resolveSymbol incl.
            cache + error paths, AssetText trusted + live-validated). Added `QueryClientProvider` to the
            `components.test.jsx` / `misc.test.jsx` chat renders (AssetText now uses React Query).
- [x] AM-12 PRD updated with the live-validation requirement.
            **Result: 239/239 Vitest pass (100% > 95%). Coverage — assetLinks.js / AssetText.jsx /
            resolveSymbol.js all 100% lines; global 86.93% (80% gate cleared). New files lint clean.
            `npm run build` ✓.**

### QA findings — iteration 2
- **[fixed] Over-strict ordering test.** A test fed "Compare Apple to …"; "Compare" is now correctly a
  name *candidate* (ticker undefined until validated), so `m.map(s=>s.ticker)` led with `undefined`.
  Re-anchored the test to a sentence without a stray proper noun — behavior is correct.
- **[fixed] Two `no-useless-assignment` lint errors** in new files (a redundant `ticker = null` in a
  catch, and a final unused `key++`). Resolved; new files lint clean.
- **Note:** validation depends on `VITE_TWELVEDATA_API_KEY` and is best-effort — on rate-limit/no-key,
  unknown candidates gracefully render as plain text (trusted/registry/holdings still link offline).
- **Outcome:** 239/239 Vitest pass (100% > 95% target).
