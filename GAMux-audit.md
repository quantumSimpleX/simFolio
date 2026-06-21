# GAMux Audit — 2026-06-21 — Gamification + Full App UX Review

**App:** http://localhost:5174/ (dev build, auth bypassed)
**Breakpoints tested:** mobile 390×844, desktop 1280×800
**Scope:** `/achievements`, `/badge-earned`, `/onboarding`, `/portfolio`, `/markets`, `/stock/AAPL`, `/buy/AAPL`, `/sell/AAPL`, `/receipt`, `/orders`, `/profile`

---

## Screens inspected

| Screen | Breakpoints | Screenshot |
|---|---|---|
| `/achievements` | mobile + desktop | `ux-audit/achievements-desktop.png`, `ux-audit/achievements-mobile.png` |
| `/badge-earned` | mobile + desktop | `ux-audit/badge-earned-desktop.png`, `ux-audit/badge-earned-mobile.png` |
| `/onboarding` | desktop | `ux-audit/onboarding-desktop.png` |
| `/portfolio` | desktop | `ux-audit/portfolio-desktop.png` |
| `/markets` | desktop | `ux-audit/markets-desktop.png` |
| `/stock/AAPL` | desktop | `ux-audit/stock-detail-desktop.png` |
| `/buy/AAPL` | desktop | `ux-audit/buy-desktop.png` |
| `/receipt` | desktop | `ux-audit/receipt-desktop.png` |
| `/orders` | desktop | `ux-audit/orders-desktop.png` |
| `/profile` | desktop | `ux-audit/profile-desktop.png` |

---

## GAMIFICATION FINDINGS (Priority Order)

---

### **[P0] `/achievements` — Entire page is keyboard-inaccessible**

The tab sequence on `/achievements` contains exactly **3 focusable elements**: the language toggle, the dark-mode toggle, and the profile button. All 15 badge cards and all 3 navigation links (Portfolio / Markets / Orders) are plain `<div>` elements — no `tabindex`, no `role`, no `<a>` or `<button>` wrapper. A keyboard-only user cannot navigate to any badge, cannot read any badge detail, and cannot leave the page via nav.

**Fix:** Wrap each nav item in `<a href="...">` (or `<button>` + `onClick` with router). Wrap each badge card in a `<button>` (or make it a `<div role="button" tabindex="0">`) so it's reachable by Tab and activatable with Enter/Space. This is a WCAG 2.1.1 (Keyboard) failure — all functionality must be keyboard operable. (ref: `ux-audit/achievements-desktop.png`)

---

### **[P0] `/achievements` — Badge description text fails WCAG AA contrast (2.16:1)**

The badge description lines (e.g., "Make your first simulated trade") render at `rgb(166,173,183)` — approximately `#A6ADB7` — on the `paper` background `#FAFAF7`. Measured contrast ratio: **2.16:1**. WCAG AA requires 4.5:1 for normal text. At 10px/12px this text is far below threshold.

The badge *title* text (`#7E8794` / ink-400) measures **3.47:1** — also below AA for body text (passes AA only for large text ≥18pt/14pt bold, which these are not).

**Fix:** Darken badge description text to at minimum ink-700 (~`#3A4049`) for 4.5:1. Badge title text should move to ink-600 (~`#5A6573`) or darker. (ref: `ux-audit/achievements-desktop.png`)

---

### **[P0] `/achievements` — "0 badges" counter uses MOMCAKE — DS violation**

The badge count label `"0 badges"` is rendered in **MOMCAKE Bold at 28px**. The design system specifies MOMCAKE for exactly **one number per screen** (portfolio value, stock price). This is a label + number compound that uses the display face where Barlow Condensed is required. Additionally, "simFolio" in the nav wordmark also uses MOMCAKE — that accounts for the one allowed MOMCAKE instance per page, making this a double violation.

**Fix:** Render the badge count section using Barlow Condensed. Reserve MOMCAKE for the single most prominent number on the screen (if a key stat is added to achievements, that can be the MOMCAKE element). (ref: `ux-audit/achievements-desktop.png`)

---

### **[P0] `/achievements` — All 19 SVG badge/medal/trophy icons have no accessible name**

Every SVG icon on `/achievements` either has no `aria-label`, no `<title>` element, and no `aria-hidden="true"`. Icons that are purely decorative should have `aria-hidden="true"`. Icons that convey meaning (locked vs earned states, medal/trophy counts) need either `aria-label` on the SVG or an adjacent visually-hidden text label.

