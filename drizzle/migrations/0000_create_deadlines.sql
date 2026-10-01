CREATE TABLE public.deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  due_at timestamptz NOT NULL,
  kind text NOT NULL DEFAULT 'study',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deadlines TO authenticated;
GRANT ALL ON public.deadlines TO service_role;

ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own deadlines" ON public.deadlines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own deadlines" ON public.deadlines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own deadlines" ON public.deadlines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own deadlines" ON public.deadlines FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX deadlines_user_due_idx ON public.deadlines (user_id, due_at);

CREATE TRIGGER update_deadlines_updated_at BEFORE UPDATE ON public.deadlines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();