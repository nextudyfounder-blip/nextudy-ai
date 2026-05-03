import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Nextudy" }] }),
});

interface Profile {
  display_name: string | null;
  plan: string;
  uploads_this_month: number;
}

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, plan, uploads_this_month")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <span className="h-8 w-8 rounded-lg bg-gradient-accent shadow-glow flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            Nextudy
          </Link>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate({ to: "/" }); }}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-display font-bold">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ""} 👋
        </h1>
        <p className="text-muted-foreground mt-2">Your Nextudy workspace is ready.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="text-2xl font-display font-bold capitalize mt-1">{profile?.plan ?? "free"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Uploads this month</p>
            <p className="text-2xl font-display font-bold mt-1">{profile?.uploads_this_month ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm font-medium mt-1 truncate">{user.email}</p>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">PDF upload, summaries, flashcards & more — coming next.</p>
        </div>
      </div>
    </main>
  );
}
