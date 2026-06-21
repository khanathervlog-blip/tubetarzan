"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function saveVideoSettings(settings: {
  hero_video_url: string;
  hero_video_title: string;
  announcement_bar_text: string;
  announcement_bar_active: boolean;
  announcement_bar_link?: string;
  announcement_bar_link_text?: string;
  onboarding_api_key_video?: string;
}): Promise<{ error: string | null }> {
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

  return { error: null };
}
