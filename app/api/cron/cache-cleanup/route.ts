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

  return NextResponse.json({ cleaned: results, ran_at: new Date().toISOString() });
}
