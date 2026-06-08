# simFolio — Design Handoff Notes
## Session: chat01 · June 2026

---

## 1. Product Vision

**simFolio** is an educational investing simulator. Users trade with virtual cash using real-time market data, guided by AI-powered personas of legendary investors ("Heroes"). The core promise: *learn investing by doing it, with legends as your guides. No real money.*

**Target user**: Complete novice. Many are non-native English speakers. Starting point is zero financial literacy. The app must teach concepts at the moment they matter — not in a manual.

**Bilingual requirement**: The main UI remains in English (users need to trade on English-dominant platforms). Educational tooltips and explanations must be available in Traditional Chinese (繁體中文). Other languages are planned but not yet scoped.

---

## 2. File Inventory

### Wireframes (`wireframes/`)
| File | Sections | Coverage |
|------|----------|----------|
| `simFolio Wireframes.html` | 00 Auth · 01 Onboarding · 02A/B/C Portfolio · 03 Hero Consultation · 04 Trade Flow | First-time full flow + portfolio variants |
| `simFolio Wireframes 02.html` | Hero builds portfolio · Council 1→2 · Portfolio 02B | Hero council growth |
| `simFolio Wireframes 03.html` | Trading reality · Tooltip system · Interaction spec | Educational interaction system |
| `simFolio Wireframes 04.html` | Mature portfolio · Learn-as-you-do · Hero Q&A · Portfolio review | Ongoing use |
| `simFolio Wireframes 05.html` | Achievement system | Badge/medal/trophy system (note: needs 10/10/10 fix — see §7) |
| `simFolio Wireframes 06.html` | Sell flow · Settings · Language · Notifications · Cash top-up | Settings + secondary flows |
| `simFolio Wireframes 07.html` | Markets & Discovery · Search · Stock detail · ETF browse · Hero lens | Market exploration |
| `simFolio Wireframes 08.html` | Pending orders · Edit/cancel · Order history · Reflection notes | Order management |

### Hi-fi (`hifi/`)
| File | Artboards | Notes |
|------|-----------|-------|
| `simFolio Onboarding v1.html` | 6 | 3 variations (A/B/C) × mobile+desktop. **Variation A selected.** |
| `simFolio Portfolio v1.html` | 3 | Desktop 02B + Mobile portfolio tab + Ask tab |
| `simFolio Trade Flow v1.html` | 7 | Buy (open + closed markets) · Confirmation · Sage→Hero handoff · Sell |
| `simFolio Auth v1.html` | 5 | Welcome mobile+desktop · Sign up · Sign in · Returning user |
| `simFolio Markets v1.html` | 4 | Markets overview mobile+desktop · Search · Stock detail |
| `simFolio Orders & Achievements v1.html` | 10 | Pending orders · History · Trade detail · Achievements home · 4 earned moments |

**Total: 35 hi-fi artboards.**

---

## 3. Visual Design System

### Design system in use
**QSXC (Quantum Simplex)** — `/projects/609610ba-6924-415c-8ab5-533e3cf06c97/`

### Committed typographic hierarchy
| Role | Font | Usage |
|------|------|-------|
| Display | MOMCAKE Bold 700 | One number per screen only: portfolio value, stock price. Never body text. Sparingly. |
| UI sans | Barlow Condensed | Everything else: labels, body, buttons, captions, eyebrows |
| Mono | Source Code Pro | Not yet used in hi-fi. Reserved for timestamps, IDs, trade receipts if needed |

### Color palette
| Token | Hex | Use |
|-------|-----|-----|
| `paper` | `#FAFAF7` | Default surface |
| `white` | `#FFFFFF` | Cards floating on paper |
| `ink-900` | `#0A0E14` | Primary CTA, headings, nav active |
| `ink-400` | `#7E8794` | Muted labels, eyebrows |
| `ink-100` | `#E6E9ED` | Dividers, card borders |
| `ame-400` | `#8A60EB` | Amethyst — brand primary, selection states, Hero 1 (Warren) |
| `aqua-400` | `#1FC3A4` | Aqua — gains, Sage avatar, markets open indicator |
| `red` | `#D43A2F` | Losses, sell CTA, realised loss |
| `gold` | `#B5860A` | Medal tier, warnings, queued order state |

### Component rules (locked)
- **Border radius**: 0px blocks · 4px inputs/chips · 8px cards · 999px pills — never 16px+
- **CTA primary**: ink-900 fill, white text, 4px radius, 48px height
- **CTA ghost**: transparent, ink-200 border
- **CTA danger** (sell/cancel): red fill or red border
- **No gradients in product UI** — one exception: Master of Trading CTA (amethyst→gold gradient, earned)
- **No emoji** — ever
- **Charts**: minimal single line, aqua stroke, no fill, no background
- **Eyebrow labels**: Barlow Condensed, 11px, uppercase, `letter-spacing: 0.14em`
- **Hero messages**: always italic, always a question or observation — never a directive

