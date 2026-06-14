# uitask.md — simFolio UI Refactor to shadcn/ui

Refactor the entire UI to **shadcn/ui + Tailwind** while keeping all framework-agnostic code
(hooks, `lib/`, contexts, Supabase Edge Functions, the test suite). Goal: every UI element is a
**reusable component** consumed across pages — no per-screen inline-style duplication.

**Ground rules (apply to every task):**
- Keep React 19 / Vite / Supabase / React Query / React Router and all 14 hooks untouched.
- `tokens.css` stays the single source of truth for design tokens; Tailwind theme maps to it.
- Preserve QSXC locked rules: MOMCAKE display font (one hero number per screen), **no gradients**
  (sole exception: Master-of-Trading CTA), radii `0 / 4 / 8 / 999px`, exact token colors, dark
  mode via `data-theme="dark"`, no emoji, eyebrow labels 11px uppercase `0.14em`.
- shadcn interaction patterns (Radix dialog/tooltip, focus rings, transitions) are allowed.
- Keep the existing test suite **green after every phase**. Existing component export names &
  props must not change (screens + tests depend on them).
- Commit per phase / per domain; reviewable diffs.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done.

---

## Phase 0 — Tooling & theme foundation

- [x] **0.1** Install deps in `app/`: `tailwindcss postcss autoprefixer tailwind-merge clsx
      class-variance-authority tailwindcss-animate lucide-react` (+ shadcn CLI via `npx shadcn@latest init`).
- [x] **0.2** Create `postcss.config.js` (tailwindcss + autoprefixer).
- [x] **0.3** Create `tailwind.config.js`:
      - `content: ['./index.html','./src/**/*.{js,jsx}']`
      - `darkMode: ['selector','[data-theme="dark"]']`
      - `theme.extend.colors` → map every QSXC var: `ink.{50..900}`, `ame.{50,100,200,400,500,600}`,
        `aqua.{50,400,600}`, `red`, `redBg`, `gold`, `goldBg`, `goldLight`, `queuedBg`,
        `queuedColor`, `paper`, `white` — each as `'var(--…)'`.
      - `fontFamily`: `display`/`sans`/`mono` mirroring `tokens.js`.
      - `borderRadius`: `none:0`, `input:4px`, `card:8px`, `pill:999px`.
      - `plugins: [require('tailwindcss-animate')]`.
- [x] **0.4** Create `components.json` (shadcn config): style=new-york, baseColor=neutral,
      `cssVariables:true`, alias `@/components`, `@/lib/utils`; ensure Vite `@` alias exists
      (add to `vite.config.js` `resolve.alias` if missing).
- [x] **0.5** Add Tailwind directives (`@tailwind base/components/utilities`) to the **top** of
      `src/index.css`, above the existing zoom ladder & base rules. Add shadcn `:root` / dark
      `cssVariables` block that points `--background`, `--foreground`, `--primary`, `--border`,
      `--ring`, etc. at the QSXC tokens (no slate/zinc defaults).
- [x] **0.6** Create `src/lib/utils.js` exporting `cn(...inputs)` = `twMerge(clsx(inputs))`.
- [x] **0.7 Verify:** `npm run dev` (UI visually unchanged), `npm run build` passes, `npm run test` green,
      dark-mode toggle still flips via `data-theme`, `--zoom` ladder intact at all tiers.

---

## Phase 1 — shadcn primitive layer (`src/components/ui/`)

Add each primitive via shadcn CLI, then **re-theme to QSXC** (colors/radii/fonts/focus ring).

- [x] **1.1** `button` — variants `primary` (ink-900 fill, white text), `danger` (red), `ghost`,
      `link`; sizes incl. `cta` (48px tall, 4px radius). Loading + disabled states.
- [x] **1.2** `input`, `label`, `textarea` — 4px radius, ink-100 border, ame-400 focus ring.
- [x] **1.3** `card` — 8px radius, ink-100 border, paper surface (dark-aware).
- [x] **1.4** `badge` — variants for status palette: `pending/queued (gold)`, `filled (aqua)`,
      `cancelled (ink)`, `partial`, `sim (ame)`.
- [x] **1.5** `avatar` — circular, initials fallback, configurable size + token color.
- [x] **1.6** `tabs` — used by Orders, glossary EN/繁中, mobile Portfolio/Ask.
- [x] **1.7** `dialog` — for BadgeEarned + slippage education card.
- [x] **1.8** `sheet` — mobile bottom-sheet (glossary tooltip on mobile).
- [x] **1.9** `tooltip` — desktop glossary tooltip (dotted ame underline trigger).
- [x] **1.10** `select`, `separator`, `progress`, `toggle` + `toggle-group`, `scroll-area`.
- [x] **1.11 Verify:** N/A — temporary `/_ui-preview` route was never needed. Primitives are
      exercised in real context by the migrated screens (Phases 2–4) and rendered by the test suite
      (`primitives.test.jsx` + `ui.test.jsx`). No route to remove.

