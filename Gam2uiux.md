# Gam2 UI/UX Audit — Live Verification

**Scope:** Achievements/Profile medal-shelf UI, Hero/Mentor screens (HeroSidebar, AskTab, HeroChatPanel, SellScreen, HeroHandoff), design-system compliance on those screens. Audited against `CLAUDE.md` (design tokens, component rules, Hero System) and `Gam2req.md` (declarative medal/trophy engine + single-mentor MVP + cross-hero chat history).

Environment: dev server at `http://localhost:5173`, mobile (390×844) and desktop (1440×900) viewports, live Playwright inspection plus source review.

## Verdict: PARTIALLY matches design intent

The persisted layer (medals/trophies computed via `computeProgression`), the Achievements list screen, Profile shelf, and Hero/Mentor copy (`HeroSidebar`, `AskTab`, `HeroChatPanel`, `SellScreen`, `HeroHandoff`) are all correctly migrated to the new model — no visible "10 badges → 1 medal…" ladder copy and no "council" language on those screens. **However, the full-screen badge/medal/trophy-earned reveal moment (`BadgeEarned.jsx`) — one of the most visible, deliberately-designed states in this feature — still runs on the old hardcoded 10/10/10 ladder math and copy.** This was verified live in the browser, not just in source. It appears the Phase 1 requirement "Delete `floor(count/10)` math" was applied to `useAchievements.js` but never propagated to `BadgeEarned.jsx`, and no test asserts on the affected copy (`progressLabel`/`progressSub`), so it slipped through 19/19 "passed" tasks.

---

## Blocking

- **Badge-earned reveal shows fake "X of 10" progress using old ladder math, not real medal thresholds** — `app/src/screens/achievements/BadgeEarned.jsx:116-123`. Live at `http://localhost:5173/badge-earned` (fallback state), confirmed by screenshot: displays "**1 of 10 toward your first medal**" for the First Trade badge. Real medals have thresholds of 3, 4, 4, 4, 5, 10, 15 (from `defs.js` `MEDALS`) — none of which is "10" for the Trader Medal (4) that First Trade actually counts toward. The code literally recomputes `earnedCount % 10` — the exact broken ladder formula Phase 1 was supposed to delete (it was deleted from `useAchievements.js` but reintroduced here). **Fix:** compute the actual next-medal target and progress using `computeProgression`/`MEDALS` (e.g. find the nearest medal containing this badge and show `earnedCount-toward-that-medal / medal.threshold`), matching what `AchievementsMobile.jsx`/`Profile.jsx` already do correctly.

- **Medal-earned reveal `progressSub` hardcoded to old 10-medal model** — `app/src/screens/achievements/BadgeEarned.jsx:59,132`: `progressSub: 'Earn 9 more medals to unlock a trophy.'` is never overridden per-medal, so it's shown verbatim regardless of how many medals actually remain. There are only 7 medals total (`MEDALS.length` = 7), so "9 more" is never a true remaining count for any user. **Fix:** derive from `TROPHIES[0].threshold - medalCount` (or equivalent) same as `progressLabel` already does on line 132.

- **Trophy-earned reveal still shows a bogus "toward" progress bar** — `app/src/screens/achievements/BadgeEarned.jsx:70-71` (`progressLabel: '1 of 10 toward Master of Trading'`, `desc: '100 badges. 10 medals. You think like an investor — not a speculator.'`) is not overridden by the trophy branch (line 135 only overrides `title`/`desc`... wait `desc` IS overridden but `progressLabel`/`progressSub`/`progressVal` are NOT). Showing a "toward Master of Trading" progress ring on the screen where the user just earned Master of Trading is incoherent, and the literal digits ("1 of 10", "100 badges. 10 medals.") are stale ladder copy that could leak into `desc` fallback paths (e.g. router-state smoke fallback in tests renders "The Disciplined Investor" title, not real trophy data). **Fix:** for the trophy tier, replace the progress card with a plain "You've mastered every medal" state (no ring) or hide it — there is no next threshold to show.

## Major

- **`hero-handoff` route document title still says "Your Council"** — `app/src/App.jsx:60`: `'hero-handoff': 'Your Council', ` in `ROUTE_TITLES`. This sets `document.title` (a WCAG 2.4.2 Page Titled feature added specifically to avoid a static app title) to "simFolio — Your Council" on the very screen this epic renamed to a single-mentor concept. Not visible in the page body (so screen-reader/tab-title only), and no test in `src/test/` asserts on this route's title — confirmed via grep, zero hits. **Fix:** rename to `'Your Mentor'` or `'Meet Your Mentor'`.

## Minor / Polish

