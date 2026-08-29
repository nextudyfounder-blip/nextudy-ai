import { Button } from "@/components/ui/button";
import { Check, Sparkles, Gift } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PLANS, activePrice, formatEur, REFERRAL_NOTE } from "@/lib/plans";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
          <div className="inline-block text-sm font-semibold text-accent uppercase tracking-wider">Pricing</div>
          <h2 className="text-4xl md:text-5xl font-bold">Simple plans, smarter studying</h2>
          <p className="text-lg text-muted-foreground">
            Basic is free and unlimited. Upgrade for advanced reasoning and maximum speed.
          </p>
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Gift className="h-3.5 w-3.5 text-accent" /> {REFERRAL_NOTE}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((p) => {
            const price = activePrice(p);
            const highlight = p.id === "pro";
            return (
              <div
                key={p.id}
                className={`relative rounded-3xl p-8 transition-smooth ${
                  highlight
                    ? "bg-gradient-hero text-white shadow-elegant md:scale-105 border border-accent/40"
                    : "bg-card border border-border hover:shadow-elegant"
                }`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-accent text-xs font-bold text-white shadow-glow inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> MOST POPULAR
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-2xl">{p.name}</h3>
                </div>
                <p className={`text-sm mt-1 ${highlight ? "text-white/70" : "text-muted-foreground"}`}>{p.tagline}</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{formatEur(price)}</span>
                  <span className={highlight ? "text-white/60" : "text-muted-foreground"}>/mo</span>
                </div>
                <Button
                  asChild
                  variant={highlight ? "hero" : "outline"}
                  className="w-full mt-6"
                  size="lg"
                >
                  <Link to={p.id === "basic" ? "/auth" : "/subscriptions"}>
                    {p.id === "basic" ? "Start free" : `Get ${p.name}`}
                  </Link>
                </Button>
                <ul className="mt-8 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="h-5 w-5 shrink-0 text-accent" />
                      <span className={highlight ? "text-white/90" : ""}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
