import { createClient } from "@/lib/supabase/server";
import { ExternalLink, DollarSign } from "lucide-react";
import type { Profile } from "@/types/database";

const STATUS_COLORS: Record<string, string> = {
  active: "#22C55E",
  trialing: "#FFD200",
  past_due: "#FF3B3B",
  canceled: "#555555",
  inactive: "#333333",
  paused: "#999999",
};

const PLAN_PRICES: Record<string, number> = {
  creator: 9,
  pro: 25,
  agency: 99,
};

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();
  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("*")
    .not("subscription_plan", "is", null)
    .neq("subscription_plan", "free")
    .order("created_at", { ascending: false })
    .limit(200);

  const subs = (profilesRaw as Profile[] | null) || [];

  const mrr = subs
    .filter(
      (p) =>
        p.subscription_status === "active" ||
        p.subscription_status === "trialing"
    )
    .reduce((sum, p) => sum + (PLAN_PRICES[p.subscription_plan || ""] || 0), 0);

  const arr = mrr * 12;

  const thisMonth = new Date();
  thisMonth.setDate(1);
  const churnedThisMonth = subs.filter(
    (p) =>
      p.subscription_status === "canceled" &&
      p.created_at >= thisMonth.toISOString()
  ).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">
          Subscriptions
        </h1>
        <p className="text-[#555555] text-sm">All paying customers</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "MRR", value: `$${mrr}`, color: "#22C55E" },
          { label: "ARR", value: `$${arr}`, color: "#FFD200" },
          {
            label: "Total Paying",
            value: subs
              .filter(
                (p) =>
                  p.subscription_status === "active" ||
                  p.subscription_status === "trialing"
              )
              .length.toString(),
            color: "#FF3B3B",
          },
          {
            label: "Churned This Month",
            value: churnedThisMonth.toString(),
            color: "#999999",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4"
          >
            <p className="text-[#555555] text-xs mb-2">{stat.label}</p>
            <p
              className="font-mono-stats font-bold text-xl"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {subs.length === 0 ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-12 text-center">
          <DollarSign className="w-10 h-10 text-[#333333] mx-auto mb-3" />
          <p className="text-[#555555] text-sm">No paying subscribers yet</p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E] text-[#555555]">
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    Next Billing
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-[#0F0F0F] hover:bg-[#0F0F0F] transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium text-xs">
                      {sub.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#FFD200] font-medium capitalize">
                        {sub.subscription_plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-stats text-[#22C55E]">
                      ${PLAN_PRICES[sub.subscription_plan || ""] || 0}/mo
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-badge"
                        style={{
                          color:
                            STATUS_COLORS[sub.subscription_status] || "#999999",
                          background: `${STATUS_COLORS[sub.subscription_status] || "#999999"}15`,
                        }}
                      >
                        {sub.subscription_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#555555] text-xs hidden md:table-cell">
                      {sub.subscription_renews_at
                        ? new Date(sub.subscription_renews_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {sub.lemonsqueezy_subscription_id && (
                        <a
                          href={`https://app.lemonsqueezy.com/subscriptions/${sub.lemonsqueezy_subscription_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#555555] hover:text-white text-xs transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          LS
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
