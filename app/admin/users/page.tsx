"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { UserCog, Search, Loader2, ShieldOff } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  subscription_plan: string;
  created_at: string;
  scans_today: number;
  security_risk_score: number;
  is_suspended: boolean;
  is_test_account: boolean;
}

const PLAN_COLORS: Record<string, string> = {
  free: "#555555",
  creator: "#FFD200",
  pro: "#22C55E",
  agency: "#3B82F6",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [suspendedOnly, setSuspendedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (planFilter) params.set("plan", planFilter);
    if (suspendedOnly) params.set("suspended", "true");
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [search, planFilter, suspendedOnly, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const riskColor = (score: number) =>
    score >= 80 ? "#FF3B3B" : score >= 40 ? "#FFD200" : "#22C55E";

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <UserCog className="w-6 h-6 text-[#FFD200]" /> Users
        </h1>
        <p className="text-[#555555] text-sm">{total.toLocaleString()} registered users</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by email…"
            className="w-full bg-[#111111] border border-[#1E1E1E] rounded-btn pl-9 pr-3 py-2 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#FFD200] transition-colors"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="bg-[#111111] border border-[#1E1E1E] rounded-btn px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD200] transition-colors"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="creator">Creator ($9)</option>
          <option value="pro">Pro ($25)</option>
          <option value="agency">Agency ($99)</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-[#999999] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={suspendedOnly}
            onChange={(e) => { setSuspendedOnly(e.target.checked); setPage(1); }}
            className="w-4 h-4"
          />
          Suspended only
        </label>
      </div>

      {/* Table */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#555555]" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-[#555555] text-sm">No users found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {["Email", "Plan", "Risk", "Scans Today", "Joined", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[#555555] text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E1E]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#0A0A0A] transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-white hover:text-[#FFD200] transition-colors font-medium"
                    >
                      {u.email}
                    </Link>
                    {u.is_test_account && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#FFD200]/10 text-[#FFD200]">
                        TEST
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-bold capitalize"
                      style={{ color: PLAN_COLORS[u.subscription_plan] || "#999999" }}
                    >
                      {u.subscription_plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="font-mono-stats text-sm font-bold"
                      style={{ color: riskColor(u.security_risk_score || 0) }}
                    >
                      {u.security_risk_score || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#999999] font-mono-stats">{u.scans_today || 0}</td>
                  <td className="px-4 py-3 text-[#555555] text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_suspended ? (
                      <span className="flex items-center gap-1 text-[#FF3B3B] text-xs font-medium">
                        <ShieldOff className="w-3.5 h-3.5" /> Suspended
                      </span>
                    ) : (
                      <span className="text-[#22C55E] text-xs">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[#555555]">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-[#111111] border border-[#1E1E1E] rounded-btn hover:border-[#333333] transition-colors disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 bg-[#111111] border border-[#1E1E1E] rounded-btn hover:border-[#333333] transition-colors disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
