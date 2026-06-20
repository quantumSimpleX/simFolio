# UX Test Plan

Verifies the fixes in `UXtask.md`. Target: **85%+ line coverage** on changed components, run via `npm run test:coverage` from `app/`. Tests use Vitest + Testing Library and live under `app/src/test/`.

Status legend: `[ ]` not run · `[x]` pass · `[!]` fail (see notes)

Pass rate is computed over individual test cases below.

---

## Suite 1 — No-emoji / design-system rules (`src/test/ux-ds.test.jsx`)

- T1.1 — [x] Selected goal chip renders an `<svg>` and contains no emoji character (A1)
- T1.2 — [x] TradeReceipt queued/filled status renders `<svg>`, no `⏳`/`✓` text (B1)
- T1.3 — [x] SageHeader message element has `italic` class (A2)
- T1.4 — [x] SageMsg message element has `italic` class (A3)
- T1.5 — [x] BuyScreen renders exactly one element with `font-display` class (B2)
- T1.6 — [x] SellScreen renders exactly one element with `font-display` class (B3)
- T1.7 — [x] Hero portrait `<img>` has `alt` equal to full hero name (B10)

## Suite 2 — Content / copy (`src/test/ux-content.test.jsx`)

- T2.1 — [x] qty=1 in Buy order summary renders "1 share" (not "1 shares") (B4)
- T2.2 — [x] qty=2 renders "2 shares" (B4)
- T2.3 — [x] qty=1 in Sell flow renders "1 share" (B4)
- T2.4 — [x] Hero-reveal Sage copy contains no directive; ends with `?` or is observation (A4)
- T2.5 — [x] Stock chart axis formatter returns "Jun '21"-style label, not "2021/06/30" (B7)

## Suite 3 — Accessibility (`src/test/ux-a11y.test.jsx`)

- T3.1 — [x] Goal chips have `role="checkbox"` and toggle `aria-checked` on Space (A5)
- T3.2 — [x] Goal chips reachable via Tab (are `<button>`/focusable) (A5)
- T3.3 — [x] Single-select steps render `<input type="radio">` within a `<fieldset>` (A6)
- T3.4 — [x] Back control is a `<button>` with `aria-label="Back"` (A7)
- T3.5 — [x] CTA has `focus-visible:ring` classes / shows focus ring (B6)
- T3.6 — [x] Desktop tooltip trigger has `aria-describedby` matching tooltip id (B9)
- T3.7 — [x] Onboarding progressbar has `role="progressbar"` with correct aria-valuenow/min/max (A11)
- T3.8 — [x] Profile nav control is a `<button>` with accessible name "Profile" (audit P2)

## Suite 4 — Behavior (`src/test/ux-behavior.test.jsx`)

- T4.1 — [x] Markets search dedupes duplicate symbols (A8)
- T4.2 — [x] Watchlist empty-state is a button that focuses the search input (A9)
- T4.3 — [x] Desktop tooltip renders EN + 繁中 tabs and switching changes content (B5)
- T4.4 — [x] `+ Watchlist` click changes label/shows confirmation (B12)
- T4.5 — [x] Stale quote (>1h cache) shows gold stale chip on Markets (A12)
- T4.6 — [x] Portfolio empty chart shows "first trade" sub-copy (B11)

## Suite 5 — Token / theming (`src/test/ux-tokens.test.jsx`)

- T5.1 — [x] TradeReceipt imports colors from `tokens.js` (no inline `var(--...)` for status colors) (B8)
- T5.2 — [x] Onboarding mobile top bar uses `bg-paper` not `bg-white` (A10)

---

## Coverage gate
- T-COV — [x] `npm run test:coverage` passes the 80%+ line gate; changed UX components ≥ 85%.

## Run log
<!-- QA appends per-run results and failures here -->

### Run log — 2026-06-20
- Full suite: **676 passed / 676** (0 failed, 0 skipped) → **100% pass rate** (> 95% gate met).
- New UX suites (ux-ds/content/a11y/behavior/tokens): all active cases pass; previously-skipped T1.5b, T1.6b, T3.8 un-skipped after app bugs fixed.
- Coverage: **85.64% lines** (gate 80%/target 85% met).
- App bugs found during QA and fixed: B2/B3 desktop double `font-display` (PriceCard + chart echo); Profile nav `<div>`→`<button aria-label="Profile">`. Stale pre-existing onboarding.flow assertions reconciled to new behavior (SVG tick, new hero-reveal copy).

### Verification convergence — 2026-06-20
- Re-ran ux-playwright-auditor verification pass: **10/10 fix areas PASS**, no dark-mode regressions.
- One new P1 found (TradeReceipt MOMCAKE on a status word + "1 shares" receipt plural) → fixed + regression-tested (T1.2 extended).
- Final: **676/676 tests pass (100%)**, lines coverage **85.64%**, lint + build clean. Loop converged — no remaining UI/UX issues.