### Sage vs Hero visual distinction
| Entity | Avatar | Color | Role |
|--------|--------|-------|------|
| Sage (guide) | ◇ symbol | Aqua | Neutral onboarding guide. Steps back after first trade. |
| Warren Buffett | WB initials | Amethyst | Hero 1 (example). Value/long-term. |
| Cathie Wood | CW initials | Aqua | Hero 2 (example). Disruptive/growth. |
| Ray Dalio | RD initials | Gold | Hero 3 (example). Balance/macro. |

---

## 4. Finalized User Flows

### 4.1 Full first-time flow (onboarding → first trade)
```
Welcome screen
  └── Get started → Sign up (email or Google/Apple)
        └── Onboarding interview (Sage, neutral, no hero branding)
              ├── Q1: Investment goal [ALWAYS FIRST, STRICTLY MULTIPLE CHOICE — no free text]
              ├── Q2–Q8: Randomized order every session:
              │     · Amount to invest
              │     · Time horizon
              │     · Risk tolerance
              │     · Experience (months trading)
              │     · Native language
              │     · Financial market familiarity
              │     · "Anyone you've heard about or read about?" [casual, not explicit hero selection]
              └── 8/8 complete → progress bar full
                    └── Stock interest phase
                          ├── Sage: "Any stocks, ETFs, or crypto you're curious about?"
                          │     └── User names them → ticker chips accumulate at top
                          ├── PATH A (has ideas):
                          │     └── "Which one first?" → Trade walkthrough
                          └── PATH B (no ideas at all):
                                └── [ONLY pre-trade hero moment]
                                      └── Hero gallery / matched hero shown
                                            └── Hero helps suggest first stock
                                                  └── Trade walkthrough

Trade walkthrough (Sage guides inline):
  └── Buy form → Order filled → Receipt + slippage explanation if applicable
        └── POST-FIRST-TRADE: Sage → Hero handoff
              ├── Matched hero introduced with card
              ├── "Before you buy the rest — meet [Hero]"
              └── User: "Talk to [Hero]" or "Continue buying first"
                    └── Hero takes over as primary advisor
                          └── Sage steps back permanently
```

### 4.2 Hero council growth (post-onboarding)
```
Hero 1 (matched by algorithm from interview responses)
  └── Hero 1 chats, advises on trades
        └── When Hero 1 detects a mismatch with their expertise:
              └── Hero 1 introduces Hero 2 organically
                    └── e.g. "This sounds like Cathie's territory — let me bring her in."
                          └── Hero 2 joins council

Hero 2 or 3 can introduce the next if needed.
Maximum council size: 3 heroes.
All heroes share one chat window.
```

**Key rule**: Heroes 2 and 3 are **introduced by Hero 1**, never by the system. There is no "add a hero" button. This is earned.

### 4.3 Trade flow — buy
```
Markets open:
  Buy form → Qty input → Market order (default) or Limit order
    → Order summary (fees shown) → Buy CTA → Filled → Receipt

Markets closed (evenings/weekends):
  Buy form → Market closed amber banner → Sage explains price variance
    → Queue order → "Order will execute Monday 9:30 AM EST"
    → [On open] Executed → Receipt (slippage explained if price differed)
```

**Slippage rule**: If executed price differs from price at time of order placement, an amber education card automatically appears explaining why. This is not optional — it's always shown.

### 4.4 Trade flow — sell
```
Sell form → Hero comment appears inline (question, not advice)
  → Qty to sell → P&L preview (realised gain/loss in color)
  → Sell CTA (red) → Confirmation + receipt
    → Hero reflection prompt: "What did you learn?"
      → Optional reflection note field (Warren can discuss it later)
```

### 4.5 Pending orders
- **Pending** = limit order waiting for price target
- **Queued** = market order waiting for market open
- Market order queued over weekend: amber banner + education note about price variance
- Limit orders: editable (price, qty, expiry GTC vs day)
- Market orders: not editable (cancel only)
- Cancel confirmation always states: "No money has been spent. Nothing changes except this order disappears."

### 4.6 Achievement system
```
10 badges  = 1 medal
10 medals  = 1 trophy
10 trophies = Master of Trading (the ultimate, rarest screen)
```
- First badge trigger: first completed trade (any type)
- Badge earned moments: full-screen ink-900 — deliberate, no bounce
- Progress ring shows current tier ratio
- Hero council comments at each milestone
- Master of Trading: the only screen with a gradient CTA (this is intentional and earned)

