/**
 * Single source of truth for plan prices and plan-based allowances.
 *
 * IMPORTANT: these numbers are what the website SHOWS. What a customer is actually CHARGED is the price of the
 * matching variant in the Lemon Squeezy dashboard (LEMONSQUEEZY_*_VARIANT_ID). Change both together.
 *
 * Lip Sync allowance maths (see the conversation notes / admin Lip Sync page):
 *   budget per plan  = 8% of the lowest monthly-equivalent price (the annual price / 12)
 *   worst-case cost  = $0.50 per lip-synced minute (Hugging Face ZeroGPU credits at $1 per 10 GPU-min,
 *                      assuming 5 GPU-min per video-min; the 10 free accounts usually make it $0)
 *   Creator  $108/yr -> $9.00/mo  -> 8% = $0.72 -> 1 min   ($0.50 worst case)
 *   Pro      $276/yr -> $23.00/mo -> 8% = $1.84 -> 3 min   ($1.50 worst case)
 *   Agency  $1140/yr -> $95.00/mo -> 8% = $7.60 -> 15 min  ($7.50 worst case)
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

/** Lip-synced seconds included per calendar month. Each clip is at most 60 seconds. Admin is unlimited. */
export const LIPSYNC_SECONDS_PER_MONTH: Record<string, number> = {
  free: 0,
  creator: 60,
  pro: 180,
  agency: 900,
};

/**
 * Daily GPU safety budget: lip-synced VIDEO seconds each Hugging Face key may spend per day, so the pool
 * never runs into ZeroGPU quota errors. 10 keys × 60 s = 10 min of video per day by default.
 * Override with the LIPSYNC_DAILY_SECONDS_PER_KEY env var once the real GPU time per clip is known
 * (admin → Lip Sync shows the "took" time of each clip).
 */
export const LIPSYNC_DAILY_SECONDS_PER_KEY = 15;

/** Longest single clip sent to the GPU, and the longest whole video one run may contain. */
export const LIPSYNC_MAX_CLIP_SECONDS = 10;
export const LIPSYNC_MAX_RUN_SECONDS = 12 * 60;
export const LIPSYNC_MAX_RUN_SECONDS_ADMIN = 30 * 60;

export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return r ? `${m} min ${r}s` : `${m} min`;
}
