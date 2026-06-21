-- simFolio — gamification engine materialized metric counters (GAMreq §4)

CREATE TABLE user_metrics (
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_id  VARCHAR(64) NOT NULL,
    state      JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, metric_id)
);

-- ── Row-Level Security ─────────────────────────────────────────────────────────

ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_metrics_own" ON user_metrics FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