**Fix:** Add `aria-hidden="true"` to purely decorative badge SVGs and ensure the adjacent text label (`First Trade`, `Diversified`, etc.) is the accessible name for the card. If the icon state (locked/earned) is visually conveyed but not in adjacent text, add a visually-hidden span: e.g., `<span class="sr-only">Locked</span>`. WCAG 1.1.1 (Non-text Content). (ref: `ux-audit/achievements-desktop.png`)

---

### **[P0] `/achievements` — No progress bar has `role="progressbar"` or ARIA values**

The "0 of 10 badges toward next medal" progress indicator has no `role="progressbar"`, no `aria-valuenow`, `aria-valuemin`, or `aria-valuemax`. Screen reader users receive no feedback on progress state.

**Fix:** Add `role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="10" aria-label="Progress toward first medal"` to the progress track element. WCAG 4.1.2 (Name, Role, Value). (ref: `ux-audit/achievements-desktop.png`)

---

### **[P0] `/achievements` — No heading structure on any app screen**

Zero `<h1>`–`<h6>` elements exist on `/achievements`, `/portfolio`, `/markets`, `/stock/AAPL`, `/buy/AAPL`, `/receipt`, or `/orders`. The "Achievements" page title, badge section header "Badges · 0 earned of 15", and individual badge names are all plain `<div>` elements. Screen readers cannot generate a document outline or jump between sections.

**Fix:** Make the page title ("Achievements") an `<h1>`. Make the "Badges · 0 earned of 15" section label an `<h2>`. Repeat this pattern across all pages: page title → `<h1>`, major sections → `<h2>`. This is a WCAG 1.3.1 (Info and Relationships) failure across the entire app. (ref: all screenshots)

---

### **[P0] `/achievements` — No `<nav>` landmark; nav links are non-interactive `<div>`s**

The top navigation (Portfolio / Markets / Orders) uses plain `<div>` elements with `cursor: pointer` styling. There is no `<nav>` element or `role="navigation"` on any page. This means screen reader landmark navigation (`R` / `F6` in JAWS/NVDA) cannot reach the app navigation, and the links cannot be activated without a pointer device.

**Fix:** Wrap the nav bar in `<nav aria-label="Main navigation">` and convert each nav item from `<div>` to `<a href="...">`. WCAG 1.3.6 / 2.1.1 / 4.1.2. (ref: all screenshots)

---

### **[P1] `/badge-earned` — CTA button color is inverted for a dark-screen context**

The "Continue →" button renders with `background: white, color: ink-900` — which is the correct *light-background* primary CTA spec. But `/badge-earned` is a full-screen ink-900 surface. The button is functional and meets contrast, but its visual weight is wrong: white fills the entire button width on a black screen, creating an overly heavy secondary-looking block rather than a deliberate high-contrast primary action. The design spec notes the badge reveal is "deliberate and earned" — the CTA should read as a confident exit, not a modal dismiss.

**Fix:** Use an ink-900-border / white-text *outlined* button or an ame-400 fill button for this dark-screen context, matching the tonal system used elsewhere (e.g., the ame-400 glow ring around the progress indicator). Keep 48px height and 4px radius. (ref: `ux-audit/badge-earned-desktop.png`)

---

### **[P1] `/badge-earned` — Hero quote is not attributed with a semantic role; avatar is initials-only**

The "WB" hero avatar is 9px Barlow Condensed text in an ame-400 circle — at 9px this is below the 11px minimum for any legible label and fails AA contrast (ame-400 `#8A60EB` on ink-900 `#0A0E14` = approximately 4.6:1 — passes AA but barely). The initials provide no meaningful context for a user who hasn't unlocked the hero yet.

**Fix:** Increase avatar label to 11px minimum. Add `aria-label="Warren Buffett"` (or whichever hero) to the avatar element so screen readers announce the speaker. Consider showing the hero's short name beside the avatar at small sizes. (ref: `ux-audit/badge-earned-desktop.png`)

---

### **[P1] `/achievements` — Locked vs earned badge states have no programmatic distinction**

All 15 badges render with the same visual treatment (muted ink-400 title, ink-300 description, greyed SVG). There is no "earned" state shown (all are locked in the fresh state, which is expected), but the locked/earned states carry no `aria-disabled`, no `data-state`, and no visually distinct badge container style beyond icon opacity. When badges are earned, the distinction will be purely visual with no semantic signal.

