# QA Round 1 — Design-Rule & Behavior Audit (shadcn/ui refactor)

Auditor: QA Agent 2 · Scope: `app/src/screens/**`, `app/src/components/**` · Read-only. Static source audit against QSXC locked rules (CLAUDE.md + uitask.md).

Commit context: merged `main`. Tailwind theme correctly maps every QSXC token to `var(--…)` (tailwind.config.js) and defines only the 4 allowed radii (`none/input/card/pill` = 0/4/8/999). Dark mode keys off `[data-theme="dark"]` — verified, and **no raw hex found in any screen** (grep `#[0-9a-f]{3,6}` over `src/screens` → 0 hits), so colors flip correctly.

---

## BLOCKER
_None._

## MAJOR

### M1 — Disallowed border radii (6px / 3px / 2px) in multiple components
Rule: radii must be only `0 / 4 / 8 / 999px`.
- **`src/components/Primitives.jsx:289`** — `GoalCard` renders inline `borderRadius:6`. 6px is not allowed. (This is also load-bearing for a test, see N1.) Fix: change to `borderRadius:8` (card) or `4` (input) per intended surface; ideally migrate GoalCard to `ui/card`.
- **`src/components/Primitives.jsx:280`** — `ProgressDots` `borderRadius:3`. Fix: use `999` (pill) — these are pill dots.
- **`src/screens/profile/Profile.jsx:72-73`** and **`src/screens/achievements/AchievementsMobile.jsx:32-33`** — progress bar track + fill use `rounded-[3px]`. Fix: `rounded-pill`.
- **`src/components/SearchResultRow.jsx:13`**, **`src/components/WatchRow.jsx:13`** — "Watching"/"Owned" chips use `rounded-[3px]`. Fix: `rounded-input` (4px) or `rounded-pill`.
- **`src/screens/auth/ReturningUser.jsx:41`** — `rounded-sm` (Tailwind default = 2px). Fix: `rounded-input` (4px) or `rounded-pill` for the radio dot.
- **`src/components/HeroMessage.jsx:35`** — user bubble `rounded-[8px_8px_2px_8px]` contains a 2px corner. Borderline: asymmetric chat-bubble tail. Confirm with design; if 2px is unintended, use a token corner. (MINOR-leaning but listed here for the 2px value.)

Note: `Primitives.jsx` lines 43/44/53/62/81-96 inline `borderRadius:2/1` and `'50%'` are tiny decorative icon glyphs (battery icon, Sage diamond, circles). `'50%'` == pill and is fine; the 1-2px on the icon-internal decoration is cosmetic geometry — low priority, but technically off-spec.

### M2 — Eyebrow letter-spacing inconsistent vs locked 0.14em
Rule: eyebrow labels = Barlow Condensed, 11px, uppercase, `letter-spacing: 0.14em`. The canonical `<Eyebrow>` (Primitives.jsx:187) is correct (0.14em), and Profile.jsx:105 matches. But ad-hoc uppercase labels introduced/kept during migration diverge:
- `0.16em` — `src/screens/achievements/BadgeEarned.jsx:79`
- `0.12em` — `src/components/HeroMessage.jsx:45`, `src/screens/onboarding/Onboarding.jsx:256`, `src/screens/trade/BuyScreen.jsx:209`, `src/screens/trade/SellScreen.jsx:118`
- `0.10em` — `src/screens/trade/TradeReceipt.jsx:99`, `src/screens/portfolio/PortfolioMobile.jsx:83`

Fix: normalize all eyebrow-style labels to `tracking-[0.14em]`, or replace inline labels with the shared `<Eyebrow>` component. (Several are pre-existing values carried over verbatim, not new regressions — but they violate the locked rule.)

## MINOR

### N1 — Stale test selector coupled to the 6px violation
`src/test/onboarding.flow.test.jsx:26` queries `div[style*="border-radius: 6px"]` to find the GoalCard. This only passes because GoalCard still renders the off-spec `borderRadius:6` (M1). When M1 is fixed the selector must be updated (e.g. role/text query) or the test breaks. Flagging so the radius fix and test update land together. (READ-ONLY — not modified.)

