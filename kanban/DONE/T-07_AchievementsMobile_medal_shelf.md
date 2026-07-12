# T-07 AchievementsMobile.jsx: medal shelf + grouped badge grid

## Goal
Achievements screen shows a medal shelf (earned/locked medals + trophy with progress) and
groups the badge grid under its 4 thematic medals, replacing the old flat 10/10/10 model.

## Files/modules touched
- `app/src/screens/achievements/AchievementsMobile.jsx`
- `app/src/test/gamification.a11y.test.jsx`
- `app/src/test/screens.smoke.test.jsx`

## Dependencies
- T-01 must be DONE first (MEDALS/TROPHIES defs).
- T-05 must be DONE first (useAchievements must return `medals`/`trophies`).

## Context pointers
- Gam2req.md §3 Phase 3 table: summary card gets medal shelf (MedalGlyph per MEDALS entry, earned/locked, "3 of 4" progress) + trophy. Badge grid grouped under the 4 thematic medals with eyebrow label + ame-400 progress bar. Explorer (milestone) medals are shelf-only, not a grouping header.
- CLAUDE.md tokens: `C.ame400` for progress bars, `C.ink900`/`C.gold` per component rules; eyebrow labels are Barlow Condensed 11px uppercase, `letter-spacing: 0.14em`; no gradients except Master of Trading CTA; no emoji.
- Badge earned moments in this repo are deliberately anti-bounce/full-screen ink-900 — do not add animation flourish here (that's T-08's concern anyway).

## Implementation Notes

Rewrote `AchievementsMobile.jsx` to consume the new `useAchievements` shape
(`{ badges, medals, trophies, earnedCount, medalCount, isLoading }`) and replace
the old flat 10/10/10 ladder UI. No changes were needed to `defs.js`,
`useAchievements.js`, or the `Badges` glyph components — T-01/T-05 already ship the
derived `medals`/`trophies` (each entry carries `earnedCount`, `earned`, `progress`,
`threshold`). Changes are confined to the screen component.

What changed and why:

- **Medal shelf (summary card).** The summary `Card` now shows the total badge count
  (`{earnedCount} badges`) plus a copy line `{medalCount} of {medals.length} medals earned`,
  followed by a flex-wrap shelf. Every `MEDALS` entry renders as a `<ShelfItem>` wrapping a
  `MedalGlyph` (earned → full opacity + gold label; locked → dimmed) with a `"3 of 4"`
  progress line (`{earnedCount} of {threshold}`, or `Earned` when complete). The single trophy
  (`trophies[0]`) renders last in the shelf as a `TrophyGlyph`. All seven medals (4 thematic +
  3 Explorer) appear in the shelf — the shelf is the only place Explorer medals surface.
- **`ShelfItem` helper.** Extracted so medals and the trophy share one presentation
  (glyph + name + earned/progress line). Earned name text goes `text-gold` per the gold
  "queued/warning/earned" token role; locked stays muted `text-ink-600`.
- **`isExplorer(m)` guard.** `m.id.startsWith('medal_explorer')` — used to exclude milestone
  medals from the grouped badge grid (they are count-based across all badges, so they have no
  meaningful themed subset to head).
- **Grouped badge grid.** Replaced the single flat badge grid + separate "Medals" section with
  one group per thematic medal (`medals.filter(!isExplorer)`). Each group renders an `Eyebrow`
  heading `"{Medal name} — {earnedCount} of {threshold}"` (the shared `Eyebrow` primitive
  already applies Barlow Condensed 11px uppercase `letter-spacing: 0.14em`), a thin
  `bg-ame-400` progress bar (`role="progressbar"` with `aria-valuenow/min/max` + label) whose
  width is `m.progress * 100%`, and the badge cards for that medal's `badges` ids resolved via
  a `byId` map. The glyph index is looked up with `indexOf(id)` against the full `badges` array
  so each badge keeps its original glyph shape/color assignment from `BadgeGlyphForIndex`.
- **`BadgeCard` helper.** Extracted the per-badge `Card` (unchanged behavior: role=button,
  `data-state`, earned→`tabIndex 0` + Enter/Space to open `/badge-earned`, locked→`tabIndex -1`
  + descriptive `aria-label`, `focus-visible:ring-ame-400`). Extraction avoids duplicating the
  card markup now that badges render inside a `.map()` over medal groups.

