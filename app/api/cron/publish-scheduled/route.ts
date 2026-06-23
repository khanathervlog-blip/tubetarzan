import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Runs every minute via Vercel cron
// Publishes scheduled posts whose scheduled_for time has passed

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow Vercel cron header or explicit CRON_SECRET
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  if (!vercelCronHeader && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = await createServiceClient();

  // Gracefully handle table not existing yet
  let duePosts: Record<string, unknown>[] = [];
  try {
    const { data, error } = await svc
      .from("social_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .limit(10);

    if (error) {
      // Table doesn't exist yet
      return NextResponse.json({ processed: 0, message: "social_posts table not yet created" });
    }
    duePosts = (data as Record<string, unknown>[]) || [];
  } catch {
    return NextResponse.json({ processed: 0, message: "social_posts table not yet created" });
  }

  if (!duePosts.length) {
    return NextResponse.json({ processed: 0, message: "No scheduled posts due" });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const post of duePosts) {
    try {
      const postId = post.id as string;
      const platform = post.platform as string;
      const userId = post.user_id as string;

      // Mark as publishing
      await svc
        .from("social_posts")
        .update({ status: "publishing" })
        .eq("id", postId);

      if (platform === "youtube") {
        // For YouTube: get user's OAuth token and update video status
        const { data: profile } = await svc
          .from("profiles")
          .select("youtube_access_token, youtube_token_expires_at")
          .eq("id", userId)
          .single();

        const youtubeVideoId = post.platform_post_id as string;

        if (profile?.youtube_access_token && youtubeVideoId) {
          const ytRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=status`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${profile.youtube_access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: youtubeVideoId,
                status: {
                  privacyStatus: "public",
                  publishAt: null,
                },
              }),
            }
          );

          if (!ytRes.ok) {
            throw new Error(`YouTube API returned ${ytRes.status}`);
          }

          await svc
            .from("social_posts")
            .update({
              status: "published",
              published_at: new Date().toISOString(),
              platform_post_url: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
            })
            .eq("id", postId);
        } else {
          // No token or video ID — mark as note-only (done)
          await svc
            .from("social_posts")
            .update({
              status: "published",
              published_at: new Date().toISOString(),
              error_message: "Reminder only — no YouTube video linked",
            })
            .eq("id", postId);
        }
      } else {
        // Other platforms (Instagram, TikTok) — mark as done with note
        await svc
          .from("social_posts")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
            error_message: `${platform} posting not yet integrated — reminder only`,
          })
          .eq("id", postId);
      }

      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Post ${post.id}: ${message}`);

      await svc
        .from("social_posts")
        .update({ status: "failed", error_message: message })
        .eq("id", post.id as string);
    }
  }

  return NextResponse.json({ processed, errors: errors.length > 0 ? errors : undefined });
}
