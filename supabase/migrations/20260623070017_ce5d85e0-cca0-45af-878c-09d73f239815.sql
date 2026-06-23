
-- 1) Remove Games
DROP TABLE IF EXISTS public.game_scores CASCADE;

-- 2) Remove Study Coins / shop
ALTER TABLE public.profiles DROP COLUMN IF EXISTS study_coins;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS owned_avatar_styles;

-- 3) Profiles: restrict SELECT to own row
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 4) Profiles: restrict UPDATE columns. Users can only update safe profile fields.
--    plan + uploads_this_month are server-controlled (service_role).
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url, preferred_language, avatar_seed, avatar_style)
  ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 5) Usage_daily: server-only writes
DROP POLICY IF EXISTS "insert own usage" ON public.usage_daily;
DROP POLICY IF EXISTS "update own usage" ON public.usage_daily;
REVOKE INSERT, UPDATE, DELETE ON public.usage_daily FROM authenticated;
GRANT SELECT ON public.usage_daily TO authenticated;
GRANT ALL ON public.usage_daily TO service_role;

-- 6) Storage: pdfs bucket UPDATE policy (user folder only)
DROP POLICY IF EXISTS "Users update own pdfs" ON storage.objects;
CREATE POLICY "Users update own pdfs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
