-- Team invitations for collaborative workspaces
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('teams', 'turbo')),
  billing_strategy TEXT NOT NULL CHECK (billing_strategy IN ('owner-pays', 'split-bill')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  stripe_checkout_session_id TEXT,
  stripe_checkout_url TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invitations TO authenticated;
GRANT ALL ON public.team_invitations TO service_role;

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their invitations"
  ON public.team_invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can create invitations"
  ON public.team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their invitations"
  ON public.team_invitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their invitations"
  ON public.team_invitations FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER trg_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_team_invitations_owner ON public.team_invitations(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(invitee_email);