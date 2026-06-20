# UX Implementation Tasks

Derived from `UXreq.md` (2026-06-20 audit, 19 findings). Tasks are partitioned into two disjoint file-sets (Track A / Track B) so two DEV agents can work in parallel without touching the same files.

Status legend: `[ ]` open · `[x]` done · `[~]` in progress

---

## Track A — Onboarding, Shell, HeroMessage, Markets

### A1 — [x] (P0) Remove emoji `✓` from selected goal chip
- **File:** `src/screens/onboarding/Onboarding.jsx` (~:356)
- Replace the `✓` Unicode glyph with an inline SVG checkmark (ink-900 stroke on light, white on dark). Keep the chip's pill ring.
- **Verify:** no emoji character in JSX; selected chip shows an SVG tick.

### A2 — [x] (P0) Add `italic` to SageHeader
- **File:** `src/screens/onboarding/shell.jsx` (~:70)
- Add `italic` to the SageHeader message `className`.
- **Verify:** all onboarding step messages render italic.

### A3 — [x] (P0) Add `italic` to SageMsg
- **File:** `src/components/HeroMessage.jsx` (~:62)
- Add `italic` to the SageMsg `className`.
- **Verify:** Sage messages on Buy/Sell/Markets render italic.

### A4 — [x] (P1) Rewrite hero-reveal Sage copy to a question/observation
- **File:** `src/screens/onboarding/Onboarding.jsx` (~:395)
- Replace "Look who we got here? [Hero] is here to help you." with an observation/question, e.g. *"Given your answers, {hero} feels like a natural fit — what do you think?"*
- **Verify:** copy contains no directive sentence; ends as question/observation.

### A5 — [x] (P1) GoalCard keyboard accessibility
- **File:** `src/screens/onboarding/Onboarding.jsx` (GoalCard)
- Render each multi-select goal chip as `<button role="checkbox" aria-checked={selected} aria-label={label}>`. Add `focus-visible:ring-2 focus-visible:ring-ame-400`.
- **Verify:** Tab reaches chips; Space toggles; aria-checked reflects state.

### A6 — [x] (P1) Single-choice rows → radio semantics
- **File:** `src/screens/onboarding/Onboarding.jsx` (single-select steps 3–6)
- Wrap each group in `<fieldset><legend class="sr-only">{question}</legend>`; render options as visually-hidden `<input type="radio">` + styled `<label>`. Arrow-key nav for free.
- **Verify:** Tab + arrow keys select options; one selection per group.

### A7 — [x] (P1) BackButton → real `<button>`
- **File:** `src/screens/onboarding/shell.jsx` (~:49–58)
- Change `<div onClick>` to `<button type="button" aria-label="Back">`.
- **Verify:** Tab reaches it; Enter/Space triggers back.

### A8 — [x] (P1) Dedupe Markets search results by symbol
- **File:** `src/screens/markets/Markets.jsx`
- Filter results to unique `symbol` before render.
- **Verify:** searching "AAPL" no longer lists AAPD twice.

### A9 — [x] (P1) Watchlist empty-state focuses search
- **File:** `src/screens/markets/Markets.jsx`
- Make empty-state copy a `<button>` that focuses the search input (ref).
- **Verify:** clicking the empty-state copy focuses search field.

### A10 — [x] (P2) Mobile top bar `bg-white` → `bg-paper`
- **File:** `src/screens/onboarding/shell.jsx` (~:32)
- **Verify:** no seam between top bar and body.

### A11 — [x] (P2) Onboarding progress bar
- **File:** `src/screens/onboarding/shell.jsx`
- Add `<div role="progressbar" aria-valuenow aria-valuemin=1 aria-valuemax=7>` with 7 segments, completed filled `ame-400`.
- **Verify:** progress reflects current step; aria attrs present.

### A12 — [x] (P2) Markets stale-data badge
- **File:** `src/screens/markets/Markets.jsx`
- If quote cache age > 1h, show a `gold` "stale" chip beside the price.
- **Verify:** stale chip appears for outdated cache values.

---

## Track B — BuyScreen, SellScreen, TradeReceipt, Primitives, StockDetail, Portfolio

### B1 — [x] (P0) Remove emoji from TradeReceipt status icon
- **File:** `src/screens/trade/TradeReceipt.jsx` (~:39)
- Replace `⏳`/`✓` with SVG hourglass / checkmark. Keep pill ring container.
- **Verify:** no emoji; SVGs render for queued/filled.

### B2 — [x] (P0) BuyScreen: one MOMCAKE number per screen
- **File:** `src/screens/trade/BuyScreen.jsx` (~:182,195,259)
- Keep `font-display` on the single dominant number (live price). Convert "Buy AAPL" title to `font-sans font-bold`; render qty input in `font-sans`.
- **Verify:** exactly one `font-display` element visible on the buy screen.

