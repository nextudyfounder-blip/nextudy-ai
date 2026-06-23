import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, FileText, Bot, Layers, Network, BarChart3, Timer, Sparkle, MessageSquare, Settings, LogOut, User as UserIcon } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

type Item = { title: string; url: string; icon: typeof FileText; emoji: string; soon?: boolean };
const items: Item[] = [
  { title: "Upload & Summarize", url: "/dashboard", icon: FileText, emoji: "📄" },
  { title: "AI Chatbot", url: "/chat", icon: Bot, emoji: "🤖" },
  { title: "Profile", url: "/profile", icon: UserIcon, emoji: "👤" },
  { title: "Flashcards", url: "/flashcards", icon: Layers, emoji: "🃏", soon: true },
  { title: "Mindmap", url: "/mindmap", icon: Network, emoji: "🗺️", soon: true },
  { title: "Progress", url: "/progress", icon: BarChart3, emoji: "📊", soon: true },
  { title: "Pomodoro Timer", url: "/pomodoro", icon: Timer, emoji: "⏱️", soon: true },
  { title: "What's New", url: "/whats-new", icon: Sparkle, emoji: "🆕" },
  { title: "Feedback", url: "/feedback", icon: MessageSquare, emoji: "💬" },
  { title: "Settings", url: "/settings", icon: Settings, emoji: "⚙️", soon: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<{ style: string; seed: string | null }>({ style: "adventurer", seed: null });

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("avatar_style, avatar_seed").eq("id", user.id).maybeSingle();
      if (active && data) {
        setAvatar({ style: data.avatar_style ?? "adventurer", seed: data.avatar_seed });
      }
    };
    load();
    const ch = supabase
      .channel(`profile-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          if (!active) return;
          const row = payload.new as { avatar_style?: string; avatar_seed?: string | null };
          setAvatar({ style: row.avatar_style ?? "adventurer", seed: row.avatar_seed ?? null });
        })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2 font-display font-bold">
          <span className="h-8 w-8 rounded-lg bg-gradient-accent shadow-glow flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          {!collapsed && <span>Nextudy</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = path === item.url;
                const disabled = item.soon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild={!disabled} isActive={isActive} disabled={disabled} tooltip={item.title}>
                      {disabled ? (
                        <div className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span className="flex-1">{item.title}</span>}
                          {!collapsed && <span className="text-[10px] uppercase text-muted-foreground">soon</span>}
                        </div>
                      ) : (
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {user && !collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/40 mb-1">
            <Link to="/profile" className="shrink-0">
              <Avatar style={avatar.style} seed={avatar.seed ?? user.id.slice(0, 8)} size={28} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{user.user_metadata?.display_name || user.email}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
