-- Market data cache — shared across all sessions, keyed by ticker
-- Columns come from two TD endpoints:
--   /quote        (1 credit/symbol, refreshed every 5 hours)
--   /statistics   (30 credits/symbol, fetched once and preserved across quote refreshes)

CREATE TABLE IF NOT EXISTS market_data_cache (
  -- identity
  ticker            VARCHAR(20)  PRIMARY KEY,
  name              VARCHAR(200),
  exchange          VARCHAR(50),

  -- price (from /quote, refreshed every 5 hours)
  price             NUMERIC(15, 4),
  change_amount     NUMERIC(12, 4),
  change_pct        NUMERIC(10, 6),
  open_price        NUMERIC(15, 4),
  high              NUMERIC(15, 4),
  low               NUMERIC(15, 4),
  prev_close        NUMERIC(15, 4),
  volume            BIGINT,
  avg_volume        BIGINT,
  week52_low        NUMERIC(15, 4),
  week52_high       NUMERIC(15, 4),
  fetched_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- fundamentals (from /statistics, fetched once — NOT overwritten on quote refresh)
  market_cap        NUMERIC(20, 0),
  pe_ratio          NUMERIC(10, 4),
  eps               NUMERIC(12, 4),
  beta              NUMERIC(8,  4),
  dividend_yield    NUMERIC(8,  6)
);

ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;

-- Market prices are not sensitive — any session (anon or authenticated) can read and write
CREATE POLICY "market_cache_select" ON market_data_cache FOR SELECT USING (true);
CREATE POLICY "market_cache_insert" ON market_data_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "market_cache_update" ON market_data_cache FOR UPDATE USING (true);
