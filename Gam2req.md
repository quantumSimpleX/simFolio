# Gam2plan — Declarative Medal/Trophy Progression + Single-Hero MVP

Implementation plan. **Status: DONE — all 6 phases implemented (T-01 through T-19), plus post-audit fixes T-20/T-21, per Gam2task.md. Re-audit (Gam2uiux.md) confirmed clean, zero new findings — epic closed.**

---

## 1. Context & goals

The gamification engine (`app/src/gamekit/` pure engine + `app/src/gamification/` Supabase/React-Query adapters) is live and badge state is persisted in Supabase (`achievements`, `user_metrics`). Problems:

1. **Rigid, broken ladder** — medals are `floor(earnedBadges / 10)`, trophy unreachable; no thematic meaning.
2. **Dead badges** — `steady` has no emitter for `position.heldThroughDrop`; `council` requires ≥2 heroes but MVP is single-hero.
3. **Legacy DB trigger** — `check_achievements()` (migration 001, trigger `after_execution_insert` on `executions`, line 166) duplicates 5 badge awards server-side; client engine should be the single source of truth.
4. **HeroHandoff is a mock** — hardcoded Warren card, never persists a selection.
5. **Chat history is per-hero** — users who switch mentors lose sight of prior conversations.
6. **Stale docs** — mentor.md claims 7 heroes implemented (all 21 exist); CLAUDE.md describes the 10/10/10 ladder and 3-hero council.

### Core design principle (user requirement): the progression must be trivially changeable later

There is no way to design the whole progression in one pass, so:

- **Only badges are persisted.** The `achievements` table is ground truth. No medal or trophy rows, ever.
- **Medals and trophies are pure derived data**, declared in `defs.js` as `{ badges: [...ids], threshold: n }` / `{ medals: [...ids], threshold: n }`.
- A badge may count toward **any number of medals** — thematic medals ("Trader Medal" over 4 trading badges) and count-based milestone medals ("Explorer I — any 5 badges") overlap freely.
- Tiered milestones = multiple medal entries over the same badge set with rising thresholds (Explorer I/II/III at 5/10/15).
- Changing progression later (add/remove/rename a medal, change a threshold, regroup badges, add a trophy) = **edit one array in defs.js**. Medals are recomputed from earned badge rows on every load, so changes apply **retroactively** with zero migrations and zero backfill.

---

## 2. Progression data model

### 2.1 Badge changes (persisted layer — minimal churn)

| Badge | Change | Mechanism |
|---|---|---|
| `council` → `mentor` | Rename + new trigger ("Mentored" — choose your first hero mentor) | New `mentorChosen` count metric on existing `hero.unlocked` event (already emitted at `useChangeHero.js:31`), target 1. Migration UPDATE renames existing rows; client-side alias until applied. |
| `steady` | Fix dead metric | Replace `position.heldThroughDrop` event metric with a **gauge** in `stateProvider.js`: count of held positions (qty > 0) with `dayChange <= -5`. Positions in `positionsRef` (`useGamification.jsx:40-44`) do **not** carry dayChange — join live quote pct from the React Query `['quotes', ticker]` cache inside the `getPositions` closure. Opportunistic: 0 when quotes uncached is acceptable. |
| `macro` | No metric change | Keeps `all: [councilSize >= 1, macroQuestions >= 1]` — reachable single-hero. Internal gauge name stays `councilSize` (avoid gamekit churn); UI copy says "mentor". |

Final 15 badge ids: `first_trade, limit, contrarian, momentum, diversified, etf, etf2, first_crypto, patient, long_term, steady, researcher, reflection, macro, mentor`.

### 2.2 MEDALS / TROPHIES (new exports in `app/src/gamification/defs.js`)

