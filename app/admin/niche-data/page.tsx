"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Plus, Trash2, Edit2, Check, X, Loader2 } from "lucide-react";

interface NicheRow {
  id: string;
  niche_keyword: string;
  category: string | null;
  avg_rpm_usd: number | null;
  avg_cpm_usd: number | null;
  competition_level: string | null;
  best_audience_country: string | null;
  monetization_difficulty: string | null;
  notes: string | null;
  updated_at: string;
}

const BLANK: Omit<NicheRow, "id" | "updated_at"> = {
  niche_keyword: "",
  category: "",
  avg_rpm_usd: null,
  avg_cpm_usd: null,
  competition_level: "medium",
  best_audience_country: "US",
  monetization_difficulty: "medium",
  notes: "",
};

export default function NicheDataPage() {
  const [niches, setNiches] = useState<NicheRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<NicheRow>>({});
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/niche-data");
      if (res.ok) {
        const data = await res.json();
        setNiches(data.niches || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(n: NicheRow) {
    setEditId(n.id);
    setEditData({ ...n });
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    const res = await fetch("/api/admin/niche-data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editData, id: editId }),
    });
    if (res.ok) {
      setMessage("Saved");
      setEditId(null);
      load();
    } else {
      const d = await res.json();
      setMessage(d.error || "Failed");
    }
    setTimeout(() => setMessage(""), 3000);
    setSaving(false);
  }

  async function addNiche() {
    if (!newRow.niche_keyword.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/niche-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRow),
    });
    if (res.ok) {
      setMessage("Niche added");
      setNewRow({ ...BLANK });
      setAdding(false);
      load();
    } else {
      const d = await res.json();
      setMessage(d.error || "Failed");
    }
    setTimeout(() => setMessage(""), 3000);
    setSaving(false);
  }

  async function deleteNiche(id: string) {
    if (!confirm("Delete this niche?")) return;
    setDeleting(id);
    await fetch("/api/admin/niche-data", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessage("Deleted");
    setTimeout(() => setMessage(""), 3000);
    load();
    setDeleting(null);
  }

  const cell = "px-3 py-3 text-sm";
  const input = "w-full bg-[#080808] border border-[#2E2E2E] text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-[#FFD200]";

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#FFD200]" /> Niche RPM Data
          </h1>
          <p className="text-[#555555] text-sm">Editable table shown to all users in the Niche RPM Guide</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-4 py-2 rounded-btn text-sm hover:bg-[#FFE033]"
        >
          <Plus className="w-4 h-4" /> Add Niche
        </button>
      </div>

      {message && (
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-sm rounded-card px-4 py-3 mb-4">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-[#555555]" />
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E] text-[#555555] text-xs">
                  <th className="text-left px-3 py-2 font-medium">Keyword</th>
                  <th className="text-left px-3 py-2 font-medium">Category</th>
                  <th className="text-left px-3 py-2 font-medium">RPM</th>
                  <th className="text-left px-3 py-2 font-medium">CPM</th>
                  <th className="text-left px-3 py-2 font-medium">Competition</th>
                  <th className="text-left px-3 py-2 font-medium">Difficulty</th>
                  <th className="text-left px-3 py-2 font-medium">Country</th>
                  <th className="text-left px-3 py-2 font-medium w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Add row */}
                {adding && (
                  <tr className="bg-[#FFD200]/5 border-b border-[#1E1E1E]">
                    <td className={cell}>
                      <input className={input} value={newRow.niche_keyword} onChange={(e) => setNewRow((p) => ({ ...p, niche_keyword: e.target.value }))} placeholder="keyword" autoFocus />
                    </td>
                    <td className={cell}>
                      <input className={input} value={newRow.category || ""} onChange={(e) => setNewRow((p) => ({ ...p, category: e.target.value }))} placeholder="category" />
                    </td>
                    <td className={cell}>
                      <input className={input} type="number" value={newRow.avg_rpm_usd ?? ""} onChange={(e) => setNewRow((p) => ({ ...p, avg_rpm_usd: Number(e.target.value) || null }))} placeholder="0.00" />
                    </td>
                    <td className={cell}>
                      <input className={input} type="number" value={newRow.avg_cpm_usd ?? ""} onChange={(e) => setNewRow((p) => ({ ...p, avg_cpm_usd: Number(e.target.value) || null }))} placeholder="0.00" />
                    </td>
                    <td className={cell}>
                      <select className={input} value={newRow.competition_level || "medium"} onChange={(e) => setNewRow((p) => ({ ...p, competition_level: e.target.value }))}>
                        {["low", "medium", "high"].map((v) => <option key={v} value={v} className="bg-[#111111] capitalize">{v}</option>)}
                      </select>
                    </td>
                    <td className={cell}>
                      <select className={input} value={newRow.monetization_difficulty || "medium"} onChange={(e) => setNewRow((p) => ({ ...p, monetization_difficulty: e.target.value }))}>
                        {["easy", "medium", "hard"].map((v) => <option key={v} value={v} className="bg-[#111111] capitalize">{v}</option>)}
                      </select>
                    </td>
                    <td className={cell}>
                      <input className={input} value={newRow.best_audience_country || ""} onChange={(e) => setNewRow((p) => ({ ...p, best_audience_country: e.target.value }))} placeholder="US" />
                    </td>
                    <td className={cell}>
                      <div className="flex gap-1">
                        <button onClick={addNiche} disabled={saving} className="text-[#22C55E] hover:text-white transition-colors disabled:opacity-50">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setAdding(false)} className="text-[#555555] hover:text-white transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {niches.map((n) =>
                  editId === n.id ? (
                    <tr key={n.id} className="bg-[#FFD200]/5 border-b border-[#1E1E1E]">
                      <td className={cell}><input className={input} value={editData.niche_keyword || ""} onChange={(e) => setEditData((p) => ({ ...p, niche_keyword: e.target.value }))} /></td>
                      <td className={cell}><input className={input} value={editData.category || ""} onChange={(e) => setEditData((p) => ({ ...p, category: e.target.value }))} /></td>
                      <td className={cell}><input className={input} type="number" value={editData.avg_rpm_usd ?? ""} onChange={(e) => setEditData((p) => ({ ...p, avg_rpm_usd: Number(e.target.value) }))} /></td>
                      <td className={cell}><input className={input} type="number" value={editData.avg_cpm_usd ?? ""} onChange={(e) => setEditData((p) => ({ ...p, avg_cpm_usd: Number(e.target.value) }))} /></td>
                      <td className={cell}>
                        <select className={input} value={editData.competition_level || "medium"} onChange={(e) => setEditData((p) => ({ ...p, competition_level: e.target.value }))}>
                          {["low", "medium", "high"].map((v) => <option key={v} value={v} className="bg-[#111111] capitalize">{v}</option>)}
                        </select>
                      </td>
                      <td className={cell}>
                        <select className={input} value={editData.monetization_difficulty || "medium"} onChange={(e) => setEditData((p) => ({ ...p, monetization_difficulty: e.target.value }))}>
                          {["easy", "medium", "hard"].map((v) => <option key={v} value={v} className="bg-[#111111] capitalize">{v}</option>)}
                        </select>
                      </td>
                      <td className={cell}><input className={input} value={editData.best_audience_country || ""} onChange={(e) => setEditData((p) => ({ ...p, best_audience_country: e.target.value }))} /></td>
                      <td className={cell}>
                        <div className="flex gap-1">
                          <button onClick={saveEdit} disabled={saving} className="text-[#22C55E] hover:text-white transition-colors disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-[#555555] hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={n.id} className="border-b border-[#0F0F0F] hover:bg-[#0F0F0F] transition-colors">
                      <td className={`${cell} text-white font-medium`}>{n.niche_keyword}</td>
                      <td className={`${cell} text-[#555555]`}>{n.category || "—"}</td>
                      <td className={`${cell} text-[#22C55E] font-mono-stats font-bold`}>${n.avg_rpm_usd?.toFixed(2) || "—"}</td>
                      <td className={`${cell} text-[#FFD200] font-mono-stats`}>${n.avg_cpm_usd?.toFixed(2) || "—"}</td>
                      <td className={cell}>
                        <span className={`text-xs px-2 py-0.5 rounded-badge capitalize ${n.competition_level === "high" ? "bg-[#FF3B3B]/10 text-[#FF3B3B]" : n.competition_level === "low" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#FFD200]/10 text-[#FFD200]"}`}>
                          {n.competition_level}
                        </span>
                      </td>
                      <td className={cell}>
                        <span className={`text-xs px-2 py-0.5 rounded-badge capitalize ${n.monetization_difficulty === "hard" ? "bg-[#FF3B3B]/10 text-[#FF3B3B]" : n.monetization_difficulty === "easy" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#FFD200]/10 text-[#FFD200]"}`}>
                          {n.monetization_difficulty}
                        </span>
                      </td>
                      <td className={`${cell} text-[#555555]`}>{n.best_audience_country || "US"}</td>
                      <td className={cell}>
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(n)} className="text-[#555555] hover:text-[#FFD200] transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteNiche(n.id)} disabled={deleting === n.id} className="text-[#555555] hover:text-[#FF3B3B] transition-colors disabled:opacity-50">
                            {deleting === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
