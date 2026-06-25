import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="bg-background text-foreground border-t border-border py-16 transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 font-display font-bold text-xl">
            <span className="h-8 w-8 rounded-xl overflow-hidden bg-gradient-accent grid place-items-center">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            Nextudy
          </div>
          <p className="text-sm text-muted-foreground">Study less. Know more.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
            <a href="https://instagram.com/nextudy.app" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">@nextudy.app</a>
            <Link to="/whats-new" className="hover:text-foreground transition-colors">What's new</Link>
            <Link to="/feedback" className="hover:text-foreground transition-colors">Feedback</Link>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Nextudy. Study less. Know more.
        </div>
      </div>
    </footer>
  );
}
