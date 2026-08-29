/** Global Nextudy plan architecture: BASIC (free), PRO, TURBO. Individual plans only. */

import { getActiveEvent, eventDiscountFor, type HolidayEvent } from "@/lib/holidays";

export type PlanId = "basic" | "pro" | "turbo";

export interface PlanDef {
  id: PlanId;
  name: string;
  /** Standard monthly price in EUR. */
  price: number;
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
      "8 solid LED colours (flowing or static)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 5,
    tagline: "Individual power-user pass.",
    features: [
      "Everything in Basic",
      "Advanced reasoning toggle",
      "Multi-file context processing",
      "Rainbow neon & multi-colour LED flows",
      "All 5 study languages",
    ],
  },
  {
    id: "turbo",
    name: "Turbo",
    price: 7,
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

/** The event driving the current discounts, if any (fully date-driven). */
export function activeEvent(now: Date = new Date()): HolidayEvent | null {
  return getActiveEvent(now);
}

/** Price actually charged right now, respecting the active event discount. */
export function activePrice(plan: PlanDef, now: Date = new Date()): number {
  if (plan.price === 0) return 0;
  const discount = eventDiscountFor(plan.id, now);
  return Math.max(0, Math.round((plan.price - discount) * 100) / 100);
}

/** Seasonal deals are retired — no promo badges anywhere. */
export function showsDeal(_plan: PlanDef, _now: Date = new Date()): boolean {
  return false;
}

export function dealLabel(_now: Date = new Date()): string | null {
  return null;
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

export function planById(id: PlanId): PlanDef {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/** Pro & Turbo unlock the advanced LED presets. */
export function hasProLed(plan: PlanId): boolean {
  return plan === "pro" || plan === "turbo";
}
