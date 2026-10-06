import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Gift, Ticket, Zap, Crown, Sparkles, Copy, ArrowLeft, X, BookOpen, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getDailyUsage } from "@/lib/usage.functions";
import { getBillingSummary } from "@/lib/billing.functions";
import { PLANS, PROMO_CODES, formatEur, normalizePlan, promoDiscount, type PlanId } from "@/lib/plans";

const ICON: Record<PlanId, typeof Zap> = { basic: Sparkles, pro: Zap, turbo: Crown };
/** Monthly token allowance shown on the meter, per realm. */
const TOKEN_CAP: Record<PlanId, number> = { basic: 200_000, pro: 1_000_000, turbo: 3_000_000 };

const FEATURES: Record<PlanId, { mentor: string[]; vanguard: string[] }> = {
  basic: {
    mentor: ["Unlimited study chat & uploads", "Summaries & flashcards"],
    vanguard: ["Business strategy chat", "Market basics"],
  },
  pro: {
    mentor: ["Advanced reasoning (Thinking)", "Multi-file context", "All 5 study languages"],
    vanguard: ["Vanguard Prime risk & trend analysis", "Launch Blueprint PDF export"],
  },
  turbo: {
    mentor: ["Everything in Pro", "Longest context windows"],
    vanguard: ["Fastest Turbo queue", "Priority support"],
  },
};

type Summary = { referralCode: string; friends: number; balanceCents: number; tokens: { mentor: number; vanguard: number } };

