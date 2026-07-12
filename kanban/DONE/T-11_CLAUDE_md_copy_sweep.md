# T-11 CLAUDE.md copy sweep (Achievement System, Hero System, query-keys)

## Goal
Repo-root `CLAUDE.md` accurately reflects the new declarative medal/trophy model, single-hero
MVP scope, and the new `['conversation-history', userId]` query key.

## Files/modules touched
- `CLAUDE.md` (repo root)

## Dependencies
None as a hard code dependency (docs-only), but the content should match what T-01
(Achievement System model) and T-17 (query-keys) actually implement — verify against
those tasks' final state before finalizing wording, or update this file again after they land.

## Context pointers
- Gam2req.md §3 Phase 3 table: "CLAUDE.md (Achievement System section) — Replace '10 badges → 1 medal → 10 medals → 1 trophy' with declarative model: badges persisted; medals/trophies derived from `MEDALS`/`TROPHIES` in defs.js."
- Gam2req.md §3 Phase 4 table: "CLAUDE.md (Hero System) — 'Maximum council: 3 heroes' → single active mentor MVP, council deferred."
- Gam2req.md §3 Phase 6 table: "CLAUDE.md — Query-keys line: add `['conversation-history', userId]`."
- Current CLAUDE.md sections to edit: "Achievement System", "Hero System", and the TanStack React Query bullet under "Tech Stack" listing query keys.

## Implementation Notes
Three surgical edits to repo-root `CLAUDE.md`, no unrelated sections touched:

1. **Tech Stack → query-keys line**: appended `['conversation-history', userId]` to the existing
   React Query key list (T-17).
2. **Hero System**: replaced the two "Heroes 2 and 3 … organically" + "Maximum council: 3 heroes"
   bullets with a single bullet stating MVP scope is one active mentor and the multi-hero council
   (up to 3, sharing one chat window) is deferred. Retained the still-accurate bullet about heroes
   being introduced after the first trade.
3. **Achievement System**: replaced the stale "10 badges → 1 medal → 10 medals → 1 trophy →
   10 trophies" line with the declarative model — 15 persisted badges; medals/trophies derived via
   `computeProgression()`; 4 thematic + 3 Explorer milestone medals; single "Master of Trading"
   trophy requiring every medal. Retained the "badge earned moments" bullet unchanged.

No `council` badge/achievement exists any more — replaced by `mentor` (T-01). No test file for a
docs change; verification is a manual cross-check against source (below).

## Test Plan
Each doc claim now written, and the code file that proves it is accurate:

| Doc claim (CLAUDE.md) | Proof in code |
|---|---|
| Query key `['conversation-history', userId]` exists | `app/src/hooks/useHeroChat.js:57` (`useConversationHistory`), also used at `:90` |
| Other listed keys unchanged (`hero-history` etc.) | `useHeroChat.js:21` |
| 15 badges, only persisted unit | `defs.js` `ACHIEVEMENTS` (15 entries, lines 41–65) |
| `mentor` achievement (not `council`) | `defs.js:54` `{ id: 'mentor', … metric: 'mentorChosen' }`; badge meta `tokens.js:71` "Mentored" |
| Medals/trophies derived, never stored, via `computeProgression()` | `defs.js:97` `computeProgression()`; comment lines 67–71 |
| 4 thematic + 3 Explorer milestone medals | `defs.js` `MEDALS` lines 74–88 (medal_trader/builder/longterm/student + explorer_1/2/3) |
| Single "Master of Trading" trophy requires every medal | `defs.js:90-93` `TROPHIES` (`trophy_master`, threshold = `MEDALS.length`) |
| MVP = single active mentor; council deferred | `defs.js` has no multi-hero council flow; `councilSize` gauge target 2 exists but no council UI wired for MVP; matches Gam2req.md §3 Phase 4 |

Manual proofread pass completed: cross-checked defs.js, useHeroChat.js, tokens.js, and confirmed
no residual "council" badge terminology remains in the edited CLAUDE.md sections.

## Status
Status: TODO

## QA Results

Independently verified against current code (not just the Implementation Notes table above).
Overall verdict: **PASS** — all three claims are accurate, edit is surgical, no scope creep.

| # | Claim | Verified against | Result |
|---|---|---|---|
| 1 | Query key `['conversation-history', userId]` exists | `app/src/hooks/useHeroChat.js:57` — `useConversationHistory()` uses `queryKey: ['conversation-history', user?.id]`; also referenced as `convoKey` at line 90 and used in `onMutate`/`onSuccess`/`onError` | PASS |
| 2 | Other listed query keys (`portfolio`, `orders`, `quotes`, `hero-history`) unchanged | Not disturbed by diff; `hero-history` confirmed live at `useHeroChat.js:21` | PASS |
| 3 | 15 badges (`ACHIEVEMENTS`), only persisted unit | `app/src/gamification/defs.js` lines 40–65 — counted exactly 15 entries in `ACHIEVEMENTS` array | PASS |
| 4 | Medals: 4 thematic (threshold = badge-set size) + 3 Explorer milestone (5/10/15) | `defs.js` lines 74–88 — `medal_trader` (4/4), `medal_builder` (4/4), `medal_longterm` (3/3), `medal_student` (4/4) = 4 thematic; `medal_explorer_1/2/3` with thresholds 5/10/15 against `ALL_BADGE_IDS` = 3 milestone. 7 total, matches claim | PASS |
| 5 | Exactly 1 trophy, requires every medal | `defs.js` lines 90–93 — `TROPHIES` array has exactly one entry (`trophy_master`), `threshold: MEDALS.length` (7), `medals: MEDALS.map(m => m.id)` (all 7) | PASS |
| 6 | Medals/trophies derived, never persisted | `computeProgression()` (`defs.js:97-127`) is a pure function — takes `earnedBadgeIds`, returns computed `{medals, trophies, medalCount, trophyCount}`, no Supabase/IO calls. Grepped `app/supabase/migrations/*.sql` for "medal\|trophy" — zero matches, confirming no DB table exists for either | PASS |
| 7 | MVP scope = single active mentor, council deferred | `app/src/hooks/useChangeHero.js` — mutation explicitly deletes all existing `hero_selections` rows for the user before inserting the new one, with an inline comment: "The council is a single row today, so we clear the existing selection(s) and insert the chosen one." This is the authoritative data-layer behavior and matches the doc's "single active mentor" framing | PASS |
| 8 | Only 3 sections touched, no unrelated edits | `git diff CLAUDE.md` — confirmed exactly 3 hunks: Tech Stack query-key line, Hero System bullet replacement, Achievement System line replacement. No other lines changed | PASS |

### Note (not a defect in this task, flagging for awareness)
`app/src/components/HeroSidebar.jsx` still contains **stale UI copy** that implies multi-hero council is live: `heroes.slice(0,3).map(...)`, `{heroes.length} of 3 council slots`, and a code comment "council shares one chat window." This is inconsistent with the actual single-row `hero_selections` behavior enforced by `useChangeHero.js`. This is a **pre-existing UI/copy inconsistency in app code**, not introduced by T-11 and not a CLAUDE.md accuracy problem (CLAUDE.md's new wording is correct) — but worth a follow-up ticket so the sidebar copy doesn't contradict the documented MVP scope for actual end users. Severity: Low (cosmetic/copy only, not user-facing functional bug since only one hero can ever be selected).

No other issues found. All doc claims check out against current source; edit scope is surgical as intended.
