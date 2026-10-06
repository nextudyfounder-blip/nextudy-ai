import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Referral balance plus this month's per-realm activity for the Plans & Billing center. */
export const getBillingSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [refs, convs] = await Promise.all([
      supabase.from("referrals").select("credit_cents, redeemed_at").eq("referrer_id", userId),
      supabase.from("conversations").select("id, realm").eq("user_id", userId),
    ]);
    const realmOf = new Map((convs.data ?? []).map((c) => [c.id, c.realm]));
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("conversation_id, content")
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString())
      .limit(5000);

    // Rough token estimate: ~4 characters per token.
    const tokens = { mentor: 0, vanguard: 0 };
    for (const m of msgs ?? []) {
      const r = realmOf.get(m.conversation_id ?? "") === "vanguard" ? "vanguard" : "mentor";
      tokens[r] += Math.ceil((m.content?.length ?? 0) / 4);
    }
    const rows = refs.data ?? [];
    return {
      referralCode: userId.slice(0, 8),
      friends: rows.length,
      balanceCents: rows.filter((r) => !r.redeemed_at).reduce((s, r) => s + r.credit_cents, 0),
      tokens,
    };
  });

export const claimReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => z.object({ code: z.string().max(16) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("claim_referral", { _code: data.code.toLowerCase() });
    return { ok: !!ok };
  });
