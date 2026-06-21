import {
  lemonSqueezySetup,
  createCheckout as lsCreateCheckout,
  type NewCheckout,
} from "@lemonsqueezy/lemonsqueezy.js";

export function setupLemonSqueezy() {
  lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });
}

export { lsCreateCheckout as createCheckout };

// Maps "plan_period" → variant ID
export const PLAN_VARIANT_MAP: Record<string, string> = {
  creator_monthly: process.env.LEMONSQUEEZY_CREATOR_MONTHLY_VARIANT_ID || "",
  creator_annual:  process.env.LEMONSQUEEZY_CREATOR_ANNUAL_VARIANT_ID  || "",
  pro_monthly:     process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID     || "",
  pro_annual:      process.env.LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID      || "",
  agency_monthly:  process.env.LEMONSQUEEZY_AGENCY_MONTHLY_VARIANT_ID  || "",
  agency_annual:   process.env.LEMONSQUEEZY_AGENCY_ANNUAL_VARIANT_ID   || "",
};

// Maps variant ID → plan name (used by webhook)
export const VARIANT_PLAN_MAP: Record<string, string> = {
  [process.env.LEMONSQUEEZY_FREE_VARIANT_ID            || ""]: "free",
  [process.env.LEMONSQUEEZY_CREATOR_MONTHLY_VARIANT_ID || ""]: "creator",
  [process.env.LEMONSQUEEZY_CREATOR_ANNUAL_VARIANT_ID  || ""]: "creator",
  [process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID     || ""]: "pro",
  [process.env.LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID      || ""]: "pro",
  [process.env.LEMONSQUEEZY_AGENCY_MONTHLY_VARIANT_ID  || ""]: "agency",
  [process.env.LEMONSQUEEZY_AGENCY_ANNUAL_VARIANT_ID   || ""]: "agency",
};

export type { NewCheckout };
