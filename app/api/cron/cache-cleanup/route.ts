import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function verifyCron(request: Request): boolean {
  const vercelCron = request.headers.get("x-vercel-cron");
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return !!(vercelCron || (secret && auth === `Bearer ${secret}`));
}

const CUTOFFS: Record<string, number> = {
  search_cache: 7 * 24 * 60 * 60 * 1000,      // 7 days
  claude_ideas_cache: 24 * 60 * 60 * 1000,     // 24 hours
  transcript_cache: 30 * 24 * 60 * 60 * 1000,  // 30 days
};

export async function GET(request: Request) {
  if (!verifyCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const results: Record<string, number> = {};
  const now = Date.now();

  for (const [table, ttlMs] of Object.entries(CUTOFFS)) {
    const cutoff = new Date(now - ttlMs).toISOString();
    try {
      const { count } = await svc
        .from(table)
        .select("id", { count: "exact", head: true })
        .lt("created_at", cutoff);
      await svc.from(table).delete().lt("created_at", cutoff);
      results[table] = count || 0;
    } catch {
      results[table] = -1;
    }
  }

  return NextResponse.json({ cleaned: results, ran_at: new Date().toISOString() });
}
