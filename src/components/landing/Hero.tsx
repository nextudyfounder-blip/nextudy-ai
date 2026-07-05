import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn, Upload, Sparkles, GraduationCap } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { setGuest } from "@/hooks/useGuest";

const steps = [
  { n: 1, icon: LogIn, title: "Login", desc: "Sign in or continue as guest.", tone: "from-sky-400/30 to-blue-500/10" },
  { n: 2, icon: Upload, title: "Upload PDF / Image", desc: "Drop your notes, textbook or photo.", tone: "from-violet-400/30 to-purple-500/10" },
  { n: 3, icon: Sparkles, title: "Get a Response", desc: "Instant AI-powered summary & Q&A.", tone: "from-pink-400/30 to-fuchsia-500/10" },
  { n: 4, icon: GraduationCap, title: "And Learn!", desc: "Practice, memorize, ace the exam.", tone: "from-amber-300/30 to-orange-500/10" },
];

export function Hero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const goPrimary = () => {
    if (user) return navigate({ to: "/dashboard" });
    setGuest(true);
    navigate({ to: "/chat" });
  };
  const goHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative overflow-hidden pt-32 pb-24 bg-background">
      {/* soft ambient glow, no solid purple slab */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-primary/15 blur-3xl animate-float-slow" />
        <div className="absolute top-40 right-1/4 h-96 w-96 rounded-full bg-accent/15 blur-3xl animate-float-slower" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary-glow/10 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-4 py-1.5 text-xs font-medium animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          AI-powered study companion
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.05] animate-fade-in">
          Study less.{" "}
          <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Know more.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Upload your PDFs, snap your notes, and let Nextudy do the heavy lifting — instant summaries,
          flashcards and answers, all in one calm workspace.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="hero" size="xl" onClick={goPrimary} className="hover-magnetic">
            <Upload className="h-5 w-5" /> {user ? "Open dashboard" : "Start as Guest"}
          </Button>
          <Button variant="outline" size="xl" onClick={goHowItWorks} className="hover-magnetic">
            How it works <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Animated 4-step flow */}
        <div className="relative mt-20">
          <div className="hidden md:block absolute left-0 right-0 top-14 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 relative">
            {steps.map((s, i) => (
              <li
                key={s.title}
                style={{ animationDelay: `${i * 120}ms` }}
                className="group relative rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-5 text-left animate-fade-in transition-all hover:-translate-y-1 hover:shadow-elegant"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${s.tone} opacity-0 group-hover:opacity-100 transition-opacity`} aria-hidden />
                <div className="relative flex items-start gap-3">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white grid place-items-center shadow-glow animate-float-slow" style={{ animationDelay: `${i * 200}ms` }}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Step {s.n}
                    </div>
                    <div className="font-display font-semibold text-base mt-0.5">{s.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 animate-arrow-nudge" />
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
