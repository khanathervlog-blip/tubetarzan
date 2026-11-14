/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { LIPSYNC_BUCKET, runOnSpace, lipsyncConfigured } from "@/lib/lipsync-server";

// Waiting for the GPU is idle time (no Active CPU), but it can take a couple of minutes per clip.
export const maxDuration = 300;

const MAX_ATTEMPTS = 2; // one retry, then the clip is marked failed (failed clips don't use the allowance)

/**
 * POST: lip-sync ONE clip. The browser calls this for each clip in turn - no polling, no background job.
 * Response: { status: "complete", downloadUrl } | { status: "paused", error } | { status: "failed", error, canRetry }
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!lipsyncConfigured()) return NextResponse.json({ status: "failed", error: "Lip Sync GPU is not configured yet.", canRetry: false }, { status: 503 });

  const svc = await createServiceClient();
  const { data: clip } = await svc
    .from("lipsync_clips")
    .select("id, run_id, user_id, idx, duration_sec, video_path, audio_path, output_path, status, attempts")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: run } = await svc.from("lipsync_runs").select("id, status").eq("id", clip.run_id).single();
  if (!run || run.status === "uploading") return NextResponse.json({ status: "failed", error: "Upload not finished yet.", canRetry: true }, { status: 409 });

  if (clip.status === "complete" && clip.output_path) {
    const { data: s } = await svc.storage.from(LIPSYNC_BUCKET).createSignedUrl(clip.output_path, 3600, { download: true });
    return NextResponse.json({ status: "complete", downloadUrl: s?.signedUrl || null });
  }
  if (clip.attempts >= MAX_ATTEMPTS && clip.status === "failed") {
    return NextResponse.json({ status: "failed", error: "This clip failed twice.", canRetry: false });
  }

  // Claim the clip (guards against double clicks / two tabs). A clip stuck in "processing" for over
  // 15 minutes (e.g. the function was stopped) can be claimed again.
  const staleBefore = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: claimed } = await svc
    .from("lipsync_clips")
    .update({ status: "processing", started_at: new Date().toISOString(), attempts: clip.attempts + 1, error: null })
    .eq("id", clip.id)
    .or(`status.in.(pending,failed),and(status.eq.processing,started_at.lt.${staleBefore})`)
    .select("id")
    .maybeSingle();
  if (!claimed) return NextResponse.json({ status: "processing", error: "Already running." }, { status: 409 });
  await svc.from("lipsync_runs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", run.id);

  const n = String(clip.idx + 1).padStart(2, "0");
  const outputPath = clip.output_path || clip.video_path.replace(/[^/]+$/, `part${n}-lipsync.mp4`);
  const [video, audio, upload] = await Promise.all([
    svc.storage.from(LIPSYNC_BUCKET).createSignedUrl(clip.video_path, 3600),
    svc.storage.from(LIPSYNC_BUCKET).createSignedUrl(clip.audio_path, 3600),
    svc.storage.from(LIPSYNC_BUCKET).createSignedUploadUrl(outputPath, { upsert: true }),
  ]);
  if (!video.data?.signedUrl || !audio.data?.signedUrl || !upload.data?.signedUrl) {
    await svc.from("lipsync_clips").update({ status: "failed", error: "Uploaded files not found." }).eq("id", clip.id);
    return NextResponse.json({ status: "failed", error: "Uploaded files not found. Please upload again.", canRetry: false });
  }

  const result = await runOnSpace({
    videoUrl: video.data.signedUrl,
    audioUrl: audio.data.signedUrl,
    uploadUrl: upload.data.signedUrl,
    seconds: Number(clip.duration_sec),
  });

  if (result.ok) {
    await svc
      .from("lipsync_clips")
      .update({ status: "complete", output_path: outputPath, key_fp: result.keyFp, completed_at: new Date().toISOString() })
      .eq("id", clip.id);
    const { count } = await svc
      .from("lipsync_clips")
      .select("id", { count: "exact", head: true })
      .eq("run_id", run.id)
      .eq("status", "complete");
    const { data: r } = await svc.from("lipsync_runs").select("clip_count").eq("id", run.id).single();
    const done = count || 0;
    await svc
      .from("lipsync_runs")
      .update({ done_count: done, status: r && done >= r.clip_count ? "complete" : "processing", updated_at: new Date().toISOString() })
      .eq("id", run.id);
    const { data: s } = await svc.storage.from(LIPSYNC_BUCKET).createSignedUrl(outputPath, 3600, { download: true });
    return NextResponse.json({ status: "complete", downloadUrl: s?.signedUrl || null });
  }

  if (result.paused) {
    // No GPU time left anywhere: put the clip back in the queue without using up an attempt
    await svc.from("lipsync_clips").update({ status: "pending", attempts: clip.attempts, error: result.error }).eq("id", clip.id);
    await svc.from("lipsync_runs").update({ status: "paused", error: result.error, updated_at: new Date().toISOString() }).eq("id", run.id);
    return NextResponse.json({ status: "paused", error: result.error });
  }

  const canRetry = clip.attempts + 1 < MAX_ATTEMPTS;
  await svc.from("lipsync_clips").update({ status: "failed", error: result.error }).eq("id", clip.id);
  return NextResponse.json({ status: "failed", error: result.error, canRetry });
}