---

## 5. Key Architectural Decisions

### 5.1 Hero timing rule
> **Heroes do not appear until the user has real skin in the game.**

The hero is introduced AFTER the first trade is completed — as a learning moment, not a sales pitch. The single exception: if the user has absolutely no stock ideas when asked, the hero gallery is shown *before* the first trade to help them find something to invest in.

### 5.2 First onboarding question is strictly multiple choice
The goal question (Q1) is multiple-choice only. No free-text input. Subsequent questions can be answered conversationally. This was explicitly revised — earlier versions showed a GhostInput on all questions.

### 5.3 Hero question is casual and indirect
The interview never explicitly asks "which investor do you want as your hero?" Instead: *"Anyone you've heard mentioned — from a book, podcast, or just people talking about them?"* The answer is one input among many in the matching algorithm, not the sole determinant.

### 5.4 Interview questions are randomized (except Q1)
Q1 (investment goal) is always first. Q2–Q8 are drawn in random order each session so the app doesn't feel like a prescribed form. The same 8 questions must always be answered; only the order changes.

### 5.5 Educational tooltips — complete interaction spec
| Cue | Where | Interaction |
|-----|-------|-------------|
| Dotted amethyst underline | Body text, receipts, form labels | Desktop: hover → tooltip. Mobile: tap/long-press → bottom sheet |
| ⓘ micro-icon (13px circle, amethyst stroke) | Compact headers, stat cards, table columns | Same as above |
| Amethyst · middle dot (U+00B7) | Mobile only, follows any tappable term | Belt-and-suspenders with dotted underline |

Bottom sheet (mobile): full-width, slides up from bottom. Handle bar at top. EN/繁中 tabs — language switchable inline. Never a tiny tooltip on mobile.

Desktop tooltip: appears on hover, 8px radius card, EN/繁中 tabs inside.

**Auto-education rule**: Any unexpected outcome (slippage, partial fill, fee different from estimate) triggers an automatic inline explanation card. The user never has to ask why something happened.

### 5.6 Market hours realism
- Stock markets: 9:30 AM–4:00 PM EST, Monday–Friday
- Market order placed outside hours → queued, executed at next open
- Crypto: different hours (24/7) — not yet fully specced for display
- After-hours trading: not yet scoped

### 5.7 Portfolio 02B — "Advisor's Room"
Desktop: two-column. Left = portfolio data (value, chart, holdings). Right = hero sidebar with three tabs: Council (all), Warren, Cathie. Quick prompts at top of sidebar to reduce typing.

Mobile: two tabs at bottom nav — **Portfolio** (data) and **Ask** (full-screen hero council chat). Same experience, different form factor.

---

## 6. Decisions That Changed During the Session

