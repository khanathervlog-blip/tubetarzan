"use client";

import { useState } from "react";
import { Mail, ExternalLink, Send, Check, Loader2, AlertCircle } from "lucide-react";

const EMAIL_SEQUENCES = [
  {
    name: "Free Signup Sequence",
    trigger: "On free signup",
    emails: [
      "Welcome — get your first viral idea in 60 seconds",
      "Day 1: Your free scan is waiting",
      "Day 3: See the other 200+ results [upgrade]",
      "Day 5: Case study — 14x idea in 90 seconds",
      "Day 7: Special offer — 50% off first month",
      "Day 14: Still on free? Here's what you're missing",
    ],
  },
  {
    name: "Trial Started Sequence",
    trigger: "On paid trial start",
    emails: [
      "Your trial is live — 3 things to do today",
      "Day 2: Have you done your first intelligence scan?",
      "Day 5: Your trial is halfway through",
      "Day 6: Trial ends tomorrow",
      "Day 7: You're now a full member",
    ],
  },
  {
    name: "Payment Failed Sequence",
    trigger: "On payment failure",
    emails: [
      "Action needed: your payment failed",
      "Day 2: Your account will be paused in 24 hours",
      "Day 3: Account paused — click to reactivate",
    ],
  },
  {
    name: "Cancellation Win-Back",
    trigger: "On subscription cancel",
    emails: [
      "We're sorry to see you go",
      "Day 3: Was it the price? 30% off for 3 months",
      "Day 14: New feature launched — come back free",
      "Day 30: Your channel data is still saved",
    ],
  },
];

const SEGMENTS = [
  { value: "all", label: "All Users" },
  { value: "free", label: "Free Plan" },
  { value: "creator", label: "Creator Plan" },
  { value: "pro", label: "Pro Plan" },
  { value: "agency", label: "Agency Plan" },
  { value: "paid", label: "All Paid Users" },
  { value: "trial", label: "Trial Users" },
];

export default function AdminEmailsPage() {
  const [segment, setSegment] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ sent: number; test?: boolean } | null>(null);
  const [error, setError] = useState("");

  async function handleTest() {
    if (!subject.trim() || !body.trim()) { setError("Subject and body required"); return; }
    setTesting(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, subject, body, testOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setResult(data);
    } catch { setError("Network error"); }
    finally { setTesting(false); }
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) { setError("Subject and body required"); return; }
    if (!confirm(`Send to ALL ${SEGMENTS.find(s => s.value === segment)?.label} users? This cannot be undone.`)) return;
    setSending(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, subject, body, testOnly: false }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setResult(data);
      setSubject(""); setBody("");
    } catch { setError("Network error"); }
    finally { setSending(false); }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">Email Sequences</h1>
        <p className="text-[#555555] text-sm">Managed via Loops.so. Edit templates there, stats shown here.</p>
      </div>

      {/* Sequences */}
      <div className="space-y-4 mb-10">
        {EMAIL_SEQUENCES.map((seq) => (
          <div key={seq.name} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white text-sm">{seq.name}</h3>
                <p className="text-[#555555] text-xs mt-0.5">Trigger: {seq.trigger}</p>
              </div>
              <a href="https://app.loops.so" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#555555] hover:text-white text-xs transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />Edit in Loops
              </a>
            </div>
            <div className="space-y-1.5">
              {seq.emails.map((email, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#999999]">
                  <span className="text-[#333333] w-6">{i + 1}.</span>
                  <span>{email}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Broadcast */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Send className="w-4 h-4 text-[#FFD200]" />
          <h2 className="font-semibold text-white text-sm">Broadcast Email</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#999999] mb-2">Segment</label>
            <select
              value={segment}
              onChange={e => setSegment(e.target.value)}
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] min-h-[44px]"
            >
              {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#999999] mb-2">Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Email subject line..."
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#999999] mb-2">Body</label>
            <textarea rows={8} value={body} onChange={e => setBody(e.target.value)}
              placeholder={"Write your broadcast message...\n\nUse line breaks to separate paragraphs."}
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors resize-none" />
            <p className="text-[#555555] text-xs mt-1">Sent via Resend from noreply@tubetarzan.com</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[#FF3B3B] text-sm bg-[#FF3B3B]/5 border border-[#FF3B3B]/20 rounded-btn px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 text-[#22C55E] text-sm bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-btn px-4 py-3">
              <Check className="w-4 h-4 shrink-0" />
              {result.test
                ? "Test email sent to your address!"
                : `Broadcast sent to ${result.sent} user${result.sent !== 1 ? "s" : ""}!`}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleTest} disabled={testing || sending}
              className="flex items-center gap-2 bg-[#111111] border border-[#333333] text-white text-sm px-5 py-3 rounded-btn hover:border-[#555555] transition-colors min-h-[44px] disabled:opacity-50">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Test to Me
            </button>
            <button onClick={handleSend} disabled={sending || testing}
              className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-sm px-5 py-3 rounded-btn hover:bg-[#FFE033] transition-colors min-h-[44px] disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Sending..." : "Send Broadcast"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
