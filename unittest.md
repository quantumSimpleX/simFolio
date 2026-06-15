# Unit Test Plan — Clickable Asset Mentions in Chat

Covers the "Interactive Asset Mentions" requirement: any stock / ETF / crypto mentioned in a chat
message renders as an underlined, clickable link that opens the asset's detail page
(`/stock/<TICKER>`) — the same destination as a Markets search hit.

- **Target:** ≥ 80% line coverage on the new feature files; overall suite pass rate > 95%.
- **Test file:** `app/src/test/assetLinks.test.jsx`
- **Run:** `cd app && npx vitest run src/test/assetLinks.test.jsx`
  Coverage: `cd app && npx vitest run --coverage src/test/assetLinks.test.jsx`

Detection links **known** assets (curated registry + the user's holdings/watchlist + explicit
cashtags) synchronously, and **validates** any other candidate (unknown cashtag, ALL-CAPS token, or
capitalized company name) against live market data before linking.

## Units under test

| File | What it does |
|------|--------------|
| `src/lib/assetLinks.js` | `findAssetSpans` (trusted vs validate spans), `resolutionKey`, `ASSET_REGISTRY` (pure) |
| `src/lib/resolveSymbol.js` | `resolveSymbol` / `matchRows` — confirm a candidate via symbol search, cached |
| `src/hooks/useAssetResolution.js` | Batches validation candidates through React Query |
| `src/components/AssetText.jsx` | Renders trusted links synchronously, validated links once resolved |
| `src/components/HeroMessage.jsx` | `HeroMessage` / `UserMessage` render replies/questions via `AssetText` |

## Test cases

### A. `findAssetSpans` — trusted (no-network) detection
1. Detects a cashtag for a known symbol (`$AAPL`) with correct `start`/`end`.
2. Detects a registry company name case-insensitively (`Apple`, `nvidia`, `Bitcoin`).
3. Detects a bare registry ticker (`NVDA`).
4. Matches a dotted registry ticker (`$BRK.B`).
5. Prefers the longest company name (`Berkshire Hathaway` over `Berkshire`).
6. Trusts a user holding/watchlist ticker via `knownTickers` (`PLTR`).

### B. `findAssetSpans` — validation candidates
7. Flags an unknown ALL-CAPS token as a `ticker` candidate (`AMD`).
8. Flags an unknown cashtag as a `cashtag` candidate (`$ZM`).
9. Flags an unknown capitalized proper noun as a `name` candidate (`Palantir`).
10. Does not flag common acronyms (`AI`, `CEO`, `ETF`) or common words.
11. Does not flag a ticker embedded in a larger word (`SPYWARE`).

### C. `findAssetSpans` — ordering, overlap, hygiene
12. Returns spans ordered by position.
13. Does not double-count a cashtag and its overlapping bare ticker.
14. Handles empty / null / undefined / non-string input → `[]`.

### D. `resolutionKey` / `ASSET_REGISTRY`
15. `resolutionKey` builds a stable upper-cased key.
16. Every registry entry has a ticker and at least one name.

### E. `matchRows` (pure match logic)
17. Matches a ticker candidate to an exact US symbol (`AMD`).
18. Matches a name candidate to a US instrument by name prefix (`Palantir` → `PLTR`).
19. Ignores non-US listings.
20. Returns null when nothing matches.

### F. `resolveSymbol` (live validation)
21. Resolves a name candidate via the symbol API and caches it (second call hits the cache — no
    second fetch).
22. Returns null for a non-asset, and on fetch error (cached).

### G. `AssetText` — trusted (synchronous) links
23. Renders a known ticker as a clickable link (`data-ticker`, `role="link"`); click fires
    `onAssetClick(ticker)`.
24. Activates a link via keyboard (Enter).
25. Renders plain prose with no links.
26. Links a user holding passed via `extraTickers`.
27. Falls back to `navigate('/stock/<TICKER>')` when no `onAssetClick` is given.

### H. `AssetText` — live-validated links
28. Links an unknown company once validated against market data (`Palantir` → `PLTR`).
29. Leaves an unrecognized capitalized word as plain text.

### I. Integration — message components
30. `HeroMessage` renders a clickable known asset inside the (quoted) reply.
31. `UserMessage` renders a clickable known asset inside the user's question.

## Results (latest run)

- **Feature file:** 31/31 pass.
- **Full suite:** 239/239 pass (100% > 95% target).
- **Coverage:** `assetLinks.js`, `AssetText.jsx`, and `resolveSymbol.js` all 100% lines; global
  86.93% lines (80% gate cleared).
- **Lint:** new files clean. **Build:** `npm run build` ✓.

Discovered issues and their resolution are appended to `task.md` under
"QA findings — asset-mention feature" and "QA findings — iteration 2".
