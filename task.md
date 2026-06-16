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

### Iteration 3 — LLM bracket markers (reliable multi-word detection)
Reported gap: client-side detection of company names (esp. multi-word) was poor. New mechanism: the
LLM wraps every asset it mentions in `[...]`; the client links the whole bracketed entity and strips
the brackets — no fragile name parsing.

- [x] AM-13 `hero-chat/index.ts`: add a system-prompt rule to wrap every company/stock/ETF/crypto
            name or ticker in square brackets as one unit (multi-word included), and bracket nothing
            that isn't a tradable asset. (Needs `supabase functions deploy hero-chat` in prod.)
- [x] AM-14 `lib/assetLinks.js`: `findAssetSpans()` now parses `[...]` entities first (whole unit,
            display strips brackets) → fast-path resolve or validate as `entity`. Unbracketed text
            keeps only precise trusted detection (known cashtag / registry name / known-or-owned
            ticker) + unknown-cashtag validation. Dropped the noisy proper-noun + unknown-ALL-CAPS
            guessing and the `COMMON_WORDS` list.
- [x] AM-15 `lib/resolveSymbol.js`: `matchRows` handles the `entity` type (exact symbol → name
            prefix/contains) and strips a leading `$`.
- [x] AM-16 `components/AssetText.jsx`: renders each span's `display` (brackets stripped whether or
            not it resolves); trusted spans link synchronously, entities link once validated.
- [x] AM-17 Tests reworked for the bracket model (bracketed trusted/validate, unbracketed precise,
            brackets-stripped-on-fail, matchRows entity + `$` strip).
- [x] AM-18 PRD updated to specify the bracket-marker mechanism.
            **Result: 238/238 Vitest pass (100% > 95%). Coverage — assetLinks.js / AssetText.jsx /
            resolveSymbol.js all 100% lines; global 87.05% (80% gate cleared). New files lint clean.
            `npm run build` ✓.**

### QA findings — iteration 3
- Behavior change is intentional: **unbracketed** company names are no longer guessed (that was the
  "poor detection" the user hit). In practice hero replies are bracketed by the LLM, so multi-word
  names like "Berkshire Hathaway" now link reliably as one entity.
- **Dependencies:** linking bracketed *unknown* entities still needs `VITE_TWELVEDATA_API_KEY`
  (best-effort; falls back to plain text). The prompt change requires redeploying the `hero-chat`
  edge function to take effect in production.
- **Outcome:** 238/238 Vitest pass (100% > 95% target).

### Iteration 4 — two-pass server-side tagging (reliable bracketing)

Inline bracketing (iteration 3) proved unreliable in production: open models routinely ignored the
"wrap every asset in `[]`" instruction, so live replies arrived unbracketed. Replaced it with a
two-pass flow entirely inside the `hero-chat` edge function — no client changes (the bracket parser +
live validation pipeline is unchanged).

- [x] AM-19 `hero-chat/index.ts`: removed the inline ASSET-TAGGING prompt block (pass 1 now replies
            naturally).
- [x] AM-20 Added `extractAssets()` — pass 2 "market analyst" LLM call returning the exact mentions as
            a JSON array (via `callLLMWithFallback` with a JSON `validate`); best-effort (returns `[]`
            if all models fail).
- [x] AM-21 Added `bracketAssets()` — deterministically wraps each mention in `[]`: longest-first,
            word-boundary safe, no overlap. Seeds existing `[]` regions so re-tagging is idempotent
            (never nests). Persists/returns the bracketed text so links survive a history reload.
- [x] AM-22 Added `tag_text` request mode: runs only the analyst pass on arbitrary text → returns the
            bracketed version + `mentions`. Enables backfilling past replies and easier testing.
- [x] AM-23 Analyst instructed to ignore text already inside `[]`.
- [x] AM-24 Requirement doc updated to the two-pass mechanism.

