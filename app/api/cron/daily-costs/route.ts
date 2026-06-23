import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function verifyCron(request: Request): boolean {
  const vercelCron = request.headers.get("x-vercel-cron");
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return !!(vercelCron || (secret && auth === `Bearer ${secret}`));
}

const COST_PER_SCAN_USD = 0.004;

export async function GET(request: Request) {
  if (!verifyCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  let totalScans = 0;
  try {
    const { data } = await svc
      .from("profiles")
      .select("scans_today")
      .gt("scans_today", 0);
    totalScans = (data || []).reduce((sum: number, p: { scans_today: number }) => sum + (p.scans_today || 0), 0);
  } catch { /* ignore */ }

  const estimatedCostUsd = +(totalScans * COST_PER_SCAN_USD).toFixed(4);

  try {
    await svc.from("daily_costs").upsert(
      {
        date: today,
        service: "ai_total",
        units_used: totalScans,
        estimated_cost_usd: estimatedCostUsd,
      },
      { onConflict: "date,service" }
    );
  } catch { /* ignore if table not yet created */ }

  return NextResponse.json({ date: today, totalScans, estimatedCostUsd });
}
