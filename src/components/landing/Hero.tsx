import { Button } from "@/components/ui/button";
import { ArrowRight, Upload } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import heroImg from "@/assets/hero.jpg";

export function Hero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const goUpload = () => navigate({ to: user ? "/dashboard" : "/auth" });
  const goHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <section className="relative overflow-hidden bg-gradient-hero text-white pt-32 pb-24">
      <div className="absolute inset-0 opacity-30 mix-blend-screen">
        <img src={heroImg} alt="" className="w-full h-full object-cover" width={1536} height={1024} />
      </div>
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary-glow/30 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent/30 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            AI-powered study companion
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05]">
            Study less.<br />
            <span className="text-gradient">Know more.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-xl leading-relaxed">
            Upload your PDFs and let Nextudy generate instant summaries, flashcards,
            mindmaps and practice questions. Built for students who want results, not all-nighters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="hero" size="xl">
              <Upload className="h-5 w-5" /> Upload your first PDF
            </Button>
            <Button variant="heroOutline" size="xl">
              See how it works <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-6 pt-4 text-sm text-white/60">
            <div>✦ Free forever plan</div>
            <div>✦ No credit card</div>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-xl shadow-elegant">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-white/60">biology_ch4.pdf</div>
                <div className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">AI summary</div>
              </div>
              {[
                "Mitochondria produce ATP via oxidative phosphorylation",
                "The Krebs cycle generates NADH and FADH₂",
                "Electron transport chain establishes proton gradient",
                "ATP synthase converts gradient into chemical energy",
              ].map((t, i) => (
                <div key={i} className="flex gap-3 rounded-xl bg-white/5 p-3">
                  <div className="h-6 w-6 shrink-0 rounded-md bg-gradient-accent grid place-items-center text-xs font-bold">{i + 1}</div>
                  <p className="text-sm text-white/85">{t}</p>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <div className="flex-1 rounded-lg bg-white/10 p-3 text-center text-xs">12 flashcards</div>
                <div className="flex-1 rounded-lg bg-white/10 p-3 text-center text-xs">8 questions</div>
                <div className="flex-1 rounded-lg bg-gradient-accent p-3 text-center text-xs font-semibold">Mindmap</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
