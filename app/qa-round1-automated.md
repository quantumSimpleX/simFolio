# QA Round 1 — Automated Verification (shadcn/ui refactor)

Repo: `C:\Users\drmwu\Downloads\_CLAUDE-GIT\simFolio` · App: `app/` · Run date: 2026-06-13
Commands run from `app/`. QA was read-only on all source/test/config.

## Raw results

| Command | Result |
|---|---|
| `npm run test` | PASS — 12 files, **114/114 tests passing** |
| `npm run test:coverage` | **FAIL gate** — lines **78.88%** (1158/1468), below the enforced 80% threshold. Stmts 74.37%, Branch 69.79%, Funcs 69.48% |
| `npm run build` | PASS (only the pre-existing >500 kB chunk advisory — ignored per instructions) |
| `npm run lint` | PASS — clean, no errors |
| Brittle-selector / console scan | CLEAN — no test asserts inline styles or class names; no console.error / React warnings during the run |

Net: suite is green, build + lint clean, **but the coverage gate is now failing** — the suite no longer passes end-to-end because `npm run test:coverage` exits non-zero.

---

## Issues (prioritized)

### BLOCKER

**B-1 — Coverage gate fails: lines 78.88% < 80% enforced threshold**
- File(s): aggregate; gate in `vite.config.js`. Suite-level command `npm run test:coverage` exits with
  `ERROR: Coverage for lines (78.88%) does not meet global threshold (80%)`.
- What's wrong: Phases 0–4 added components but did not add the planned new test suites (B1–B7 in
  `unittest.md`). The largest coverage holes are untested `components/ui/*` primitives and `hooks/*`.
  Target is ~90% lines; currently 78.88%, i.e. below even the 80% gate.
- Concrete fix: add the missing suites listed in the Coverage-Gap section below. Closing `components/ui/*`
  + `hooks/*` + `lib/*` alone lifts lines well past 80% (those three dirs are 49.6% / 68.8% / 70.8%).

### MAJOR

**M-1 — `components/ui/*` is the single biggest gap (49.63% lines)**
- File(s): `src/components/ui/`. Fully untested (0%): `progress.jsx`, `scroll-area.jsx`, `select.jsx`,
  `separator.jsx`, `sheet.jsx`, `tabs.jsx`, `textarea.jsx`. Partial: `card.jsx` (72%), `dialog.jsx` (77%),
  `avatar.jsx` (89%), `toggle.jsx` (75%).
- What's wrong: the new shadcn primitive layer (the core of this refactor) has no direct test suite.
- Fix: add `ui.test.jsx` per `unittest.md` §B1.

**M-2 — `hooks/*` largely uncovered (68.83% lines)**
- File(s): worst offenders — `usePortfolioCandles.js` (40%), `useQuotes.js` (52.05%),
  `useSymbolSearch.js` (53.84%), `useHeroChat.js` (60%), `useMarketDataPreload.js` (70.58%),
  `useQueuedExecution.js` (70%), `useStockDetail.js` (80.59%).
- Fix: add `hooks.test.jsx` per §B5 (useBreakpoint/useIsMobile, useWatchlist, useOrders, usePlaceOrder
  incl. session-null no-op branch, useAchievements, useHeroSelections, useSymbolSearch).

**M-3 — `lib/marketCache.js` at 69.56% lines; `lib/fees.js` has no dedicated suite**
- File(s): `src/lib/marketCache.js`, `src/lib/fees.js`.
- Fix: add `marketCache.test.js` (§B7 — write/read round-trip, 5h TTL expiry, fundamentals persistence)
  and `fees.test.js` (§B6 — fee math across amounts, rounding, zero/edge). Note: `lib/fees.js` does
  exist; fee logic is currently only touched indirectly via `marketHours.test.js`.

**M-4 — Contexts under target (85.71% lines aggregate; AuthContext 81.08%)**
- File(s): `src/context/AuthContext.jsx` (branches only 36.36%), `ThemeContext.jsx`, `LanguageContext.jsx`.
- Fix: add `context.test.jsx` per §B4 (signIn/signUp/signOut + error path; theme toggle; lang default/switch).

### MINOR

**Mn-1 — `Badges.jsx` recompose gap (uitask 3.7) is NOT a coverage problem**
- File: `src/components/Badges.jsx`. Coverage is already 100% lines (via `components.test.jsx`).
- What's wrong: per `uitask.md` 3.7 it was never recomposed onto `ui/`/Tailwind (still inline) — this is a
  refactor-completeness gap, not a test gap. Confirm whether QA scope requires the recompose; it does not
  affect the suite or the gate.

**Mn-2 — Screen-level holes (not blocking the 80% gate, below the 90% target)**
- `screens/markets/StockDetail.jsx` 64.86%, `Markets.jsx` 72.41%; `screens/portfolio/AskTab.jsx` 58.82%,
  `PortfolioDesktop.jsx` 70.73%; `trade/HeroHandoff.jsx` 50%; `auth/WelcomeMobile.jsx` 60%;
  `achievements/BadgeEarned.jsx` 70%. These pull the aggregate down from the ~90% target but are
  smoke-tested. Address after B1–B7 if chasing the 90% working target.

---

## Coverage-gap section — test files to ADD (per unittest.md §B)

Present (12): execution, heroes, marketHours, charts, primitives, screens.smoke, trade, orders,
auth.screens, onboarding.flow, misc, **components** (the §B3 suite — already added).

MISSING — add these to close the gap:

| Suite | unittest.md ref | Targets |
|---|---|---|
| `ui.test.jsx` | §B1 | `components/ui/*` — button/input/label/textarea, badge, avatar, tabs, dialog, sheet, tooltip, select, toggle-group. **Highest ROI (dir at 49.6%).** |
| `hooks.test.jsx` | §B5 | useBreakpoint/useIsMobile, useWatchlist, useOrders, usePlaceOrder (incl. session-null no-op), useAchievements, useHeroSelections, useSymbolSearch. |
| `context.test.jsx` | §B4 | AuthContext (signIn/up/out + error), ThemeContext toggle, LanguageContext default/switch. |
| `marketCache.test.js` | §B7 | write/read round-trip, 5h TTL expiry, fundamentals persistence. |
| `fees.test.js` | §B6 | `lib/fees.js` fee math, rounding, zero/edge amounts. |

Plus the §B2 `primitives.test.jsx` extensions (TermUnderline desktop tooltip + mobile sheet/tabs EN/繁中;
LangToggle context update; ThemeToggle data-theme persist) — note `TermUnderline` is still `[~]` in
uitask 2.5, so verify the component is finished before/while extending its tests.

Add suites in priority order ui → hooks → context → marketCache → fees; ui + hooks alone should clear the
80% gate, and the full set targets ~90%.

---

## VERDICT

**FAIL — 1 blocker (coverage gate 78.88% < 80%).** Tests 114/114 green, build + lint clean, no brittle
selectors or console warnings; the only failing condition is the coverage threshold, fixable by adding the
5 missing suites above.
