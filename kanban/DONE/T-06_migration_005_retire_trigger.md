# T-06 Migration 005: retire achievement DB trigger

## Goal
New migration file drops the legacy server-side achievement trigger/function and renames
existing `council` achievement rows to `mentor`, making the client gamification engine the
single source of truth for badge awards.

## Files/modules touched
- New file: `app/supabase/migrations/005_retire_achievement_trigger.sql`

## Dependencies
None as a code/import dependency (pure SQL, no JS imports). Conceptually should be applied
to a live environment only after T-01/T-05's client-side alias code is deployed (per Gam2req
§5 risk note), but that is a deployment-order concern, not an implementation-order one —
this file can be written and reviewed independently of T-01.

## Context pointers
- Gam2req.md §3 Phase 2: `DROP TRIGGER IF EXISTS after_execution_insert ON executions; DROP FUNCTION IF EXISTS check_achievements(); UPDATE achievements SET achievement_type = 'mentor' WHERE achievement_type = 'council';`
- Trigger/function verified in `app/supabase/migrations/001_initial_schema.sql` — function ~line 115, trigger ~line 166.
- Risk note from Gam2req §5: until this migration is applied, client engine's silent backfill on load is the safety net for previously-trigger-awarded badges — keep that logic tested (covered by T-05).
- Existing migrations for reference: `001_initial_schema.sql`, `002_market_data_cache.sql`, `003_watchlist.sql`, `004_user_metrics.sql`.

## Implementation Notes
Created `app/supabase/migrations/005_retire_achievement_trigger.sql`. Matches the existing
migration convention (numbered, leading `-- simFolio — …` comment header, no transaction
wrapper — Supabase runs each migration in its own transaction).

Verified against `001_initial_schema.sql`:
- Trigger `after_execution_insert` (line 166) on `executions`, function `check_achievements()`
  (line 115) — both dropped with `IF EXISTS` so the migration is safe to re-run.
- `achievements` columns are `id, user_id, achievement_type (VARCHAR(50)), unlocked_at`, with
  `UNIQUE (user_id, achievement_type)` (line 75). No CHECK constraint enumerates the type, so
  the rename needs no constraint edit.

**Deviation from the literal 3-line spec (Gam2req §3 Phase 2):** a bare
`UPDATE … SET achievement_type='mentor' WHERE achievement_type='council'` can violate the
`UNIQUE (user_id, achievement_type)` index and abort the whole migration transaction. Per the
deployment order in Gam2req §5 (client-side alias ships first, migration applied later), the
client engine can upsert a `mentor` row (`achievementStore.js`, id sourced from T-01 `defs.js`)
for a user who still carries a legacy `council` row — a genuine collision. So before the rename
the migration collapses any `council`/`mentor` pair for the same user: it keeps the earlier
`unlocked_at` on the surviving `mentor` row (`LEAST(...)`), deletes the redundant `council` row,
then renames the remaining `council` rows. This is idempotent and loses no earned-badge data.
In practice collisions should be near-zero (the old trigger never awarded `council`, and its
≥2-hero condition was unreachable in single-hero MVP), but the guard is two cheap statements and
prevents a hard migration failure. No new tables — medals/trophies stay client-derived.

## Test Plan
No migration-testing harness exists in this repo (no SQL test files under `app/src/test/`, no
`supabase/tests/`), and the SQL touches no JS import surface, so verification is manual against a
local Supabase Postgres. Vitest coverage for the client-side `council→mentor` alias is owned by
T-05 (`hooks.test.jsx`) and is unaffected by this file.

**Pre-checks (static):**
- All identifiers exist in `001_initial_schema.sql`: table `executions`, trigger
  `after_execution_insert`, function `check_achievements()`, table `achievements`, columns
  `user_id` / `achievement_type` / `unlocked_at`.
- Every DROP uses `IF EXISTS`, and the rename is guarded — re-running the migration is a no-op.

**Manual apply + verify (local Supabase):**
1. Seed a starting state, e.g. `INSERT INTO achievements (user_id, achievement_type) VALUES
   (<uid>, 'council'), (<uid>, 'first_trade');` and, to exercise the collision path, a second
   user with both `('council')` and `('mentor')` rows carrying different `unlocked_at` values.
2. Apply the migration: `supabase db push` (or `psql -f app/supabase/migrations/005_retire_achievement_trigger.sql`).
3. **Trigger retired:** `SELECT tgname FROM pg_trigger WHERE tgname='after_execution_insert';`
   returns 0 rows; `SELECT proname FROM pg_proc WHERE proname='check_achievements';` returns 0 rows.
4. **Rename applied, no data loss:** `SELECT achievement_type, count(*) FROM achievements GROUP BY 1;`
   shows zero `council` rows; the plain-`council` user now has exactly one `mentor` row plus their
   untouched `first_trade` row; the collision user has a single `mentor` row whose `unlocked_at`
   equals the earlier of the two originals (no duplicate, no lost badge).
5. **Trigger no longer awards (Gam2req §4 step 5):** insert an execution (place a trade via the
   app or a direct `INSERT INTO executions …`); confirm no new `first_trade`/`etf`/`limit`/etc.
   rows appear from the DB side — only the client engine's backfill writes achievements now.
6. **Idempotency:** apply the migration a second time; it completes without error and the row
   counts from step 4 are unchanged.

