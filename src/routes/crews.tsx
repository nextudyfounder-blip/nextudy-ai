import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PaywallOverlay } from "@/components/PaywallOverlay";
import {
  Users, UserPlus, Mail, CheckCircle2, Clock, CreditCard, Crown,
  Loader2, Copy, Sparkles, Zap,
} from "lucide-react";
import { PenLoader } from "@/components/PenLoader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/crews")({
  component: CrewsPage,
  head: () => ({
    meta: [
      { title: "Study Crews — Nextudy" },
      { name: "description", content: "Collaborate with your study crew. Invite members, split the bill, share knowledge." },
    ],
  }),
});

type Invite = {
  id: string;
  owner_id: string;
  invitee_email: string;
  tier: "teams" | "turbo";
  billing_strategy: "owner-pays" | "split-bill";
  status: "pending" | "active" | "declined" | "cancelled";
  stripe_checkout_url: string | null;
  accepted_at: string | null;
  created_at: string;
};

type Tier = "teams" | "turbo";
type Strategy = "split-bill" | "owner-pays";

function CrewsPage() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [pendingSeat, setPendingSeat] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    // Members my crew: rows I own
    const { data: mine } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setInvites((mine as Invite[]) || []);
    // Am I an invitee with a pending seat?
    if (user.email) {
      const { data: mySeat } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("invitee_email", user.email)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setPendingSeat((mySeat as Invite | null) ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  const active = useMemo(() => invites.filter(i => i.status === "active"), [invites]);
  const pending = useMemo(() => invites.filter(i => i.status === "pending"), [invites]);

  return (
    <AppLayout title="Study Crews">
      <div className="relative min-h-[calc(100vh-3.5rem)]">
        {pendingSeat && (
          <PaywallOverlay
            title="Your crew is waiting for you!"
            message="Activate your seat to unlock this Study Crew's shared knowledge base."
            checkoutUrl={pendingSeat.stripe_checkout_url}
          />
        )}

        <div className="grid lg:grid-cols-[340px_1fr] min-h-[calc(100vh-3.5rem)]">
          {/* LEFT — WhatsApp-style member list */}
          <aside className="border-r border-border bg-muted/20 flex flex-col animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-display font-bold truncate">My Crew</h2>
                <p className="text-xs text-muted-foreground truncate">
                  {active.length} active · {pending.length} pending
                </p>
              </div>
              <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5 shrink-0">
                <UserPlus className="h-3.5 w-3.5" /> Invite
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* Owner row */}
              {user && (
                <MemberRow
                  email={user.email ?? "You"}
                  role="Owner"
                  status="active"
                  isOwner
                />
              )}
              {loading && (
                <div className="p-6 flex justify-center">
                  <PenLoader size="sm" inline label="Loading crew…" />
                </div>
              )}
              {!loading && invites.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No members yet. Invite your first study buddy!
                </div>
              )}
              {invites.map((inv, idx) => (
                <div
                  key={inv.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
                >
                  <MemberRow
                    email={inv.invitee_email}
                    role={inv.tier === "turbo" ? "Turbo seat" : "Teams seat"}
                    status={inv.status}
                    strategy={inv.billing_strategy}
                    checkoutUrl={inv.stripe_checkout_url}
                  />
                </div>
              ))}
            </div>
          </aside>

          {/* RIGHT — Crew workspace / info */}
          <section className="p-6 md:p-10 space-y-6 animate-fade-in">
            <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-glow">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-display font-black">Your Study Crew</h1>
                  <p className="text-sm text-muted-foreground truncate">
                    Shared summaries, collaborative flashcards, and group chats.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setInviteOpen(true)}
                className="gap-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-glow"
              >
                <UserPlus className="h-4 w-4" /> Invite member
              </Button>
            </header>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Active members" value={active.length + 1} tone="emerald" />
              <StatCard icon={<Clock className="h-4 w-4" />} label="Pending invites" value={pending.length} tone="amber" />
              <StatCard icon={<CreditCard className="h-4 w-4" />} label="Split-bill share" value={pending.filter(i => i.billing_strategy === "split-bill").length} tone="violet" />
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> How Study Crews work
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                <li>Invite up to 5 friends per crew.</li>
                <li>Choose <strong>Split-Bill</strong> — each member pays their own seat via Stripe.</li>
                <li>Or <strong>Owner-Pays</strong> — you cover everyone and they get instant access.</li>
                <li>Everyone shares uploads, summaries, and AI chats within the crew.</li>
              </ul>
            </div>
          </section>
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSent={() => { setInviteOpen(false); refresh(); }}
      />
    </AppLayout>
  );
}