```js
const ALL_BADGE_IDS = ACHIEVEMENTS.map(a => a.id)

export const MEDALS = [
  // Thematic — full set required (threshold = set size)
  { id: 'medal_trader',   name: 'Trader Medal',    desc: 'Master every trading style badge',
    badges: ['first_trade', 'limit', 'contrarian', 'momentum'], threshold: 4 },
  { id: 'medal_builder',  name: 'Builder Medal',   desc: 'Build a diversified portfolio',
    badges: ['diversified', 'etf', 'etf2', 'first_crypto'], threshold: 4 },
  { id: 'medal_longterm', name: 'Long-term Medal', desc: 'Prove your patience',
    badges: ['patient', 'long_term', 'steady'], threshold: 3 },
  { id: 'medal_student',  name: 'Student Medal',   desc: 'Learn from the greats',
    badges: ['researcher', 'reflection', 'macro', 'mentor'], threshold: 4 },
  // Milestone — any badges count (the flexible "explorer" pattern)
  { id: 'medal_explorer_1', name: 'Explorer I',   desc: 'Earn any 5 badges',  badges: ALL_BADGE_IDS, threshold: 5 },
  { id: 'medal_explorer_2', name: 'Explorer II',  desc: 'Earn any 10 badges', badges: ALL_BADGE_IDS, threshold: 10 },
  { id: 'medal_explorer_3', name: 'Explorer III', desc: 'Earn all 15 badges', badges: ALL_BADGE_IDS, threshold: 15 },
]

export const TROPHIES = [
  { id: 'trophy_master', name: 'Master of Trading', desc: 'Earn every medal',
    medals: MEDALS.map(m => m.id), threshold: MEDALS.length },
]
```

### 2.3 `computeProgression(earnedBadgeIds)` — pure helper, same file

```js
// earnedBadgeIds: Set<string>
// returns {
//   medals:   [{ ...def, earnedCount, earned: bool, progress: earnedCount/threshold }],
//   trophies: [{ ...def, earnedCount, earned: bool, progress }],
//   medalCount, trophyCount
// }
export function computeProgression(earnedBadgeIds) { ... }
```

No React, no IO — unit-testable in isolation. Trophies computed from the medal results of the same call.

**Invariants (enforced by tests, not runtime code):** every id in every medal's `badges` exists in ACHIEVEMENTS; every trophy's `medals` ids exist in MEDALS; `1 <= threshold <= set.length`; medal/trophy ids unique and disjoint from badge ids.

---

## 3. Phases

Dependency order: **1 → 2 → 3** are one feature (engine → migration → UI). **4, 5, 6** are independent of each other and of 1–3 (5 depends on the `mentor` badge from Phase 1 for the badge-earn moment, but is functionally independent). One commit per phase.

### Phase 1 — Defs, tokens, hooks (engine layer) [DONE]

| File | Change |
|---|---|
| `app/src/tokens.js` | BADGES (lines ~61–77): replace `council` entry with `mentor` ("Mentored", "Choose your first hero mentor"). Update `macro` desc → "Ask your mentor about market conditions". |
| `app/src/gamification/defs.js` | Remove `heldThroughDrop` event metric; add `{ id:'heldThroughDrop', kind:'gauge', source:'heldThroughDrop', target:1 }`. Add `{ id:'mentorChosen', kind:'count', match:{ type:'hero.unlocked' }, target:1 }`. Replace `council` achievement with `mentor` (condition `mentorChosen >= 1`). Add `MEDALS`, `TROPHIES`, `computeProgression` exports (§2.2–2.3). |
| `app/src/gamification/stateProvider.js` | New gauge `heldThroughDrop`: `positions.filter(p => p.qty > 0 && p.dayChange <= -5).length`. |
| `app/src/gamification/useGamification.jsx` | In the effect that fills `positionsRef` (lines ~40–44), join each position with `queryClient.getQueryData(['quotes', ticker])` day-change pct so `p.dayChange` exists for the gauge. |
| `app/src/hooks/useAchievements.js` | Rewrite return shape: `{ badges, medals, trophies, earnedCount, medalCount, trophyCount, isLoading }` using `computeProgression`. Client-side alias: treat earned row `council` as `mentor` (safety until migration 005 applied). Delete `floor(count/10)` math. |

**Tests (same commit — CI has an 80% line gate):**
- `gamification.defs.test.js` — updated metric/achievement id lists; macro composite unchanged; new invariant assertions (§2.3); `computeProgression` unit cases: empty set, thematic medal partial/complete, milestone medal at 5/10/15, one badge counting toward two medals, trophy earned only when all medals earned.
- `gamekit.e2e.test.js` — **duplicates defs inline; must be updated in the same commit**: council cases → mentor via `hero.unlocked`; steady as gauge.
- `gamification.stateProvider.test.js` — heldThroughDrop gauge: positions with/without dayChange, qty=0 excluded, missing quote → not counted.
- `hooks.test.jsx` — useAchievements new shape; council→mentor alias; medal/trophy counts for a fixture set of earned rows.

### Phase 2 — Migration: retire the DB trigger [DONE]

New file `app/supabase/migrations/005_retire_achievement_trigger.sql`:

```sql
DROP TRIGGER IF EXISTS after_execution_insert ON executions;
DROP FUNCTION IF EXISTS check_achievements();
UPDATE achievements SET achievement_type = 'mentor' WHERE achievement_type = 'council';
```

