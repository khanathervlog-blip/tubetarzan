"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Video, Mic, Play, Download, Scissors, Loader2, CheckCircle2, AlertCircle, RefreshCw, Camera } from "lucide-react";

interface Avatar {
  id: string;
  thumbnailUrl: string;
  duration: number;
  videoUrl: string;
}

interface Job {
  id: string;
  status: "processing" | "complete" | "failed";
  output_url?: string;
  duration_seconds?: number;
  parts_urls?: string[];
  parts_count?: number;
  error?: string;
}

type Step = "video" | "audio" | "generate" | "result";

export default function LipSyncStudio() {
  const [step, setStep] = useState<Step>("video");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioSource, setAudioSource] = useState<"upload" | "record">("upload");
  const [quality, setQuality] = useState<"fast" | "balanced" | "best">("balanced");
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadAvatars = async () => {
    setAvatarsLoading(true);
    try {
      const res = await fetch("/api/lipsync/avatars");
      const data = await res.json();
      setAvatars(data.avatars || []);
    } finally {
      setAvatarsLoading(false);
    }
  };

  useEffect(() => {
    loadAvatars();
  }, []);

  const handleVideoFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    // Upload to Supabase Storage would happen here in production
    // For now, we use the blob URL as a placeholder
    setVideoUrl(url);
    setSelectedAvatar(null);
  };

  const handleAudioFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordingBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const startJob = async () => {
    setError("");
    const srcVideo = selectedAvatar ? selectedAvatar.videoUrl : videoUrl;
    if (!srcVideo || !audioUrl) {
      setError("Please provide both video and audio.");
      return;
    }

    setStep("generate");
    const res = await fetch("/api/lipsync/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl: srcVideo, audioUrl, quality }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.error === "upgrade_required") {
        setError("Lip Sync Studio requires Creator plan or higher.");
      } else if (data.error === "monthly_limit_reached") {
        setError(`Monthly limit reached (${data.used}/${data.limit} jobs used).`);
      } else {
        setError(data.error || "Failed to start job.");
      }
      setStep("video");
      return;
    }

    const jobId = data.jobId;
    setJob({ id: jobId, status: "processing" });
    setPolling(true);

    pollRef.current = setInterval(async () => {
      const statusRes = await fetch(`/api/lipsync/status/${jobId}`);
      const statusData: Job = await statusRes.json();
      setJob(statusData);

      if (statusData.status === "complete") {
        clearInterval(pollRef.current!);
        setPolling(false);
        setStep("result");
      } else if (statusData.status === "failed") {
        clearInterval(pollRef.current!);
        setPolling(false);
        setError(statusData.error || "Job failed.");
        setStep("video");
      }
    }, 5000);
  };

  const splitVideo = async () => {
    if (!job?.id) return;
    const res = await fetch("/api/lipsync/split", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setJob((prev) => prev ? { ...prev, parts_urls: data.parts, parts_count: data.total_segments } : prev);
    }
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep("video");
    setVideoUrl("");
    setVideoPreview("");
    setAudioUrl("");
    setRecordingBlob(null);
    setRecordingTime(0);
    setJob(null);
    setPolling(false);
    setError("");
    setSelectedAvatar(null);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Lip Sync Studio</h1>
        <p className="text-gray-400 text-sm mt-1">Sync any audio to a face video automatically using AI</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["video", "audio", "generate", "result"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? "bg-red-600 text-white" : (["video", "audio", "generate", "result"].indexOf(step) > i ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400")}`}>
              {["video", "audio", "generate", "result"].indexOf(step) > i ? "✓" : i + 1}
            </div>
            <span className={step === s ? "text-white" : "text-gray-500"}>
              {s === "video" ? "Face Video" : s === "audio" ? "Audio" : s === "generate" ? "Processing" : "Result"}
            </span>
            {i < 3 && <span className="text-gray-700">—</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Video */}
      {step === "video" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Video size={18} /> Select Face Video</h2>

            {/* Upload own video */}
            <div
              className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-red-600 transition-colors mb-4"
              onClick={() => videoInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleVideoFile(f); }}
            >
              <Upload className="mx-auto text-gray-500 mb-2" size={32} />
              <p className="text-gray-400 text-sm">Drop your face video here or click to upload</p>
              <p className="text-gray-600 text-xs mt-1">MP4, MOV, WebM · max 500MB</p>
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); }} />
            </div>

            {videoPreview && (
              <div className="mb-4">
                <video src={videoPreview} controls className="w-full max-h-48 rounded-lg bg-black" />
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Video selected</p>
              </div>
            )}

            {/* Avatar library */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-sm font-medium flex items-center gap-2"><Camera size={14} /> Or choose from avatar library</p>
                <button onClick={loadAvatars} className="text-gray-500 hover:text-white transition-colors">
                  <RefreshCw size={14} className={avatarsLoading ? "animate-spin" : ""} />
                </button>
              </div>
              {avatarsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-500" size={20} /></div>
              ) : avatars.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {avatars.map((av) => (
                    <div
                      key={av.id}
                      onClick={() => { setSelectedAvatar(av); setVideoPreview(""); setVideoUrl(""); }}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedAvatar?.id === av.id ? "border-red-500" : "border-gray-700 hover:border-gray-500"}`}
                    >
                      <img src={av.thumbnailUrl} alt="Avatar" className="w-full h-28 object-cover" />
                      {selectedAvatar?.id === av.id && (
                        <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                          <CheckCircle2 className="text-white" size={24} />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1 rounded">{av.duration}s</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm text-center py-4">No avatars available (add PEXELS_API_KEY to env)</p>
              )}
            </div>

            {selectedAvatar && (
              <p className="text-green-400 text-xs mt-3 flex items-center gap-1"><CheckCircle2 size={12} /> Avatar selected ({selectedAvatar.duration}s)</p>
            )}
          </div>

          <button
            onClick={() => setStep("audio")}
            disabled={!videoUrl && !selectedAvatar}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Next: Add Audio
          </button>
        </div>
      )}

      {/* Step 2: Audio */}
      {step === "audio" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Mic size={18} /> Add Audio</h2>

            <div className="flex gap-3 mb-6">
              <button onClick={() => setAudioSource("upload")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${audioSource === "upload" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                Upload File
              </button>
              <button onClick={() => setAudioSource("record")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${audioSource === "record" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                Record Voice
              </button>
            </div>

            {audioSource === "upload" ? (
              <div
                className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-red-600 transition-colors"
                onClick={() => audioInputRef.current?.click()}
              >
                <Upload className="mx-auto text-gray-500 mb-2" size={32} />
                <p className="text-gray-400 text-sm">Drop audio file or click to upload</p>
                <p className="text-gray-600 text-xs mt-1">MP3, WAV, M4A, AAC · max 100MB</p>
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioFile(f); }} />
              </div>
            ) : (
              <div className="text-center py-6">
                {!isRecording && !recordingBlob && (
                  <button onClick={startRecording} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 mx-auto">
                    <Mic size={18} /> Start Recording
                  </button>
                )}
                {isRecording && (
                  <div>
                    <div className="w-16 h-16 bg-red-600 rounded-full mx-auto flex items-center justify-center mb-3 animate-pulse">
                      <Mic className="text-white" size={28} />
                    </div>
                    <p className="text-white text-xl font-mono mb-4">{formatTime(recordingTime)}</p>
                    <button onClick={stopRecording} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-full text-sm">
                      Stop Recording
                    </button>
                  </div>
                )}
                {recordingBlob && !isRecording && (
                  <div>
                    <CheckCircle2 className="text-green-400 mx-auto mb-2" size={32} />
                    <p className="text-green-400 text-sm mb-3">Recording saved ({formatTime(recordingTime)})</p>
                    <button onClick={() => { setRecordingBlob(null); setAudioUrl(""); setRecordingTime(0); }} className="text-gray-400 hover:text-white text-sm underline">
                      Record again
                    </button>
                  </div>
                )}
              </div>
            )}

            {audioUrl && (
              <div className="mt-4">
                <audio src={audioUrl} controls className="w-full" />
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Audio ready</p>
              </div>
            )}
          </div>

          {/* Quality selector */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Processing Quality</h2>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "fast", label: "Fast", desc: "~2 min · Good sync" },
                { key: "balanced", label: "Balanced", desc: "~5 min · Great sync" },
                { key: "best", label: "Best", desc: "~12 min · Perfect sync" },
              ] as const).map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setQuality(key)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${quality === key ? "border-red-500 bg-red-600/10" : "border-gray-700 hover:border-gray-500"}`}
                >
                  <p className={`font-semibold text-sm ${quality === key ? "text-red-400" : "text-white"}`}>{label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("video")} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl transition-colors">
              Back
            </button>
            <button
              onClick={startJob}
              disabled={!audioUrl}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Start Lip Sync
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === "generate" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Loader2 className="animate-spin text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-white text-xl font-semibold mb-2">Processing Lip Sync</h2>
          <p className="text-gray-400 text-sm">AI is syncing your audio to the face video. This may take a few minutes.</p>
          {polling && (
            <p className="text-gray-600 text-xs mt-4">Checking status every 5 seconds...</p>
          )}
        </div>
      )}

      {/* Step 4: Result */}
      {step === "result" && job?.output_url && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="text-green-400" size={20} />
              <h2 className="text-white font-semibold">Lip Sync Complete</h2>
              {job.duration_seconds && <span className="text-gray-500 text-sm">({Math.round(job.duration_seconds)}s)</span>}
            </div>
            <video src={job.output_url} controls className="w-full rounded-lg bg-black mb-4" />
            <div className="flex gap-3">
              <a
                href={job.output_url}
                download="lipsync-output.mp4"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl text-center flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={18} /> Download
              </a>
              <button
                onClick={splitVideo}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Scissors size={18} /> Split into Shorts
              </button>
            </div>
          </div>

          {job.parts_urls && job.parts_urls.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3">Segments ({job.parts_count})</h3>
              <div className="space-y-2">
                {job.parts_urls.map((url, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Play size={14} className="text-gray-400" />
                      <span className="text-gray-300 text-sm">Segment {i + 1}</span>
                    </div>
                    <a href={url} download={`segment-${i + 1}.mp4`} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                      <Download size={12} /> Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={reset} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl transition-colors">
            Create Another
          </button>
        </div>
      )}
    </div>
  );
}
