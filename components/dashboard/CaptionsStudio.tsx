"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Subtitles, Play, Download, Loader2, CheckCircle2, AlertCircle, Languages, Palette, Sliders, Flame, RefreshCw } from "lucide-react";

interface Word {
  word: string;
  start: number;
  end: number;
}

interface CaptionStyle {
  key: string;
  label: string;
  desc: string;
  preview: string;
}

const CAPTION_STYLES: CaptionStyle[] = [
  { key: "classic_white", label: "Classic White", desc: "Clean white text, black outline", preview: "bg-black text-white" },
  { key: "yellow_pop", label: "Yellow Pop", desc: "Bold yellow, high contrast", preview: "bg-black text-yellow-400" },
  { key: "word_highlight", label: "Word Highlight", desc: "Each word lights up as spoken", preview: "bg-black text-gray-400" },
  { key: "karaoke", label: "Karaoke", desc: "Word-by-word sweep effect", preview: "bg-black text-white" },
  { key: "netflix", label: "Netflix Style", desc: "Bottom-aligned, semi-transparent bg", preview: "bg-gray-900/80 text-white" },
];

const LANGUAGES = ["Auto Detect", "English", "Spanish", "French", "German", "Portuguese", "Italian", "Japanese", "Korean", "Chinese", "Arabic", "Hindi"];

type Step = "upload" | "generate" | "style" | "customize" | "burn";

