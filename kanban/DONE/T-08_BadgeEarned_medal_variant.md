# T-08 BadgeEarned.jsx: medal-earned variant

## Goal
Badge-earned reveal supports a medal-earned variant: when a badge award crosses one or more
medal thresholds, queue sequential reveals ("{Medal name} earned", gold accent) after the
badge reveal — never dropping a crossed threshold, even with multiple crossings from one badge.

## Files/modules touched
- `app/src/screens/achievements/BadgeEarned.jsx`
- `app/src/test/gamification.badgeEarned.test.jsx`

## Dependencies
- T-01 must be DONE first (MEDALS/TROPHIES/computeProgression).
- T-05 must be DONE first (useAchievements must expose enough state to diff before/after).

## Context pointers
- Gam2req.md §3 Phase 3 table + §5 risk note: "Medal-earned reveal must handle multiple thresholds crossed by one badge (queue sequentially)."
- Existing badge earned moments are full-screen ink-900, no bounce animations — deliberate and earned (CLAUDE.md Achievement System section). The medal variant should follow the same restrained tone, with gold (`C.gold`) as the accent differentiator, not a different animation style.
- Diff logic: compute `computeProgression(earnedBadgeIds)` before and after the new badge is added to the set; any medal/trophy that flips from not-earned to earned gets queued.

## Implementation Notes

Scope: `app/src/screens/achievements/BadgeEarned.jsx` + `app/src/test/gamification.badgeEarned.test.jsx` only. No changes to `useGamification.jsx`, `defs.js`, or `useAchievements.js` — the medal diff is done entirely inside BadgeEarned from data those already expose.

- **Pure sequence builder** — added module-level `buildRevealSequence(queueIds, earnedIds)`. It computes the baseline (current earned set minus the freshly-awarded queue), then walks the queue in order, adding one badge at a time and diffing `computeProgression` before/after each add. Any medal/trophy whose `earned` flips false→true is pushed right after the badge that crossed it, in `MEDALS`/`TROPHIES` (defs) order. This guarantees every crossed threshold is queued and none is dropped, even when one badge completes two medals (or a medal and the trophy) at once. No React, no IO — unit-friendly.
- **Frozen queue snapshot** — the shared reveal `queue` from `useReveal()` is captured once via a `useState` initializer (`frozenQueue`). The full earned set is stable across a reveal session (advancing the queue never un-earns a badge), so the derived `seq` stays stable while `advance()` drains the shared queue underneath.
- **Local step cursor** — `seq[step]` (local `step` state) drives the current moment. `tier` comes from the item kind (`badge` | `medal` | `trophy`); the existing router-state path (`state.tier`/`state.type`) is preserved as the fallback for legacy/direct callers and the no-state smoke test (`item` undefined).
- **Draining contract preserved** — `dismiss()` calls the shared `advance()` exactly once per **badge** step (medal/trophy steps advance only the local cursor), so all shared-queue badges are drained before `navigate(-1)` and the `GamificationProvider` router effect does not bounce us back to `/badge-earned`. `navigate(-1)` fires only on the final `seq` item.
- **Medal moment styling** — reuses `MOMENT_TYPES.medal` (gold eyebrow `C.gold`, `C.goldLight` ring, italic hero quote), overriding only `title`/`desc` from the crossed medal and the progress line to "`{medalCount} of {TROPHIES[0].threshold} toward Master of Trading`". Trophy step overrides `title`/`desc` from the trophy. Same restrained full-screen ink-900 layout, no bounce — gold accent is the only differentiator, per CLAUDE.md.
- **ProgressRing total made data-driven** — the previously hard-coded `total={10}` / `aria-valuemax={10}` now read `m.progressTotal ?? 10` so the medal-toward-trophy ring shows the correct denominator (7 medals); badge/legacy moments keep 10 via the default.

## Test Plan

File: `app/src/test/gamification.badgeEarned.test.jsx` (Vitest + Testing Library). The `useAchievements` mock was made a per-test mutable object (`mockAch`) so scenarios can supply real badge ids; the component runs against the **real** `computeProgression` from defs.js (not mocked), exercising the actual progression config.

Existing behaviour (regression guards, unchanged):
1. Queued badge renders data-driven (Researcher, not hard-coded "First Trade").
2. Sequential badge drain: first dismiss calls `advance()` once and does not navigate.
3. Final badge dismiss calls `advance()` once and `navigate(-1)`.
4. Router-state `medal` tier still renders the legacy static moment ("Apprentice").
5. Router-state `trophy` tier still renders ("The Disciplined Investor").
6. No-state fallback smoke-passes (default "First Trade", no navigation).

