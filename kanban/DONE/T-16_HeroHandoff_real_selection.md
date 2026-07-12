# T-16 HeroHandoff.jsx: persist real hero selection

## Goal
HeroHandoff shows the actually-ranked recommended hero (not a hardcoded Warren card) and
persists the user's choice via `useChangeHero`, from either CTA.

## Files/modules touched
- `app/src/screens/trade/HeroHandoff.jsx`
- New: `app/src/test/heroHandoff.test.jsx`

## Dependencies
None. (Mirrors the existing `FindMentor.jsx` ranking pattern; the `mentor` achievement badge
firing off `hero.unlocked` is pre-existing plumbing per Gam2req §2.1/§1 problem 4 — this task
does not need T-01 to land first to be implemented or tested.)

## Context pointers
- Gam2req.md §1 problem 4: "HeroHandoff is mock — hardcoded Warren card, never persists selection."
- Gam2req.md §3 Phase 5 (implied by risk note §5): "skip persisting if user already has a hero selected (don't clobber)."
- Implementation should mirror `app/src/screens/onboarding/FindMentor.jsx` (or wherever `useHeroRanking` is currently called, ~lines 72-77 per Gam2req) — reuse `useOnboardingAnswers()` + `useHeroRanking(answers, { count: 1, includeWarren: true, pinnedId: heroIdFromName(answers.heroMention) })`.
- Fallback to `'warren'` while loading or on error.
- Render the intro card from `HERO_DATA[heroId]` instead of hardcoded Warren strings.
- Both CTAs (primary + ghost) call `useChangeHero().mutate(heroId)` to persist, except when `useHeroSelections` shows a hero is already selected — in that case skip persisting (don't clobber existing choice).
- Primary CTA routes to `/ask` (mobile) / `/portfolio` (desktop); ghost CTA routes to `/markets`.
- CLAUDE.md Hero System: Heroes are introduced after first trade (except the "zero stock ideas" exception during onboarding) — HeroHandoff is the first-trade moment, confirm routing/timing assumptions match.

## Implementation Notes
Rewrote `app/src/screens/trade/HeroHandoff.jsx` (was a static hardcoded Warren card):

- `HeroHandoff.jsx:24` — `useOnboardingAnswers()` feeds `heroIdFromName(answers.heroMention)` (`:27`) into
  `useHeroRanking(answers, { count: 1, includeWarren: true, pinnedId })` (`:28`), mirroring
  `FindMentor.jsx:72-77`. FindMentor lives at `app/src/screens/heroes/FindMentor.jsx` (not
  `screens/onboarding/` as the task pointer implied) — same ranking pattern regardless.
- `HeroHandoff.jsx:35` — `heroId = isLoading || isError || !heroIds?.[0] ? 'warren' : heroIds[0]`.
  Explicit Warren fallback: because `useHeroRanking` with `includeWarren:true` uses `resolveMentorHeroes`,
  `heroIds[0]` is a rule-based hero even mid-load, so the loading/error guard is required to actually
  land on Warren (verified by the loading test — heroIds has `cathie` yet the card shows Warren).
- `HeroHandoff.jsx:48-53` (`HERO_DATA[heroId]`) renders the intro card dynamically: name, initials, color
  via the shared `HeroAvatar` primitive (size 48, gets the grayscale portrait + colored fallback), `style`
  as the accent subtitle (inline `hero.color`), and `philosophy` as the italic body. Both Sage messages and
  the "From here, {name} will be your guide" line are now interpolated with `hero.name` (previously hardcoded
  "Warren"/"Apple"). Match-signal copy is derived from `answers.goal` (`matchSignal()`, `:13-21`).
- `HeroHandoff.jsx:42-45` — `proceed(to)`: persists via `useChangeHero().mutate(heroId)` **only when**
  `useHeroSelections().heroes.length === 0` (the "don't clobber" guard), then navigates. Persisting fires
  `hero.unlocked` → earns the `mentor` badge at this first-trade narrative moment (matches CLAUDE.md Hero
  System: heroes introduced after first trade; HeroHandoff is that moment, reached from TradeReceipt via
  `/hero-handoff`).
- Routing: primary CTA "Talk to {name}" → `/portfolio` (desktop, via `useIsDesktop()`) / `/ask` (mobile);
  ghost CTA "Continue buying first" → `/markets`. Both go through `proceed()` so both persist.
- The "already selected" hook is `useHeroSelections` (exists at `app/src/hooks/useHeroSelections.js`,
  returns `{ heroes }`) — matches the task's assumed name.
- Deviation from literal spec: primary CTA label uses the full `HERO_DATA` name ("Talk to Cathie Wood")
  rather than a first name, for deterministic rendering against the single source of truth.

## Test Plan
New `app/src/test/heroHandoff.test.jsx` (7 tests, all passing). Uses `vi.hoisted` + `vi.mock` to stub the
data hooks (`useHeroRanking`, `useHeroSelections`, `useChangeHero`, `useOnboardingAnswers`, `useIsDesktop`)
and `useNavigate`, isolating HeroHandoff's own selection/persist/route logic (the underlying hooks are
covered by `findMentor.test.jsx`):
1. Renders the top-ranked hero (`cathie`) — asserts "Cathie Wood" present, "Warren Buffett" absent, CTA
   label "Talk to Cathie Wood".