### B3 — [x] (P0) SellScreen: one MOMCAKE number per screen
- **File:** `src/screens/trade/SellScreen.jsx` (~:99,178)
- Same as B2 for sell.
- **Verify:** exactly one `font-display` element visible on the sell screen.

### B4 — [x] (P1) Fix "1 shares" pluralisation
- **Files:** `src/screens/trade/BuyScreen.jsx` (~:129,207), `src/screens/trade/SellScreen.jsx` (~:157)
- Use `${qty} ${qty === 1 ? 'share' : 'shares'}` in all three locations (add a small helper if convenient).
- **Verify:** qty=1 renders "1 share".

### B5 — [x] (P1) Desktop tooltip EN/繁中 tabs
- **File:** `src/components/Primitives.jsx` (~:411–424)
- Replicate the mobile `<Tabs>` (EN + preferred language) into the desktop tooltip card. Add `min-w-[220px]`.
- **Verify:** desktop tooltip shows EN/繁中 tabs that switch content.

### B6 — [x] (P1) CTA focus ring
- **File:** `src/components/Primitives.jsx` (~:118)
- Add `focus-visible:ring-2 focus-visible:ring-ame-400 focus-visible:ring-offset-2` to CTA className if not provided by Button primitive.
- **Verify:** visible focus ring on keyboard Tab.

### B7 — [x] (P1) Stock detail chart date format
- **File:** stock detail screen (chart x-axis; find under `src/screens/`)
- Format axis dates `toLocaleDateString('en-US', { month: 'short', year: '2-digit' })` → "Jun '21".
- **Verify:** axis shows month/year, not YYYY/MM/DD.

### B8 — [x] (P2) TradeReceipt colors from tokens.js
- **File:** `src/screens/trade/TradeReceipt.jsx` (~:58,60)
- Replace inline `var(--aqua-600)`/`var(--red)` with `C.aqua600`/`C.red` from `tokens.js`.
- **Verify:** colors render identically; imports from tokens.

### B9 — [x] (P2) Tooltip `aria-describedby` (desktop)
- **File:** `src/components/Primitives.jsx` (~:413–424)
- Add `useId()` id to tooltip span; `aria-describedby` on trigger.
- **Verify:** trigger references tooltip id.

### B10 — [x] (P2) Hero portrait `alt` = full name
- **File:** brand-panel hero cards (onboarding brand panel / wherever hero `<img>` rendered) — **Track B owns the img alt only if outside Onboarding.jsx; if inside Onboarding.jsx defer to Track A.**
- Set `alt={hero.name}`.
- **Verify:** alt is full name, not initials.

### B11 — [x] (P2) Portfolio chart empty-state sub-copy
- **File:** portfolio screen chart placeholder
- Add muted sub-label "Make your first trade to see performance over time".
- **Verify:** sub-copy shows under "Chart unavailable".

### B12 — [x] (P2) `+ Watchlist` feedback state
- **File:** stock detail screen
- Toggle label to a "watching"/"remove" state on click (or shadcn toast).
- **Verify:** visible confirmation after add.

---

## QA-discovered issues (appended during QA)

### Q1 — [x] (P0) BuyScreen desktop renders TWO `font-display` numbers
- PriceCard (`font-display`) + chart-column price echo both visible ≥768px. Fixed: chart-column price → `font-sans`; PriceCard is the sole hero number. (BuyScreen.jsx:195)

### Q2 — [x] (P0) SellScreen desktop renders TWO `font-display` numbers
- Header price + chart-column echo. Fixed: chart-column price → `font-sans`. (SellScreen.jsx:178)

### Q3 — [x] (P1/a11y) Profile nav control is a non-focusable `<div>`
- `Nav.jsx` mobile + desktop. Fixed: `<div onClick>` → `<button type="button" aria-label="Profile">` with focus-visible ring.

### Q4 — [x] (chore) Pre-existing onboarding.flow tests asserted old behavior
- `onboarding.flow.test.jsx` asserted the removed `✓` glyph and the old hero-reveal copy. Reconciled to new behavior (checked-checkbox / "feels like a natural fit" copy).

### Q6 — [x] (P1) TradeReceipt used `font-display` on a status WORD; receipt "1 shares" bug
- Verification pass flagged MOMCAKE on the status label ("Order filled"/"Sold"/"Order queued") — display font is numbers-only. Fixed → `font-sans font-bold`. Also fixed "${qty} shares of" plural via `shares()` on both Bought/Sold rows. (TradeReceipt.jsx:50,60,81)

### Q5 — [x] (infra) Stale-badge `fetchedAt` field
- A12's stale chip needed a `fetchedAt` timestamp not exposed by the quote shape. Added `fetchedAt` in `marketCache.js` (rowToQuote) and `useQuotes.js` (parseQuote).
