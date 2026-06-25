
-- 1) Attach trigger to profiles to block self-upgrade of plan / counter manipulation
DROP TRIGGER IF EXISTS profiles_prevent_privileged_updates ON public.profiles;
CREATE TRIGGER profiles_prevent_privileged_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privileged_updates();

-- 2) Attach trigger to documents to block tampering with AI/system columns
DROP TRIGGER IF EXISTS documents_prevent_ai_field_updates ON public.documents;
CREATE TRIGGER documents_prevent_ai_field_updates
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.prevent_document_ai_field_updates();

-- 3) Lock down usage_daily writes. Only service_role (server admin) may write.
REVOKE INSERT, UPDATE, DELETE ON public.usage_daily FROM authenticated, anon;
GRANT  ALL ON public.usage_daily TO service_role;

-- 4) Feedback: require authenticated user (no anonymous-with-email orphans),
--    and tie row strictly to the submitter.
DROP POLICY IF EXISTS "submit feedback" ON public.feedback;
CREATE POLICY "submit feedback"
  ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND char_length(message) BETWEEN 1 AND 5000
  );
