"use client";

import { useState, useEffect, useCallback } from "react";
import { Lightbulb, ChevronDown, Loader2, Download } from "lucide-react";
import IdeaCard from "./IdeaCard";
import type { ViralIdea } from "@/types/database";

interface IdeaTrackerProps {
  showToast: (msg: string) => void;
  refreshKey?: number;
}

function exportToCSV(ideas: ViralIdea[]) {
  const headers = [
    "Title", "Niche", "Status", "Thumbnail Text", "Hook", "Title Score",
    "Source Video", "Source VPH", "Source Outlier Ratio", "Notes", "Created At",
  ];
  const rows = ideas.map(i => [
    `"${(i.video_title || "").replace(/"/g, '""')}"`,
    `"${(i.niche || "").replace(/"/g, '""')}"`,
    i.status || "",
    `"${(i.thumbnail_text || "").replace(/"/g, '""')}"`,
    `"${(i.hook_line || "").replace(/"/g, '""')}"`,
    i.title_score ?? "",
    `"${(i.source_video_title || "").replace(/"/g, '""')}"`,
    i.source_vph ?? "",
    i.source_outlier_ratio ?? "",
    `"${(i.notes || "").replace(/"/g, '""')}"`,
    i.created_at ? new Date(i.created_at).toLocaleDateString() : "",
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tubetarzan-ideas-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function IdeaTracker({ showToast, refreshKey = 0 }: IdeaTrackerProps) {
  const [ideas, setIdeas] = useState<ViralIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [doneOpen, setDoneOpen] = useState(false);

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch("/api/ideas");
      if (!res.ok) return;
      const data = await res.json();
      setIdeas(data.ideas || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas, refreshKey]);

  function handleUpdate(id: string, updates: Partial<ViralIdea>) {
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === id ? { ...idea, ...updates } : idea))
    );
  }

  function handleDelete(id: string) {
    setIdeas((prev) => prev.filter((idea) => idea.id !== id));
  }

  const activeIdeas = ideas.filter((i) => !i.is_done);
  const doneIdeas = ideas.filter((i) => i.is_done);

  if (isLoading) {
    return (
      <div className="mt-10 flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-[#333333] animate-spin" />
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="mt-10 bg-[#111111] border border-[#1E1E1E] rounded-card p-8 text-center">
        <Lightbulb className="w-8 h-8 text-[#333333] mx-auto mb-3" />
        <p className="text-white font-semibold mb-1">No ideas saved yet</p>
        <p className="text-[#555555] text-sm">
          Click Generate on any video above to create and save viral ideas.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-bold text-white text-lg">
          MY IDEAS{" "}
          <span className="text-[#555555] font-normal text-base">
            ({ideas.length})
          </span>
        </h2>
        <button
          onClick={() => { exportToCSV(ideas); showToast("Ideas exported to CSV!"); }}
          className="flex items-center gap-1.5 bg-[#111111] border border-[#1E1E1E] text-[#555555] hover:text-white px-3 py-1.5 rounded-btn text-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Active ideas */}
      {activeIdeas.length > 0 && (
        <div className="mb-8">
          <p className="text-[#555555] text-xs uppercase tracking-wider font-medium mb-4">
            Active ({activeIdeas.length})
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                showToast={showToast}
              />
            ))}
          </div>
        </div>
      )}

      {/* Done ideas (collapsible) */}
      {doneIdeas.length > 0 && (
        <div>
          <button
            onClick={() => setDoneOpen(!doneOpen)}
            className="flex items-center gap-2 text-[#555555] hover:text-white text-xs uppercase tracking-wider font-medium mb-4 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${doneOpen ? "rotate-180" : ""}`}
            />
            Done ({doneIdeas.length})
          </button>
          {doneOpen && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {doneIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  showToast={showToast}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
