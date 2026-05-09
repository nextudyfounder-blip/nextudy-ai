import { Button } from "@/components/ui/button";
import { Check, Sparkles, TrendingUp, Clock, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const dur = 1400;
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          setN(Math.floor(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>;
}

const plans = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    desc: "Perfect to try Nextudy out.",
    features: [
      "5 PDF or image uploads / day",
      "20 AI chat questions / day",
      "AI summaries & flashcards",
      "1 language",
    ],
    cta: "Start free",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: "€7",
    period: "/month",
    desc: "For serious students.",
    features: [
      "Unlimited uploads",
      "Unlimited AI chat questions",
      "All 5 languages",
      "Mindmaps & practice tests",
      "Priority support",
    ],
    cta: "Go Pro",
    variant: "hero" as const,
    highlight: true,
  },
  {
    name: "Team",
    price: "€14",
    period: "/month",
    desc: "Study together, ace together.",
    features: [
      "Everything in Pro",
      "Up to 5 team members",
      "Shared workspace",
      "Collaborative summaries",
      "Team progress dashboard",
    ],
    cta: "Get Team",
    variant: "outline" as const,
  },
];

const facts = [
  { icon: TrendingUp, text: "Students using AI study tools score 23% higher on average" },
  { icon: Clock, text: "Save 5+ hours of studying per week" },
  { icon: Users, text: "Join 10,000+ students already studying smarter" },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
          <div className="inline-block text-sm font-semibold text-accent uppercase tracking-wider">Pricing</div>
          <h2 className="text-4xl md:text-5xl font-bold">Simple plans, smarter studying</h2>
          <p className="text-lg text-muted-foreground">Start free. Upgrade when you want unlimited power.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12 max-w-4xl mx-auto">
          {facts.map((f) => (
            <div
              key={f.text}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-xs sm:text-sm text-muted-foreground"
            >
              <f.icon className="h-4 w-4 text-accent shrink-0" />
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl p-8 transition-smooth ${
                p.highlight
                  ? "bg-gradient-hero text-white shadow-elegant md:scale-105 border border-accent/40"
                  : "bg-card border border-border hover:shadow-elegant"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-accent text-xs font-bold text-white shadow-glow inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> MOST POPULAR
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
                    <Check className="h-5 w-5 shrink-0 text-accent" />
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
