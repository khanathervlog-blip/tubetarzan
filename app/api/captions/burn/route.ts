import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, videoUrl, words, style, fontSize, position, primaryColor, highlightColor } = await request.json();
  if (!jobId || !videoUrl || !words) return NextResponse.json({ error: "jobId, videoUrl, and words required" }, { status: 400 });

  const svc = await createServiceClient();

  // Verify ownership
  const { data: job } = await svc.from("caption_jobs").select("id").eq("id", jobId).eq("user_id", user.id).single();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await svc.from("caption_jobs").update({
    status: "burning",
    caption_style: style || "classic_white",
    font_size: fontSize || 24,
    position: position || "bottom",
    primary_color: primaryColor || "#FFFFFF",
    highlight_color: highlightColor || "#FFD200",
  }).eq("id", jobId);

  const railwayUrl = process.env.FFMPEG_SERVICE_URL;
  const railwayToken = process.env.RAILWAY_SERVICE_TOKEN;
  if (!railwayUrl || !railwayToken) {
    return NextResponse.json({ error: "Railway service not configured" }, { status: 503 });
  }

  fetch(`${railwayUrl}/captions/burn`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${railwayToken}` },
    body: JSON.stringify({
      job_id: jobId, video_url: videoUrl, words,
      style: style || "classic_white",
      font_size: fontSize || 24,
      position: position || "bottom",
      primary_color: primaryColor || "#FFFFFF",
      highlight_color: highlightColor || "#FFD200",
    }),
  }).then(async (res) => {
    const result = await res.json();
    if (result.status === "complete" && result.output_path) {
      await svc.from("caption_jobs").update({
        status: "complete",
        output_url: result.output_path,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    } else {
      await svc.from("caption_jobs").update({
        status: "failed", error: result.error || "Burn failed",
      }).eq("id", jobId);
    }
  }).catch(async (err) => {
    await svc.from("caption_jobs").update({
      status: "failed", error: String(err),
    }).eq("id", jobId);
  });

  return NextResponse.json({ jobId, status: "burning" });
}