2. Loading fallback → Warren even though `heroIds=['cathie']` (proves the explicit guard, not heroIds[0]).
3. Error fallback → Warren.
4. Primary CTA on desktop → `mutate('cathie')` + `navigate('/portfolio')`.
5. Primary CTA on mobile → `mutate('cathie')` + `navigate('/ask')`.
6. Ghost CTA → `mutate('cathie')` + `navigate('/markets')`.
7. Don't-clobber: existing selection present → `mutate` NOT called, but `navigate('/ask')` still fires.

Verification run from `app/`:
- `npx vitest run src/test/heroHandoff.test.jsx` → 7/7 passed.
- `npx vitest run` (full suite) → 960/960 passed across 46 files, no regressions.
- `npx eslint src/screens/trade/HeroHandoff.jsx src/test/heroHandoff.test.jsx` → clean.

## Status
Status: TODO

## QA Results

Independently re-derived from the actual current files (not from the narrative above). All claims verified accurate.

**1. HeroHandoff.jsx code trace — PASS**
Read `app/src/screens/trade/HeroHandoff.jsx` in full.
- No hardcoded "Warren"/"Buffett" strings remain in copy — all name references are `hero.name` interpolations (lines 53, 59, 76, 80). The only literal `'warren'` is the fallback id (line 35) and the `HERO_DATA.warren` safety fallback (line 36), both intentional.
- Ranking wiring (lines 27-32) matches spec exactly: `pinnedId = heroIdFromName(answers.heroMention)`, then `useHeroRanking(answers, { count: 1, includeWarren: true, pinnedId })` — mirrors `FindMentor.jsx:72-77` (confirmed FindMentor really lives at `app/src/screens/heroes/FindMentor.jsx`, not `screens/onboarding/` — the task pointer was wrong, dev-engineer's note is accurate).
- Fallback condition (line 35): `isLoading || isError || !heroIds?.[0] ? 'warren' : heroIds[0]`. Traced `useHeroRanking` (`app/src/hooks/useHeroRanking.js:80-85`): `heroIds` is derived via `resolveMentorHeroes` unconditionally (not gated on `query.isSuccess`), so `heroIds[0]` is populated with a rule-based hero even while `isLoading` is true — confirming the explicit `isLoading` guard is load-bearing, not redundant. This matches the dev's claim and is exercised by test #2.
- Intro card (lines 56-65) pulls `hero.name`, `hero.initials`, `hero.color`, `hero.style`, `hero.philosophy` from `HERO_DATA[heroId]` — no static Warren text.
- Both CTAs route through `proceed(to)` (lines 44-47), which gates `changeHero(heroId)` behind `!alreadySelected` (don't-clobber) — confirmed `alreadySelected = existingSelections.length > 0` from `useHeroSelections().heroes`.
- Routing confirmed: primary CTA (line 80) → `isDesktop ? '/portfolio' : '/ask'`; ghost CTA (line 81) → `/markets`. Matches spec exactly (Gam2req.md:149).

**2. Hook signature verification — PASS**
- `useChangeHero.js`: single-active-mentor delete-then-insert confirmed (`app/src/hooks/useChangeHero.js:16-25` — delete all rows for `user_id`, then insert the new one). Fires `track('hero.unlocked', { heroId })` on success (line 31), consistent with the "persisting earns the mentor badge" claim.
- `useHeroSelections.js`: confirmed return shape `{ heroes, isLoading }` (line 26) where `heroes` is `HERO_DATA` objects mapped from `hero_id` rows — matches the task's assumed name and shape.

**3. Test file trace — PASS**
Read `app/src/test/heroHandoff.test.jsx` in full — all 7 claimed cases exist and exercise real behavior, not tautologies:
1. Top-ranked hero renders (`cathie` present, `Warren Buffett` absent, CTA label correct) — real.
2. Loading fallback: `heroIds=['cathie']` but `isLoading:true` still forces Warren — this is a meaningful test because it proves the code checks `isLoading` rather than just `heroIds[0]` (matches the code trace in step 1).
3. Error fallback → Warren — real, distinct mock state from #2.
4/5. Desktop vs mobile primary CTA routing, each asserting both `mutate('cathie')` and the correct `navigate` target — real, not tautological (isDesktop toggled between tests).
6. Ghost CTA → `mutate` + `/markets` — real.
7. Don't-clobber: `selections.heroes` non-empty → asserts `changeHero` NOT called but `navigate` still fires — correctly exercises the guard branch.
Mocking approach (`vi.hoisted` + `vi.mock` for the 5 data/nav hooks) properly isolates HeroHandoff's own logic from the underlying hook implementations.

**4. `npx vitest run src/test/heroHandoff.test.jsx` — PASS**
Actual output: `Test Files 1 passed (1)`, `Tests 7 passed (7)`. Matches claim.

**5. `npx vitest run` (full suite) — PASS**
Actual output: `Test Files 46 passed (46)`, `Tests 960 passed (960)`. Matches claim exactly, no regressions.

**6. `npx eslint src/screens/trade/HeroHandoff.jsx src/test/heroHandoff.test.jsx` — PASS**
No output, exit clean. Matches claim.

**7. Scope check — PASS (with clarification)**
`git status`/`git diff --stat` at the repo root shows a large number of other modified files (`HeroChatPanel.jsx`, `HeroSidebar.jsx`, `gamification/defs.js`, `gamification/stateProvider.js`, `gamification/useGamification.jsx`, `useAchievements.js`, `useHeroChat.js`, `AchievementsMobile.jsx`, `BadgeEarned.jsx`, `AskTab.jsx`, `tokens.js`, plus several test files) beyond the two T-16 files. Cross-checked against `kanban/DONE/` — these all belong to already-completed tasks (T-01, T-05, T-10–T-14, T-18, etc.), not T-16. A scoped `git diff --stat` limited to `HeroChatPanel.jsx` + `gamification/` confirms those changes are pre-existing (130 lines across 4 files) and unrelated to this task's diff. `git status --porcelain -- app/src/screens/trade/SellScreen.jsx` returned empty — confirmed untouched. `HeroHandoff.jsx`'s own diff is scoped to 62 changed lines, consistent with the rewrite described. **Recommendation for orchestrator:** the working tree currently mixes uncommitted output from multiple tasks; consider committing completed tasks incrementally to keep future scope-checks unambiguous — not a T-16 defect, but a process risk.

**8. Hero System timing rule — PASS**
CLAUDE.md: "Heroes … introduced AFTER the user's first trade." Gam2req.md:145 confirms `/hero-handoff` is reached from `TradeReceipt` after first buy. HeroHandoff persisting a hero selection at this route is consistent with the stated timing rule — this is precisely the "first-trade moment" the rule describes, not a premature introduction.

**Additional observations (non-blocking):**
- Deviation noted by dev-engineer (CTA label uses full name "Talk to Cathie Wood" rather than first name) is cosmetic and reasonably justified (deterministic rendering); no spec text mandates first-name-only, so not a defect.
- No test exercises the case where `heroIdFromName(answers.heroMention)` actually resolves to a pinned id different from the LLM's top pick — i.e., a case where the pin visibly overrides ranking. This is arguably `useHeroRanking`'s/`resolveMentorHeroes`'s own responsibility (already covered by `findMentor.test.jsx` per dev's note), so not a coverage gap specific to this file. Low priority, informational only.
- No accessibility-specific assertions in the new tests (e.g., CTA focus order, `HeroAvatar` alt/role semantics), but `HeroHandoff` reuses existing `CTA`/`GhostCTA`/`HeroAvatar` primitives already covered by other a11y tests elsewhere in the suite — reasonable to not duplicate here.

### Overall Verdict: PASS

All 7 requested verification steps pass. Implementation matches both the task spec and Gam2req.md Phase 5 exactly. Test claims (7/7, 960/960, lint clean) are all independently reproduced. No regressions, no scope creep into HeroChatPanel.jsx/SellScreen.jsx/gamification files by this task. No blocking defects found.
