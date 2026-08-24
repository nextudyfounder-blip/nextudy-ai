ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS led_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS led_preset text NOT NULL DEFAULT 'rainbow-wave',
  ADD COLUMN IF NOT EXISTS onboarding_dismissed boolean NOT NULL DEFAULT false;