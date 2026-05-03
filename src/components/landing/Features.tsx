import { FileText, Brain, Layers, Network, Sparkles, TrendingUp, Timer, Share2, Globe } from "lucide-react";

const features = [
  { icon: FileText, title: "PDF → Bullet summary", desc: "Drop any PDF. Get a clean, concise bullet summary in seconds." },
  { icon: Brain, title: "Practice questions", desc: "Auto-generated Q&A with answers to test yourself before exams." },
  { icon: Layers, title: "Smart flashcards", desc: "Spaced repetition system that focuses on what you keep forgetting." },
  { icon: Network, title: "Visual mindmaps", desc: "See how concepts connect with auto-generated mindmaps." },
  { icon: Sparkles, title: "Explain it simpler", desc: "One click rewrites any section in plain language." },
  { icon: TrendingUp, title: "Progress per subject", desc: "Track mastery, streaks and study hours across every course." },
  { icon: Timer, title: "Pomodoro timer", desc: "Built-in focus timer with breaks that actually keep you sharp." },
  { icon: Share2, title: "Share & collaborate", desc: "Send summaries to classmates or your study group instantly." },
  { icon: Globe, title: "5 languages", desc: "Works in English, Dutch, German, French and Spanish." },
];

export function Features() {
  return (
    <section id="features" className="py-24 md:py-32 bg-gradient-soft">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-block text-sm font-semibold text-accent uppercase tracking-wider">Everything you need</div>
          <h2 className="text-4xl md:text-5xl font-bold">Your unfair study advantage</h2>
          <p className="text-lg text-muted-foreground">
            Nine tools that turn dense material into clear understanding — all in one place.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl bg-card border border-border p-6 transition-smooth hover:shadow-elegant hover:-translate-y-1"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-accent grid place-items-center mb-5 shadow-glow">
                <f.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
