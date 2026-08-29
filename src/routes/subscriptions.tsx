import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Check, Sparkles, Zap, Crown, Infinity as InfinityIcon, Gift } from "lucide-react";
import { PenLoader } from "@/components/PenLoader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PLANS, activePrice, formatEur, normalizePlan, REFERRAL_NOTE,
  type PlanId, type PlanDef,
} from "@/lib/plans";

export const Route = createFileRoute("/subscriptions")({
  component: SubscriptionsPage,
  head: () => ({
    meta: [
      { title: "Subscriptions — Nextudy" },
      { name: "description", content: "Pick your Nextudy plan — Basic (free), Pro or Turbo." },
      { property: "og:title", content: "Subscriptions — Nextudy" },
      { property: "og:description", content: "Basic is free and unlimited. Upgrade to Pro or Turbo for advanced reasoning and top speed." },
    ],
  }),
});

const ICONS: Record<PlanId, React.ReactNode> = {
  basic: <Sparkles className="h-5 w-5" />,
  pro: <Zap className="h-5 w-5" />,
  turbo: <Crown className="h-5 w-5" />,
};

function SubscriptionsPage() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<PlanId>("basic");
  const [loadingTier, setLoadingTier] = useState<PlanId | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle()
      .then(({ data }) => setCurrentPlan(normalizePlan(data?.plan)));
  }, [user]);

  const checkout = async (tier: "pro" | "turbo") => {
    if (!user) {
      toast.error("Sign in to upgrade");
      return;
    }
    setLoadingTier(tier);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/public/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start checkout");
      setLoadingTier(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-5xl mx-auto animate-fade-in">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-accent/10 border border-accent/30 px-4 py-1.5 text-xs font-semibold text-accent uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Subscriptions
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold">Pick your study speed</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Basic is free and unlimited. Upgrade for advanced reasoning and maximum AI dispatch speed.
          </p>
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Gift className="h-3.5 w-3.5 text-accent" /> {REFERRAL_NOTE}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={currentPlan === plan.id}
              loading={loadingTier === plan.id}
              onClick={() => plan.id !== "basic" && checkout(plan.id as "pro" | "turbo")}
            />
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10 flex items-center justify-center gap-1.5">
          <InfinityIcon className="h-3.5 w-3.5" /> Every tier: unlimited chat & uploads. Cancel anytime.
        </p>
      </div>
    </AppLayout>
  );
}

function PlanCard({
  plan, current, loading, onClick,
}: { plan: PlanDef; current: boolean; loading?: boolean; onClick: () => void }) {
  const deal = showsDeal(plan);
  const price = activePrice(plan);
  const highlight = plan.id === "pro";

  return (
    <Card className={cn(
      "relative p-6 flex flex-col gap-5 hover-magnetic glass-panel",
      highlight && "border-accent/60 shadow-glow",
      current && "ring-2 ring-accent",
    )}>
      {current && (
        <Badge className="absolute -top-2.5 right-4 bg-gradient-accent text-accent-foreground border-0 shadow-glow">
          Actief plan
        </Badge>
      )}
      {highlight && !current && (
        <Badge variant="secondary" className="absolute -top-2.5 right-4">Most popular</Badge>
      )}
      <div className="flex items-center gap-2">
        <span className="h-9 w-9 rounded-lg bg-gradient-accent/10 text-accent grid place-items-center">
          {ICONS[plan.id]}
        </span>
        <div>
          <div className="font-display text-lg font-bold flex items-center gap-2">
            {plan.name}
          </div>
          <div className="text-xs text-muted-foreground">{plan.tagline}</div>
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold">{formatEur(price)}</span>
        <span className="text-base font-normal text-muted-foreground">/mo</span>
      </div>

      <ul className="space-y-2 text-sm flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {current ? (
        <Button disabled variant="secondary" className="w-full cursor-default">
          <Check className="h-4 w-4" /> Actief plan
        </Button>
      ) : plan.id === "basic" ? (
        <Button disabled variant="outline" className="w-full cursor-default">Free forever</Button>
      ) : (
        <Button
          onClick={onClick}
          disabled={loading}
          variant={highlight ? "hero" : "default"}
          className="w-full"
        >
          {loading ? <PenLoader size="sm" inline label="Securing checkout…" /> : `Upgrade to ${plan.name}`}
        </Button>
      )}
    </Card>
  );
}
