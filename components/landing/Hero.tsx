"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Zap, Play, Star } from "lucide-react";

const DEMO_IDEAS = [
  {
    title: "Dark Side of Self Mastery — Things Gurus Won't Tell You",
    thumbnail: "THEY LIED TO YOU",
    hook: "What if everything you've been told about discipline is keeping you broke?",
    vph: 847,
    outlier: 14.2,
    score: 94,
    source: "@BeyondBeing11",
    views: "2.1M views",
  },
  {
    title: "Why 99% of Istanbul Travel Guides Are Wrong",
    thumbnail: "AVOID THIS MISTAKE",
    hook: "Every travel influencer shows you the same 5 spots. Here's what locals actually visit.",
    vph: 1203,
    outlier: 19.8,
    score: 91,
    source: "@TravelTurkiye",
    views: "890K views",
  },
  {
    title: "Senior Health Secret Doctors Don't Talk About",
    thumbnail: "AFTER 60: DO THIS",
    hook: "The one morning habit that changed everything for people over 60 — and it's free.",
    vph: 634,
    outlier: 11.7,
    score: 88,
    source: "@HealthAfter50",
    views: "3.4M views",
  },
];

function useCountUp(target: number, duration = 1200, active = false) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);

  return value;
}

function IdeaCard({
  idea,
  index,
  active,
}: {
  idea: (typeof DEMO_IDEAS)[0];
  index: number;
  active: boolean;
}) {
  const vph = useCountUp(idea.vph, 1000, active);
  const outlier = useCountUp(Math.floor(idea.outlier * 10), 1000, active);
  const score = useCountUp(idea.score, 800, active);

  return (
    <div
      className={`absolute inset-0 transition-all duration-500 ${
        active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FFD200]" />
            <span className="text-[#999999] text-xs font-mono-stats font-medium">
              VIRAL IDEA #{index + 1}
            </span>
          </div>
          <span className="bg-[#FF3B3B]/20 text-[#FF3B3B] text-xs font-mono-stats font-bold px-2 py-1 rounded-badge">
            Score: {score}/100
          </span>
        </div>

        <h3 className="font-display font-bold text-lg text-white leading-tight mb-4">
          &ldquo;{idea.title}&rdquo;
        </h3>

        <div className="bg-[#080808] rounded-badge px-3 py-2 mb-3">
          <span className="text-[#555555] text-xs uppercase tracking-wider font-medium">
            THUMBNAIL:{" "}
          </span>
          <span className="text-[#FFD200] font-mono-stats font-bold text-sm">
            {idea.thumbnail}
          </span>
        </div>

        <div className="mb-4">
          <span className="text-[#555555] text-xs uppercase tracking-wider font-medium">
            HOOK:{" "}
          </span>
          <p className="text-[#999999] text-sm mt-1 leading-relaxed">
            &ldquo;{idea.hook}&rdquo;
          </p>
        </div>

        <div className="flex items-center gap-4 pt-3 border-t border-[#1E1E1E]">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#FFD200]" />
            <span className="font-mono-stats text-xs text-white font-bold">
              {active ? vph : 0} VPH
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#FF3B3B] text-xs font-bold">🔥</span>
            <span className="font-mono-stats text-xs text-white font-bold">
              {active ? (outlier / 10).toFixed(1) : 0}x
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs">📊</span>
            <span className="font-mono-stats text-xs text-white font-bold">
              {active ? score : 0}/100
            </span>
          </div>
          <div className="ml-auto text-right">
            <span className="text-[#555555] text-xs">
              Source: {idea.source} · {idea.views}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % DEMO_IDEAS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF3B3B]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FFD200]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-sm font-medium px-4 py-2 rounded-full mb-8">
              <Zap className="w-3.5 h-3.5" />
              The VidIQ Alternative — Save 70%
            </div>

            <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.0] tracking-tight mb-6">
              SWING TO THE
              <br />
              <span className="text-gradient-viral">TOP OF</span>
              <br />
              YOUTUBE.
            </h1>

            <p className="text-[#999999] text-lg leading-relaxed mb-8 max-w-lg">
              Stop spending hours on competitor research. TubeTarzan finds
              viral video ideas in your niche in 60 seconds — with real VPH
              data, 14x outlier signals, AI-generated titles, hooks, and
              thumbnail text. Ready to film.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-base px-8 py-4 rounded-btn hover:bg-[#FFE033] transition-colors min-h-[52px]"
              >
                <Zap className="w-4 h-4" />
                Start Free — No Card Needed
              </Link>
              <button className="flex items-center justify-center gap-2 bg-transparent border border-[#333333] text-white font-medium text-base px-8 py-4 rounded-btn hover:border-[#555555] transition-colors min-h-[52px]">
                <Play className="w-4 h-4 text-[#FF3B3B] fill-[#FF3B3B]" />
                Watch Demo — 90 Seconds
              </button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {["AK", "SM", "MT", "JL", "RB"].map((initials, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF3B3B] to-[#FFD200] flex items-center justify-center text-[#080808] text-xs font-bold border-2 border-[#080808]"
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 text-[#FFD200] fill-[#FFD200]"
                    />
                  ))}
                </div>
                <p className="text-[#999999] text-xs mt-0.5">
                  1,200+ YouTube automation creators
                </p>
              </div>
            </div>
          </div>

          {/* Right column — animated idea cards */}
          <div className="relative">
            <div className="relative h-[360px] sm:h-[380px]">
              {DEMO_IDEAS.map((idea, i) => (
                <IdeaCard
                  key={i}
                  idea={idea}
                  index={i}
                  active={i === activeCard}
                />
              ))}
            </div>

            {/* Card dots */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {DEMO_IDEAS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveCard(i)}
                  className={`w-2 h-2 rounded-full transition-all min-w-[8px] ${
                    i === activeCard ? "bg-[#FFD200] w-6" : "bg-[#333333]"
                  }`}
                  aria-label={`Show idea ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