---

## Phase 2 — Re-home existing primitives onto `ui/*` (keep exported APIs)

Refactor `src/components/Primitives.jsx` so each atom composes a `ui/*` primitive. **Same export
names & props.**

- [x] **2.1** `CTA`, `GhostCTA` → `ui/button` variants (preserve `label/full/ghost/danger/disabled/loading/onClick`).
- [x] **2.2** `Field` → `ui/input` + `ui/label` + error slot (preserve `label/placeholder/type/value/onChange/filled/error/errorMsg`).
- [x] **2.3** `StatusPill`, `SimPill`, `MktStatus` → `ui/badge`.
- [x] **2.4** `HeroAvatar`, `GuideAvatar` → `ui/avatar`.
- [x] **2.5** `TermUnderline` → `ui/tooltip` (desktop, active lang) + `ui/sheet` bottom w/ `ui/tabs`
      EN/繁中 (mobile, both langs), branched on `useIsMobile()`; keeps glossary `TERM_MAP` lookup +
      plain-underline fallback. Mobile path covered by new `primitives.test.jsx` case.
- [x] **2.6** `LangToggle`, `ThemeToggle` → `ui/toggle-group` (keep context wiring).
- [x] **2.7** `Eyebrow`, `Divider`, `ProgressDots`, `GoalCard`, `ReceiptRow`, `Logo`, `Mark`,
      `SocialBtn` → Tailwind classes via `cn()` (keep APIs).
- [x] **2.8 Verify:** `primitives.test.jsx`, `charts.test.jsx` green (adjust only brittle selectors).

---

## Phase 3 — Extract per-screen inline UI into reusable shared components

Move every one-off inline block into `src/components/`, built on `ui/*`, then consume across screens.

- [x] **3.1** `OrderCard`, `FilledRow`, `EmptyState` ← `OrdersMobile.jsx`.
- [x] **3.2** `Fundamentals`, `WatchRow`, `SearchResultRow`, `WatchlistButton` ← `Markets.jsx` / `StockDetail.jsx`.
- [x] **3.3** `PositionCard`, `SellButton` ← `StockDetail.jsx`.
- [x] **3.4** `PriceCard` / order-receipt block ← `BuyScreen.jsx` / `SellScreen.jsx` / `TradeReceipt.jsx`.
- [x] **3.5** `HeroChatPanel` (message list + composer) ← `PortfolioDesktop.jsx` / `AskTab.jsx`,
      reusing `HeroMessage`/`UserMessage`/`SageMsg` inside `ui/scroll-area` + `ui/card`.
- [x] **3.6** Recompose `AppShell.jsx` and `Nav.jsx` (`TopNav`/`BottomNav`/`PageHeader`/`BackHeader`) on `ui/*`.
- [x] **3.7** Recompose `StockRow.jsx`, `HoldingRow.jsx`, `Badges.jsx`, `HeroMessage.jsx`, `BrandPanel.jsx`, `QSWordmark.jsx`.
      DONE: StockRow, HoldingRow, HeroMessage, BrandPanel. `QSWordmark` AND `Badges.jsx` left inline —
      both are pure dynamic SVG geometry (justified exception, same class as Charts; QA2 R1 confirmed not a defect).
- [x] **3.8 Verify:** `orders.test.jsx`, `trade.test.jsx`, `misc.test.jsx`, `screens.smoke.test.jsx` green (114 tests pass on merged `main` 47ace9d).

---

## Phase 4 — Migrate screens domain-by-domain (commit + suite green per domain)

- [x] **4.1** `auth/` — `WelcomeMobile`, `WelcomeDesktop`, `SignUp`, `SignIn`, `ReturningUser` (Dev B).
- [x] **4.2** `onboarding/Onboarding.jsx` (Dev B).
- [x] **4.3** `portfolio/` (`PortfolioDesktop`, `PortfolioMobile`, `AskTab`) + `markets/`
      (`Markets`, `StockDetail`) (Dev A).
- [x] **4.4** `trade/` (`BuyScreen`, `SellScreen`, `TradeReceipt`, `HeroHandoff`) (Dev A).
- [x] **4.5** `orders/OrdersMobile`, `achievements/` (`AchievementsMobile`, `BadgeEarned`→`ui/dialog`),
      `profile/Profile` (Dev B).

---

## Phase 5 — Cleanup & consistency pass