Medal-earned variant (new):
7. **Single crossing** — earning `reflection` as the 5th badge crosses Explorer I only (no thematic set completed). Asserts: badge "Badge earned"/`reflection` shows first; dismiss → `advance()` once + "Medal earned"/"Explorer I", no navigation; second dismiss → `navigate(-1)` with no further `advance()` (medal steps don't touch the shared queue).
8. **Multi-medal from one badge** — earning `momentum` completes the Trader Medal (4th trading badge) **and** is the 5th badge overall (Explorer I). Asserts both reveal sequentially in defs order (Trader Medal → Explorer I), neither dropped, no navigation until both are dismissed, and exactly one shared-queue `advance()` (one badge) before `navigate(-1)`.

Note: post-click assertions use `fireEvent.click` (act-wrapped) rather than the raw DOM `.click()` used by the pre-existing spy-only tests, so the re-rendered moment is observable.

Commands:
- Targeted: `npx vitest run src/test/gamification.badgeEarned.test.jsx` → 8 passed.
- Lint: `npx eslint src/screens/achievements/BadgeEarned.jsx src/test/gamification.badgeEarned.test.jsx` → clean.
- Full suite: `npx vitest run` → 45 files / 941 tests passed (no regressions).

## QA Results

Verdict: **PASS**. All claims in Implementation Notes / Test Plan verified against actual code and test runs; no failures found.

Commands re-run:
- `npx vitest run src/test/gamification.badgeEarned.test.jsx` → 8 passed (matches claim).
- `npx vitest run` (full suite) → 45 files / 941 tests passed (matches claim, no regressions).
- `npx eslint src/screens/achievements/BadgeEarned.jsx src/test/gamification.badgeEarned.test.jsx` → clean (matches claim).

Explicit checks against the review brief:

1. **No bounce/gratuitous animation** — PASS. `BadgeEarned.jsx` adds no CSS transitions, keyframes, or transform/scale animation. `MedalGlyph`/`TrophyGlyph` in `Badges.jsx` (pre-existing, untouched) use a plain `opacity` toggle only, same restrained style as badge glyphs. Full-screen `bg-ink-900` dialog layout is unchanged.
2. **Medal moments use gold accent (CLAUDE.md)** — PASS. `MOMENT_TYPES.medal.eyebrowColor = C.gold`, `progressColor = C.goldLight`; `MedalGlyph`/`TrophyGlyph` render with `C.gold` stroke/fill. Trophy moment uses `C.goldLight` eyebrow. Consistent with existing gold-for-medal/queued-state convention.
3. **Multi-threshold crossing never dropped** — PASS, verified by manual trace against real `defs.js` data (not just trusting the test mock):
   - Single-crossing case (`reflection` as 5th badge): baseline before-diff has 4 badges, after adding `reflection` only `medal_explorer_1` (Explorer I) flips earned — correctly the only medal queued, matching the test's "no thematic set completed" assumption (Student Medal still needs `macro`/`mentor`).
   - Multi-crossing case (`momentum` as 4th trading badge + 5th badge overall): before/after diff correctly flips both `medal_trader` (Trader Medal, index 0 in `MEDALS`) and `medal_explorer_1` (Explorer I, index 4) in the same badge step. `buildRevealSequence`'s `after.medals.forEach` iterates in `MEDALS` array order, so Trader Medal is pushed before Explorer I — matches the test's asserted reveal order. Neither is dropped; both require independent `Continue` clicks before `navigate(-1)` fires.
4. **Legacy router-state path (`state.tier`/`state.type`) still works** — PASS. `tier` fallback (`item ? item.kind : (state?.tier || state?.type || 'badge')`) preserved; existing tests "medal tier still renders from router state" and "trophy tier still renders from router state" pass unchanged, confirming no regression for direct/legacy callers.
5. **`dismiss()` drains shared queue exactly once per badge step (no router-bounce)** — PASS. Code: `if (item.kind === 'badge' && currentId) advance()` — only badge-kind steps call the shared `advance()`; medal/trophy steps only move the local `step` cursor. Verified in both new tests: `advance` is called exactly once per test even when 1 badge produces 2 additional medal reveal steps (3 total `Continue` clicks, 1 `advance()` call), and `navigate(-1)` fires only after the *last* item in `seq` is dismissed — confirming no premature bounce back to `/badge-earned` from the shared-queue-driven `GamificationProvider` router effect.

Additional notes (informational, not blocking):
- `ProgressRing` denominator fix (`m.progressTotal ?? 10`) correctly yields 7 for the medal-toward-trophy ring (`TROPHIES[0].threshold` = `MEDALS.length` = 7), verified against `defs.js`. `aria-valuemax` on the progress `role="progressbar"` wrapper is also data-driven now, which is a minor accessibility improvement (previously hard-coded to 10 regardless of true denominator).
- No new accessibility regressions found: dialog focus/labeling (`aria-describedby`, `DialogPrimitive.Title`) unchanged; `role="progressbar"` still carries `aria-valuenow`/`aria-valuemin`/`aria-valuemax`/`aria-label`.
- Scope discipline confirmed: diff is contained to the two declared files; no changes leaked into `useGamification.jsx`, `defs.js`, or `useAchievements.js` per the stated scope note.

No failures, no open issues. Ready to move to DONE at maintainer's discretion (not moved by QA per instructions).

## Status
Status: TODO
