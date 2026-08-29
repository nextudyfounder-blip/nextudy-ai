// Server-only Stripe helper using the REST API directly (Worker-safe).

import { PLANS, activePrice } from "@/lib/plans";

const STRIPE_BASE = "https://api.stripe.com/v1";

function secretKey() {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_API_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key;
}

// x-www-form-urlencoded encoder that supports nested arrays/objects, per Stripe's convention.
function encodeForm(data: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === "object" && v !== null) {
          parts.push(encodeForm(v as Record<string, unknown>, `${fullKey}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${fullKey}[${i}]`)}=${encodeURIComponent(String(v))}`);
        }
      });
    } else if (typeof value === "object") {
      parts.push(encodeForm(value as Record<string, unknown>, fullKey));
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

export async function stripeRequest<T = unknown>(path: string, form: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${STRIPE_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm(form),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error("[stripe] request failed", res.status, body);
    throw new Error((body as any)?.error?.message || `Stripe error ${res.status}`);
  }
  return body as T;
}

async function stripeGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${STRIPE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const body = await res.json();
  if (!res.ok) {
    console.error("[stripe] get failed", res.status, body);
    throw new Error((body as any)?.error?.message || `Stripe error ${res.status}`);
  }
  return body as T;
}

export interface CancelResult {
  cancelled: boolean;
  /** Unix seconds when access ends, when known. */
  periodEnd?: number;
}

/**
 * Cancels every active subscription for this email at the end of the paid period.
 * Users keep full access until then, after which no further charges occur.
 */
export async function cancelSubscriptionsForEmail(email: string): Promise<CancelResult> {
  const customers = await stripeGet<{ data: Array<{ id: string }> }>(
    `/customers?email=${encodeURIComponent(email)}&limit=10`,
  );
  let cancelled = false;
  let periodEnd: number | undefined;

  for (const customer of customers.data) {
    const subs = await stripeGet<{
      data: Array<{ id: string; status: string; current_period_end: number; cancel_at_period_end: boolean }>;
    }>(`/subscriptions?customer=${customer.id}&status=all&limit=20`);

    for (const sub of subs.data) {
      if (!["active", "trialing", "past_due"].includes(sub.status)) continue;
      if (!sub.cancel_at_period_end) {
        await stripeRequest(`/subscriptions/${sub.id}`, { cancel_at_period_end: true });
      }
      cancelled = true;
      if (!periodEnd || sub.current_period_end > periodEnd) periodEnd = sub.current_period_end;
    }
  }

  return { cancelled, periodEnd };
}

export interface SubscriptionStatus {
  active: boolean;
  cancelAtPeriodEnd: boolean;
  periodEnd?: number;
}

/** Current paid-access status for an email across all matching Stripe customers. */
export async function stripeSubscriptionStatusForEmail(email: string): Promise<SubscriptionStatus> {
  const customers = await stripeGet<{ data: Array<{ id: string }> }>(
    `/customers?email=${encodeURIComponent(email)}&limit=10`,
  );
  let status: SubscriptionStatus = { active: false, cancelAtPeriodEnd: false };

  for (const customer of customers.data) {
    const subs = await stripeGet<{
      data: Array<{ status: string; current_period_end: number; cancel_at_period_end: boolean }>;
    }>(`/subscriptions?customer=${customer.id}&status=all&limit=20`);
    for (const sub of subs.data) {
      if (!["active", "trialing", "past_due"].includes(sub.status)) continue;
      status = {
        active: true,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        periodEnd: sub.current_period_end,
      };
    }
  }
  return status;
}

export interface CheckoutSession {
  id: string;
  url: string | null;
}

/**
 * Create a subscription Checkout Session using dynamic price_data.
 * PRO and TURBO use the current plan pricing (holiday-event discount aware).
 */
export async function createSubscriptionCheckout(input: {
  tier: "pro" | "teams" | "turbo";
  seats?: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  /** Overrides the computed price, e.g. a renewal rate locked during an event. */
  priceCentsOverride?: number;
}): Promise<CheckoutSession> {
  const plan = PLANS.find((p) => p.id === (input.tier === "teams" ? "pro" : input.tier))!;
  const priceCents = input.priceCentsOverride ?? Math.round(activePrice(plan) * 100);
  const productName = `Nextudy ${plan.name}`;
  const quantity = input.tier === "pro" ? 1 : Math.max(1, input.seats ?? 1);

  return stripeRequest<CheckoutSession>("/checkout/sessions", {
    mode: "subscription",
    customer_email: input.customerEmail,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    "line_items[0][quantity]": quantity,
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": priceCents,
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": productName,
    ...(input.metadata
      ? Object.fromEntries(
          Object.entries(input.metadata).map(([k, v]) => [`metadata[${k}]`, v]),
        )
      : {}),
  });
}

/** Back-compat alias for the invite-member route (single seat). */
export async function createMemberCheckout(input: {
  tier: "teams" | "turbo";
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<CheckoutSession> {
  return createSubscriptionCheckout({ ...input, seats: 1 });
}
