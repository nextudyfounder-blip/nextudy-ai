import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { PLANS, formatEur, REFERRAL_NOTE, type PlanId } from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — Nextudy plans from €0" },
      { name: "description", content: "Nextudy pricing: Basic is free and unlimited, Pro is €5 per month and Turbo is €7 per month. No hidden fees." },
      { property: "og:title", content: "Nextudy pricing — Basic, Pro and Turbo" },
      { property: "og:description", content: "Start free with unlimited studying, or upgrade to Pro (€5) or Turbo (€7) per month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const ICONS: Record<PlanId, typeof Sparkles> = {
  basic: Sparkles,
  pro: Zap,
  turbo: Crown,
};

function PricingPage() {
  return (
    <AppLayout title="Pricing">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-display font-bold">Simple pricing</h1>
          <p className="text-sm text-muted-foreground">
            Start free. Upgrade only when you want deeper reasoning and more speed.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const Icon = ICONS[plan.id];
            return (
              <section key={plan.id} className="rounded-2xl border border-border p-6 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="h-9 w-9 rounded-lg border border-border grid place-items-center">
                    <Icon className="h-4 w-4 text-realm" />
                  </span>
                  <h2 className="font-display font-semibold text-lg">{plan.name}</h2>
                </div>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-display font-bold">{formatEur(plan.price)}</span>
                  {plan.price > 0 && <span className="text-xs text-muted-foreground mb-1">/ month</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{plan.tagline}</p>
                <ul className="mt-5 space-y-2 text-sm flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="h-4 w-4 text-realm shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6" variant={plan.id === "basic" ? "outline" : "hero"} size="sm">
                  <Link to={plan.id === "basic" ? "/chat" : "/subscriptions"}>
                    {plan.id === "basic" ? "Start free" : `Choose ${plan.name}`}
                  </Link>
                </Button>
              </section>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">{REFERRAL_NOTE}</p>
      </div>
    </AppLayout>
  );
}
