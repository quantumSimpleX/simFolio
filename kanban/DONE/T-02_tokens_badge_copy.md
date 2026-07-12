# T-02 tokens.js BADGES copy update

## Goal
`app/src/tokens.js` BADGES entries reflect the `mentor` rename and updated `macro` copy.

## Files/modules touched
- `app/src/tokens.js` (BADGES section, ~lines 61-77)

## Dependencies
- T-01 must be DONE first (the `mentor` id must exist in defs.js for this copy to correspond to a real badge id).

## Context pointers
- Gam2req.md §3 Phase 1 table: replace `council` entry with `mentor` ("Mentored", "Choose your first hero mentor"). Update `macro` desc to "Ask your mentor about market conditions".
- CLAUDE.md tokens convention: always import from `src/tokens.js`, not raw CSS — this task edits that source of truth directly.
- Copy must not use emoji (repo-wide rule). Eyebrow/label conventions: Barlow Condensed styling is applied by consuming components, not here.

## Implementation Notes
- The `mentor` badge swap (was `council` → id `mentor`, name "Mentored", desc "Choose your first hero mentor") was **already applied by T-01's dev-engineer** in `app/src/tokens.js` (line 71) as a necessary side-effect of the T-01 defs rename, and was already tested/QA'd. It was NOT redone here to avoid a duplicate/conflicting edit.
- The only outstanding change for T-02 was the `macro` badge desc (line 73): `'Ask your council about market conditions'` → `'Ask your mentor about market conditions'`. This was a single surgical string edit; nothing else in BADGES (or elsewhere) was touched.
- No test assertions reference the macro desc copy string. Searched `app/src/test/` for `market conditions` / `Ask your council` — the `council` hits are all about the internal `councilSize` gauge/metric and the legacy `council`→`mentor` alias, none about this badge desc. `ux-content.test.jsx` (named in the Verify line) does not assert this copy, so no test update was required.

## Test Plan
**Scope:** copy-only change to one BADGES `desc` string in the tokens single-source-of-truth. No logic, no component, no schema change.

1. **Static/lint** — the edit is a JS string literal; `desc` value swapped, structure/keys unchanged.
   - Verify: `grep` in `app/src/tokens.js` shows exactly one `macro` entry with `desc:'Ask your mentor about market conditions'` and zero occurrences of the old `council` copy. ✅ confirmed.
2. **No emoji / repo copy rules** — new copy is plain ASCII, no emoji, matches the mentor-rename terminology. ✅
3. **Badge id integrity** — `macro` id and its `Macro Thinker` name unchanged; only human-readable desc changed, so no downstream id/lookup breakage. ✅ (mirrors defs.js which sources names/descs from BADGES tokens).
4. **Targeted tests** — `gamification.defs.test.js` + `ux-content.test.jsx`: **41 passed / 0 failed.** ✅
5. **Full suite regression** — `npm run test`: 941 passed. Two pre-existing failures in `gamification.stateProvider.test.js` (empty-portfolio gauge shape now includes `heldThroughDrop`) and a progressbar-count test are **unrelated to T-02**: stashing the entire working tree makes them pass, proving they originate from other in-flight uncommitted changes (`stateProvider.js` gauge addition + progressbar work), not from this desc edit. This task introduces no new failures.

**Manual verification (post-integration):** open the Achievements screen, locate the "Macro Thinker" badge, confirm its description reads "Ask your mentor about market conditions".

## Status
Status: TODO

## QA Results

Scope: verified only the single-line change claimed by T-02 (macro badge desc, app/src/tokens.js line 73). Ignored the 2 known-unrelated `gamification.stateProvider.test.js` failures (gauge-shape, progressbar-count) — attributable to concurrent T-03 work on `stateProvider.js`, not T-02.

1. **tokens.js diff correctness** — PASS. Line 73: `id:'macro', name:'Macro Thinker', desc:'Ask your mentor about market conditions'`. Old string "Ask your council about market conditions" is gone. `name`/`id` unchanged (Macro Thinker / macro).
2. **mentor entry untouched/correct** — PASS. Line 71: `id:'mentor', name:'Mentored', desc:'Choose your first hero mentor'`, matches Gam2req.md §3 Phase 1 spec. No stray `council` references remain anywhere in tokens.js (grep for `council` — 0 hits).
3. **Stale-copy search in app/src/test/** — PASS. Grepped `app/src/test/` for "Ask your council about market conditions" (0 hits, case-insensitive) and for "market conditions" generally (0 hits) — confirms dev-engineer's claim that no test asserts on this desc string.
4. **Targeted test run** — `npx vitest run src/test/gamification.defs.test.js src/test/ux-content.test.jsx` — PASS. 2 files, 41/41 tests passed, 0 failed.
5. **Emoji / copy convention check** — PASS. New desc is plain ASCII, no emoji, consistent with repo-wide no-emoji rule and mentor-rename terminology used elsewhere (defs.js, T-01).
6. **Badge id/name integrity** — PASS. `macro` id and `Macro Thinker` name unchanged; only `desc` field edited, so no downstream id-lookup or component keying breakage possible.
7. **Manual verification (Achievements screen wording)** — NOT PERFORMED (no running dev server / browser session in this QA pass). Recommend dev-engineer or a follow-up UI check confirm the Achievements screen renders the updated desc string before moving to DONE; low risk since desc is read directly from this token file with no intermediate transform found in the codebase.

### Verdict: PASS

T-02's actual change (tokens.js line 73, macro badge desc `council`→`mentor`) is correct, isolated, and introduces no regressions in the targeted test files. No real issues found. The 2 unrelated `stateProvider`/progressbar-count failures seen in a full-suite run are confirmed out of scope for T-02 (concurrent T-03 edits to `stateProvider.js`), not defects in this task.