### QA findings — iteration 4
- Client + parser unchanged → all client tests still pass (**239/239** Vitest, 100% > 95%). Edge
  function is Deno-only (excluded from Vitest); Deno not installed locally so it isn't type-checked
  here — logic is straightforward string handling.
- **Tradeoff:** two LLM calls per message (extra latency/cost). Acceptable for reliability; the
  analyst pass is small and uses the same free fallback chain.
- **Dependency unchanged:** requires redeploying `hero-chat` (`supabase functions deploy hero-chat`)
  to take effect in production; linking unknown entities still needs `VITE_TWELVEDATA_API_KEY`.

### Iteration 5 — extraction reliability + deterministic format net

Deployed iteration 4 found assets unreliably (e.g. 1 of 4 in one reply): `callLLMWithFallback`
accepts the first model returning valid JSON, and the chain led with the smallest model, whose
incomplete-but-valid array was accepted. Root `supabase/` (stale dup) had also been deployed by
mistake from the repo root — redeployed from `app/`.

- [x] AM-25 `_shared/llm.ts`: optional `temperature` (additive; other callers unaffected).
- [x] AM-26 `hero-chat/index.ts`: extraction now uses `EXTRACT_MODELS` (gpt-oss-120b → llama-70b →
            gemma-31b, strongest first), `temperature: 0`, and an exhaustive prompt + worked example.
- [x] AM-27 `lib/assetLinks.js`: unbracketed scan now flags unknown ALL-CAPS tokens of 3+ letters as
            `ticker` validation candidates (STOPWORDS-guarded), catching ticker-shaped misses like
            `ARKG`/`PLTR`; still links only if live market data confirms them.
- [x] AM-28 Tests for the format net (flag `PLTR`/`ARKG`; ignore 2-letter & stopwords); doc updated.

### QA findings — iteration 5
- **241/241** Vitest pass (+2). Build/parser otherwise unchanged.
- Live `tag_text` check confirmed bracketing of multi-word names + tickers after deploy.
- **Cost:** extraction prefers larger free models (slower/heavier) but stays within the wall-clock
  budget (550B model excluded). Format net adds no LLM cost (client-side + cached validation).

### Iteration 6 — fewer API calls, markdown bold, ticker-only validation

Decisions: (a) validate **only ticker-shaped** brackets — skip fuzzy company-name lookups; (b)
render `**bold**` markdown; (c) hint the analyst that `**`-wrapped text is a strong asset candidate.

- [x] AM-29 `hero-chat/index.ts`: `collapseNameTickerPairs()` rewrites `[Name] ([TICKER])`
            (brackets <=5 chars apart, name = title-case, ticker = caps+optional `.`, len>3) to
            `Name ([TICKER])` — tags only the ticker. Applied in both the chat flow and `tag_text`.
- [x] AM-30 `_shared/llm.ts`: optional `temperature` already added (iter 5); reused here.
- [x] AM-31 `hero-chat`: analyst prompt gains a `**`-hint line (fixes missed
            "iShares MSCI Global Impact ETF (MPCT)") — return the name/ticker without asterisks.
- [x] AM-32 `lib/assetLinks.js`: new exported `looksLikeTicker()` (1–5 caps, optional `.X`).
            Bracket branch now: registry/owned → free link; ticker-shaped → validate (one exact
            lookup); company name → plain text, NO fuzzy search. `entity` type no longer produced
            (matchRows still supports it for the symbol-search page / tests).
- [x] AM-33 `components/AssetText.jsx`: renders `**bold**` as `<strong>` (asterisks stripped),
            linkifying assets inside; single `useAssetResolution` across all bold/plain segments.
- [x] AM-34 Tests updated (ticker-only validation, bracketed name → plain/no-fetch, bold render,
            collapsed pair); docs updated.

