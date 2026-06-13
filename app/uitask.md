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
- [ ] **1.11 Verify:** temporary `/_ui-preview` route renders all primitives in light + dark;
      confirm tokens match; remove route before Phase 5 (or guard behind dev flag).

---

## Phase 2 — Re-home existing primitives onto `ui/*` (keep exported APIs)

Refactor `src/components/Primitives.jsx` so each atom composes a `ui/*` primitive. **Same export
names & props.**

- [x] **2.1** `CTA`, `GhostCTA` → `ui/button` variants (preserve `label/full/ghost/danger/disabled/loading/onClick`).
- [x] **2.2** `Field` → `ui/input` + `ui/label` + error slot (preserve `label/placeholder/type/value/onChange/filled/error/errorMsg`).
- [x] **2.3** `StatusPill`, `SimPill`, `MktStatus` → `ui/badge`.
- [x] **2.4** `HeroAvatar`, `GuideAvatar` → `ui/avatar`.
- [~] **2.5** `TermUnderline` → `ui/tooltip` (desktop) + `ui/sheet` w/ `ui/tabs` EN/繁中 (mobile),
      driven by `useIsMobile()`; keep glossary `TERM_MAP` lookup.
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

- [ ] **5.1** Remove dead inline-style helpers orphaned by the refactor; remove `App.css` if confirmed unused.
- [ ] **5.2** Grep `style={{` across `src/screens` + `src/components`; each remaining one must be
      justified (dynamic geometry only, e.g. charts) — otherwise convert to `ui/*` or Tailwind.
- [ ] **5.3** Remove/guard `/_ui-preview` route.
- [ ] **5.4** `npm run lint` clean.
- [ ] **5.5** `npm run test:coverage` — aggregate lines ≥ ~90% (per `unittest.md`); 80% gate passes.
- [ ] **5.6** `npm run build` succeeds.
- [ ] **5.7** Visual QA: light + dark, mobile/tablet/desktop zoom tiers; no gradients, radii correct,
      MOMCAKE only on the single hero number per screen, no emoji.

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

## QA Findings — Round 2 (open — to reach the ~90% stretch target)

Gate is cleared (80%); these close the gap from 83.78% → ~90% per `unittest.md`.
- [ ] **R2-1** Re-add `src/test/hooks.test.jsx` — fix the 3 `usePlaceOrder` cases (QUEUED/FILLED/error)
  to match how `supabaseMock.functions.invoke` actually resolves; hooks/* is the next-biggest hole (68.8%).
- [ ] **R2-2** Re-add `src/test/marketCache.test.js` — align the 7 failing cases with the real
  `getCachedQuotes`/`getStoredFundamentals`/`persistQuotes` query-chain + mapping (lib/* at ~70%).
- [ ] **R2-3** (MINOR) `ui.test.jsx` Tabs/ToggleGroup interaction: Radix click-activation doesn't flip
  `aria-selected`/value under jsdom; currently asserts render + default state only. Optional: drive with
  `@testing-library/user-event` + pointer-event shims if true interaction coverage is wanted.
