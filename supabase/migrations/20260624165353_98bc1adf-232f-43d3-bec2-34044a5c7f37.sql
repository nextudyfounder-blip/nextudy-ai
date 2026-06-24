
-- 1) Block users from changing privileged profile columns
CREATE OR REPLACE FUNCTION public.prevent_profile_privileged_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Not allowed to modify plan';
  END IF;
  IF NEW.uploads_this_month IS DISTINCT FROM OLD.uploads_this_month THEN
    RAISE EXCEPTION 'Not allowed to modify uploads_this_month';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privileged_updates ON public.profiles;
CREATE TRIGGER profiles_prevent_privileged_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privileged_updates();

-- 2) Block users from overwriting AI-generated document columns
CREATE OR REPLACE FUNCTION public.prevent_document_ai_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.extracted_text IS DISTINCT FROM OLD.extracted_text
     OR NEW.summary       IS DISTINCT FROM OLD.summary
     OR NEW.questions     IS DISTINCT FROM OLD.questions
     OR NEW.status        IS DISTINCT FROM OLD.status
     OR NEW.error         IS DISTINCT FROM OLD.error
     OR NEW.storage_path  IS DISTINCT FROM OLD.storage_path
     OR NEW.user_id       IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Not allowed to modify AI-generated or system columns on documents';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_prevent_ai_field_updates ON public.documents;
CREATE TRIGGER documents_prevent_ai_field_updates
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.prevent_document_ai_field_updates();

-- 3) Ensure usage_daily cannot be written by clients (only service_role / server functions)
REVOKE INSERT, UPDATE, DELETE ON public.usage_daily FROM authenticated, anon;
GRANT ALL ON public.usage_daily TO service_role;
