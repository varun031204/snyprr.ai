-- ============================================================
-- Migration: Paper Trading Engine
-- Phase 2 — Full simulated trading with server-side accounting
-- ============================================================

-- ── 1. paper_accounts ─────────────────────────────────────────────────────────
-- One account per user. Created automatically on first use.
CREATE TABLE IF NOT EXISTS public.paper_accounts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance           numeric(20,8) NOT NULL DEFAULT 10000.00,
  starting_balance  numeric(20,8) NOT NULL DEFAULT 10000.00,
  total_realised_pnl numeric(20,8) NOT NULL DEFAULT 0.00,
  total_fees        numeric(20,8) NOT NULL DEFAULT 0.00,
  reset_count       integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paper_accounts_user ON public.paper_accounts(user_id);

-- ── 2. paper_positions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.paper_positions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument        text        NOT NULL,          -- e.g. 'BTC/USDT'
  direction         text        NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  -- size in base currency units (e.g. BTC amount)
  size              numeric(30,10) NOT NULL CHECK (size > 0),
  -- USD notional = size * entry_price
  notional_usd      numeric(20,8) NOT NULL CHECK (notional_usd > 0),
  -- margin locked = notional_usd / leverage
  margin_usd        numeric(20,8) NOT NULL CHECK (margin_usd > 0),
  leverage          integer     NOT NULL DEFAULT 1 CHECK (leverage BETWEEN 1 AND 100),
  entry_price       numeric(30,10) NOT NULL CHECK (entry_price > 0),
  liquidation_price numeric(30,10) NOT NULL,
  stop_loss         numeric(30,10) NULL,
  take_profit_1     numeric(30,10) NULL,
  take_profit_2     numeric(30,10) NULL,
  take_profit_3     numeric(30,10) NULL,
  -- filled fields populated on close
  close_price       numeric(30,10) NULL,
  closed_at         timestamptz NULL,
  realised_pnl      numeric(20,8) NULL,
  fee               numeric(20,8) NOT NULL DEFAULT 0.00,
  status            text        NOT NULL DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN','CLOSED','LIQUIDATED','SL_HIT','TP1_HIT','TP2_HIT','TP3_HIT')),
  close_reason      text        NULL,    -- 'MANUAL','SL','TP1','TP2','TP3','LIQUIDATION'
  note              text        NOT NULL DEFAULT '',
  opened_at         timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paper_positions_user        ON public.paper_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_positions_status      ON public.paper_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_paper_positions_instrument  ON public.paper_positions(user_id, instrument);