(Trigger and function names verified in `001_initial_schema.sql` — function line 115, trigger line 166.) After this, the client engine's silent backfill on load is the **only** awarder. No new tables — medals/trophies stay derived.

### Phase 3 — Achievements UI polish [DONE]

| File | Change |
|---|---|
| `app/src/screens/achievements/AchievementsMobile.jsx` | Summary card: total badge count + **medal shelf** — every MEDALS entry rendered as a MedalGlyph with earned/locked state and "3 of 4" progress; trophy at the end. Body: badge grid grouped under the four thematic medals (eyebrow "TRADER MEDAL — 3 OF 4", Barlow 11px uppercase 0.14em; thin ame-400 progress bar per group). Explorer medals appear in the shelf only, not as groups. Counts in Barlow (MOMCAKE one-number-per-screen rule intact). Tokens only, no emoji. |
| `app/src/screens/achievements/BadgeEarned.jsx` | Keep full-screen ink-900 reveal, no bounce. Add **medal-earned variant**: diff `computeProgression` before/after the awarded badge; for each medal whose threshold was crossed, queue a follow-up reveal (MedalGlyph + "{Medal name} earned", gold accent). Multiple medals crossed by one badge queue sequentially — never dropped. |
| `app/src/screens/profile/Profile.jsx` | Replace 10/10/10 ladder copy with medal-shelf summary. |
| `CLAUDE.md` (Achievement System section) | Replace "10 badges → 1 medal → 10 medals → 1 trophy" with the declarative model: badges persisted; medals/trophies derived from `MEDALS`/`TROPHIES` in defs.js. |

**Tests:** `gamification.a11y.test.jsx`, `gamification.badgeEarned.test.jsx` (medal variant + multi-medal queue), `screens.smoke.test.jsx`, `ux-content.test.jsx` (old ladder copy assertions removed).

### Phase 4 — Single-hero MVP docs + copy sweep [DONE]

| File | Change |
|---|---|
| `app/src/data/mentor.md` | Rewrite: one active hero for MVP; **all 21 personas implemented** and available via FindMentor (fix stale "7 implemented" claim); multi-hero council deferred to a later version; drop "max council of 3". |
| `CLAUDE.md` (Hero System) | "Maximum council: 3 heroes" → single active mentor for MVP, council deferred. |
| `app/src/components/HeroSidebar.jsx:58` | "{n} of 3 council slots — watching your portfolio" → "Your mentor — watching your portfolio". |
| `app/src/screens/portfolio/AskTab.jsx` | "Your Council" header → hero name / "Your Mentor"; avatar stack `slice(0,3)` → single avatar. |
| `app/src/components/HeroChatPanel.jsx` | Placeholder "Ask your council…" → "Ask your mentor…"; fallback copy likewise. |
| `app/src/screens/trade/SellScreen.jsx:85` | "Ask your council first" → "Ask your mentor first". |

**Tests:** `components.test.jsx` (placeholder/fallback strings), `ux-content.test.jsx`, `screens.smoke.test.jsx`.

### Phase 5 — HeroHandoff persists a real selection [DONE]

`app/src/screens/trade/HeroHandoff.jsx` (route `/hero-handoff`, reached from TradeReceipt after first buy):

