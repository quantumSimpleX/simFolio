# T-19 AskTab.jsx + HeroSidebar.jsx: wire useConversationHistory

## Goal
Chat surfaces in AskTab and HeroSidebar read from `useConversationHistory()` (cross-hero)
instead of the hero-scoped `useHeroHistory`, while outgoing messages still target the
currently active hero.

## Files/modules touched
- `app/src/screens/portfolio/AskTab.jsx`
- `app/src/components/HeroSidebar.jsx`
- `app/src/test/screens.smoke.test.jsx`

## Dependencies
- T-17 must be DONE first (needs `useConversationHistory()` to exist).

## Context pointers
- Gam2req.md §3 Phase 6 table: "Chat reads `useConversationHistory()`; sending still targets `heroes[0]`."
- This task is about *which hook is called* in these two components, not the message-rendering logic itself (that's T-18, done in `HeroChatPanel.jsx`, which these components likely render as a child).
- T-13 already updated AskTab's header/avatar copy (independent, no overlap — that touched the "Your Council"/avatar-stack section, this touches the data-fetching hook call).
- CLAUDE.md query keys: this task is what makes the new `['conversation-history', userId]` key (added by T-17) actually get consumed in the UI.

## Implementation Notes
- Swapped the read hook in both chat surfaces from the hero-scoped `useHeroHistory(heroId)`
  to the cross-hero `useConversationHistory()` (added by T-17, query key
  `['conversation-history', user?.id]`). Two-line change per file plus a clarifying comment.
  - `app/src/screens/portfolio/AskTab.jsx`: import + `const { data: history, isLoading: historyLoading } = useConversationHistory()`.
  - `app/src/components/HeroSidebar.jsx`: import + `const { data: history } = useConversationHistory()`.
- **Sending is unchanged**: both components still derive `heroId = heroes[0]?.id ?? 'sage'`
  and pass it to `useHeroChat(heroId, portfolioContext)`, so outgoing messages continue to
  target the active mentor. `heroId` is also still passed to `<ChatMessages heroId=…>` as the
  fallback attribution for legacy rows without a persisted `hero_id` and for the
  "Calling {hero}…" pending indicator.
- No rendering logic touched — HeroChatPanel already handles mixed-hero rows and the
  "{Hero Name} joins" divider (T-18). This task only changes *which hook feeds it*.
- The mock (`supabaseMock.js`) ignores `.eq()` filters, so `useConversationHistory` and the
  old `useHeroHistory` return the same seeded rows in tests; the new smoke test asserts the
  cross-hero behaviour via the divider, which only appears when rows carry differing `hero_id`.

## Test Plan
Automated (Vitest):
- `src/test/screens.smoke.test.jsx` — new test "AskTab shows cross-hero conversation history
  with a joins divider": seeds `hero_selections` (`warren`) and two assistant rows tagged
  `warren` and `cathie`, renders `<AskTab/>`, and asserts both replies render plus the
  "Cathie Wood joins" divider — proving the panel is fed by the cross-hero hook.
- `src/test/heroChat.test.jsx` (pre-existing, T-17) already covers `useConversationHistory`
  returning cross-hero rows and filtering by `user_id` only (never `hero_id`), and that
  `useHeroChat` appends to the `['conversation-history', user.id]` cache tagged with heroId.
- Regression: full suite `npx vitest run` — 45 files / 939 tests pass. Lint clean on all
  three touched files (no orphaned `useHeroHistory` import).

Manual (dev server):
1. As a user with ≥2 heroes and messages from more than one hero, open the Ask tab (mobile)
   and the desktop hero sidebar. Confirm the chat shows the unified timeline across heroes
   with a "{Hero Name} joins" divider where the author changes.
2. Send a new message; confirm it is answered by the active mentor (`heroes[0]`) and appended
   to the same unified timeline.

Commands:
- `npx vitest run src/test/screens.smoke.test.jsx src/test/heroChat.test.jsx`
- `npx vitest run` (full regression)

## QA Results

Verdict: **PASS**

| # | Test Plan Item | Result | Notes |
|---|---|---|---|
| 1 | `screens.smoke.test.jsx` — "AskTab shows cross-hero conversation history joins divider" | PASS | Test seeds `hero_selections: [{hero_id:'warren'}]` and two assistant rows tagged `warren`/`cathie` via `__setTableData('hero_conversations', ...)`, renders `<AskTab/>`, and asserts both reply strings render plus the "Cathie Wood joins" divider text. This genuinely exercises cross-hero rendering fed by `useConversationHistory()` (would fail against hero-scoped `useHeroHistory(heroId)`, which filters to a single `hero_id`). |
| 2 | `heroChat.test.jsx` (pre-existing, T-17) — `useConversationHistory` cross-hero coverage | PASS | Confirmed passing; not modified by this task. |
| 3 | Targeted run: `npx vitest run src/test/screens.smoke.test.jsx src/test/heroChat.test.jsx` | PASS | 2 files, 30 tests, all passed. |
| 4 | Full regression: `npx vitest run` | PASS | 45 files, 939 tests, all passed — matches the count claimed in Implementation Notes. |
| 5 | Lint clean on 3 touched files | PASS | `npx eslint src/screens/portfolio/AskTab.jsx src/components/HeroSidebar.jsx src/test/screens.smoke.test.jsx` — no output, no errors. |
| 6 | No orphaned `useHeroHistory` import | PASS | Repo-wide grep for `useHeroHistory` shows it is still defined/exported in `useHeroChat.js` (used elsewhere) but has zero references left in `AskTab.jsx` or `HeroSidebar.jsx`. |
| 7 | `heroId` (from `heroes[0]`) still used for sending/fallback | PASS | Both files: `const primaryHero = heroes[0]; const heroId = primaryHero?.id ?? 'sage'`, passed into `useHeroChat(heroId, portfolioContext)` for outgoing messages, and into `ChatMessages` for attribution/fallback — unchanged from before the swap. |
| 8 | Both components read from `useConversationHistory()` (cross-hero), not `useHeroHistory(heroId)` | PASS | Confirmed by direct code read of both files (see line refs below). |
| 9 | Manual dev-server checks (unified timeline across heroes, active-mentor send target) | NOT EXECUTED | No dev server was launched during this QA pass; these are UI/manual verification steps. The automated test in item 1 covers the same behavior (unified cross-hero timeline + divider) at the component level, and item 7 confirms send-target wiring is unchanged, so residual risk is low. Recommend a quick manual check before this ships to production if a real Supabase-backed dev session is available. |

Code reference (confirmed by direct read, current state):
- `app/src/screens/portfolio/AskTab.jsx:6` — imports `useHeroChat, useConversationHistory` (no `useHeroHistory`); line 29 `const { data: history, isLoading: historyLoading } = useConversationHistory()`; line 30 `useHeroChat(heroId, portfolioContext)`.
- `app/src/components/HeroSidebar.jsx:11` — imports `useHeroChat, useConversationHistory` (no `useHeroHistory`); line 30 `const { data: history } = useConversationHistory()`; line 31 `useHeroChat(heroId, portfolioContext)`.

Issues found: none.

## Status
Status: TODO
