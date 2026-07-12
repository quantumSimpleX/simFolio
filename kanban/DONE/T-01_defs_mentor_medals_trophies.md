# T-01 defs.js: mentor rename + gauge metrics + MEDALS/TROPHIES/computeProgression

## Goal
`app/src/gamification/defs.js` exports the declarative progression contract: renamed
`mentor` badge (was `council`), fixed `steady` gauge metric, `MEDALS`, `TROPHIES`, and
a pure `computeProgression(earnedBadgeIds)` helper. This is the shared contract every
other Phase-1/2/3 task in Gam2req.md depends on — land this first.

## Files/modules touched
- `app/src/gamification/defs.js`
- `app/src/test/gamification.defs.test.js`
- `app/src/test/gamekit.e2e.test.js` (duplicates defs inline — must be updated in the same commit per Gam2req risk note)

## Dependencies
None.

## Context pointers
- Gam2req.md §2.1 (badge changes table), §2.2 (MEDALS/TROPHIES shape), §2.3 (computeProgression spec + invariants), §3 Phase 1 table.
- Final 15 badge ids: `first_trade, limit, contrarian, momentum, diversified, etf, etf2, first_crypto, patient, long_term, steady, researcher, reflection, macro, mentor`.
- `mentorChosen` count metric should key off existing `hero.unlocked` event, already emitted at `useChangeHero.js:31` — do not add a new emitter.
- `steady` badge: replace `position.heldThroughDrop` count metric with a **gauge**: count of held positions (qty > 0) with `dayChange <= -5`. The gauge computation itself belongs in stateProvider.js (T-03), not here — this task only defines the metric/gauge id and the badge condition referencing it.
- Invariants to enforce via tests, not runtime: every id in a medal's `badges` exists in ACHIEVEMENTS; every trophy's `medals` ids exist in MEDALS; `1 <= threshold <= set.length`; medal/trophy ids unique and disjoint from badge ids.
- CLAUDE.md: no TS, this is a JS/Vitest repo; 80% line coverage gate enforced in CI.

## Implementation Notes

### `app/src/gamification/defs.js`
- **Removed** the `heldThroughDrop` event-count metric (`{ kind:'count', match:{ type:'position.heldThroughDrop' } }`).
- **Added** `heldThroughDrop` as a **gauge** metric (`source:'heldThroughDrop', target:1`) in the gauges block. The gauge value is computed downstream in stateProvider.js (T-03: held positions with `qty > 0 && dayChange <= -5`); this task only declares the metric/source id.
- **Added** `mentorChosen` count metric matching the existing `hero.unlocked` event (emitted at `useChangeHero.js:31` — no new emitter added), `target:1`.
- **Replaced** the `council` achievement with `mentor` (`condition: { metric:'mentorChosen', op:'>=', value:1 }`). The `steady` achievement condition is unchanged (`heldThroughDrop >= 1`) — it now resolves against the gauge instead of the event count, which is transparent to the condition.
- **Added** `MEDALS` (4 thematic + 3 milestone/Explorer), `TROPHIES` (single `trophy_master`), and the pure `computeProgression(earnedBadgeIds)` helper, verbatim to Gam2req §2.2–2.3.
  - `computeProgression` accepts a `Set` **or** any iterable (normalizes internally) so T-05's `useAchievements` can pass an array of earned rows without ceremony.
  - `progress` is clamped to `Math.min(1, earnedCount/threshold)` so milestone medals (whose `badges` = all ids) don't report >1 when earned count exceeds the threshold. `earnedCount` itself is left un-clamped (it's a true count). Trophies are derived from the medal results of the same call — no re-computation.

