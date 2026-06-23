import { createServiceClient } from "@/lib/supabase/server";
import { DollarSign, TrendingUp, TrendingDown, Users } from "lucide-react";
import type { Profile } from "@/types/database";

const PLAN_PRICES: Record<string, number> = { creator: 9, pro: 25, agency: 99 };
// Estimated monthly costs (update as needed)
const EST_API_COSTS = 312;
const EST_INFRA_COSTS = 120;
const LS_FEE_PCT = 0.0825; // 8.25% LemonSqueezy fees

export default async function RevenuePage() {
  const svc = await createServiceClient();

  const { data: profilesRaw } = await svc
    .from("profiles")
    .select("subscription_plan, subscription_status, created_at")
    .order("created_at", { ascending: false });

  const profiles = (profilesRaw as Pick<Profile, "subscription_plan" | "subscription_status" | "created_at">[] | null) || [];

  const active = profiles.filter(
    (p) => p.subscription_status === "active" || p.subscription_status === "trialing"
  );

  const byPlan: Record<string, number> = {};
  for (const p of active) {
    const plan = p.subscription_plan || "free";
    byPlan[plan] = (byPlan[plan] || 0) + 1;
  }

  const grossMrr = active.reduce((sum, p) => sum + (PLAN_PRICES[p.subscription_plan || ""] || 0), 0);
  const lsFees = Math.round(grossMrr * LS_FEE_PCT * 100) / 100;
  const netMrr = grossMrr - lsFees - EST_API_COSTS - EST_INFRA_COSTS;
  const arr = grossMrr * 12;
  const margin = grossMrr > 0 ? Math.round((netMrr / grossMrr) * 100) : 0;

  const thisMonth = new Date();
  thisMonth.setDate(1);
  const churned = profiles.filter(
    (p) => p.subscription_status === "canceled" && p.created_at >= thisMonth.toISOString()
  ).length;
  const newThisMonth = profiles.filter((p) => p.created_at >= thisMonth.toISOString()).length;

  // Projections (simple linear with 12% MoM growth)
  const GROWTH = 1.12;
  const proj3 = Math.round(grossMrr * Math.pow(GROWTH, 3));
  const proj6 = Math.round(grossMrr * Math.pow(GROWTH, 6));
  const proj12 = Math.round(grossMrr * Math.pow(GROWTH, 12));

  const PLAN_ITEMS = [
    { plan: "Creator", price: 9, count: byPlan.creator || 0 },
    { plan: "Pro", price: 25, count: byPlan.pro || 0 },
    { plan: "Agency", price: 99, count: byPlan.agency || 0 },
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-[#22C55E]" /> Revenue Analytics
        </h1>
        <p className="text-[#555555] text-sm">Live P&L — costs are estimates based on known spend</p>
      </div>

      {/* P&L */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-6">
        <p className="text-[#555555] text-xs font-bold uppercase tracking-widest mb-4">This Month</p>
        <div className="space-y-3">
          {[
            { label: "Gross Revenue (MRR)", value: `$${grossMrr.toLocaleString()}`, color: "#22C55E", sign: "+" },
            { label: "LemonSqueezy Fees (~8.25%)", value: `-$${lsFees.toFixed(0)}`, color: "#FF3B3B", sign: "" },
            { label: "Claude / OpenAI API (est.)", value: `-$${EST_API_COSTS}`, color: "#FF3B3B", sign: "" },
            { label: "Infrastructure / Railway (est.)", value: `-$${EST_INFRA_COSTS}`, color: "#FF3B3B", sign: "" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-[#999999] text-sm">{row.label}</span>
              <span className="font-mono-stats font-bold text-sm" style={{ color: row.color }}>{row.value}</span>
            </div>
          ))}
          <div className="border-t border-[#1E1E1E] pt-3 flex items-center justify-between">
            <span className="text-white font-semibold text-sm">Net Profit</span>
            <span className={`font-mono-stats font-bold text-lg ${netMrr >= 0 ? "text-[#22C55E]" : "text-[#FF3B3B]"}`}>
              ${netMrr.toFixed(0)} <span className="text-sm font-normal text-[#555555]">({margin}% margin)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "MRR", value: `$${grossMrr.toLocaleString()}`, icon: DollarSign, color: "#22C55E" },
          { label: "ARR", value: `$${arr.toLocaleString()}`, icon: TrendingUp, color: "#FFD200" },
          { label: "New This Month", value: newThisMonth.toString(), icon: Users, color: "#22C55E" },
          { label: "Churned", value: churned.toString(), icon: TrendingDown, color: "#FF3B3B" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#555555] text-xs">{stat.label}</span>
                <div className="w-7 h-7 rounded-badge flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="font-mono-stats font-bold text-xl" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* By plan */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-6">
        <p className="text-white font-semibold text-sm mb-4">Revenue by Plan</p>
        <div className="space-y-3">
          {PLAN_ITEMS.map((p) => {
            const revenue = p.count * p.price;
            const pct = grossMrr > 0 ? (revenue / grossMrr) * 100 : 0;
            return (
              <div key={p.plan} className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <p className="text-[#999999] text-xs">{p.plan} (${p.price}/mo)</p>
                  <p className="text-white text-xs font-bold">{p.count} users</p>
                </div>
                <div className="flex-1 h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#FFD200]" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono-stats text-sm text-[#22C55E] font-bold w-16 text-right">
                  ${revenue.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Projections */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
        <p className="text-white font-semibold text-sm mb-1">Growth Projections</p>
        <p className="text-[#555555] text-xs mb-4">Based on 12% month-over-month growth</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Month 3", value: proj3 },
            { label: "Month 6", value: proj6 },
            { label: "Month 12", value: proj12 },
          ].map((p) => (
            <div key={p.label} className="text-center">
              <p className="text-[#555555] text-xs mb-1">{p.label}</p>
              <p className="font-mono-stats font-bold text-lg text-[#FFD200]">${p.value.toLocaleString()}</p>
              <p className="text-[#333333] text-xs">MRR</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
