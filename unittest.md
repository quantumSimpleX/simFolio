# Unit Test Plan — Clickable Asset Mentions in Chat

Covers the "Interactive Asset Mentions" requirement: any stock / ETF / crypto mentioned in a chat
message renders as an underlined, clickable link that opens the asset's detail page
(`/stock/<TICKER>`) — the same destination as a Markets search hit.

- **Target:** ≥ 80% line coverage on the new feature files; overall suite pass rate > 95%.
- **Test file:** `app/src/test/assetLinks.test.jsx`
- **Run:** `cd app && npx vitest run src/test/assetLinks.test.jsx`
  Coverage: `cd app && npx vitest run --coverage src/test/assetLinks.test.jsx`

Hero/Sage replies mark every asset with square brackets (`[Apple]`, `[Berkshire Hathaway]`); the
client links the whole bracketed entity (brackets stripped), resolving it via the fast path (registry
/ holdings) or **live market-data validation**. Unbracketed text (user messages, legacy replies)
links only precise signals: explicit cashtags, registry names, and known/owned tickers.

## Units under test

| File | What it does |
|------|--------------|
| `src/lib/assetLinks.js` | `findAssetSpans` (trusted vs validate spans), `resolutionKey`, `ASSET_REGISTRY` (pure) |
| `src/lib/resolveSymbol.js` | `resolveSymbol` / `matchRows` — confirm a candidate via symbol search, cached |
| `src/hooks/useAssetResolution.js` | Batches validation candidates through React Query |
| `src/components/AssetText.jsx` | Renders trusted links synchronously, validated links once resolved |
| `src/components/HeroMessage.jsx` | `HeroMessage` / `UserMessage` render replies/questions via `AssetText` |

## Test cases

### A. `findAssetSpans` — bracketed entities (primary)
1. Links a bracketed registry name without a network call; span covers the brackets, `display` = inner.
2. Links bracketed tickers via the fast path (`[NVDA]`, `[BRK.B]`).
3. Flags an unknown multi-word bracketed entity for validation as one unit (`[Palantir Technologies]`).
4. Trims whitespace and ignores empty brackets (`[]`, `[ Apple ]`).

### B. `findAssetSpans` — unbracketed precise detection
5. Links a known cashtag (trusted) and validates an unknown one (`$ZM`).
6. Links a registry name and a bare known ticker.
7. Links a user holding ticker via `knownTickers` (`PLTR`).
8. Does NOT guess unknown company names or acronyms in unbracketed prose.
9. Does not match a ticker embedded in a larger word (`SPYWARE`).

### C. `findAssetSpans` — ordering, overlap, hygiene
10. Returns spans ordered by position.
11. Does not double-count a registry name already inside a bracket.
12. Handles empty / null / undefined / non-string input → `[]`.

### D. `resolutionKey` / `ASSET_REGISTRY`
13. `resolutionKey` builds a stable upper-cased key.
14. Every registry entry has a ticker and at least one name.

### E. `matchRows` (pure match logic)
15. Matches a ticker candidate to an exact US symbol.
16. Matches an entity by exact symbol when given a ticker.
17. Matches an entity by company-name prefix (multi-word) → `PLTR`.
18. Strips a leading `$` from the query.
19. Ignores non-US listings; returns null when nothing matches.

### F. `resolveSymbol` (live validation)
20. Resolves an entity via the symbol API and caches it (no second fetch).
21. Returns null (cached) for a non-asset and on fetch error.

### G. `AssetText` — trusted (synchronous) links
22. Links a bracketed registry name and strips the brackets; click fires `onAssetClick`.
23. Activates a link via keyboard (Enter).
24. Links a bare known ticker in the user message.
25. Renders plain prose with no links.
26. Falls back to `navigate('/stock/<TICKER>')` when no `onAssetClick` is given.

### H. `AssetText` — live-validated bracketed entities
27. Links an unknown multi-word company once validated; brackets stripped.
28. Strips brackets and shows plain text when an entity does not resolve.

