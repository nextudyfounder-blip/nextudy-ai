# Project Architecture Rules

- Keep Mentor and Vanguard quote pools in a client-safe presentation module so realm switching never depends on server data.
- Keep workspace colors semantic and scoped through global design tokens so the focused chat theme remains consistent across controls.
- Apply promo and referral discounts server-side at checkout as one-time payment-provider coupons, never by lowering the recurring price, so discounts only affect the next billing cycle.
