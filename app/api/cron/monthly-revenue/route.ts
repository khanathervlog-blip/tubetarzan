import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function verifyCron(request: Request): boolean {
  const vercelCron = request.headers.get("x-vercel-cron");
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return !!(vercelCron || (secret && auth === `Bearer ${secret}`));
}

const PLAN_PRICE: Record<string, number> = { creator: 9, pro: 25, agency: 99 };

export async function GET(request: Request) {
  if (!verifyCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const now = new Date();
  // monthly_revenue uses a date column — store as first of the month
  const monthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: subscribers } = await svc
    .from("profiles")
    .select("subscription_plan, subscription_status")
    .eq("subscription_status", "active")
    .in("subscription_plan", ["creator", "pro", "agency"]);

  const counts: Record<string, number> = { creator: 0, pro: 0, agency: 0 };
  for (const s of (subscribers || []) as { subscription_plan: string }[]) {
    counts[s.subscription_plan] = (counts[s.subscription_plan] || 0) + 1;
  }

  const grossRevenue = Object.entries(counts).reduce(
    (sum, [plan, n]) => sum + n * (PLAN_PRICE[plan] || 0),
    0
  );
  const lsFees = +(grossRevenue * 0.0825).toFixed(2);
  const apiCosts = 312;
  const infraCosts = 120;
  const netRevenue = +(grossRevenue - lsFees - apiCosts - infraCosts).toFixed(2);

  try {
    await svc.from("monthly_revenue").upsert(
      {
        month: monthDate,
        gross_revenue_usd: grossRevenue,
        lemonsqueezy_fees_usd: lsFees,
        api_costs_usd: apiCosts,
        infra_costs_usd: infraCosts,
        net_revenue_usd: netRevenue,
        creator_count: counts.creator,
        pro_count: counts.pro,
        agency_count: counts.agency,
      },
      { onConflict: "month" }
    );
  } catch { /* ignore if table not yet created */ }

  return NextResponse.json({ month: monthDate, grossRevenue, netRevenue, counts });
}
