/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { LIPSYNC_BUCKET } from "@/lib/lipsync-server";

async function ownRun(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, run: null };
  const svc = await createServiceClient();
  const { data: run } = await svc.from("lipsync_runs").select("id, user_id, status").eq("id", id).eq("user_id", user.id).single();
  return { user, run, svc };
}

/** PATCH { status: "ready" } once the browser finished uploading every clip. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user, run, svc } = await ownRun(params.id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!run || !svc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { status } = (await request.json().catch(() => ({}))) as { status?: string };
  if (status !== "ready") return NextResponse.json({ error: "Only status=ready is allowed" }, { status: 400 });
  if (run.status !== "uploading") return NextResponse.json({ ok: true, status: run.status });
  await svc.from("lipsync_runs").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", run.id);
  return NextResponse.json({ ok: true, status: "ready" });
}

/** DELETE: remove the run and every file it stored (frees Supabase Storage). */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user, run, svc } = await ownRun(params.id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!run || !svc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: clips } = await svc.from("lipsync_clips").select("video_path, audio_path, output_path").eq("run_id", run.id);
  const paths = Array.from(new Set((clips || []).flatMap((c: any) => [c.video_path, c.audio_path, c.output_path]).filter(Boolean)));
  for (let i = 0; i < paths.length; i += 100) await svc.storage.from(LIPSYNC_BUCKET).remove(paths.slice(i, i + 100));
  await svc.from("lipsync_runs").delete().eq("id", run.id);
  return NextResponse.json({ ok: true });
}
