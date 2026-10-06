import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSubscriptionCheckout } from "@/lib/stripe";
import { PLANS, promoDiscount } from "@/lib/plans";


const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const InputSchema = z.object({
  tier: z.enum(["pro", "turbo"]),
  promo: z.string().max(40).optional(),
  useReferral: z.boolean().optional(),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/create-checkout")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
          if (!token) return json(401, { error: "Missing bearer token" });

          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            {
              global: { headers: { Authorization: `Bearer ${token}` } },
              auth: { persistSession: false, autoRefreshToken: false },
            },
          );
          const { data: userData, error: userErr } = await supabase.auth.getUser(token);
          if (userErr || !userData.user?.email) return json(401, { error: "Invalid session" });

          const parsed = InputSchema.safeParse(await request.json().catch(() => ({})));
          if (!parsed.success) return json(400, { error: "Invalid payload" });
          const { tier, promo, useReferral } = parsed.data;

          const plan = PLANS.find((p) => p.id === tier)!;
          const priceCents = Math.round(plan.price * 100);
          const promoCents = Math.round(promoDiscount(promo) * 100);
          let referralIds: string[] = [];
          let referralCents = 0;
          if (useReferral) {
            const { data: refs } = await supabase
              .from("referrals").select("id, credit_cents")
              .eq("referrer_id", userData.user.id).is("redeemed_at", null);
            for (const r of refs ?? []) { referralIds.push(r.id); referralCents += r.credit_cents; }
          }
          // Stripe needs at least €0.50 charged; cap the one-time discount.
          const maxOff = Math.max(0, priceCents - 50);
          const discountCents = Math.min(maxOff, promoCents + referralCents);
          if (referralCents === 0) referralIds = [];

          const origin = new URL(request.url).origin;
          const session = await createSubscriptionCheckout({
            tier,
            seats: 1,
            customerEmail: userData.user.email,
            successUrl: `${origin}/subscriptions?checkout=success`,
            cancelUrl: `${origin}/subscriptions?checkout=cancelled`,
            priceCentsOverride: priceCents,
            discountCents,
            metadata: {
              user_id: userData.user.id,
              tier,
              promo: promoCents > 0 ? String(promo).toUpperCase() : "",
              referral_cents: String(referralCents),
            },
          });


          if (referralIds.length) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("referrals").update({ redeemed_at: new Date().toISOString() }).in("id", referralIds);
          }
          return json(200, { url: session.url, id: session.id });
        } catch (err) {
          console.error("[create-checkout] failed", err);
          return json(500, { error: err instanceof Error ? err.message : "Unknown error" });
        }
      },
    },
  },
});
