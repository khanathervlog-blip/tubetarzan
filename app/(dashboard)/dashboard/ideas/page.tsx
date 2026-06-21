"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import IdeaTracker from "@/components/dashboard/IdeaTracker";

export default function IdeasPage() {
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-[#FFD200]" />
          Idea Tracker
        </h1>
        <p className="text-[#555555] text-sm">
          Manage your content pipeline from idea to upload
        </p>
      </div>

      <IdeaTracker showToast={showToast} />

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#111111] border border-[#1E1E1E] text-white text-sm px-4 py-3 rounded-card shadow-2xl z-50 animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}