Convention compliance:
- **Tokens.** Colors use the project's Tailwind token classes (`text-gold`, `bg-ame-400`,
  `text-ink-*`) exactly as the pre-existing file did; `Badges.jsx` glyphs pull `C.gold`/`C.ame400`
  from `src/tokens.js`. No raw hex introduced.
- **MOMCAKE one-number rule.** The badge count uses `font-sans` (Barlow), never `font-display`
  (MOMCAKE) — the a11y test asserts this. No display font on this screen.
- **No gradients, no emoji, no animation flourish** (badge/medal reveal choreography is T-08's
  concern).

## Test Plan

Automated coverage (run from `app/`):
- `npx vitest run src/test/gamification.a11y.test.jsx src/test/screens.smoke.test.jsx`
- Full gate: `npm run test` (and `npm run test:coverage` for the 80% line gate) + `npm run lint`.

Cases this screen must satisfy:

1. **Medal shelf — earned vs locked rendering.** With a mixed fixture (Trader medal 1/4,
   Explorer I 1/5, none earned), each medal renders a `MedalGlyph`; earned medals show full
   opacity + `text-gold` name + `Earned`, locked medals show dimmed glyph + `text-ink-600`
   name. Covered indirectly by smoke ("Trader Medal" present) + a11y fixtures.
2. **"3 of 4" progress copy.** A partially-complete medal shows `{earnedCount} of {threshold}`
   in the shelf; a complete medal shows `Earned`. (a11y fixture medals are all partial → shelf
   shows counts.)
3. **Trophy rendering.** `trophies[0]` renders as a `TrophyGlyph` at the end of the shelf with
   its own name/progress. Smoke asserts `Master of Trading` is present.
4. **Badge grid grouping under the 4 thematic medals.** Each thematic medal heads a group with
   an `Eyebrow` "{name} — {earnedCount} of {threshold}" and an `ame-400` `role="progressbar"`
   whose `aria-valuenow`/`aria-valuemax` equal the medal's `earnedCount`/`threshold`. a11y test
   asserts the first progressbar is Trader Medal with valuenow=1/valuemax=4.
5. **Explorer (milestone) medals are shelf-only.** `isExplorer` filters them out of the grouped
   grid; they must not produce a group heading. (Verify no "Explorer I" eyebrow/progressbar in
   the grid — only the shelf item.)
6. **Badge card earned/locked a11y.** Cards are `role="button"` with `data-state`; earned →
   `tabIndex 0`, locked → `tabIndex -1` + `aria-label` matching /locked/. a11y test asserts this
   over the 2-badge fixture.
7. **Summary count font (MOMCAKE rule).** The `{n} badge(s)` count uses `font-sans`, not
   `font-display`. a11y test asserts this.
8. **h1 landmark.** `PageHeader title="Achievements"` renders an `<h1>`. a11y test asserts.
9. **Smoke — renders without crashing** against the mocked Supabase client, medal shelf +
   thematic groups visible.

Accessibility concerns: each group progress bar carries `aria-valuenow/min/max` + `aria-label`;
medal/trophy glyphs receive an `aria-label` describing name + earned/progress; badge glyphs are
decorative (`aria-hidden`) with the accessible name coming from the sibling card `aria-label`.
Keyboard: earned badges are Enter/Space activatable, locked badges are removed from tab order.

## Status
Status: DONE

## QA Results

**Date:** 2026-07-11
**Reviewer:** qaAgent

**Commands run (from `app/`):**
- `npx vitest run src/test/gamification.a11y.test.jsx src/test/screens.smoke.test.jsx`
- `npm run test` (full suite)
- `npm run lint`

**Results:**
- Targeted files: **28/28 passed** (2 test files, 0 failures)
- Full suite: **941/941 passed** (45 test files, 0 failures) — no regressions
- Lint: **clean**, no errors/warnings

**Test Plan case-by-case:**

