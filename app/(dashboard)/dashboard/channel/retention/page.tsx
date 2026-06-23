import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import RetentionAnalysis from "@/components/dashboard/RetentionAnalysis";

export default async function RetentionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svc = await createServiceClient();
  const { data: profile } = await svc.from("profiles").select("locked_channel_id").eq("id", user.id).single();

  let channelVideos: { video_id: string; title: string; view_count: number }[] = [];
  if (profile?.locked_channel_id) {
    const { data: videos } = await svc
      .from("channel_video_cache")
      .select("video_id, title, view_count")
      .eq("user_id", user.id)
      .eq("channel_id", profile.locked_channel_id)
      .order("view_count", { ascending: false })
      .limit(20);
    channelVideos = (videos as typeof channelVideos) || [];
  }

  return <RetentionAnalysis channelVideos={channelVideos} />;
}
