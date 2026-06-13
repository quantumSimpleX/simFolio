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

- [ ] **3.1** `OrderCard`, `FilledRow`, `EmptyState` ← `OrdersMobile.jsx`.
- [ ] **3.2** `Fundamentals`, `WatchRow`, `SearchResultRow`, `WatchlistButton` ← `Markets.jsx` / `StockDetail.jsx`.
- [ ] **3.3** `PositionCard`, `SellButton` ← `StockDetail.jsx`.
- [ ] **3.4** `PriceCard` / order-receipt block ← `BuyScreen.jsx` / `SellScreen.jsx` / `TradeReceipt.jsx`.
- [ ] **3.5** `HeroChatPanel` (message list + composer) ← `PortfolioDesktop.jsx` / `AskTab.jsx`,
      reusing `HeroMessage`/`UserMessage`/`SageMsg` inside `ui/scroll-area` + `ui/card`.
- [ ] **3.6** Recompose `AppShell.jsx` and `Nav.jsx` (`TopNav`/`BottomNav`/`PageHeader`/`BackHeader`) on `ui/*`.
- [ ] **3.7** Recompose `StockRow.jsx`, `HoldingRow.jsx`, `Badges.jsx`, `HeroMessage.jsx`, `BrandPanel.jsx`, `QSWordmark.jsx`.
- [ ] **3.8 Verify:** `orders.test.jsx`, `trade.test.jsx`, `misc.test.jsx`, `screens.smoke.test.jsx` green.

---

## Phase 4 — Migrate screens domain-by-domain (commit + suite green per domain)

- [ ] **4.1** `auth/` — `WelcomeMobile`, `WelcomeDesktop`, `SignUp`, `SignIn`, `ReturningUser` →
      verify `auth.screens.test.jsx` + smoke.
- [ ] **4.2** `onboarding/Onboarding.jsx` → verify `onboarding.flow.test.jsx` + smoke.
- [ ] **4.3** `portfolio/` (`PortfolioDesktop`, `PortfolioMobile`, `AskTab`) + `markets/`
      (`Markets`, `StockDetail`) → verify smoke.
- [ ] **4.4** `trade/` (`BuyScreen`, `SellScreen`, `TradeReceipt`, `HeroHandoff`) → verify `trade.test.jsx` + smoke.
- [ ] **4.5** `orders/OrdersMobile`, `achievements/` (`AchievementsMobile`, `BadgeEarned`→`ui/dialog`),
      `profile/Profile` → verify `orders.test.jsx` + smoke.

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