| # | Case | Result | Notes |
|---|------|--------|-------|
| 1 | Medal shelf earned vs locked rendering | PASS | `ShelfItem`/`MedalGlyph` correctly branch on `m.earned`: opacity via `MedalGlyph`'s internal `earned` prop, name color `text-gold` (earned) vs `text-ink-600` (locked). Confirmed by source read + smoke assertion ("Trader Medal" present). |
| 2 | "N of threshold" progress copy | PASS | `ShelfItem` renders `{earned ? 'Earned' : `${count} of ${total}`}` (line 21). a11y fixture (all medals partial) exercises this path implicitly via the medal-shelf render; explicit string not asserted by name in tests but the underlying logic is directly visible and unambiguous. |
| 3 | Trophy rendering | PASS | `trophies[0]` rendered via `TrophyGlyph` + `ShelfItem` (lines 83–87), gated on `trophy &&` truthy check. Smoke test asserts "Master of Trading" text present. |
| 4 | Badge grid grouping under 4 thematic medals w/ correct aria-valuenow/max | PASS | a11y test explicitly asserts first `[role="progressbar"]` has `aria-valuemax="4"` and `aria-valuenow="1"` (Trader Medal, 1/4) — matches `computeProgression` output for the fixture. |
| 5 | Explorer medals shelf-only, no grouping header | PASS | `thematic = medals.filter((m) => !isExplorer(m))` (line 60) drives the grouped-grid `.map()`; `isExplorer` matches `id.startsWith('medal_explorer')`. Explorer medals only appear via the unfiltered `medals.map()` in the shelf (line 78). Confirmed by source inspection — no explicit "no Explorer eyebrow" assertion exists in the test file, see Finding QA-T07-1 below. |
| 6 | Badge card earned/locked a11y (role=button, tabIndex, aria-label) | PASS | a11y test explicitly asserts `tabindex="0"` earned / `"-1"` locked, and locked `aria-label` matches `/locked/i`. |
| 7 | (progressbar aria attrs, general) | PASS | Covered under case 4. |
| 8 | h1 landmark | PASS | `PageHeader` (`app/src/components/Nav.jsx:101`) renders `<h1>{title}</h1>`; a11y test asserts `container.querySelector('h1')` truthy. |
| 9 | Smoke — renders without crashing | PASS | `screens.smoke.test.jsx` "AchievementsMobile renders the medal shelf and thematic badge groups" passes, asserts "Trader Medal" and "Master of Trading" both present. |

**MOMCAKE one-number rule:** Confirmed by grep — `AchievementsMobile.jsx` contains zero occurrences of `font-display`; the summary count (`{earnedCount} badge(s)`) and all shelf/card text use `font-sans`. a11y test explicitly asserts `font-sans` present and `font-display` absent on the count element.

**Findings:**

- **[Low] QA-T07-1 — No test explicitly asserts Explorer medals are absent from the grouped grid.** Impact: if a future refactor accidentally includes Explorer medals in `thematic` (e.g., someone changes the filter predicate), no test in the current suite would catch it — the a11y test only checks the *first* progressbar's values (Trader Medal), and nothing asserts "Explorer I" is absent from grid headings/progressbars. Likelihood: low today (code is correct and simple), but this is exactly the kind of case a careless future edit could silently break. Recommendation: add one assertion to `gamification.a11y.test.jsx`, e.g. `expect(screen.queryByText(/Explorer I/)).not.toBeInTheDocument()` or assert `container.querySelectorAll('[role="progressbar"]').length` equals the thematic-medal count (4, not 5), to lock in case 5 from the Test Plan. Not a blocker — the implementation itself is correct and covered by direct source inspection.
- **[Low] QA-T07-2 — Case 2 ("N of threshold" progress copy) has no direct string assertion in tests.** Impact: same class of risk as above — a copy regression (e.g., accidentally swapping to "Earned" for a partial medal) wouldn't be caught by the current a11y/smoke tests, only by manual/visual QA. Recommendation: add `expect(screen.getByText('1 of 4')).toBeInTheDocument()` (or similar) against the Trader Medal shelf item in the a11y fixture. Not a blocker.

No Critical/High/Medium severity issues found. Implementation matches the Implementation Notes and satisfies all 9 Test Plan cases; the two findings above are test-coverage gaps for future regression safety, not functional defects.

## Dev Follow-up (resolves QA-T07-1 / QA-T07-2)

Both Low-severity QA findings were addressed by adding two regression-guard assertions to
`app/src/test/gamification.a11y.test.jsx`:
- **QA-T07-1 (Explorer shelf-only):** the a11y fixture's `medal_explorer_1` was given a
  resolvable badge (`badges: ['first_trade']`) so that, absent the `isExplorer` filter, it would
  produce an `<h2>` group heading. New test asserts no `h2` heading text matches `/Explorer/`
  while the shelf still shows "Explorer I".
- **QA-T07-2 ("N of threshold" copy):** new test asserts `screen.getByText('1 of 4')` (Trader
  Medal shelf item) is in the document.

Final verification: `npx vitest run` → **948/948 passed** (45 files) on two consecutive clean
runs; `npm run lint` clean. (An intermediate full-suite run showed flaky failures under system
resource contention — inflated setup/environment durations — which did not reproduce.)
