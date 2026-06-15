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
