import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Avatar } from "@/components/Avatar";
import { AVATAR_STYLES, randomSeed } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Coins, Shuffle, Check, Lock, FileText, MessageSquare, Gamepad2, Flame } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [
    { title: "Your profile — Nextudy" },
    { name: "description", content: "Customize your avatar, track Study Coins, and view your stats." },
  ] }),
});

interface ProfileRow {
  display_name: string | null;
  study_coins: number;
  avatar_seed: string | null;
  avatar_style: string;
  owned_avatar_styles: string[];
  uploads_this_month: number;
}

function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [seed, setSeed] = useState("");
  const [style, setStyle] = useState("adventurer");
  const [stats, setStats] = useState({ uploads: 0, chats: 0, gamesPlayed: 0 });

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, study_coins, avatar_seed, avatar_style, owned_avatar_styles, uploads_this_month")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        const p = data as ProfileRow;
        setProfile(p);
        setDisplayName(p.display_name ?? "");
        setSeed(p.avatar_seed ?? user.id.slice(0, 8));
        setStyle(p.avatar_style ?? "adventurer");
      }
      const [{ count: uploads }, { count: chats }, { data: scores }] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("role", "user"),
        supabase.from("game_scores").select("score").eq("user_id", user.id),
      ]);
      if (active) {
        setStats({
          uploads: uploads ?? 0,
          chats: chats ?? 0,
          gamesPlayed: scores?.length ?? 0,
        });
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const owned = new Set(profile?.owned_avatar_styles ?? ["adventurer"]);

  const saveAvatar = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_seed: seed, avatar_style: style, display_name: displayName || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error("Could not save profile");
    toast.success("Profile saved");
    setProfile((p) => p ? { ...p, avatar_seed: seed, avatar_style: style, display_name: displayName || null } : p);
  };

  const buyStyle = async (id: string, price: number) => {
    if (!user || !profile) return;
    if (profile.study_coins < price) return toast.error("Not enough Study Coins");
    const nextOwned = Array.from(new Set([...(profile.owned_avatar_styles ?? []), id]));
    const nextCoins = profile.study_coins - price;
    const { error } = await supabase
      .from("profiles")
      .update({ owned_avatar_styles: nextOwned, study_coins: nextCoins })
      .eq("id", user.id);
    if (error) return toast.error("Purchase failed");
    setProfile({ ...profile, owned_avatar_styles: nextOwned, study_coins: nextCoins });
    toast.success("Style unlocked!");
  };

  return (
    <AppLayout title="Profile">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="text-muted-foreground animate-pulse">Loading…</div>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-col sm:flex-row items-center gap-6 p-6">
                <Avatar style={style} seed={seed} size={112} className="ring-4 ring-primary/30" />
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="font-display text-2xl font-bold">{displayName || user?.email}</h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold">{profile?.study_coins ?? 0}</span>
                    <span className="text-xs text-muted-foreground">Study Coins</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="builder">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="builder">Avatar</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="shop">Shop</TabsTrigger>
              </TabsList>

              <TabsContent value="builder" className="space-y-4 mt-4">
                <Card>
                  <CardHeader><CardTitle>Avatar builder</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Display name</Label>
                        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Seed (changes how you look)</Label>
                        <div className="flex gap-2">
                          <Input value={seed} onChange={(e) => setSeed(e.target.value)} />
                          <Button type="button" variant="outline" size="icon" onClick={() => setSeed(randomSeed())} title="Random">
                            <Shuffle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Style (owned)</Label>
                      <div className="flex flex-wrap gap-3">
                        {AVATAR_STYLES.filter((s) => owned.has(s.id)).map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setStyle(s.id)}
                            className={`p-2 rounded-xl border-2 transition ${style === s.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                          >
                            <Avatar style={s.id} seed={seed} size={56} />
                            <p className="text-xs mt-1 font-medium">{s.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button onClick={saveAvatar} disabled={saving} className="w-full sm:w-auto">
                      {saving ? "Saving…" : "Save avatar"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stats" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard icon={FileText} label="Uploads" value={stats.uploads} />
                  <StatCard icon={MessageSquare} label="Chats sent" value={stats.chats} />
                  <StatCard icon={Gamepad2} label="Games played" value={stats.gamesPlayed} />
                  <StatCard icon={Flame} label="This month" value={profile?.uploads_this_month ?? 0} />
                </div>
              </TabsContent>

              <TabsContent value="shop" className="space-y-4 mt-4">
                <Card>
                  <CardHeader><CardTitle>Avatar shop</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {AVATAR_STYLES.map((s) => {
                        const isOwned = owned.has(s.id);
                        const canAfford = (profile?.study_coins ?? 0) >= s.price;
                        return (
                          <div key={s.id} className="rounded-xl border border-border p-3 flex flex-col items-center text-center bg-card">
                            <Avatar style={s.id} seed={seed} size={64} />
                            <p className="text-sm font-medium mt-2">{s.name}</p>
                            {isOwned ? (
                              <span className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-500"><Check className="h-3 w-3" /> Owned</span>
                            ) : (
                              <Button
                                size="sm"
                                variant={canAfford ? "default" : "outline"}
                                disabled={!canAfford}
                                onClick={() => buyStyle(s.id, s.price)}
                                className="mt-2 gap-1"
                              >
                                {canAfford ? <Coins className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                {s.price}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
