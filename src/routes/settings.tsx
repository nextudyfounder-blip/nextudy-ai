import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, ArrowLeft, Sun, Moon, Monitor, Trash2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  LED_PRESETS, readLedSettings, setLedSettings, type LedPresetId,
} from "@/components/chat/LedFrame";

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
  const [ledEnabled, setLedEnabled] = useState(true);
  const [ledPreset, setLedPreset] = useState<LedPresetId>("rainbow-wave");

  useEffect(() => {
    const stored = (localStorage.getItem("nextudy-theme") as Theme | null) ?? "system";
    setTheme(stored);
    setEdu((localStorage.getItem("nextudy-edu") as EduLevel | null) ?? "university");
    setStyle((localStorage.getItem("nextudy-style") as ResponseStyle | null) ?? "standard");
    const led = readLedSettings();
    setLedEnabled(led.enabled);
    setLedPreset(led.preset);
  }, []);

  const updateLedEnabled = (v: boolean) => { setLedEnabled(v); setLedSettings({ enabled: v }); };
  const updateLedPreset = (v: LedPresetId) => { setLedPreset(v); setLedSettings({ preset: v }); };

  const updateTheme = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("nextudy-theme", t);
    applyTheme(t);
  };
  const updateEdu = (v: EduLevel) => { setEdu(v); localStorage.setItem("nextudy-edu", v); toast.success("Preference saved"); };
  const updateStyle = (v: ResponseStyle) => { setStyle(v); localStorage.setItem("nextudy-style", v); toast.success("Preference saved"); };

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
      </div>
    </main>
  );
}
