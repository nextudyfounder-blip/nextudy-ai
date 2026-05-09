import { supabase } from "@/integrations/supabase/client";

export const COIN_REWARDS = {
  upload: 15,
  game: 5,
  feedback: 10,
  flashcards: 10,
  streak: 25,
} as const;

export type CoinReason = keyof typeof COIN_REWARDS;

/**
 * Award coins to the current user. Safe no-op if not signed in.
 * Returns the new balance, or null on failure.
 */
export async function awardCoins(reason: CoinReason): Promise<number | null> {
  const amount = COIN_REWARDS[reason];
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) return null;

  const { data: prof } = await supabase
    .from("profiles")
    .select("study_coins")
    .eq("id", uid)
    .maybeSingle();
  const next = (prof?.study_coins ?? 0) + amount;
  const { error } = await supabase
    .from("profiles")
    .update({ study_coins: next })
    .eq("id", uid);
  if (error) return null;
  return next;
}
