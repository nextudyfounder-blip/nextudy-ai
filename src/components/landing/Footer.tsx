import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 font-display font-bold text-xl">
            <span className="h-8 w-8 rounded-lg bg-gradient-accent grid place-items-center">
              <Sparkles className="h-4 w-4" />
            </span>
            Nextudy
          </div>
          <p className="text-sm text-primary-foreground/60">Study less. Know more.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-primary-foreground/70">
            <a href="https://instagram.com/nextudy.app" target="_blank" rel="noopener noreferrer" className="hover:text-primary-foreground transition-colors">@nextudy.app</a>
            <Link to="/whats-new" className="hover:text-primary-foreground transition-colors">What's new</Link>
            <Link to="/feedback" className="hover:text-primary-foreground transition-colors">Feedback</Link>
            <a href="#" className="hover:text-primary-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary-foreground transition-colors">Terms</a>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-white/10 text-center text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} Nextudy. Study less. Know more.
        </div>
      </div>
    </footer>
  );
}
