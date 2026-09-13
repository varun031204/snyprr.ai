-- ============================================================
-- Migration: Extend trading_signals with full signal fields
-- Phase 2 — Single-trader platform schema
-- ============================================================

-- Add all missing columns to trading_signals
ALTER TABLE public.trading_signals
  ADD COLUMN IF NOT EXISTS instrument          TEXT          NOT NULL DEFAULT 'BTC/USDT',
  ADD COLUMN IF NOT EXISTS take_profit_1       NUMERIC(20,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS take_profit_2       NUMERIC(20,8) NULL,
  ADD COLUMN IF NOT EXISTS take_profit_3       NUMERIC(20,8) NULL,
  ADD COLUMN IF NOT EXISTS time_frame          TEXT          NOT NULL DEFAULT '1h',
  ADD COLUMN IF NOT EXISTS buying_wall         NUMERIC(20,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_wall        NUMERIC(20,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analysis            TEXT          NULL,
  ADD COLUMN IF NOT EXISTS notes               TEXT          NULL,
  ADD COLUMN IF NOT EXISTS likes_count         INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count         INTEGER       NOT NULL DEFAULT 0;

-- Make stop_loss_price / entry_price / trader_id NOT NULL-optional
-- (trader_id remains for schema compat but a fixed single-trader approach is used in app logic)

-- Drop the DEFAULT placeholders after backfill so future inserts must supply real values
ALTER TABLE public.trading_signals
  ALTER COLUMN instrument  DROP DEFAULT,
  ALTER COLUMN take_profit_1 DROP DEFAULT,
  ALTER COLUMN time_frame  DROP DEFAULT,
  ALTER COLUMN buying_wall DROP DEFAULT,
  ALTER COLUMN selling_wall DROP DEFAULT;

-- Add a check: selling_wall must differ from buying_wall
ALTER TABLE public.trading_signals
  DROP CONSTRAINT IF EXISTS chk_zones_differ,
  ADD  CONSTRAINT chk_zones_differ CHECK (buying_wall <> selling_wall);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_signals_status      ON public.trading_signals (status);
CREATE INDEX IF NOT EXISTS idx_signals_instrument  ON public.trading_signals (instrument);
CREATE INDEX IF NOT EXISTS idx_signals_published   ON public.trading_signals (published_at DESC NULLS LAST);

-- Refresh comments
COMMENT ON COLUMN public.trading_signals.instrument    IS 'Market symbol, e.g. BTC/USDT, GOLD, EUR/USD';
COMMENT ON COLUMN public.trading_signals.take_profit_1 IS 'Primary take profit level (mandatory)';
COMMENT ON COLUMN public.trading_signals.take_profit_2 IS 'Secondary take profit level (optional)';
COMMENT ON COLUMN public.trading_signals.take_profit_3 IS 'Tertiary take profit level (optional)';
COMMENT ON COLUMN public.trading_signals.time_frame    IS 'Chart timeframe, e.g. 15m, 1h, 4h, 1d';
COMMENT ON COLUMN public.trading_signals.buying_wall   IS 'Demand / entry zone price level';
COMMENT ON COLUMN public.trading_signals.selling_wall  IS 'Supply / exit zone price level';
COMMENT ON COLUMN public.trading_signals.analysis      IS 'AI-generated analysis text (Gemini)';
