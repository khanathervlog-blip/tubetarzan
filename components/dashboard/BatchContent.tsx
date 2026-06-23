"use client";

import { useState } from "react";
import { LayoutGrid, Loader2, Copy, Check, Download, Plus, X } from "lucide-react";

const STYLES = [
  { value: "educational", label: "Educational" },
  { value: "tutorial", label: "Tutorial" },
  { value: "listicle", label: "Listicle" },
  { value: "storytime", label: "Storytime" },
  { value: "commentary", label: "Commentary" },
];

interface ScriptResult {
  title: string;
  status: "idle" | "loading" | "done" | "error";
  fullText?: string;
  error?: string;
  wordCount?: number;
}

export default function BatchContent() {
  const [slots, setSlots] = useState<string[]>(["", "", ""]);
  const [style, setStyle] = useState("educational");
  const [duration, setDuration] = useState("10min");
  const [results, setResults] = useState<ScriptResult[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  function addSlot() {
    if (slots.length >= 5) return;
    setSlots(prev => [...prev, ""]);
  }
  function removeSlot(i: number) {
    setSlots(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateSlot(i: number, val: string) {
    setSlots(prev => { const next = [...prev]; next[i] = val; return next; });
  }

  async function generateAll() {
    const titles = slots.filter(s => s.trim());
    if (!titles.length) return;
    setRunning(true);

    const initial: ScriptResult[] = titles.map(t => ({ title: t, status: "loading" }));
    setResults(initial);

    const promises = titles.map(async (title, i) => {
      try {
        const res = await fetch("/api/script/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, topic: title, hook: "", outline: "", style, duration }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        const fullText = (data.sections || []).map((s: { title: string; script: string }) => `--- ${s.title} ---\n\n${s.script}`).join("\n\n");
        const wordCount = data.total_word_count || fullText.split(/\s+/).length;
        setResults(prev => {
          const next = [...prev];
          next[i] = { title, status: "done", fullText, wordCount };
          return next;
        });
      } catch (err) {
        setResults(prev => {
          const next = [...prev];
          next[i] = { title, status: "error", error: err instanceof Error ? err.message : "Failed" };
          return next;
        });
      }
    });

    await Promise.all(promises);
    setRunning(false);
  }

  async function copyScript(i: number) {
    const result = results[i];
    if (!result?.fullText) return;
    await navigator.clipboard.writeText(result.fullText);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadScript(i: number) {
    const result = results[i];
    if (!result?.fullText) return;
    const blob = new Blob([`${result.title}\n\n${result.fullText}`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${result.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-script.txt`;
    a.click();
  }

  function downloadAll() {
    const done = results.filter(r => r.status === "done" && r.fullText);
    if (!done.length) return;
    const content = done.map(r => `${"=".repeat(60)}\n${r.title}\n${"=".repeat(60)}\n\n${r.fullText}`).join("\n\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "batch-scripts.txt";
    a.click();
  }

  const hasResults = results.some(r => r.status === "done");

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-[#FFD200]" /> Batch Content Production
        </h1>
        <p className="text-[#555555] text-sm">Generate up to 5 full scripts in parallel. Perfect for content planning sessions.</p>
      </div>

      {results.length === 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-[#999999]">Video Titles (up to 5)</label>
              {slots.length < 5 && (
                <button onClick={addSlot} className="flex items-center gap-1 text-[#FFD200] text-xs hover:text-[#FFE033]">
                  <Plus className="w-3.5 h-3.5" /> Add slot
                </button>
              )}
            </div>
            <div className="space-y-2">
              {slots.map((slot, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-6 h-[44px] flex items-center justify-center text-[#333333] text-xs font-mono shrink-0">{i + 1}</span>
                  <input type="text" value={slot} onChange={e => updateSlot(i, e.target.value)}
                    placeholder={`Video title ${i + 1}...`}
                    className="flex-1 bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
                  {slots.length > 1 && (
                    <button onClick={() => removeSlot(i)} className="text-[#333333] hover:text-[#FF3B3B] transition-colors p-2">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#999999] mb-2">Style</label>
              <div className="flex flex-wrap gap-1.5">
                {STYLES.map(s => (
                  <button key={s.value} onClick={() => setStyle(s.value)}
                    className={`px-3 py-1.5 rounded-btn border text-xs transition-colors ${style === s.value ? "border-[#FFD200] bg-[#FFD200]/5 text-[#FFD200]" : "border-[#1E1E1E] text-[#555555] hover:border-[#2E2E2E]"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#999999] mb-2">Duration</label>
              <div className="flex gap-1.5">
                {["5min", "10min", "15min"].map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`flex-1 px-2 py-1.5 rounded-btn border text-xs transition-colors ${duration === d ? "border-[#FFD200] bg-[#FFD200]/5 text-[#FFD200]" : "border-[#1E1E1E] text-[#555555] hover:border-[#2E2E2E]"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={generateAll} disabled={!slots.some(s => s.trim()) || running}
            className="w-full bg-[#FFD200] text-[#080808] font-bold py-3.5 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
            <LayoutGrid className="w-4 h-4" />
            Generate {slots.filter(s => s.trim()).length} Scripts in Parallel
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[#555555] text-sm">
              {results.filter(r => r.status === "done").length}/{results.length} complete
            </p>
            <div className="flex gap-2">
              {hasResults && (
                <button onClick={downloadAll} className="flex items-center gap-1.5 px-3 py-2 rounded-btn text-xs bg-[#1E1E1E] text-[#999999] hover:text-white">
                  <Download className="w-3.5 h-3.5" /> Download All
                </button>
              )}
              <button onClick={() => { setResults([]); setSlots(["", "", ""]); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-btn text-xs bg-[#1E1E1E] text-[#999999] hover:text-white">
                New Batch
              </button>
            </div>
          </div>

          {results.map((result, i) => (
            <div key={i} className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{result.title}</p>
                  {result.status === "done" && result.wordCount && (
                    <p className="text-[#555555] text-xs">~{result.wordCount} words</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {result.status === "loading" && <Loader2 className="w-4 h-4 animate-spin text-[#FFD200]" />}
                  {result.status === "error" && <span className="text-[#FF3B3B] text-xs">{result.error}</span>}
                  {result.status === "done" && (
                    <>
                      <button onClick={() => copyScript(i)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-btn text-xs ${copied === i ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#1E1E1E] text-[#999999] hover:text-white"}`}>
                        {copied === i ? <><Check className="w-3.5 h-3.5" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                      </button>
                      <button onClick={() => downloadScript(i)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-btn text-xs bg-[#FFD200]/10 text-[#FFD200] hover:bg-[#FFD200]/20">
                        <Download className="w-3.5 h-3.5" /> .txt
                      </button>
                    </>
                  )}
                </div>
              </div>
              {result.status === "done" && result.fullText && (
                <div className="px-5 pb-4 border-t border-[#1E1E1E] pt-3">
                  <div className="bg-[#080808] rounded-btn p-3 max-h-48 overflow-y-auto">
                    <p className="text-[#555555] text-xs leading-relaxed font-mono whitespace-pre-wrap">{result.fullText.slice(0, 600)}{result.fullText.length > 600 ? "\n\n[Download to see full script]" : ""}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
