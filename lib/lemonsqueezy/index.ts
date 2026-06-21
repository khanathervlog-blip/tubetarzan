import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";

export function setupLemonSqueezy() {
  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
    onError(error) {
      console.error("LemonSqueezy error:", error);
    },
  });
}

export const PLAN_VARIANT_MAP: Record<string, string> = {
  creator_monthly: process.env.LEMONSQUEEZY_CREATOR_MONTHLY_VARIANT_ID || "",
  creator_annual: process.env.LEMONSQUEEZY_CREATOR_ANNUAL_VARIANT_ID || "",
  pro_monthly: process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID || "",
  pro_annual: process.env.LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID || "",
  agency_monthly: process.env.LEMONSQUEEZY_AGENCY_MONTHLY_VARIANT_ID || "",
  agency_annual: process.env.LEMONSQUEEZY_AGENCY_ANNUAL_VARIANT_ID || "",
};

export const VARIANT_PLAN_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PLAN_VARIANT_MAP).map(([key, variantId]) => [
    variantId,
    key.split("_")[0],
  ])
);

export { createCheckout };
