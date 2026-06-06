import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/nextudy-logo.png";

export function Navbar() {
  const { user } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isLanding = path === "/";

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60 animate-fade-in">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg group">
          <img src={logo} alt="Nextudy" className="h-9 w-auto transition-transform duration-200 group-hover:scale-105" />
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          {!isLanding && (
            <Link to="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Home className="h-4 w-4" /> Home
            </Link>
          )}
          {isLanding && (
            <>
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            </>
          )}
          <Link to="/whats-new" className="hover:text-foreground transition-colors">What's new</Link>
          <Link to="/feedback" className="hover:text-foreground transition-colors">Feedback</Link>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/chat">Chat</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            </>
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
