"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";

export default function PollNowButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function poll() {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/support/poll", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult(data.processed > 0 ? `${data.processed} new email(s) processed` : "No new emails");
      } else {
        setResult(data.error || "Failed");
      }
    } catch {
      setResult("Network error");
    }
    setLoading(false);
    setTimeout(() => setResult(""), 4000);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={poll}
        disabled={loading}
        className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] hover:border-[#FFD200]/40 text-[#999999] hover:text-white px-4 py-2 rounded-btn text-sm transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        Poll Emails
      </button>
      {result && <p className="text-xs text-[#22C55E]">{result}</p>}
    </div>
  );
}
