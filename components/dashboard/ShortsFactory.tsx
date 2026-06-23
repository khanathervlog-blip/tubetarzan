"use client";

import { useState } from "react";
import { Zap, Loader2, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";

const VOICES = [
  { name: "en-US-Neural2-A", label: "English Male" },
  { name: "en-US-Neural2-C", label: "English Female" },
  { name: "hi-IN-Neural2-B", label: "Hindi Male" },
  { name: "hi-IN-Neural2-A", label: "Hindi Female" },
  { name: "ur-PK-Wavenet-B", label: "Urdu Male" },
  { name: "ur-PK-Wavenet-A", label: "Urdu Female" },
  { name: "ar-XA-Wavenet-B", label: "Arabic Male" },
];

interface ShortScript {
  hook: string;
  body: string;
  cta: string;
  fullScript: string;
  wordCount: number;
}

export default function ShortsFactory() {
  const [topic, setTopic] = useState("");
  const [hook, setHook] = useState("");
  const [voice, setVoice] = useState("en-US-Neural2-A");
  const [duration, setDuration] = useState<30 | 60>(60);

  const [step, setStep] = useState<"idle" | "script" | "audio" | "broll" | "render" | "done" | "error">("idle");
  const [shortScript, setShortScript] = useState<ShortScript | null>(null);
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  const [brollResults, setBrollResults] = useState<{ url: string; thumb: string }[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [noRailway, setNoRailway] = useState(false);

  function getLang(voiceName: string) {
    return voiceName.split("-").slice(0, 2).join("-");
  }

  async function generate() {
    if (!topic.trim()) return;
    setError("");
    setNoRailway(false);
    setStep("script");

    // Step 1: Generate short script via Script Writer
    let script: ShortScript;
    try {
      const res = await fetch("/api/script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topic.trim(),
          topic: topic.trim(),
          hook: hook.trim() || "",
          outline: "",
          style: "educational",
          duration: duration === 60 ? "1min" : "30sec",
          isShort: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Script generation failed");

      const fullScript = data.sections?.map((s: { script: string }) => s.script).join(" ") || data.fullScript || "";
      const words = fullScript.split(/\s+/).filter(Boolean);
      const targetWords = duration === 60 ? 150 : 75;
      const trimmedWords = words.slice(0, targetWords);

      script = {
        hook: data.sections?.[0]?.script?.slice(0, 200) || trimmedWords.slice(0, 25).join(" "),
        body: trimmedWords.slice(25, -10).join(" "),
        cta: trimmedWords.slice(-10).join(" "),
        fullScript: trimmedWords.join(" "),
        wordCount: trimmedWords.length,
      };
      setShortScript(script);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Script failed");
      setStep("error");
      return;
    }

    // Step 2: Generate audio
    setStep("audio");
    let chunks: string[] = [];
    try {
      const res = await fetch("/api/audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: script.fullScript,
          voiceName: voice,
          languageCode: getLang(voice),
          speakingRate: duration === 30 ? 1.2 : 1.0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.configMissing) {
          setError("Google TTS not configured. Add GOOGLE_TTS_API_KEY to continue.");
          setStep("error");
          return;
        }
        throw new Error(data.error || "Audio failed");
      }
      chunks = data.audioChunks || [];
      setAudioChunks(chunks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio failed");
      setStep("error");
      return;
    }

    // Step 3: Find B-roll
    setStep("broll");
    let brolls: { url: string; thumb: string }[] = [];
    try {
      const res = await fetch("/api/broll/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: topic.trim() }),
      });
      const data = await res.json();
      brolls = (data.results || []).slice(0, 5).map((r: { videoUrl: string; thumbnailUrl: string }) => ({
        url: r.videoUrl,
        thumb: r.thumbnailUrl,
      }));
      setBrollResults(brolls);
    } catch {
      // Non-fatal: proceed without B-roll
    }

    // Step 4: Send to Railway for render
    setStep("render");
    const ffmpegUrl = process.env.NEXT_PUBLIC_FFMPEG_SERVICE_URL;
    if (!ffmpegUrl) {
      setNoRailway(true);
      setStep("done");
      return;
    }

    try {
      const audioBase64 = chunks[0] || "";
      const res = await fetch(`${ffmpegUrl}/render/assemble`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_RAILWAY_TOKEN || ""}`,
        },
        body: JSON.stringify({
          audioBase64,
          brollUrls: brolls.slice(0, 3).map(b => b.url),
          format: "9:16",
          duration,
          title: topic.trim(),
        }),
      });
      const data = await res.json();
      if (data.jobId) {
        setJobId(data.jobId);
        pollRender(data.jobId, ffmpegUrl);
      } else {
        setStep("done");
      }
    } catch {
      setNoRailway(true);
      setStep("done");
    }
  }

  async function pollRender(id: string, baseUrl: string) {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) { clearInterval(interval); setStep("done"); return; }
      try {
        const res = await fetch(`${baseUrl}/render/status/${id}`);
        const data = await res.json();
        if (data.status === "done" && data.url) {
          setRenderUrl(data.url);
          setStep("done");
          clearInterval(interval);
        } else if (data.status === "failed") {
          setStep("done");
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
        setStep("done");
      }
    }, 10000);
  }

  const stepLabels: Record<string, string> = {
    script: "Writing short script...",
    audio: "Generating voiceover...",
    broll: "Searching B-roll footage...",
    render: "Rendering 9:16 video...",
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#FFD200]" /> Shorts Factory
        </h1>
        <p className="text-[#555555] text-sm">Create a fully produced 9:16 YouTube Short with voiceover and B-roll footage.</p>
      </div>

      {step === "idle" || step === "error" ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 space-y-5">
          <div>
            <label className="block text-xs text-[#999999] mb-1.5">Short Topic</label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. 3 facts about black holes"
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
          </div>
          <div>
            <label className="block text-xs text-[#999999] mb-1.5">Opening Hook (optional)</label>
            <input type="text" value={hook} onChange={e => setHook(e.target.value)}
              placeholder="e.g. Did you know this one fact could change everything?"
              maxLength={100}
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#999999] mb-1.5">Duration</label>
              <div className="flex gap-2">
                {[30, 60].map(d => (
                  <button key={d} onClick={() => setDuration(d as 30 | 60)}
                    className={`flex-1 py-2.5 rounded-btn border text-sm font-bold transition-colors ${duration === d ? "border-[#FFD200] bg-[#FFD200]/5 text-[#FFD200]" : "border-[#1E1E1E] text-[#555555] hover:border-[#2E2E2E]"}`}>
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#999999] mb-1.5">Voice</label>
              <select value={voice} onChange={e => setVoice(e.target.value)}
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:border-[#FFD200]">
                {VOICES.map(v => <option key={v.name} value={v.name}>{v.label}</option>)}
              </select>
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-2 text-[#FF3B3B] text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}
          <button onClick={generate} disabled={!topic.trim()}
            className="w-full bg-[#FFD200] text-[#080808] font-bold py-3.5 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
            <Zap className="w-4 h-4" /> Create Short
          </button>
        </div>
      ) : step === "done" ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[#22C55E]" />
            <p className="text-white font-semibold">Short content ready!</p>
          </div>

          {shortScript && (
            <div className="space-y-3">
              <p className="text-xs text-[#555555] uppercase font-semibold">Script ({shortScript.wordCount} words)</p>
              <div className="bg-[#080808] rounded-btn p-4 text-[#999999] text-sm leading-relaxed whitespace-pre-wrap font-mono">
                {shortScript.fullScript}
              </div>
            </div>
          )}

          {audioChunks.length > 0 && (
            <div>
              <p className="text-xs text-[#555555] uppercase font-semibold mb-2">Voiceover Preview</p>
              <audio controls className="w-full">
                <source src={`data:audio/mp3;base64,${audioChunks[0]}`} type="audio/mp3" />
              </audio>
            </div>
          )}

          {brollResults.length > 0 && (
            <div>
              <p className="text-xs text-[#555555] uppercase font-semibold mb-2">B-Roll ({brollResults.length} clips)</p>
              <div className="flex gap-2 overflow-x-auto">
                {brollResults.map((b, i) => (
                  <img key={i} src={b.thumb} alt="B-roll" className="w-24 h-16 object-cover rounded-btn shrink-0 opacity-70 hover:opacity-100 transition-opacity" />
                ))}
              </div>
            </div>
          )}

          {renderUrl ? (
            <a href={renderUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#22C55E] text-white font-bold px-5 py-3 rounded-btn text-sm hover:bg-[#16A34A]">
              <ExternalLink className="w-4 h-4" /> Download Rendered Short
            </a>
          ) : noRailway ? (
            <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-btn p-4">
              <p className="text-[#FFD200] text-sm font-semibold mb-1">Video rendering requires Railway</p>
              <p className="text-[#555555] text-xs">Deploy the Railway Python service and set <code className="bg-[#FFD200]/10 px-1 rounded">FFMPEG_SERVICE_URL</code> to auto-assemble videos. The script and audio above are ready to use manually.</p>
            </div>
          ) : jobId ? (
            <div className="flex items-center gap-3 text-[#555555] text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Rendering video... Job ID: {jobId}
            </div>
          ) : null}

          <button onClick={() => { setStep("idle"); setShortScript(null); setAudioChunks([]); setBrollResults([]); setJobId(null); setRenderUrl(null); setTopic(""); setHook(""); }}
            className="w-full bg-[#1E1E1E] text-[#555555] hover:text-white py-3 rounded-btn text-sm transition-colors">
            Create Another Short
          </button>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#FFD200] animate-spin" />
          <p className="text-white font-semibold">{stepLabels[step] || "Processing..."}</p>
          <div className="flex gap-2">
            {["script", "audio", "broll", "render"].map((s, i) => (
              <div key={s} className={`h-1.5 w-16 rounded-full transition-colors ${
                ["script", "audio", "broll", "render"].indexOf(step) >= i ? "bg-[#FFD200]" : "bg-[#1E1E1E]"
              }`} />
            ))}
          </div>
          <p className="text-[#555555] text-xs text-center max-w-xs">This takes 30-60 seconds. Script → Voiceover → B-roll → Render</p>
        </div>
      )}
    </div>
  );
}
