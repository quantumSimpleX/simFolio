# T-12 HeroSidebar.jsx: council to mentor copy

## Goal
HeroSidebar no longer references "council slots"; reflects single active mentor.

## Files/modules touched
- `app/src/components/HeroSidebar.jsx:58`
- `app/src/test/components.test.jsx`

## Dependencies
None.

## Context pointers
- Gam2req.md §3 Phase 4 table: `"{n} of 3 council slots — watching your portfolio"` → `"Your mentor — watching your portfolio"`.
- Hero messages must always be italic, question or observation form (not a directive) per CLAUDE.md Design System rules — this sidebar status line is a label, not a Hero message, so that rule doesn't apply here, but double check this string isn't rendered inside a HeroMessage component.

## Implementation Notes

Rewrote `HeroSidebar.jsx` to reflect the actual single-active-mentor MVP behavior
(confirmed in `useChangeHero.js`, which deletes all existing `hero_selections`
rows before inserting the chosen one — "The council is a single row today").

Changes to `app/src/components/HeroSidebar.jsx`:
- **Status line (the core ask):** `"{heroes.length} of 3 council slots · watching your portfolio"`
  → `"Your mentor · watching your portfolio"`. Verified this string renders inside a plain
  `<div>` label, not a `HeroMessage`, so the italic/question-form Hero-message rule does not apply.
- **Avatar stack:** `heroes.slice(0,3).map(...)` overlapping-avatar stack → a single
  `HeroAvatar` for `primaryHero` (rendered only when a hero exists; falls back to no avatar
  for the Sage default, matching the pre-existing empty-heroes behavior).
- **Name label:** dropped the `councilNames = heroes.map(h => h.name).join(' · ')` join
  (multi-hero framing) in favor of `mentorName = primaryHero?.name ?? 'Sage'`.
- **File header comment:** removed the stale "The council shares one chat window" language;
  now describes a single active mentor. QA (T-11) had flagged this comment specifically.
- Left the T-19 cross-hero timeline comment/`useConversationHistory()` wiring untouched — the
  unified history correctly spans previously-selected mentors and is accurate as-is.

Out of scope (owned by sibling tasks, deliberately not touched): the `"Ask your council…"`
composer placeholder in `HeroChatPanel.jsx` (T-14), `AskTab.jsx` (T-13), and the internal
`councilSize` gauge name in gamification defs (Gam2req §3 keeps that name to avoid gamekit churn).

**Test file deviation:** the task's Files list names `components.test.jsx`, but `HeroSidebar`
has no test there — it is actually rendered/asserted in `untestedComponents.test.jsx` (Q3),
which held the now-stale `expect(getByText(/council slots/))` assertion. Updated that real test
in place rather than adding a duplicate `HeroSidebar` render harness to `components.test.jsx`.

## Test Plan

Automated (Vitest):
- `src/test/untestedComponents.test.jsx` › "HeroSidebar (Q3)" — renders `<HeroSidebar/>` with
  empty providers (no seeded heroes → Sage fallback) and asserts:
  1. `getAllByText('Sage')` present (title + fallback name).
  2. `getByText(/Your mentor · watching your portfolio/)` present (new copy).
  3. `queryByText(/council slots/)` is **absent** (regression guard against the stale string).
- Full suite run for regressions: `npm run test` → 45 files / 952 tests pass.
- Lint on changed files: `eslint` clean (exit 0).

Commands:
```
npx vitest run src/test/untestedComponents.test.jsx   # targeted → 9/9 pass
npx vitest run                                         # full → 952/952 pass
npx eslint src/components/HeroSidebar.jsx src/test/untestedComponents.test.jsx
```

Manual / visual (not automated — hooks hit Supabase/auth):
- Desktop portfolio + markets right rail with an active mentor: avatar shows the single mentor
  portrait, name line shows the mentor name, subline reads "Your mentor · watching your portfolio".
- With no mentor selected: no avatar, title and name fall back to "Sage".
- Confirm no "N of 3 council slots" text appears anywhere

## QA Results

Verified independently by qa-engineer against current working-tree files (not cached greps).

| # | Check | Result |
|---|-------|--------|
| 1 | HeroSidebar.jsx: no "of 3 council slots" string | PASS — status line is `Your mentor · watching your portfolio` |
| 2 | HeroSidebar.jsx: no `heroes.slice(0,3).map(...)` avatar stack | PASS — single `<HeroAvatar id={primaryHero.id} ...>` gated on `primaryHero &&` |
| 3 | HeroSidebar.jsx: no stale "council shares one chat window" file-header comment | PASS — header comment now describes single active mentor / heroes[0] |
| 4 | `untestedComponents.test.jsx` "HeroSidebar (Q3)" asserts new copy present + `/council slots/` absent | PASS — matches lines 61-70 exactly as claimed |
| 5 | `npx vitest run src/test/untestedComponents.test.jsx` | PASS — 9/9 tests, 1/1 files |
| 6 | `npx vitest run` (full suite) | PASS — 45/45 files, 952/952 tests, matches claimed count exactly |
| 7 | `npx eslint src/components/HeroSidebar.jsx src/test/untestedComponents.test.jsx` | PASS — clean, exit 0 |
| 8 | `grep -rn "council slots\|of 3 council" app/src/` | PASS — zero occurrences repo-wide |
| 9 | Scope discipline: `HeroChatPanel.jsx`, `AskTab.jsx`, `councilSize` gauge in `defs.js`/`stateProvider.js` not touched by this change | PASS — `git diff` on those 4 files shows no council-copy edits attributable to T-12 (the `councilSize` gauge/condition changes present in the working tree are pre-existing WIP from a separate task, not introduced here; `HeroChatPanel.jsx`'s `"Ask your council…"` composer placeholder is untouched — correctly out of scope per T-14) |

**Note (not a defect):** `HeroChatPanel.jsx` line 28 still has placeholder text `"Ask your council…"`. This is explicitly out of scope for T-12 (belongs to T-14 per task description) but flagging for whoever picks up T-14 — same "council" framing will need the same mentor-copy treatment eventually.

**Verdict: PASS.** No discrepancies between claimed Implementation Notes/Test Plan and actual code/test state. No regressions introduced (952/952 full suite). No scope creep detected. Test-file deviation (updating `untestedComponents.test.jsx` instead of duplicating a `HeroSidebar` harness in `components.test.jsx`) is a reasonable, correctly-reasoned call — `components.test.jsx` never rendered `HeroSidebar` to begin with.

File left in `kanban/CODING/` per instructions — not moved to DONE. in the sidebar.

## Status
Status: TODO