- [x] **5.1** No orphaned helpers found; `App.css` does not exist (nothing to remove).
- [x] **5.2** `style={{}}` audit complete — see ledger below. Converted the two genuinely-static
      remnants (`Divider`, `SimPill` dot) to Tailwind; all other occurrences are justified dynamic
      values (token colors that vary by state, size/index-derived geometry, or SVG geometry).
- [x] **5.3** N/A — no `/_ui-preview` route exists (see 1.11).
- [x] **5.4** `npm run lint` clean.
- [x] **5.5** `npm run test:coverage` = **173 tests pass, 84.65% lines — 80% gate cleared (exit 0)**.
      (~90% remains the optional Round 3 stretch, blocked on the supabase-mock test-infra change.)
- [x] **5.6** `npm run build` succeeds (1991 modules, ✓ built; only the pre-existing >500 kB chunk-size advisory).
- [~] **5.7** Visual QA: automated guarantees hold (radii via tokens, no gradients except MoT CTA,
      no emoji, tests green light+dark). Manual eyeball across zoom tiers still recommended by the user.

### 5.2 `style={{}}` ledger (all remaining occurrences justified)
- **Charts.jsx / Badges.jsx / QSWordmark.jsx / progress.jsx** — dynamic SVG/geometry (widths, paths,
  computed dimensions). Documented justified exception (QA2 R1).
- **Onboarding.jsx** — `fluid(min,max)` responsive font sizes, dynamic `paddingLeft`, per-hero `background`.
- **Per-hero color blocks** (`BrandPanel`, `AskTab`, `PortfolioDesktop`, `WelcomeMobile`) — `h.color`
  tint/border/text + index-derived `marginLeft`/`zIndex`.
- **Progress bars** (`Profile`, `AchievementsMobile`) — computed `width` percentage.
- **`AppShell`** — dynamic `maxWidth` prop. **`BadgeEarned`** — dynamic `eyebrowColor`.
- **Primitives.jsx atoms** — `StatusBar` (decorative iOS status-bar mock geometry), and state/size/prop-
  driven token colors + dimensions in `Logo`/`Mark`/`Field`/`HeroAvatar`/`GuideAvatar`/`ProgressDots`/
  `GoalCard`/`MktStatus`/`StatusPill`/`ReceiptRow`/`Eyebrow`/`SocialBtn`.

---

## Files touched

**New:** `tailwind.config.js`, `postcss.config.js`, `components.json`, `src/lib/utils.js`,
`src/components/ui/*`, the extracted shared components in Phase 3, `uitask.md`, `unittest.md`.
**Modified:** `package.json`, `src/index.css`, `vite.config.js` (only `resolve.alias` if needed —
**not** the coverage gate), `src/components/*`, `src/screens/**/*`, `src/test/*`.
**Untouched:** `tokens.js`, `tokens.css`, `src/hooks/*`, `src/context/*`, `src/data/*`,
`supabase/functions/*`.

---

## QA Findings — Round 1 (merged `main` @ 707ccfe)

Sources: `qa-round1-automated.md` (QA1), `qa-round1-design.md` (QA2).
Baseline: 114/114 tests pass, build + lint clean. Two fix workstreams (assigned to 2 dev agents, disjoint files):

### Workstream T (TESTS) — clears the coverage gate, targets ~90%  → owner: Fix Agent T (new test files only)
- [ ] **T1 BLOCKER** `npm run test:coverage` = **78.88% lines < 80% gate**. Add the missing suites from `unittest.md` §B:
  - `src/test/ui.test.jsx` — `components/ui/*` is 49.6% (7 primitives at 0%). Highest-leverage.
  - `src/test/hooks.test.jsx` — `hooks/*` at 68.8% (useBreakpoint, useWatchlist, useOrders, usePlaceOrder, useAchievements, useHeroSelections, useSymbolSearch).
  - `src/test/context.test.jsx` — Auth/Theme/Language providers.
  - `src/test/fees.test.js`, `src/test/marketCache.test.js` — `lib/*` at 70.8%.
  - Acceptance: `npm run test:coverage` exits 0, lines ≥ 90% (gate 80% comfortably cleared), all tests green.

### Workstream D (DESIGN) — locked-rule fixes  → owner: Fix Agent D (source + onboarding.flow.test.jsx)
- [ ] **D1 (M1) off-spec radii** → only `0/4/8/999` allowed. Fix: 6px in `Primitives.jsx:~289` (GoalCard);
  3px progress bars in `Profile.jsx`, `AchievementsMobile.jsx`; 3px chips in `SearchResultRow.jsx`, `WatchRow.jsx`;
  `rounded-sm`(2px) in `ReturningUser.jsx:41`; 3px ProgressDots; 2px corner in `HeroMessage.jsx` user bubble. Snap each to nearest allowed token.
