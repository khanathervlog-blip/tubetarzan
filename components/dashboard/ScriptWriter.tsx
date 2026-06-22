"use client";

import { useState } from "react";
import { FileText, Loader2, Copy, Check, ChevronDown, ChevronUp, Download, Lightbulb } from "lucide-react";

interface ScriptSection {
  title: string;
  timestamp: string;
  script: string;
  broll_cues: string[];
  word_count: number;
}

interface ScriptResult {
  sections: ScriptSection[];
  total_word_count: number;
  estimated_duration: string;
  cta: string;
  production_notes: string;
}

const STYLES = [
  { value: "educational", label: "Educational", desc: "Teach & inform" },
  { value: "tutorial", label: "Tutorial", desc: "Step-by-step guide" },
  { value: "storytime", label: "Storytime", desc: "Narrative & personal" },
  { value: "listicle", label: "Listicle", desc: "Top N format" },
  { value: "commentary", label: "Commentary", desc: "Opinion & reaction" },
];

const DURATIONS = [
  { value: "5min", label: "~5 min", words: "~750 words" },
  { value: "10min", label: "~10 min", words: "~1,500 words" },
  { value: "15min", label: "~15 min", words: "~2,250 words" },
  { value: "20min", label: "~20 min", words: "~3,000 words" },
];