### N2 — MOMCAKE display font appears twice on trade screens
Rule: MOMCAKE for the single hero number per screen.
- `src/screens/trade/SellScreen.jsx` — `font-display` on the price (`:91`, $26px) **and** the shares qty (`:119`, 28px).
- `src/screens/trade/BuyScreen.jsx` — `font-display` on the "Buy {ticker}" heading (`:178`, a label not a number) **and** the qty input (`:221`).
This matches the pre-refactor design (qty is the editable focal number; price card is secondary), so it is consistent intent rather than a regression — but it is two display-font elements per screen. Recommend confirming against designHANDOFF; if strict, demote the secondary price/heading to `font-sans`.

### N3 — `Badges.jsx` not recomposed onto `ui/*` (known gap, confirmed)
`src/components/Badges.jsx` exports `BadgeGlyph`, `MedalGlyph`, `TrophyGlyph`, `BadgeGlyphForIndex`. It is **100% dynamic SVG geometry** (polygon/circle math + `style={{opacity}}`) — there is no inline-style *UI* to convert and no `ui/*` primitive that fits. This is the **same justified-exception class as `QSWordmark.jsx`** (dynamic SVG geometry). 
**Recommendation: re-classify as a justified exception and mark task 3.7 done.** No recomposition needed/possible. If any cleanup is wanted, only the wrapper `<svg style={{opacity}}>` could move to `className="opacity-100 / opacity-30"` Tailwind utilities — purely optional. Tokens are already used (C.aqua400/ame400/gold). Verdict on the "gap": not an actual defect.

---

## Verified GOOD (no action)
- **Gradients:** grep `gradient` over `src/` → **0 matches**. Master-of-Trading CTA not present in current screens; no stray gradients. PASS.
- **Emoji:** grep for emoji/dingbat/arrow ranges → only QSXC iconography glyphs (`◇ ◈ ◉ ▤ ▴ ▾ ⌕ → ←`) used consistently as UI icons, not emoji. Pre-existing content glyphs `✓`/`⏳` in `TradeReceipt.jsx:39` and `✓` in `Onboarding.jsx:359` — **flagged as pre-existing per instructions**, not new. No true emoji anywhere.
- **Dark mode:** no light-only raw hex in screens; all colors via token classes (`bg-white`, `text-ink-900`, `bg-white/[0.04]`, etc.) → flips on `[data-theme="dark"]`. PASS.
- **Reusability:** per-screen inline duplicates were genuinely extracted and consumed: `OrderCard`, `FilledRow`, `EmptyState`, `PriceCard`, `PositionCard`, `Fundamentals`, `WatchRow`, `SearchResultRow`, `WatchlistButton`, `SellButton`, `HeroChatPanel`, `HeroMessage`, `StockRow`, `HoldingRow`, `BrandPanel`, `Nav` all exist in `src/components/` built on `ui/*` and are imported by screens. Remaining inline `style={{}}` blocks are justified dynamic geometry: `Charts.jsx` (chart + range buttons), `QSWordmark.jsx`, `Badges.jsx` (N3), and per-hero avatar tint colors (`style={{background:${h.color}12,...}}` in AskTab/PortfolioDesktop/BrandPanel — dynamic per-hero color, justified). No large unjustified inline-style screen blocks found.
- **Radii infra:** tailwind.config.js exposes only the 4 allowed radius tokens; `ui/*` primitives all use `rounded-input/card/pill` correctly.

---

## VERDICT: PASS with 2 MAJOR + 3 MINOR (5 issues)
No blockers. M1 (off-spec radii: 6px/3px/2px in ~7 files) and M2 (eyebrow spacing drift) are the only true locked-rule violations and are mechanical fixes. M1 must be fixed together with the N1 test selector. The "Badges.jsx gap" is not a real defect — re-classify as a justified SVG-geometry exception.
