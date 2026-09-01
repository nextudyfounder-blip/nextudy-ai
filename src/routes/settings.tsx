import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, ArrowLeft, Sun, Moon, Monitor, Trash2, Mountain, Gem, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { CancelSubscription } from "@/components/CancelSubscription";
import { checkPreferredName } from "@/lib/profanity";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/hooks/useGuest";
import { REALM_META, useRealm, type Realm } from "@/lib/realm";
import { REFERRAL_NOTE, normalizePlan, type PlanId } from "@/lib/plans";
import {
  applyHolidayTheme, getActiveEvent, holidayThemeEnabled, setHolidayThemeEnabled,
} from "@/lib/holidays";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Nextudy" }] }),
});

type Theme = "light" | "dark" | "system";
type EduLevel = "high_school" | "college" | "university" | "professional";
type ResponseStyle = "creative" | "standard" | "concise";

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

function SettingsPage() {
  const { user } = useAuth();
  const guest = useGuest();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>("system");
  const [edu, setEdu] = useState<EduLevel>("university");
  const [style, setStyle] = useState<ResponseStyle>("standard");
  const [clearing, setClearing] = useState(false);
  const [plan, setPlan] = useState<PlanId>("basic");
  const [holidayOn, setHolidayOn] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const activeEventLabel = getActiveEvent()?.label ?? null;
  const { realm, switchRealm, transition } = useRealm();

  useEffect(() => {
    const stored = (localStorage.getItem("nextudy-theme") as Theme | null) ?? "system";
    setTheme(stored);
    setEdu((localStorage.getItem("nextudy-edu") as EduLevel | null) ?? "university");
    setStyle((localStorage.getItem("nextudy-style") as ResponseStyle | null) ?? "standard");
    setHolidayOn(holidayThemeEnabled());
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setPlan(normalizePlan(data?.plan));
        setDisplayName(data?.display_name ?? "");
      });
  }, [user]);

  const updateHoliday = (v: boolean) => {
    setHolidayOn(v);
    setHolidayThemeEnabled(v);
    applyHolidayTheme();
  };


  const updateTheme = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("nextudy-theme", t);
    applyTheme(t);
  };
  const updateEdu = (v: EduLevel) => { setEdu(v); localStorage.setItem("nextudy-edu", v); toast.success("Preference saved"); };
  const updateStyle = (v: ResponseStyle) => { setStyle(v); localStorage.setItem("nextudy-style", v); toast.success("Preference saved"); };

  const saveName = async () => {
    if (!user) return;
    const verdict = checkPreferredName(displayName);
    if (verdict.blocked) {
      toast.error(verdict.reason ?? "Please choose another name");
      return;
    }
    setSavingName(true);
    const { error } = await supabase
      .from("profiles").update({ display_name: displayName.trim() }).eq("id", user.id);
    setSavingName(false);
    toast[error ? "error" : "success"](error ? "Could not save name" : "Name saved");
  };

  const clearHistory = async () => {
    if (guest || !user) {
      toast.error("Sign in to manage chat history");
      return;
    }
    setClearing(true);
    try {
      const { error: msgErr } = await supabase.from("chat_messages").delete().eq("user_id", user.id);
      if (msgErr) throw msgErr;
      const { error: convErr } = await supabase.from("conversations").delete().eq("user_id", user.id);
      if (convErr) throw convErr;
      toast.success("Chat history cleared");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear history");
    } finally {
      setClearing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <span className="h-8 w-8 rounded-xl overflow-hidden bg-gradient-accent shadow-glow flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            Nextudy
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: guest ? "/chat" : "/dashboard" })}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Personalize Nextudy to fit how you study.</p>
        </div>

        {/* Theme */}
        <section className="space-y-3">
          <Label className="text-base">Appearance</Label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: "light", icon: Sun, label: "Light" },
              { v: "dark", icon: Moon, label: "Dark" },
              { v: "system", icon: Monitor, label: "System" },
            ] as const).map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                onClick={() => updateTheme(v)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                  theme === v ? "border-accent bg-accent/10" : "border-border hover:bg-muted/40"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Education level */}
        <section className="space-y-3">
          <Label className="text-base">Target education level</Label>
          <p className="text-xs text-muted-foreground">Nextudy tailors answer complexity to your level.</p>
          <Select value={edu} onValueChange={(v) => updateEdu(v as EduLevel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high_school">High school</SelectItem>
              <SelectItem value="college">College</SelectItem>
              <SelectItem value="university">University</SelectItem>
              <SelectItem value="professional">Professional / Postgrad</SelectItem>
            </SelectContent>
          </Select>
        </section>

        {/* Response style */}
        <section className="space-y-3">
          <Label className="text-base">AI response style</Label>
          <Select value={style} onValueChange={(v) => updateStyle(v as ResponseStyle)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="creative">Creative / Detailed</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="concise">Concise / Quick summaries</SelectItem>
            </SelectContent>
          </Select>
        </section>

        {/* Preferred name */}
        <section className="space-y-3">
          <Label className="text-base">How the AI calls you</Label>
          <p className="text-xs text-muted-foreground">Nextudy uses this name in greetings and answers.</p>
          <div className="flex gap-2">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your preferred name"
              maxLength={32}
              disabled={!user}
            />
            <Button onClick={saveName} disabled={savingName || !user}>
              {savingName ? "Saving…" : "Save"}
            </Button>
          </div>
        </section>

        {/* Subscription */}
        {plan !== "basic" && (
          <section className="space-y-3">
            <Label className="text-base">Subscription</Label>
            <p className="text-xs text-muted-foreground">
              Cancelling stops auto-renewal. You keep full {plan === "turbo" ? "Turbo" : "Pro"} access until
              your paid period ends, then your account switches to the free Basic plan.
            </p>
            <CancelSubscription />
          </section>
        )}

        {/* Chat history */}
        <section className="space-y-3">
          <Label className="text-base">Chat history</Label>
          <p className="text-xs text-muted-foreground">Permanently delete all your conversations.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={clearing || guest || !user}>
                <Trash2 className="h-4 w-4 mr-2" />
                {clearing ? "Clearing…" : "Clear all chat history"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all chat history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove every conversation and message tied to your account. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearHistory}>Yes, delete everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {guest && <p className="text-xs text-muted-foreground">Guest sessions aren't saved, so there's nothing to clear.</p>}
        </section>

        {/* Realm selection */}
        <section className="space-y-3">
          <div>
            <Label className="text-base">Active realm</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Travel between the Vanguard peak and the Mentor cavern. The whole app follows the realm's palette and 1px accent borders.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["vanguard", "mentor"] as Realm[]).map((id) => {
              const meta = REALM_META[id];
              const Icon = id === "vanguard" ? Mountain : Gem;
              const active = realm === id;
              return (
                <button
                  key={id}
                  disabled={transition !== null}
                  onClick={() => switchRealm(id)}
                  className={`rounded-xl border p-3 text-left transition disabled:opacity-60 ${
                    active ? "realm-border-strong bg-accent/10" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium text-sm">
                    <Icon className="h-4 w-4 text-realm" /> {meta.name}
                    {active && <span className="ml-auto text-[10px] uppercase tracking-wide text-realm">Active</span>}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-1">{meta.hub} · {meta.place}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{meta.blurb}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Holiday themes */}
        <section className="flex items-center justify-between">
          <div>
            <Label className="text-base flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-accent" /> Holiday themes
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              {activeEventLabel
                ? `${activeEventLabel} theme is active right now.`
                : "Automatically applied during global holidays and events."}
            </p>
          </div>
          <Switch checked={holidayOn} onCheckedChange={updateHoliday} />
        </section>

        {/* Referral */}
        <section className="rounded-xl border border-accent/30 bg-gradient-accent/10 p-4">
          <p className="text-sm font-medium text-accent">{REFERRAL_NOTE}</p>
        </section>


        {/* Legal */}
        <section className="pt-6 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="/terms" className="hover:text-foreground transition">Terms</a>
            <span>·</span>
            <a href="/privacy" className="hover:text-foreground transition">Privacy</a>
            <span>·</span>
            <span>Nextudy can make mistakes. Double-check important facts.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
