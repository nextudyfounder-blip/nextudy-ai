ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS realm text NOT NULL DEFAULT 'mentor';

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_realm_check;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_realm_check CHECK (realm IN ('mentor','vanguard'));

CREATE INDEX IF NOT EXISTS conversations_user_realm_idx
  ON public.conversations (user_id, realm, updated_at DESC);