### I. Integration — message components
29. `HeroMessage` links a bracketed asset inside the (quoted) reply.
30. `UserMessage` links a bare known ticker in the question.

## Results (latest run)

- **Feature file:** 30/30 pass.
- **Full suite:** 238/238 pass (100% > 95% target).
- **Coverage:** `assetLinks.js`, `AssetText.jsx`, and `resolveSymbol.js` all 100% lines; global
  87.05% lines (80% gate cleared).
- **Lint:** new files clean. **Build:** `npm run build` ✓.

Discovered issues and their resolution are appended to `task.md` under the "QA findings" sections
(asset-mention feature, iteration 2, iteration 3).

---

# Unit Test Plan — Enrich Educational Tooltips (`feature/tooltip-glossary`)

Covers the expanded glossary + tooltip wiring: every new financial term has an EN + 繁中 entry,
each acronym is spelled out in full, and the on-screen labels resolve to a working tooltip
(desktop hover card / mobile bottom sheet).

- **Target:** ≥ 80% line coverage on touched files (`glossary.json` data, `Primitives.jsx`
  `TermUnderline`/`TERM_MAP`); overall suite pass rate > 95%.
- **Test file:** `app/src/test/glossary.test.jsx` (new); extend `app/src/test/primitives.test.jsx`.
- **Run:** `cd app && npx vitest run src/test/glossary.test.jsx`
  Coverage: `cd app && npm run test:coverage`

## Units under test

| File | What it does |
|------|--------------|
| `data/glossary.json` | Term store; every key has `en` + `zh-TW`, each `{ title, definition }`. |
| `components/Primitives.jsx` | `TERM_MAP` display→key map; `TermUnderline` render + lookup. |

## Test cases

### A. Glossary data integrity (data-driven loop over ALL keys)
1. Every glossary key has both `en` and `zh-TW` objects.
2. Every entry's `title` and `definition` (both languages) are non-empty strings.
3. No `zh-TW` definition is accidentally identical to its `en` definition (real translation).
4. The 22 new keys (eps, beta, volume, avg_volume, exchange, 52w_range, shares, ticker, position,
   holdings, bid_ask_spread, gross_cost, gross_proceeds, net_proceeds, execution_price,
   time_in_force, gtc_order, day_order, crypto, index, watchlist, dividend) all exist.

### B. Acronyms spelled out in full
5. `eps` definition/title contains "Earnings Per Share".
6. `gtc_order` contains "Good-Till-Cancelled".
7. Existing `pe_ratio` contains "Price-to-Earnings"; `etf` contains "Exchange-Traded Fund";
   `market_cap` (title or def) covers "Market Cap".

### C. TERM_MAP resolution (parametrized)
8. Each display label → expected key: "P/E"→pe_ratio, "EPS"→eps, "Beta"→beta, "Volume"→volume,
   "Avg volume"→avg_volume, "Exchange"→exchange, "52W range"→52w_range, "Div yield"→dividend_yield,
   "Shares"→shares, "Holdings"→holdings, "Positions"→position.
9. Every value in `TERM_MAP` points at a key that exists in `glossary.json` (no dangling aliases).

### D. `TermUnderline` rendering (desktop)
10. Renders a tooltip on hover for each new label ("P/E", "EPS", "Beta", "Volume", "Exchange") —
    definition text appears (parametrized).
11. An explicit `termKey` prop overrides display-text lookup.
12. Unknown/unmapped label still renders plain underline, no crash, no tooltip.

### E. `TermUnderline` mobile + i18n
13. Mobile (innerWidth < 768): tapping a term opens a bottom sheet with EN / 繁中 tabs.
14. With `lang='zh-TW'`, the desktop tooltip shows the Chinese definition.

### F. Integration — screens light up
15. `StockDetail` fundamentals/stats labels ("P/E", "EPS", "Beta", "Volume", "Avg volume",
    "Exchange") render as underlined trigger spans.
16. `Fundamentals` inline labels ("P/E", "EPS", "β") render underlined without breaking the
    `·`-separated layout (renders text nodes around them).

## Results (latest run)

