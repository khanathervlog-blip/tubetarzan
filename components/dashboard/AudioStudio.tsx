"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Play, Pause, Download, AlertCircle } from "lucide-react";

interface Voice {
  name: string;
  label: string;
  gender: string;
}

interface VoicesMap {
  [languageCode: string]: Voice[];
}

const LANGUAGE_LABELS: Record<string, string> = {
  "en-US": "🇺🇸 English (US)",
  "ur-PK": "🇵🇰 Urdu",
  "hi-IN": "🇮🇳 Hindi",
  "ar-XA": "🇸🇦 Arabic",
};

const SPEED_OPTIONS = [
  { value: 0.75, label: "0.75×" },
  { value: 1.0, label: "1.0× (Normal)" },
  { value: 1.1, label: "1.1×" },
  { value: 1.25, label: "1.25×" },
  { value: 1.5, label: "1.5×" },
];

function mergeBase64AudioChunks(chunks: string[]): string {
  if (chunks.length === 1) return chunks[0];
  const buffers = chunks.map((b64) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  });
  const total = buffers.reduce((sum, b) => sum + b.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    merged.set(buf, offset);
    offset += buf.length;
  }
  const blob = new Blob([merged], { type: "audio/mp3" });
  return URL.createObjectURL(blob);
}

export default function AudioStudio() {
  const [voices, setVoices] = useState<VoicesMap>({});
  const [languageCode, setLanguageCode] = useState("en-US");
  const [voiceName, setVoiceName] = useState("en-US-Neural2-D");
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [configMissing, setConfigMissing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load available voices on mount
  useEffect(() => {
    fetch("/api/audio/generate")
      .then((r) => r.json())
      .then((d) => {
        if (d.voices) {
          setVoices(d.voices as VoicesMap);
          const firstLang = Object.keys(d.voices)[0];
          if (firstLang) {
            setLanguageCode(firstLang);
            const firstVoice = (d.voices as VoicesMap)[firstLang]?.[0];
            if (firstVoice) setVoiceName(firstVoice.name);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Load transcript from localStorage if coming from transcript fetcher
  useEffect(() => {
    const saved = localStorage.getItem("tt_transcript_text");
    if (saved && !text) {
      setText(saved.slice(0, 5000));
      localStorage.removeItem("tt_transcript_text");
    }
  }, []);

  function handleLanguageChange(lang: string) {
    setLanguageCode(lang);
    const firstVoice = voices[lang]?.[0];
    if (firstVoice) setVoiceName(firstVoice.name);
  }

  async function handleGenerate() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setUpgradeRequired(false);
    setConfigMissing(false);
    setAudioUrl(null);

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const res = await fetch("/api/audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), voiceName, languageCode, speakingRate }),
      });
      const data = await res.json();

      if (res.status === 403 && data.upgradeRequired) {
        setUpgradeRequired(true);
        return;
      }
      if (res.status === 503 && data.configMissing) {
        setConfigMissing(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Audio generation failed");

      const chunks: string[] = data.allChunks || [data.audioChunks?.[0]].filter(Boolean);
      if (!chunks.length) throw new Error("No audio returned");

      const url = mergeBase64AudioChunks(chunks);
      setAudioUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  function downloadAudio() {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `tubetarzan-audio-${Date.now()}.mp3`;
    a.click();
  }

  const charCount = text.length;
  const charLimit = 15000;
  const currentVoices = voices[languageCode] || [];

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">Audio Studio</h1>
        <p className="text-[#555555] text-sm">
          Convert any script to professional-quality voiceover using Google Cloud TTS. Free up to 4
          million characters per month.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Voice settings */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Voice Settings</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Language */}
            <div>
              <label className="block text-xs font-medium text-[#999999] mb-2">Language</label>
              <select
                value={languageCode}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:border-[#FFD200] min-h-[44px]"
              >
                {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice */}
            <div>
              <label className="block text-xs font-medium text-[#999999] mb-2">Voice</label>
              <select
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:border-[#FFD200] min-h-[44px]"
              >
                {currentVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Speed */}
            <div>
              <label className="block text-xs font-medium text-[#999999] mb-2">Speed</label>
              <select
                value={speakingRate}
                onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:border-[#FFD200] min-h-[44px]"
              >
                {SPEED_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Text input */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-[#999999]">Script / Text</label>
            <span
              className={`text-xs ${charCount > charLimit ? "text-[#FF3B3B]" : charCount > charLimit * 0.8 ? "text-[#FFD200]" : "text-[#555555]"}`}
            >
              {charCount.toLocaleString()} / {charLimit.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, charLimit))}
            rows={10}
            placeholder="Paste your script here or type your text...&#10;&#10;Tip: Use the Transcript Fetcher to grab competitor scripts, or copy your Script Writer output here."
            className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors resize-none"
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-[#333333] text-xs">
              Long text is automatically split into chunks and merged seamlessly.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading || !text.trim() || charCount > charLimit}
              className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-sm px-6 py-3 rounded-btn hover:bg-[#FFE033] transition-colors min-h-[44px] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {loading ? "Generating..." : "Generate Audio"}
            </button>
          </div>
        </div>

        {/* Errors */}
        {upgradeRequired && (
          <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-btn px-4 py-4">
            <p className="text-[#FFD200] text-sm font-medium mb-1">Creator Plan Required</p>
            <p className="text-[#999999] text-sm">
              Audio generation is available on Creator, Pro, and Agency plans.
            </p>
            <a
              href="/dashboard/settings?tab=billing"
              className="inline-block mt-3 text-xs font-bold text-[#080808] bg-[#FFD200] px-4 py-2 rounded-btn hover:bg-[#FFE033] transition-colors"
            >
              Upgrade Now →
            </a>
          </div>
        )}

        {configMissing && (
          <div className="bg-[#FF3B3B]/5 border border-[#FF3B3B]/20 rounded-btn px-4 py-4">
            <p className="text-[#FF3B3B] text-sm font-medium mb-1">Google TTS Not Configured</p>
            <p className="text-[#999999] text-sm">
              Add{" "}
              <code className="bg-[#1E1E1E] px-1 py-0.5 rounded text-[#FFD200] text-xs">
                GOOGLE_TTS_API_KEY
              </code>{" "}
              to your Vercel environment variables. Enable Cloud Text-to-Speech API in Google Cloud
              Console.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-[#FF3B3B]/5 border border-[#FF3B3B]/20 rounded-btn px-4 py-3">
            <AlertCircle className="w-4 h-4 text-[#FF3B3B] mt-0.5 shrink-0" />
            <p className="text-[#FF3B3B] text-sm">{error}</p>
          </div>
        )}

        {/* Audio player */}
        {audioUrl && (
          <div className="bg-[#111111] border border-[#22C55E]/20 rounded-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[#22C55E] text-sm font-medium">Audio ready!</span>
            </div>

            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="flex items-center justify-center w-12 h-12 bg-[#FFD200] text-[#080808] rounded-full hover:bg-[#FFE033] transition-colors shrink-0"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Generated voiceover</p>
                <p className="text-[#555555] text-xs">
                  {voiceName} · {LANGUAGE_LABELS[languageCode] || languageCode}
                </p>
              </div>
              <button
                onClick={downloadAudio}
                className="flex items-center gap-2 bg-[#1E1E1E] text-white text-sm px-4 py-2.5 rounded-btn hover:bg-[#2A2A2A] transition-colors"
              >
                <Download className="w-4 h-4" />
                Download MP3
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
