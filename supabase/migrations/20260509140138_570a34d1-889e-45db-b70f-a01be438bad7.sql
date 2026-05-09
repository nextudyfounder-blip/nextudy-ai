
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS study_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avatar_seed text,
  ADD COLUMN IF NOT EXISTS avatar_style text NOT NULL DEFAULT 'adventurer';

CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game)
);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own scores" ON public.game_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own scores" ON public.game_scores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own scores" ON public.game_scores
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_game_scores_updated
  BEFORE UPDATE ON public.game_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
