import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, segmentDuration = 58 } = await request.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const svc = await createServiceClient();
  const { data: job } = await svc
    .from("lipsync_jobs")
    .select("output_url")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job?.output_url) return NextResponse.json({ error: "Job not found or not complete" }, { status: 404 });

  const railwayUrl = process.env.FFMPEG_SERVICE_URL;
  const railwayToken = process.env.RAILWAY_SERVICE_TOKEN;
  if (!railwayUrl || !railwayToken) {
    return NextResponse.json({ error: "Railway service not configured" }, { status: 503 });
  }

  const res = await fetch(`${railwayUrl}/lipsync/split`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${railwayToken}` },
    body: JSON.stringify({ job_id: jobId, video_url: job.output_url, segment_duration: segmentDuration }),
  });

  if (!res.ok) return NextResponse.json({ error: "Split failed" }, { status: 500 });
  const result = await res.json();

  await svc.from("lipsync_jobs").update({
    parts_urls: result.parts,
    parts_count: result.total_segments,
  }).eq("id", jobId);

  return NextResponse.json(result);
}
