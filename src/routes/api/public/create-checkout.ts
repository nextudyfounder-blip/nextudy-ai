import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSubscriptionCheckout } from "@/lib/stripe";
import { PLANS, activePrice } from "@/lib/plans";


const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const InputSchema = z.object({
  tier: z.enum(["pro", "turbo"]),
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
          const { tier } = parsed.data;

          // Seasonal discounting is retired — always charge the standard rate.
          const plan = PLANS.find((p) => p.id === tier)!;
          const priceCents = Math.round(plan.price * 100);

          const origin = new URL(request.url).origin;
          const session = await createSubscriptionCheckout({
            tier,
            seats: 1,
            customerEmail: userData.user.email,
            successUrl: `${origin}/subscriptions?checkout=success`,
            cancelUrl: `${origin}/subscriptions?checkout=cancelled`,
            priceCentsOverride: priceCents,
            metadata: {
              user_id: userData.user.id,
              tier,
            },
          });


          return json(200, { url: session.url, id: session.id });
        } catch (err) {
          console.error("[create-checkout] failed", err);
          return json(500, { error: err instanceof Error ? err.message : "Unknown error" });
        }
      },
    },
  },
});
