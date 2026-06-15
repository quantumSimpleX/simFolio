# Unit Test Plan — Clickable Asset Mentions in Chat

Covers the "Interactive Asset Mentions" requirement: any stock / ETF / crypto mentioned in a chat
message renders as an underlined, clickable link that opens the asset's detail page
(`/stock/<TICKER>`) — the same destination as a Markets search hit.

- **Target:** ≥ 80% line coverage on the new feature files; overall suite pass rate > 95%.
- **Test file:** `app/src/test/assetLinks.test.jsx`
- **Run:** `cd app && npx vitest run src/test/assetLinks.test.jsx`
  Coverage: `cd app && npx vitest run --coverage src/test/assetLinks.test.jsx`

## Units under test

| File | What it does |
|------|--------------|
| `src/lib/assetLinks.js` | `findAssetMentions`, `splitTextWithAssets`, `ASSET_REGISTRY` (pure) |
| `src/components/AssetText.jsx` | Renders text with asset segments as `role="link"` spans |
| `src/components/HeroMessage.jsx` | `HeroMessage` / `UserMessage` render replies/questions via `AssetText` |

## Test cases

### A. `findAssetMentions` — detection signals
1. Detects an explicit cashtag (`$AAPL`) and reports correct `start`/`end`.
2. Honors a cashtag even for an unknown symbol (`$ZZZZ` → `ZZZZ`).
3. Detects a company / common name case-insensitively (`Apple`, `nvidia`, `Bitcoin`).
4. Detects a bare known ticker (`NVDA`).
5. Matches a dotted ticker (`BRK.B`) as both a cashtag and a bare token.
6. Prefers the longest company name (`Berkshire Hathaway` over `Berkshire`).

### B. `findAssetMentions` — false-positive guards
7. Does not link common acronyms as bare tickers (`AI`, `CEO`, `ETF`).
8. Does not link `NOW` as prose, but links the company name `ServiceNow`.
9. Does not match a ticker embedded in a larger word (`SPYWARE`, `AMZNX`).
10. Returns nothing for plain prose.

### C. `findAssetMentions` — extra (user) tickers
11. Links a user-supplied ticker not in the registry (`PLTR` via `extraTickers`).
12. Ignores extra tickers absent from the text.

### D. `findAssetMentions` — ordering & overlap
13. Returns multiple mentions ordered by position.
14. Does not double-count a cashtag and its overlapping bare ticker.

### E. `findAssetMentions` — input hygiene
15. Handles empty / null / undefined / non-string input → `[]`.

### F. `splitTextWithAssets`
16. Splits into ordered plain + asset segments.
17. Returns a single plain segment when no asset present.
18. Returns `[]` for empty / null text.
19. Handles an asset at the very start / whole string.

### G. `ASSET_REGISTRY` integrity
20. Every entry has a ticker and at least one name.

### H. `AssetText` component
21. Renders an asset mention as a clickable link (`data-ticker`, `role="link"`); click fires
    `onAssetClick(ticker)`.
22. Activates the link via keyboard (Enter).
23. Renders plain text with no links when there is no asset.
24. Falls back to `navigate('/stock/<TICKER>')` when no `onAssetClick` is given (renders a link).
25. Links a user holding passed via `extraTickers`.

### I. Integration — message components
26. `HeroMessage` renders a clickable asset inside the (quoted) reply.
27. `UserMessage` renders a clickable asset inside the user's question.

## Results (latest run)

- **Feature file:** 27/27 pass.
- **Full suite:** 235/235 pass (100% > 95% target).
- **Coverage (feature files):** `assetLinks.js` 100% lines, `AssetText.jsx` 100% lines — both clear
  the 80% gate.
- **Build:** `npm run build` ✓.

Discovered issues and their resolution are appended to `task.md` under
"QA findings — asset-mention feature".
