# T-09 Profile.jsx: medal-shelf summary

## Goal
Profile screen replaces the old 10/10/10 ladder copy with a medal-shelf summary consistent
with the new declarative progression model.

## Files/modules touched
- `app/src/screens/profile/Profile.jsx`
- `app/src/test/screens.smoke.test.jsx`
- `app/src/test/ux-content.test.jsx`

## Dependencies
- T-05 must be DONE first (consumes new `useAchievements` shape: medals/trophies/counts).

## Context pointers
- Gam2req.md §3 Phase 3 table: "Replace 10/10/10 ladder copy with medal-shelf summary."
- `ux-content.test.jsx` currently has assertions for the old ladder copy — remove/update those as part of this task (noted explicitly in Gam2req §3 Phase 3 test list).
- Keep this lighter-weight than T-07's full grouped grid — Profile is a summary surface, not the full Achievements screen.

## Implementation Notes

Replaced the 10/10/10 ladder UI in `Profile.jsx`'s Achievements card with a lighter-weight
medal-shelf summary, consuming the derived `medals`/`trophies` from the (already-migrated)
`useAchievements` shape. Profile is a summary surface, so — unlike T-07's AchievementsMobile —
it renders **only** the shelf, with **no** grouped badge grid.

- **Removed old ladder logic.** Deleted `const toNextMedal = 10 - (earnedCount % 10)` and the
  ladder copy line (`'10 badges → first medal' : `${toNextMedal} more → next medal``), the
  `earnedCount % 10` progress bar, and the two standalone `medalCount`/`trophyCount` glyph
  counters. These were the last vestiges of the retired `floor(count/10)` model.
- **Removed the full 5-col badge grid.** That grid duplicated the Achievements screen; the task
  note explicitly asks Profile to stay lighter than T-07. The grid (and its `BadgeGlyphForIndex`
  import + `badges` destructure) are gone.
- **New shelf.** Badge count (unchanged, `font-display` — the screen's single MOMCAKE number,
  see one-number note below) + summary line `"{medalCount} of {medals.length} medals earned"` +
  a flex-wrap shelf of every medal (all 7: 4 thematic + 3 Explorer) followed by the trophy.
- **`ShelfItem` helper** mirrors T-07's presentation (module-level, glyph + name + progress line):
  earned name text is `text-gold` (gold = earned/queued/warning token role), locked stays
  `text-ink-600`; progress line reads `Earned` or `{count} of {total}`. `MedalGlyph`/`TrophyGlyph`
  receive an `earned` prop (drives opacity) and an aria `label`, consistent with AchievementsMobile.
- **Tokens/conventions.** No hardcoded colors (all via Tailwind token classes → `src/tokens.js`),
  no gradients, no emoji. Eyebrow "Achievements" uses the shared `Eyebrow` primitive
  (Barlow Condensed 11px uppercase 0.14em).
- **MOMCAKE one-number rule.** Profile already used `font-display` for exactly one number — the
  badge count — and still does. No new display-font numbers were added; the shelf progress lines
  are all `font-sans`. Verified no other `font-display` occurrence in the file.
- **Orphan cleanup (surgical).** Dropped now-unused `BadgeGlyphForIndex` import and `badges`
  destructure that only my removed grid consumed. `cn` is still used (in `ShelfItem`); `navigate`
  is still used (sign-out). No pre-existing code touched beyond the Achievements card.

Note: no test in the suite asserted the old ladder copy for Profile (verified via grep — the only
match was the source line itself), so there were no stale assertions to delete. Added positive
coverage for the new copy plus negative guards against the old copy re-appearing.

## Test Plan

Run from `app/`:
- `npm run test` (full Vitest suite — CI enforces an 80% line-coverage gate)
- Optionally targeted: `npx vitest run src/test/screens.smoke.test.jsx src/test/ux-content.test.jsx`
- `npm run lint`

Cases the change must satisfy:

1. **Medal-shelf renders (smoke).** `screens.smoke.test.jsx` → new test "Profile renders the
   medal-shelf summary, not the old ladder copy": with no achievements seeded, Profile renders the
   summary copy `"medals earned"` and shelf items "Trader Medal" and the trophy "Master of Trading".
2. **Old ladder copy is gone (smoke + content).** Same smoke test and `ux-content.test.jsx` T2.6
   assert `not.toContain('first medal')` / `not.toContain('next medal')` /
   `not.toContain('badges → first medal')` / `not.toContain('more → next medal')` — locks out any
   regression to the retired 10/10/10 wording.
3. **New declarative summary copy (content).** `ux-content.test.jsx` T2.6 asserts the flattened
   Profile text contains `"medals earned"` (i.e. `"{medalCount} of {medals.length} medals earned"`).
