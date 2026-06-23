"use client";

import { useState, useEffect, useCallback } from "react";
import { FlaskConical, Plus, Trash2, Trophy, Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface ABTest {
  id: string;
  video_id: string;
  variant_a_title: string;
  variant_b_title: string;
  current_variant: "a" | "b";
  status: "running" | "completed" | "paused";
  winner: "a" | "b" | "inconclusive" | null;
  ctr_a: number | null;
  ctr_b: number | null;
  rotate_at: string;
  created_at: string;
}

export default function ABTestingPage() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableExists, setTableExists] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formVideoId, setFormVideoId] = useState("");
  const [formVariantA, setFormVariantA] = useState("");
  const [formVariantB, setFormVariantB] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [declaringWinner, setDeclaringWinner] = useState<string | null>(null);

  const loadTests = useCallback(async () => {
    try {
      const res = await fetch("/api/ab-test");
      const data = await res.json();
      if (data.upgradeRequired) { setError("upgrade"); return; }
      setTableExists(data.tableExists !== false);
      setTests(data.tests || []);
    } catch {
      setError("Failed to load tests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTests(); }, [loadTests]);

  async function createTest() {
    if (!formVideoId.trim() || !formVariantA.trim() || !formVariantB.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: formVideoId.trim(), variantATitle: formVariantA.trim(), variantBTitle: formVariantB.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || "Failed to create test"); return; }
      setShowForm(false);
      setFormVideoId(""); setFormVariantA(""); setFormVariantB("");
      loadTests();
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function deleteTest(id: string) {
    await fetch(`/api/ab-test/${id}`, { method: "DELETE" });
    setTests(prev => prev.filter(t => t.id !== id));
  }

  async function declareWinner(id: string, winner: "a" | "b" | "inconclusive") {
    setDeclaringWinner(id);
    await fetch(`/api/ab-test/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner }),
    });
    setDeclaringWinner(null);
    loadTests();
  }

  function hoursUntilRotate(rotateAt: string) {
    const diff = new Date(rotateAt).getTime() - Date.now();
    if (diff < 0) return "Rotating soon";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  if (error === "upgrade") return (
    <div className="max-w-2xl">
      <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-card p-6 text-center">
        <FlaskConical className="w-8 h-8 text-[#FFD200] mx-auto mb-3" />
        <p className="text-white font-semibold mb-2">A/B Testing requires Creator plan</p>
        <a href="/#pricing" className="inline-flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-5 py-2.5 rounded-btn text-sm hover:bg-[#FFE033] mt-2">
          Upgrade to Creator →
        </a>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-[#FFD200]" /> A/B Title Testing
          </h1>
          <p className="text-[#555555] text-sm">Test two titles on a live video. Auto-rotates every 48 hours. Declare a winner when ready.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-4 py-2.5 rounded-btn text-sm hover:bg-[#FFE033] shrink-0">
          <Plus className="w-4 h-4" /> New Test
        </button>
      </div>

      {!tableExists && (
        <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-card p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#FFD200] mt-0.5 shrink-0" />
          <p className="text-[#FFD200] text-sm">Run <code className="bg-[#FFD200]/10 px-1 rounded">PHASE6_MIGRATIONS.sql</code> in Supabase to enable this feature.</p>
        </div>
      )}

      {showForm && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-6 space-y-4">
          <h2 className="text-white font-semibold text-sm">Create New A/B Test</h2>
          <div>
            <label className="block text-xs text-[#999999] mb-1.5">YouTube Video ID</label>
            <input type="text" value={formVideoId} onChange={e => setFormVideoId(e.target.value)}
              placeholder="e.g. dQw4w9WgXcQ"
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
            <p className="text-[#333333] text-xs mt-1">Find this in your video URL: youtube.com/watch?v=VIDEO_ID</p>
          </div>
          <div>
            <label className="block text-xs text-[#999999] mb-1.5">Variant A Title (starts first)</label>
            <input type="text" value={formVariantA} onChange={e => setFormVariantA(e.target.value)}
              maxLength={100} placeholder="Title option A..."
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
          </div>
          <div>
            <label className="block text-xs text-[#999999] mb-1.5">Variant B Title (shows after 48 hours)</label>
            <input type="text" value={formVariantB} onChange={e => setFormVariantB(e.target.value)}
              maxLength={100} placeholder="Title option B..."
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
          </div>
          {createError && <p className="text-[#FF3B3B] text-sm">{createError}</p>}
          <div className="flex gap-3">
            <button onClick={createTest} disabled={creating || !formVideoId.trim() || !formVariantA.trim() || !formVariantB.trim()}
              className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-5 py-2.5 rounded-btn text-sm hover:bg-[#FFE033] disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {creating ? "Starting..." : "Start Test"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-btn text-sm text-[#555555] hover:text-white bg-[#1E1E1E]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 py-8 text-[#555555]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading tests...
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8 text-center">
          <FlaskConical className="w-8 h-8 text-[#333333] mx-auto mb-3" />
          <p className="text-[#555555] text-sm">No A/B tests yet. Create your first test to compare two titles on a live video.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map(test => (
            <div key={test.id} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-badge text-xs font-bold ${
                    test.status === "running" ? "bg-[#22C55E]/10 text-[#22C55E]" :
                    test.status === "completed" ? "bg-[#FFD200]/10 text-[#FFD200]" : "bg-[#1E1E1E] text-[#555555]"
                  }`}>
                    {test.status.toUpperCase()}
                  </span>
                  {test.status === "running" && (
                    <span className="text-[#555555] text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Rotates in {hoursUntilRotate(test.rotate_at)}
                    </span>
                  )}
                  {test.winner && (
                    <span className="text-[#FFD200] text-xs flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> Winner: {test.winner === "inconclusive" ? "Inconclusive" : `Variant ${test.winner.toUpperCase()}`}
                    </span>
                  )}
                </div>
                <button onClick={() => deleteTest(test.id)} className="text-[#333333] hover:text-[#FF3B3B] transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[{ label: "A", title: test.variant_a_title, active: test.current_variant === "a", winner: test.winner === "a" },
                  { label: "B", title: test.variant_b_title, active: test.current_variant === "b", winner: test.winner === "b" }].map(v => (
                  <div key={v.label} className={`p-3 rounded-btn border ${v.winner ? "border-[#FFD200] bg-[#FFD200]/5" : v.active && test.status === "running" ? "border-[#22C55E]/40 bg-[#22C55E]/5" : "border-[#1E1E1E]"}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${v.winner ? "bg-[#FFD200] text-[#080808]" : "bg-[#1E1E1E] text-[#999999]"}`}>
                        {v.label}
                      </span>
                      {v.active && test.status === "running" && <span className="text-[#22C55E] text-xs">Live now</span>}
                      {v.winner && <Trophy className="w-3.5 h-3.5 text-[#FFD200]" />}
                    </div>
                    <p className="text-white text-sm leading-snug">{v.title}</p>
                  </div>
                ))}
              </div>

              {test.status === "running" && (
                <div className="flex items-center gap-2 pt-3 border-t border-[#1E1E1E]">
                  <p className="text-[#555555] text-xs mr-auto">Declare winner manually:</p>
                  {declaringWinner === test.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#555555]" />
                  ) : (
                    <>
                      <button onClick={() => declareWinner(test.id, "a")} className="px-3 py-1.5 bg-[#1E1E1E] text-[#999999] hover:text-white rounded-btn text-xs">A wins</button>
                      <button onClick={() => declareWinner(test.id, "b")} className="px-3 py-1.5 bg-[#1E1E1E] text-[#999999] hover:text-white rounded-btn text-xs">B wins</button>
                      <button onClick={() => declareWinner(test.id, "inconclusive")} className="px-3 py-1.5 bg-[#1E1E1E] text-[#555555] hover:text-white rounded-btn text-xs">Inconclusive</button>
                    </>
                  )}
                </div>
              )}
              {test.status === "completed" && test.winner && test.winner !== "inconclusive" && (
                <div className="flex items-center gap-2 pt-3 border-t border-[#1E1E1E]">
                  <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                  <p className="text-[#22C55E] text-sm">
                    Variant {test.winner.toUpperCase()} declared winner. Video title updated.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
