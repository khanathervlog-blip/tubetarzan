import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/youtube-auth";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: ops, error } = await supabase
    .from("bulk_operations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error?.code === "42P01") return NextResponse.json({ ops: [], tableExists: false });
  return NextResponse.json({ ops: ops || [], tableExists: true });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const { data: profileRaw } = await svc
    .from("profiles")
    .select("subscription_plan, email, locked_channel_id")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { subscription_plan: string; email: string; locked_channel_id: string | null } | null;

  const isAdmin = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim()).includes(profile?.email || "");
  const plan = profile?.subscription_plan || "free";
  if (plan === "free" && !isAdmin) {
    return NextResponse.json({ error: "Bulk operations require Creator plan or above", upgradeRequired: true }, { status: 403 });
  }
  if (!profile?.locked_channel_id) {
    return NextResponse.json({ error: "No YouTube channel connected" }, { status: 400 });
  }

  const { operationType, params } = await request.json();
  const validOps = ["add_title_prefix", "add_title_suffix", "replace_tag", "add_tag", "remove_tag", "update_description_footer"];
  if (!validOps.includes(operationType)) {
    return NextResponse.json({ error: "Invalid operation type" }, { status: 400 });
  }

  // Get channel videos
  const { data: videos } = await svc
    .from("channel_video_cache")
    .select("video_id, title, description, tags")
    .eq("user_id", user.id)
    .eq("channel_id", profile.locked_channel_id);

  if (!videos?.length) return NextResponse.json({ error: "No videos found. Sync your channel first." }, { status: 400 });

  // Create operation record
  const { data: op } = await svc.from("bulk_operations").insert({
    user_id: user.id,
    operation_type: operationType,
    params: params || {},
    status: "running",
    total_videos: videos.length,
    started_at: new Date().toISOString(),
  }).select().single();

  if (!op) return NextResponse.json({ error: "Failed to create operation" }, { status: 500 });

  // Run synchronously (Next.js doesn't support true background without edge runtime)
  // Process with rate limiting: 1 call per second
  let processed = 0;
  let failed = 0;
  const errorLog: { videoId: string; error: string }[] = [];

  try {
    const accessToken = await getValidAccessToken(user.id);

    for (const video of videos) {
      try {
        const videoRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${video.video_id}&key=${process.env.YOUTUBE_API_KEY}`
        );
        const videoData = await videoRes.json();
        const snippet = videoData.items?.[0]?.snippet;
        if (!snippet) { failed++; continue; }

        const updatedSnippet = { ...snippet };

        if (operationType === "add_title_prefix") {
          updatedSnippet.title = `${params.value} ${snippet.title}`.slice(0, 100);
        } else if (operationType === "add_title_suffix") {
          updatedSnippet.title = `${snippet.title} ${params.value}`.slice(0, 100);
        } else if (operationType === "add_tag") {
          updatedSnippet.tags = [...(snippet.tags || []), params.value].slice(0, 500);
        } else if (operationType === "remove_tag") {
          updatedSnippet.tags = (snippet.tags || []).filter((t: string) => t !== params.value);
        } else if (operationType === "replace_tag") {
          updatedSnippet.tags = (snippet.tags || []).map((t: string) => t === params.from ? params.to : t);
        } else if (operationType === "update_description_footer") {
          const desc = snippet.description || "";
          const marker = "\n\n---\n";
          const base = desc.includes(marker) ? desc.split(marker)[0] : desc;
          updatedSnippet.description = `${base}${marker}${params.value}`;
        }

        const updateRes = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet", {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id: video.video_id, snippet: updatedSnippet }),
        });

        if (updateRes.ok) {
          processed++;
        } else {
          failed++;
          errorLog.push({ videoId: video.video_id, error: `HTTP ${updateRes.status}` });
        }

        // Rate limit: 1 call/second
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        failed++;
        errorLog.push({ videoId: video.video_id, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }
  } catch (err) {
    await svc.from("bulk_operations").update({
      status: "failed",
      processed_videos: processed,
      failed_videos: failed,
      error_log: errorLog,
      completed_at: new Date().toISOString(),
    }).eq("id", op.id);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Operation failed" }, { status: 500 });
  }

  await svc.from("bulk_operations").update({
    status: "completed",
    processed_videos: processed,
    failed_videos: failed,
    error_log: errorLog,
    completed_at: new Date().toISOString(),
  }).eq("id", op.id);

  return NextResponse.json({ opId: op.id, processed, failed, total: videos.length });
}
