"use client";

import { useState } from "react";
import { Check, Trash2, Loader2 } from "lucide-react";
import type { ViralIdea, IdeaStatus } from "@/types/database";

const STATUS_OPTIONS: IdeaStatus[] = [
  "pending","scripting","recorded","uploaded","done",
];

const STATUS_COLORS: Record<IdeaStatus, string> = {
  pending: "#555555",
  scripting: "#FFD200",
  recorded: "#FF3B3B",
  uploaded: "#FFB700",
  done: "#22C55E",
};

interface IdeaCardProps {
  idea: ViralIdea;
  onUpdate: (id: string, updates: Partial<ViralIdea>) => void;
  onDelete: (id: string) => void;
  showToast: (msg: string) => void;
}

export default function IdeaCard({
  idea,
  onUpdate,
  onDelete,
  showToast,
}: IdeaCardProps) {
  const [notes, setNotes] = useState(idea.notes || "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const isDone = idea.is_done;

  async function handleStatusChange(status: IdeaStatus) {
    try {
      await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onUpdate(idea.id, { status });
      showToast(`Status updated to ${status}`);
    } catch {
      showToast("Failed to update status");
    }
  }

  async function handleMarkDone() {
    setIsMarking(true);
    try {
      await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_done: true }),
      });
      onUpdate(idea.id, { is_done: true, status: "done", done_at: new Date().toISOString() });
      showToast("Idea marked as done! 🎉");
    } catch {
      showToast("Failed to mark as done");
    } finally {
      setIsMarking(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await fetch(`/api/ideas/${idea.id}`, { method: "DELETE" });
      onDelete(idea.id);
      showToast("Idea deleted");
    } catch {
      showToast("Failed to delete idea");
    } finally {
      setIsDeleting(false);
    }
  }

  async function saveNotes() {
    if (notes === (idea.notes || "")) return;
    try {
      await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      onUpdate(idea.id, { notes });
    } catch {
      showToast("Failed to save notes");
    }
  }

  const statusColor = STATUS_COLORS[idea.status as IdeaStatus] || "#555555";

  return (
    <div
      className={`bg-[#111111] border rounded-card p-5 transition-opacity ${
        isDone ? "opacity-60 border-[#1E1E1E]" : "border-[#1E1E1E] hover:border-[#333333]"
      }`}
    >
      {/* Title */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-sm leading-tight ${
              isDone ? "line-through text-[#555555]" : "text-white"
            }`}
          >
            {idea.video_title}
          </p>
          {idea.thumbnail_text && (
            <span className="inline-block mt-1 bg-[#1E1E1E] text-[#FFD200] text-xs font-bold px-2 py-0.5 rounded-badge font-display">
              {idea.thumbnail_text}
            </span>
          )}
        </div>
        {idea.title_score && (
          <span
            className="font-mono-stats text-xs font-bold flex-shrink-0"
            style={{
              color:
                idea.title_score >= 80
                  ? "#22C55E"
                  : idea.title_score >= 60
                  ? "#FFB700"
                  : "#FF3B3B",
            }}
          >
            {idea.title_score}/100
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-[#555555] mb-3">
        <span className="capitalize">{idea.niche}</span>
        {idea.source_vph && (
          <>
            <span>·</span>
            <span className="font-mono-stats text-[#FFD200]">⚡{Math.round(idea.source_vph)} VPH</span>
          </>
        )}
        {idea.source_outlier_ratio && (
          <span className="font-mono-stats text-[#FF3B3B]">🔥{idea.source_outlier_ratio}x</span>
        )}
        <span>·</span>
        <span>
          {new Date(idea.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Status + Notes */}
      <div className="space-y-3">
        {!isDone && (
          <div className="flex items-center gap-2">
            <span className="text-[#555555] text-xs">Status:</span>
            <select
              value={idea.status}
              onChange={(e) => handleStatusChange(e.target.value as IdeaStatus)}
              className="bg-[#0A0A0A] border text-xs px-2 py-1.5 rounded-badge focus:outline-none focus:border-[#FF3B3B] transition-colors min-h-[32px]"
              style={{ borderColor: `${statusColor}40`, color: statusColor }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="text-white bg-[#0A0A0A]">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Add notes…"
          rows={2}
          disabled={isDone}
          className="w-full bg-[#0A0A0A] border border-[#1E1E1E] text-[#999999] placeholder-[#333333] text-xs px-3 py-2 rounded-badge resize-none focus:outline-none focus:border-[#333333] transition-colors disabled:opacity-50"
        />
      </div>

      {/* Actions */}
      {!isDone && (
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleMarkDone}
            disabled={isMarking}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] py-2 rounded-btn hover:bg-[#22C55E]/20 transition-colors disabled:opacity-50 min-h-[36px]"
          >
            {isMarking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Mark Done
          </button>
          {idea.status === "pending" && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 text-xs bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] px-4 py-2 rounded-btn hover:bg-[#FF3B3B]/20 transition-colors disabled:opacity-50 min-h-[36px]"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete
            </button>
          )}
        </div>
      )}

      {isDone && idea.done_at && (
        <p className="text-[#555555] text-xs mt-3">
          Done:{" "}
          {new Date(idea.done_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
