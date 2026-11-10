"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { startPoller } from "@/lib/poll";
import { Zap, Settings, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight } from "lucide-react";

interface OneGoJob {
  id: string;
  channel_handle: string;
  channel_niche: string;
  overall_status: string;
  current_step: string;
  progress_percent: number;
  created_at: string;
  completed_at: string | null;
  failed_step: string | null;
  error_message: string | null;
}

interface OneGoConfig {
  channel_handle?: string;
  channel_niche?: string;
  voice_name?: string;
  caption_style?: string;
  auto_post?: boolean;
  post_platforms?: string[];
  weekly_schedule_active?: boolean;
  face_video_url?: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "complete") return <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-[#FF3B3B]" />;
  if (status === "running") return <Loader2 className="w-4 h-4 text-[#FFD200] animate-spin" />;
  return <Clock className="w-4 h-4 text-[#555555]" />;
}

function tierColor(pct: number): string {
  if (pct >= 80) return "bg-[#FFD200]";
  if (pct >= 50) return "bg-[#22C55E]";
  return "bg-[#555555]";
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OneGoPage() {
  const [jobs, setJobs] = useState<OneGoJob[]>([]);
  const [config, setConfig] = useState<OneGoConfig | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const pollRef = useRef<(() => void) | null>(null);

  async function loadData() {
    try {
      const res = await fetch("/api/admin/one-go");
      const data = await res.json();
      setJobs(data.jobs || []);
      setConfig(data.config);
    } catch {
      setError("Failed to load One Go data");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Poll active job
  // Only polls while a job is running (every 10s), pauses when the tab is hidden,
  // and stops when the job finishes, on error-timeout, or when the page unmounts.
  useEffect(() => {
    if (!activeJobId) return;
    pollRef.current = startPoller(
      async () => {
        const res = await fetch(`/api/admin/one-go/status?jobId=${activeJobId}`);
        if (!res.ok) throw new Error("status check failed");
        const data = await res.json();
        if (data.job) {
          setJobs(prev => prev.map(j => j.id === activeJobId ? data.job : j));
          if (data.job.overall_status !== "running") {
            setActiveJobId(null);
            return true;
          }
        }
        return false;
      },
      { intervalMs: 10_000, maxDurationMs: 60 * 60_000, onTimeout: () => setActiveJobId(null) }
    );
    return () => { pollRef.current?.(); pollRef.current = null; };
  }, [activeJobId]);

  async function startOneGo() {
    setIsStarting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/one-go", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to start"); return; }
      setActiveJobId(data.jobId);
      await loadData();
    } catch {
      setError("Network error — try again");
    } finally {
      setIsStarting(false);
    }
  }

  const runningJob = jobs.find(j => j.overall_status === "running");
  const isConfigured = !!config?.channel_handle && !!config?.channel_niche;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#FFD200] fill-[#FFD200]" />
            One Go
          </h1>
          <p className="text-[#555555] text-sm mt-1">
            Automated YouTube factory — one click to idea, script, audio, lip sync, captions, post.
          </p>
        </div>
        <Link
          href="/admin/one-go/settings"
          className="flex items-center gap-2 text-sm text-[#999999] hover:text-white border border-[#1E1E1E] px-3 py-2 rounded-btn transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>

      {/* Config summary */}
      {config ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 mb-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#555555]">Channel</span>
              <span className="text-white font-medium">@{config.channel_handle || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555555]">Niche</span>
              <span className="text-white font-medium">{config.channel_niche || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555555]">Voice</span>
              <span className="text-[#999999] text-xs">{config.voice_name || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555555]">Auto-post</span>
              <span className={config.auto_post ? "text-[#22C55E]" : "text-[#555555]"}>
                {config.auto_post ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555555]">Captions</span>
              <span className="text-[#999999] text-xs">{config.caption_style || "word_highlight"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555555]">Avatar</span>
              <span className={config.face_video_url ? "text-[#22C55E]" : "text-[#FF3B3B]"}>
                {config.face_video_url ? "Configured" : "Not set"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#FFD200]/5 border border-[#FFD200]/20 rounded-card p-5 mb-6">
          <p className="text-[#FFD200] text-sm font-medium mb-2">One Go not configured yet</p>
          <p className="text-[#999999] text-xs mb-3">
            Set up your channel, voice, avatar, and posting preferences to get started.
          </p>
          <Link
            href="/admin/one-go/settings"
            className="inline-flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-sm px-4 py-2 rounded-btn hover:bg-[#FFE033] transition-colors"
          >
            Configure One Go →
          </Link>
        </div>
      )}

      {/* Active job */}
      {runningJob && (
        <div className="bg-[#0D0D0D] border border-[#FFD200]/30 rounded-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="w-4 h-4 text-[#FFD200] animate-spin" />
            <p className="text-white font-semibold text-sm">One Go Running...</p>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-xs text-[#555555] mb-1.5">
              <span>{runningJob.current_step}</span>
              <span>{runningJob.progress_percent}%</span>
            </div>
            <div className="h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${tierColor(runningJob.progress_percent)}`}
                style={{ width: `${runningJob.progress_percent}%` }}
              />
            </div>
          </div>
          <p className="text-[#555555] text-xs">
            Started {timeAgo(runningJob.created_at)} · Estimated 25–35 minutes total
          </p>
        </div>
      )}

      {/* THE BUTTON */}
      <div className="text-center py-8 border border-[#1E1E1E] rounded-card bg-[#0A0A0A] mb-8">
        <Zap className="w-10 h-10 text-[#FFD200] fill-[#FFD200] mx-auto mb-4" />
        <p className="text-[#555555] text-sm mb-6">
          TubeTarzan will find the best viral idea, write the script, generate audio,<br />
          lip sync, burn captions, and post — all automatically.
        </p>
        <button
          onClick={startOneGo}
          disabled={isStarting || !!runningJob || !isConfigured}
          className="inline-flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-lg px-10 py-4 rounded-btn hover:bg-[#FFE033] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isStarting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Starting...</>
          ) : runningJob ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Running...</>
          ) : (
            <><Zap className="w-5 h-5 fill-[#080808]" /> ONE GO — Generate Full Video Now</>
          )}
        </button>
        <p className="text-[#333333] text-xs mt-3">Estimated 25–35 minutes · Cost ~$0.08</p>
        {error && (
          <div className="flex items-center justify-center gap-2 mt-4 text-[#FF3B3B] text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* History */}
      {jobs.length > 0 && (
        <div>
          <h2 className="text-white font-semibold text-sm mb-3">Previous Runs</h2>
          <div className="space-y-2">
            {jobs.map(job => (
              <div
                key={job.id}
                className="flex items-center gap-4 p-4 bg-[#111111] border border-[#1E1E1E] rounded-card"
              >
                <StatusIcon status={job.overall_status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium truncate">
                      @{job.channel_handle} · {job.channel_niche}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-badge font-medium ${
                      job.overall_status === "complete" ? "bg-[#22C55E]/15 text-[#22C55E]" :
                      job.overall_status === "failed" ? "bg-[#FF3B3B]/15 text-[#FF3B3B]" :
                      "bg-[#FFD200]/15 text-[#FFD200]"
                    }`}>
                      {job.overall_status}
                    </span>
                  </div>
                  <p className="text-[#555555] text-xs mt-0.5">
                    {job.overall_status === "running"
                      ? job.current_step
                      : job.error_message || job.current_step}
                    {" · "}{timeAgo(job.created_at)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#333333] shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {jobs.length === 0 && !runningJob && isConfigured && (
        <div className="text-center py-8 text-[#555555] text-sm">
          No runs yet. Click the button above to generate your first automated video.
        </div>
      )}
    </div>
  );
}
