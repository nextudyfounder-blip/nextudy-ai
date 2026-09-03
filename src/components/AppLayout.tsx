import { ReactNode, useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/hooks/useGuest";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { PenLoader } from "@/components/PenLoader";
import { PreferredNameDialog } from "@/components/PreferredNameDialog";
import { RealmSwitcher } from "@/components/RealmSwitcher";
import { SeasonBadge } from "@/components/SeasonTheme";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, Sparkles, MoreVertical, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  title?: string;
  hideSidebar?: boolean;
}

export function AppLayout({ children, title, hideSidebar = false }: Props) {
  const { user, loading } = useAuth();
  const guest = useGuest();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user && !guest) navigate({ to: "/auth" });
  }, [user, guest, loading, navigate]);

  if (loading || (!user && !guest)) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <PenLoader label="Securing your passport…" size="lg" />
      </div>
    );
  }

  const shareConversation = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const inner = (
    <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
      {!hideSidebar && <AppSidebar />}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-14 flex items-center gap-2 px-3 sm:px-4 sticky top-0 z-20 border-b border-border/60 bg-background">
          {!hideSidebar && <SidebarTrigger />}
          <Button variant="ghost" size="sm" asChild className="gap-1.5">
            <Link to="/"><Home className="h-4 w-4" /><span className="hidden sm:inline">Home</span></Link>
          </Button>
          {title && <h1 className="font-display font-semibold truncate ml-1">{title}</h1>}
          <div className="ml-auto flex items-center gap-1.5">
            <SeasonBadge />
            <RealmSwitcher />
            <Button
              size="sm"
              onClick={() => navigate({ to: "/subscriptions" })}
              className="bg-gradient-accent text-white hover:opacity-90 gap-1.5"
              title="Upgrade to Pro"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground transition"
                  title="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={shareConversation}>
                  <Share2 className="h-3.5 w-3.5 mr-2" /> Share conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 min-w-0 overflow-x-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );

  const withDialog = (
    <>
      {inner}
      {user && <PreferredNameDialog />}
    </>
  );

  if (hideSidebar) return withDialog;
  return <SidebarProvider>{withDialog}</SidebarProvider>;
}