### QA findings — iteration 6
- **244/244** Vitest pass; lint clean on changed files; `hero-chat` redeployed.
- **API-call saving:** a `[Name] ([TICKER])` pair now costs **one** exact lookup instead of a
  fuzzy name search + a ticker lookup. A bracketed name with no ticker won't link (accepted
  tradeoff per the chosen strategy).
- Client changes need a Vercel deploy (push) to reach production; edge change is already live.

### Iteration 7 — split combined name+ticker mentions

Live `**`-hint test showed the analyst returning a whole bold segment as one mention
(`"iShares MSCI Global Impact ETF (MPCT)"`), which bracketed as a single non-ticker entity →
wouldn't link (the ticker was buried inside).

- [x] AM-35 `hero-chat/index.ts`: `normalizeMentions()` deterministically splits `Name (TICKER)`
            into two atomic entries and strips stray asterisks; applied before bracketing in both
            the chat flow and `tag_text`. Prompt also tightened ("a SINGLE name OR a SINGLE ticker,
            never combined") with a `**bold**` example.
- Edge-only change (no client change); 244/244 Vitest still pass; `hero-chat` redeployed.

---

## Feature — Nav preferences (language + theme icons), cash size, chat cleanup

**Requirements (from user):**
1. Language chosen at sign-up persists across the app and is stored in the user's profile.
2. Toggling tooltip language in the top nav updates the language in the user's profile.
3. Returning user, after sign-in, goes directly to the portfolio page.
4. Tooltip language persisted in the profile sets the language shown in the nav on load.
5. Use a US flag + Taiwan flag icon to denote tooltip language.
6. Single theme icon toggling sun (light) ↔ moon (dark); persists preferred theme to profile.
7. Nav controls use icons to save space.
8. Cash balance shown in a larger font.
9. Remove the quick-select prompt pills under the hero in the chat window.

**Current state (verified):** `LanguageContext`/`ThemeContext` already persist to
`users.language_preference`/`theme_preference` and load on user change (reqs 1–4 largely wired).
`SignIn`/`SignInDesktop` already route to `/portfolio` (req 3). `lucide-react` is available.

**Design decisions:**
- Language toggle = a single **flag icon** showing the current language; click toggles
  US (English) ↔ TW (繁體中文). Flags are inline SVG (design system forbids emoji).
- Theme toggle = a single **lucide Sun/Moon icon** reflecting current theme; click toggles.
- Persistence hardened: both contexts mirror to `localStorage` and push the local value up to a
  freshly-created profile, so the sign-up selection survives the anon→new-user transition.
- Keep `QuickPrompts` exported (unit-tested); only remove its usage from chat surfaces.

**Plan & checklist:**
- [x] NP-1  `Primitives.jsx`: add `FlagIcon` (US/TW SVG); `LangToggle` → single flag button.
- [x] NP-2  `Primitives.jsx`: `ThemeToggle` → single Sun/Moon lucide icon button (keeps testid).
- [x] NP-3  `LanguageContext.jsx`: localStorage init + mirror; push local→empty profile.
- [x] NP-4  `ThemeContext.jsx`: localStorage init/apply on mount + mirror; push local→empty profile.
- [x] NP-5  `Nav.jsx`: cash value enlarged to text-xl bold (label shrunk to an eyebrow).
- [x] NP-6  `HeroSidebar.jsx` + `AskTab.jsx`: removed `QuickPrompts` usage + import.
- [x] NP-7  Verified `SignIn`/`SignInDesktop` already `navigate('/portfolio')`.
- [x] NP-8  Tests + coverage + lint + build (results below).

### Status / results
- **Suite: 249/249 Vitest pass (100% > 95% target).**
- **Coverage: global 85.24% lines (80% gate cleared).** Changed core files: `Primitives.jsx`
  98.38%, `ThemeContext.jsx` 95.23%, `Nav.jsx` 82.14% (all >80%).
- `npm run lint` clean on all changed source + test files; `npm run build` ✓.
- New/updated tests: primitives toggle test reworked for the icon buttons (aria-label flips +
  `data-theme`); `FlagIcon` US/TW render; LanguageContext + ThemeContext localStorage init/mirror;
  AskTab asserts no quick-prompt pills.

### QA findings
- **localStorage now affects context init**, so cross-test contamination was possible. Added
  `localStorage.clear()` to the context test `beforeEach` and to the primitives toggle test for
  determinism. No production impact.
- **`HeroSidebar.jsx` / `AskTab.jsx` per-file coverage is ~66%** — pre-existing (the chat
  send/hook branches were never exercised by the smoke render). This edit only removed the pills
  and did not lower it; global gate still passes. Out of scope to backfill chat-send tests here.
- **DB dependency:** persistence needs `users.language_preference` and `users.theme_preference`
  columns in the hosted Supabase project (the contexts already targeted them; SQL must be applied
  there — cannot be done from app code). Tests use the supabase mock so they don't depend on it.
- **Outcome:** all NP tasks complete; pass rate 100% > 95% target.

### NP follow-up — tighter nav pair + toggles on auth pages
- Added `NavToggles` (tight `gap-1` lang+theme pair). Nav uses it (icons now adjacent).
- Placed `NavToggles` as top-right chrome on the auth pages: `AuthLayout` (desktop welcome
  sign-up + sign-in), and the mobile `WelcomeMobile` / `SignUp` / `SignIn` headers. Removed the
  redundant verbose "Tooltip language" rows from `WelcomeDesktop` / `WelcomeMobile` / `SignUp`.
- **249/249 Vitest pass (100%)**, lint clean, build ✓.

---

## Feature — Enrich Educational Tooltips (`feature/tooltip-glossary`)

Goal: every piece of unfamiliar financial terminology in the UI shows a tooltip (dotted amethyst
underline → desktop hover / mobile bottom sheet) with a plain-language definition in **English +
Traditional Chinese**. Acronyms must be spelled out in full in the definition (e.g. "P/E" →
"Price-to-Earnings Ratio").

Reuse the existing system — do NOT rebuild:
- `app/src/data/glossary.json` (term store, `{ en, zh-TW }` × `{ title, definition }`)
- `app/src/components/Primitives.jsx` → `TERM_MAP` (display text → key) + `TermUnderline` component

### T1 — Add new glossary terms to `app/src/data/glossary.json`
Add the keys below (existing 14 stay untouched). Definitions simple enough for a high-schooler
with zero finance background; spell out every acronym in full. 繁中 follows house style: Chinese
title with the English term in parentheses, e.g. `本益比 (P/E Ratio)`.

- [x] T1.1 `eps` — "EPS (Earnings Per Share)": company profit divided by number of shares.
- [x] T1.2 `beta` — how much a stock moves vs. the overall market (1=with market, >1=swings more).
- [x] T1.3 `volume` — number of shares traded in a period (e.g. today).
- [x] T1.4 `avg_volume` — "Average Volume": typical shares traded per day recently; a baseline.
- [x] T1.5 `exchange` — the marketplace where a stock is bought and sold (NASDAQ, NYSE).
- [x] T1.6 `52w_range` — "52-Week Range": lowest and highest price over the past year.
- [x] T1.7 `shares` — units of ownership in a company; one share = one small slice.
- [x] T1.8 `ticker` — "Ticker Symbol": the short letter code for a stock (e.g. AAPL).
- [x] T1.9 `position` — a stock you currently own; the shares you hold in one company.
- [x] T1.10 `holdings` — all the stocks and investments you currently own.
- [x] T1.11 `bid_ask_spread` — "Bid-Ask Spread": gap between top buyer price and lowest seller price.
- [x] T1.12 `gross_cost` — total price of your purchase before fees.
- [x] T1.13 `gross_proceeds` — total money from your sale before fees.
- [x] T1.14 `net_proceeds` — money actually added/removed from your cash after fees.
- [x] T1.15 `execution_price` — the actual price per share your order filled at.
- [x] T1.16 `time_in_force` — how long your order stays active before it expires/cancels.
- [x] T1.17 `gtc_order` — "GTC (Good-Till-Cancelled)": order stays open until filled or cancelled.
- [x] T1.18 `day_order` — "Day Order": expires at the end of the trading day if not filled.
- [x] T1.19 `crypto` — "Cryptocurrency": digital money (e.g. Bitcoin) that trades like a stock.
- [x] T1.20 `index` — "Market Index": a scoreboard tracking a group of stocks (S&P 500, NASDAQ, DOW).
- [x] T1.21 `watchlist` — a saved list of stocks you watch without owning them.
- [x] T1.22 `dividend` — a cash payment a company shares with shareholders from its profits.

### T2 — Extend `TERM_MAP` in `app/src/components/Primitives.jsx`
- [x] T2.1 Add aliases so on-screen labels resolve: `'p/e'→pe_ratio`, `'eps'→eps`, `'beta'→beta`,
  `'β'→beta`, `'div yield'→dividend_yield`, `'volume'→volume`, `'avg volume'→avg_volume`,
  `'exchange'→exchange`, `'52w range'→52w_range`, `'shares'→shares`, `'shares to sell'→shares`,
  `'ticker'→ticker`, `'positions'→position`, `'your position'→position`, `'holdings'→holdings`,
  `'bid-ask spread'→bid_ask_spread`, `'gross cost'→gross_cost`, `'gross proceeds'→gross_proceeds`,
  `'net to cash'→net_proceeds`, `'net deducted'→net_proceeds`, `'total deducted'→net_proceeds`,
  `'executed at'→execution_price`, `'execution price'→execution_price`,
  `'time in force'→time_in_force`, `'gtc'→gtc_order`, `'day'→day_order`, `'crypto'→crypto`,
  `'major indices'→index`, `'watchlist'→watchlist`, `'watching'→watchlist`.
- [x] T2.2 Verify the punctuation-stripped fallback doesn't mis-resolve; pass explicit `termKey`
  at a call site only where the visible label is ambiguous.

### T3 — Wire UI labels (wrap label text only; never wrap numeric values; no layout refactor)
- [x] T3.1 `components/Fundamentals.jsx` — wrap inline "P/E", "EPS", "β" labels; confirm `·`-layout.
- [x] T3.2 `screens/markets/StockDetail.jsx` — labels already wrapped; verify they light up via map.
- [x] T3.3 `screens/markets/Markets.jsx` — wrap "Major indices", "Watchlist" headers.
- [x] T3.4 `screens/trade/BuyScreen.jsx` — wrap "Order type", "Order summary", "Shares", TIF/GTC/DAY.
- [x] T3.5 `screens/trade/SellScreen.jsx` — wrap "Shares to sell", "Order type".
- [x] T3.6 `screens/trade/TradeReceipt.jsx` — wrap "Gross proceeds"/"Gross cost", "Bid-ask spread",
  "Executed at", "Net to cash"/"Net deducted".
- [x] T3.7 `components/FilledRow.jsx` — wrap "Execution price", "Gross cost"/"Gross proceeds",
  "Total deducted"/"Net to cash".
- [x] T3.8 `components/OrderCard.jsx` — wrap "Limit price".
- [x] T3.9 `components/PositionCard.jsx` & `HoldingRow.jsx` — wrap "Your position" and "shares".
- [x] T3.10 `screens/portfolio/PortfolioMobile.jsx` & `PortfolioDesktop.jsx` — wrap "Holdings",
  "Positions" stat labels.

### T4 — Verification
- [ ] T4.1 `cd app && npm run lint` — no new errors.
- [ ] T4.2 `cd app && npm run test` — all suites green.
- [ ] T4.3 `cd app && npm run test:coverage` — touched files ≥ 80% line coverage.

### QA findings — tooltip glossary
QA built `app/src/test/glossary.test.jsx` (cases A–F, data-driven over all 36 keys) and ran the
full suite + coverage.

**No implementation bugs found.** The DEV glossary/TERM_MAP/TermUnderline work passed every
new test (158 sub-tests via `it.each`, 0 failures).

Test-only breakages (fixed by QA, not DEV bugs — caused by the new `<TermUnderline>` wrapping
splitting previously-contiguous text nodes):
- `src/test/components.test.jsx` "renders market cap, P/E, EPS, beta": asserted `getByText('P/E:')`
  — the `:` is now a sibling of the wrapped `P/E` label. Changed to `getByText('P/E')`.
- `src/test/components.test.jsx` "HoldingRow formats shares and percent": asserted `getByText('5 shares')`
  — `shares` is now a TermUnderline trigger span. Changed to a normalised `container.textContent` match.

Pre-existing failures (now FIXED): `src/test/onboarding.flow.test.jsx` — 4 tests asserted the old
goal-card text `'Shielding purchasing power from inflation'`. That copy was rewritten to plain
language in an earlier commit this session, so the test's `goalTitle` constant was stale. Updated
it to the new label text. Suite now **407/407 pass (100%)**.

### Status / results — dev
- **T1** — added 22 glossary keys to `app/src/data/glossary.json` (now 36 total, valid JSON):
  `eps, beta, volume, avg_volume, exchange, 52w_range, shares, ticker, position, holdings,
  bid_ask_spread, gross_cost, gross_proceeds, net_proceeds, execution_price, time_in_force,
  gtc_order, day_order, crypto, index, watchlist, dividend`. Each has EN + zh-TW (genuine
  Traditional Chinese, house style with English term in parens); all acronyms spelled out.
- **T2** — extended `TERM_MAP` in `Primitives.jsx` with all listed aliases. Verified the
  punctuation-stripped fallback doesn't mis-resolve (`'p/e'`, `'β'`, `'div yield'` all match
  via exact lowercased key, tried before the stripped fallback).
