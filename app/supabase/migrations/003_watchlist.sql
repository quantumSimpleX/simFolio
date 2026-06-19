-- simFolio — per-user watchlist (replaces client-only localStorage so the list
-- follows the logged-in user across devices, like positions/balances do).

CREATE TABLE watchlist (
    user_id    UUID REFERENCES users(user_id) ON DELETE CASCADE,
    ticker     VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, ticker)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchlist_own" ON watchlist FOR ALL USING (user_id = auth.uid());
