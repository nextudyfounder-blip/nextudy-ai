import { UserPlus, Upload, Sparkles, Brain } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Create your account", desc: "Sign up free in seconds — no credit card needed." },
  { icon: Upload, title: "Upload PDF or photo", desc: "Drop in lecture notes, textbook pages or handwritten notes." },
  { icon: Sparkles, title: "Get instant summary", desc: "AI extracts key concepts into a clear bullet summary." },
  { icon: Brain, title: "Practice & remember", desc: "Test yourself with flashcards and AI-generated questions." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-card/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-block text-sm font-semibold text-accent uppercase tracking-wider">How it works</div>
          <h2 className="text-4xl md:text-5xl font-bold">From PDF to passing in 4 steps</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl border border-border bg-card p-6 hover:shadow-elegant transition-smooth"
            >
              <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-gradient-accent text-white text-sm font-bold grid place-items-center shadow-glow">
                {i + 1}
              </div>
              <s.icon className="h-8 w-8 text-accent mb-4" />
              <h3 className="font-display font-semibold text-lg">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
