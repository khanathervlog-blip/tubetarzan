/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getLipsyncAccess, LIPSYNC_BUCKET } from "@/lib/lipsync-server";
import { LIPSYNC_MAX_CLIP_SECONDS } from "@/lib/plans";

/** GET: my access/allowance + my recent runs (with download links for finished clips). Called once per page open. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getLipsyncAccess(user.id, user.email);
  const svc = await createServiceClient();
  const { data: runs, error } = await svc
    .from("lipsync_runs")
    .select("id, created_at, source_name, mode, status, total_seconds, clip_count, done_count, error")
    .eq("user_id", user.id)
    .neq("status", "expired")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    // Table missing = PHASE9_MIGRATIONS.sql not run yet
    return NextResponse.json({ access: { ...access, allowed: false, reason: "not_set_up" }, runs: [] });
  }

  const runIds = (runs || []).map((r: any) => r.id);
  const { data: clips } = runIds.length
    ? await svc
        .from("lipsync_clips")
        .select("id, run_id, idx, start_sec, duration_sec, status, error, output_path, attempts")
        .in("run_id", runIds)
        .order("idx")
    : { data: [] as any[] };

  // Signed download links for finished clips (valid 1 hour)
  const outputs = (clips || []).filter((c: any) => c.status === "complete" && c.output_path).map((c: any) => c.output_path);
  const links = new Map<string, string>();
  if (outputs.length) {
    const { data: signed } = await svc.storage.from(LIPSYNC_BUCKET).createSignedUrls(outputs, 3600, { download: true });
    for (const s of signed || []) if (s.path && s.signedUrl) links.set(s.path, s.signedUrl);
  }

  return NextResponse.json({
    access,
    runs: (runs || []).map((r: any) => ({
      ...r,
      clips: (clips || [])
        .filter((c: any) => c.run_id === r.id)
        .map((c: any) => ({
          id: c.id,
          idx: c.idx,
          start: Number(c.start_sec),
          duration: Number(c.duration_sec),
          status: c.status,
          error: c.error,
          attempts: c.attempts,
          downloadUrl: c.output_path ? links.get(c.output_path) || null : null,
        })),
    })),
  });
}

/**
 * POST: create a run from clips the browser has already planned.
 * Body: { mode: "split" | "loop", sourceName, clips: [{ start, duration }] }
 * Returns one-time signed upload URLs; the browser uploads straight to Supabase Storage.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getLipsyncAccess(user.id, user.email);
  if (!access.allowed) return NextResponse.json({ error: access.reason || "not_allowed", access }, { status: 403 });
  if (!access.configured) return NextResponse.json({ error: "not_configured", access }, { status: 503 });

  let body: { mode?: string; sourceName?: string; clips?: { start: number; duration: number }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const mode = body.mode === "loop" ? "loop" : "split";
  const clips = (body.clips || []).map((c) => ({ start: Number(c.start) || 0, duration: Number(c.duration) || 0 }));
  if (!clips.length || clips.length > 150) return NextResponse.json({ error: "Between 1 and 150 clips are allowed." }, { status: 400 });
  if (clips.some((c) => c.duration <= 0.3 || c.duration > LIPSYNC_MAX_CLIP_SECONDS + 0.5)) {
    return NextResponse.json({ error: `Each clip must be ${LIPSYNC_MAX_CLIP_SECONDS} seconds or shorter.` }, { status: 400 });
  }
  const total = clips.reduce((s, c) => s + c.duration, 0);
  if (total > access.maxRunSeconds + 1) {
    const error =
      access.remainingSeconds !== null && total > access.remainingSeconds
        ? "monthly_limit_reached"
        : total > access.poolRemainingSeconds
          ? "daily_gpu_budget" // today's GPU safety budget of the key pool is used up
          : "too_long";
    return NextResponse.json({ error, totalSeconds: total, access }, { status: 429 });
  }

  const svc = await createServiceClient();
  const { data: run, error } = await svc
    .from("lipsync_runs")
    .insert({
      user_id: user.id,
      source_name: (body.sourceName || "").slice(0, 120) || null,
      mode,
      status: "uploading",
      total_seconds: Math.round(total * 100) / 100,
      clip_count: clips.length,
    })
    .select("id")
    .single();
  if (error || !run) return NextResponse.json({ error: error?.message || "Could not create the job" }, { status: 500 });

  const prefix = `${user.id}/${run.id}`;
  const sharedVideo = `${prefix}/face.mp4`;
  const rows = clips.map((c, idx) => {
    const n = String(idx + 1).padStart(2, "0");
    return {
      run_id: run.id,
      user_id: user.id,
      idx,
      start_sec: Math.round(c.start * 100) / 100,
      duration_sec: Math.round(c.duration * 100) / 100,
      video_path: mode === "loop" ? sharedVideo : `${prefix}/part${n}-video.mp4`,
      audio_path: `${prefix}/part${n}-audio.m4a`,
    };
  });
  const { error: clipErr } = await svc.from("lipsync_clips").insert(rows);
  if (clipErr) {
    await svc.from("lipsync_runs").delete().eq("id", run.id);
    return NextResponse.json({ error: clipErr.message }, { status: 500 });
  }

  const paths = Array.from(new Set(rows.flatMap((r) => [r.video_path, r.audio_path])));
  const uploads: Record<string, { path: string; token: string }> = {};
  for (const p of paths) {
    const { data: signed, error: upErr } = await svc.storage.from(LIPSYNC_BUCKET).createSignedUploadUrl(p, { upsert: true });
    if (upErr || !signed) {
      await svc.from("lipsync_runs").delete().eq("id", run.id);
      return NextResponse.json({ error: `Storage is not ready: ${upErr?.message || "no upload URL"}. Run PHASE9_MIGRATIONS.sql.` }, { status: 500 });
    }
    uploads[p] = { path: signed.path, token: signed.token };
  }

  return NextResponse.json({
    runId: run.id,
    clips: rows.map((r) => ({ idx: r.idx, videoPath: r.video_path, audioPath: r.audio_path })),
    uploads,
  });
}