- **Feature file** (`src/test/glossary.test.jsx`): all green — 158 cases pass (cases A–F; the
  data-integrity + TERM_MAP loops are `it.each`-parametrized over all 36 glossary keys, which is
  why the count is high). 0 failures.
- **Full suite**: 403/407 pass. The 4 failures are all in `onboarding.flow.test.jsx` and are
  **pre-existing / out of scope** — they fail with the DEV tooltip changes stashed (the touched
  feature did not modify the onboarding goal-card screen). Excluding those, pass rate is
  **403/403 = 100%** (> 95% target). Raw pass rate 99.0%.
- **Coverage** (run excluding the pre-existing failing onboarding file so the v8 summary prints):
  global **80.55% lines** (clears the 80% gate); `Primitives.jsx` **98.41% lines / 96.96% funcs**
  (`TERM_MAP` + `TermUnderline` fully exercised); `Fundamentals.jsx` 72.72% lines (integration
  case F covers the label-wrapping path; the uncovered lines are the `fmtMktCap` <$1M branches).
  `glossary.json` is pure data (not in the JS coverage table) — every key is asserted by the
  data-driven loop in case A.
- **Test fixes by QA**: 2 stale assertions in `components.test.jsx` updated for the new
  `<TermUnderline>`-split text nodes (see task.md). No implementation bugs found.
- **Lint**: known pre-existing error in `HeroChatPanel.jsx` only (out of scope).

Discovered issues and their resolution are appended to `task.md` under
"QA findings — tooltip glossary".

---
---

# Unit Test Plan — Change a Hero ("Find a new mentor")  — 2026-06-19

- **Target:** ≥ 85% line coverage on the new/changed feature files; overall suite pass rate > 95%.
- **New test files:**
  - `app/src/test/heroRanking.test.js`   — `candidateHeroes(true)`, `resolveMentorHeroes`
  - `app/src/test/findMentor.test.jsx`   — `HeroSelect`, `DotMenu`, `FindMentor` screen, hooks
- **Run:** `cd app && npx vitest run src/test/heroRanking.test.js src/test/findMentor.test.jsx`
  Coverage: `cd app && npx vitest run --coverage`
- Existing `onboarding.flow.test.jsx`, `heroes.test.js`, `heroChat.test.jsx` must still pass
  unchanged (proves the refactor is behaviour-preserving).

## Units under test

| File | What it does |
|------|--------------|
| `data/heroes.js` | `candidateHeroes(includeWarren)`, `resolveMentorHeroes` (pure) |
| `components/HeroSelect.jsx` | reusable grid screen (loading skeleton, pick, CTA, onChoose) |
| `components/DotMenu.jsx` | ⋮ menu open/close/select/outside-click |
| `hooks/useChangeHero.js` | replace single hero_selection + invalidate |
| `hooks/useOnboardingAnswers.js` | DB → localStorage fallback |
| `screens/heroes/FindMentor.jsx` | wires answers→ranking→HeroSelect→swap→navigate |

## Test cases

### A. `candidateHeroes` / `resolveMentorHeroes` (heroRanking.test.js)
1. `candidateHeroes()` → 19, excludes sage+warren (regression).
2. `candidateHeroes(true)` → 20, includes warren, excludes sage.
3. `resolveMentorHeroes({llmIds:[8 valid], answers})` → those 8, order preserved, no forced warren.
4. Warren **may** appear when ranked (not pinned, not dropped) — include warren in llmIds, assert present.
5. Drops unknown ids + sage; dedups; caps at 8.
6. Short llmIds → filled from `rankHeroesForSelection(answers,20)` to exactly 8 unique.
7. Garbage/missing input (`undefined`, non-array) → returns 8 unique valid ids, no throw.

### B. `HeroSelect` component (findMentor.test.jsx)
1. `loading` → renders the loading message + 8 skeleton tiles, no grid cards.
2. Loaded → renders one card per `heroIds` with hero name + style; shows `message`.
3. CTA disabled until a card is picked; label is the disabled placeholder.
4. Pick a card → CTA reads `"{ctaPrefix} {name} …"`; clicking calls `onChoose(id)`.
5. `onBack` rendered + fires when provided.

