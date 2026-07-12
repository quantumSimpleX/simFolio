# T-17 useHeroChat.js: useConversationHistory hook

## Goal
New `useConversationHistory()` hook returns all of a user's chat messages across heroes
(no `hero_id` filter), giving the UI the data needed to render cross-hero chat history.
This is the shared contract T-18 and T-19 depend on.

## Files/modules touched
- `app/src/hooks/useHeroChat.js`
- `app/src/test/heroChat.test.jsx`

## Dependencies
None.

## Context pointers
- Gam2req.md §3 Phase 6 table: `hero_conversations` already stores `hero_id` per row — no schema change needed. New `useConversationHistory()`: like existing `useHeroHistory` but selects `hero_id`, has no `.eq('hero_id')` filter, query key `['conversation-history', user?.id]`, limit ~100 rows (pagination is an explicit follow-up, not in scope here).
- `useHeroChat`'s `onMutate`/`onSuccess` must also optimistically append to, and invalidate, this new key (the user message should be tagged with the current `heroId`), in addition to whatever it already does for the hero-scoped key.
- Keep `useHeroHistory` intact for existing hero-scoped call sites — this is additive, not a replacement.
- The LLM context in the `hero-chat` edge function stays per-hero (personas must not inherit each other's replies) — this task is client-side read/display only, do not touch `app/supabase/functions/hero-chat`.
- CLAUDE.md query-keys convention: existing keys are `['portfolio']`, `['orders']`, `['quotes', ticker]`, `['hero-history', userId, heroId]` — this adds `['conversation-history', userId]` to that list (T-11 updates the doc).

## Implementation Notes

`app/src/hooks/useHeroChat.js`:
- Added `useConversationHistory()` — mirrors `useHeroHistory` but:
  - selects `hero_id` in addition to `role, content, created_at, model` (so the unified view can attribute each message to a hero),
  - has **no** `.eq('hero_id', ...)` filter (returns all of a user's messages across heroes),
  - query key `['conversation-history', user?.id]` (per CLAUDE.md convention),
  - `limit(100)` (pagination is an explicit follow-up, out of scope),
  - `enabled: !!user` (no `heroId` gate, unlike the hero-scoped hook),
  - keeps the same `model`-column fallback retry as `useHeroHistory` so it works before the `model` migration is applied.
- `useHeroHistory` left fully intact — this is additive for existing hero-scoped call sites.
- `useHeroChat` mutation now maintains the cross-hero cache alongside the hero-scoped one:
  - `onMutate` cancels + snapshots both keys, and optimistically appends the user message to both. The cross-hero copy is tagged with `hero_id: heroId`; both copies share one `created_at` timestamp.
  - `onError` rolls back both caches from the snapshot (`previous`, `previousConvo`).
  - `onSuccess` invalidates both keys so the authoritative server rows are refetched.
- Did **not** touch `app/supabase/functions/hero-chat` — LLM context stays per-hero; this task is client-side read/display only.

## Test Plan

`app/src/test/heroChat.test.jsx`:

Existing `useHeroChat` optimistic-update tests remain (hero-scoped immediate append + rollback). Added:

1. **Cross-hero optimistic append** — after `mutate('Is AAPL overvalued?')` on hero `warren`, the `['conversation-history','test-user']` cache's last entry matches `{ role:'user', content:'Is AAPL overvalued?', hero_id:'warren' }` while the LLM call is still pending. Verifies the message is mirrored to the new key and tagged with the current heroId.
2. **Both-cache rollback on error** — with pre-seeded assistant rows in both caches, a failing `invoke` restores the conversation-history cache to its exact prior value. Verifies `onError` rolls back `previousConvo`, not just the hero-scoped snapshot.
3. **Cross-hero fetch, no hero filter** (`useConversationHistory`):
   - Seeds `hero_conversations` with rows from two heroes (`warren`, `cathie`); the resolved `data` contains both — confirms no hero scoping.
   - Inspects the mock query builder: `.eq` is called with `user_id` and **never** `hero_id`.
   - Asserts the `.select(...)` string includes `hero_id`.

Manual/follow-up not automated here: pagination beyond 100 rows, and the `model`-column fallback path (already covered structurally by the shared pattern with `useHeroHistory`).

Run: `npx vitest run src/test/heroChat.test.jsx` → 8 passed. Full suite `npx vitest run` → 907 passed.

## QA Results

Verified against `app/src/hooks/useHeroChat.js` and `app/src/test/heroChat.test.jsx` as actually committed (not just the notes above).

**Test run:**
- `npx vitest run src/test/heroChat.test.jsx` → 8 passed (matches dev-engineer's claim).
- `npx vitest run` (full suite) → 45 files, **927 passed**, 0 failed. Dev-engineer's note says "907 passed" — the full-suite count is now 927; not a regression (no failures), just a stale number in the notes, likely from other work landing in parallel. No action needed.

**Test-plan item verification:**

1. **Cross-hero query has no `.eq('hero_id', ...)` filter** — PASS. `useConversationHistory` (useHeroChat.js:59-64, retry path 68-73) only calls `.eq('user_id', user.id)`; no `.eq('hero_id', ...)` anywhere in the function. Confirmed directly in code and by test `useConversationHistory > returns cross-hero rows (no hero_id filter) and selects hero_id` (heroChat.test.jsx:155-177), which asserts `eqCols` contains `user_id` and does **not** contain `hero_id`, and that rows from both `warren` and `cathie` are returned.

2. **Query key is `['conversation-history', user?.id]`** — PASS. useHeroChat.js:57, matches CLAUDE.md convention exactly and matches `CONVO_KEY` used in tests (heroChat.test.jsx:54).

3. **Optimistic append tags the user's own message with heroId** — PASS. useHeroChat.js:118-121, the `convoKey` optimistic entry includes `hero_id: heroId`. Covered by test `also appends the message to the cross-hero conversation cache, tagged with heroId` (heroChat.test.jsx:96-117), which asserts the last entry matches `{ role:'user', content:'Is AAPL overvalued?', hero_id:'warren' }` while the call is still pending.

4. **Existing `useHeroHistory` untouched/still hero-scoped** — PASS. useHeroHistory.js:17-48 is byte-for-byte the same shape as before this task (query key `['hero-history', user?.id, heroId]`, `.eq('hero_id', heroId)` filter still present, `enabled: !!user && !!heroId`). No hero-scoped call sites were touched.

**Additional checks performed:**
- Rollback: `onError` restores both `key` and `convoKey` from `ctx.previous`/`ctx.previousConvo` (useHeroChat.js:124-129); covered by both `rolls back both caches when the call fails` and `rolls the optimistic message back when the call fails` tests.
- `onSuccess` invalidates both `key` and `convoKey` (useHeroChat.js:130-133) — matches implementation notes.
- Confirmed `app/supabase/functions/hero-chat` was not touched (out of scope per task, LLM context stays per-hero) — grepped, no diff there.
- `model`-column fallback retry pattern is structurally mirrored from `useHeroHistory` into `useConversationHistory` (lines 65-76) as claimed; not separately unit-tested (matches the dev-engineer's stated manual/follow-up note — acceptable, same pattern already covered for `useHeroHistory`).

**Verdict: PASS.** No issues found. Implementation matches the task spec, all test-plan items verified against actual code (not just asserted), and the full suite shows zero regressions.

## Status
Status: TODO