## QA Results

**Review type: static/SQL-correctness review only.** No live Postgres/Supabase instance was
available in this QA pass — the manual apply-and-verify steps in the Test Plan (steps 1–6,
requiring `supabase db push` or `psql` against a real database) were **not executed**. Everything
below is a line-by-line read of `app/supabase/migrations/005_retire_achievement_trigger.sql`
cross-checked against `001_initial_schema.sql` and a manual trace of the SQL semantics. This does
not substitute for a live run.

### Pre-checks (static) — PASS
- `executions` table, trigger `after_execution_insert`, function `check_achievements()`: all
  confirmed in `001_initial_schema.sql` lines 42–50 and 115–168, spelling/case match exactly.
- `achievements` table (line 70–76): columns `user_id`, `achievement_type`, `unlocked_at` and
  `UNIQUE (user_id, achievement_type)` all confirmed present and correctly referenced.
- Both drops use `IF EXISTS` (`DROP TRIGGER IF EXISTS after_execution_insert ON executions;`,
  `DROP FUNCTION IF EXISTS check_achievements();`) — PASS, re-running is a no-op for these two
  statements.

### Collision-handling logic trace — PASS
Traced manually for user with council row A (`unlocked_at=T1`) and mentor row B (`unlocked_at=T2`):
1. `UPDATE achievements m SET unlocked_at = LEAST(m.unlocked_at, c.unlocked_at) FROM achievements c WHERE m.user_id=c.user_id AND m.achievement_type='mentor' AND c.achievement_type='council'` —
   joins B (m) to A (c) on `user_id`, sets B.unlocked_at = LEAST(T2, T1) = min(T1,T2). Valid
   Postgres `UPDATE ... FROM` self-join syntax on the same table with different aliases. Correct.
2. `DELETE FROM achievements c WHERE c.achievement_type='council' AND EXISTS (SELECT 1 FROM achievements m WHERE m.user_id=c.user_id AND m.achievement_type='mentor')` —
   deletes A because a mentor row now exists for the same user. Correct.
3. `UPDATE achievements SET achievement_type='mentor' WHERE achievement_type='council'` —
   for the collision user, A is already gone, so this statement doesn't touch that user (no
   conflict). For a plain council-only user (no mentor row), this renames their row to `mentor`
   with no pre-existing mentor row to collide with — no unique-index violation. Correct.

Net result matches the claimed behavior exactly: single surviving `mentor` row, `unlocked_at`
= the earlier of the two originals, no duplicate, no lost badge. SQL syntax (UPDATE…FROM,
DELETE…WHERE EXISTS, correct use of `LEAST`) is valid Postgres.

### Idempotency — PASS
Second run: `DROP ... IF EXISTS` are no-ops (already dropped). No `council` rows remain after
the first run, so the UPDATE/DELETE/UPDATE trio all affect 0 rows on re-run. Confirmed idempotent
by inspection.

### Data-loss / blast-radius check — PASS
Every statement's WHERE/join clause is scoped to `achievement_type IN ('council','mentor')`.
Other achievement types (`first_trade`, `etf`, `first_crypto`, `diversified`, `limit`, and the
newer badge ids from `defs.js`) are never referenced — no risk of collateral deletion or rename.

### Naming convention — PASS
`005_retire_achievement_trigger.sql` follows the existing `NNN_snake_case_description.sql`
pattern (001/002/003/004), sequential numbering, and the `-- simFolio — …` header comment style
used by 001/003/004 (002 uses a slightly different header but that's a pre-existing
inconsistency, not something 005 needs to match). No transaction wrapper, consistent with all
prior migrations (Supabase wraps each file in its own transaction).

### Minor observation (not a defect, no fix required)
`LEAST(m.unlocked_at, c.unlocked_at)` would return NULL if either side were NULL (Postgres
`LEAST` propagates NULL). Checked `app/src/gamification/achievementStore.js` — the client's
`upsert(... { user_id, achievement_type } ...)` never sets `unlocked_at` explicitly, so the
column's `DEFAULT CURRENT_TIMESTAMP` always populates it on insert. This makes a NULL
`unlocked_at` unreachable under current insert paths; flagging only for completeness, no change
requested.

### Residual risk / what a live run would still need to confirm
- Actual execution against a real Postgres instance (Test Plan steps 2–6) — not performed here.
- The deployment-order assumption noted in Implementation Notes (T-01/T-05 client-side alias
  ships before this migration is applied) is an operational precondition, not something the SQL
  file itself can enforce — worth a reminder at deploy time.
- RLS: `achievements` has `ENABLE ROW LEVEL SECURITY` with policy `achievements_own` restricting
  to `user_id = auth.uid()`. Migrations run via the Supabase migration runner as a privileged
  role that bypasses RLS, so this doesn't block the UPDATE/DELETE statements — but this is an
  assumption based on standard Supabase migration behavior, not something verifiable without a
  live run.

### Overall verdict: PASS (static review)
No typos, misspelled identifiers, or logic errors found. SQL is syntactically valid, idempotent,
correctly scoped, and matches the Implementation Notes' description of behavior. Recommend
proceeding to a live-environment run of Test Plan steps 1–6 before considering this migration
production-ready; nothing found here blocks that from happening.

## Status
Status: TODO
