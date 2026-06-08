-- simFolio — initial schema (PRD Appendix A2 + achievements + hero_conversations)

CREATE TYPE order_status AS ENUM ('QUEUED', 'FILLED', 'CANCELLED');
CREATE TYPE order_type   AS ENUM ('MARKET', 'LIMIT');
CREATE TYPE txn_side     AS ENUM ('BUY', 'SELL');
CREATE TYPE asset_class  AS ENUM ('STOCK', 'ETF', 'CRYPTO');

-- Extends Supabase auth.users; user_id = auth.uid()
CREATE TABLE users (
    user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    language_preference VARCHAR(10) DEFAULT 'en',
    theme_preference    VARCHAR(10) DEFAULT 'light',
    onboarding_done     BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_balances (
    user_id         UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    cash_balance    NUMERIC(15, 4) NOT NULL,
    starting_capital NUMERIC(15, 4) NOT NULL
);

CREATE TABLE hero_selections (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    hero_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, hero_id)
);

CREATE TABLE orders (
    order_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES users(user_id) ON DELETE CASCADE,
    ticker        VARCHAR(20) NOT NULL,
    asset_type    asset_class NOT NULL,
    side          txn_side NOT NULL,
    type          order_type NOT NULL,
    requested_qty NUMERIC(12, 4) NOT NULL,
    limit_price   NUMERIC(12, 4),
    status        order_status DEFAULT 'QUEUED',
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE executions (
    execution_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID REFERENCES orders(order_id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(user_id) ON DELETE CASCADE,
    filled_qty      NUMERIC(12, 4) NOT NULL,
    execution_price NUMERIC(12, 4) NOT NULL,
    fees_deducted   NUMERIC(8, 4) NOT NULL DEFAULT 0,
    executed_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE positions (
    user_id           UUID REFERENCES users(user_id) ON DELETE CASCADE,
    ticker            VARCHAR(20) NOT NULL,
    asset_type        asset_class NOT NULL,
    total_qty         NUMERIC(12, 4) NOT NULL CHECK (total_qty >= 0),
    average_cost_basis NUMERIC(12, 4) NOT NULL,
    PRIMARY KEY (user_id, ticker)
);

CREATE TABLE hero_conversations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES users(user_id) ON DELETE CASCADE,
    hero_id    VARCHAR(50) NOT NULL,
    role       VARCHAR(10) NOT NULL CHECK (role IN ('user','assistant')),
    content    TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE achievements (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID REFERENCES users(user_id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    unlocked_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, achievement_type)
);

-- ── Row-Level Security ─────────────────────────────────────────────────────────

ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_selections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements       ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_own" ON users FOR ALL USING (user_id = auth.uid());

-- user_balances
CREATE POLICY "balances_own" ON user_balances FOR ALL USING (user_id = auth.uid());

-- hero_selections
CREATE POLICY "selections_own" ON hero_selections FOR ALL USING (user_id = auth.uid());

-- orders
CREATE POLICY "orders_own" ON orders FOR ALL USING (user_id = auth.uid());

-- executions
CREATE POLICY "executions_own" ON executions FOR ALL USING (user_id = auth.uid());

-- positions
CREATE POLICY "positions_own" ON positions FOR ALL USING (user_id = auth.uid());

-- hero_conversations
CREATE POLICY "conversations_own" ON hero_conversations FOR ALL USING (user_id = auth.uid());

-- achievements
CREATE POLICY "achievements_own" ON achievements FOR ALL USING (user_id = auth.uid());

-- ── Achievement trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_achievements()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  uid UUID := NEW.user_id;
  position_count INT;
  etf_count INT;
BEGIN
  -- first_trade: any execution
  INSERT INTO achievements (user_id, achievement_type)
  VALUES (uid, 'first_trade')
  ON CONFLICT DO NOTHING;

  -- check BUY side only for further badges
  IF (SELECT side FROM orders WHERE order_id = NEW.order_id) = 'BUY' THEN
    -- etf: bought an ETF
    IF (SELECT asset_type FROM orders WHERE order_id = NEW.order_id) = 'ETF' THEN
      INSERT INTO achievements (user_id, achievement_type)
      VALUES (uid, 'etf')
      ON CONFLICT DO NOTHING;
    END IF;

    -- crypto: bought crypto
    IF (SELECT asset_type FROM orders WHERE order_id = NEW.order_id) = 'CRYPTO' THEN
      INSERT INTO achievements (user_id, achievement_type)
      VALUES (uid, 'first_crypto')
      ON CONFLICT DO NOTHING;
    END IF;

    -- diversified: hold >= 5 distinct tickers
    SELECT COUNT(*) INTO position_count
    FROM positions
    WHERE user_id = uid AND total_qty > 0;

    IF position_count >= 5 THEN
      INSERT INTO achievements (user_id, achievement_type)
      VALUES (uid, 'diversified')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- limit: placed a limit order
  IF (SELECT type FROM orders WHERE order_id = NEW.order_id) = 'LIMIT' THEN
    INSERT INTO achievements (user_id, achievement_type)
    VALUES (uid, 'limit')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER after_execution_insert
AFTER INSERT ON executions
FOR EACH ROW EXECUTE FUNCTION check_achievements();
