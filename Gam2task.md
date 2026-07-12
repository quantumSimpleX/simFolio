# Gam2task — Task Graph for Gam2req.md

Derived from `Gam2req.md`. Task order below groups by real dependency (shared contract:
`defs.js` MEDALS/TROPHIES/computeProgression + `mentor` badge rename), not by the
narrative Phase 1-6 order. Gam2req's own phase grouping mostly holds as a dependency
edge for Phase 1→2→3, but Phase 4/5/6 are correctly noted in Gam2req as independent —
this graph makes that explicit and further splits Phase 1 and Phase 3, which each
bundle multiple independently-verifiable file changes.

## Shared contract (do first)

**T-01 defs.js: mentor badge rename + gauge metrics + MEDALS/TROPHIES/computeProgression** [DONE]
This is the chokepoint every other Phase-1/2/3 task depends on. Must land before T-02..T-08.

## Dependency summary

```
T-01 (contract) ──┬─→ T-02 (tokens.js BADGES copy)         [parallel-safe with T-03..T-05]
                   ├─→ T-03 (stateProvider gauge)           [parallel-safe with T-02,T-04,T-05]
                   ├─→ T-04 (useGamification dayChange join) [parallel-safe with T-02,T-03,T-05]
                   ├─→ T-05 (useAchievements rewrite)        [needs T-01 only; not T-03/T-04]
                   ├─→ T-06 (migration 005)                  [needs T-01 landed conceptually; DB-only, no code dep]
                   ├─→ T-07 (AchievementsMobile medal shelf) [needs T-01,T-05]
                   ├─→ T-08 (BadgeEarned medal-earned variant)[needs T-01,T-05]
                   └─→ T-09 (Profile.jsx medal summary)      [needs T-05]

T-10 (mentor.md rewrite)          — independent, no code dep
T-11 (CLAUDE.md copy sweep)       — independent, no code dep (touches Hero System + Achievement System + query-keys sections; can be one task or done piecemeal — kept single since it's one file, low risk of conflict since sections are disjoint... see note)
T-12 (HeroSidebar.jsx council copy)  — independent
T-13 (AskTab.jsx council copy)       — independent
T-14 (HeroChatPanel.jsx placeholder copy) — independent (copy only; T-14 is copy-only, distinct from T-17 which touches same file for chat history rendering — see false-dependency note)
T-15 (SellScreen.jsx council copy)   — independent

T-16 (HeroHandoff.jsx real selection) — needs T-01 (mentor badge fires via hero.unlocked, already wired at useChangeHero.js:31 — no code dependency, just semantic; T-16 can be built/tested independently of T-01 landing)

T-17 (useHeroChat.js: useConversationHistory hook) — independent; shared contract for T-18/T-19
T-18 (HeroChatPanel.jsx: mixed-hero rendering + divider) — needs T-17 (consumes the hook's data shape) AND touches same file as T-14 (sequential if same dev, but no data dependency — false dependency called out below)
T-19 (AskTab.jsx + HeroSidebar.jsx: wire useConversationHistory) — needs T-17
```

**False dependencies avoided:**
- Gam2req frames Phase 1 as one commit; in reality T-02 (tokens.js copy), T-03 (stateProvider gauge),
  T-04 (useGamification join), and T-05 (useAchievements rewrite) touch disjoint files and only share
  the T-01 contract — they do not depend on each other and can run in parallel once T-01 lands.
- T-06 (SQL migration) has no import/compile dependency on T-01's JS changes — it can be written and
  reviewed in parallel with T-01-T-05; it only needs to be *applied* after client-side alias code exists
  (per Gam2req §5 risk note), which is a deployment-order concern, not an implementation-order one.
- T-10 (mentor.md), T-11 (CLAUDE.md), T-12-T-15 (single-hero copy sweep) are listed under "Phase 4" in
  Gam2req narratively after Phases 1-3, but touch entirely disjoint files from T-01-T-09 and were already
  correctly flagged in Gam2req as independent. They're also independent *from each other* (5 separate files).
- T-14 and T-18 both touch `HeroChatPanel.jsx` but for unrelated concerns (placeholder string vs.
  message-rendering/divider logic) — no shared code path. Sequencing them is only a merge-conflict
  convenience, not a true dependency; listed sequential-by-convenience only if same file is being hand-edited
  by two different agents concurrently.
- T-16 (HeroHandoff) mirrors FindMentor.jsx's ranking call and calls `useChangeHero().mutate()` — it does
  not need T-01's badge defs to exist to be implemented or tested (the `mentor` badge condition consuming
  `hero.unlocked` is already-existing plumbing per Gam2req §2.1). Treat as parallel-safe with T-01-T-09.