- [ ] **D2 (M2) eyebrow letter-spacing drift** → locked = `0.14em`. Replace ad-hoc 0.10/0.12/0.16em uppercase labels
  in `BadgeEarned.jsx`, `HeroMessage.jsx`, `Onboarding.jsx`, `BuyScreen.jsx`, `SellScreen.jsx`, `TradeReceipt.jsx`,
  `PortfolioMobile.jsx` (prefer reusing the canonical `<Eyebrow>` where applicable).
- [ ] **D3 (N1)** `onboarding.flow.test.jsx:26` selects `div[style*="border-radius: 6px"]` — passes only because of the D1
  6px violation. Re-anchor to a stable role/text/test-id (no style/class assertion) when fixing D1.

### Deferred — needs user decision (not assigned)
- **N2** MOMCAKE display font appears **twice** on Buy/Sell screens (price + qty). CLAUDE.md locks "one number per
  screen". QA2 notes it matches pre-refactor intent. → awaiting user confirmation before changing.

### Resolved / non-issues
- **Badges.jsx** "not recomposed" — reclassified as justified dynamic-SVG exception (QA2). Task 3.7 marked done.
- **N2** (MOMCAKE twice on Buy/Sell) — user decision: **leave as-is** (pre-existing intent, out of scope). WONTFIX.

### Round 1 outcome (merged `main` @ 47f4be8)
- D1 + D2 + D3 (radii, eyebrow tracking, test re-anchor) — **DONE** (Fix D, merged `d51bcc3`).
- T1 coverage — **PARTIAL**: added `context.test.jsx`, `fees.test.js`, `ui.test.jsx`.
  **148/148 tests pass; line coverage 83.78% → 80% gate CLEARED.** Build + lint clean.
- Fix Agent T hit a session limit mid-run; its `hooks.test.jsx` and `marketCache.test.js` were
  written but **not verified and were failing** (wrong supabase-mock assumptions) → **quarantined** (removed), see Round 2.

---

## QA Findings — Round 2 (DONE — merged `main` @ 3a5386e)

- [x] **R2-1** `src/test/hooks.test.jsx` re-added (15 tests). usePlaceOrder now 100% (all 4 branches:
  null-session no-op incl. `?? 0` fallback, FILLED, QUEUED, transport + data.error); useOrders/usePortfolio 100%;
  useWatchlist/useBreakpoint/useSymbolSearch/useAchievements/useHeroSelections exercised.
- [x] **R2-2** `src/test/marketCache.test.js` re-added (9 tests), all green — covers arg guards, build-query
  finite-vs-`Infinity` maxAgeMs paths, full `quoteToRow` + omit-zero-fundamentals via persistQuotes.
- **Result: 172/172 tests pass; line coverage 84.6%; 80% gate cleared (exit 0). Build + lint clean.**

### Why 90% was not reached (documented blocker)
- **Test-infra aliasing:** `vite.config.js` `test.alias` rewrites the `./supabase` specifier, so `marketCache.js`
  binds a SECOND, state-isolated instance of `supabaseMock` — data seeded via `__setTableData` is invisible to it,
  and `vi.mock` can't intercept (alias rewrites before the mock registry). This makes the `rowToQuote` mapping
  (~marketCache.js:5-29) and `getStoredFundamentals` row loop (~67-75) — ~14 lines — UNREACHABLE in unit isolation.
  Fixing requires editing `vite.config.js` / `supabaseMock.js` (was out of scope for the agents).
- **Untested hooks outside Round-1/2 scope:** `useQuotes.js` (~52%), `useHeroChat.js` (~60%),
  `useMarketDataPreload.js`, `usePortfolioCandles.js`, `useQueuedExecution.js`, `useStockDetail.js`.

### Round 3 (only if 90% is required) — needs test-infra change
- [ ] **R3-1** Refactor the supabase mock so a single shared instance backs both direct imports and `marketCache.js`
  (adjust `test.alias`/`supabaseMock` to share one table-map) → unlocks the ~14 marketCache mapping lines.
- [ ] **R3-2** Add hook tests for `useQuotes`, `useHeroChat`, `useStockDetail`, `usePortfolioCandles`,
  `useQueuedExecution`, `useMarketDataPreload` — the remaining large gaps to clear ~90%.

### Minor (deferred, non-blocking)
- `ui.test.jsx` Tabs/ToggleGroup assert render + default state only (Radix click-activation doesn't flip
  `aria-selected`/value under jsdom). Optional: drive with `user-event` + pointer-event shims for true interaction coverage.
