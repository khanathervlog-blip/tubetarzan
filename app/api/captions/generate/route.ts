import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isExemptFromAllChecks } from "@/lib/admin-exemption";

const PLAN_CAPTION_LIMITS: Record<string, number> = {
  free: 3, creator: 20, pro: 100, agency: 999,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { videoUrl, language } = await request.json();
  if (!videoUrl) return NextResponse.json({ error: "videoUrl required" }, { status: 400 });

  const svc = await createServiceClient();
  const { data: profile } = await svc.from("profiles").select("subscription_plan").eq("id", user.id).single();
  const plan = (profile?.subscription_plan as string) || "free";

  const exempt = await isExemptFromAllChecks(user.id);
  if (!exempt) {
    const limit = PLAN_CAPTION_LIMITS[plan] ?? 3;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await svc
      .from("caption_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());
    if ((count || 0) >= limit) {
      return NextResponse.json({ error: "monthly_limit_reached", used: count, limit }, { status: 429 });
    }
  }

  const { data: job, error: dbErr } = await svc
    .from("caption_jobs")
    .insert({ user_id: user.id, video_input_url: videoUrl, status: "generating" })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const railwayUrl = process.env.FFMPEG_SERVICE_URL;
  const railwayToken = process.env.RAILWAY_SERVICE_TOKEN;

  if (!railwayUrl || !railwayToken) {
    await svc.from("caption_jobs").update({ status: "failed", error: "Railway not configured" }).eq("id", job.id);
    return NextResponse.json({ error: "Railway service not configured" }, { status: 503 });
  }

  const res = await fetch(`${railwayUrl}/captions/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${railwayToken}` },
    body: JSON.stringify({ job_id: job.id, video_url: videoUrl, language: language || null }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Railway error" }));
    await svc.from("caption_jobs").update({ status: "failed", error: err.detail || "Railway error" }).eq("id", job.id);
    return NextResponse.json({ error: err.detail || "Transcription failed" }, { status: 500 });
  }

  const result = await res.json();

  await svc.from("caption_jobs").update({
    status: "editing",
    language_detected: result.language_detected,
    srt_content: result.srt,
    words_json: result.words,
    segment_count: result.segment_count,
    word_count: result.word_count,
  }).eq("id", job.id);

  return NextResponse.json({
    jobId: job.id,
    languageDetected: result.language_detected,
    words: result.words,
    srt: result.srt,
    wordCount: result.word_count,
    duration: result.duration,
  });
}
