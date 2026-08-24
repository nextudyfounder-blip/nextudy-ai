/** Global Nextudy plan architecture: BASIC (free), PRO, TURBO. Individual plans only. */

export type PlanId = "basic" | "pro" | "turbo";

/** WK DEAL promo window (UTC). Tags & discounted rates disappear automatically after this. */
export const WK_DEAL_END = new Date("2026-09-14T23:59:59Z");

export function isWkDealActive(now: Date = new Date()): boolean {
  return now.getTime() <= WK_DEAL_END.getTime();
}

export interface PlanDef {
  id: PlanId;
  name: string;
  /** Baseline monthly price in EUR. */
  price: number;
  /** Discounted WK DEAL monthly price in EUR (undefined = no promo). */
  dealPrice?: number;
  tagline: string;
  features: string[];
}

export const PLANS: PlanDef[] = [
  {
    id: "basic",
    name: "Basic",
    price: 0,
    tagline: "Gratis · unlimited studying.",
    features: [
      "Unlimited basic chat questions",
      "Unlimited document & image uploads",
      "AI summaries & flashcards",
      "1 study language",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 5,
    dealPrice: 3.5,
    tagline: "Individual power-user pass.",
    features: [
      "Everything in Basic",
      "Advanced reasoning toggle",
      "Multi-file context processing",
      "Priority model access",
      "All 5 study languages",
    ],
  },
  {
    id: "turbo",
    name: "Turbo",
    price: 7,
    dealPrice: 5,
    tagline: "Maximum AI dispatch speed.",
    features: [
      "Everything in Pro",
      "Fastest Turbo model queue",
      "Hardware-accelerated dispatch",
      "Longest context windows",
      "Priority support",
    ],
  },
];

/** Price actually charged right now, respecting the WK DEAL window. */
export function activePrice(plan: PlanDef, now: Date = new Date()): number {
  return plan.dealPrice !== undefined && isWkDealActive(now) ? plan.dealPrice : plan.price;
}

export function showsDeal(plan: PlanDef, now: Date = new Date()): boolean {
  return plan.dealPrice !== undefined && isWkDealActive(now);
}

export function formatEur(amount: number): string {
  return `€${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}

export const REFERRAL_NOTE = "Invite friends to get €1.50 off your first month!";

/** Normalizes any legacy plan value from the database to the current three tiers. */
export function normalizePlan(value?: string | null): PlanId {
  const v = (value ?? "").toLowerCase();
  if (v === "turbo") return "turbo";
  if (v === "pro") return "pro";
  return "basic";
}