### `app/src/tokens.js` — out-of-scope-but-required one-line swap (flagged)
Swapped the single `council` BADGES entry to `mentor` (`name:'Mentored'`, `desc:'Choose your first hero mentor'`, matching T-02's spec). **Rationale:** `meta('mentor')` reads name/desc from BADGES, and the defs invariant test asserts *all 15 achievement ids exist in BADGES*. Landing T-01 with BADGES still on `council` would ship a `mentor` badge with `undefined` name and fail T-01's own tests. This overlaps T-02, which additionally updates the `macro` desc copy — that part was left to T-02. No existing test asserts the old council badge copy, so nothing regressed (930/930 pass).

### Test files (updated in lockstep per Gam2req risk note)
- `gamification.defs.test.js`: added `heldThroughDrop` to `GAUGE_SOURCES`; `council`→`mentor` in the expected-id list; added dedicated suites for the mentor badge, the steady gauge migration, the §2.3 MEDALS/TROPHIES invariants, and `computeProgression` unit cases.
- `gamekit.e2e.test.js` (duplicates defs inline): `heldThroughDrop` count → `mentorChosen` count (matches `hero.unlocked`) + `heldThroughDrop` gauge; `council` achievement → `mentor`; rewrote the `E2E: council` block as `E2E: mentor` (hero.unlocked-driven) and added an `E2E: steady` gauge block; updated the macro-independence case to assert `mentor` (not `council`) stays locked.

### Decisions / tradeoffs
- Kept the internal gauge name `councilSize` unchanged (per Gam2req §2.1) to avoid gamekit churn — only UI copy says "mentor". The `macro` composite still references `councilSize` and is untouched.
- Did not touch stateProvider.js / useAchievements.js — those are T-03/T-05; the gauge/helper contracts are defined here for them to consume.

## Test Plan

Run: `cd app && npx vitest run src/test/gamification.defs.test.js src/test/gamekit.e2e.test.js` (targeted) or `npm run test` (full). Result: **68 targeted / 930 full — all passing**; `eslint` clean on all four changed files.

### `gamification.defs.test.js`
Config-shape invariants (pre-existing, still green): 15 unique achievement ids; every metric ref resolves to a metric id or gauge source; `macro` is the only composite; no custom predicates; names/descs sourced from BADGES tokens.

New coverage added by this task:
1. **Mentor badge** — `mentor` present and `council` absent in ACHIEVEMENTS; `mentor` condition is exactly `{ metric:'mentorChosen', op:'>=', value:1 }`; `mentorChosen` is a `count` metric matching `{ type:'hero.unlocked' }`.
2. **Steady gauge migration** — `heldThroughDrop` is now `kind:'gauge'` with `source:'heldThroughDrop'` and no `match`; no metric matches the removed `position.heldThroughDrop` event; `steady` condition still references `heldThroughDrop`.
3. **MEDALS/TROPHIES invariants (§2.3)** — every medal `badges` id exists in ACHIEVEMENTS; every trophy `medals` id exists in MEDALS; `1 <= threshold <= set size` for medals and trophies; medal/trophy ids unique; medal/trophy ids disjoint from badge ids and from each other.
4. **computeProgression unit cases** —
   - empty set → 0 medals, 0 trophies, all `progress` 0;
   - thematic medal partial (2/4) → not earned, `progress` 0.5;
   - thematic medal complete (4/4) → earned, `progress` 1;
   - milestone medals at 5 / 10 / 15 earned badges → Explorer I/II/III flip on at their thresholds;
   - milestone `progress` clamps to 1 when earnedCount (15) exceeds threshold (5);
   - one badge (`first_trade`) counts toward both its thematic medal and the Explorer medal;
   - trophy earned only when all medals earned (14/15 badges → trophy locked; 15/15 → `medalCount === MEDALS.length`, trophy earned, `trophyCount` 1);
   - accepts a plain array as well as a Set.

### `gamekit.e2e.test.js` (end-to-end via createEngine + fake ports)
Updated/added scenarios:
5. **E2E: mentor** — unlocks after one `hero.unlocked` event; stays locked with no event; stays locked from `councilSize` gauge alone (proves the metric moved off the gauge onto the event).
6. **E2E: steady** — unlocks when `heldThroughDrop` gauge >= 1 (incl. purely from gauge with no `track()` calls); stays locked at gauge 0.
7. **E2E: macro independence** — with `councilSize:1` + a macro chat, `macro` unlocks while `mentor` stays locked (mentor now needs the event, not the gauge).
All other pre-existing E2E scenarios (first_trade, researcher, contrarian, diversified, patient, macro composite, multi-unlock, already-earned exclusion, progress clamping) remain unchanged and green.

### Regression guard
Full suite (`npx vitest run`, 45 files / 930 tests) run after the `tokens.js` council→mentor swap to confirm no dependent test (BADGES copy, achievement store, UI content) regressed.

## Status
Status: TODO

## QA Results

**Overall verdict: PASS.** Implementation matches Gam2req.md §2.1–2.3 and Gam2task.md T-01 spec verbatim. No functional defects found.

### Commands run
- `cd app && npx vitest run src/test/gamification.defs.test.js src/test/gamekit.e2e.test.js` → **68/68 passed**
- `cd app && npx vitest run` (full suite) → **936/936 passed, 45 files** (task file claimed "930" — stale count from before this change added tests; not a discrepancy, actual full-suite run today is 936/936 green)
- `npx eslint src/gamification/defs.js src/test/gamification.defs.test.js src/test/gamekit.e2e.test.js src/tokens.js` → clean, no output

### Test Plan item-by-item

| # | Item | Result |
|---|---|---|
| 1 | Mentor badge: `mentor` present, `council` absent in ACHIEVEMENTS; condition exactly `{metric:'mentorChosen', op:'>=', value:1}`; `mentorChosen` count metric matches `{type:'hero.unlocked'}` | PASS — verified in `defs.js:22,54` and asserted by `gamification.defs.test.js:187-205` |
| 2 | Steady gauge migration: `heldThroughDrop` is `kind:'gauge'`, `source:'heldThroughDrop'`, no `match`; no metric matches removed `position.heldThroughDrop` event; `steady` condition unchanged | PASS — `defs.js:35,52`; asserted `gamification.defs.test.js:207-225` |
| 3 | MEDALS/TROPHIES invariants (§2.3): medal badges ⊆ ACHIEVEMENTS ids; trophy medals ⊆ MEDALS ids; `1 <= threshold <= set size`; ids unique; ids disjoint from badge ids | PASS — `defs.js:74-93`; asserted `gamification.defs.test.js:227-274` |
| 4 | `computeProgression` unit cases: empty set → 0/0/progress 0; thematic partial (2/4) → not earned, progress 0.5; thematic complete → earned, progress 1; milestone at 5/10/15; progress clamp when earnedCount > threshold; one badge counts toward two medals; trophy earned only when all medals earned; accepts Set or array | PASS — all asserted `gamification.defs.test.js:276-359`. Manually re-derived the clamp case: `medal_explorer_1` threshold 5, all 15 badges earned → `earnedCount:15`, `progress: Math.min(1,15/5)=1` — correct, `earnedCount` itself intentionally left un-clamped as documented |
| 5 | E2E steady unlocks on `heldThroughDrop` gauge >=1, incl. no `track()` calls; stays locked at gauge 0 | PASS — `gamekit.e2e.test.js:236-256` |
| 6 | E2E macro independence: `councilSize:1` + macro chat unlocks `macro` while `mentor` stays locked | PASS — `gamekit.e2e.test.js:292-330`, explicit test "mentor NOT required for macro" |
| 7 | E2E mentor: unlocks on `hero.unlocked` event; does NOT unlock from `councilSize` gauge alone (proves metric moved off gauge onto event) | PASS — `gamekit.e2e.test.js:214-231` |
| 8 | Config-shape invariants (pre-existing, still green): 15 unique ids, metric refs resolve, macro sole composite, no custom predicates, names/descs from BADGES | PASS — `gamification.defs.test.js:39-185` |
| 9 | Regression guard: full suite green after `tokens.js` council→mentor swap | PASS — 936/936, 45 files |
| 10 | ESLint clean on all 4 changed files | PASS |

### Code verification notes
- `defs.js` `computeProgression` correctly normalizes `Set` vs. iterable via `earnedBadgeIds instanceof Set ? earnedBadgeIds : new Set(earnedBadgeIds || [])` — handles array, undefined/null, and Set inputs. Confirmed against test `'accepts an array as well as a Set'` (line 354).
- Trophies are derived from the same call's medal results (not recomputed) — matches §2.3 requirement "Trophies computed from the medal results of the same call."
- `ALL_BADGE_IDS` for milestone medals is `ACHIEVEMENTS.map(a => a.id)` — automatically stays in sync if badge ids ever change, no hardcoded duplicate list. Good defensive design, no action needed.
- No runtime invariant checks (medal/trophy id disjointness etc.) — enforced by tests only, as explicitly scoped in the task file. This is a reasonable choice for static config data; flagging only so it's understood these are load-time footguns for anyone hand-editing `defs.js` without running tests, not a runtime safety net.

### Scope-deviation flag — pass to T-02

`app/src/tokens.js` was touched outside T-01's stated file list. The dev-engineer swapped the single `council` BADGES entry to `mentor` (`name: 'Mentored'`, `desc: 'Choose your first hero mentor'`, at line 71) because `defs.js`'s `meta('mentor')` reads name/desc from BADGES, and the invariant test `'all 15 achievement ids exist in BADGES'` would otherwise fail with `mentor` badge name/desc `undefined`. Verified this token entry exactly matches the T-02 spec text in Gam2req.md §Phase 1 table ("Mentored", "Choose your first hero mentor").

**What T-02 still owns:** the `macro` BADGES entry description is still the old copy (`'Ask your council about market conditions'`, tokens.js line 73) — Gam2req.md §Phase 1 specifies it should become "Ask your mentor about market conditions". This was explicitly left untouched by T-01's dev-engineer and is confirmed NOT yet done.

**Action for orchestrator:** tell T-02's dev-engineer NOT to re-touch the `council`→`mentor` BADGES entry (id, name, desc are already correct and covered by passing tests) — only the `macro` description line still needs updating, plus whatever else is in T-02's actual scope (UI screens referencing "council" copy, per Gam2plan.md Phase 4 single-hero MVP copy sweep — HeroSidebar.jsx, AskTab.jsx, HeroChatPanel.jsx, SellScreen.jsx still say "council"/"Ask your council" per grep of gamekit.e2e.test.js context, not yet verified against T-02's actual task file since it wasn't in scope for this QA pass).

### No defects found. No failing tests. No missing coverage against the stated test plan.