---

## Task list

### T-01 defs.js: mentor rename + gauge + MEDALS/TROPHIES/computeProgression [DONE]
- **Touches:** `app/src/gamification/defs.js`, `app/src/test/gamification.defs.test.js`, `app/src/test/gamekit.e2e.test.js` (duplicates defs inline — must update in lockstep per Gam2req §Risks)
- **Depends on:** none
- **Work:** Remove `heldThroughDrop` event metric, add gauge metric (source `heldThroughDrop`, target 1). Add `mentorChosen` count metric (match `hero.unlocked`, target 1). Replace `council` achievement with `mentor` (condition `mentorChosen >= 1`). Add `MEDALS`, `TROPHIES`, `computeProgression` per Gam2req §2.2-2.3.
- **Verify:** `gamification.defs.test.js` new invariant + computeProgression unit cases; `gamekit.e2e.test.js` updated council→mentor / steady-as-gauge cases pass.

### T-02 tokens.js BADGES copy update [DONE]
- **Touches:** `app/src/tokens.js` (BADGES ~lines 61-77)
- **Depends on:** T-01 (id `mentor` must exist in defs to match; copy-only otherwise)
- **Work:** Replace `council` entry with `mentor` ("Mentored", "Choose your first hero mentor"). Update `macro` desc to "Ask your mentor about market conditions".
- **Verify:** `ux-content.test.jsx` / any BADGES-copy assertions; manual check badge grid renders new copy.

### T-03 stateProvider.js: heldThroughDrop gauge [DONE]
- **Touches:** `app/src/gamification/stateProvider.js`, `app/src/test/gamification.stateProvider.test.js`
- **Depends on:** T-01 (gauge metric id must exist)
- **Work:** Implement gauge: `positions.filter(p => p.qty > 0 && p.dayChange <= -5).length`.
- **Verify:** `gamification.stateProvider.test.js` — positions with/without dayChange, qty=0 excluded, missing quote not counted.

### T-04 useGamification.jsx: dayChange join for positions [DONE]
- **Touches:** `app/src/gamification/useGamification.jsx` (positionsRef effect, ~lines 40-44)
- **Depends on:** none functionally (independent of T-01/T-03 code, but pointless without T-03 consuming it — parallel-safe to implement)
- **Work:** Join each position with `queryClient.getQueryData(['quotes', ticker])` day-change pct so `p.dayChange` exists. Opportunistic: 0 when quote uncached is acceptable.
- **Verify:** `gamification.useGamification.test.jsx` — position gets dayChange when quote cached, omits/defaults when not.

### T-05 useAchievements.js: rewrite return shape [DONE]
- **Touches:** `app/src/hooks/useAchievements.js`, `app/src/test/hooks.test.jsx`
- **Depends on:** T-01 (needs `computeProgression`, `MEDALS`, `TROPHIES` exports)
- **Work:** Return `{ badges, medals, trophies, earnedCount, medalCount, trophyCount, isLoading }` via `computeProgression`. Client-side alias: earned row `council` treated as `mentor` until migration 005 applied. Delete `floor(count/10)` math.
- **Verify:** `hooks.test.jsx` — new shape; council→mentor alias; medal/trophy counts for fixture earned-badge set.

### T-06 Migration 005: retire achievement trigger [DONE]
- **Touches:** new `app/supabase/migrations/005_retire_achievement_trigger.sql`
- **Depends on:** none (SQL-only; conceptually pairs with T-01/T-05 client alias per Gam2req §5 but no code import dependency)
- **Work:** `DROP TRIGGER after_execution_insert ON executions; DROP FUNCTION check_achievements(); UPDATE achievements SET achievement_type='mentor' WHERE achievement_type='council';`
- **Verify:** Manual — apply locally, place a trade, confirm no trigger-awarded row inserted; client backfill still awards (Gam2req §4 step 5).

### T-07 AchievementsMobile.jsx: medal shelf + grouped badge grid [DONE]
- **Touches:** `app/src/screens/achievements/AchievementsMobile.jsx`, `app/src/test/gamification.a11y.test.jsx`, `app/src/test/screens.smoke.test.jsx`
- **Depends on:** T-01, T-05 (consumes `medals`/`trophies` from useAchievements)
- **Work:** Summary card gets medal shelf (MedalGlyph per MEDALS entry, earned/locked, "3 of 4" progress) + trophy. Badge grid grouped under 4 thematic medals with eyebrow label + ame-400 progress bar. Explorer medals shelf-only. Tokens only, no emoji, MOMCAKE one-number rule intact.
- **Verify:** `gamification.a11y.test.jsx`, `screens.smoke.test.jsx`; manual check grouping + progress bars.

