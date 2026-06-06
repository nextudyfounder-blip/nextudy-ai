ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS owned_avatar_styles text[] NOT NULL DEFAULT ARRAY['adventurer']::text[];