"use client";

import { useState, useEffect } from "react";
import { Flame, CheckCircle, Circle, ChevronDown, ChevronUp } from "lucide-react";

const DAYS = [
  {
    day: 1,
    title: "Set Up Your Foundation",
    tasks: [
      { id: "1a", text: "Complete your YouTube channel profile (name, handle, description)" },
      { id: "1b", text: "Add a professional channel banner (2560 x 1440px recommended)" },
      { id: "1c", text: "Upload a clear channel profile picture (800 x 800px)" },
      { id: "1d", text: "Set your channel keywords in YouTube Studio → Settings → Channel" },
    ],
  },
  {
    day: 2,
    title: "Define Your Niche & Audience",
    tasks: [
      { id: "2a", text: "Write a clear 1-sentence mission: 'I help [audience] achieve [outcome] via [content type]'" },
      { id: "2b", text: "Research 5 competitor channels in your niche on the Intelligence Board" },
      { id: "2c", text: "Identify 3 content pillars (recurring topic categories)" },
      { id: "2d", text: "Save your niche in TubeTarzan for ongoing intelligence" },
    ],
  },
  {
    day: 3,
    title: "Content Planning",
    tasks: [
      { id: "3a", text: "Plan your first 10 video titles using TubeTarzan Idea Tracker" },
      { id: "3b", text: "Write scripts for your first 3 videos using Script Writer" },
      { id: "3c", text: "Create a simple content calendar: 2 videos/week minimum" },
      { id: "3d", text: "Check Niche RPM Guide to understand monetisation potential" },
    ],
  },
  {
    day: 4,
    title: "Production Setup",
    tasks: [
      { id: "4a", text: "Test your recording setup: camera, microphone, lighting" },
      { id: "4b", text: "Create a channel intro (5 seconds max — name + what you do)" },
      { id: "4c", text: "Design 2-3 thumbnail templates (consistent style builds brand)" },
      { id: "4d", text: "Generate your first thumbnails using AI Thumbnail Generator" },
    ],
  },
  {
    day: 5,
    title: "Publish Your First Video",
    tasks: [
      { id: "5a", text: "Record and edit your first video" },
      { id: "5b", text: "Run title through Packaging Studio for optimised title + hook" },
      { id: "5c", text: "Check policy compliance via Policy Check in Script Writer" },
      { id: "5d", text: "Publish and schedule using Publish & Schedule tool" },
    ],
  },
  {
    day: 6,
    title: "Optimise Your Metadata",
    tasks: [
      { id: "6a", text: "Add 10-15 relevant tags to your video (use Copy Tags from Intelligence Board)" },
      { id: "6b", text: "Write a 200+ word description with timestamps and relevant keywords" },
      { id: "6c", text: "Add end screens and cards (after 2+ videos are live)" },
      { id: "6d", text: "Sync your channel in TubeTarzan and check your optimization score" },
    ],
  },
  {
    day: 7,
    title: "Build Your Engine",
    tasks: [
      { id: "7a", text: "Reply to every comment on your first video" },
      { id: "7b", text: "Share your video on 2 relevant communities (Reddit, Facebook groups, etc.)" },
      { id: "7c", text: "Review Retention Analysis after 48 hours of views" },
      { id: "7d", text: "Plan your next 2 weeks of content — consistency beats virality early on" },
    ],
  },
];

export default function WarmupGuide() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    const saved = localStorage.getItem("tt_warmup_completed");
    if (saved) {
      try { setCompleted(new Set(JSON.parse(saved))); } catch { /* ignore */ }
    }
    // Auto-expand first incomplete day
    const savedSet = saved ? new Set(JSON.parse(saved)) : new Set<string>();
    for (const d of DAYS) {
      const allDone = d.tasks.every(t => savedSet.has(t.id));
      if (!allDone) { setExpanded(new Set([d.day])); break; }
    }
  }, []);

  function toggleTask(id: string) {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("tt_warmup_completed", JSON.stringify([...next]));
      return next;
    });
  }

  function toggleDay(day: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  const totalTasks = DAYS.reduce((s, d) => s + d.tasks.length, 0);
  const completedCount = DAYS.reduce((s, d) => s + d.tasks.filter(t => completed.has(t.id)).length, 0);
  const progress = Math.round((completedCount / totalTasks) * 100);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <Flame className="w-6 h-6 text-[#FFD200]" /> Channel Warmup Guide
        </h1>
        <p className="text-[#555555] text-sm">7-day action plan to launch your YouTube channel the right way. Check off tasks as you complete them.</p>
      </div>

      {/* Progress */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold text-sm">{completedCount}/{totalTasks} tasks complete</p>
          <span className={`text-sm font-bold ${progress === 100 ? "text-[#22C55E]" : "text-[#FFD200]"}`}>{progress}%</span>
        </div>
        <div className="h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
          <div className="h-full bg-[#FFD200] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        {progress === 100 && (
          <p className="text-[#22C55E] text-sm mt-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Warmup complete! Your channel is ready to grow.
          </p>
        )}
      </div>

      {/* Days */}
      <div className="space-y-3">
        {DAYS.map(d => {
          const dayDone = d.tasks.every(t => completed.has(t.id));
          const dayCount = d.tasks.filter(t => completed.has(t.id)).length;
          const isOpen = expanded.has(d.day);

          return (
            <div key={d.day} className={`bg-[#111111] border rounded-card overflow-hidden transition-colors ${dayDone ? "border-[#22C55E]/30" : "border-[#1E1E1E]"}`}>
              <button onClick={() => toggleDay(d.day)}
                className="w-full flex items-center gap-4 p-4 hover:bg-[#161616] transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dayDone ? "bg-[#22C55E] text-white" : "bg-[#1E1E1E] text-[#555555]"}`}>
                  {dayDone ? <CheckCircle className="w-4 h-4" /> : d.day}
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold text-sm ${dayDone ? "text-[#22C55E]" : "text-white"}`}>
                    Day {d.day}: {d.title}
                  </p>
                  <p className="text-[#555555] text-xs">{dayCount}/{d.tasks.length} tasks</p>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-[#555555] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#555555] shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-[#1E1E1E] space-y-2 pt-3">
                  {d.tasks.map(task => (
                    <button key={task.id} onClick={() => toggleTask(task.id)}
                      className="w-full flex items-start gap-3 text-left hover:bg-[#0A0A0A] rounded-btn px-3 py-2.5 -mx-3 transition-colors group">
                      <div className={`mt-0.5 shrink-0 ${completed.has(task.id) ? "text-[#22C55E]" : "text-[#333333] group-hover:text-[#555555]"}`}>
                        {completed.has(task.id) ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      </div>
                      <p className={`text-sm leading-snug ${completed.has(task.id) ? "text-[#555555] line-through" : "text-[#999999]"}`}>
                        {task.text}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