### C. `DotMenu` component
1. Menu hidden initially; clicking ⋮ reveals items.
2. Clicking an item calls its `onSelect` and closes the menu.
3. Outside click closes the menu without firing any item.

### D. `useChangeHero` hook (renderHook + supabaseMock)
1. `mutate(id)` issues delete then insert on `hero_selections`; resolves; invalidates query.
2. Surfaces error state when insert errors (mock error path).

### E. `useOnboardingAnswers` hook
1. Returns DB answers when `users.onboarding_answers` present.
2. Falls back to `localStorage('simfolio_onboarding_answers')` when DB empty.
3. Returns `{}`/empty when neither present (no throw).

### F. `FindMentor` screen (smoke)
1. Renders the mentor Sage copy.
2. With seeded ranking, shows hero cards; picking one + clicking CTA calls change-hero and
   navigates away (assert navigation target rendered / mock called).

### G. Regression
1. `onboarding.flow.test.jsx` green (grid still Warren-first, "Ask {name}" CTA).
2. `heroes.test.js` green (`candidateHeroes()` default still 19).

## Coverage strategy
- Pure functions (A) give cheap, high line coverage on `heroes.js` additions.
- Component tests (B,C) cover both branches (loading/loaded, open/closed, picked/unpicked).
- Hook tests (D,E) cover success + fallback/error branches.
- Screen smoke (F) stitches the wiring; exercises the navigate + mutate calls.

---

# Unit Test Plan — Larger rows + JA/ES tooltips + flag picker

_Added 2026-06-19. Target ≥85% line coverage on touched files._

## A. Glossary data integrity (`glossary.test.jsx`, extend)
- A1. Every key has `ja` and `es` objects (in addition to en/zh-TW).
- A2. For ja and es: `title` and `definition` are non-empty strings.
- A3. ja `definition` ≠ en `definition`; es `definition` ≠ en `definition` (real translations).

## B. FlagIcon (`primitives.test.jsx`)
- B1. `FlagIcon` renders an `<svg>` for each of US, TW, JP, ES (4 svgs).

## C. LANGUAGES config (`primitives.test.jsx`)
- C1. `LANGUAGES` has exactly 4 entries with codes `en`, `zh-TW`, `ja`, `es` and a `country` + `label` each.

## D. LangToggle flag picker (`primitives.test.jsx`, replaces old toggle test)
- D1. Trigger (`data-testid="lang-toggle"`) is collapsed: the menu items are not shown initially.
- D2. Clicking the trigger reveals all 4 language labels (English / 繁體中文 / 日本語 / Español).
- D3. Selecting 日本語 closes the menu and switches context lang to `ja` (assert via a probe / localStorage `simfolio_language === 'ja'`).
- D4. Outside click closes the menu without changing language.

## E. TermUnderline desktop i18n (`glossary.test.jsx`)
- E1. `lang='ja'` → desktop hover shows the Japanese definition.
- E2. `lang='es'` → desktop hover shows the Spanish definition.

## F. TermUnderline mobile dynamic buttons (`glossary.test.jsx` / `primitives.test.jsx`)
- F1. `lang='en'` (default), innerWidth<768: tapping shows ONLY the US/English button — no second flag tab.
- F2. `lang='ja'`, mobile: shows US (English) + JP (日本語) buttons; the Japanese definition is present.
- F3. `lang='zh-TW'`, mobile: shows US + TW buttons (back-compat).

## G. StockRow sizing (`components.test.jsx`)
- G1. The ticker chip element carries the enlarged classes (`h-[46px]`, `w-[46px]`).
- G2. StockRow still renders ticker/name/right values and fires onClick (existing behavior preserved).

## Coverage focus
- `StockRow.jsx`, `Primitives.jsx` (FlagIcon/LANGUAGES/LangToggle/TermUnderline), `glossary.json` (data-driven), `LanguageContext` (already covered by context.test).
