"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2, ExternalLink, Loader2, Mail, MessageSquare } from "lucide-react";

interface Message {
  role: string;
  content: string;
  timestamp: string;
  confidence?: number;
  sent_as?: string;
}

interface Conversation {
  id: string;
  channel: string;
  status: string;
  contact_email: string;
  contact_name: string;
  subject: string;
  messages: Message[];
  confidence_score: number;
  draft_reply: string;
  auto_replied: boolean;
  created_at: string;
  resolved_at: string;
  resolved_by: string;
  human_agent_notes: string;
  knowledge_chunks_used: Array<{ title: string; similarity: number }>;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetchConversation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function fetchConversation() {
    const res = await fetch(`/api/support/conversations/${params.id}/detail`);
    if (res.ok) {
      const data = await res.json();
      setConv(data.conversation);
      setReply(data.conversation.draft_reply || "");
      setNotes(data.conversation.human_agent_notes || "");
    }
    setLoading(false);
  }

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    const res = await fetch(`/api/support/conversations/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ send_draft: true, custom_reply: reply, notes }),
    });
    if (res.ok) {
      router.push("/admin/support");
    }
    setSending(false);
  }

  async function markResolved() {
    setMarking(true);
    await fetch(`/api/support/conversations/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    router.push("/admin/support");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#FFD200]" />
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="text-center py-16">
        <p className="text-[#999999]">Conversation not found</p>
        <Link href="/admin/support" className="text-[#FFD200] hover:underline text-sm mt-2 block">
          ← Back to inbox
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    open: "text-[#FFB700]",
    needs_review: "text-[#FF3B3B]",
    auto_resolved: "text-[#22C55E]",
    resolved: "text-[#22C55E]",
  };

  return (
    <div className="max-w-3xl">
      <Link href="/admin/support" className="flex items-center gap-2 text-[#555555] hover:text-white text-sm transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Inbox
      </Link>

      {/* Header */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {conv.channel === "email" ? (
                <Mail className="w-4 h-4 text-[#555555]" />
              ) : (
                <MessageSquare className="w-4 h-4 text-[#555555]" />
              )}
              <span className="text-[#555555] text-xs capitalize">{conv.channel}</span>
              <span className={`text-xs font-bold ${statusColors[conv.status] || "text-[#999999]"}`}>
                · {conv.status.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-white font-semibold text-lg">
              {conv.contact_email || "Chat visitor"}
            </h1>
            {conv.subject && (
              <p className="text-[#555555] text-sm mt-0.5">{conv.subject}</p>
            )}
          </div>
          <div className="text-right text-xs text-[#555555]">
            <p>{timeAgo(conv.created_at)}</p>
            {conv.confidence_score && (
              <p className="mt-1">
                AI Confidence:{" "}
                <span className={Number(conv.confidence_score) >= 80 ? "text-[#22C55E]" : "text-[#FF3B3B]"}>
                  {Math.round(Number(conv.confidence_score))}%
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Message history */}
      <div className="space-y-4 mb-6">
        {conv.messages.map((msg, i) => (
          <div key={i} className={`rounded-xl p-4 ${
            msg.role === "user"
              ? "bg-[#111111] border border-[#1E1E1E]"
              : "bg-[#0D0D0D] border border-[#1E1E1E]"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold ${
                msg.role === "user" ? "text-[#999999]" : "text-[#FFD200]"
              }`}>
                {msg.role === "user" ? (conv.contact_email || "Visitor") : "TubeTarzan AI"}
              </span>
              <span className="text-[#333333] text-xs">{new Date(msg.timestamp).toLocaleString()}</span>
              {msg.sent_as && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  msg.sent_as === "auto_reply"
                    ? "bg-[#22C55E]/10 text-[#22C55E]"
                    : "bg-[#FFB700]/10 text-[#FFB700]"
                }`}>
                  {msg.sent_as === "auto_reply" ? "Sent" : "Draft"}
                </span>
              )}
              {msg.confidence !== undefined && (
                <span className="text-[#555555] text-xs">Confidence: {msg.confidence}%</span>
              )}
            </div>
            <p className="text-[#E5E5E5] text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
      </div>

      {/* Knowledge chunks used */}
      {conv.knowledge_chunks_used?.length > 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 mb-6">
          <p className="text-[#555555] text-xs font-bold uppercase tracking-wider mb-2">Knowledge Chunks Used</p>
          <div className="space-y-1">
            {conv.knowledge_chunks_used.map((chunk, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-[#999999]">{chunk.title}</span>
                <span className="text-[#555555]">
                  ({Math.round(Number(chunk.similarity) * 100)}% similarity)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reply section — only show if not already resolved */}
      {conv.status !== "resolved" && conv.status !== "auto_resolved" && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 mb-4">
          <p className="text-white font-semibold text-sm mb-3">
            {conv.draft_reply ? "AI Draft Reply (edit before sending)" : "Write Reply"}
          </p>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={6}
            className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-xl p-4 text-sm focus:outline-none focus:border-[#FFD200] transition-colors resize-none"
            placeholder="Type your reply..."
          />
          <div className="mt-3">
            <p className="text-[#555555] text-xs mb-1">Internal notes (not sent to customer)</p>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#333333] transition-colors"
              placeholder="Add internal notes..."
            />
          </div>
          <div className="flex gap-3 mt-4">
            {conv.channel === "email" && (
              <button
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-5 py-2.5 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-50 text-sm"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Reply via Gmail
              </button>
            )}
            <button
              onClick={markResolved}
              disabled={marking}
              className="flex items-center gap-2 bg-[#1E1E1E] text-[#999999] hover:text-white font-medium px-5 py-2.5 rounded-btn transition-colors text-sm"
            >
              {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark Resolved
            </button>
            {conv.channel === "email" && conv.contact_email && (
              <a
                href={`mailto:${conv.contact_email}?subject=Re: ${conv.subject || "Support"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[#555555] hover:text-white text-sm transition-colors ml-auto"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Gmail
              </a>
            )}
          </div>
        </div>
      )}

      {(conv.status === "resolved" || conv.status === "auto_resolved") && (
        <div className="bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
          <div>
            <p className="text-[#22C55E] font-medium text-sm">
              {conv.status === "auto_resolved" ? "Auto-resolved by AI" : "Resolved by human agent"}
            </p>
            {conv.resolved_at && (
              <p className="text-[#555555] text-xs mt-0.5">{timeAgo(conv.resolved_at)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
