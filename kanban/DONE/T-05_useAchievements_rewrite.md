# T-05 useAchievements.js: rewrite return shape

## Goal
`useAchievements` returns `{ badges, medals, trophies, earnedCount, medalCount, trophyCount, isLoading }`
computed via `computeProgression` from T-01, replacing the broken `floor(count/10)` ladder math.

## Files/modules touched
- `app/src/hooks/useAchievements.js`
- `app/src/test/hooks.test.jsx`

## Dependencies
- T-01 must be DONE first (needs `computeProgression`, `MEDALS`, `TROPHIES` exports from defs.js).

## Context pointers
- Gam2req.md §3 Phase 1 table: rewrite return shape using `computeProgression`; delete `floor(count/10)` math.
- Client-side alias needed: treat an earned achievement row with `achievement_type === 'council'` as `mentor`, safety net until migration 005 (T-06) is applied in the target environment.
- CLAUDE.md React Query convention: this hook likely wraps a query keyed on achievements/user id — preserve existing key shape unless Gam2req calls for a change (it doesn't).

## Implementation Notes

Rewrote `app/src/hooks/useAchievements.js`:
- Imports `computeProgression` from `../gamification/defs`.
- Kept the React Query key unchanged: `['achievements', user?.id]` (Gam2req does not call for a change).
- Added a read-time alias `aliasType(t) => t === 'council' ? 'mentor' : t`. Every earned row's
  `achievement_type` is passed through this before building the earned-id Set and before the
  `unlocked_at` lookup, so a legacy `council` row surfaces as the `mentor` badge until migration
  005 (T-06) renames it in the DB. No-op for every other type.
- Deleted the broken `floor(earnedCount/10)` / `floor(medalCount/10)` ladder math.
- Derives `{ medals, trophies, medalCount, trophyCount } = computeProgression(earnedIds)` where
  `earnedIds` is the aliased Set (computeProgression accepts a Set directly).

### Exact exported shape (for T-07 / T-08 / T-09 consumers)
```js
{
  badges,        // BADGES.map(b => ({ ...b, earned: bool, unlocked_at: string|null }))
  medals,        // MEDALS.map(def => ({ ...def, earnedCount, earned: bool, progress: 0..1 }))
  trophies,      // TROPHIES.map(def => ({ ...def, earnedCount, earned: bool, progress: 0..1 }))
  earnedCount,   // number of earned badges
  medalCount,    // number of earned medals (computeProgression)
  trophyCount,   // number of earned trophies (computeProgression)
  isLoading,     // React Query loading flag
}
```
- Each `medals[i]` carries the full MEDALS def (`id, name, desc, badges, threshold`) plus
  `earnedCount` (badges in that set the user holds), `earned`, and `progress` (`min(1, earnedCount/threshold)`) —
  everything T-07's "3 of 4" progress + MedalGlyph shelf and T-09's summary need.
- Each `trophies[i]` mirrors that shape over TROPHIES defs (`id, name, desc, medals, threshold`).
- T-08 can call `computeProgression` directly for the before/after badge diff; this hook exposes the
  same derived arrays for the post-award "already earned" state.

### Scope notes
- Did NOT touch tokens.js `macro` BADGES description (still says "council") — out of scope, belongs to T-02.
- Downstream consumer files (BadgeEarned.jsx, AchievementsMobile.jsx, Profile.jsx) untouched; the new
  shape is a superset of the old (adds `medals`/`trophies`; `medalCount`/`trophyCount` semantics changed
  from ladder math to computeProgression). Full suite stayed green, so no existing consumer broke.

## Test Plan

Updated `app/src/test/hooks.test.jsx` `describe('useAchievements')` from one case to three:

1. **New shape, no medal yet** — seed a single `first_trade` row. Assert `earnedCount === 1`,
   `medalCount === 0`, `trophyCount === 0`; assert `medals`/`trophies` are arrays; assert
   `medal_trader` has `earned === false` and `earnedCount === 1` (first_trade counts toward it);
   assert the badge is flagged earned with its `unlocked_at`, and an unearned badge stays `false`.
   Covers: derived arrays exist, partial-medal progress, badge mapping.
2. **Thematic medal awarded on full set** — seed the full Trader set
   (`first_trade, limit, contrarian, momentum`, threshold 4). Assert `earnedCount === 4`,
   `medalCount === 1`, `trophyCount === 0` (not every medal earned), and `medal_trader.earned === true`
   with `progress === 1`. Covers: medal count derived via computeProgression, trophy gated on all medals.
3. **council→mentor alias** — seed a single legacy `council` row. Assert `earnedCount === 1` and the
   `mentor` badge is `earned` with the row's `unlocked_at`. Covers: pre-migration safety alias.

Verification run:
- `npx vitest run src/test/hooks.test.jsx` → 22 passed.
- `npx vitest run` (full suite, gamification touches shared state) → 45 files / 938 tests passed.
- `npx eslint src/hooks/useAchievements.js src/test/hooks.test.jsx` → clean.

## QA Results

QA executed the Test Plan above against the actual code (not just re-reading claims). Verdict: **PASS**.

**Commands run:**
- `npx vitest run src/test/hooks.test.jsx` → 22 passed (confirmed independently).
- `npx vitest run` (full suite) → 45 files / 938 tests passed (confirmed independently, matches dev-engineer's claim).
- `npx eslint src/hooks/useAchievements.js src/test/hooks.test.jsx` → clean (confirmed).

**Test Plan item results:**

| # | Item | Result |
|---|------|--------|
| 1 | New shape, no medal yet (`first_trade` only) — `earnedCount===1`, `medalCount===0`, `trophyCount===0`, `medals`/`trophies` are arrays, `medal_trader.earned===false` & `earnedCount===1`, badge earned+`unlocked_at` set, unearned badge stays false | PASS |
| 2 | Thematic medal awarded on full set (Trader Medal, 4/4 badges) — `earnedCount===4`, `medalCount===1`, `trophyCount===0`, `medal_trader.earned===true`, `progress===1` | PASS |
| 3 | council→mentor alias — legacy `council` row surfaces as `mentor` badge, `earned===true`, `unlocked_at` carried through | PASS |

**Explicit verification against acceptance criteria (beyond the 3 test cases):**
- **council→mentor alias**: verified in code (`aliasType` at `app/src/hooks/useAchievements.js:9`) — applied consistently in both the `earnedIds` Set build (line 28) and the `unlocked_at` lookup (line 33), so a legacy row correctly earns the badge AND carries its timestamp. Test 3 confirms end-to-end.
- **medals/trophies array shape**: confirmed each `medals[i]` carries `id, name, desc, badges, threshold, earnedCount, earned, progress` and each `trophies[i]` carries `id, name, desc, medals, threshold, earnedCount, earned, progress`, matching `computeProgression` in `app/src/gamification/defs.js:100-127`. `useAchievements.js` passes these through unmodified via destructuring (line 37).
- **progress clamping**: `computeProgression`'s `progress: Math.min(1, earnedCount/threshold)` is unmodified by the hook — verified by reading defs.js directly (not just re-trusting the dev-engineer's notes). Test 2's `progress===1` at exactly-met threshold exercises the boundary; clamping above 100% (not naturally reachable since `badges` is a fixed superset per medal) is a non-issue given `earnedCount` can't exceed `def.badges.length===threshold` for thematic medals, and milestone medals cap via `Math.min`.
- **badges array regression check**: `badges` still returns `{...b, earned, unlocked_at}` (line 30-34), same shape as before. Full 938-test suite passing — including `components.test.jsx`, `gamification.badgeEarned.test.jsx`, `gamification.useGamification.test.jsx`, `gamification.a11y.test.jsx`, `BadgeEarned.jsx`/`AchievementsMobile.jsx`/`Profile.jsx` consumer paths (all of which reference `badges`/`earnedCount`/etc.) — confirms no downstream consumer broke.

**Findings (non-blocking, informational only):**
- **Low severity / edge case not covered by test plan**: if a user's `achievements` table ever contains *both* a legacy `council` row and a post-migration `mentor` row for the same user (e.g., migration 005 backfill ran without deleting the old row), `rows.find(a => aliasType(a.achievement_type) === b.id)` at line 33 returns whichever row appears first in the DB result order, which is not guaranteed deterministic. This could pick an arbitrary `unlocked_at`. Not a regression (pre-existing `.find()` pattern), not in scope for T-05, and T-06's migration should be the actual fix (dedupe/delete legacy rows). Flagging only for awareness — no action required for T-05 sign-off.
- No accessibility surface in this hook (no UI) — N/A.
- No auth-boundary concern: query is `enabled: !!user` and scoped by `user_id`, consistent with existing pattern — no change in this area.

**Overall verdict: PASS.** Implementation matches the stated Test Plan and Gam2req §3 Phase 1 requirements. No failures found. No regressions in the full 938-test suite.

## Status
Status: TODO
