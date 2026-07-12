-- simFolio — retire the legacy server-side achievement trigger (Gam2req §3 Phase 2).
-- The client gamification engine (app/src/gamification/) is now the single source of
-- truth for badge awards; the old trigger duplicated 5 badges server-side. This also
-- renames existing 'council' achievement rows to 'mentor' (Gam2req §2.1 badge rename).

-- ── Drop the legacy trigger + function (defined in 001_initial_schema.sql) ────────
DROP TRIGGER IF EXISTS after_execution_insert ON executions;
DROP FUNCTION IF EXISTS check_achievements();

-- ── Rename 'council' → 'mentor' -------------------------------------------------
-- Guard against UNIQUE (user_id, achievement_type): between deploying the client-side
-- alias and applying this migration, the client engine may already have written a
-- 'mentor' row for a user who also carries a legacy 'council' row. A bare UPDATE would
-- hit the unique index and abort the whole migration, so collapse those pairs first
-- (keeping the earlier unlock time), then rename whatever 'council' rows remain.
UPDATE achievements m
   SET unlocked_at = LEAST(m.unlocked_at, c.unlocked_at)
  FROM achievements c
 WHERE m.user_id = c.user_id
   AND m.achievement_type = 'mentor'
   AND c.achievement_type = 'council';

DELETE FROM achievements c
 WHERE c.achievement_type = 'council'
   AND EXISTS (
     SELECT 1 FROM achievements m
      WHERE m.user_id = c.user_id
        AND m.achievement_type = 'mentor'
   );

UPDATE achievements
   SET achievement_type = 'mentor'
 WHERE achievement_type = 'council';