- Ranking: `useOnboardingAnswers()` + `useHeroRanking(answers, { count: 1, includeWarren: true, pinnedId: heroIdFromName(answers.heroMention) })` — mirrors `FindMentor.jsx:72-77`. Fallback `'warren'` while loading / on error.
- Render intro card from `HERO_DATA[heroId]` (name, initials, color, style) instead of hardcoded Warren strings; match-signal copy from `answers.goal`.
- **Both CTAs persist** via `useChangeHero().mutate(heroId)` — this fires `hero.unlocked`, which earns the `mentor` badge at the right narrative moment. Primary "Talk to {name}" → `/ask` (mobile) / `/portfolio` (desktop); ghost "Continue buying first" → `/markets`.
- Guard: if `useHeroSelections` already has a hero, skip persisting (don't clobber).

**Tests:** new `heroHandoff.test.jsx` — renders recommended hero; persists on both CTAs; warren fallback; skip-if-already-selected.

### Phase 6 — Cross-hero chat history [DONE]

`hero_conversations` already stores `hero_id` per row — **no schema change**. LLM context in the `hero-chat` edge function stays per-hero (personas must not inherit each other's replies).

| File | Change |
|---|---|
| `app/src/hooks/useHeroChat.js` | New `useConversationHistory()`: like `useHeroHistory` but selects `hero_id`, **no** `.eq('hero_id')` filter, key `['conversation-history', user?.id]`, limit ~100 (pagination = follow-up). `useHeroChat` onMutate/onSuccess also optimistically appends to and invalidates this key (user message tagged with current heroId). Keep `useHeroHistory` for hero-scoped uses. |
| `app/src/components/HeroChatPanel.jsx` | ChatMessages: assistant bubbles render `<HeroMessage hero={msg.hero_id ?? heroId}>` (HERO_MAP in `HeroMessage.jsx` covers all 21 + sage). When an assistant message's hero_id differs from the previous assistant message's, render a centered eyebrow divider "{Hero Name} joins" (Barlow 11px uppercase 0.14em, ink-400). |
| `app/src/screens/portfolio/AskTab.jsx` + `app/src/components/HeroSidebar.jsx` | Chat reads `useConversationHistory()`; sending still targets `heroes[0]`. |
| `CLAUDE.md` | Query-keys line: add `['conversation-history', userId]`. |

**Tests:** `heroChat.test.jsx` (new hook: no hero filter, key shape, optimistic append to both keys), `components.test.jsx` (mixed-hero rendering + divider placement).

---

## 4. Verification

Per phase: `cd app && npm run lint && npm run test:coverage` (80% line gate must pass).

Manual end-to-end (dev server, after all phases):
1. First trade → HeroHandoff shows a ranked (not hardcoded) hero → CTA persists selection → `mentor` badge reveals.
2. Earn a 5th badge → badge reveal followed by "Explorer I earned" medal moment.
3. Achievements screen: medal shelf shows per-medal progress; badge grid grouped by thematic medal.
4. Switch mentor via FindMentor, chat → history shows both heroes' messages with correct avatars and a "{Hero} joins" divider.
5. Apply migration 005 locally → placing trades no longer inserts trigger-awarded rows; client backfill still awards.

## 5. Risks

- `gamekit.e2e.test.js` duplicates defs inline — must move in lockstep with defs.js or CI fails (Phase 1, same commit).
- steady gauge silently 0 if the quote-pct join isn't wired — Phase 1 includes the join and a stateProvider test.
- After the trigger drop, a client-engine bug means no awards at all; the silent backfill on load is the safety net — keep it tested.
- Medal-earned reveal must handle multiple thresholds crossed by one badge (queue sequentially).
- Existing earned `council` rows: migration UPDATE + client-side alias until applied.
- Cross-history limit ~100 may truncate old heroes' messages — acceptable for MVP; pagination is a noted follow-up.

## 6. Post-audit findings (Gam2uiux.md, 2026-07-11)

A `uiux-auditor` pass against the live app after T-01–T-19 landed found the Phase-1 "delete `floor(count/10)` math" requirement was applied to `useAchievements.js` but never propagated to the full-screen badge/medal/trophy reveal moment, and a stale route title. Tasks T-20/T-21 tracked the fixes and are both DONE (dev+QA passed) — see `Gam2task.md`. A re-audit is pending to confirm closure.

| # | Finding | Severity | File | Task |
|---|---|---|---|---|
| 1 | Badge-earned reveal shows `earnedCount % 10` fake progress ("1 of 10 toward your first medal") instead of the real nearest-medal threshold from `MEDALS`/`computeProgression` | Blocking | `app/src/screens/achievements/BadgeEarned.jsx:116-123` | T-20 |
| 2 | Medal-earned reveal `progressSub` hardcoded `'Earn 9 more medals to unlock a trophy.'` regardless of actual remaining count (only 7 medals exist, "9 more" is never true) | Blocking | `app/src/screens/achievements/BadgeEarned.jsx:59,132` | T-20 |
| 3 | Trophy-earned reveal still renders a "1 of 10 toward Master of Trading" progress ring/copy on the screen where the user just earned the trophy (no next threshold exists) | Blocking | `app/src/screens/achievements/BadgeEarned.jsx:70-71,135` | T-20 |
| 4 | `/hero-handoff` route `document.title` still reads "Your Council" (WCAG 2.4.2 page-title, screen-reader/tab-title only, not visible in page body) | Major | `app/src/App.jsx:60` | T-21 |

Explicitly NOT new requirements (flagged by the auditor as pre-existing/out-of-scope, no task created): `ink-400` on `paper` contrast ratio (3.47:1, systemic design-system token issue, not introduced by this feature); a `user_metrics` 404 on page load (stale local session data, unrelated to this epic).
