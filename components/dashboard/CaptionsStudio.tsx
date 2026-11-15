"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Subtitles, Download, Loader2, CheckCircle2, AlertCircle, Languages, Info } from "lucide-react";
import { makeZip } from "@/lib/zip";
import { translateLines } from "@/lib/gtranslate";
import { groupIntoLines, toSrt, toVtt, toTxt, type CaptionLine, type CaptionWord } from "@/lib/captions-format";

const LANGUAGES: [string, string][] = [
  ["Hindi (recommended, also for Urdu speech)", "hindi"], ["Urdu", "urdu"], ["English", "english"], ["Arabic", "arabic"], ["Spanish", "spanish"],
  ["French", "french"], ["German", "german"], ["Portuguese", "portuguese"], ["Italian", "italian"], ["Turkish", "turkish"],
  ["Indonesian", "indonesian"], ["Japanese", "japanese"], ["Korean", "korean"], ["Chinese", "chinese"],
];

const TARGETS: [string, string][] = [
  ["English", "en"], ["Arabic", "ar"], ["Urdu", "ur"], ["Spanish", "es"], ["French", "fr"], ["German", "de"], ["Portuguese", "pt"],
  ["Italian", "it"], ["Turkish", "tr"], ["Indonesian", "id"], ["Russian", "ru"], ["Chinese (Simplified)", "zh-Hans"], ["Japanese", "ja"],
  ["Korean", "ko"], ["Bengali", "bn"], ["Persian", "fa"], ["Malay", "ms"], ["Dutch", "nl"], ["Swahili", "sw"], ["Thai", "th"],
];

