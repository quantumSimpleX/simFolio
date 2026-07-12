# T-21 App.jsx: hero-handoff route title copy

## Goal
The `/hero-handoff` route's `document.title` still says "Your Council" — a
stale pre-rename string on the exact screen this epic renamed to a
single-mentor concept.

## Files/modules touched
- `app/src/App.jsx` (the `ROUTE_TITLES` map, `'hero-handoff'` entry — line
  number per the audit was 60, confirm the current exact line yourself before
  editing)
- A test asserting on this route's title (none currently exists — add one to
  whichever file already covers `ROUTE_TITLES`/`document.title` behavior for
  other routes, e.g. `app/src/test/screens.smoke.test.jsx`, or create a
  minimal targeted test if no existing coverage pattern fits)

## Dependencies
None.

## Context pointers
- `Gam2uiux.md` §Major, finding 4 (post-launch UI/UX audit of the completed
  Gam2 epic).
- Gam2req.md §6 Post-audit findings table (row 4).
- This sets `document.title` — a WCAG 2.4.2 Page Titled feature added
  specifically so each route has a distinct title (not a static app-wide
  title). It is screen-reader/browser-tab-title only, not visible in the page
  body, which is why it slipped past every other council→mentor copy sweep
  task (T-11 through T-15) — those all worked on visible UI copy.
- Fix: rename `'hero-handoff': 'Your Council'` to something consistent with
  the single-mentor MVP framing already used elsewhere (e.g. "Your Mentor" or
  "Meet Your Mentor" — match whatever heading/copy style the other
  `ROUTE_TITLES` entries use, for consistency).
- No existing test in `app/src/test/` asserts on this route's title (confirmed
  via repo-wide grep during the audit — zero hits). Add coverage so this
  doesn't silently regress again.

## Implementation Notes
- `app/src/App.jsx:60` — `ROUTE_TITLES['hero-handoff']` changed from
  `'Your Council'` to `'Meet Your Mentor'`. Chosen to match the verb+object,
  title-case phrasing of the neighboring mentor entry `'find-mentor': 'Find a
  Mentor'` (App.jsx:59) and the single-active-mentor MVP framing. This string
  feeds `document.title` via `PageTitle` (App.jsx:64–76), rendering as
  `simFolio — Meet Your Mentor`. No visible page-body copy changed (WCAG 2.4.2
  page-title / screen-reader + browser-tab only).
- No other file needed changes; "council" no longer appears in ROUTE_TITLES.

## Test Plan
- `app/src/test/screens.smoke.test.jsx` — added test
  "sets a single-mentor page title on /hero-handoff, not the old council copy"
  (after the existing `App routes / to the welcome screen` case). It drives the
  route via `window.history.pushState('/hero-handoff')`, renders full `<App/>`
  (which owns its BrowserRouter, `withRouter: false`), waits for
  `document.title === 'simFolio — Meet Your Mentor'`, and asserts the title does
  not contain "Council". This follows the existing full-App smoke pattern in the
  same file; no prior document.title/ROUTE_TITLES assertion existed anywhere.
- Verification:
  - `npx vitest run src/test/screens.smoke.test.jsx` → 25 passed (was 24).
  - `npx vitest run` (full suite) → 46 files, 963 tests, all passing; no
    regressions.

## QA Results

**Step 1 — App.jsx ROUTE_TITLES entry.** PASS. Confirmed at app/src/App.jsx:60:
`'hero-handoff': 'Meet Your Mentor',` — exact match to claim. `git diff -- src/App.jsx`
shows this is the *only* change in the file (one line, `'Your Council'` →
`'Meet Your Mentor'`). Repo-wide grep of App.jsx for "Council" (case-sensitive)
returns zero remaining hits.