/* ---------------- Member Row ---------------- */
function MemberRow({
  email, role, status, strategy, isOwner, checkoutUrl,
}: {
  email: string; role: string;
  status: "pending" | "active" | "declined" | "cancelled";
  strategy?: Strategy;
  isOwner?: boolean;
  checkoutUrl?: string | null;
}) {
  const initials = (email || "?").slice(0, 2).toUpperCase();
  const dotClass =
    status === "active" ? "bg-emerald-500"
    : status === "pending" ? "bg-amber-500"
    : "bg-muted-foreground";
  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/60 transition cursor-default">
      <div className="relative shrink-0">
        <div className={cn(
          "h-10 w-10 rounded-full grid place-items-center font-bold text-sm text-white",
          isOwner
            ? "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"
            : "bg-gradient-to-br from-slate-500 to-slate-700"
        )}>
          {isOwner ? <Crown className="h-4 w-4" /> : initials}
        </div>
        <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background", dotClass)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate flex items-center gap-1.5">
          {email}
          {isOwner && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
        </p>
        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
          <span>{role}</span>
          {strategy && <>· <span className="capitalize">{strategy.replace("-", " ")}</span></>}
        </p>
      </div>
      {status === "pending" && checkoutUrl && (
        <Button
          size="sm"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100 transition h-7 px-2 text-[11px]"
          onClick={() => { navigator.clipboard.writeText(checkoutUrl); toast.success("Payment link copied"); }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

/* ---------------- Stat Card ---------------- */
function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "emerald"|"amber"|"violet" }) {
  const toneCls = {
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber:   "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
    violet:  "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400",
  }[tone];
  return (
    <div className={cn("rounded-2xl border border-border p-5 bg-gradient-to-br", toneCls)}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-80">{icon}{label}</div>
      <div className="mt-2 text-3xl font-display font-black text-foreground">{value}</div>
    </div>
  );
}

/* ---------------- Invite Dialog ---------------- */
function InviteDialog({
  open, onOpenChange, onSent,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSent: () => void }) {
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<Tier>("teams");
  const [strategy, setStrategy] = useState<Strategy>("split-bill");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !email.includes("@")) { toast.error("Enter a valid email"); return; }
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Sign in first"); return; }
      const res = await fetch("/api/public/invite-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          invitee_email: email.trim(),
          tier,
          billingStrategy: strategy,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to send invite");
      toast.success(strategy === "owner-pays" ? "Member added instantly ✨" : "Invite sent with payment link 💌");
      setEmail("");
      onSent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Invite to your Crew
          </DialogTitle>
          <DialogDescription>
            Add a study buddy. We'll email them a warm welcome from crews@nextudy.app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="invitee">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="invitee"
                type="email"
                placeholder="buddy@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tier</Label>
            <div className="grid grid-cols-2 gap-2">
              <TierChip active={tier === "teams"} onClick={() => setTier("teams")}
                icon={<Users className="h-3.5 w-3.5" />} label="Teams" price="€16 / seat" />
              <TierChip active={tier === "turbo"} onClick={() => setTier("turbo")}
                icon={<Zap className="h-3.5 w-3.5" />} label="Turbo" price="€12 / seat" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Billing strategy</Label>
            <div className="rounded-xl border border-border p-1 grid grid-cols-2 gap-1 bg-muted/40">
              <StratBtn active={strategy === "split-bill"} onClick={() => setStrategy("split-bill")}
                title="Split-Bill" subtitle="Invitee pays their share" />
              <StratBtn active={strategy === "owner-pays"} onClick={() => setStrategy("owner-pays")}
                title="Owner-Pays" subtitle="You cover the seat" />
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              {strategy === "split-bill"
                ? "We'll email a secure Stripe checkout link. They join once they pay."
                : "Member gets instant access. Extra seat added to your subscription."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {busy ? "Sending…" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TierChip({ active, onClick, icon, label, price }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; price: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition",
        active
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border hover:bg-accent/60"
      )}
    >
      <div className="flex items-center gap-1.5 text-sm font-semibold">{icon}{label}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{price}</div>
    </button>
  );
}

function StratBtn({ active, onClick, title, subtitle }: {
  active: boolean; onClick: () => void; title: string; subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-2 text-left transition",
        active
          ? "bg-background shadow-sm border border-border"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <div className="text-xs font-semibold">{title}</div>
      <div className="text-[10px] opacity-80">{subtitle}</div>
    </button>
  );
}
