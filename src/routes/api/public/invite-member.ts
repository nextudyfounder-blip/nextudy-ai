import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { inviteMemberEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/resend";
import { createMemberCheckout } from "@/lib/stripe";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const InputSchema = z.object({
  invitee_email: z.string().email(),
  tier: z.enum(["teams", "turbo"]),
  billingStrategy: z.enum(["owner-pays", "split-bill"]),
  inviter_name: z.string().max(120).optional().nullable(),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/invite-member")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
          if (!token) return json(401, { error: "Missing bearer token" });

          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data: userData, error: userErr } = await supabase.auth.getUser(token);
          if (userErr || !userData.user) return json(401, { error: "Invalid session" });
          const owner = userData.user;

          const payload = InputSchema.safeParse(await request.json().catch(() => ({})));
          if (!payload.success) {
            return json(400, { error: "Invalid payload", details: payload.error.flatten() });
          }
          const { invitee_email, tier, billingStrategy, inviter_name } = payload.data;

          const origin = new URL(request.url).origin;
          let checkoutUrl: string | null = null;
          let checkoutSessionId: string | null = null;

          if (billingStrategy === "split-bill") {
            const session = await createMemberCheckout({
              tier,
              customerEmail: invitee_email,
              successUrl: `${origin}/dashboard?invite=success`,
              cancelUrl: `${origin}/dashboard?invite=cancelled`,
              metadata: {
                owner_id: owner.id,
                invitee_email,
                tier,
              },
            });
            checkoutUrl = session.url;
            checkoutSessionId = session.id;
          }

          // Persist the invitation with the caller's session (RLS enforces owner_id).
          const status = billingStrategy === "owner-pays" ? "active" : "pending";
          const { data: inserted, error: insertErr } = await supabase
            .from("team_invitations")
            .insert({
              owner_id: owner.id,
              invitee_email,
              tier,
              billing_strategy: billingStrategy,
              status,
              stripe_checkout_session_id: checkoutSessionId,
              stripe_checkout_url: checkoutUrl,
              accepted_at: billingStrategy === "owner-pays" ? new Date().toISOString() : null,
            })
            .select("id")
            .single();

          if (insertErr) {
            console.error("[invite_member] insert failed", insertErr);
            return json(500, { error: "Failed to record invitation" });
          }

          const { subject, html } = inviteMemberEmail({
            inviterName: inviter_name || owner.user_metadata?.display_name || owner.email,
            tier,
            billingStrategy,
            checkoutUrl,
            workspaceUrl: `${origin}/dashboard`,
          });

          await sendEmail({
            from: "Nextudy Crews <crews@nextudy.app>",
            to: invitee_email,
            subject,
            html,
            reply_to: owner.email ?? undefined,
          });

          return json(200, {
            ok: true,
            invitation_id: inserted.id,
            status,
            checkout_url: checkoutUrl,
          });
        } catch (err) {
          console.error("[invite_member] failed", err);
          return json(500, { error: err instanceof Error ? err.message : "Unknown error" });
        }
      },
    },
  },
});