4. **Earned / locked / trophy states.** Driven by `computeProgression` (unit-tested in
   `gamification.defs.test.js`) and the shared `ShelfItem` branch (`earned ? 'Earned' :
   '{count} of {total}'`, name color gold vs ink-600). Default fixture (0 badges) exercises the
   locked path (`0 of 4`, `0 of 5`, etc.); earned/trophy paths reuse the same T-07-verified helper.
5. **No regression elsewhere.** Full `npm run test` must stay green (previously 948/948 per T-07 QA)
   — confirms removing the badge grid / ladder didn't break other Profile assertions
   (onboarding-answers smoke test) or coverage.
6. **Lint clean.** No unused imports/vars after removing `BadgeGlyphForIndex` and `badges`.

## Status
Status: DONE

## QA Results

**Date:** 2026-07-11
**Reviewer:** qaAgent

**Commands run (from `app/`):**
- `npm run test` → 46 test files passed, **962/962 tests passed** (Duration 10.51s)
- `npm run lint` → clean, no errors/warnings

**Overall: PASS**

| Case | Description | Result | Evidence |
|---|---|---|---|
| 1 | Medal-shelf renders (smoke) | PASS | `screens.smoke.test.jsx:153` "Profile renders the medal-shelf summary, not the old ladder copy" — asserts `medals earned`, `Trader Medal`, `Master of Trading` present; `first medal` / `next medal` absent. |
| 2 | New summary copy `"{medalCount} of {medals.length} medals earned"` | PASS | `ux-content.test.jsx:100` (T2.6) asserts `medals earned` present and old ladder fragments (`badges → first medal`, `more → next medal`, `10 badges → first medal`) absent. Matches `Profile.jsx:75`. |
| 3 | Old ladder copy fully removed | PASS | Both above tests assert absence of old ladder strings. Source-level check: no `toNextMedal`, no `earnedCount % 10` in `Profile.jsx` (confirmed by reading current file — Achievements card only contains badge count, medal summary line, and shelf). |
| 4 | Earned / locked / trophy states via `ShelfItem` | PASS (indirect) | `ShelfItem` branch logic (`earned ? 'Earned' : '{count} of {total}'`, gold vs ink-600 name color) is unit-covered transitively through `computeProgression` in `gamification.defs.test.js:276+` (empty-set/partial/full badge sets → medals/trophies/medalCount/trophyCount). No Profile-level test exercises the *earned* (gold) rendering path directly — only the default 0-badge fixture (locked path, "0 of 4" etc.) is exercised in Profile-level smoke tests. See Finding 1. |
| 5 | No regression elsewhere — full suite green | PASS | 962/962 passed (46 files), up from the 948/948 baseline cited in the T-07 QA note — consistent with new tests added in T-09, no failures. |
| 6 | Lint clean, no unused imports/vars | PASS | `npm run lint` exits clean. Grepped `Profile.jsx` for `BadgeGlyphForIndex` and `badges` — zero occurrences (fully removed, not just unused). |

**MOMCAKE one-number rule:** Verified — `grep -c "font-display" src/screens/profile/Profile.jsx` → exactly 1 occurrence (`Profile.jsx:72`, the badge count). PASS.

**Emoji / gradient check:** Verified — no emoji characters and no `gradient` class/string found in `Profile.jsx`. PASS.

**Findings:**

- **Severity: Low.** No test at the Profile-screen level directly exercises the *earned* (gold-colored, "Earned" label) rendering branch of `ShelfItem` for a medal/trophy — the two Profile-level tests (`screens.smoke.test.jsx:153`, `ux-content.test.jsx:100`) both render with the default zero-achievement fixture, so only the locked path (`{count} of {total}`, ink-600) is visually exercised in this file's own tests. The underlying data (`computeProgression`) is well-covered by `gamification.defs.test.js`, and `AchievementsMobile` (T-07) reuses the same helper pattern with its own coverage, so the risk of a real defect is low — but a Profile-specific regression in the earned/gold-color wiring (e.g., someone flips the `earned` prop mapping in `ShelfItem`'s JSX call sites at `Profile.jsx:78-85`) would not be caught by any test in this file. **Recommendation:** optionally add one Profile-level test that seeds a non-empty achievement set (mirroring how `AchievementsMobile`'s "renders the medal shelf and thematic badge groups" test seeds data) and asserts the earned/gold-name path renders. Not a blocker for this task — flagging as a coverage gap for future hardening.
- No other issues found. Implementation matches the Test Plan and Implementation Notes; orphan cleanup (`BadgeGlyphForIndex`, `badges`) confirmed fully removed; design-system rules (MOMCAKE one-number, no emoji, no gradient, token-only colors) all hold.
