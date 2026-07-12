# T-10 mentor.md rewrite (single-hero MVP + fix stale persona count)

## Goal
`app/src/data/mentor.md` accurately describes the single-active-hero MVP scope and
confirms all 21 personas are implemented (fixing the stale "7 implemented" claim).

## Files/modules touched
- `app/src/data/mentor.md`

## Dependencies
None.

## Context pointers
- Gam2req.md §3 Phase 4 table: one active hero in MVP; all 21 personas implemented
  and available via FindMentor (fix stale "7 implemented" claim); note multi-hero
  council is deferred to a later version; drop "max council of 3" language.
- Gam2req.md §1 problem 6: "Stale docs — mentor.md claims 7 heroes implemented (all 21 exist)."
- Docs-only change; no test file expected (matches repo convention — no test
  coverage requirement for markdown docs).

## Implementation Notes
Docs-only change to `app/src/data/mentor.md`. The 21-row persona table was left
untouched (surgical change); only the two prose blocks below it and the Rules list
were rewritten.

Verified the "all 21 implemented" claim against code before writing — all 21 ids
(`sage` + 20 real investors) are wired in three places, each returning exactly 21
entries via grep:
- `src/data/heroes.js` — 21 `id:` entries
- `src/components/HeroMessage.jsx` — 21 avatar map keys
- `supabase/functions/hero-chat/index.ts` — 21 `HERO_PERSONAS` keys

Final state of the doc:
- The paragraph after the table states all 21 personas are implemented and
  available today (each with a `heroes.js` entry, a `hero-chat` persona, and a
  `HeroMessage.jsx` avatar), discovered/picked on the FindMentor screen
  (`screens/heroes/FindMentor.jsx`). No "candidates" / "7 implemented" language
  remains.
- The Rules section states MVP has a single active mentor at a time (users switch
  mentors via FindMentor, one hero engaged at once), and multi-hero council is
  explicitly deferred to a later version. The old "Maximum council of 3" wording
  is gone.
- The only surviving occurrence of "council" is the intentional deferred-feature
  note ("Multi-hero council … is deferred to a later version") on line 43.

Sibling council→mentor code/copy changes (T-11 CLAUDE.md, T-12–T-15 UI copy) live
in other files and are out of scope here.

## Test Plan
Docs-only markdown change — no automated test file (matches repo convention: no
test coverage requirement for markdown docs, per the task Context pointers).

Manual verification checklist (all confirmed):
- [x] No stale "7 implemented" / "sage, warren, munger, lynch, bogle, ray, cathie"
      candidate list remains — `grep -niE "council|candidate|7 hero|7 implemented|implemented today|max council"`
      over `mentor.md` returns only line 43 (the deferred-feature note).
- [x] No "Maximum council of 3" / "max council" language remains.
- [x] The only surviving "council" mention is the deferred-feature note.
- [x] "all 21 personas implemented" claim cross-checked against `heroes.js`,
      `HeroMessage.jsx`, and `hero-chat/index.ts` — all three list exactly 21 ids.
- [x] Persona table (21 rows) unchanged; terminology (Sage = fictional guide,
      heroes = real investors) consistent with the CLAUDE.md Hero System section.
- [x] Single-active-mentor MVP framing matches Gam2req §3 Phase 4 and the CLAUDE.md
      hero rules.

Regression note: `mentor.md` is a static data doc under `src/data/`; nothing imports
or renders it, so no code path references the removed text and the existing suite is
unaffected. `cd app && npm run test` / `npm run lint` need not be re-run for this
change, but remain green (no lint rules apply to markdown content).

## Status
Status: TODO

## QA Results

Independently verified (not just trusting Implementation Notes) by reading
`app/src/data/mentor.md` in full and cross-checking `app/src/data/heroes.js`,
`app/src/components/HeroMessage.jsx`, and
`app/supabase/functions/hero-chat/index.ts` directly.

| # | Test Plan Item | Result |
|---|---|---|
| 1 | No stale "7 implemented" / "sage, warren, munger, lynch, bogle, ray, cathie" candidate list remains | PASS — `grep -niE "council\|candidate\|7 hero\|7 implemented\|implemented today\|max council" mentor.md` returns only line 43 (deferred-feature note) |
| 2 | No "Maximum council 3" / "max council" language remains | PASS — no match |
| 3 | Only surviving "council" mention is the deferred-feature note | PASS — line 43: "Multi-hero council (multiple mentors sharing one chat window) is deferred to a later version." |
| 4 | "All 21 personas implemented" claim cross-checked against `heroes.js`, `HeroMessage.jsx`, `hero-chat/index.ts` | PASS — independently counted (not trusting dev-engineer's grep): `heroes.js` has 21 `id:` entries (sage, warren, munger, lynch, bogle, ray, graham, soros, cathie, templeton, tudorjones, druckenmiller, tepper, icahn, ackman, loeb, chamath, simons, griffin, livermore, burry); `HeroMessage.jsx` `HERO_MAP` has 21 keys; `hero-chat/index.ts` `HERO_PERSONAS` (lines 149-171) has exactly 21 keys, one persona string per line. All three sets match the same 21 ids and match the mentor.md persona table (21 rows, lines 12-32). |
| 5 | Persona table (21 rows) unchanged; terminology consistent with CLAUDE.md Hero System | PASS — mentor.md line 3-4 states Sage is "a fictional onboarding guide; all others are real investors the LLM embodies," matching CLAUDE.md's Hero System section (Sage = neutral onboarding guide, steps back after first trade; Heroes = AI personas introduced after first trade). Rules block (lines 39-45) matches: heroes introduced only after first trade, Sage guides before that, single active mentor, multi-hero council deferred, English-only + question/observation-only hero responses. |
| 6 | Single-active-mentor MVP framing matches Gam2req §3 Phase 4 / CLAUDE.md | PASS — cross-checked against `Gam2req.md` line 134 (Phase 4 table row for `mentor.md`): "one active hero for MVP; all 21 personas implemented... available via FindMentor (fix stale '7 implemented' claim); multi-hero council deferred to a later version; drop 'max council of 3'." mentor.md line 41 states "MVP has a **single active mentor** at a time," line 43 defers council — exact match to spec. |

**Overall verdict: PASS.** No real issues found in `app/src/data/mentor.md` itself — the doc is accurate, matches Gam2req §3 Phase 4 and CLAUDE.md Hero System terminology, and the "all 21 personas implemented" claim is independently confirmed correct against all three code sources (21/21/21 match).

**Minor process note (not a doc defect):** the task file's `## Status` field still reads `Status: TODO` despite the Implementation Notes and Test Plan describing completed, verified work. Not fixed here per instructions (QA does not move/re-file kanban cards or edit Status) — flagging for the dev-engineer/PM to update before moving this card to DONE.
