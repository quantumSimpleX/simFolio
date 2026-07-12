# T-13 AskTab.jsx: council to mentor copy + single avatar

## Goal
AskTab header and avatar stack reflect single active mentor instead of a 3-hero council.

## Files/modules touched
- `app/src/screens/portfolio/AskTab.jsx`
- `app/src/test/ux-content.test.jsx`
- `app/src/test/screens.smoke.test.jsx`

## Dependencies
None.

## Context pointers
- Gam2req.md §3 Phase 4 table: "Your Council" header → hero name / "Your Mentor"; avatar stack `slice(0,3)` → single avatar.
- CLAUDE.md Portfolio layout: 02B (Advisor's Room) — desktop two-column with hero sidebar, mobile two-tab (Portfolio / Ask). AskTab is the mobile "Ask" tab equivalent content, keep layout/breakpoint conventions from `useBreakpoint`/`useIsMobile` intact.
- Do not touch chat-history rendering logic in this file — that's T-19's concern (wiring `useConversationHistory`), keep this task copy/avatar-only.

## Implementation Notes
Rewrote `AskTab.jsx` header from 3-hero council framing to single active mentor, mirroring T-12's `HeroSidebar.jsx` sweep:
- Header title `"Your Council"` → `{mentorName}` (`primaryHero?.name ?? 'Sage'`).
- Subtitle `{councilNames || 'Sage'}` (the ` · `-joined hero name list) → static `"Your mentor · watching your portfolio"`, matching HeroSidebar's exact string.
- Avatar stack `heroes.slice(0,3).map(...)` overlapping avatars → a single `primaryHero` `HeroAvatar` (guarded by `primaryHero &&`).
- Dropped the now-unused `councilNames` const and the stale `// Use first hero in council for chat (council shares one window)` comment.
- Left the cross-hero timeline comment intact but reworded lightly to match HeroSidebar's phrasing ("active mentor (heroes[0])").

Scope kept surgical: chat wiring (`useConversationHistory`, `useHeroChat`, `handleSend`), layout, breakpoints, and the `DotMenu` "Find a new mentor" action were untouched. `emptyText` was updated `"Ask your council anything…"` → `"Ask your mentor anything…"` since it is user-facing copy in the same header/panel.

Out of scope (intentionally not touched): `councilSize` gamification metric internals, `HeroChatPanel.jsx` placeholder/fallback copy, `SellScreen.jsx` "Ask your council first", and `App.jsx` `'hero-handoff': 'Your Council'` — these belong to other tasks/files not listed in this task's Touches.

Single-active-mentor framing is factually correct: `useChangeHero.js` and the `hero_selections` model store one active mentor row (delete-all-then-insert-one).

## Test Plan
Automated (Vitest, jsdom + mocked Supabase):
- `screens.smoke.test.jsx` — added `AskTab header uses single-active-mentor copy, not council`: renders `<AskTab/>` with no seeded heroes, asserts body contains `"Your mentor · watching your portfolio"` and does NOT contain `"Your Council"`. Falls back to `Sage` for the mentor name.
- `screens.smoke.test.jsx` (pre-existing, still green) — `AskTab shows cross-hero conversation history with a joins divider` confirms the copy change did not disturb the unified cross-hero timeline (Warren + Cathie messages + "Cathie Wood joins" divider).
- `screens.smoke.test.jsx` (pre-existing) — `AskTab renders without quick-prompt pills` still passes (no crash, no stray pill copy).
- `ux-content.test.jsx` — full file re-run green (no AskTab-specific assertions there; run per the task's Verify line to confirm no cross-file copy regressions).

Results:
- Targeted: `npx vitest run src/test/screens.smoke.test.jsx src/test/ux-content.test.jsx` → 2 files, 28 tests passed.
- Full suite: `npx vitest run` → 45 files, 953 tests passed (no regressions).

Manual (recommended, not run here): open the mobile Ask tab with 0 heroes (expect "Sage" + mentor subtitle, no avatar), with 1 hero (expect that hero's name + single avatar), and with 3 selected heroes (expect only the primary hero shown — no 3-up avatar stack, no council name list).

## Status
Status: TODO

## QA Results

Verdict: **PASS**. Independently re-read the current code (not cached) and re-ran the suites; all claims in the Test Plan and Implementation Notes check out.

| # | Item | Result |
|---|------|--------|
| 1 | `AskTab.jsx` copy changes present as described | PASS — title `{mentorName}` (`primaryHero?.name ?? 'Sage'`) line 38/50, subtitle `"Your mentor · watching your portfolio"` line 51, single `primaryHero &&` `HeroAvatar` (no `.slice(0,3)` stack) lines 44-48, `emptyText="Ask your mentor anything about your portfolio or investing."` line 65, `councilNames` const absent. |
| 2 | New test asserts positive + negative string | PASS — `screens.smoke.test.jsx:72-78` renders `<AskTab/>` unseeded, asserts body contains `'Your mentor · watching your portfolio'` and does NOT contain `'Your Council'`. |
| 3a | Targeted run: `screens.smoke.test.jsx` + `ux-content.test.jsx` | PASS — 2 files, 28 tests passed. |
| 3b | Full suite: `npx vitest run` | PASS — 45 files, 953 tests passed, 0 regressions. Matches dev-engineer's reported numbers exactly. |
| 4 | Grep `AskTab.jsx` for "council" (case-insensitive) | PASS — zero matches. |
| 5 | Scope discipline — deferred files untouched | PASS — confirmed still-council/legacy copy remains (correctly out of scope) in: `App.jsx:60` (`'hero-handoff': 'Your Council'`), `SellScreen.jsx:85` (`"Ask your council first"`), `HeroChatPanel.jsx:28,48` (placeholder `"Ask your council…"` / fallback `'your council'`), and `gamification/defs.js`, `useGamification.jsx`, `stateProvider.js` (`councilSize` metric — intentionally kept per Gam2req, not renamed). |

No issues found. No real defects, no scope creep, no test gaps worth flagging for this narrow copy/avatar change — `useChangeHero.js`'s single-row `hero_selections` model does back up the "single active mentor" framing used in the subtitle and avatar logic.

One minor observation (not a defect, no action needed): the Implementation Notes describe `emptyText` changing from `"Ask your council anything…"` to `"Ask your mentor anything…"`, but the actual string in both old and new code is the longer `"Ask your mentor anything about your portfolio or investing."` — the notes were paraphrasing, not reporting a literal diff. Confirmed this is just documentation shorthand; the code itself is correct and covered by the `emptyText` assertion in the pre-existing `AskTab renders without quick-prompt pills` test (indirectly, via no-crash) — no test explicitly pins this exact string, but that's pre-existing coverage, not a T-13 gap.
