import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    desc: "Perfect to try Nextudy out.",
    features: ["3 PDF uploads / month", "AI summaries & flashcards", "Pomodoro timer", "1 language"],
    cta: "Start free",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: "€7",
    period: "/month",
    desc: "For serious students.",
    features: ["Unlimited PDF uploads", "All AI features", "Mindmaps & practice tests", "All 5 languages", "Progress tracker"],
    cta: "Go Pro",
    variant: "hero" as const,
    highlight: true,
  },
  {
    name: "Team",
    price: "€14",
    period: "/month",
    desc: "Study together, ace together.",
    features: ["Everything in Pro", "Shared study groups", "Collaborative summaries", "Team analytics", "Priority support"],
    cta: "Get Team",
    variant: "outline" as const,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-block text-sm font-semibold text-accent uppercase tracking-wider">Pricing</div>
          <h2 className="text-4xl md:text-5xl font-bold">Simple plans, smarter studying</h2>
          <p className="text-lg text-muted-foreground">Start free. Upgrade when you want unlimited power.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl p-8 transition-smooth ${
                p.highlight
                  ? "bg-gradient-hero text-white shadow-elegant scale-105 border border-accent/40"
                  : "bg-card border border-border hover:shadow-elegant"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-accent text-xs font-bold text-white shadow-glow">
                  MOST POPULAR
                </div>
              )}
              <h3 className="font-display font-bold text-2xl">{p.name}</h3>
              <p className={`text-sm mt-1 ${p.highlight ? "text-white/70" : "text-muted-foreground"}`}>{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-bold">{p.price}</span>
                <span className={p.highlight ? "text-white/60" : "text-muted-foreground"}>{p.period}</span>
              </div>
              <Button variant={p.variant} className="w-full mt-6" size="lg">{p.cta}</Button>
              <ul className="mt-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className={`h-5 w-5 shrink-0 ${p.highlight ? "text-accent" : "text-accent"}`} />
                    <span className={p.highlight ? "text-white/90" : ""}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
