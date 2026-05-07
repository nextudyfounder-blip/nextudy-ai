
DROP POLICY "anyone can insert feedback" ON public.feedback;
CREATE POLICY "submit feedback" ON public.feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(message) BETWEEN 1 AND 5000
    AND (auth.uid() IS NULL OR user_id IS NULL OR auth.uid() = user_id)
  );
