import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Check, Sparkles, Zap, Users, Crown, Minus, Plus, Loader2, Infinity as InfinityIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subscriptions")({
  component: SubscriptionsPage,
  head: () => ({
    meta: [
      { title: "Subscriptions — Nextudy" },
      { name: "description", content: "Pick the perfect Nextudy plan — Free, Pro, Teams, or Turbo." },
    ],
  }),
});

type Plan = "free" | "pro" | "teams" | "turbo";

const FEATURES = {
  free: [
    "Unlimited AI chat questions",
    "Unlimited document uploads",
    "AI summaries & flashcards",
    "1 study language",
  ],
  pro: [
    "Everything in Free",
    "Advanced reasoning toggle",
    "Multi-file context processing",
    "Priority model access",
    "All 5 study languages",
  ],
  teams: [
    "Everything in Pro, per seat",
    "Shared crew workspace",
    "Collaborative summaries",
    "Owner-pays or split-bill",
    "Team progress dashboard",
  ],
  turbo: [
    "Everything in Teams, per seat",
    "Lower price for large crews",
    "Priority Turbo model queue",
    "Advanced crew analytics",
    "Bulk seat management",
  ],
};

function SubscriptionsPage() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [teamsSeats, setTeamsSeats] = useState(3);
  const [turboSeats, setTurboSeats] = useState(5);
  const [loadingTier, setLoadingTier] = useState<Plan | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        const p = (data?.plan ?? "free").toLowerCase();
        if (["free", "pro", "teams", "turbo"].includes(p)) setCurrentPlan(p as Plan);
      });
  }, [user]);

  const checkout = async (tier: "pro" | "teams" | "turbo", seats: number) => {
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
        body: JSON.stringify({ tier, seats }),
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
      <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-accent/10 border border-accent/30 px-4 py-1.5 text-xs font-semibold text-accent uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Subscriptions
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold">Pick your study speed</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every plan includes unlimited AI chat and unlimited uploads. Upgrade for advanced reasoning, crew workspaces, and priority access.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <PlanCard
            tier="free"
            title="Free"
            icon={<Sparkles className="h-5 w-5" />}
            priceNode={<div className="text-4xl font-bold">€0<span className="text-base font-normal text-muted-foreground">/mo</span></div>}
            tagline="Unlimited individual study."
            features={FEATURES.free}
            current={currentPlan === "free"}
            cta="You're on Free"
            onClick={() => {}}
            disabled
          />

          <PlanCard
            tier="pro"
            title="Pro"
            icon={<Zap className="h-5 w-5" />}
            highlight
            priceNode={<div className="text-4xl font-bold">€7<span className="text-base font-normal text-muted-foreground">/mo</span></div>}
            tagline="Individual power-user pass."
            features={FEATURES.pro}
            current={currentPlan === "pro"}
            cta="Upgrade to Pro"
            loading={loadingTier === "pro"}
            onClick={() => checkout("pro", 1)}
          />

          <PlanCard
            tier="teams"
            title="Teams"
            icon={<Users className="h-5 w-5" />}
            priceNode={
              <SeatCalculator
                rate={16}
                seats={teamsSeats}
                setSeats={setTeamsSeats}
              />
            }
            tagline="Group study crews, €16/seat."
            features={FEATURES.teams}
            current={currentPlan === "teams"}
            cta={`Launch crew · ${teamsSeats} seats`}
            loading={loadingTier === "teams"}
            onClick={() => checkout("teams", teamsSeats)}
          />

          <PlanCard
            tier="turbo"
            title="Turbo"
            icon={<Crown className="h-5 w-5" />}
            priceNode={
              <SeatCalculator
                rate={12}
                seats={turboSeats}
                setSeats={setTurboSeats}
              />
            }
            tagline="Large crews, €12/seat."
            features={FEATURES.turbo}
            current={currentPlan === "turbo"}
            cta={`Launch Turbo · ${turboSeats} seats`}
            loading={loadingTier === "turbo"}
            onClick={() => checkout("turbo", turboSeats)}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10 flex items-center justify-center gap-1.5">
          <InfinityIcon className="h-3.5 w-3.5" /> Every tier: unlimited chat & uploads. Cancel anytime.
        </p>
      </div>
    </AppLayout>
  );
}

function SeatCalculator({
  rate, seats, setSeats,
}: { rate: number; seats: number; setSeats: (n: number) => void }) {
  const total = rate * seats;
  return (
    <div className="space-y-2">
      <div className="text-4xl font-bold">
        €{total}<span className="text-base font-normal text-muted-foreground">/mo</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button" size="icon" variant="outline" className="h-8 w-8"
          onClick={() => setSeats(Math.max(1, seats - 1))}
          disabled={seats <= 1}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <div className="flex-1 text-center text-sm font-medium tabular-nums">
          {seats} {seats === 1 ? "seat" : "seats"}
        </div>
        <Button
          type="button" size="icon" variant="outline" className="h-8 w-8"
          onClick={() => setSeats(Math.min(50, seats + 1))}
          disabled={seats >= 50}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        €{rate} × {seats} = €{total}/month
      </p>
    </div>
  );
}

function PlanCard({
  tier, title, icon, priceNode, tagline, features, current, cta, onClick, disabled, loading, highlight,
}: {
  tier: Plan;
  title: string;
  icon: React.ReactNode;
  priceNode: React.ReactNode;
  tagline: string;
  features: string[];
  current: boolean;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(
      "relative p-6 flex flex-col gap-5 transition-all hover:shadow-lg hover:-translate-y-0.5",
      highlight && "border-accent/60 shadow-glow",
      current && "ring-2 ring-accent",
    )}>
      {current && (
        <Badge className="absolute -top-2.5 right-4 bg-gradient-accent text-accent-foreground border-0 shadow-glow">
          Current plan
        </Badge>
      )}
      {highlight && !current && (
        <Badge variant="secondary" className="absolute -top-2.5 right-4">Most popular</Badge>
      )}
      <div className="flex items-center gap-2">
        <span className="h-9 w-9 rounded-lg bg-gradient-accent/10 text-accent grid place-items-center">
          {icon}
        </span>
        <div>
          <div className="font-display text-lg font-bold">{title}</div>
          <div className="text-xs text-muted-foreground">{tagline}</div>
        </div>
      </div>

      <div>{priceNode}</div>

      <ul className="space-y-2 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {current ? (
        <Button disabled variant="secondary" className="w-full cursor-default">
          <Check className="h-4 w-4" /> Actief · Current plan
        </Button>
      ) : (
        <Button
          onClick={onClick}
          disabled={disabled || loading}
          variant={highlight ? "hero" : "default"}
          className="w-full"
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</> : cta}
        </Button>
      )}
    </Card>
  );
}
