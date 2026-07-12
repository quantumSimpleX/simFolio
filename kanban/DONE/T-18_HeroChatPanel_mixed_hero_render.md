# T-18 HeroChatPanel.jsx: mixed-hero rendering + divider

## Goal
Chat message list renders each assistant bubble with the correct hero avatar/persona (not
always the currently-selected hero), and inserts a "{Hero Name} joins" divider whenever the
speaking hero changes between consecutive assistant messages.

## Files/modules touched
- `app/src/components/HeroChatPanel.jsx` (ChatMessages rendering logic)
- `app/src/test/components.test.jsx`

## Dependencies
- T-17 must be DONE first (this task consumes `useConversationHistory()`'s per-message `hero_id` data shape).

## Context pointers
- Gam2req.md §3 Phase 6 table: assistant bubbles render `<HeroMessage hero={msg.hero_id ?? heroId}>` — `HERO_MAP` in `app/src/components/HeroMessage.jsx` already covers all 21 heroes + sage, no change needed there. When an assistant message's `hero_id` differs from the previous assistant message's, render a centered eyebrow divider "{Hero Name} joins" — Barlow Condensed 11px uppercase, `letter-spacing: 0.14em`, `C.ink400` color (per CLAUDE.md eyebrow-label convention).
- **Note:** T-14 also touches this file (placeholder copy string) but is a disjoint concern — no shared logic, just possible merge-conflict-by-proximity if both are edited concurrently. Not a true dependency.
- CLAUDE.md: Hero messages are always italic, always a question or observation — never a directive. This task only affects which hero's avatar/name is attributed to a message, not the message content itself, so that rule is unaffected here.

## Implementation Notes
- `app/src/components/HeroChatPanel.jsx` — `ChatMessages`:
  - Each assistant bubble now renders `<HeroMessage hero={msg.hero_id ?? heroId} …>` instead of always using the currently-selected `heroId`, so a mixed-hero timeline attributes every reply to its actual author. Legacy rows with no persisted `hero_id` still fall back to the selected `heroId`. `HERO_DATA` (already imported) supplies the display name; `HeroMessage`'s own `HERO_MAP` supplies the avatar/initials/color for all 21 heroes + sage, so no change was needed there.
  - Added a centered eyebrow divider `"{Hero Name} joins"` inserted before an assistant bubble whenever its hero differs from the *previous assistant bubble's* hero. Styled per the CLAUDE.md eyebrow convention: `font-sans` (Barlow Condensed), `text-[11px]`, `uppercase`, `tracking-[0.14em]` (letter-spacing 0.14em), `text-ink-400`, centered. No divider precedes the first assistant reply (no prior hero to change from).
  - User messages that sit between two replies do **not** reset the attribution — the "previous hero" is tracked across the assistant messages only, so a user turn between two same-hero replies produces no divider, while a hero change across a user turn still shows one.
  - The join/attribution data is precomputed into a `rows` array via a plain `for` loop before the JSX (rather than mutating a closure variable inside `.map` during render). This keeps render side-effect-free and satisfies the `react-hooks/immutability` lint rule (React Compiler) which forbids reassigning a variable inside a render-time `.map` callback.
  - Imported `Fragment` from `react` to wrap the optional divider + bubble under a single key.
  - Did not touch the composer placeholder string ("Ask your council…") — that is T-14's disjoint concern.

## Test Plan
Added to `app/src/test/components.test.jsx` (`HeroChatPanel pieces` describe). All exercise `ChatMessages` via the existing `wrap()` (QueryClient + MemoryRouter) helper:
1. **Per-hero attribution** — history with two assistant messages (`hero_id: 'warren'` then `'cathie'`) renders both "Warren Buffett" and "Cathie Wood" names, proving bubbles are attributed to their own `hero_id` rather than the selected `heroId`.
2. **Divider on hero change** — the same mixed history shows a "Cathie Wood joins" divider, and shows *no* "Warren Buffett joins" divider (first reply never gets one).
3. **No divider for same-hero streak** — two consecutive `hero_id: 'warren'` replies render no `/joins/` text.
4. **Divider across an intervening user message** — warren reply → user message → cathie reply still shows "Cathie Wood joins".
5. **No divider when user message sits between same-hero replies** — warren → user → warren shows no `/joins/`.
6. **Legacy fallback** — an assistant row with no `hero_id` and `heroId="cathie"` attributes to "Cathie Wood" and shows no divider.

Pre-existing `ChatMessages` tests (italic/quoted rendering, "Calling {hero}…", unknown-hero fallback, model-badge cases) continue to pass, confirming no regression.

Verification run (from `app/`):
- `npx vitest run src/test/components.test.jsx` → 26 passed.
- `npx vitest run` (full suite) → 936 passed, 45 files.
- `npx eslint src/components/HeroChatPanel.jsx src/test/components.test.jsx` → clean.

## QA Results

**Overall verdict: PASS.** Implementation matches the Test Plan and Implementation Notes as written; no regressions found.

Verification performed:
- Read `app/src/components/HeroChatPanel.jsx` and `app/src/test/components.test.jsx` in full and diffed against the claims in Implementation Notes / Test Plan.
- `npx vitest run src/test/components.test.jsx` → 26 passed (26), incl. the 6 new cases (lines 150–193).
- `npx vitest run` (full suite) → 45 files / 936 tests, all passed. No regressions from this change.
- `npx eslint src/components/HeroChatPanel.jsx src/test/components.test.jsx` → clean, confirming the claimed lint result.

Per-item results against the Test Plan:
1. **Per-hero attribution** (`hero_id: 'warren'` then `'cathie'` both render) — PASS. `rows` loop at HeroChatPanel.jsx:65 sets `hero = msg.hero_id ?? heroId`, so each bubble is attributed independently of the selected `heroId`; test at components.test.jsx:150-157 confirms both names render.
2. **Divider on hero change, none on first reply** — PASS. `showJoin = prevHero !== null && hero !== prevHero` (line 66) correctly suppresses the divider for the first assistant message (`prevHero` starts `null`). Test at line 158-166 confirms "Cathie Wood joins" appears and "Warren Buffett joins" does not.
3. **No divider for same-hero streak** — PASS. Two consecutive `warren` replies → `hero === prevHero` → `showJoin` false. Test at 167-173 confirms no `/joins/` text.
4. **Divider persists across an intervening user message** — PASS. The loop only updates `prevHero` on assistant rows (`continue`d early for `role === 'user'` at line 59-62), so a user message does not reset attribution. Test at 174-181 confirms "Cathie Wood joins" still renders after warren → user → cathie.
5. **No false divider when user message sits between same-hero replies** — PASS. Same mechanism as #4; warren → user → warren produces no `/joins/` match (test 182-189).
6. **Legacy rows without `hero_id` fall back to selected `heroId`, no spurious divider** — PASS. `msg.hero_id ?? heroId` fallback (line 65) confirmed by test 190-194 (single legacy row renders "Cathie Wood", no `/joins/` since there's only one row / `prevHero` starts null).

Additional checks beyond the stated Test Plan (all PASS, no issues found):
- **Divider copy** — exact string is `` `${joinName} joins` `` (line 91), matching the "{Hero Name} joins" spec. `joinName` resolves via `HERO_DATA[row.hero]?.name`, matching names used in `HeroMessage`'s own `HERO_MAP` (e.g. "Warren Buffett", "Cathie Wood").
- **Divider styling vs. CLAUDE.md eyebrow-label convention** — `className="py-1 text-center font-sans text-[11px] uppercase tracking-[0.14em] text-ink-400"` (line 91). Confirmed `font-sans` resolves to Barlow Condensed via `tailwind.config.js:83`. Size (11px), case (uppercase), tracking (0.14em), and color (`text-ink-400`) all match CLAUDE.md's eyebrow-label spec exactly.
- **Render side-effect-free precompute** — `rows` array built via a plain `for` loop before the JSX return (lines 55-72), not mutated inside `.map`; the `.map` at line 85 only reads precomputed `row.showJoin`/`row.hero`. Matches the stated React Compiler / lint-rule rationale.
- **Fragment keying** — `<Fragment key={row.key}>` wraps the optional divider + bubble pair so React doesn't need a second key on the divider itself; `row.key` is the message's array index, consistent with the rest of the list (acceptable since `history` is append-only and not reordered).
- **No dependency-order or merge-conflict issues**: T-17's `hero_id` shape and `useConversationHistory()` consumption line up with what `ChatMessages` expects; T-14's composer placeholder string was left untouched as claimed (line 28 of composer, unrelated to this task).

Gaps / minor observations (non-blocking, not required by Test Plan):
- The `HERO_DATA[row.hero]?.name ?? 'A new mentor'` fallback (line 87) — for an unrecognized `hero_id` — is untested. Low risk: `HeroMessage`'s own fallback to `HERO_MAP.warren` for unknown hero IDs is already covered indirectly by the "unknown hero" test elsewhere in the suite, and an unrecognized `hero_id` reaching this path would require a DB/API-level data integrity issue, not a UI code path. Not a blocker.
- No test exercises 3+ consecutive hero changes (e.g., warren → cathie → ray) to confirm the divider logic holds over a longer streak, though the loop logic makes this a straightforward extrapolation of case 2 and carries low risk of a distinct failure mode.

## Status
Status: TODO