**Fix:** Add `data-state="locked"` / `data-state="earned"` to each badge card container, and either use CSS `[data-state="locked"] { opacity: 0.45 }` for the locked appearance, or a visually distinct "earned" border/fill. For locked badges, add `aria-label="[Badge name] — locked"` to the card; for earned, include the earned date in a visually-hidden span. (ref: `ux-audit/achievements-desktop.png`)

---

### **[P1] `/achievements` — Medal and trophy counts render at 10px — fails AA**

"0 medals" and "0 trophies" are rendered at 10px in ink-400 (`#7E8794`) on paper. At 10px these are below the minimum 11px eyebrow size the design system mandates, and they fail AA (3.47:1, needs 4.5:1 for this text size). Combined with the low contrast, these are practically invisible.

**Fix:** Set to 11px minimum (matching eyebrow spec) and darken to at least ink-600 (~`#5A6573`) for 5.67:1 contrast. (ref: `ux-audit/achievements-desktop.png`)

---

### **[P1] `/badge-earned` — Badge title uses MOMCAKE for a proper noun (name), not a number**

The `<h2>` "First Trade" is rendered in MOMCAKE Bold at 36px. The DS rule states MOMCAKE is for **one number per screen** — not for badge names. The badge name is a text label, not a numeral. On this dark-screen reveal, MOMCAKE for a text label is a typographic category error.

**Fix:** Render the badge name in Barlow Condensed (semibold or condensed) at a large size (e.g., 32–40px) to maintain visual impact without violating the MOMCAKE rule. Reserve MOMCAKE for a numeric element on this screen — e.g., the progress fraction `1/10` would be a valid single-number candidate. (ref: `ux-audit/badge-earned-desktop.png`)

---

### **[P1] `/badge-earned` — Progress fraction "1/10" does not use MOMCAKE; no visual ring/arc**

The progress indicator is "1/10" text in Barlow Condensed at 11px alongside a text label — no SVG ring, arc, or circular progress element. The snapshot shows a progress element described in the DOM structure, but it has no visual prominence. The number `1` would be the correct MOMCAKE candidate on this screen (see P1 above), and a progress ring would add the "earned moment" visual impact the spec calls for.

**Fix:** Add an SVG circular progress ring (e.g., 64px, 4px stroke, ame-400 fill on ink-800 track). Place the MOMCAKE numeral `1` at the centre of the ring. The `/10` denominator in smaller Barlow Condensed below or beside. (ref: `ux-audit/badge-earned-desktop.png`, `ux-audit/badge-earned-mobile.png`)

---

### **[P1] `/achievements` — Tier hierarchy (10 badges→medal→trophy) is not visually explained**

The hint text "10 badges → first medal" is present but the tier system (10 badges→medal, 10 medals→trophy, 10 trophies→Master of Trading) is not surfaced anywhere on the achievements page. A new user seeing "0 badges / 0 medals / 0 trophies" with separate counters has no understanding of why there are three tiers or how they relate.

**Fix:** Add a compact tier-progression indicator — e.g., three linked icons (badge→medal→trophy) with `10×` labels between them — near the top of the page, or in a collapsed "How it works" disclosure that expands inline. (ref: `ux-audit/achievements-desktop.png`)

---

## OTHER APP FINDINGS

---

### **[P0] Global — No `<nav>` landmark or keyboard-accessible navigation on any screen**

Confirmed across `/portfolio`, `/markets`, `/stock/AAPL`, `/orders`, `/profile`. Every page uses `<div>` for nav items. See gamification finding above — this is app-wide. (ref: all screenshots)

---

### **[P0] Global — Zero semantic headings across the entire app**

Confirmed on every screen inspected: portfolio, markets, stock detail, buy, receipt, orders, profile all have 0 `<h1>`–`<h6>` elements. Page titles and section labels are `<div>` elements. (ref: all screenshots)

---

### **[P1] `/markets` search input — No `<label>` or `aria-label`**

The search field has `placeholder="Search ticker or company name…"` but no `id`, no associated `<label>`, and no `aria-label`. Placeholder text disappears on focus and is not a substitute for a label. WCAG 1.3.1, 4.1.2.

