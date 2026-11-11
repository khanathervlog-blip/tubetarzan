"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload, Video, Mic, Download, Loader2, CheckCircle2, AlertCircle, RefreshCw, Camera, Scissors, Play, Trash2, PauseCircle, Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatSeconds } from "@/lib/plans";

interface Avatar { id: string; thumbnailUrl: string; duration: number; videoUrl: string }
interface Access {
  allowed: boolean;
  isAdmin: boolean;
  plan: string;
  allowanceSeconds: number | null;
  usedSeconds: number;
  remainingSeconds: number | null;
  maxRunSeconds: number;
  configured: boolean;
  reason?: string;
}
interface Clip { id: string; idx: number; start: number; duration: number; status: string; error?: string | null; attempts?: number; downloadUrl?: string | null }
interface Run { id: string; created_at: string; source_name: string | null; mode: string; status: string; total_seconds: number; clip_count: number; done_count: number; error: string | null; clips: Clip[] }

const REASONS: Record<string, string> = {
  upgrade_required: "Lip Sync is included in the Creator, Pro and Agency plans.",
  coming_soon: "Lip Sync for subscribers is coming soon.",
  trial_not_included: "Lip Sync minutes start once your free trial converts to a paid subscription.",
  subscription_inactive: "Your subscription isn't active. Renew it to use your Lip Sync minutes.",
  not_set_up: "Lip Sync isn't set up in the database yet (admin: run PHASE9_MIGRATIONS.sql).",
  monthly_limit_reached: "You've used this month's Lip Sync minutes.",
  too_long: "This audio is longer than you can lip-sync in one go.",
  not_configured: "The Lip Sync GPU isn't connected yet. Please try again later.",
};

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (s: number) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;

