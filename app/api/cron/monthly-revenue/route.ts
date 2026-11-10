import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronRequest } from "@/lib/cron-auth";


const PLAN_PRICE: Record<string, number> = { creator: 9, pro: 25, agency: 99 };

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = await createServiceClient();
  const now = new Date();
  // monthly_revenue uses a date column — store as first of the month
  const monthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const counts: Record<string, number> = { creator: 0, pro: 0, agency: 0 };
  await Promise.all(
    Object.keys(counts).map(async (plan) => {
      const { count } = await svc
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "active")
        .eq("subscription_plan", plan);
      counts[plan] = count || 0;
    })
  );

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
