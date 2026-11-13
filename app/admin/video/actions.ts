"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { SITE_SETTINGS_TAG } from "@/lib/site-settings";
import { requireAdminUser } from "@/lib/admin-exemption";

const safeUrl = (u?: string) => !u || /^https:\/\/[^\s"'<>]+$/i.test(u);

export async function saveVideoSettings(settings: {
  hero_video_url: string;
  hero_video_title: string;
  announcement_bar_text: string;
  announcement_bar_active: boolean;
  announcement_bar_link?: string;
  announcement_bar_link_text?: string;
  onboarding_api_key_video?: string;
}): Promise<{ error: string | null }> {
  // SECURITY: server actions can be called directly - always verify the caller is an admin
  if (!(await requireAdminUser())) return { error: "Forbidden" };
  if (![settings.hero_video_url, settings.announcement_bar_link, settings.onboarding_api_key_video].every(safeUrl)) {
    return { error: "Links must start with https://" };
  }
  const supabase = await createServiceClient();

  const announcementJson = JSON.stringify({
    enabled: settings.announcement_bar_active,
    message: settings.announcement_bar_text,
    link: settings.announcement_bar_link || "",
    linkText: settings.announcement_bar_link_text || "",
  });

  const updates = [
    { key: "hero_video_url", value: settings.hero_video_url },
    { key: "hero_video_title", value: settings.hero_video_title },
    { key: "announcement_bar", value: announcementJson },
    { key: "onboarding_api_key_video", value: settings.onboarding_api_key_video || "" },
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from("admin_settings")
      .upsert(
        { key: update.key, value: update.value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) return { error: error.message };
  }

  // Make the statically generated landing page and the dashboard banner pick up the change right away
  revalidateTag(SITE_SETTINGS_TAG);
  revalidatePath("/");

  return { error: null };
}
