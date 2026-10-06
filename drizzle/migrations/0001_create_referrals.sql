CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_cents integer NOT NULL DEFAULT 200,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrer views own referrals" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id);

CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _referrer uuid;
BEGIN
  IF auth.uid() IS NULL OR _code !~ '^[0-9a-f]{8}$' THEN RETURN false; END IF;
  SELECT id INTO _referrer FROM public.profiles WHERE left(id::text, 8) = _code LIMIT 1;
  IF _referrer IS NULL OR _referrer = auth.uid() THEN RETURN false; END IF;
  INSERT INTO public.referrals (referrer_id, referred_id) VALUES (_referrer, auth.uid())
  ON CONFLICT (referred_id) DO NOTHING;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_referral(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;