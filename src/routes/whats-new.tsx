import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/whats-new")({
  component: WhatsNew,
  head: () => ({
    meta: [
      { title: "What's New — Nextudy" },
      { name: "description", content: "Latest Nextudy updates: instant file reading with zero storage, chat PDF export, auto-save recovery and dual study hubs." },
      { property: "og:title", content: "What's New — Nextudy" },
      { property: "og:description", content: "See the newest Nextudy features and improvements." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const items = [
  { emoji: "⚡", title: "Instant file reading", desc: "Attach a PDF or photo and it's read straight into your conversation. Your files are never stored on our servers.", cta: "Try it", to: "/chat" as const },
  { emoji: "📄", title: "Export chat to PDF", desc: "Download a clean, styled PDF of any conversation — perfect for revision notes.", cta: "Open chat", to: "/chat" as const },
  { emoji: "💾", title: "Auto-save recovery", desc: "Your active chat and anything you were typing are kept safe, even if you refresh or close the tab.", cta: "Open chat", to: "/chat" as const },
  { emoji: "🏔️", title: "Mentor & Vanguard hubs", desc: "Switch between your study partner and your blunt business partner, each with its own look and voice.", cta: "Switch hubs", to: "/chat" as const },
  { emoji: "🌙", title: "Dark mode", desc: "Comfortable studying day and night, with themes that follow the season.", cta: "Try it", to: "/dashboard" as const },
  { emoji: "🖼️", title: "Photo of your notes", desc: "Snap your textbook or handwriting and Nextudy reads it for you — printed or handwritten.", cta: "Try it", to: "/chat" as const },
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
                      <h2 className="font-display font-bold text-lg sm:text-xl flex items-center gap-2">
                        {it.title}
                      </h2>
                      <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{it.desc}</p>
                      <div className="mt-4">
                        <Button variant="hero" size="sm" asChild>
                          <Link to={it.to}>{it.cta} →</Link>
                        </Button>
                      </div>

                    </div>
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
