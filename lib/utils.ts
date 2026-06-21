import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatVPH(vph: number): string {
  if (vph >= 1000) return `${(vph / 1000).toFixed(1)}K`;
  return vph.toFixed(0);
}

export function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatAge(publishedAt: string): string {
  const hours = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;
  const months = days / 30;
  if (months < 12) return `${Math.round(months)}mo`;
  return `${Math.round(months / 12)}yr`;
}

export function getPlanFromVariantId(variantId: string): string {
  const map: Record<string, string> = {
    [process.env.LEMONSQUEEZY_CREATOR_MONTHLY_VARIANT_ID || ""]: "creator",
    [process.env.LEMONSQUEEZY_CREATOR_ANNUAL_VARIANT_ID || ""]: "creator",
    [process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID || ""]: "pro",
    [process.env.LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID || ""]: "pro",
    [process.env.LEMONSQUEEZY_AGENCY_MONTHLY_VARIANT_ID || ""]: "agency",
    [process.env.LEMONSQUEEZY_AGENCY_ANNUAL_VARIANT_ID || ""]: "agency",
  };
  return map[variantId] || "free";
}
