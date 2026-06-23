"use client";

import { useState, useEffect, useCallback } from "react";
import { Layers, Play, Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";

const OPERATIONS = [
  { value: "add_title_prefix", label: "Add Title Prefix", desc: "Prepend text to all video titles", placeholder: "e.g. [2024]" },
  { value: "add_title_suffix", label: "Add Title Suffix", desc: "Append text to all video titles", placeholder: "e.g. | Channel Name" },
  { value: "add_tag", label: "Add Tag to All", desc: "Add a tag to every video", placeholder: "e.g. tutorial" },
  { value: "remove_tag", label: "Remove Tag from All", desc: "Remove a specific tag from every video", placeholder: "e.g. old-tag" },
  { value: "replace_tag", label: "Replace Tag", desc: "Find and replace a tag across all videos", placeholder: "" },
  { value: "update_description_footer", label: "Update Description Footer", desc: "Add/replace a footer block in all descriptions", placeholder: "e.g. Subscribe for more!" },
];

interface BulkOp {
  id: string;
  operation_type: string;
  params: Record<string, string>;
  status: string;
  total_videos: number;
  processed_videos: number;
  failed_videos: number;
  created_at: string;
}

export default function BulkOperationsPage() {
  const [ops, setOps] = useState<BulkOp[]>([]);
  const [tableExists, setTableExists] = useState(true);

  const [selectedOp, setSelectedOp] = useState(OPERATIONS[0].value);
  const [paramValue, setParamValue] = useState("");
  const [paramFrom, setParamFrom] = useState("");
  const [paramTo, setParamTo] = useState("");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ processed: number; failed: number; total: number } | null>(null);
  const [runError, setRunError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const loadOps = useCallback(async () => {
    try {
      const res = await fetch("/api/bulk");
      const data = await res.json();
      if (data.upgradeRequired) { setUpgradeRequired(true); return; }
      setTableExists(data.tableExists !== false);
      setOps(data.ops || []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => { loadOps(); }, [loadOps]);

  const opConfig = OPERATIONS.find(o => o.value === selectedOp) || OPERATIONS[0];

  async function runOperation() {
    setRunning(true);
    setRunResult(null);
    setRunError("");
    let params: Record<string, string> = {};
    if (selectedOp === "replace_tag") {
      if (!paramFrom.trim() || !paramTo.trim()) { setRunError("Both 'from' and 'to' are required"); setRunning(false); return; }
      params = { from: paramFrom.trim(), to: paramTo.trim() };
    } else {
      if (!paramValue.trim()) { setRunError("Value is required"); setRunning(false); return; }
      params = { value: paramValue.trim() };
    }

    try {
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationType: selectedOp, params }),
      });
      const data = await res.json();
      if (!res.ok) { setRunError(data.error || "Operation failed"); return; }
      setRunResult({ processed: data.processed, failed: data.failed, total: data.total });
      setParamValue(""); setParamFrom(""); setParamTo("");
      loadOps();
    } catch {
      setRunError("Network error");
    } finally {
      setRunning(false);
    }
  }

  if (upgradeRequired) return (
    <div className="max-w-2xl">
      <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-card p-6 text-center">
        <Layers className="w-8 h-8 text-[#FFD200] mx-auto mb-3" />
        <p className="text-white font-semibold mb-2">Bulk Operations require Creator plan</p>
        <a href="/#pricing" className="inline-flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-5 py-2.5 rounded-btn text-sm hover:bg-[#FFE033] mt-2">
          Upgrade to Creator →
        </a>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <Layers className="w-6 h-6 text-[#FFD200]" /> Bulk Back-Catalog Operations
        </h1>
        <p className="text-[#555555] text-sm">Update titles, tags, or descriptions across your entire channel at once. Rate-limited to 1 update/second to protect your quota.</p>
      </div>

      <div className="bg-[#FF3B3B]/5 border border-[#FF3B3B]/20 rounded-card p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-[#FF3B3B] mt-0.5 shrink-0" />
        <p className="text-[#FF3B3B] text-sm">This modifies your live YouTube videos. Changes cannot be automatically undone. Preview carefully before running.</p>
      </div>

      {!tableExists && (
        <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-card p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#FFD200] mt-0.5 shrink-0" />
          <p className="text-[#FFD200] text-sm">Run <code className="bg-[#FFD200]/10 px-1 rounded">PHASE6_MIGRATIONS.sql</code> in Supabase to enable operation history.</p>
        </div>
      )}

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-6 space-y-5">
        <div>
          <label className="block text-xs text-[#999999] mb-2">Operation Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {OPERATIONS.map(op => (
              <button key={op.value} onClick={() => { setSelectedOp(op.value); setParamValue(""); setParamFrom(""); setParamTo(""); }}
                className={`p-3 rounded-btn border text-left transition-colors ${selectedOp === op.value ? "border-[#FFD200] bg-[#FFD200]/5" : "border-[#1E1E1E] hover:border-[#2E2E2E]"}`}>
                <p className={`text-sm font-semibold ${selectedOp === op.value ? "text-[#FFD200]" : "text-white"}`}>{op.label}</p>
                <p className="text-[#555555] text-xs mt-0.5">{op.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {selectedOp === "replace_tag" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#999999] mb-1.5">Find tag</label>
              <input type="text" value={paramFrom} onChange={e => setParamFrom(e.target.value)} placeholder="Old tag"
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
            </div>
            <div>
              <label className="block text-xs text-[#999999] mb-1.5">Replace with</label>
              <input type="text" value={paramTo} onChange={e => setParamTo(e.target.value)} placeholder="New tag"
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-[#999999] mb-1.5">
              {selectedOp === "update_description_footer" ? "Footer text" : "Value"}
            </label>
            {selectedOp === "update_description_footer" ? (
              <textarea value={paramValue} onChange={e => setParamValue(e.target.value)}
                placeholder={opConfig.placeholder} rows={3}
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] resize-none" />
            ) : (
              <input type="text" value={paramValue} onChange={e => setParamValue(e.target.value)}
                placeholder={opConfig.placeholder}
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
            )}
          </div>
        )}

        {runResult && (
          <div className="flex items-center gap-3 p-3 bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-btn">
            <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0" />
            <p className="text-[#22C55E] text-sm">
              Done: {runResult.processed}/{runResult.total} updated{runResult.failed > 0 ? `, ${runResult.failed} failed` : ""}.
            </p>
          </div>
        )}
        {runError && (
          <div className="flex items-center gap-2 text-[#FF3B3B] text-sm">
            <XCircle className="w-4 h-4 shrink-0" /> {runError}
          </div>
        )}

        <button onClick={runOperation} disabled={running}
          className="w-full bg-[#FF3B3B] text-white font-bold py-3 rounded-btn hover:bg-[#FF5555] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
          {running ? <><Loader2 className="w-4 h-4 animate-spin" />Running bulk operation...</> : <><Play className="w-4 h-4" />Run on All Videos</>}
        </button>
        {running && <p className="text-[#555555] text-xs text-center">Processing at 1 video/second to protect your YouTube quota. This may take a few minutes.</p>}
      </div>

      {ops.length > 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1E1E1E]">
            <p className="text-white text-sm font-semibold">Recent Operations</p>
          </div>
          <div className="divide-y divide-[#1E1E1E]">
            {ops.map(op => (
              <div key={op.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm capitalize">{op.operation_type.replace(/_/g, " ")}</p>
                  <p className="text-[#555555] text-xs">{new Date(op.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-badge ${op.status === "completed" ? "bg-[#22C55E]/10 text-[#22C55E]" : op.status === "running" ? "bg-[#FFD200]/10 text-[#FFD200]" : "bg-[#FF3B3B]/10 text-[#FF3B3B]"}`}>
                    {op.status}
                  </span>
                  {op.status === "completed" && (
                    <p className="text-[#555555] text-xs mt-1">{op.processed_videos}/{op.total_videos} done</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
