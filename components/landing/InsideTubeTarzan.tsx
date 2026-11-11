"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, TrendingUp, Clapperboard, Users, ArrowRight } from "lucide-react";
import { FEATURE_GROUPS } from "@/lib/landing-content";

const ICONS = { intelligence: Search, channel: TrendingUp, studio: Clapperboard, agency: Users } as const;

/** "What you get after signing in" - tabbed tour of the dashboard with 3D tilt cards. */
export default function InsideTubeTarzan() {
  const [tab, setTab] = useState(FEATURE_GROUPS[0].id);
  const gridRef = useRef<HTMLDivElement>(null);
  const group = FEATURE_GROUPS.find((g) => g.id === tab) || FEATURE_GROUPS[0];

  // 3D tilt on hover (mouse only)
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const card = (e.target as HTMLElement).closest<HTMLElement>(".tt-tilt");
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--cry", `${(x * 12).toFixed(2)}deg`);
      card.style.setProperty("--crx", `${(-y * 10).toFixed(2)}deg`);
    };
    const out = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".tt-tilt");
      if (card && !card.contains(e.relatedTarget as Node)) {
        card.style.setProperty("--cry", "0deg");
        card.style.setProperty("--crx", "0deg");
      }
    };
    grid.addEventListener("pointermove", move);
    grid.addEventListener("pointerout", out);
    return () => {
      grid.removeEventListener("pointermove", move);
      grid.removeEventListener("pointerout", out);
    };
  }, []);

  return (
    <section id="inside" className="py-20 lg:py-24 bg-[#080808] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10" data-reveal>
          <p className="text-[#FFD200] text-xs font-bold uppercase tracking-widest mb-4">Inside your dashboard</p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white">Everything after you sign in</h2>
          <p className="text-[#999999] mt-4 max-w-xl mx-auto">25+ tools in one place — from finding the idea to publishing the video.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10" role="tablist" aria-label="Feature groups">
          {FEATURE_GROUPS.map((g) => {
            const Icon = ICONS[g.id as keyof typeof ICONS] || Search;
            const active = g.id === tab;
            return (
              <button
                key={g.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(g.id)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                  active
                    ? "bg-[#FFD200] text-[#080808] border-[#FFD200] shadow-[0_12px_30px_-12px_rgba(255,210,0,.7)]"
                    : "border-[#1E1E1E] text-[#999999] hover:text-white hover:border-[#333]"
                }`}
              >
                <Icon className="w-4 h-4" /> {g.label}
              </button>
            );
          })}
        </div>

        <p className="text-center text-[#CCCCCC] mb-6">{group.blurb}</p>
        <div ref={gridRef} key={group.id} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          {group.items.map((item) => (
            <div key={item.name} className="tt-tilt bg-[#111111] border border-[#1E1E1E] rounded-card p-5 min-h-[112px]">
              <div>
                <p className="text-white font-semibold mb-1.5">{item.name}</p>
                <p className="text-[#999999] text-sm leading-snug">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/signup" className="inline-flex items-center gap-2 text-[#FFD200] font-semibold hover:underline">
            Try it free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
