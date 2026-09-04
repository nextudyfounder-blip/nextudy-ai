import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sparkles, FileText, BookMarked, Bot, Mountain, HelpCircle, Megaphone,
  MessageSquare, Keyboard, Layers, CalendarDays, LogOut, User as UserIcon,
  Settings, Flame, ChevronDown, PartyPopper,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGuest, setGuest } from "@/hooks/useGuest";
import { supabase } from "@/integrations/supabase/client";
import { useRealm } from "@/lib/realm";
import { holidayThemeEnabled, setHolidayThemeEnabled, applyHolidayTheme } from "@/lib/holidays";
import {
  KeyboardShortcutsDialog, useIsTouchDevice,
} from "@/components/KeyboardShortcutsDialog";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

type NavItem = { title: string; url: string; icon: typeof FileText; guestOk?: boolean };

const NAV: NavItem[] = [
  { title: "Upload & Summarize", url: "/dashboard", icon: FileText },
  { title: "Saved Library", url: "/library", icon: BookMarked },
  { title: "How It Works", url: "/how-it-works", icon: HelpCircle, guestOk: true },
  { title: "What's New", url: "/whats-new", icon: Megaphone, guestOk: true },
  { title: "Feedback", url: "/feedback", icon: MessageSquare, guestOk: true },
];

const SOON = [
  { title: "Flashcards & Quizzes", icon: Layers },
  { title: "Calendar & Deadlines", icon: CalendarDays },
];

/** Consecutive days (ending today or yesterday) with recorded activity. */
function computeStreak(days: string[]): number {
  const set = new Set(days);
  const day = (offset: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  let start = set.has(day(0)) ? 0 : set.has(day(1)) ? 1 : -1;
  if (start === -1) return 0;
  let streak = 0;
  while (set.has(day(start + streak))) streak += 1;
  return streak;
}

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user } = useAuth();
  const guest = useGuest();
  const navigate = useNavigate();
  const { realm, switchRealm } = useRealm();
  const isTouch = useIsTouchDevice();

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [seasonOn, setSeasonOn] = useState(true);
  const [streak, setStreak] = useState(0);
  const [avatar, setAvatar] = useState<{ style: string; seed: string | null }>({ style: "adventurer", seed: null });
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => setSeasonOn(holidayThemeEnabled()), []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [profile, usage] = await Promise.all([
        supabase.from("profiles").select("avatar_style, avatar_seed, display_name").eq("id", user.id).maybeSingle(),
        supabase.from("usage_daily").select("day").eq("user_id", user.id).order("day", { ascending: false }).limit(120),
      ]);
      if (!active) return;
      if (profile.data) {
        setAvatar({ style: profile.data.avatar_style ?? "adventurer", seed: profile.data.avatar_seed });
        setDisplayName(profile.data.display_name ?? null);
      }
      setStreak(computeStreak((usage.data ?? []).map((r) => String(r.day).slice(0, 10))));
    })();
    return () => { active = false; };
  }, [user]);

  const openHub = useCallback((next: "mentor" | "vanguard") => {
    if (realm !== next) switchRealm(next);
    navigate({ to: "/chat" });
  }, [realm, switchRealm, navigate]);

  // Cmd/Ctrl+K switches hubs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        switchRealm(realm === "mentor" ? "vanguard" : "mentor");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [realm, switchRealm]);

  const updateSeason = (v: boolean) => {
    setSeasonOn(v);
    setHolidayThemeEnabled(v);
    applyHolidayTheme();
  };

  const handleSignOut = async () => {
    if (guest) setGuest(false);
    await signOut();
    navigate({ to: "/" });
  };

  const items = guest ? NAV.filter((i) => i.guestOk) : NAV;

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
              {!guest && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path === "/dashboard"} tooltip="Upload & Summarize">
                    <Link to="/dashboard" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /><span>Upload & Summarize</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => openHub("mentor")}
                  isActive={path === "/chat" && realm === "mentor"}
                  tooltip="Mentor — Study Hub"
                >
                  <Bot className="h-4 w-4" /><span>Mentor <span className="text-muted-foreground text-xs">· Study</span></span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => openHub("vanguard")}
                  isActive={path === "/chat" && realm === "vanguard"}
                  tooltip="Vanguard — Business Hub"
                >
                  <Mountain className="h-4 w-4" /><span>Vanguard <span className="text-muted-foreground text-xs">· Business</span></span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {items.filter((i) => i.url !== "/dashboard").map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={path === item.url} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" /><span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {!isTouch && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setShortcutsOpen(true)} tooltip="Keyboard shortcuts">
                    <Keyboard className="h-4 w-4" /><span>Keyboard Shortcuts</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Coming soon</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SOON.map(({ title, icon: Icon }) => (
                <SidebarMenuItem key={title}>
                  <SidebarMenuButton disabled aria-disabled className="opacity-60 cursor-not-allowed">
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 truncate">{title}</span>
                    <span className="text-[10px] rounded-full border border-border px-1.5 py-0.5 text-muted-foreground">Soon</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-lg border border-border/70">
          <button
            onClick={() => setAccountOpen((v) => !v)}
            className="w-full flex items-center gap-2 p-2 text-left"
          >
            {user ? (
              <Avatar style={avatar.style} seed={avatar.seed ?? user.id.slice(0, 8)} size={28} />
            ) : (
              <span className="h-7 w-7 rounded-full bg-muted grid place-items-center shrink-0">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium truncate">
                {guest ? "Guest" : displayName || user?.user_metadata?.["display_name"] || user?.email?.split("@")[0]}
              </span>
              <span className="block text-[10px] text-muted-foreground">Profile & Settings</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${accountOpen ? "rotate-180" : ""}`} />
          </button>

          {accountOpen && (
            <div className="border-t border-border/70 p-2 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Flame className="h-3.5 w-3.5 text-realm" />
                <span className="flex-1 text-muted-foreground">Activity streak</span>
                <span className="font-medium">{streak} {streak === 1 ? "day" : "days"}</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <PartyPopper className="h-3.5 w-3.5 text-realm" />
                <span className="flex-1 text-muted-foreground">Seasonal themes</span>
                <Switch checked={seasonOn} onCheckedChange={updateSeason} />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {!guest && (
                  <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => navigate({ to: "/profile" })}>
                    <UserIcon className="h-3.5 w-3.5 mr-1.5" />Profile
                  </Button>
                )}
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => navigate({ to: "/settings" })}>
                  <Settings className="h-3.5 w-3.5 mr-1.5" />Settings
                </Button>
              </div>

              <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={handleSignOut}>
                <LogOut className="h-3.5 w-3.5 mr-1.5" />Log out
              </Button>
            </div>
          )}
        </div>
      </SidebarFooter>

      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </Sidebar>
  );
}
