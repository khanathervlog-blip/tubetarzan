import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isExemptFromAllChecks } from "@/lib/admin-exemption";

const PLAN_LIPSYNC_LIMITS: Record<string, number> = {
  free: 0, creator: 5, pro: 20, agency: 60,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { videoUrl, audioUrl, quality = "balanced" } = await request.json();
  if (!videoUrl || !audioUrl) return NextResponse.json({ error: "videoUrl and audioUrl required" }, { status: 400 });

  const svc = await createServiceClient();
  const { data: profile } = await svc.from("profiles").select("subscription_plan").eq("id", user.id).single();
  const plan = (profile?.subscription_plan as string) || "free";

  const exempt = await isExemptFromAllChecks(user.id);
  if (!exempt) {
    const limit = PLAN_LIPSYNC_LIMITS[plan] ?? 0;
    if (limit === 0) return NextResponse.json({ error: "upgrade_required", plan }, { status: 403 });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await svc
      .from("lipsync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    if ((count || 0) >= limit) {
      return NextResponse.json({ error: "monthly_limit_reached", used: count, limit }, { status: 429 });
    }
  }

  const { data: job, error: dbErr } = await svc
    .from("lipsync_jobs")
    .insert({
      user_id: user.id,
      video_input_url: videoUrl,
      audio_input_url: audioUrl,
      quality,
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const railwayUrl = process.env.FFMPEG_SERVICE_URL;
  const railwayToken = process.env.RAILWAY_SERVICE_TOKEN;

  if (railwayUrl && railwayToken) {
    fetch(`${railwayUrl}/lipsync/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${railwayToken}` },
      body: JSON.stringify({ job_id: job.id, video_url: videoUrl, audio_url: audioUrl, quality }),
    }).then(async (res) => {
      const result = await res.json();
      if (result.status === "complete" && result.output_path) {
        await svc.from("lipsync_jobs").update({
          status: "complete",
          output_url: result.output_path,
          duration_seconds: result.duration,
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);
      } else if (result.status === "failed") {
        await svc.from("lipsync_jobs").update({
          status: "failed", error: result.error,
        }).eq("id", job.id);
      }
    }).catch(async (err) => {
      await svc.from("lipsync_jobs").update({
        status: "failed", error: String(err),
      }).eq("id", job.id);
    });
  } else {
    // Railway not configured — mark as failed immediately
    await svc.from("lipsync_jobs").update({
      status: "failed", error: "Railway service not configured",
    }).eq("id", job.id);
  }

  return NextResponse.json({ jobId: job.id });
}
