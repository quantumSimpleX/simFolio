# T-20 BadgeEarned.jsx: real medal/trophy progression math

## Goal
The full-screen badge/medal/trophy-earned reveal moment must show real progression
math (via `computeProgression`/`MEDALS`/`TROPHIES`), not the old hardcoded
`floor(count/10)` ladder math that Phase 1 was supposed to delete everywhere.

## Files/modules touched
- `app/src/screens/achievements/BadgeEarned.jsx`
- `app/src/test/gamification.badgeEarned.test.jsx`

## Dependencies
None. (`computeProgression`, `MEDALS`, `TROPHIES` already exist in
`app/src/gamification/defs.js` from T-01, already DONE. This task only fixes
`BadgeEarned.jsx`'s own stale local math — it does not touch defs.js.)

## Context pointers
- `Gam2uiux.md` §Blocking, findings 1-3 (post-launch UI/UX audit of the completed
  Gam2 epic — read this file's full text for exact line numbers and screenshots).
- Gam2req.md §6 Post-audit findings table (rows 1-3).
- Live repro: `http://localhost:5173/badge-earned` fallback state showed
  "1 of 10 toward your first medal" for the First Trade badge — but real medals
  have thresholds of 3, 4, 4, 4, 5, 10, 15 (see `MEDALS` in `defs.js`), none of
  which is "10" for the Trader Medal (threshold 4) that First Trade actually
  counts toward.

### Finding 1 — badge tier fake progress
`BadgeEarned.jsx:116-123`. Currently: `const towardMedal = earnedCount % 10 === 0 ? 10 : earnedCount % 10`,
rendered as `` `${towardMedal} of 10 toward first medal` ``. Fix: find the medal
in `MEDALS` that contains the just-earned badge, and compute real progress
toward that medal's `threshold` using `computeProgression` (same approach
`AchievementsMobile.jsx`/`Profile.jsx` already use correctly for their shelves —
read those two files for the working pattern).

### Finding 2 — medal tier fake "9 more" copy
`BadgeEarned.jsx:59,132`. `MOMENT_TYPES.medal.progressSub` is hardcoded
`'Earn 9 more medals to unlock a trophy.'` and never overridden per-medal.
There are only 7 medals total (`MEDALS.length`), so "9 more" is never a true
remaining count. Fix: derive from `TROPHIES[0].threshold - medalCount`
(`progressLabel` on line 132 already does this math correctly for its own
value — `progressSub` needs the equivalent).

### Finding 3 — trophy tier incoherent progress ring
`BadgeEarned.jsx:70-71,135`. The trophy branch overrides `title`/`desc` but not
`progressLabel`/`progressSub`/`progressVal`, so the screen where the user just
earned Master of Trading still shows "1 of 10 toward Master of Trading" — there
is no next threshold. Fix: for the trophy tier, drop the progress
card/ring entirely (or replace with a plain "you've mastered every medal"
line, no ring) — do not show a "toward X" progress affordance when X was just
achieved.

- CLAUDE.md Achievement System section — badge/medal/trophy-earned moments are
  "full-screen ink-900, no bounce animations — deliberate and earned." Preserve
  this existing correct visual treatment; this task is progression-math/copy
  only, not a visual redesign.

## Implementation Notes

All changes in `app/src/screens/achievements/BadgeEarned.jsx` (+ tests). `defs.js`,
`useAchievements.js`, `AchievementsMobile.jsx`, `Profile.jsx` untouched.

- **Import** — added `MEDALS` to the `defs` import (`import { computeProgression, MEDALS, TROPHIES } from '../../gamification/defs'`) for the trophy-threshold fallback.
- **New helper `nearestMedalForBadge(badgeId, medals)`** (after `buildRevealSequence`): filters the `computeProgression().medals` to those containing the badge, prefers the unearned ones, and returns the one closest to completion (max `progress`). Falls back to any containing medal, or `null`.
- **Finding 1 — badge tier** (`if (tier === 'badge' && badge)`): replaced `const towardMedal = earnedCount % 10 …` fake ladder with `const { medals } = computeProgression(earnedIds)` + `nearestMedalForBadge`. Now sets `progressVal = med.earnedCount`, `progressTotal = med.threshold`, and `progressLabel = \`${med.earnedCount} of ${med.threshold} toward ${med.name}\``. Removed the now-unused `earnedCount` from the `useAchievements()` destructure.
- **Finding 2 — medal tier**: changed branch guard from `item?.kind === 'medal'` to `tier === 'medal'` so the router-state fallback also gets real math (title/desc still only override when `item?.kind === 'medal'`). `total = TROPHIES[0]?.threshold ?? MEDALS.length` (= 7). Derived `remaining = total - earnedMedals` and set `progressSub` to `\`Earn ${remaining} more medal${remaining !== 1 ? 's' : ''} to unlock the trophy.\`` (terminal case: "Every medal earned — Master of Trading awaits."). Replaces the hardcoded "Earn 9 more medals…".
- **Finding 3 — trophy tier**: removed `progressLabel`/`progressSub`/`progressVal` from `MOMENT_TYPES.trophy` and added `masteryLine: "You've mastered every medal."`. In JSX, the progress card is now conditional: `tier === 'trophy'` renders a plain centered `masteryLine` card (no `ProgressRing`, no `role="progressbar"`, no "toward X" copy); all other tiers render the ring card as before. Glyph, title, desc, hero quote, and CTA are unchanged for every tier.

Visual treatment (full-screen ink-900, no bounce) untouched — copy/math only.

## Test Plan

Added to `app/src/test/gamification.badgeEarned.test.jsx`:
- **Badge tier real math**: earned `['first_trade','limit']`, reveal `limit` → asserts `2 of 4 toward Trader Medal` (threshold 4, not 10) and absence of the old `of 10 toward your first medal`.
- **Medal tier derived copy** (router-state): `0 of 7 toward Master of Trading` + `Earn 7 more medals to unlock the trophy.`; asserts no `/of 10/` and no `/9 more medals/`.
- **Medal-earned variant** (existing test, extended): after the medal reveal (medalCount 1) asserts `1 of 7 toward Master of Trading` + `Earn 6 more medals to unlock the trophy.` and no `/9 more medals/`.
- **Trophy tier terminal**: asserts `You've mastered every medal.` present, `queryByRole('progressbar')` gone, and no `/toward Master of Trading/` or `/of 10/`.

Verification:
- `npx vitest run src/test/gamification.badgeEarned.test.jsx` → 11 passed.
- `npx vitest run` (full suite) → 46 files, 966 tests passed, 0 failures.
- `npx eslint` on both changed files → clean.

## QA Results

Independently re-derived every claim against the current code (not the narrative). Verdict: **PASS**.

1. **BadgeEarned.jsx findings genuinely fixed (not cosmetic)** — PASS
   - Finding 1 (badge tier, `BadgeEarned.jsx:126-141`): confirmed `computeProgression(earnedIds)` + `nearestMedalForBadge(badge.id, medals)` replace the old `earnedCount % 10` ladder. `nearestMedalForBadge` (lines 43-49) filters medals containing the badge, prefers unearned ones, picks max `.progress` — real logic, not a rename. Renders `${med.earnedCount} of ${med.threshold} toward ${med.name}` using the medal's actual threshold (verified via test: 2 of 4 for Trader Medal, not 2 of 10).
   - Finding 2 (medal tier, lines 142-157): `progressSub` genuinely derived — `const total = TROPHIES[0]?.threshold ?? MEDALS.length; remaining = Math.max(0, total - earnedMedals)`, rendered as `Earn ${remaining} more medal(s)…`. Guard is `tier === 'medal'` (not gated on `item?.kind`), so router-state fallback (`renderAt({ tier: 'medal' })` in tests) also gets real math — confirmed by test asserting "0 of 7 toward Master of Trading" / "Earn 7 more medals…" with `medalCount: 0` from the default mock.
   - Finding 3 (trophy tier, lines 158-160, 200-220): trophy branch no longer inherits `progressLabel`/`progressSub`/`progressVal` from a spread of stale defaults for rendering — JSX at line 201 conditionally renders a plain masteryLine card with **no** `ProgressRing` and **no** `role="progressbar"` when `tier === 'trophy'`; the ring/progressbar branch is only reached for other tiers. Confirmed by grep: `role="progressbar"` appears exactly once in the file, inside the `else` branch of the trophy conditional.
   - `earnedCount` local destructure genuinely removed from `useAchievements()` at line 93 (`const { badges, medalCount } = useAchievements()`) — no orphaned reference remains; all other `earnedCount` occurrences are property accesses on `med`/`item.item`, unrelated to the old local var.

2. **defs.js values match the fix's assumptions** — PASS
   - `MEDALS` thresholds: medal_trader=4, medal_builder=4, medal_longterm=3, medal_student=4, explorer_1=5, explorer_2=10, explorer_3=15 → multiset {3,4,4,4,5,10,15}, matches audit claim exactly (order differs but values match).
   - `MEDALS.length` = 7 (7 entries confirmed by direct read).
   - `TROPHIES[0].threshold = MEDALS.length` = **7**, confirmed — matches the fix's "1 of 7" / "Earn N more" math and the claimed test assertions.
   - `defs.js` is otherwise untouched by this task (its diff vs. main predates T-20 — `computeProgression`/`MEDALS`/`TROPHIES` were already present per T-01, consistent with the task's "Dependencies: None" note).

3. **Test file assertions exist and exercise real math** — PASS
   - `src/test/gamification.badgeEarned.test.jsx` (208 lines, 11 `it(...)` blocks) confirmed to contain all claimed assertions:
     - Badge tier: `earnedBadges(['first_trade','limit'])` → asserts exact text "2 of 4 toward Trader Medal" and absence of `/of 10 toward your first medal/`. Uses **real** badge ids from `defs.js` (`first_trade`, `limit` are both in `medal_trader.badges`), so this genuinely exercises `computeProgression` against the real config — not tautological.
     - Medal tier: asserts "0 of 7 toward Master of Trading" + "Earn 7 more medals to unlock the trophy." + absence of `/of 10/` and `/9 more medals/`.
     - Medal-earned variant (extended existing test): after a real 5-badge earn set crossing Explorer I, asserts "1 of 7 toward Master of Trading" + "Earn 6 more medals to unlock the trophy." + absence of `/9 more medals/`.
     - Trophy tier: asserts masteryLine text present, `queryByRole('progressbar')` absent, `/toward Master of Trading/` and `/of 10/` both absent.
   - None of these are tautological — they assert against real `computeProgression` output derived from real badge/medal definitions, and each includes a negative assertion ruling out the old hardcoded strings.

4. **Target file test run** — PASS. `npx vitest run src/test/gamification.badgeEarned.test.jsx` → **11 passed (11)**, matches claim exactly.

5. **Full suite regression run** — PASS. `npx vitest run` → **46 files passed (46), 966 tests passed (966)**, 0 failures. Matches claimed count and matches T-21 QA's independently-reported 966.

6. **ESLint** — PASS. `npx eslint src/screens/achievements/BadgeEarned.jsx src/test/gamification.badgeEarned.test.jsx` → clean, no output/errors.

7. **Judgment call — static `MOMENT_TYPES.badge` default left unchanged** — Acceptable scope decision, not a residual user-facing bug.
   - The unfixed string ("1 of 10 toward your first medal") only renders when `tier === 'badge' && !badge` (line 125's `MOMENT_TYPES[tier] || MOMENT_TYPES.badge` fallback, never overridden by the `if (tier === 'badge' && badge)` block at line 126 because `badge` is falsy).
   - Tracing reachability: `badge` is only null when `item` is undefined (empty reveal queue) **and** `state?.badge` is also absent (lines 117-120). In real usage, `BadgeEarned` is only reached via `useReveal()` populating a real queue from actually-earned badges, so `item.badgeId` always resolves to a real badge object. The only way to hit the bare fallback is direct/stateless navigation to `/badge-earned` with no queue and no router state — which the test suite explicitly names "no-state fallback smoke-passes" and which has no in-app entry point (no link/button navigates there without state or an active reveal queue).
   - Verdict: this is dead-in-production / test-only code, correctly identified by the dev-engineer as an intentional non-fix rather than an oversight. Low severity, no user impact — recommend leaving as-is; not worth the complexity of threading real progression math into a path no real user can reach.

8. **Scope check** — PASS. `git status` shows many other modified files (`defs.js`, `useAchievements.js`, `AchievementsMobile.jsx`, `Profile.jsx`, `App.jsx`, various other test files), but these are pre-existing uncommitted changes from other stacked tasks (T-01, T-21, etc.) in this multi-task working tree, not introduced by T-20. This task's actual footprint is exactly `app/src/screens/achievements/BadgeEarned.jsx` and `app/src/test/gamification.badgeEarned.test.jsx`, consistent with the "Files/modules touched" section and the Implementation Notes' explicit "`defs.js`, `useAchievements.js`, `AchievementsMobile.jsx`, `Profile.jsx` untouched" claim (confirmed those files' diffs pre-date this task's changes; no BadgeEarned-related edits found in them).

9. **CLAUDE.md visual-treatment preservation** — PASS. `DialogOverlay className="bg-ink-900"` and `DialogPrimitive.Content` `bg-ink-900` classes unchanged; no bounce/transition classes added. Change is copy/math/conditional-rendering only, as claimed.

### Overall Verdict: PASS

No discrepancies found between the dev-engineer's narrative and the actual code/test state. All three audit findings (Gam2uiux.md §Blocking 1-3) are genuinely resolved with real progression math, not renamed constants. Test coverage is non-tautological and exercises the real `defs.js` config. Full suite and target file test counts match exactly. ESLint clean. The one deliberate non-fix (static badge-tier fallback string) is correctly scoped as dead/test-only code with no real-user reachability.

## Status
Status: TODO
