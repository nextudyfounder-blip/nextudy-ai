import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn, Upload, Sparkles, GraduationCap } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { setGuest } from "@/hooks/useGuest";

const steps = [
  { n: 1, icon: LogIn, title: "Login", desc: "Sign in or continue as guest." },
  { n: 2, icon: Upload, title: "Upload PDF / Image", desc: "Drop your notes, textbook or photo." },
  { n: 3, icon: Sparkles, title: "Get a Response", desc: "Instant AI-powered summary & Q&A." },
  { n: 4, icon: GraduationCap, title: "And Learn!", desc: "Practice, memorize, ace the exam." },
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
    <section className="relative pt-32 pb-24 bg-background">
      <div className="relative max-w-6xl mx-auto px-6 text-center space-y-8">
        <div className="inline-flex items-center gap-2 realm-border rounded-full bg-card px-4 py-1.5 text-xs font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--realm-accent)]" />
          AI-powered study &amp; business companion
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.05]">
          Study less. <span className="text-realm">Know more.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Upload your PDFs, snap your notes, and let Nextudy do the heavy lifting — instant summaries,
          answers and practice, all in one calm workspace.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="hero" size="xl" onClick={goPrimary} className="hover-magnetic">
            <Upload className="h-5 w-5" /> {user ? "Open dashboard" : "Start as Guest"}
          </Button>
          <Button variant="outline" size="xl" onClick={goHowItWorks} className="hover-magnetic realm-border">
            How it works <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* 4 horizontal step cards — the page ends here */}
        <div id="how-it-works" className="relative mt-20 scroll-mt-24">
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            {steps.map((s) => (
              <li key={s.title} className="realm-border rounded-2xl bg-card p-5 text-left transition-transform hover:-translate-y-0.5">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 shrink-0 rounded-xl realm-border bg-background grid place-items-center">
                    <s.icon className="h-5 w-5 text-realm" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Step {s.n}
                    </div>
                    <div className="font-display font-semibold text-base mt-0.5">{s.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
