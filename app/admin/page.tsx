import { createClient } from "@/lib/supabase/server";
import { DollarSign, Users, TrendingUp, UserX } from "lucide-react";
import type { Profile } from "@/types/database";

async function getAdminStats() {
  const supabase = await createClient();

  const [{ data: profilesRaw }, { data: leadsRaw }] = await Promise.all([
    supabase.from("profiles").select("subscription_plan, subscription_status, created_at"),
    supabase.from("leads").select("id, created_at"),
  ]);

  const plans = (profilesRaw as Pick<Profile, "subscription_plan" | "subscription_status" | "created_at">[] | null) || [];

  const active = plans.filter(
    (p) => p.subscription_status === "active" || p.subscription_status === "trialing"
  );
  const trials = plans.filter((p) => p.subscription_status === "trialing");
  const free = plans.filter((p) => !p.subscription_plan || p.subscription_plan === "free");

  const PLAN_PRICES: Record<string, number> = {
    creator: 9,
    pro: 25,
    agency: 99,
  };

  const mrr = active.reduce((sum, p) => {
    return sum + (PLAN_PRICES[p.subscription_plan || ""] || 0);
  }, 0);

  const today = new Date().toISOString().split("T")[0];
  const newToday = plans.filter(
    (p) => p.created_at.startsWith(today)
  ).length;

  const thisMonth = new Date();
  thisMonth.setDate(1);
  const churned = plans.filter(
    (p) =>
      p.subscription_status === "canceled" &&
      p.created_at >= thisMonth.toISOString()
  ).length;

  return {
    mrr,
    active: active.length,
    trials: trials.length,
    free: free.length,
    churned,
    newToday,
    totalLeads: leadsRaw?.length || 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  const STATS = [
    {
      label: "Monthly Revenue (MRR)",
      value: `$${stats.mrr.toLocaleString()}`,
      icon: DollarSign,
      color: "#22C55E",
    },
    {
      label: "Active Subscribers",
      value: stats.active.toString(),
      icon: Users,
      color: "#FFD200",
    },
    {
      label: "Trial Users",
      value: stats.trials.toString(),
      icon: TrendingUp,
      color: "#FF3B3B",
    },
    {
      label: "Free Users",
      value: stats.free.toString(),
      icon: Users,
      color: "#999999",
    },
    {
      label: "Churned This Month",
      value: stats.churned.toString(),
      icon: UserX,
      color: "#FF3B3B",
    },
    {
      label: "New Today",
      value: stats.newToday.toString(),
      icon: TrendingUp,
      color: "#22C55E",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">
          Dashboard Overview
        </h1>
        <p className="text-[#555555] text-sm">
          Platform health at a glance
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#555555] text-xs font-medium">
                  {stat.label}
                </span>
                <div
                  className="w-8 h-8 rounded-badge flex items-center justify-center"
                  style={{ background: `${stat.color}15` }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: stat.color }}
                  />
                </div>
              </div>
              <p
                className="font-mono-stats font-bold text-2xl"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Plan breakdown */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
        <h2 className="font-semibold text-white mb-4 text-sm">
          Plan Breakdown
        </h2>
        <div className="space-y-3">
          {[
            { label: "Free", count: stats.free, color: "#555555" },
            { label: "Creator ($9/mo)", count: Math.max(0, stats.active - stats.trials), color: "#FFD200" },
            { label: "Trial", count: stats.trials, color: "#FF3B3B" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-[#999999] text-xs w-32">{item.label}</span>
              <div className="flex-1 h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (item.count / Math.max(1, stats.active + stats.free)) * 100)}%`,
                    background: item.color,
                  }}
                />
              </div>
              <span
                className="font-mono-stats text-xs font-bold w-8 text-right"
                style={{ color: item.color }}
              >
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
