import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Cancels the user's paid plan at the end of the current billing cycle.
 * Access stays intact until the paid period naturally expires.
 */
export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | null)?.email;
    if (!email) throw new Error("No email on this account");

    const { cancelSubscriptionsForEmail } = await import("@/lib/stripe");
    const result = await cancelSubscriptionsForEmail(email);
    if (!result.cancelled) {
      return { cancelled: false, endsAt: null as string | null };
    }
    return {
      cancelled: true,
      endsAt: result.periodEnd ? new Date(result.periodEnd * 1000).toISOString() : null,
    };
  });

/**
 * Re-evaluates the stored plan against Stripe.
 * Once a cancelled subscription's paid period has expired, the user is
 * automatically downgraded to the free Basic plan (no recurring charges).
 */
export const syncMyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | null)?.email;
    const { data: profile } = await context.supabase
      .from("profiles").select("plan").eq("id", context.userId).maybeSingle();
    const plan = (profile?.plan ?? "basic").toLowerCase();
    if (!email || plan === "basic") return { plan: "basic" as const, endsAt: null as string | null };

    const { stripeSubscriptionStatusForEmail } = await import("@/lib/stripe");
    const status = await stripeSubscriptionStatusForEmail(email);

    if (!status.active) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("profiles").update({ plan: "basic" }).eq("id", context.userId);
      return { plan: "basic" as const, endsAt: null };
    }

    return {
      plan: plan as "pro" | "turbo",
      endsAt: status.cancelAtPeriodEnd && status.periodEnd
        ? new Date(status.periodEnd * 1000).toISOString()
        : null,
    };
  });
