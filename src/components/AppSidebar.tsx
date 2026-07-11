import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Sparkles, FileText, Bot, LogOut, User as UserIcon, RefreshCw, Settings } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGuest, setGuest } from "@/hooks/useGuest";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

type Item = { title: string; url: string; icon: typeof FileText };
const items: Item[] = [
  { title: "Upload & Summarize", url: "/dashboard", icon: FileText },
  { title: "AI Chatbot", url: "/chat", icon: Bot },
  { title: "Profile", url: "/profile", icon: UserIcon },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user } = useAuth();
  const guest = useGuest();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<{ style: string; seed: string | null }>({ style: "adventurer", seed: null });
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("avatar_style, avatar_seed, display_name").eq("id", user.id).maybeSingle();
      if (active && data) {
        setAvatar({ style: data.avatar_style ?? "adventurer", seed: data.avatar_seed });
        setDisplayName(data.display_name ?? null);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const handleSignOut = async () => {
    if (guest) setGuest(false);
    await signOut();
    navigate({ to: "/" });
  };

  const handleSwitchAccount = async () => {
    if (guest) setGuest(false);
    await signOut();
    navigate({ to: "/auth" });
  };

  const visibleItems = guest
    ? items.filter((i) => i.url === "/chat" || i.url === "/crews")
    : items;

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <Link to={guest ? "/chat" : "/dashboard"} className="flex items-center gap-2.5 px-2 py-2 font-display font-bold">
          <span className="h-9 w-9 rounded-xl overflow-hidden bg-gradient-accent shadow-glow grid place-items-center shrink-0">
            <Sparkles className="h-[18px] w-[18px] text-white" />
          </span>
          <span>Nextudy</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive = path === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {guest ? (
          !collapsed && (
            <div className="flex items-center gap-2 p-2">
              <div className="h-8 w-8 rounded-full bg-muted grid place-items-center shrink-0">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">Guest</p>
                <button onClick={() => { setGuest(false); navigate({ to: "/auth" }); }} className="text-[10px] text-primary hover:underline">
                  Sign up to save
                </button>
              </div>
              <button onClick={() => navigate({ to: "/settings" })} className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground" title="Settings">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          )
        ) : (
          user && !collapsed && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <button
                onClick={() => navigate({ to: "/profile" })}
                className="flex items-center gap-2 min-w-0 flex-1 text-left"
                title="Profile"
              >
                <Avatar style={avatar.style} seed={avatar.seed ?? user.id.slice(0, 8)} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{displayName || user.user_metadata?.display_name || user.email?.split("@")[0]}</p>
                </div>
              </button>
              <button
                onClick={() => navigate({ to: "/settings" })}
                className="p-1.5 rounded-md hover:bg-accent/60 text-muted-foreground shrink-0"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={handleSwitchAccount}
                className="p-1.5 rounded-md hover:bg-accent/60 text-muted-foreground shrink-0"
                title="Switch account"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          )
        )}
        {(collapsed || (!user && !guest)) && (
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start">
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign out</span>}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
