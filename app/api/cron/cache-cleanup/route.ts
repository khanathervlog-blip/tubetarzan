import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronRequest } from "@/lib/cron-auth";


const CUTOFFS: Record<string, number> = {
  search_cache: 7 * 24 * 60 * 60 * 1000,      // 7 days
  claude_ideas_cache: 24 * 60 * 60 * 1000,     // 24 hours
  transcript_cache: 30 * 24 * 60 * 60 * 1000,  // 30 days
};

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const results: Record<string, number> = {};
  const now = Date.now();

  for (const [table, ttlMs] of Object.entries(CUTOFFS)) {
    const cutoff = new Date(now - ttlMs).toISOString();
    try {
      const { count } = await svc
        .from(table)
        .delete({ count: "exact" })
        .lt("created_at", cutoff);
      results[table] = count || 0;
    } catch {
      results[table] = -1;
    }
  }

  // Visitor analytics: keep 180 days of page views, 1 day of "live now" rows
  const extra: [string, string, number][] = [
    ["page_views", "ts", 180 * 24 * 60 * 60 * 1000],
    ["live_presence", "last_seen", 24 * 60 * 60 * 1000],
  ];
  for (const [table, column, ttlMs] of extra) {
    try {
      const { count, error } = await svc.from(table).delete({ count: "exact" }).lt(column, new Date(now - ttlMs).toISOString());
      results[table] = error ? -1 : count || 0;
    } catch {
      results[table] = -1;
    }
  }

  // Lip Sync: delete clip files after 7 days (Supabase free tier has 1 GB of storage). Small batch per day.
  try {
    const { data: oldRuns } = await svc
      .from("lipsync_runs")
      .select("id")
      .lt("created_at", new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString())
      .neq("status", "expired")
      .limit(50);
    let removed = 0;
    for (const run of oldRuns || []) {
      const { data: clips } = await svc.from("lipsync_clips").select("video_path, audio_path, output_path").eq("run_id", run.id);
      const paths = Array.from(
        new Set((clips || []).flatMap((c) => [c.video_path, c.audio_path, c.output_path]).filter(Boolean) as string[])
      );
      for (let i = 0; i < paths.length; i += 100) await svc.storage.from("lipsync").remove(paths.slice(i, i + 100));
      removed += paths.length;
      await svc.from("lipsync_runs").update({ status: "expired" }).eq("id", run.id);
    }
    results.lipsync_files = removed;
  } catch {
    results.lipsync_files = -1;
  }

  return NextResponse.json({ cleaned: results, ran_at: new Date().toISOString() });
}