export default function LipSyncStudio() {
  const [access, setAccess] = useState<Access | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);
  const [audioName, setAudioName] = useState("");
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const cancelRef = useRef(false);

  // One request when the page opens (no polling): allowance + recent runs with download links
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/lipsync/runs");
      const data = await res.json();
      if (res.ok) {
        setAccess(data.access);
        setRuns(data.runs || []);
      } else {
        setError(data.error || "Could not load Lip Sync.");
      }
    } catch {
      setError("Could not load Lip Sync.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      cancelRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  const loadAvatars = async () => {
    setAvatarsLoading(true);
    try {
      const res = await fetch("/api/lipsync/avatars");
      const data = await res.json();
      setAvatars(data.avatars || []);
    } catch {
      /* optional feature */
    } finally {
      setAvatarsLoading(false);
    }
  };

  const pickVideo = (f: File) => {
    setVideoFile(f);
    setVideoPreview(URL.createObjectURL(f));
    setSelectedAvatar(null);
  };
  const pickAudio = (f: File | Blob, name: string) => {
    setAudioFile(f);
    setAudioName(name);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        pickAudio(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }), "Recorded voice");
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
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  /** Lip-syncs the run's unfinished clips one after another. Stops when the free GPU time runs out. */
  const processRun = async (run: { id: string; clips: { id: string; idx: number; status: string; attempts?: number }[] }) => {
    setActiveRunId(run.id);
    const todo = run.clips.filter((c) => c.status !== "complete").sort((a, b) => a.idx - b.idx);
    for (let i = 0; i < todo.length; i++) {
      if (cancelRef.current) return;
      const c = todo[i];
      setStatus(`Lip-syncing clip ${c.idx + 1} of ${run.clips.length}… (about 1–3 minutes each)`);
      setRuns((rs) => rs.map((r) => (r.id === run.id ? { ...r, status: "processing", clips: r.clips.map((x) => (x.id === c.id ? { ...x, status: "processing" } : x)) } : r)));
      let data: { status: string; error?: string; downloadUrl?: string; canRetry?: boolean };
      try {
        const res = await fetch(`/api/lipsync/clips/${c.id}/process`, { method: "POST" });
        data = await res.json();
      } catch {
        data = { status: "failed", error: "Network error", canRetry: true };
      }
      if (data.status === "paused") {
        setStatus("");
        setError(`${data.error || "Free GPU time is used up for today."} Your finished clips are saved; press Continue later.`);
        break;
      }
      if (data.status === "failed" && data.canRetry) {
        // one automatic retry
        try {
          const res = await fetch(`/api/lipsync/clips/${c.id}/process`, { method: "POST" });
          data = await res.json();
        } catch {
          /* keep failure */
        }
      }
      setRuns((rs) => rs.map((r) => (r.id === run.id
        ? { ...r, clips: r.clips.map((x) => (x.id === c.id ? { ...x, status: data.status === "complete" ? "complete" : "failed", downloadUrl: data.downloadUrl || null, error: data.error || null } : x)) }
        : r)));
    }
    setStatus("");
    setActiveRunId(null);
    await load();
  };

  const start = async () => {
    if (!access) return;
    setError("");
    let video: File | Blob | null = videoFile;
    if (!video && selectedAvatar) {
      try {
        setStatus("Downloading the avatar video…");
        video = await (await fetch(selectedAvatar.videoUrl)).blob();
      } catch {
        setError("Couldn't load that avatar. Please upload your own face video instead.");
        setStatus("");
        return;
      }
    }
    if (!video || !audioFile) {
      setError("Please choose a face video and a voice audio.");
      return;
    }

    setBusy(true);
    cancelRef.current = false;
    let job: Awaited<ReturnType<typeof import("@/lib/lipsync-split").prepareLipsyncJob>> | null = null;
    try {
      const { prepareLipsyncJob } = await import("@/lib/lipsync-split");
      job = await prepareLipsyncJob(video, audioFile, access.maxRunSeconds, setStatus);

      setStatus(`Prepared ${job.clips.length} clip${job.clips.length === 1 ? "" : "s"}. Reserving your minutes…`);
      const res = await fetch("/api/lipsync/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: job.mode, sourceName: (videoFile?.name || "Avatar") + " + " + audioName, clips: job.clips }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(REASONS[created.error] || created.error || "Could not start the job.");

      const supabase = createClient();
      const uploaded = new Set<string>();
      for (let i = 0; i < created.clips.length; i++) {
        if (cancelRef.current) return;
        const c = created.clips[i] as { idx: number; videoPath: string; audioPath: string };
        setStatus(`Uploading clip ${i + 1} of ${created.clips.length}…`);
        for (const [path, kind] of [[c.videoPath, "video"], [c.audioPath, "audio"]] as const) {
          if (uploaded.has(path)) continue;
          const bytes = kind === "video" ? await job.video(c.idx) : await job.audio(c.idx);
          const up = created.uploads[path] as { path: string; token: string };
          const { error: upErr } = await supabase.storage
            .from("lipsync")
            .uploadToSignedUrl(up.path, up.token, new Blob([bytes as unknown as BlobPart], { type: kind === "video" ? "video/mp4" : "audio/mp4" }), {
              contentType: kind === "video" ? "video/mp4" : "audio/mp4",
            });
          if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
          uploaded.add(path);
        }
      }
      await fetch(`/api/lipsync/runs/${created.runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });

      // show the new run, then process it clip by clip
      const fresh = await (await fetch("/api/lipsync/runs")).json();
      setRuns(fresh.runs || []);
      setAccess(fresh.access);
      const run = (fresh.runs || []).find((r: Run) => r.id === created.runId);
      if (run) await processRun(run);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("");
    } finally {
      await job?.cleanup().catch(() => {});
      setBusy(false);
    }
  };

  const removeRun = async (id: string) => {
    if (!confirm("Delete this job and its clips?")) return;
    await fetch(`/api/lipsync/runs/${id}`, { method: "DELETE" });
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#555555] animate-spin" /></div>;
  }

  const blocked = !access?.allowed || !access?.configured;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Lip Sync Studio</h1>
          <p className="text-gray-400 text-sm mt-1">
            Make a face video speak your voiceover. Long videos are cut into clips of under a minute at natural pauses,
            ready to join in CapCut.
          </p>
        </div>
        {access && (
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-lg px-4 py-2 text-sm">
            {access.isAdmin ? (
              <span className="text-[#FFD200] font-semibold">Admin · unlimited</span>
            ) : (
              <span className="text-gray-300">
                Used <b className="text-white">{formatSeconds(access.usedSeconds)}</b> of{" "}
                <b className="text-white">{formatSeconds(access.allowanceSeconds || 0)}</b> this month
              </span>
            )}
          </div>
        )}
      </div>

      {access && !access.allowed && (
        <div className="bg-[#111111] border border-[#FFD200]/30 rounded-lg p-4 text-sm text-gray-300 flex gap-3">
          <Info className="text-[#FFD200] shrink-0 mt-0.5" size={16} />
          <p>
            {REASONS[access.reason || ""] || "Lip Sync isn't available on your account."}{" "}
            {access.reason === "upgrade_required" && <a href="/#pricing" className="text-[#FFD200] underline">See plans</a>}
          </p>
        </div>
      )}
      {access?.allowed && !access.configured && (
        <div className="bg-[#111111] border border-[#FFD200]/30 rounded-lg p-4 text-sm text-gray-300 flex gap-3">
          <Info className="text-[#FFD200] shrink-0 mt-0.5" size={16} />
          <p>{access.isAdmin ? "Connect the GPU: set HF_TOKENS and HF_LIPSYNC_SPACE_URL in Vercel (see hf-space/README.md)." : REASONS.not_configured}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className={`grid md:grid-cols-2 gap-4 ${blocked ? "opacity-50 pointer-events-none" : ""}`}>
        {/* Face video */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2"><Video size={18} /> 1. Face video</h2>
          <div
            className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-[#FFD200] transition-colors"
            onClick={() => videoInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pickVideo(f); }}
          >
            <Upload className="mx-auto text-gray-500 mb-2" size={28} />
            <p className="text-gray-400 text-sm">Drop a video of the face, or click to choose</p>
            <p className="text-gray-600 text-xs mt-1">Up to 60 s loops automatically · or as long as the audio · 720p MP4 works best</p>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickVideo(f); }} />
          </div>
          {videoPreview && <video src={videoPreview} controls className="w-full max-h-44 rounded-lg bg-black" />}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm flex items-center gap-2"><Camera size={14} /> Or a stock avatar</p>
              <button onClick={loadAvatars} className="text-gray-500 hover:text-white text-xs flex items-center gap-1">
                <RefreshCw size={12} className={avatarsLoading ? "animate-spin" : ""} /> {avatars.length ? "More" : "Show"}
              </button>
            </div>
            {avatars.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {avatars.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => { setSelectedAvatar(av); setVideoFile(null); setVideoPreview(""); }}
                    className={`relative rounded-lg overflow-hidden border-2 ${selectedAvatar?.id === av.id ? "border-[#FFD200]" : "border-gray-700"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={av.thumbnailUrl} alt="Stock avatar" className="w-full h-20 object-cover" />
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">{av.duration}s</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Voice audio */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2"><Mic size={18} /> 2. Voice audio</h2>
          <div
            className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-[#FFD200] transition-colors"
            onClick={() => audioInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pickAudio(f, f.name); }}
          >
            <Upload className="mx-auto text-gray-500 mb-2" size={28} />
            <p className="text-gray-400 text-sm">Drop the voiceover, or click to choose</p>
            <p className="text-gray-600 text-xs mt-1">MP3, M4A, WAV · up to {access ? formatSeconds(access.maxRunSeconds) : "…"}</p>
            <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickAudio(f, f.name); }} />
          </div>
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <button onClick={startRecording} className="text-sm px-3 py-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 flex items-center gap-2">
                <Mic size={14} /> Record instead
              </button>
            ) : (
              <button onClick={stopRecording} className="text-sm px-3 py-2 rounded-lg bg-red-700 text-white flex items-center gap-2">
                <PauseCircle size={14} /> Stop · {clock(recordingTime)}
              </button>
            )}
            {audioFile && <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 size={12} /> {audioName}</span>}
          </div>
        </div>
      </div>

      <div className={`${blocked ? "opacity-50 pointer-events-none" : ""}`}>
        <button
          onClick={start}
          disabled={busy || !audioFile || (!videoFile && !selectedAvatar)}
          className="w-full bg-[#FFD200] hover:bg-[#FFE033] disabled:opacity-50 text-[#080808] font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Scissors size={18} />}
          {busy ? "Working…" : "Cut into clips & lip-sync"}
        </button>
        {status && <p className="text-gray-400 text-sm mt-3 flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> {status}</p>}
        <p className="text-gray-600 text-xs mt-2">
          Cutting happens in your browser, so keep this tab open until all clips are done. Finished clips stay
          available here for 7 days.
        </p>
      </div>

      {/* Jobs */}
      {runs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-white font-semibold">Your clips</h2>
          {runs.map((r) => {
            const done = r.clips.filter((c) => c.status === "complete").length;
            const unfinished = r.clips.some((c) => c.status !== "complete");
            return (
              <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-white text-sm font-medium truncate max-w-md">{r.source_name || "Lip Sync job"}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(r.created_at).toLocaleString()} · {formatSeconds(Number(r.total_seconds))} · {done}/{r.clip_count} clips done
                      {r.mode === "loop" ? " · looped face video" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unfinished && r.status !== "uploading" && (
                      <button
                        onClick={() => processRun(r)}
                        disabled={busy || activeRunId !== null}
                        className="text-sm px-3 py-1.5 rounded-lg bg-[#FFD200] text-[#080808] font-semibold disabled:opacity-50 flex items-center gap-1"
                      >
                        <Play size={14} /> {done ? "Continue" : "Start"}
                      </button>
                    )}
                    <button onClick={() => removeRun(r.id)} disabled={activeRunId === r.id} className="text-gray-500 hover:text-red-400 p-1.5" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {r.clips.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 bg-black/30 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-300">
                        Part {pad(c.idx + 1)} <span className="text-gray-600 text-xs">{clock(c.start)}–{clock(c.start + c.duration)}</span>
                      </span>
                      {c.status === "complete" && c.downloadUrl ? (
                        <a href={c.downloadUrl} className="text-[#FFD200] text-xs flex items-center gap-1 hover:underline" target="_blank" rel="noreferrer">
                          <Download size={12} /> part{pad(c.idx + 1)}.mp4
                        </a>
                      ) : c.status === "processing" ? (
                        <span className="text-gray-400 text-xs flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> working</span>
                      ) : c.status === "failed" ? (
                        <span className="text-red-400 text-xs truncate max-w-[50%]" title={c.error || ""}>failed{c.error ? `: ${c.error}` : ""}</span>
                      ) : (
                        <span className="text-gray-600 text-xs">waiting</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-lg p-4 text-xs text-gray-400 space-y-1">
            <p className="text-gray-300 font-semibold">Joining the parts in CapCut</p>
            <p>1. Put part01, part02 … on the timeline in order (same resolution and frame rate as your source).</p>
            <p>2. Add your original full voiceover as one audio track and mute the clips&apos; own audio – no pops at the joins.</p>
            <p>3. The cuts are at pauses in the speech, so they are hard to notice.</p>
          </div>
        </div>
      )}
    </div>
  );
}
