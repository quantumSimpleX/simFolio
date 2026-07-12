# T-03 stateProvider.js: heldThroughDrop gauge implementation

## Goal
`stateProvider.js` computes the `heldThroughDrop` gauge: count of held positions (qty > 0)
whose `dayChange <= -5`, feeding the `steady` badge condition defined in T-01.

## Files/modules touched
- `app/src/gamification/stateProvider.js`
- `app/src/test/gamification.stateProvider.test.js`

## Dependencies
- T-01 must be DONE first (the gauge metric id must exist in defs.js for this to wire up meaningfully).

## Context pointers
- Gam2req.md §2.1 `steady` row: gauge = count of held positions (qty > 0) with `dayChange <= -5`.
- Positions come from `positionsRef` (see `useGamification.jsx:40-44`, addressed separately in T-04) — this task only needs `p.dayChange` to be present on position objects when available; when absent (uncached quote), the gauge should treat that position as not counted (opportunistic 0, not an error).
- Verify with `gamification.stateProvider.test.js`: positions with/without dayChange, qty=0 excluded, missing quote not counted.

## Implementation Notes
- Added one gauge key to the object returned by `read()` in
  `app/src/gamification/stateProvider.js`:
  `heldThroughDrop: held.filter((p) => p.dayChange <= -5).length`.
- Reused the existing `held` array (already filtered to `qty > 0` via `isHeld` /
  `parseFloat(total_qty)`), so zero-qty positions are excluded for free and the
  qty rule stays a single source of truth. No new qty parsing was introduced.
- `dayChange` is expected to be joined onto position objects upstream from the
  live quote cache (T-04). It is intentionally *not* wired here — T-03 is the
  value computation only.
- Undefined/missing `dayChange` (uncached quote) is excluded naturally because
  `undefined <= -5` evaluates to `false` — no guard needed, no crash. This
  matches the "opportunistic 0 when quotes uncached" requirement (Gam2req §2.1).
- The `-5` threshold is inclusive (`<= -5`), so a position down exactly 5% counts.
- Surgical change: no other gauges, exports, or call sites touched. `defs.js`
  already declares the matching `{ id:'heldThroughDrop', source:'heldThroughDrop' }`
  gauge metric (T-01), so the value flows through with no wiring changes.

## Test Plan
Verified in `app/src/test/gamification.stateProvider.test.js` (all pass; 22 tests
in file, full suite 948/948 green):

- **Empty portfolio** — exact-shape assertion updated to include
  `heldThroughDrop: 0`.
- **Counts drops at/below threshold** — positions at `-7`, `-5` (boundary), and
  `-12` all count → `3`.
- **Excludes above threshold** — `-4.99`, `0`, and `+8` excluded; only `-6`
  counts → `1`.
- **Zero-qty excluded** — a sold position at `-20` (qty 0) is not counted even
  though it dropped hard; only the held `-6` counts → `1`.
- **Missing quote not counted** — a position with no `dayChange` field and one
  with explicit `undefined` are both excluded (no crash); only the `-6` counts
  → `1`.
- **All-safe portfolio** — `-2` and `+3` → `0`.
- **Mixed portfolio** — existing STOCK/ETF/CRYPTO case asserts `heldThroughDrop: 0`
  since those rows carry no `dayChange`.

Edge cases explicitly covered: inclusive `-5` boundary, `undefined`/missing field
safety, qty-gate precedence over drop magnitude.

Run: `cd app && npx vitest run src/test/gamification.stateProvider.test.js`
Full suite: `cd app && npx vitest run`

## QA Results

**Verdict: PASS.** Implementation matches the claimed design; all test-plan items verified against actual code and test runs. No defects found.

Verified independently (2026-07-11):
- `app/src/gamification/stateProvider.js:25` — `heldThroughDrop: held.filter((p) => p.dayChange <= -5).length`, reusing the pre-existing `held` array (`positions.filter(isHeld)`, itself `parseFloat(p?.total_qty ?? 0) > 0`). Matches Implementation Notes exactly.
- `defs.js:35` — `{ id: 'heldThroughDrop', kind: 'gauge', source: 'heldThroughDrop', target: 1 }` and `defs.js:52` — `steady` badge condition `{ metric: 'heldThroughDrop', op: '>=', value: 1 }`. Contract from T-01 is present and wired with no changes needed from this task.
- `npx vitest run src/test/gamification.stateProvider.test.js` → **22/22 passed**.
- `npx vitest run` (full suite) → **948/948 passed, 45/45 files**, including `onboarding.flow.test.jsx` (5/5) run both as part of the full suite and in isolation immediately after — no flaky failures observed in either run. The 4 pre-existing flaky timing failures the dev-engineer flagged did not reproduce; consistent with timing-based flakiness (setTimeout 180-220ms auto-advance) and unrelated to this change regardless of whether they fire on a given run.

Test-plan item-by-item:
| Item | Result |
|---|---|
| Empty portfolio → `heldThroughDrop: 0` (exact shape) | PASS — test line 24-32 |
| Counts drops at/below threshold: -7, -5 (boundary), -12 → 3 | PASS — test line 193-202; boundary `-5` confirmed inclusive via `<= -5` in source |
| Excludes above threshold: -4.99, 0, +8; only -6 counts → 1 | PASS — test line 204-214 |
| Zero-qty excluded: sold position at -20 (qty 0) not counted; only held -6 counts → 1 | PASS — test line 216-224; qty-gate precedence confirmed (reuses `held`, already `isHeld`-filtered) |
| Missing quote not counted: no `dayChange` field and explicit `undefined` both excluded, no crash | PASS — test line 226-235; confirms `undefined <= -5` evaluates `false` in JS, no guard needed |
| All-safe portfolio: -2, +3 → 0 | PASS — test line 237-241 |
| Mixed STOCK/ETF/CRYPTO portfolio → `heldThroughDrop: 0` (no dayChange present) | PASS — test line 170-190 |

No issues found. Scope was correctly limited to value computation only — `dayChange` population is explicitly and correctly deferred to T-04, and the resulting opportunistic-0 behavior until T-04 lands is by design, not a defect.

## Status
Status: TODO