export default function ScriptWriter() {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [hook, setHook] = useState("");
  const [outline, setOutline] = useState("");
  const [style, setStyle] = useState("educational");
  const [duration, setDuration] = useState("10min");

  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<ScriptResult | null>(null);
  const [error, setError] = useState("");

  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [copiedSection, setCopiedSection] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function generateScript() {
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    setScript(null);
    setExpandedSections(new Set([0]));

    try {
      const res = await fetch("/api/script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, topic: topic || title, hook, outline, style, duration }),
      });
      const data = await res.json();
      if (res.status === 429 && data.upgradeRequired) {
        setError(`Daily limit reached. Free plan allows ${2} scripts per day. Upgrade to Creator for unlimited scripts.`);
        return;
      }
      if (!res.ok) { setError(data.error || "Generation failed"); return; }
      setScript(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(i: number) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function copySection(i: number) {
    if (!script) return;
    navigator.clipboard.writeText(script.sections[i].script);
    setCopiedSection(i);
    setTimeout(() => setCopiedSection(null), 2000);
    showToast("Section copied!");
  }

  function copyAll() {
    if (!script) return;
    const full = script.sections.map(s => `--- ${s.title} (${s.timestamp}) ---\n\n${s.script}`).join("\n\n\n");
    navigator.clipboard.writeText(full);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    showToast("Full script copied!");
  }

  function downloadScript() {
    if (!script) return;
    const full = [
      `YOUTUBE SCRIPT: ${title}`,
      `Style: ${style} | Duration: ${duration} | ~${script.total_word_count} words`,
      `Estimated Duration: ${script.estimated_duration}`,
      "",
      "=" .repeat(60),
      "",
      ...script.sections.map(s => [
        `--- ${s.title} (${s.timestamp}) ---`,
        "",
        s.script,
        s.broll_cues.length > 0 ? "\nB-ROLL NOTES:\n" + s.broll_cues.map(c => `  • ${c}`).join("\n") : "",
        "",
      ].join("\n")),
      "=" .repeat(60),
      "",
      `CTA: ${script.cta}`,
      "",
      "PRODUCTION NOTES:",
      script.production_notes,
    ].join("\n");

    const blob = new Blob([full], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-script.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Script downloaded!");
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#FFD200]" />
          Script Writer
        </h1>
        <p className="text-[#555555] text-sm">Generate a full word-for-word YouTube script with B-roll cues and production notes.</p>
      </div>

      {/* Input Form */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-6 space-y-4">
        <div>
          <label className="block text-xs text-[#999999] mb-1.5">Video Title <span className="text-[#FF3B3B]">*</span></label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. 7 Things I Wish I Knew Before Moving to Istanbul"
            maxLength={120}
            className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[#999999] mb-1.5">Topic / Niche (optional — helps AI focus)</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Istanbul travel tips for first-timers"
            maxLength={100}
            className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[#999999] mb-1.5">Opening Hook (optional — from Packaging Studio)</label>
          <textarea
            value={hook}
            onChange={e => setHook(e.target.value)}
            placeholder="Paste your hook here, or leave blank to auto-generate..."
            rows={2}
            className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-[#999999] mb-1.5">Outline / Key Points (optional)</label>
          <textarea
            value={outline}
            onChange={e => setOutline(e.target.value)}
            placeholder="e.g. 1. Tourist traps to avoid&#10;2. Hidden neighbourhoods&#10;3. Food spots locals love"
            rows={3}
            className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors resize-none"
          />
        </div>

        {/* Style */}
        <div>
          <label className="block text-xs text-[#999999] mb-2">Video Style</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {STYLES.map(s => (
              <button key={s.value} onClick={() => setStyle(s.value)}
                className={`p-3 rounded-btn border text-left transition-colors ${style === s.value ? "border-[#FFD200] bg-[#FFD200]/5" : "border-[#1E1E1E] hover:border-[#2E2E2E]"}`}>
                <p className={`text-sm font-semibold ${style === s.value ? "text-[#FFD200]" : "text-white"}`}>{s.label}</p>
                <p className="text-[#555555] text-xs mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs text-[#999999] mb-2">Target Duration</label>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map(d => (
              <button key={d.value} onClick={() => setDuration(d.value)}
                className={`p-3 rounded-btn border text-center transition-colors ${duration === d.value ? "border-[#FFD200] bg-[#FFD200]/5" : "border-[#1E1E1E] hover:border-[#2E2E2E]"}`}>
                <p className={`text-sm font-semibold ${duration === d.value ? "text-[#FFD200]" : "text-white"}`}>{d.label}</p>
                <p className="text-[#555555] text-xs">{d.words}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generateScript}
          disabled={!title.trim() || loading}
          className="w-full bg-[#FFD200] text-[#080808] font-bold py-3.5 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Writing your script... (15-30 sec)</>
          ) : (
            <><FileText className="w-4 h-4" />Generate Full Script</>
          )}
        </button>

        {error && (
          <div className={`text-sm p-4 rounded-btn ${error.includes("Upgrade") || error.includes("limit") ? "bg-[#FFD200]/5 border border-[#FFD200]/20 text-[#FFD200]" : "text-[#FF3B3B]"}`}>
            <p>{error}</p>
            {(error.includes("Upgrade") || error.includes("limit")) && (
              <a href="/#pricing" className="inline-flex items-center gap-2 mt-3 bg-[#FFD200] text-[#080808] font-bold px-4 py-2 rounded-btn text-xs hover:bg-[#FFE033]">
                Upgrade to Creator →
              </a>
            )}
          </div>
        )}
      </div>

      {/* Script Output */}
      {script && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{title}</p>
              <p className="text-[#555555] text-xs">{style} • {script.estimated_duration} • ~{script.total_word_count} words</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={copyAll}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-btn text-xs font-bold transition-colors ${copiedAll ? "bg-[#22C55E] text-white" : "bg-[#FFD200] text-[#080808] hover:bg-[#FFE033]"}`}>
                {copiedAll ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy All</>}
              </button>
              <button onClick={downloadScript}
                className="flex items-center gap-1.5 px-3 py-2 rounded-btn text-xs font-bold bg-[#1E1E1E] text-[#999999] hover:text-white transition-colors">
                <Download className="w-3.5 h-3.5" />Download
              </button>
            </div>
          </div>

          {/* Sections */}
          {script.sections.map((section, i) => (
            <div key={i} className="bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
              <button
                onClick={() => toggleSection(i)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#161616] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-[#FFD200] text-[#080808] text-xs font-bold px-2 py-0.5 rounded-badge shrink-0">
                    {section.timestamp}
                  </span>
                  <span className="text-white font-semibold text-sm">{section.title}</span>
                  <span className="text-[#555555] text-xs">~{section.word_count} words</span>
                </div>
                {expandedSections.has(i) ? <ChevronUp className="w-4 h-4 text-[#555555] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#555555] shrink-0" />}
              </button>

              {expandedSections.has(i) && (
                <div className="px-4 pb-4 border-t border-[#1E1E1E]">
                  <div className="mt-4 bg-[#080808] rounded-btn p-4">
                    <p className="text-[#999999] text-sm leading-relaxed whitespace-pre-wrap font-mono">{section.script}</p>
                  </div>

                  {section.broll_cues.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[#555555] text-xs uppercase font-semibold mb-2">B-Roll Cues</p>
                      <div className="space-y-1">
                        {section.broll_cues.map((cue, j) => (
                          <p key={j} className="text-[#FFB700] text-xs flex gap-2">
                            <span className="shrink-0">🎬</span>{cue}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => copySection(i)}
                    className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs transition-colors ${copiedSection === i ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#1E1E1E] text-[#999999] hover:text-white"}`}>
                    {copiedSection === i ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy section</>}
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* CTA + Production Notes */}
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 space-y-4">
            <div>
              <p className="text-xs text-[#999999] uppercase font-semibold mb-2">Call to Action</p>
              <p className="text-white text-sm leading-relaxed">{script.cta}</p>
            </div>
            {script.production_notes && (
              <div className="border-t border-[#1E1E1E] pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-[#FFD200]" />
                  <p className="text-xs text-[#999999] uppercase font-semibold">Production Notes</p>
                </div>
                <p className="text-[#555555] text-sm leading-relaxed">{script.production_notes}</p>
              </div>
            )}
          </div>

          <button onClick={() => { setScript(null); setTitle(""); setHook(""); setOutline(""); setTopic(""); }}
            className="w-full bg-[#111111] border border-[#1E1E1E] text-[#555555] hover:text-white py-3 rounded-btn text-sm transition-colors">
            Write Another Script
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#111111] border border-[#1E1E1E] text-white text-sm px-4 py-3 rounded-card shadow-2xl z-50 animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}
