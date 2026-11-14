/**
 * Single source of truth for plan prices and plan-based allowances.
 *
 * IMPORTANT: these numbers are what the website SHOWS. What a customer is actually CHARGED is the price of the
 * matching variant in the Lemon Squeezy dashboard (LEMONSQUEEZY_*_VARIANT_ID). Change both together.
 */

export type PlanId = "free" | "creator" | "pro" | "agency";

export interface PlanPrice {
  monthly: number;
  annual: number;
}

export const PLAN_PRICES: Record<PlanId, PlanPrice> = {
  free: { monthly: 0, annual: 0 },
  creator: { monthly: 12, annual: 108 },
  pro: { monthly: 29, annual: 276 },
  agency: { monthly: 119, annual: 1140 },
};

/** Monthly price used for MRR / revenue reports (monthly billing). */
export const PLAN_MONTHLY_PRICE: Record<string, number> = {
  creator: PLAN_PRICES.creator.monthly,
  pro: PLAN_PRICES.pro.monthly,
  agency: PLAN_PRICES.agency.monthly,
};

export function annualPerMonth(plan: PlanId): string {
  return `$${(PLAN_PRICES[plan].annual / 12).toFixed(2)}/month`;
}

export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return r ? `${m} min ${r}s` : `${m} min`;
}
