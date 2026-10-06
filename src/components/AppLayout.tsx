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
import { Home, Settings, MoreVertical, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { claimReferral } from "@/lib/billing.functions";

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

  const claimFn = useServerFn(claimReferral);
  useEffect(() => {
    if (!user) return;
    const code = localStorage.getItem("nextudy-ref");
    if (!code) return;
    localStorage.removeItem("nextudy-ref");
    // Only brand-new accounts can be credited as a referral.
    if (Date.now() - new Date(user.created_at).getTime() > 3 * 86_400_000) return;
    void claimFn({ data: { code } }).catch(() => undefined);
  }, [user, claimFn]);

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
          <Button variant="ghost" size="sm" asChild className="gap-1.5 hidden md:inline-flex">
            <Link to="/"><Home className="h-4 w-4" /><span className="hidden lg:inline">Home</span></Link>
          </Button>
          <RealmSwitcher />
          {title && <h1 className="font-display font-semibold truncate ml-1">{title}</h1>}
          <div className="ml-auto flex items-center gap-1.5">
            <SeasonBadge />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => navigate({ to: "/settings" })} title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <button
              onClick={() => navigate({ to: user ? "/profile" : "/auth" })}
              className="h-8 w-8 rounded-full bg-gradient-accent grid place-items-center text-[11px] font-semibold text-primary-foreground"
              title="Profile"
            >
              {(user?.email ?? "G").slice(0, 1).toUpperCase()}
            </button>
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
