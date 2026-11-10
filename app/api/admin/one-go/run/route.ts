import { type NextRequest, NextResponse } from "next/server";
import { runOneGoPipeline } from "@/lib/one-go-pipeline";

// POST /api/admin/one-go/run — internal endpoint fired by POST /api/admin/one-go
// Protected by x-admin-secret header (not session cookie — runs async/background)
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== (process.env.ADMIN_SECRET || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { jobId: string; config: Record<string, unknown> };
  const { jobId, config } = body;

  if (!jobId || !config) {
    return NextResponse.json({ error: "jobId and config required" }, { status: 400 });
  }

  // Run pipeline non-blocking — respond immediately so the caller doesn't time out.
  // The pipeline updates the DB at each step; the admin UI polls /api/admin/one-go/status.
  runOneGoPipeline(jobId, config as unknown as Parameters<typeof runOneGoPipeline>[1]).catch((err) => {
    console.error("[OneGo] Uncaught pipeline error:", err);
  });

  return NextResponse.json({ ok: true, jobId });
}
