import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MessageSquare, Mail, CheckCircle2, Clock, AlertTriangle, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    open: { label: "Open", className: "bg-[#1E1E1E] text-[#999999]" },
    needs_review: { label: "Needs Review", className: "bg-[#FF3B3B]/10 text-[#FF3B3B]" },
    auto_resolved: { label: "Auto-Resolved", className: "bg-[#22C55E]/10 text-[#22C55E]" },
    resolved: { label: "Resolved", className: "bg-[#22C55E]/10 text-[#22C55E]" },
    escalated: { label: "Escalated", className: "bg-[#FFB700]/10 text-[#FFB700]" },
  };
  const s = map[status] || map.open;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.className}`}>
      {s.label}
    </span>
  );
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function AdminSupportPage() {
  const supabase = await createServiceClient();

  const { data: conversations } = await supabase
    .from("support_conversations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convos = (conversations || []) as any[];

  const needsReview = convos.filter((c) => c.status === "needs_review");
  const open = convos.filter((c) => c.status === "open");
  const autoResolved = convos.filter((c) => c.status === "auto_resolved");
  const resolved = convos.filter((c) => c.status === "resolved");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const autoResolvedToday = autoResolved.filter(
    (c) => new Date(c.resolved_at) >= todayStart
  );

  const avgConfidence =
    convos.length > 0
      ? Math.round(
          convos
            .filter((c) => c.confidence_score)
            .reduce((s, c) => s + Number(c.confidence_score), 0) /
            convos.filter((c) => c.confidence_score).length || 0
        )
      : 0;

  const allGroups = [
    { label: "Needs Review", items: needsReview, urgent: true },
    { label: "Open", items: open, urgent: false },
    { label: "Auto-Resolved", items: autoResolved, urgent: false },
    { label: "Resolved", items: resolved, urgent: false },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Support Inbox</h1>
          <p className="text-[#555555] text-sm mt-1">Manage customer conversations and knowledge base</p>
        </div>
        <Link
          href="/admin/support/knowledge"
          className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white px-4 py-2 rounded-btn text-sm transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Knowledge Base
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Needs Review", value: needsReview.length, color: "text-[#FF3B3B]" },
          { label: "Open", value: open.length, color: "text-[#FFB700]" },
          { label: "Auto-Resolved Today", value: autoResolvedToday.length, color: "text-[#22C55E]" },
          { label: "Total", value: convos.length, color: "text-white" },
          { label: "Avg Confidence", value: `${avgConfidence}%`, color: "text-[#FFD200]" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
            <p className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-[#555555] text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Conversations */}
      <div className="space-y-8">
        {allGroups.map((group) => (
          group.items.length > 0 && (
            <div key={group.label}>
              <h2 className="text-[#999999] text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                {group.urgent && <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B3B]" />}
                {group.label}
                <span className="bg-[#1E1E1E] text-[#555555] px-2 py-0.5 rounded-full text-xs">
                  {group.items.length}
                </span>
              </h2>
              <div className="space-y-2">
                {group.items.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/admin/support/${conv.id}`}
                    className={`block bg-[#111111] border rounded-xl p-4 hover:border-[#333333] transition-colors ${
                      conv.status === "needs_review"
                        ? "border-[#FF3B3B]/30"
                        : "border-[#1E1E1E]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {conv.channel === "email" ? (
                            <Mail className="w-4 h-4 text-[#555555]" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-[#555555]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {conv.contact_email || "Chat visitor"}
                          </p>
                          <p className="text-[#555555] text-xs truncate mt-0.5">
                            {conv.subject || conv.messages?.[0]?.content?.slice(0, 80) || "No subject"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <StatusBadge status={conv.status} />
                        {conv.confidence_score && (
                          <span className={`text-xs ${
                            Number(conv.confidence_score) >= 80
                              ? "text-[#22C55E]"
                              : Number(conv.confidence_score) >= 60
                              ? "text-[#FFB700]"
                              : "text-[#FF3B3B]"
                          }`}>
                            {Math.round(Number(conv.confidence_score))}%
                          </span>
                        )}
                        <span className="text-[#555555] text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(conv.created_at)}
                        </span>
                        {conv.status === "auto_resolved" && (
                          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        ))}

        {convos.length === 0 && (
          <div className="text-center py-16 text-[#555555]">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-[#999999]">No conversations yet</p>
            <p className="text-sm mt-1">Customer support messages will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
