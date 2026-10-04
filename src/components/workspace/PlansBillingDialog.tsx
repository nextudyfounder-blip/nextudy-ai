import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Minus, Gift, Ticket, Zap, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getDailyUsage } from "@/lib/usage.functions";
import {
  PLANS, PROMO_CODES, REFERRAL_DISCOUNT_EUR, formatEur, normalizePlan, promoDiscount, type PlanId,
} from "@/lib/plans";

const ICON: Record<PlanId, typeof Zap> = { basic: Sparkles, pro: Zap, turbo: Crown };

const ROWS: Array<{ group: string; label: string; tiers: [boolean, boolean, boolean] }> = [
  { group: "Mentor", label: "Unlimited study chat & uploads", tiers: [true, true, true] },
  { group: "Mentor", label: "Summaries, flashcards & quizzes", tiers: [true, true, true] },
  { group: "Mentor", label: "Advanced reasoning (Thinking)", tiers: [false, true, true] },
  { group: "Mentor", label: "Multi-file context", tiers: [false, true, true] },
  { group: "Vanguard", label: "Business strategy chat", tiers: [true, true, true] },
  { group: "Vanguard", label: "Vanguard Prime risk & trend analysis", tiers: [false, true, true] },
  { group: "Vanguard", label: "Launch Blueprint PDF export", tiers: [false, true, true] },
  { group: "Vanguard", label: "Turbo queue & longest context", tiers: [false, false, true] },
];

export function PlansBillingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const usageFn = useServerFn(getDailyUsage);
  const [plan, setPlan] = useState<PlanId>("basic");
  const [usage, setUsage] = useState({ used: 0, limit: 100 });
  const [promo, setPromo] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [busy, setBusy] = useState<PlanId | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle()
      .then(({ data }) => setPlan(normalizePlan(data?.plan)));
    void (usageFn() as Promise<{ uploads: number; questions: number; plan: string; limits: { questions: number } }>)
      .then((u) => {
        setPlan(normalizePlan(u.plan));
        setUsage({ used: u.questions + u.uploads, limit: Math.min(u.limits.questions, 500) });
      })
      .catch(() => undefined);
  }, [open, user, usageFn]);

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!PROMO_CODES[code]) { toast.error("That promo code isn't valid"); setApplied(null); return; }
    setApplied(code);
    toast.success(PROMO_CODES[code].label);
  };

  const checkout = async (tier: "pro" | "turbo") => {
    if (!user) { toast.error("Sign in to upgrade"); return; }
    setBusy(tier);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/public/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` },
        body: JSON.stringify({ tier, promo: applied ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
      setBusy(null);
    }
  };

  const off = promoDiscount(applied);
  const pct = Math.min(100, Math.round((usage.used / Math.max(1, usage.limit)) * 100));
  const referralUrl = typeof window !== "undefined" && user ? `${window.location.origin}/auth?ref=${user.id.slice(0, 8)}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Plans & Billing</DialogTitle>
          <DialogDescription>Manage your plan, usage and rewards.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Active plan</p>
            <p className="mt-1 text-lg font-semibold capitalize text-realm">{plan}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Today's credits</p>
            <p className="mt-1 text-sm font-medium">{usage.used} used</p>
            <Progress value={pct} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Gift className="h-3 w-3" />Referral credit</p>
            <p className="mt-1 text-sm font-medium">{formatEur(REFERRAL_DISCOUNT_EUR)} off per friend</p>
            <button
              className="mt-1 text-xs text-realm hover:underline"
              onClick={() => { void navigator.clipboard.writeText(referralUrl); toast.success("Invite link copied"); }}
            >Copy invite link</button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Ticket className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Seasonal promo code" className="pl-8" />
          </div>
          <Button variant="outline" onClick={applyPromo}>Apply</Button>
        </div>
        {applied && <p className="-mt-2 text-xs text-realm">{PROMO_CODES[applied].label} applied at checkout</p>}

        <div className="grid gap-3 sm:grid-cols-3">
          {PLANS.map((p) => {
            const Icon = ICON[p.id];
            const price = p.price === 0 ? 0 : Math.max(0.5, p.price - off);
            return (
              <div key={p.id} className={`rounded-xl border p-4 ${plan === p.id ? "realm-border" : "border-border"}`}>
                <div className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-realm" />{p.name}</div>
                <p className="mt-2 text-2xl font-semibold">
                  {formatEur(price)}<span className="text-xs font-normal text-muted-foreground">/mo</span>
                </p>
                {off > 0 && p.price > 0 && <p className="text-xs text-muted-foreground line-through">{formatEur(p.price)}</p>}
                <Button
                  size="sm" className="mt-3 w-full" variant={plan === p.id ? "outline" : "default"}
                  disabled={plan === p.id || p.id === "basic" || busy !== null}
                  onClick={() => p.id !== "basic" && checkout(p.id)}
                >
                  {plan === p.id ? "Current plan" : p.id === "basic" ? "Free" : busy === p.id ? "Opening…" : `Upgrade to ${p.name}`}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="p-3 text-left font-medium">Feature</th>
                {PLANS.map((p) => <th key={p.id} className="p-3 font-medium">{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={r.label} className="border-b border-border/60 last:border-0">
                  <td className="p-3">
                    {(i === 0 || ROWS[i - 1].group !== r.group) && (
                      <span className="mb-1 block text-[10px] uppercase tracking-wider text-realm">{r.group}</span>
                    )}
                    {r.label}
                  </td>
                  {r.tiers.map((on, j) => (
                    <td key={j} className="p-3 text-center">
                      {on ? <Check className="mx-auto h-4 w-4 text-realm" /> : <Minus className="mx-auto h-4 w-4 text-muted-foreground" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
