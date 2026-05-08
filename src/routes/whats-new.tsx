import { createFileRoute, Link } from "@tanstack/react-router";
import { Moon, Bot, Image as ImageIcon, MessageSquare, Flame, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/whats-new")({
  component: WhatsNew,
  head: () => ({
    meta: [
      { title: "What's New — Nextudy" },
      { name: "description", content: "Latest features and improvements in Nextudy: dark mode, AI chatbot, image upload and more." },
      { property: "og:title", content: "What's New — Nextudy" },
      { property: "og:description", content: "See what's new in Nextudy — May 2026 release." },
    ],
  }),
});

const items = [
  { icon: Moon, emoji: "🌙", title: "Dark Mode", desc: "Switch between light and dark mode for comfortable studying day and night.", cta: "Try it", to: "/dashboard" as const },
  { icon: Bot, emoji: "🤖", title: "AI Chatbot", desc: "Ask any study question and get instant answers. Supports all subjects including math, biology, chemistry and more.", cta: "Open chat", to: "/chat" as const },
  { icon: ImageIcon, emoji: "📸", title: "Image Upload", desc: "Upload a photo of your textbook or handwritten notes and let AI read it for you.", cta: "Try it", to: "/dashboard" as const },
  { icon: MessageSquare, emoji: "💬", title: "Feedback Page", desc: "Share your ideas and help us improve Nextudy.", cta: "Send feedback", to: "/feedback" as const },
  { icon: Flame, emoji: "🔥", title: "Study Streaks", desc: "Coming soon: earn badges for studying multiple days in a row.", soon: true },
  { icon: Trophy, emoji: "🏆", title: "Leaderboard", desc: "Coming soon: compete with other students.", soon: true },
];

function WhatsNew() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <RevealOnScroll>
            <div className="text-center space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Last updated: May 2026
              </span>
              <h1 className="text-4xl sm:text-5xl font-display font-bold">What's new in Nextudy</h1>
              <p className="text-muted-foreground text-lg">The freshest features to help you study smarter.</p>
            </div>
          </RevealOnScroll>

          <div className="mt-16 relative">
            <div className="absolute left-6 sm:left-8 top-2 bottom-2 w-px bg-gradient-to-b from-accent via-primary/30 to-transparent" aria-hidden />
            <ul className="space-y-6">
              {items.map((it, i) => (
                <RevealOnScroll key={it.title} delay={i * 60}>
                  <li className="relative pl-16 sm:pl-20">
                    <div className="absolute left-0 top-2 h-12 w-12 rounded-2xl bg-gradient-accent shadow-glow grid place-items-center text-2xl">
                      <span aria-hidden>{it.emoji}</span>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 hover:shadow-elegant transition-smooth">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display font-bold text-lg sm:text-xl flex items-center gap-2">
                            {it.title}
                            {it.soon && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Coming soon</span>}
                          </h2>
                          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{it.desc}</p>
                        </div>
                      </div>
                      {!it.soon && it.to && (
                        <div className="mt-4">
                          <Button variant="hero" size="sm" asChild>
                            <Link to={it.to}>{it.cta} →</Link>
                          </Button>
                        </div>
                      )}
                    </li>
                  </RevealOnScroll>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