-- ── 3. paper_ledger ───────────────────────────────────────────────────────────
-- Immutable audit log of every balance change (AGENTS.md rule: auditable accounting).
CREATE TABLE IF NOT EXISTS public.paper_ledger (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id     uuid        NULL REFERENCES public.paper_positions(id),
  entry_type      text        NOT NULL
                  CHECK (entry_type IN (
                    'INITIAL_DEPOSIT','MARGIN_RESERVE','MARGIN_RELEASE',
                    'REALISED_PNL','FEE','ACCOUNT_RESET'
                  )),
  amount          numeric(20,8) NOT NULL,   -- positive = credit, negative = debit
  balance_after   numeric(20,8) NOT NULL,
  note            text        NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paper_ledger_user     ON public.paper_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paper_ledger_position ON public.paper_ledger(position_id);

-- ── 4. Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.paper_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_ledger    ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "paper_accounts_own"  ON public.paper_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "paper_positions_own" ON public.paper_positions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "paper_ledger_own"    ON public.paper_ledger
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role bypass (for server-side engine)
CREATE POLICY "paper_accounts_service"  ON public.paper_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "paper_positions_service" ON public.paper_positions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "paper_ledger_service"    ON public.paper_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 5. Helper function: get_or_create_paper_account ──────────────────────────
-- Called at the start of every trade operation; ensures the account row exists.
CREATE OR REPLACE FUNCTION public.get_or_create_paper_account(p_user_id uuid)
RETURNS public.paper_accounts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_account public.paper_accounts;
BEGIN
  SELECT * INTO v_account FROM public.paper_accounts WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.paper_accounts (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_account;

    -- Record initial deposit in ledger
    INSERT INTO public.paper_ledger (user_id, entry_type, amount, balance_after, note)
    VALUES (p_user_id, 'INITIAL_DEPOSIT', 10000.00, 10000.00, 'Virtual account created');
  END IF;
  RETURN v_account;
END;
$$;

-- ── 6. Helper function: open_paper_position (atomic) ─────────────────────────
CREATE OR REPLACE FUNCTION public.open_paper_position(
  p_user_id         uuid,
  p_instrument      text,
  p_direction       text,
  p_size            numeric,
  p_notional_usd    numeric,
  p_margin_usd      numeric,
  p_leverage        integer,
  p_entry_price     numeric,
  p_liquidation_price numeric,
  p_stop_loss       numeric,
  p_take_profit_1   numeric,
  p_take_profit_2   numeric,
  p_take_profit_3   numeric,
  p_fee             numeric,
  p_note            text
)
RETURNS public.paper_positions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_account  public.paper_accounts;
  v_position public.paper_positions;
  v_total_deduction numeric;
BEGIN
  -- Ensure account exists
  v_account := public.get_or_create_paper_account(p_user_id);

  v_total_deduction := p_margin_usd + p_fee;

  -- Check sufficient balance
  IF v_account.balance < v_total_deduction THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: required=%, available=%', v_total_deduction, v_account.balance;
  END IF;

  -- Deduct margin + fee atomically
  UPDATE public.paper_accounts
  SET balance    = balance - v_total_deduction,
      total_fees = total_fees + p_fee,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Insert position
  INSERT INTO public.paper_positions (
    user_id, instrument, direction, size, notional_usd, margin_usd, leverage,
    entry_price, liquidation_price, stop_loss, take_profit_1, take_profit_2, take_profit_3,
    fee, note
  ) VALUES (
    p_user_id, p_instrument, p_direction, p_size, p_notional_usd, p_margin_usd, p_leverage,
    p_entry_price, p_liquidation_price, p_stop_loss, p_take_profit_1, p_take_profit_2, p_take_profit_3,
    p_fee, p_note
  ) RETURNING * INTO v_position;

  -- Ledger: margin reserve
  INSERT INTO public.paper_ledger (user_id, position_id, entry_type, amount, balance_after, note)
  SELECT p_user_id, v_position.id, 'MARGIN_RESERVE', -v_total_deduction,
         pa.balance, 'Margin + fee for ' || p_instrument || ' ' || p_direction
  FROM public.paper_accounts pa WHERE pa.user_id = p_user_id;

  RETURN v_position;
END;
$$;

-- ── 7. Helper function: close_paper_position (atomic) ────────────────────────
CREATE OR REPLACE FUNCTION public.close_paper_position(
  p_position_id uuid,
  p_user_id     uuid,
  p_close_price numeric,
  p_close_reason text   -- 'MANUAL','SL','TP1','TP2','TP3','LIQUIDATION'
)
RETURNS public.paper_positions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pos      public.paper_positions;
  v_pnl      numeric;
  v_returned numeric;
  v_status   text;
BEGIN
  -- Lock the position row to prevent race conditions
  SELECT * INTO v_pos FROM public.paper_positions
  WHERE id = p_position_id AND user_id = p_user_id AND status = 'OPEN'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'POSITION_NOT_FOUND_OR_ALREADY_CLOSED: %', p_position_id;
  END IF;

  -- P&L calculation: (price_diff * size) on full notional
  IF v_pos.direction = 'LONG' THEN
    v_pnl := (p_close_price - v_pos.entry_price) * v_pos.size;
  ELSE
    v_pnl := (v_pos.entry_price - p_close_price) * v_pos.size;
  END IF;
  v_pnl := round(v_pnl, 8);

  -- Amount returned to balance: margin + pnl (never below 0 — margin is max loss)
  v_returned := greatest(v_pos.margin_usd + v_pnl, 0);

  -- Map close reason to status
  v_status := CASE p_close_reason
    WHEN 'SL'          THEN 'SL_HIT'
    WHEN 'TP1'         THEN 'TP1_HIT'
    WHEN 'TP2'         THEN 'TP2_HIT'
    WHEN 'TP3'         THEN 'TP3_HIT'
    WHEN 'LIQUIDATION' THEN 'LIQUIDATED'
    ELSE 'CLOSED'
  END;

  -- Update position
  UPDATE public.paper_positions SET
    status       = v_status,
    close_price  = p_close_price,
    closed_at    = now(),
    realised_pnl = v_pnl,
    close_reason = p_close_reason,
    updated_at   = now()
  WHERE id = p_position_id
  RETURNING * INTO v_pos;

  -- Return margin + pnl to account balance
  UPDATE public.paper_accounts SET
    balance           = balance + v_returned,
    total_realised_pnl = total_realised_pnl + v_pnl,
    updated_at        = now()
  WHERE user_id = p_user_id;

  -- Ledger entries: margin release + realised pnl
  INSERT INTO public.paper_ledger (user_id, position_id, entry_type, amount, balance_after, note)
  SELECT p_user_id, p_position_id, 'MARGIN_RELEASE', v_pos.margin_usd,
         pa.balance - v_pnl, 'Margin returned on close'
  FROM public.paper_accounts pa WHERE pa.user_id = p_user_id;

  IF v_pnl != 0 THEN
    INSERT INTO public.paper_ledger (user_id, position_id, entry_type, amount, balance_after, note)
    SELECT p_user_id, p_position_id, 'REALISED_PNL', v_pnl,
           pa.balance, p_close_reason || ' P&L on ' || v_pos.instrument
    FROM public.paper_accounts pa WHERE pa.user_id = p_user_id;
  END IF;

  RETURN v_pos;
END;
$$;

-- ── 8. Helper function: reset_paper_account ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_paper_account(p_user_id uuid)
RETURNS public.paper_accounts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_account public.paper_accounts;
BEGIN
  -- Force-close all open positions (recorded as CLOSED / reset, no pnl returned)
  UPDATE public.paper_positions
  SET status = 'CLOSED', close_reason = 'ACCOUNT_RESET',
      closed_at = now(), close_price = entry_price, realised_pnl = 0, updated_at = now()
  WHERE user_id = p_user_id AND status = 'OPEN';

  -- Reset account balance
  UPDATE public.paper_accounts
  SET balance = starting_balance, total_realised_pnl = 0, total_fees = 0,
      reset_count = reset_count + 1, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_account;

  IF NOT FOUND THEN
    v_account := public.get_or_create_paper_account(p_user_id);
  END IF;

  -- Ledger
  INSERT INTO public.paper_ledger (user_id, entry_type, amount, balance_after, note)
  VALUES (p_user_id, 'ACCOUNT_RESET', v_account.starting_balance,
          v_account.starting_balance, 'Demo account reset by user');

  RETURN v_account;
END;
$$;

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.paper_accounts  IS 'Virtual trading account — one per user, server-side balance';
COMMENT ON TABLE public.paper_positions IS 'Simulated positions — all financial calculations server-side';
COMMENT ON TABLE public.paper_ledger    IS 'Immutable audit trail of every balance change';
COMMENT ON FUNCTION public.open_paper_position  IS 'Atomically reserves margin and opens a paper position';
COMMENT ON FUNCTION public.close_paper_position IS 'Atomically settles P&L and releases margin';
COMMENT ON FUNCTION public.reset_paper_account  IS 'Resets virtual balance; preserves history';