export function PlansBillingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const usageFn = useServerFn(getDailyUsage);
  const summaryFn = useServerFn(getBillingSummary);
  const [plan, setPlan] = useState<PlanId>("basic");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [step, setStep] = useState<"overview" | "pro" | "turbo">("overview");

  useEffect(() => {
    if (!open) { setStep("overview"); return; }
    // Browser back closes the modal.
    window.history.pushState({ nextudyModal: true }, "");
    const onPop = () => onOpenChange(false);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.nextudyModal) window.history.back();
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || !user) return;
    void (usageFn() as Promise<{ plan: string }>).then((u) => setPlan(normalizePlan(u.plan))).catch(() => undefined);
    void (summaryFn() as Promise<Summary>).then(setSummary).catch(() => undefined);
  }, [open, user, usageFn, summaryFn]);

  const refLink = typeof window !== "undefined" && summary ? `${window.location.origin}/auth?ref=${summary.referralCode}` : "";
  const cap = TOKEN_CAP[plan];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[14px] border-border bg-card p-5 sm:p-6">
        {step === "overview" ? (
          <>
            <DialogHeader>
              <DialogTitle>Plans & Subscriptions</DialogTitle>
              <DialogDescription>Your plan, usage and rewards.</DialogDescription>
            </DialogHeader>

            <section className="rounded-[14px] border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Active plan</p>
                  <p className="text-lg font-semibold capitalize">{plan}</p>
                </div>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">Renews monthly</span>
              </div>
              <div className="mt-4 space-y-3">
                {(["mentor", "vanguard"] as const).map((r) => {
                  const used = summary?.tokens[r] ?? 0;
                  const pct = Math.min(100, (used / cap) * 100);
                  return (
                    <div key={r}>
                      <div className="flex justify-between text-xs">
                        <span className={r === "mentor" ? "text-mentor" : "text-vanguard"}>
                          {r === "mentor" ? "Mentor (Academic)" : "Vanguard (Business)"}
                        </span>
                        <span className="text-muted-foreground">{used.toLocaleString()} / {cap.toLocaleString()} tokens</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                        <div className={`h-full rounded-full ${r === "mentor" ? "bg-mentor" : "bg-vanguard"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground">Estimated from this month's chats.</p>
              </div>
            </section>

            <section className="rounded-[14px] border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <Gift className="h-5 w-5 shrink-0 text-mentor" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Invite a friend and get €2.00 off your next billing cycle.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Available Balance: <span className="font-semibold text-foreground">{formatEur((summary?.balanceCents ?? 0) / 100)}</span>
                    {" · "}{summary?.friends ?? 0} friends joined
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Input readOnly value={refLink} aria-label="Your referral link" className="rounded-xl text-xs" />
                <Button
                  variant="outline" className="rounded-xl gap-1.5" disabled={!refLink}
                  onClick={() => { void navigator.clipboard.writeText(refLink); toast.success("Referral link copied"); }}
                ><Copy className="h-3.5 w-3.5" />Copy</Button>
              </div>
            </section>

            <div className="grid gap-3 md:grid-cols-3">
              {PLANS.map((p) => {
                const Icon = ICON[p.id];
                const current = plan === p.id;
                return (
                  <div key={p.id} className={`flex flex-col rounded-[14px] border bg-background p-4 ${current ? "border-mentor" : "border-border"}`}>
                    <div className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4" />{p.name}</div>
                    <p className="mt-1 text-2xl font-semibold">{formatEur(p.price)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                    <div className="mt-3 flex-1 space-y-3 text-xs">
                      <FeatureList icon={BookOpen} label="Mentor" tone="text-mentor" items={FEATURES[p.id].mentor} />
                      <FeatureList icon={Briefcase} label="Vanguard" tone="text-vanguard" items={FEATURES[p.id].vanguard} />
                    </div>
                    <Button
                      size="sm" className="mt-4 w-full rounded-xl" variant={current || p.id === "basic" ? "outline" : "default"}
                      disabled={current || p.id === "basic"}
                      onClick={() => p.id !== "basic" && setStep(p.id)}
                    >
                      {current ? "Current plan" : p.id === "basic" ? "Free" : `Upgrade to ${p.name}`}
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <CheckoutStep tier={step} balanceCents={summary?.balanceCents ?? 0} onBack={() => setStep("overview")} signedIn={!!user} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FeatureList({ icon: Icon, label, tone, items }: { icon: typeof Zap; label: string; tone: string; items: string[] }) {
  return (
    <div>
      <p className={`mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${tone}`}><Icon className="h-3 w-3" />{label}</p>
      <ul className="space-y-1">
        {items.map((f) => <li key={f} className="flex gap-1.5"><Check className={`h-3.5 w-3.5 shrink-0 ${tone}`} />{f}</li>)}
      </ul>
    </div>
  );
}

function CheckoutStep({ tier, balanceCents, onBack, signedIn }: { tier: "pro" | "turbo"; balanceCents: number; onBack: () => void; signedIn: boolean }) {
  const plan = PLANS.find((p) => p.id === tier)!;
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [useCredit, setUseCredit] = useState(balanceCents > 0);
  const [busy, setBusy] = useState(false);

  const base = Math.round(plan.price * 100);
  const promoCents = Math.round(promoDiscount(applied) * 100);
  const creditCents = useCredit ? balanceCents : 0;
  const discount = Math.min(Math.max(0, base - 50), promoCents + creditCents);
  const total = base - discount;

  const apply = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    if (!PROMO_CODES[c]) { setApplied(null); setCodeError("This code is invalid or has expired."); return; }
    setCodeError(null);
    setApplied(c);
  };

  const pay = async () => {
    if (!signedIn) { toast.error("Sign in to upgrade"); return; }
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/public/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` },
        body: JSON.stringify({ tier, promo: applied ?? undefined, useReferral: useCredit }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
      setBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <button onClick={onBack} className="mb-1 flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />All plans
        </button>
        <DialogTitle>Upgrade to {plan.name}</DialogTitle>
        <DialogDescription>Review your total before payment.</DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <label htmlFor="promo" className="text-xs text-muted-foreground">Promo code</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Ticket className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="promo" value={code} placeholder="e.g. EXAMPREP" className="rounded-xl pl-8 uppercase"
              aria-invalid={!!codeError}
              onChange={(e) => { setCode(e.target.value); setCodeError(null); }}
              onKeyDown={(e) => e.key === "Enter" && apply()}
            />
          </div>
          <Button variant="outline" className="rounded-xl" onClick={apply}>Apply</Button>
        </div>
        {codeError && <p role="alert" className="text-xs text-destructive">{codeError}</p>}
      </div>

      <div className="flex items-center justify-between rounded-[14px] border border-border bg-background p-3">
        <div>
          <p className="text-sm">Use referral credit</p>
          <p className="text-xs text-muted-foreground">Available Balance: {formatEur(balanceCents / 100)}</p>
        </div>
        <Switch checked={useCredit} disabled={balanceCents === 0} onCheckedChange={setUseCredit} aria-label="Use referral credit" />
      </div>

      <div className="flex flex-wrap gap-2">
        {applied && (
          <Badge onRemove={() => setApplied(null)}>-{formatEur(promoCents / 100)} {applied} applied</Badge>
        )}
        {creditCents > 0 && <Badge onRemove={() => setUseCredit(false)}>-{formatEur(creditCents / 100)} Referral Credit Applied</Badge>}
      </div>

      <div className="space-y-1.5 rounded-[14px] border border-border bg-background p-4 text-sm">
        <Row label={`${plan.name} · monthly`} value={formatEur(base / 100)} />
        {discount > 0 && <Row label="Discounts (first cycle)" value={`-${formatEur(discount / 100)}`} tone="text-vanguard" />}
        <div className="my-2 border-t border-border" />
        <Row label="Due today" value={formatEur(total / 100)} strong />
        <p className="pt-1 text-[11px] text-muted-foreground">Then {formatEur(base / 100)}/month. Cancel anytime.</p>
      </div>

      <Button className="w-full rounded-xl" disabled={busy} onClick={pay}>
        {busy ? "Opening secure checkout…" : `Confirm & pay ${formatEur(total / 100)}`}
      </Button>
    </>
  );
}

function Row({ label, value, tone = "", strong = false }: { label: string; value: string; tone?: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span><span className={tone}>{value}</span>
    </div>
  );
}

function Badge({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-vanguard/40 bg-vanguard/10 px-2.5 py-1 text-xs text-vanguard">
      <Check className="h-3 w-3" />{children}
      <button onClick={onRemove} aria-label="Remove discount" className="ml-0.5"><X className="h-3 w-3" /></button>
    </span>
  );
}
