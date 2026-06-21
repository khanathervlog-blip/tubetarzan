"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

export default function GmailWatchButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function setupWatch() {
    setLoading(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/support/gmail/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatus("ok");
        setMessage("Gmail watch active — emails to support@tubetarzan.com will be processed automatically.");
      } else {
        setStatus("error");
        setMessage(data.error || "Setup failed");
      }
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={setupWatch}
        disabled={loading}
        className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] hover:border-[#FFD200]/40 text-[#999999] hover:text-white px-4 py-2 rounded-btn text-sm transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === "ok" ? (
          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
        ) : (
          <Mail className="w-4 h-4" />
        )}
        {status === "ok" ? "Gmail Watch Active" : "Setup Gmail Watch"}
      </button>
      {message && (
        <p className={`text-xs ${status === "ok" ? "text-[#22C55E]" : "text-[#FF3B3B]"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
