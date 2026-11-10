import { unstable_cache } from "next/cache";
import { createServiceClient } from "./supabase/server";

/**
 * Public, site-wide settings (hero video, announcement bar). These are identical for every visitor,
 * so they are safe to cache globally. NEVER put per-user data in here.
 *
 * Reads use the service client directly (no cookies()), which keeps the pages that use them
 * static / ISR instead of rendering on the server for every visit.
 * Admin saves call revalidateTag(SITE_SETTINGS_TAG) so changes show up immediately.
 */
export const SITE_SETTINGS_TAG = "site-settings";
const REVALIDATE_SECONDS = 300;

export const getLandingSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const svc = await createServiceClient();
    const { data } = await svc
      .from("admin_settings")
      .select("key, value")
      .in("key", [
        "hero_video_url",
        "hero_video_title",
        "announcement_bar_text",
        "announcement_bar_active",
      ]);

    const settings: Record<string, string> = {};
    (data as { key: string; value: string }[] | null)?.forEach((row) => {
      settings[row.key] = row.value;
    });
    return settings;
  },
  ["landing-settings"],
  { revalidate: REVALIDATE_SECONDS, tags: [SITE_SETTINGS_TAG] }
);

export interface AnnouncementBar {
  enabled?: boolean;
  message?: string;
  link?: string;
  linkText?: string;
}

export const getAnnouncementBar = unstable_cache(
  async (): Promise<AnnouncementBar | null> => {
    const svc = await createServiceClient();
    const { data } = await svc
      .from("admin_settings")
      .select("value")
      .eq("key", "announcement_bar")
      .maybeSingle();
    if (!data?.value) return null;
    try {
      return JSON.parse(data.value) as AnnouncementBar;
    } catch {
      return null;
    }
  },
  ["announcement-bar"],
  { revalidate: REVALIDATE_SECONDS, tags: [SITE_SETTINGS_TAG] }
);
