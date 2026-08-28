ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS promo_event_id text,
  ADD COLUMN IF NOT EXISTS promo_price_cents integer,
  ADD COLUMN IF NOT EXISTS promo_locked_at timestamptz;