### T-08 BadgeEarned.jsx: medal-earned variant [DONE]
- **Touches:** `app/src/screens/achievements/BadgeEarned.jsx`, `app/src/test/gamification.badgeEarned.test.jsx`
- **Depends on:** T-01, T-05 (diffs `computeProgression` before/after)
- **Work:** Keep full-screen ink-900 reveal, no bounce. Add medal-earned variant: diff progression before/after awarded badge; queue sequential reveal (MedalGlyph + "{Medal name} earned", gold accent) for each threshold crossed — never dropped, even if multiple.
- **Verify:** `gamification.badgeEarned.test.jsx` — medal variant + multi-medal queue case.

### T-09 Profile.jsx: medal-shelf summary [DONE]
- **Touches:** `app/src/screens/profile/Profile.jsx`
- **Depends on:** T-05 (consumes new useAchievements shape)
- **Work:** Replace 10/10/10 ladder copy with medal-shelf summary.
- **Verify:** `screens.smoke.test.jsx`, `ux-content.test.jsx` (old ladder copy assertions removed).

### T-10 mentor.md rewrite [DONE]
- **Touches:** `app/src/data/mentor.md`
- **Depends on:** none
- **Work:** One active hero for MVP; all 21 personas implemented (fix stale "7 implemented"); multi-hero council deferred; drop "max council of 3".
- **Verify:** Manual read-through; no test file (docs-only).

### T-11 CLAUDE.md copy sweep (Achievement System + Hero System + query-keys) [DONE]
- **Touches:** `CLAUDE.md` (repo root)
- **Depends on:** none for Hero System section; conceptually reflects T-01 (Achievement System) and T-17 (query-keys line) but is docs-only so no code dependency
- **Work:** Replace "10 badges → 1 medal → 10 medals → 1 trophy" with declarative model description. Replace "Maximum council: 3 heroes" with single active mentor for MVP. Add `['conversation-history', userId]` to query-keys list.
- **Verify:** Manual read-through against actual implemented behavior once T-01/T-17 land.

### T-12 HeroSidebar.jsx: council→mentor copy [DONE]
- **Touches:** `app/src/components/HeroSidebar.jsx:58`
- **Depends on:** none
- **Work:** "{n} of 3 council slots — watching your portfolio" → "Your mentor — watching your portfolio".
- **Verify:** `components.test.jsx` placeholder/fallback string assertions.

### T-13 AskTab.jsx: council→mentor copy [DONE]
- **Touches:** `app/src/screens/portfolio/AskTab.jsx`
- **Depends on:** none
- **Work:** "Your Council" header → hero name / "Your Mentor"; avatar stack `slice(0,3)` → single avatar.
- **Verify:** `ux-content.test.jsx`, `screens.smoke.test.jsx`.

### T-14 HeroChatPanel.jsx: placeholder copy [DONE]
- **Touches:** `app/src/components/HeroChatPanel.jsx` (placeholder text only)
- **Depends on:** none
- **Work:** "Ask your council…" → "Ask your mentor…"; fallback copy likewise.
- **Verify:** `components.test.jsx` placeholder/fallback string assertions.

### T-15 SellScreen.jsx: council→mentor copy [DONE]
- **Touches:** `app/src/screens/trade/SellScreen.jsx:85`
- **Depends on:** none
- **Work:** "Ask your council first" → "Ask your mentor first".
- **Verify:** `ux-content.test.jsx`.

### T-16 HeroHandoff.jsx: persist real hero selection [DONE]
- **Touches:** `app/src/screens/trade/HeroHandoff.jsx`, new `app/src/test/heroHandoff.test.jsx`
- **Depends on:** none (mirrors existing FindMentor.jsx pattern; mentor badge award is a side effect of already-existing `hero.unlocked` emission, not a new dependency)
- **Work:** Ranking via `useOnboardingAnswers()` + `useHeroRanking(answers, { count:1, includeWarren:true, pinnedId: heroIdFromName(answers.heroMention) })`, mirrors `FindMentor.jsx:72-77`. Fallback `'warren'` while loading/on error. Render intro card from `HERO_DATA[heroId]` instead of hardcoded Warren strings. Both CTAs persist via `useChangeHero().mutate(heroId)`. Primary → `/ask` (mobile) / `/portfolio` (desktop); ghost → `/markets`. Guard: skip persisting if `useHeroSelections` already has a hero.
- **Verify:** new `heroHandoff.test.jsx` — renders recommended hero; persists on both CTAs; warren fallback; skip-if-already-selected.

