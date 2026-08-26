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

export interface CheckoutSession {
  id: string;
  url: string | null;
}

/**
 * Create a subscription Checkout Session using dynamic price_data.
 * PRO and TURBO use the current plan pricing (WK DEAL aware).
 */
export async function createSubscriptionCheckout(input: {
  tier: "pro" | "teams" | "turbo";
  seats?: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<CheckoutSession> {
  const plan = PLANS.find((p) => p.id === (input.tier === "teams" ? "pro" : input.tier))!;
  const priceCents = Math.round(activePrice(plan) * 100);
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