const MAX_FILE_BYTES = 300 * 1024 * 1024;
const MAX_MINUTES = 10;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function CaptionsStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [language, setLanguage] = useState("hindi");
  const [quality, setQuality] = useState("small");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [pct, setPct] = useState(0);
  const [lines, setLines] = useState<CaptionLine[]>([]);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [tlBusy, setTlBusy] = useState(false);
  const [tlStatus, setTlStatus] = useState("");
  const [videoRef, setVideoRef] = useState("");
  const [ytMsg, setYtMsg] = useState("");
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  const pick = (f: File) => {
    setError("");
    setLines([]);
    if (f.size > MAX_FILE_BYTES) {
      setError("This file is larger than 300 MB. Export it smaller (720p) and try again.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  /** Decodes the audio track to 16 kHz mono, which is what Whisper expects. */
  const decodeAudio = async (f: File): Promise<Float32Array> => {
    const ctx = new AudioContext({ sampleRate: 16000 });
    try {
      const buf = await ctx.decodeAudioData(await f.arrayBuffer());
      if (buf.duration > MAX_MINUTES * 60) throw new Error(`Please use a video of ${MAX_MINUTES} minutes or less (this one is ${fmt(buf.duration)}).`);
      const ch = buf.getChannelData(0);
      if (buf.numberOfChannels === 1) return ch.slice();
      const mix = new Float32Array(ch.length);
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < d.length; i++) mix[i] += d[i] / buf.numberOfChannels;
      }
      return mix;
    } finally {
      ctx.close().catch(() => {});
    }
  };

  const transcribe = async () => {
    if (!file) return;
    setError("");
    setLines([]);
    setBusy(true);
    setPct(0);
    try {
      setStatus("Reading the audio from your video…");
      const audio = await decodeAudio(file);
      workerRef.current?.terminate();
      const worker = new Worker(new URL("../../lib/whisper.worker.ts", import.meta.url), { type: "module" });
      workerRef.current = worker;
      const words: CaptionWord[] = await new Promise((resolve, reject) => {
        worker.onmessage = (e: MessageEvent<{ type: string; pct?: number; words?: CaptionWord[]; message?: string }>) => {
          const m = e.data;
          if (m.type === "download") {
            setStatus("Downloading the speech model (first time only, ~250 MB for Standard, ~800 MB for Best)…");
            setPct(m.pct || 0);
          } else if (m.type === "transcribing") {
            setStatus("Transcribing in your browser… this can take a few minutes, keep this tab open.");
            setPct(100);
          } else if (m.type === "done") resolve(m.words || []);
          else if (m.type === "error") reject(new Error(m.message || "Transcription failed."));
        };
        worker.onerror = (e) => reject(new Error(e.message || "The transcription worker crashed."));
        worker.postMessage({ audio, language, quality }, [audio.buffer]);
      });
      if (!words.length) throw new Error("No speech was found in this video.");
      setLines(groupIntoLines(words));
      setStatus("");
    } catch (e) {
      console.error("Captions failed:", e);
      setError(e instanceof Error ? e.message : "Transcription failed.");
      setStatus("");
    } finally {
      workerRef.current?.terminate();
      workerRef.current = null;
      setBusy(false);
    }
  };

  const download = (kind: "srt" | "vtt" | "txt") => {
    const body = kind === "srt" ? toSrt(lines) : kind === "vtt" ? toVtt(lines) : toTxt(lines);
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `captions.${kind}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /** Translates (free, in the browser) every ticked language. Returns one SRT per language, Hindi first. */
  const buildFiles = async () => {
    const files: { name: string; code: string; label: string; text: string }[] = [{ name: "captions.hi.srt", code: "hi", label: "Hindi", text: toSrt(lines) }];
    const src = lines.map((l) => l.text);
    for (let i = 0; i < picked.length; i++) {
      const [label, code] = TARGETS.find((t) => t[1] === picked[i]) as [string, string];
      setTlStatus(`Translating to ${label} (${i + 1}/${picked.length})…`);
      const out = await translateLines(src, "hi", code);
      files.push({ name: `captions.${code}.srt`, code, label, text: toSrt(lines.map((l, k) => ({ ...l, text: out[k] }))) });
    }
    return files;
  };

  const downloadAll = async () => {
    setError("");
    setYtMsg("");
    setTlBusy(true);
    try {
      const files = await buildFiles();
      const url = URL.createObjectURL(makeZip(files));
      const a = document.createElement("a");
      a.href = url;
      a.download = "captions-all-languages.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed.");
    } finally {
      setTlBusy(false);
      setTlStatus("");
    }
  };

  const uploadToYouTube = async () => {
    setError("");
    setYtMsg("");
    const m = videoRef.trim().match(/(?:v=|youtu\.be\/|shorts\/|embed\/)?([A-Za-z0-9_-]{11})(?:[?&#/]|$)/);
    if (!m) { setError("Paste your YouTube video link (or the 11-character video ID)."); return; }
    setTlBusy(true);
    try {
      const files = await buildFiles();
      const failed: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setTlStatus(`Uploading ${files[i].label} to YouTube (${i + 1}/${files.length})…`);
        const r = await fetch("/api/captions/youtube-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: m[1], language: files[i].code, name: files[i].label, srt: files[i].text }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (r.status === 403 || r.status === 400 || r.status === 401) throw new Error(j.error || "Upload refused.");
          failed.push(`${files[i].label}: ${j.error || "failed"}`);
        }
      }
      setYtMsg(failed.length ? `Uploaded the rest. Problems: ${failed.join(" | ")}` : `All ${files.length} caption tracks are on your YouTube video.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setTlBusy(false);
      setTlStatus("");
    }
  };

  const editLine = (i: number, text: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, text } : l)));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Subtitles size={22} /> Auto Captions</h1>
        <p className="text-gray-400 text-sm mt-1">
          Get timed captions from your video&apos;s voice. Download SRT / VTT and import them in CapCut, Premiere or YouTube.
        </p>
      </div>

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-lg p-4 text-sm text-gray-300 flex gap-3">
        <Info className="text-[#FFD200] shrink-0 mt-0.5" size={16} />
        <p>Everything runs inside your browser - your video is never uploaded and it&apos;s free. Keep this tab open while it works.</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-semibold flex items-center gap-2"><Upload size={18} /> 1. Your video (or audio)</h2>
        <div
          className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-[#FFD200] transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
        >
          <Upload className="mx-auto text-gray-500 mb-2" size={32} />
          <p className="text-gray-400 text-sm">{file ? file.name : "Drop a video here or click to choose"}</p>
          <p className="text-gray-600 text-xs mt-1">MP4, MOV, WebM, MP3, WAV · up to {MAX_MINUTES} minutes · max 300 MB</p>
          <input ref={inputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
        </div>
        {preview && file?.type.startsWith("video/") && <video src={preview} controls className="w-full max-h-48 rounded-lg bg-black" />}

        <h2 className="text-white font-semibold flex items-center gap-2 pt-2"><Languages size={18} /> 2. Language</h2>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
        >
          {LANGUAGES.map(([label, value]) => <option key={label} value={value}>{label}</option>)}
        </select>
        <p className="text-gray-600 text-xs">Pick the language that is actually spoken in the video. Wrong language = wrong text.</p>
        <select value={quality} onChange={(e) => setQuality(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
          <option value="small">Standard quality (faster, ~250 MB first download)</option>
          <option value="medium">Best quality (slower, ~800 MB first download, much more accurate for Urdu)</option>
        </select>

        <button
          onClick={transcribe}
          disabled={!file || busy}
          className="w-full bg-[#FFD200] hover:bg-[#FFE033] disabled:opacity-50 text-[#080808] font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Subtitles size={18} />}
          {busy ? "Working…" : "3. Generate captions"}
        </button>
        {busy && (
          <div>
            <p className="text-gray-400 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> {status}</p>
            <div className="h-2 mt-2 rounded-full bg-black/60 border border-gray-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FFD200] to-[#FFE680] transition-[width] duration-300" style={{ width: `${Math.max(4, pct)}%` }} />
            </div>
          </div>
        )}
      </div>

      {lines.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-white font-semibold flex items-center gap-2"><CheckCircle2 size={18} className="text-green-400" /> {lines.length} caption lines</h2>
            <div className="flex gap-2">
              {(["srt", "vtt", "txt"] as const).map((k) => (
                <button key={k} onClick={() => download(k)} className="text-sm px-3 py-1.5 rounded-lg bg-[#FFD200] text-[#080808] font-semibold flex items-center gap-1">
                  <Download size={14} /> {k.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <p className="text-gray-500 text-xs">Fix any mistakes below before downloading or translating.</p>
          <div className="border border-gray-800 rounded-lg p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Languages size={16} /> Translate into more languages (one ZIP of .srt files)</h3>
            <div className="flex flex-wrap gap-2">
              {TARGETS.map(([label, code]) => (
                <label key={code} className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer ${picked.includes(code) ? "border-[#FFD200] text-[#FFD200]" : "border-gray-700 text-gray-300"}`}>
                  <input type="checkbox" className="hidden" checked={picked.includes(code)} onChange={() => setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]))} />
                  {label}
                </label>
              ))}
            </div>
            <button onClick={() => setPicked(picked.length === TARGETS.length ? [] : TARGETS.map((t) => t[1]))} className="text-xs text-gray-400 underline">{picked.length === TARGETS.length ? "Clear all" : "Select all"}</button>
            <button onClick={downloadAll} disabled={tlBusy || picked.length === 0} className="w-full bg-[#FFD200] disabled:opacity-50 text-[#080808] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm">
              {tlBusy ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              {tlBusy ? tlStatus : `Translate ${picked.length || ""} language${picked.length === 1 ? "" : "s"} & download ZIP (free)`}
            </button>
            <div className="border-t border-gray-800 pt-3 space-y-2">
              <p className="text-white text-sm font-semibold">Or upload straight to YouTube (Creator plan+, your connected channel)</p>
              <input value={videoRef} onChange={(e) => setVideoRef(e.target.value)} placeholder="Paste the YouTube video link of this video" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
              <button onClick={uploadToYouTube} disabled={tlBusy || picked.length === 0 || !videoRef.trim()} className="w-full border border-[#FFD200] text-[#FFD200] disabled:opacity-50 font-bold py-2.5 rounded-xl text-sm">
                Translate &amp; upload all to YouTube
              </button>
              {ytMsg && <p className="text-green-400 text-xs">{ytMsg}</p>}
              <p className="text-gray-600 text-xs">The video must be on the channel you connected in TubeTarzan. If a language already exists on that video, delete it in YouTube Studio first.</p>
            </div>
            <p className="text-gray-600 text-xs">Files are named captions.&lt;language&gt;.srt - upload each in YouTube Studio → Subtitles. The Hindi file is included.</p>
          </div>
          <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
            {lines.map((l, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-gray-600 text-xs font-mono w-20 shrink-0 pt-2">{fmt(l.start)}–{fmt(l.end)}</span>
                <input
                  value={l.text}
                  onChange={(e) => editLine(i, e.target.value)}
                  dir="auto" className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
