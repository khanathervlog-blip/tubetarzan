import { createClient } from "@/lib/supabase/server";
import { Users, Download } from "lucide-react";
import type { Lead } from "@/types/database";

const STATUS_COLORS: Record<string, string> = {
  captured: "#555555",
  trial_started: "#FFD200",
  paid: "#22C55E",
  churned: "#FF3B3B",
  unsubscribed: "#999999",
};

export default async function AdminLeadsPage() {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const typedLeads = (leads || []) as Lead[];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1">
            Leads
          </h1>
          <p className="text-[#555555] text-sm">
            {typedLeads.length} total leads captured
          </p>
        </div>
        <a
          href="/api/admin/leads/export"
          className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] text-white text-sm px-4 py-2 rounded-btn hover:border-[#333333] transition-colors min-h-[44px]"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </a>
      </div>

      {typedLeads.length === 0 ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-12 text-center">
          <Users className="w-10 h-10 text-[#333333] mx-auto mb-3" />
          <p className="text-[#555555] text-sm">No leads yet</p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E] text-[#555555]">
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    Source
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    Niche
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {typedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-[#0F0F0F] hover:bg-[#0F0F0F] transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {lead.email}
                    </td>
                    <td className="px-4 py-3 text-[#999999] hidden sm:table-cell">
                      {lead.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-[#999999] hidden md:table-cell">
                      {lead.source || "—"}
                    </td>
                    <td className="px-4 py-3 text-[#999999] hidden lg:table-cell">
                      {lead.niche_interest || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-badge"
                        style={{
                          color: STATUS_COLORS[lead.status] || "#999999",
                          background: `${STATUS_COLORS[lead.status] || "#999999"}15`,
                        }}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#555555] text-xs hidden md:table-cell">
                      {new Date(lead.created_at).toLocaleDateString()}
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