**Fix:** Add `aria-label="Search ticker or company name"` to the input, or wrap it in `<label>`. (ref: `ux-audit/markets-desktop.png`)

---

### **[P1] `/buy/AAPL` — Trade form inputs have no labels or aria-label**

Two `<input type="number">` fields on the buy form have no `id`, no `<label>`, and no `aria-label`. One has `placeholder="0.00"`, the other has no placeholder. A screen reader user has no idea what quantity or dollar amount each field accepts. WCAG 1.3.1, 4.1.2.

**Fix:** Add `aria-label="Number of shares"` and `aria-label="Dollar amount"` to the respective inputs (or use visible `<label>` elements). (ref: `ux-audit/buy-desktop.png`)

---

### **[P1] `/buy/AAPL` — MOMCAKE price `$298.01` at 32px (not the screen's primary number)**

The buy form shows the current AAPL price in MOMCAKE at 32px. On this screen the "most prominent number" the user is entering is their share quantity / dollar amount — not the reference price. Using MOMCAKE for the reference price while the user's input is unstyled creates a hierarchy inversion. (ref: `ux-audit/buy-desktop.png`)

**Fix:** Either remove MOMCAKE from the reference price (use Barlow Condensed at 24px) and apply MOMCAKE to the total cost estimate as the user types, or confirm this is the intended one MOMCAKE element per screen and ensure no other MOMCAKE appears here.

---

### **[P1] `/receipt` — Trade values not rendered in Source Code Pro**

The receipt screen (`/receipt`) shows trade confirmation data with `0` Source Code Pro elements. The DS specifies `MONO` (Source Code Pro) for "timestamps, IDs, trade receipts." Receipt line items (price, quantity, fees, total) should use the mono stack for legibility and DS compliance.

**Fix:** Apply `font-family: var(--mono)` (Source Code Pro) to all numeric values and IDs on the receipt. (ref: `ux-audit/receipt-desktop.png`)

---

### **[P2] `/achievements` — "Badges · 0 earned of 15" eyebrow lacks `letter-spacing: 0.14em`**

The section header "Badges · 0 earned of 15" is 11px uppercase Barlow Condensed — correct size and case — but computed `letter-spacing` was not explicitly verified to be 0.14em. Given other eyebrow deviations found elsewhere, confirm letter-spacing matches the DS eyebrow spec (`letter-spacing: 0.14em`). (ref: `ux-audit/achievements-desktop.png`)

---

### **[P2] `/badge-earned` — Body description text is `fontStyle: normal` on a `<div>`, not `<em>`**

The badge description "You made your first simulated trade. You're an investor now." is rendered as a plain `<div>` with no italic applied. The DS specifies hero messages should always be italic. While this is not a hero message per se, the congratulatory body copy on a dark reveal screen benefits from the italic treatment for tonal consistency, and any Sage/hero attribution must be `fontStyle: italic`.

The hero quote ("Every investor started exactly here…") correctly uses `fontStyle: italic` via CSS — good. But it should be in an `<em>` or `<blockquote>` element for semantic correctness, not a `<div>`.

**Fix:** Wrap the hero quote in `<blockquote>` or `<q>` with `<cite>` for the speaker attribution. (ref: `ux-audit/badge-earned-desktop.png`)

---

### **[P2] `<title>` tag is `"app"` on every page**

Every page has `<title>app</title>`. This means browser tabs, screen reader announcements on navigation, and bookmarks all read "app" rather than "simFolio — Achievements" or "simFolio — Buy AAPL". WCAG 2.4.2.

**Fix:** Set a meaningful `<title>` per route, e.g., `simFolio — Achievements`, `simFolio — Buy AAPL`. In React Router this is typically done with `document.title = ...` in a `useEffect` per page component or via a `<Helmet>`-style utility.

---

### **[P2] `/portfolio` — `$5,000.00` at 48px MOMCAKE and "simFolio" wordmark both use MOMCAKE**

