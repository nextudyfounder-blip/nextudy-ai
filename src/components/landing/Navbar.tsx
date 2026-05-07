import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <span className="h-8 w-8 rounded-lg bg-gradient-accent shadow-glow flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          Nextudy
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-smooth">How it works</a>
          <a href="#features" className="hover:text-foreground transition-smooth">Features</a>
          <a href="#pricing" className="hover:text-foreground transition-smooth">Pricing</a>
          <Link to="/feedback" className="hover:text-foreground transition-smooth">Feedback</Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Button variant="hero" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                <Link to="/auth">Log in</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