**Step 2 — repo-wide "Council" grep.** PASS. `grep -n Council app/src` hits 4 files:
`App.jsx` (now clean, pre-fix diff only), `test/screens.smoke.test.jsx` (a code
comment referencing the old copy + the new negative assertion — expected),
`gamification/useGamification.jsx` and `gamification/stateProvider.js` and
`test/gamification.stateProvider.test.js` (all `getCouncilSize`/`councilSize` —
internal identifiers/data-plumbing, never rendered to a user or a document.title).
The audit's "Major finding 4" is specifically about a visible/title string leak;
these identifier names are out of scope for that finding and were correctly left
untouched. No new user-visible "Council" string was introduced.

**Step 3 — new test in screens.smoke.test.jsx.** PASS. Read the full file. The new
test (last block, lines 180-187) is exactly as claimed: `window.history.pushState({}, '',
'/hero-handoff')`, `renderWithProviders(<App/>, { withRouter: false })` (confirmed via
renderWithProviders.jsx:10,14 that `withRouter: false` means App supplies its own
BrowserRouter, so this genuinely exercises real route matching, not a mocked route),
`await waitFor(() => expect(document.title).toBe('simFolio — Meet Your Mentor'))`, then
`expect(document.title).not.toContain('Council')`. This is a real assertion against
`document.title`, not body text — correctly targets the WCAG 2.4.2 title mechanism
described in the task. Placement matches the claim (appended immediately after the
existing "App routes / to the welcome screen" full-App smoke case).

Note: the working copy of this test file also contains several other new test blocks
(AskTab header/council-copy test, AskTab cross-hero conversation test, renamed
AchievementsMobile test, new Profile medal-shelf test) that are NOT part of this
task's diff — these are accumulated uncommitted work from other in-flight tasks
(T-18/T-19-era gamification work), consistent with the repo's no-commit-between-tasks
setup. They do not constitute a T-21 scope violation; T-21's only addition to this
file is the final `/hero-handoff` title test plus the `__setTableData` import it does
NOT use directly (that import was added by the same accumulated batch, not by this
test) — confirmed the new hero-handoff test itself uses none of the unrelated fixtures.

**Step 4 — targeted test run.** PASS, count matches claim exactly.
`npx vitest run src/test/screens.smoke.test.jsx` → **25 passed (25)**, 1 file. Matches
claimed "25 passed (was 24)."

**Step 5 — full suite run.** PASS with a minor count discrepancy.
`npx vitest run` → **46 files passed (46), 966 tests passed (966)**, 0 failures.
Claim stated "963 tests, all passing." Actual is 966, not 963 — a 3-test
undercount in the dev-engineer's reported number. All 966 pass with zero
regressions, so this does not affect the correctness verdict, but the reported
figure is stale/inaccurate (likely because other parallel-task test additions
landed in the working tree between when the dev-engineer ran their verification
and now). Recommendation: don't hand-transcribe suite counts from memory —
copy them straight from the terminal output at commit time.

**Step 6 — scope check.** PASS. `git diff --stat` shows ~30 modified files in the
working tree, but per the task's own caveat this reflects accumulated parallel
task work (T-18/T-19/T-20 gamification and BadgeEarned edits, etc.), not T-21
scope creep. Isolated diffs confirm:
- `app/src/App.jsx`: exactly 1 line changed (the claimed ROUTE_TITLES entry).
- `app/src/test/screens.smoke.test.jsx`: contains the claimed new test plus
  unrelated accumulated test additions from other tasks (see Step 3 note) — none
  of which were introduced by this change; the T-21-attributable delta in this
  file is precisely the final "sets a single-mentor page title on /hero-handoff"
  test block.

No other files carry a T-21-attributable change.

**Overall verdict: PASS.** The fix is correct, minimal, and isolated to the claimed
line. The new test genuinely exercises `/hero-handoff` routing and asserts on
`document.title` (not a proxy). No remaining user-visible "Council" string exists
in App.jsx or elsewhere in src/. Only issue found is a cosmetic reporting
discrepancy (963 claimed vs. 966 actual full-suite test count) — does not block
merge.

## Status
Status: TODO