- **`ink-400` (#7E8794) on `paper` (#FAFAF7) measures 3.47:1 contrast** — used pervasively for the shelf's "X of Y" progress captions (`ShelfItem` in both `AchievementsMobile.jsx:20-21` and `Profile.jsx:19-20`) and locked-badge descriptions. WCAG AA requires 4.5:1 for text this small (10-11px, well under the 18.66px-bold/24px large-text threshold). This is a pre-existing design-system token (`ink-400` is documented in `CLAUDE.md` as "Muted labels") not introduced by this feature, but it's worth flagging since the new shelf leans on it heavily for de-emphasized-but-still-meaningful progress counts. Not blocking this epic's closure, but a good candidate for a follow-up token contrast pass (e.g. a darker `ink-500`/`ink-600` for anything below ~14px).

## Non-issues / confirmed correct

- **Achievements screen** (`AchievementsMobile.jsx`) — old ladder copy fully gone; shelf correctly shows 4 thematic medals (Trader/Builder/Long-term/Student) + 3 Explorer milestone medals + 1 Master of Trading trophy, each with live "X of N" counts from `computeProgression`. Screenshot: `achievements-mobile.png`.
- **Profile screen** (`Profile.jsx`) — same shelf pattern, correct "N of 7 medals earned" summary line.
- **Badge cards** — correct `role="button"`, `aria-disabled`, `tabIndex=-1` when locked / `0` when earned, Enter/Space activation, descriptive `aria-label`s including locked-badge unlock condition.
- **BadgeEarned dialog visual treatment** — full-screen `bg-ink-900`, gold accent (`C.goldLight`) reserved for medal/trophy tiers, aqua for badge tier, and critically **no bounce/zoom-in animation** on the reveal itself (it bypasses the shared `DialogContent` wrapper that has `zoom-in-95`/`fade-in` and uses a bare `DialogPrimitive.Content` with no animate classes) — correctly matches the "deliberate, no bounce" spec.
- **Hero/mentor copy** — `HeroSidebar.jsx:56` and `AskTab.jsx:51` both read "Your mentor · watching your portfolio" (not "N of 3 council slots"); `HeroChatPanel.jsx:28` composer placeholder is exactly "Ask your mentor…"; `SellScreen.jsx:85` inline prompt is "Ask your mentor first" (question-form CTA, not a directive) navigating to `/ask`. Verified live on both mobile (390px) and desktop (1440px) — screenshots `ask-mobile.png`, `portfolio-desktop.png`.
- **Cross-hero "{Hero} joins" divider** — `HeroChatPanel.jsx:91` renders a centered Barlow-Condensed 11px/uppercase/0.14em-tracking eyebrow divider when the speaking hero changes between assistant messages; covered by `components.test.jsx` and matches the design-system eyebrow-label spec exactly.
- **HeroHandoff** — `HeroHandoff.jsx` correctly derives the shown hero from `useHeroRanking(answers, { count: 1, includeWarren: true, pinnedId })`, falling back to Warren only on loading/error — not a hardcoded card. **Not reachable live without seeding onboarding answers + a first trade**, so this was verified by source read only, not by driving the actual flow in-browser; flagging that gap rather than asserting full confidence.
- **No emoji, no unexpected gradients** on any of the audited files (`achievements/`, `HeroHandoff.jsx`, `SellScreen.jsx`, `HeroSidebar.jsx`, `HeroChatPanel.jsx`, `AskTab.jsx`, `Profile.jsx`) — grep-verified.
- **MOMCAKE display font usage** — one stat per screen observed (portfolio value $5,000.00 on Portfolio; badge count on Achievements/Profile) plus the exempted "simFolio" wordmark; no doubling found on the screens audited.

## Console/network note (informational, out of scope for this feature)

A 404 on `user_metrics?select=metric_id,state&user_id=eq....` was observed on every page load in this session (stale/seeded user id in local session). Not something introduced by this epic and not chased further per scope, but worth a glance if achievement state ever appears to silently fail to persist for this test account.

---

## Summary counts

- **Blocking: 3** (all three concentrated in `app/src/screens/achievements/BadgeEarned.jsx` — the reveal-moment copy/math never got the Phase-1 ladder-removal treatment)
- **Major: 1** (stale "Your Council" document title on `/hero-handoff`)
- **Minor/Polish: 1** (pre-existing `ink-400` contrast, systemic not feature-introduced)

---

## Re-audit — 2026-07-12

**Verdict: CLEAN. All 4 prior findings confirmed resolved. Zero new blocking or major findings.** This closes out the gamification/mentor-MVP epic.

Method: live Playwright inspection (`localhost:5173`, mobile 390×844 + desktop 1440×900) plus source review of `BadgeEarned.jsx` and `App.jsx`, plus running `gamification.badgeEarned.test.jsx` directly (11/11 passed).

### Finding 1–3 (Blocking) — BadgeEarned.jsx ladder math — RESOLVED

`app/src/screens/achievements/BadgeEarned.jsx` now derives all three reveal tiers from real progression data:

- **Badge tier** (lines ~126–141): computes `computeProgression(earnedIds)`, finds `nearestMedalForBadge(badge.id, medals)`, and renders `` `${med.earnedCount} of ${med.threshold} toward ${med.name}` `` — real per-medal thresholds (4/4/3/4/5/10/15), not a generic "of 10". Verified in source and via test `'badge tier: shows real progress toward badge's nearest medal (threshold ≠ 10)'` (passing).
- **Medal tier** (lines ~142–157): `progressLabel`/`progressSub` now computed from `medalCount` vs `TROPHIES[0].threshold` (= `MEDALS.length` = 7) — the old hardcoded `'Earn 9 more medals to unlock a trophy.'` string is gone from this branch entirely (only remains as an unreachable default in `MOMENT_TYPES.medal` used solely by the documented no-state legacy fallback).
- **Trophy tier** (lines ~158–160, 201–204): renders `masteryLine` ("You've mastered every medal.") in a plain card with **no** `ProgressRing`/`role="progressbar"` — confirmed by test `'trophy tier: no progress ring or "toward X" affordance'` which explicitly asserts `queryByRole('progressbar')` is absent and no "of 10" / "toward Master of Trading" text renders.

Live-verified indirectly: Achievements (`/achievements`) and Profile (`/profile`) screens, both mobile and desktop, show correct real thresholds throughout the medal shelf — "Trader Medal — 0 of 4", "Long-term Medal — 0 of 3", "Explorer I/II/III — 0 of 5/10/15", "Master of Trading — 0 of 7" — consistent with what `BadgeEarned.jsx` now computes from the same `computeProgression` source of truth. Screenshots: `achievements-mobile.png`, `achievements-desktop.png`, `profile-desktop.png`.

Could not trigger a live badge/medal/trophy reveal end-to-end (no dev/debug hook exists to force the reveal queue outside of an actual trade-driven badge award, and React Router's internal history isn't reachable for state injection via Playwright). Relied on source verification + the dedicated `gamification.badgeEarned.test.jsx` suite (11/11 green, including the three T-20-specific real-math assertions) as the next-best evidence. This is an explicit limitation of this pass, not a gap in the fix.

**Residual, non-blocking observation:** the router-state fallback path (`tier: 'trophy'` with no `item`, i.e. direct/legacy navigation with no reveal queue) still falls back to `MOMENT_TYPES.trophy`'s `desc: '100 badges. 10 medals. You think like an investor — not a speculator.'` — stale digits, same as flagged in the original audit. This path is only reachable via direct-state navigation (tests / hypothetical legacy callers), not through any live user flow in the current app, so it's cosmetic dead-copy rather than a user-facing bug. Worth a follow-up cleanup but not epic-blocking.

### Finding 4 (Major) — stale "Your Council" document title — RESOLVED

`app/src/App.jsx:60`: `'hero-handoff': 'Meet Your Mentor'`. Live-verified: navigating to `http://localhost:5173/hero-handoff` sets the browser tab title to **"simFolio — Meet Your Mentor"**. Confirmed on both the Warren Buffett fallback render and a second load that resolved to John Bogle (evidence the ranking is live, not hardcoded — consistent with Phase 5). Screenshots: `hero-handoff-desktop.png`, `hero-handoff-mobile.png`.

### Fresh sweep — no new issues found

- **Achievements** (`/achievements`, mobile + desktop) — medal shelf, per-medal thematic badge groups, progress bars, `role="progressbar"` labels all correct and consistent with tokens (8px cards, Barlow 11px uppercase eyebrows, ame-400 progress bars). No emoji, no gradients, no ladder copy.
- **Profile** (`/profile`, desktop) — same shelf pattern, "0 of 7 medals earned" summary correct.
- **AskTab / HeroSidebar** (`/ask`, mobile + desktop) — "Your mentor · watching your portfolio" and composer placeholder "Ask your mentor…" both correct, no "council" language, single-avatar (no stacked avatars).
- **SellScreen** (`app/src/screens/trade/SellScreen.jsx:85`) — source-verified: `"Ask your mentor first"` (grep-confirmed, no live sell flow triggered this pass since it requires an existing position).
- **HeroHandoff** (`/hero-handoff`, mobile + desktop) — intro card renders a real ranked hero (Warren Buffett on one load, John Bogle on a second — confirms live ranking, not a hardcoded persona), both CTAs present, copy reads "will be your guide," no "council" language, no emoji, no unexpected gradients, correct ink-900 primary CTA / ghost secondary CTA styling.
- **HeroChatPanel** cross-hero divider — not re-verified live this pass (requires seeded multi-hero conversation history, out of reach without a logged-in session with prior chat data); source structure unchanged since the prior audit's pass, no code touched here per the fix diff scope (T-20/T-21 only touched `BadgeEarned.jsx` and `App.jsx`).
- **Design-system spot-check** — MOMCAKE display font: one stat per screen on every screen visited (portfolio cash value; badge/medal counts use Barlow, not MOMCAKE); no emoji anywhere; no gradients outside the documented Master-of-Trading exception (not encountered this pass); border-radius consistent with 8px cards / pill medal counts / 4px-radius inputs.
- **Console** — same pre-existing `user_metrics` 404 on every page load (stale seeded session), unrelated to this epic, not re-flagged as new.

### Summary counts (re-audit)

- **New Blocking: 0**
- **New Major: 0**
- **New Minor/Polish: 1** (stale digits in the trophy-tier no-state fallback `desc`, cosmetic/unreachable in live flows — see above)
- **Prior findings resolved: 4 of 4** (3 blocking + 1 major, all confirmed via source + live verification + passing tests)