### T-17 useHeroChat.js: useConversationHistory hook [DONE]
- **Touches:** `app/src/hooks/useHeroChat.js`, `app/src/test/heroChat.test.jsx`
- **Depends on:** none. Shared contract for T-18/T-19.
- **Work:** New `useConversationHistory()`: like `useHeroHistory` but selects `hero_id`, no `.eq('hero_id')` filter, key `['conversation-history', user?.id]`, limit ~100. `useHeroChat` onMutate/onSuccess also optimistically appends to and invalidates this key (user message tagged with current heroId). Keep `useHeroHistory` for hero-scoped uses.
- **Verify:** `heroChat.test.jsx` — no hero filter, key shape, optimistic append to both keys.

### T-18 HeroChatPanel.jsx: mixed-hero rendering + divider [DONE]
- **Touches:** `app/src/components/HeroChatPanel.jsx` (ChatMessages rendering), `app/src/test/components.test.jsx`
- **Depends on:** T-17 (consumes conversation-history data shape with hero_id per message)
- **Work:** Assistant bubbles render `<HeroMessage hero={msg.hero_id ?? heroId}>` (HERO_MAP already covers all 21 + sage). When an assistant message's hero_id differs from previous assistant message's, render centered eyebrow divider "{Hero Name} joins" (Barlow 11px uppercase 0.14em, ink-400).
- **Verify:** `components.test.jsx` — mixed-hero rendering + divider placement.

### T-19 AskTab.jsx + HeroSidebar.jsx: wire useConversationHistory [DONE]
- **Touches:** `app/src/screens/portfolio/AskTab.jsx`, `app/src/components/HeroSidebar.jsx`
- **Depends on:** T-17
- **Work:** Chat reads `useConversationHistory()` instead of hero-scoped history; sending still targets `heroes[0]`.
- **Verify:** `screens.smoke.test.jsx`; manual check chat panel shows cross-hero history.

### T-20 BadgeEarned.jsx: real medal/trophy progression math [DONE]
- **Touches:** `app/src/screens/achievements/BadgeEarned.jsx`, `app/src/test/gamification.badgeEarned.test.jsx`
- **Depends on:** none. (`computeProgression`/`MEDALS`/`TROPHIES` from T-01's `defs.js` already exist; this task only fixes `BadgeEarned.jsx`'s own stale local math.)
- **Work:** Post-audit fix (Gam2uiux.md finding 1-3). Badge tier: replace `earnedCount % 10` with the real nearest-medal progress — find the medal (from `MEDALS`) that contains the just-earned badge and compute progress toward its `threshold` via `computeProgression`, not a mod-10 guess. Medal tier: `progressSub` must be derived (`TROPHIES[0].threshold - medalCount` remaining, not the hardcoded "Earn 9 more medals..." string — there are only 7 medals total, so "9 more" is never true). Trophy tier: drop the "toward Master of Trading" progress ring/copy entirely (no next threshold exists at trophy tier) — render a plain "you've mastered every medal" state instead, matching the no-bounce/deliberate full-screen treatment already correct elsewhere in this file.
- **Verify:** `gamification.badgeEarned.test.jsx` — add assertions on the actual rendered progress copy/values (not just presence of a title), for all three tiers (badge/medal/trophy), including a case where a badge completes a medal whose threshold isn't 10.

### T-21 App.jsx: hero-handoff route title copy [DONE]
- **Touches:** `app/src/App.jsx:60` (`ROUTE_TITLES['hero-handoff']`)
- **Depends on:** none.
- **Work:** Post-audit fix (Gam2uiux.md finding 4). `'hero-handoff': 'Your Council'` → `'Your Mentor'` (or similar single-mentor-consistent copy) in `ROUTE_TITLES`. Sets `document.title`, not visible in page body — screen-reader/tab-title only.
- **Verify:** No existing test asserts on this route's title (confirmed via grep in the audit) — add one, e.g. a small assertion in `screens.smoke.test.jsx` or wherever `ROUTE_TITLES`/`document.title` is otherwise tested, that `/hero-handoff` sets a title without "Council" in it.

---

## Manual E2E (after all tasks, per Gam2req §4)
1. First trade → HeroHandoff shows ranked hero → CTA persists → `mentor` badge reveals. (needs T-16, T-01, T-02)
2. Earn 5th badge → badge reveal → "Explorer I earned" medal moment. (needs T-01, T-05, T-08)
3. Achievements screen: medal shelf + grouped badge grid. (needs T-07)
4. Switch mentor, chat → history shows both heroes + "{Hero} joins" divider. (needs T-16, T-17, T-18, T-19)
5. Apply migration 005 locally → trigger no longer awards; client backfill still does. (needs T-06, T-01, T-05)

## Total: 19 tasks (T-01 through T-19)
