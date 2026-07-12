# T-15 SellScreen.jsx: council to mentor copy

## Goal
Sell flow inline hero prompt says "mentor" instead of "council".

## Files/modules touched
- `app/src/screens/trade/SellScreen.jsx:85`
- `app/src/test/ux-content.test.jsx`

## Dependencies
None.

## Context pointers
- Gam2req.md §3 Phase 4 table: "Ask your council first" → "Ask your mentor first".
- CLAUDE.md Trade Flow Rules: sell flow always shows a Hero inline comment (question form only) and a post-sell reflection prompt — this copy fix must preserve that question-form constraint (do not turn it into a directive).

## Implementation Notes
- `app/src/screens/trade/SellScreen.jsx:85` — GhostCTA label changed from
  `"Ask your council first"` to `"Ask your mentor first"`. Pure string swap; still a
  question-adjacent prompt CTA (not a directive/imperative), preserving the CLAUDE.md
  Trade Flow Rules constraint. The nearby actual hero question line ("has anything
  changed about AAPL…") was untouched.
- Test note: the task pointed at `app/src/test/ux-content.test.jsx`, but grepping showed
  no existing assertion on this copy there. The GhostCTA only renders in the
  with-position state, which `app/src/test/trade.test.jsx` already exercises. Added the
  mentor-copy assertion to the existing "shows holdings, quantity choices, and the hero
  question" test in `app/src/test/trade.test.jsx:26-27` rather than ux-content.test.jsx.

## Test Plan
- Targeted: `npx vitest run src/test/trade.test.jsx` → 6/6 passed (includes new
  `toContain('Ask your mentor first')` + `not.toContain('council')` assertions).
- Full suite: `npx vitest run` → 46 files, 960/960 tests passed. No regressions.

## Status
Status: TODO

## QA Results

Verification performed independently against actual current code (not narrative). All claims confirmed accurate.

1. **SellScreen.jsx CTA change — PASS.** Line 85 confirmed: `<GhostCTA label="Ask your mentor first" onClick={() => navigate('/ask')}/>`. Pure string swap, no other change to the element. Phrasing remains a soft prompt ("Ask ... first"), not an imperative directive — consistent with CLAUDE.md Trade Flow Rules (the actual hero comment stays the separate, untouched Warren Buffett question block at lines 114-122: "Has anything changed about {ticker} as a business — or just the price?"). No other "council" string remains anywhere in SellScreen.jsx (confirmed via full grep of the file's grep hits — zero).

2. **Repo-wide "council" grep — PASS.** Ran `grep -rni "council" app/src/`. Remaining hits are all expected/pre-existing and outside this task's scope:
   - `councilSize` gamification gauge/metric across `gamification/defs.js`, `gamification/stateProvider.js`, `gamification/useGamification.jsx`, and associated test files (`gamekit.conditions.test.js`, `gamekit.e2e.test.js`, `gamification.defs.test.js`, `gamification.stateProvider.test.js`) — distinct internal metric name, not user-facing copy, confirmed correct in prior tasks.
   - `data/mentor.md:43` — deliberate "deferred feature" note ("Multi-hero council ... is deferred to a...") from T-10, documentation only.
   - `hooks/useAchievements.js:7,9` — legacy DB value alias comment/logic (`'council'` → `'mentor'` migration shim), not UI copy.
   - `hooks/useChangeHero.js:6` — code comment referencing "council" as an internal concept, not rendered text.
   - `test/gamification.achievementStore.test.js` — tests the legacy `'council'` DB achievement_type value alias, not UI copy.
   - `test/hooks.test.jsx:177-179` — tests the legacy-row-alias behavior, not UI copy.
   - `App.jsx:60` (`'hero-handoff': 'Your Council'`) and `test/screens.smoke.test.jsx:72-81` — this is the HeroHandoff/AskTab screen's own copy, a **separate, pre-existing task's scope** (not T-15/SellScreen). Flagging for awareness only: it is NOT part of this task's touched files and the dev-engineer did not claim to fix it, so not a miss for T-15. Note for future QA: if a "purge all council copy" ticket exists, this line + its "Your Council" string are still outstanding — worth confirming against Gam2req.md's full scope, not just §3 Phase 4 (which quotes only the SellScreen CTA line).
   - `test/untestedComponents.test.jsx:66-68` — tests absence of "council slots" language elsewhere, unrelated screen.
   No orphaned/missed "council" string was found within SellScreen.jsx or its test.

3. **Test file claims — PASS.** `app/src/test/ux-content.test.jsx` was checked (grep for council/mentor/GhostCTA/SellScreen): it imports `SellScreen` (line 39) and renders it (line 63) for unrelated assertions (likely tooltip/glossary content), but has zero assertions on the CTA copy — confirms dev-engineer's claim of "no existing assertion on this copy" there. `app/src/test/trade.test.jsx` lines 26-28 contain the new assertions exactly as claimed: `expect(document.body.textContent).toContain('Ask your mentor first')` and `expect(document.body.textContent).not.toContain('council')`, appended to the existing "shows holdings, quantity choices, and the hero question" test.

4. **Targeted test run — PASS.** `npx vitest run src/test/trade.test.jsx` → 1 file, 6/6 tests passed. Matches claim exactly.

5. **Full suite run — PASS.** `npx vitest run` → 46 files passed, 960/960 tests passed, 0 failures. Matches claim exactly. No regressions.

6. **Scope check — PASS.** `git diff` on the two touched files shows exactly: (a) SellScreen.jsx — single-line label string swap, nothing else changed; (b) trade.test.jsx — three added lines (one comment + two assertions) inserted into the existing test, nothing else changed. `git status --short` for these two paths shows only `SellScreen.jsx` and `trade.test.jsx` as modified (ux-content.test.jsx, HeroHandoff.jsx, HeroChatPanel.jsx, gamification/* not touched by this change). Per T-16 QA precedent, broader `git status` includes accumulated uncommitted changes from other kanban tasks — this was not mistaken for T-15 scope creep; verification was scoped to the two files named in Implementation Notes.

### Discrepancies
None. All dev-engineer claims (line number, exact old/new string, test file substitution rationale, targeted 6/6, full-suite 960/960 across 46 files) match the actual code and actual test run output exactly.

### Overall Verdict: PASS