The `$5,000.00` portfolio value in MOMCAKE at 48px is correct (the single display number). However "simFolio" in the nav wordmark also uses MOMCAKE — this means every page has two MOMCAKE elements. The DS rule is one per screen. The wordmark likely needs to be excluded from this count by design intent (it's a brand mark), but this should be explicitly confirmed and documented in the DS. If it is excluded, the rule should say "one MOMCAKE number per screen, plus the wordmark." (ref: `ux-audit/portfolio-desktop.png`)

---

### **[P2] `/onboarding` goal-selection buttons — height inconsistency (65px vs 90px)**

The "Diversify Risk" goal button renders at 65px height while the others are approximately 90px. This is likely a text-length wrapping difference, but the inconsistent heights create uneven grid rows. (ref: `ux-audit/onboarding-desktop.png`)

**Fix:** Set a `min-height` on all goal buttons (e.g., `min-height: 80px`) so short-text options don't compress below the grid standard.

---

### **[P2] Global — Profile avatar button ("U") has no `aria-label` that describes its action**

The profile button shows `aria-label="Profile"` — good. But the initials-only label "U" (presumably the user's initial) means a screen reader announces "Profile, button" with no indication it opens a profile menu or navigates to the profile page. Confirm the aria-label correctly communicates the destination/action.

---

## Summary by Priority

| Priority | Count | Key theme |
|---|---|---|
| P0 | 7 | Keyboard inaccessibility (nav + badge cards), WCAG contrast fails, MOMCAKE DS violation, no headings, no ARIA on SVGs/progressbar |
| P1 | 8 | Tier hierarchy unclear, badge earned/locked distinction missing, CTA color inversion on dark screen, no form labels, MOMCAKE on badge title, missing Source Code Pro on receipt, progress ring missing |
| P2 | 6 | `<title>` tags, wordmark MOMCAKE double-use, goal button heights, eyebrow tracking, hero quote semantics, avatar action label |

**Most urgent for gamification ship:** P0 keyboard access on `/achievements`, P0 contrast on badge text, P0 heading structure, P1 tier-hierarchy explanation, P1 progress ring on `/badge-earned`, P1 locked/earned state distinction.

---

## Iteration 2 (re-audit) — 2026-06-21 — `/achievements` + `/badge-earned` fix verification

**Screenshots:** `ux-audit/achievements-desktop.png`, `ux-audit/badge-earned.png`

### Fix verification

| # | Fix item | Status | Notes |
|---|----------|--------|-------|
| 1a | Badge cards have `role="button"` | PASS | All 15 cards are `<div role="button">` |
| 1b | tabindex: 0 earned / -1 locked | PASS (partial) | All locked cards carry `tabindex="-1"` as required. Cannot verify `tabindex="0"` on earned cards — 0 badges earned in test session. Logic is correctly wired to `data-state`. |
| 1c | `data-state="earned\|locked"` present | PASS | All 15 locked cards have `data-state="locked"` |
| 1d | `aria-label` on locked cards includes "locked" | PASS | e.g. `"First Trade badge — locked: Make your first simulated trade"` |
| 1e | Visible focus ring on badge cards | PASS | Focused card shows ame-400 (`rgb(138,96,235)`) 2px box-shadow ring; no outline suppression |
| 1f | `<h1>` present | PASS | `<h1>Achievements</h1>` confirmed |
| 1g | Tier progress bar `role="progressbar"` with aria-valuenow/min/max | PASS | `aria-valuenow="0"`, `aria-valuemin="0"`, `aria-valuemax="10"`, `aria-label="Badges toward next medal"` |
| 1h | Locked badge title/desc contrast — no card-level opacity dimming | PASS | Card `opacity: 1`. Title `rgb(36,43,53)` (~ink-700), desc `rgb(90,101,115)` (~ink-500). Both exceed AA on white card background. |
| 1i | Summary count ("N badges") not in MOMCAKE | PASS | `font-family: "Barlow Condensed"` confirmed on "0 badges" element |
| 1j | Tier-progression explainer present | PASS | Full sentence "10 badges earn a medal · 10 medals earn a trophy · 10 trophies make a Master of Trading." rendered in DOM |
| 2a | Badge NAME title not MOMCAKE (should be Barlow Condensed) | PASS | h2 "First Trade" computed `font-family: "Barlow Condensed"` at 36px |
| 2b | Progress card `role="progressbar"` | PASS | `aria-valuenow="1"`, `aria-valuemin="0"`, `aria-valuemax="10"`, `aria-label="1 of 10 toward your first medal"` |
| 2c | ProgressRing arc actually renders | PASS | SVG circle has `stroke-dasharray: 13.19 131.95`, `stroke: var(--ame-400)` — arc correctly reflects 1/10 progress |

### New P0/P1 findings

No new P0/P1 gamification findings on `/achievements` or `/badge-earned`.