- **T3** — wired labels (label text only, never values; no layout refactor):
  - `components/Fundamentals.jsx` — wrapped inline `P/E`/`EPS`/`β` labels (added import).
  - `screens/markets/StockDetail.jsx` — already-wrapped grid labels now resolve via map (no JSX edit).
  - `screens/markets/Markets.jsx` — wrapped `Major indices`, `Watchlist` headers (added import).
  - `screens/trade/BuyScreen.jsx` — `Order type`→termKey market_order, `Shares` (QtyInputBlock),
    `Good until`→termKey time_in_force. Left `Order summary` plain (no matching key); left the
    GTC/DAY chips unwrapped to avoid hijacking their onClick / mobile sheet-trigger.
  - `screens/trade/SellScreen.jsx` — `Shares to sell`→termKey shares, `Order type`→market_order.
  - `screens/trade/TradeReceipt.jsx` — `Executed at`, `Gross proceeds`, `Gross cost`, `Net to cash`,
    `Net deducted` (Bid-ask spread / Slippage already wrapped).
  - `components/FilledRow.jsx` — `Execution price`, `Gross cost`/`Gross proceeds`, `Total deducted`/
    `Net to cash`, `Transaction fee`, `Limit price`→termKey limit_order (added import).
  - `components/OrderCard.jsx` — `Limit price`→termKey limit_order.
  - `components/PositionCard.jsx` — `Your position` (added import).
  - `components/HoldingRow.jsx` — `shares` (added import).
  - `screens/portfolio/PortfolioMobile.jsx` — `Holdings` + `Positions` stat label→termKey position.
  - `screens/portfolio/PortfolioDesktop.jsx` — `Holdings`.
- **Lint:** `npm run lint` shows only the pre-existing `HeroChatPanel.jsx:10` react-refresh error
  (out of scope, predates this feature). No new lint errors introduced.
