import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runOneGoPipeline } from "@/lib/one-go-pipeline";

// GET /api/admin/one-go/scheduled — Vercel cron: 0 3 * * 5 (Friday 3am UTC = 8am PKT)
export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // Load config
  const { data: config } = await supabase
    .from("one_go_config")
    .select("*")
    .limit(1)
    .single();

  if (!config) {
    return NextResponse.json({ skipped: "No config" });
  }

  if (!config.weekly_schedule_active) {
    return NextResponse.json({ skipped: "Weekly schedule disabled" });
  }

  // Check monthly limit
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("one_go_jobs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", thisMonth.toISOString());

  if ((count || 0) >= (config.max_runs_per_month || 8)) {
    return NextResponse.json({ skipped: "Monthly limit reached", count });
  }

  // Create job
  const { data: job, error } = await supabase
    .from("one_go_jobs")
    .insert({
      channel_id: config.channel_id,
      channel_handle: config.channel_handle,
      channel_niche: config.channel_niche,
      face_video_url: config.face_video_url,
      voice_preset_id: config.voice_preset_id,
      caption_style: config.caption_style,
      auto_post: config.auto_post,
      post_platforms: config.post_platforms,
      overall_status: "running",
      current_step: "Scheduled run starting...",
      progress_percent: 0,
    })
    .select()
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  // Fire pipeline (non-blocking — cron has a 60s response timeout)
  runOneGoPipeline(job.id, config).catch((err) => {
    console.error("[OneGo][Cron] Pipeline error:", err);
  });

  return NextResponse.json({ started: true, jobId: job.id });
}