| What changed | Original direction | Final decision | Reason |
|---|---|---|---|
| Hero timing | Hero shown during onboarding, on welcome screen | Hero shown ONLY after first trade (one exception) | Heroes are a learning reward, not a marketing hook |
| Onboarding question structure | Pre-defined visible steps/checklist | Randomized conversational, no step indicators visible | Should feel like a conversation, not a form |
| First question input | GhostInput text field on all questions | Q1 = strict multiple choice, no text input | Goal must be unambiguous and clean |
| Hero matching | User explicitly asked to pick a hero | Casually asked about investors they know; algorithm picks | Less prescriptive, more surprising |
| Pre-trade hero moment | Hero shown at end of interview as "surprise reveal" | Hero shown after FIRST TRADE (except no-stock-ideas path) | Heroes need context; user needs skin in the game first |
| Hero council growth | System offers hero selection | Hero 1 introduces subsequent heroes when appropriate | More natural, organic feel; heroes feel like peers |
| Onboarding variation | 3 variations (A/B/C) presented | **Variation A (Chat-first)** selected | Cleanest, most airy, most consistent with brand voice |
| Portfolio layout | 3 portfolio layouts (02A/02B/02C) | **02B (Advisor's Room)** selected | Best balance of data and hero presence |

---

## 7. Open Requirements — Not Yet Implemented

### 7.1 Known bugs / pending fixes
- **WF05 achievement numbers**: Wireframe 05 still shows old badge counts. Needs updating to reflect the 10/10/10 rule.

### 7.2 Hi-fi screens not yet done
| Screen | Status |
|--------|--------|
| Sell flow — desktop | Wireframed, not hi-fi'd |
| Order history — desktop | Wireframed, not hi-fi'd |
| Edit limit order — mobile | Wireframed, not hi-fi'd |
| Hero introduction flow (Hero 1 → Hero 2) | Wireframed, not hi-fi'd |
| Hero gallery / library (card picker) | Wireframed, not hi-fi'd |
| Portfolio review / rebalancing flow | Wireframed, not hi-fi'd |
| Settings: language, notifications, cash top-up | Wireframed, not hi-fi'd |
| Dark mode variants (all screens) | Not started |
| Notification center / push patterns | Not started |

### 7.3 Interaction spec not yet designed
- **Reflection note + Hero discusses**: After a sell, user can add a note about what they learned. Warren (or council) can revisit it. The UX for surfacing old notes in conversation is not designed.
- **Hero council disagreement pattern**: When Warren and Cathie have opposing views, how does the UI handle it? Does the chat show them debating? This is implied in the wireframes but not specced.
- **Council tab switching** (desktop sidebar): Switching between "Council", "Warren", "Cathie" tabs — does switching clear message history or is it filtered? Not specced.
- **Hero "stepping back"**: When Sage hands off to Hero 1, what exactly happens to the Sage entry point? Can the user ever summon Sage again? Not specced.

### 7.4 Trading features not yet specced
| Feature | Notes |
|---------|-------|
| Partial fills | Status pill designed; receipt flow not specced |
| Stop-loss orders | Not wireframed |
| After-hours trading | Not specced |
| Crypto market hours (24/7) | Category browsable; hours difference not handled |
| Options and REITs | Category chips exist; trade forms not designed |
| Dividend handling | Not specced |
| Stock splits | Not specced |
| Cash top-up flow (detailed) | Wireframed in WF06, not hi-fi'd |

### 7.5 Educational content gaps
- **Tooltip glossary**: The interaction pattern is designed; the actual content (definitions in EN + 繁中) for each term has not been written. Terms identified that need definitions: market order, limit order, slippage, regulatory fee, P/E ratio, market cap, dividend yield, ETF, cost basis, realised P&L, unrealised P&L, 52W high/low, volume, after-hours trading, partial fill.
- **Additional language support**: Architecture assumes EN/繁中. Adding more languages (Japanese, Spanish, etc.) requires a structured content pipeline — not yet designed.
- **Hero philosophy cards**: Each hero needs a hyper-concise bio card (photo placeholder, strategy summary, known for, strength) for the hero gallery. Content not written.

### 7.6 Technical/API not specced
- Real-time price feed source (Yahoo Finance, Polygon.io, etc.)
- Simulated cash pool persistence
- Order queue execution engine (market-hours-aware)
- Hero AI persona prompt structure
- User account + progress persistence

### 7.7 Prototype not built
An interactive clickable prototype (onboarding → first trade → hero handoff) has been discussed but not yet built. This is the recommended next artifact — the most compelling demo for stakeholders.

---

## 8. Design Principles to Preserve

1. **Conversation first** — every interaction should feel like talking to someone, not filling a form.
2. **Earn the heroes** — heroes are a reward for engaging with the product, not a welcome mat.
3. **Teach at the moment of confusion** — explanations appear when needed, automatically, never in a manual.
4. **Realism over simplification** — simulate market hours, slippage, fees. Then explain them. Don't hide reality.
5. **One voice at a time** — Sage speaks during onboarding, then steps back. Hero 1 speaks. Additional heroes are introduced by Hero 1, never by the system. The user always knows who they're talking to.
6. **No emoji, no gradients (except Master of Trading)** — the brand is geometric and restrained. The Master of Trading gradient CTA is intentionally the only one — it marks an exceptional moment.
7. **Achievement moments are ink-900 cinematic, not bouncy** — deliberate, measured, earned.

---

## 9. Hero Library (Partial — to be completed)

| Hero | Expertise | Style | Introduced when |
|------|-----------|-------|-----------------|
| Warren Buffett | Value investing, long-term, quality businesses | Patient, Socratic | Default match for long-term/value users |
| Cathie Wood | Disruptive technology, innovation, ARK-style | Bold, conviction-driven | Introduced by Warren when user shows tech interest |
| Ray Dalio | Macro, diversification, all-weather | Systematic, principle-based | Introduced when user's portfolio is highly concentrated |
| (7 more TBD) | — | — | — |

**Matching algorithm inputs** (from interview):
- Investment objective (most weight)
- Time horizon
- Risk tolerance
- Investor names mentioned casually
- Financial market experience level
- Amount to invest

Warren Buffett should **not** be the default match if the user's primary objective is short-term. In that case, a momentum or short-term trader hero would be more appropriate.

---

*Generated: June 2026 · simFolio design session chat01*
*Next session: interactive prototype and/or remaining hi-fi screens*
