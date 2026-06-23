"use client";

import { useState } from "react";
import { ImageIcon, Loader2, Download, AlertCircle, RefreshCw } from "lucide-react";

const STYLES = [
  { value: "dramatic", label: "Dramatic", desc: "Cinematic & intense" },
  { value: "clean", label: "Clean", desc: "Minimal & professional" },
  { value: "gradient", label: "Gradient", desc: "Vibrant & colorful" },
  { value: "bold", label: "Bold Text", desc: "Typography-focused" },
];

export default function ThumbnailGenerator() {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [style, setStyle] = useState("dramatic");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [modelLoading, setModelLoading] = useState(false);
  const [configMissing, setConfigMissing] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  async function generate() {
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    setImages([]);
    setModelLoading(false);
    setConfigMissing(false);

    try {
      const res = await fetch("/api/thumbnail/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), style, subject: subject.trim() }),
      });
      const data = await res.json();

      if (data.upgradeRequired) { setUpgradeRequired(true); return; }
      if (data.configMissing) { setConfigMissing(true); return; }
      if (data.modelLoading) { setModelLoading(true); return; }
      if (!res.ok) { setError(data.error || "Generation failed"); return; }

      setImages((data.images || []).filter(Boolean));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadImage(dataUrl: string, index: number) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `thumbnail-${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-v${index + 1}.png`;
    a.click();
  }

  if (upgradeRequired) return (
    <div className="max-w-2xl">
      <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-card p-6 text-center">
        <ImageIcon className="w-8 h-8 text-[#FFD200] mx-auto mb-3" />
        <p className="text-white font-semibold mb-2">Thumbnail Generator requires Creator plan</p>
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
          <ImageIcon className="w-6 h-6 text-[#FFD200]" /> AI Thumbnail Generator
        </h1>
        <p className="text-[#555555] text-sm">Generate 4 thumbnail options using Stable Diffusion XL. Free — powered by HuggingFace (30K calls/month).</p>
      </div>

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 space-y-5 mb-6">
        <div>
          <label className="block text-xs text-[#999999] mb-1.5">Video Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. 7 Things I Wish I Knew Before Moving to Istanbul"
            className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
        </div>
        <div>
          <label className="block text-xs text-[#999999] mb-1.5">Main Subject (optional — person, object, scene)</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="e.g. young man looking surprised at camera, Istanbul skyline in background"
            className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
        </div>
        <div>
          <label className="block text-xs text-[#999999] mb-2">Style</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {STYLES.map(s => (
              <button key={s.value} onClick={() => setStyle(s.value)}
                className={`p-3 rounded-btn border text-left transition-colors ${style === s.value ? "border-[#FFD200] bg-[#FFD200]/5" : "border-[#1E1E1E] hover:border-[#2E2E2E]"}`}>
                <p className={`text-sm font-semibold ${style === s.value ? "text-[#FFD200]" : "text-white"}`}>{s.label}</p>
                <p className="text-[#555555] text-xs mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="flex items-start gap-2 text-[#FF3B3B] text-sm"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}
        {configMissing && (
          <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-btn p-4">
            <p className="text-[#FFD200] text-sm font-semibold mb-1">HuggingFace API not configured</p>
            <p className="text-[#555555] text-xs">Add <code className="bg-[#FFD200]/10 px-1 rounded">HUGGINGFACE_API_KEY</code> to your Vercel environment variables. Get a free key at huggingface.co/settings/tokens</p>
          </div>
        )}
        {modelLoading && (
          <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-btn p-4">
            <p className="text-[#FFD200] text-sm">The AI model is warming up (takes 20-60 seconds on first use). Please try again in a moment.</p>
          </div>
        )}

        <button onClick={generate} disabled={!title.trim() || loading}
          className="w-full bg-[#FFD200] text-[#080808] font-bold py-3.5 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating 4 thumbnails...</> : <><ImageIcon className="w-4 h-4" />Generate 4 Thumbnails</>}
        </button>
      </div>

      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-semibold text-sm">{images.length} thumbnails generated</p>
            <button onClick={generate} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-btn text-xs bg-[#1E1E1E] text-[#999999] hover:text-white">
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {images.map((img, i) => img && (
              <div key={i} className="group relative bg-[#111111] border border-[#1E1E1E] rounded-card overflow-hidden">
                <img src={img} alt={`Thumbnail ${i + 1}`} className="w-full aspect-video object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={() => downloadImage(img, i)}
                    className="flex items-center gap-1.5 bg-[#FFD200] text-[#080808] font-bold px-4 py-2 rounded-btn text-xs hover:bg-[#FFE033]">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-[#555555] text-xs">Variant {i + 1}</span>
                  <span className="text-[#333333] text-xs capitalize">{style}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[#333333] text-xs mt-4 text-center">
            Tip: Download your favourite and upload directly to YouTube Studio as your thumbnail.
          </p>
        </div>
      )}
    </div>
  );
}
