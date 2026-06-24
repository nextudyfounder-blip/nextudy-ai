import { ReactNode, useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/hooks/useGuest";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Home, Sparkles } from "lucide-react";

interface Props { children: ReactNode; title?: string }

export function AppLayout({ children, title }: Props) {
  const { user, loading } = useAuth();
  const guest = useGuest();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user && !guest) navigate({ to: "/auth" });
  }, [user, guest, loading, navigate]);

  if (loading || (!user && !guest)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 animate-fade-in">
          <header className="h-14 flex items-center gap-2 border-b border-border px-3 sm:px-4 sticky top-0 bg-background/80 backdrop-blur z-10">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link to="/"><Home className="h-4 w-4" /><span className="hidden sm:inline">Home</span></Link>
            </Button>
            {title && <h1 className="font-display font-semibold truncate ml-1">{title}</h1>}
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => navigate({ to: "/", hash: "pricing" })}
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:opacity-90 shadow-glow gap-1.5"
                title="Upgrade to Pro"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