export default function CaptionsStudio() {
  const [step, setStep] = useState<Step>("upload");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [language, setLanguage] = useState("Auto Detect");
  const [jobId, setJobId] = useState("");
  const [words, setWords] = useState<Word[]>([]);
  const [srt, setSrt] = useState("");
  const [languageDetected, setLanguageDetected] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState("classic_white");
  const [fontSize, setFontSize] = useState(24);
  const [position, setPosition] = useState("bottom");
  const [primaryColor, setPrimaryColor] = useState("#FFFFFF");
  const [highlightColor, setHighlightColor] = useState("#FFD200");
  const [currentTime, setCurrentTime] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState("Spanish");
  const [burning, setBurning] = useState(false);
  const [burnStatus, setBurnStatus] = useState<"idle" | "burning" | "complete" | "failed">("idle");
  const [outputUrl, setOutputUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTime(video.currentTime);
    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [step]);

  const handleVideoFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    setVideoUrl(url);
  };

  const currentCaption = (): string => {
    if (!words.length) return "";
    const active = words.filter((w) => w.start <= currentTime && w.end >= currentTime);
    if (active.length) return active.map((w) => w.word).join(" ");
    // Show nearest upcoming word
    const upcoming = words.find((w) => w.start > currentTime);
    if (upcoming && upcoming.start - currentTime < 0.5) return upcoming.word;
    return "";
  };

  const generateCaptions = async () => {
    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/captions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          language: language === "Auto Detect" ? undefined : language,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "monthly_limit_reached") {
          setError(`Monthly limit reached (${data.used}/${data.limit} jobs used).`);
        } else {
          setError(data.error || "Transcription failed.");
        }
        return;
      }
      setJobId(data.jobId);
      setWords(data.words || []);
      setSrt(data.srt || "");
      setLanguageDetected(data.languageDetected || language);
      setWordCount(data.wordCount || 0);
      setStep("style");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const translateCaptions = async () => {
    setTranslating(true);
    try {
      const res = await fetch("/api/captions/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words, targetLanguage: targetLang }),
      });
      const data = await res.json();
      if (res.ok && data.words) setWords(data.words);
    } finally {
      setTranslating(false);
    }
  };

  const exportCaptions = async (format: "srt" | "vtt") => {
    const res = await fetch("/api/captions/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words, format }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `captions.${format}`;
    a.click();
  };

  const burnCaptions = async () => {
    setBurning(true);
    setBurnStatus("burning");
    setStep("burn");

    const res = await fetch("/api/captions/burn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        videoUrl,
        words,
        style: selectedStyle,
        fontSize,
        position,
        primaryColor,
        highlightColor,
      }),
    });

    if (!res.ok) {
      setBurnStatus("failed");
      setBurning(false);
      return;
    }

    // Poll for completion
    pollRef.current = setInterval(async () => {
      const statusRes = await fetch(`/api/captions/status/${jobId}`);
      const data = await statusRes.json();
      if (data.status === "complete" && data.output_url) {
        clearInterval(pollRef.current!);
        setBurnStatus("complete");
        setOutputUrl(data.output_url);
        setBurning(false);
      } else if (data.status === "failed") {
        clearInterval(pollRef.current!);
        setBurnStatus("failed");
        setBurning(false);
      }
    }, 5000);
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep("upload");
    setVideoUrl("");
    setVideoPreview("");
    setWords([]);
    setSrt("");
    setJobId("");
    setWordCount(0);
    setLanguageDetected("");
    setOutputUrl("");
    setBurnStatus("idle");
    setError("");
  };

  const stepOrder: Step[] = ["upload", "generate", "style", "customize", "burn"];
  const stepLabels = ["Upload", "Transcribe", "Style", "Customize", "Result"];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Auto Captions Studio</h1>
        <p className="text-gray-400 text-sm mt-1">AI-powered captions with 5 styles, translation, and burned-in export</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Steps */}
      <div className="flex items-center gap-2 text-sm">
        {stepOrder.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? "bg-red-600 text-white" : (stepOrder.indexOf(step) > i ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400")}`}>
              {stepOrder.indexOf(step) > i ? "✓" : i + 1}
            </div>
            <span className={step === s ? "text-white" : "text-gray-500"}>{stepLabels[i]}</span>
            {i < stepOrder.length - 1 && <span className="text-gray-700">—</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Upload size={18} /> Upload Video</h2>
            <div
              className="border-2 border-dashed border-gray-700 rounded-lg p-10 text-center cursor-pointer hover:border-red-600 transition-colors"
              onClick={() => videoInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleVideoFile(f); }}
            >
              <Upload className="mx-auto text-gray-500 mb-2" size={36} />
              <p className="text-gray-400 text-sm">Drop video here or click to upload</p>
              <p className="text-gray-600 text-xs mt-1">MP4, MOV, WebM · max 2GB</p>
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); }} />
            </div>
            {videoPreview && (
              <div className="mt-4">
                <video ref={videoRef} src={videoPreview} controls className="w-full max-h-48 rounded-lg bg-black" />
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Video ready</p>
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><Languages size={18} /> Language</h2>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
            >
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <p className="text-gray-600 text-xs mt-1">Auto Detect works well for clear speech in major languages</p>
          </div>

          <button
            onClick={() => setStep("generate")}
            disabled={!videoUrl}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Next: Generate Captions
          </button>
        </div>
      )}

      {/* Step 2: Generate */}
      {step === "generate" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <Subtitles className="text-red-500 mx-auto mb-3" size={40} />
            <h2 className="text-white text-lg font-semibold mb-2">Ready to Transcribe</h2>
            <p className="text-gray-400 text-sm mb-2">Language: <span className="text-white">{language}</span></p>
            <p className="text-gray-500 text-xs">faster-whisper AI will transcribe your video with word-level timestamps</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("upload")} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl transition-colors">
              Back
            </button>
            <button
              onClick={generateCaptions}
              disabled={generating}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {generating ? <><Loader2 className="animate-spin" size={18} /> Transcribing...</> : "Generate Captions"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Style picker */}
      {step === "style" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2"><Palette size={18} /> Choose Style</h2>
              <div className="text-right">
                <span className="text-green-400 text-xs">{wordCount} words transcribed</span>
                {languageDetected && <p className="text-gray-500 text-xs">Detected: {languageDetected}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {CAPTION_STYLES.map((style) => (
                <button
                  key={style.key}
                  onClick={() => setSelectedStyle(style.key)}
                  className={`p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all ${selectedStyle === style.key ? "border-red-500 bg-red-600/10" : "border-gray-700 hover:border-gray-500"}`}
                >
                  <div>
                    <p className={`font-semibold text-sm ${selectedStyle === style.key ? "text-red-400" : "text-white"}`}>{style.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{style.desc}</p>
                  </div>
                  <div className={`text-xs px-3 py-1.5 rounded ${style.preview} font-bold`}>
                    {style.key === "word_highlight" ? <span><span className="text-white">Hello</span> <span className="text-yellow-400">World</span></span> : "Sample Text"}
                  </div>
                  {selectedStyle === style.key && <CheckCircle2 className="text-red-400 ml-2 shrink-0" size={18} />}
                </button>
              ))}
            </div>
          </div>

          {/* Translation */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><Languages size={18} /> Translate Captions (optional)</h2>
            <div className="flex gap-3">
              <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                {LANGUAGES.filter((l) => l !== "Auto Detect").map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button onClick={translateCaptions} disabled={translating} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50">
                {translating ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} Translate
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-2">Timestamps are preserved after translation</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("generate")} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl transition-colors">
              Back
            </button>
            <button onClick={() => setStep("customize")} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors">
              Next: Customize
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Customize + CSS Preview */}
      {step === "customize" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Sliders size={18} /> Customize</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-gray-400 text-xs block mb-1">Font Size</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={16} max={48} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="flex-1 accent-red-600" />
                  <span className="text-white text-sm w-8">{fontSize}</span>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">Position</label>
                <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                  <option value="middle">Middle</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">Text Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent border-0" />
                  <span className="text-gray-400 text-xs">{primaryColor}</span>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">Highlight Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={highlightColor} onChange={(e) => setHighlightColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent border-0" />
                  <span className="text-gray-400 text-xs">{highlightColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CSS Preview overlay */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><Play size={18} /> Live Preview</h2>
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoPreview}
                controls
                className="w-full"
                onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
              />
              {currentCaption() && (
                <div
                  className={`absolute left-0 right-0 flex justify-center pointer-events-none ${position === "top" ? "top-4" : position === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-8"}`}
                >
                  <span
                    style={{
                      fontSize: `${fontSize * 0.6}px`,
                      color: primaryColor,
                      backgroundColor: selectedStyle === "netflix" ? "rgba(0,0,0,0.75)" : "transparent",
                      textShadow: selectedStyle === "netflix" ? "none" : "2px 2px 4px #000, -2px -2px 4px #000",
                      padding: selectedStyle === "netflix" ? "4px 12px" : "0",
                      borderRadius: "4px",
                      maxWidth: "80%",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {currentCaption()}
                  </span>
                </div>
              )}
            </div>
            <p className="text-gray-600 text-xs mt-2 text-center">Play the video to preview captions in real-time (CSS preview — exact rendering varies per style)</p>
          </div>

          {/* Export options */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Export captions file</span>
            <div className="flex gap-2">
              <button onClick={() => exportCaptions("srt")} className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 transition-colors">
                <Download size={12} /> SRT
              </button>
              <button onClick={() => exportCaptions("vtt")} className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 transition-colors">
                <Download size={12} /> VTT
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("style")} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl transition-colors">
              Back
            </button>
            <button
              onClick={burnCaptions}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Flame size={18} /> Burn Captions
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Burn result */}
      {step === "burn" && (
        <div className="space-y-4">
          {burnStatus === "burning" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <Loader2 className="animate-spin text-red-500 mx-auto mb-4" size={48} />
              <h2 className="text-white text-xl font-semibold mb-2">Burning Captions</h2>
              <p className="text-gray-400 text-sm">FFmpeg is rendering captions onto your video. This may take a few minutes.</p>
            </div>
          )}
          {burnStatus === "complete" && outputUrl && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="text-green-400" size={20} />
                <h2 className="text-white font-semibold">Captions Burned Successfully</h2>
              </div>
              <video src={outputUrl} controls className="w-full rounded-lg bg-black mb-4" />
              <a
                href={outputUrl}
                download="captioned-video.mp4"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl text-center flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={18} /> Download Captioned Video
              </a>
            </div>
          )}
          {burnStatus === "failed" && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-8 text-center">
              <AlertCircle className="text-red-400 mx-auto mb-3" size={32} />
              <h2 className="text-white font-semibold mb-2">Burn Failed</h2>
              <p className="text-gray-400 text-sm mb-4">Something went wrong. You can still export SRT/VTT above.</p>
            </div>
          )}
          <button onClick={reset} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl transition-colors">
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
