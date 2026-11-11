"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Zap, TrendingUp, Flame, Sparkles, Play } from "lucide-react";

const IDEAS = [
  { title: "Dark Side of Self Mastery — What Gurus Won't Tell You", thumb: "THEY LIED TO YOU", vph: 847, outlier: 14.2, score: 94, niche: "Self-improvement" },
  { title: "Why 99% of Istanbul Travel Guides Are Wrong", thumb: "AVOID THIS MISTAKE", vph: 1203, outlier: 19.8, score: 91, niche: "Travel" },
  { title: "The Morning Habit Doctors Don't Talk About", thumb: "AFTER 60: DO THIS", vph: 634, outlier: 11.7, score: 88, niche: "Health" },
];

/** Hero with a 3D stack of "viral idea" cards that tilts with the pointer. Client-only effects, static HTML. */
export default function Hero3D() {
  const [front, setFront] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // rotate the card stack every 4 s (pauses while the tab is hidden)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setFront((f) => (f + 1) % IDEAS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  // pointer tilt (mouse only, so phones scroll normally)
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = stage.getBoundingClientRect();
        const x = Math.max(-0.8, Math.min(0.8, (e.clientX - r.left) / r.width - 0.5));
        const y = Math.max(-0.8, Math.min(0.8, (e.clientY - r.top) / r.height - 0.5));
        stage.style.setProperty("--ry", `${(-14 + x * 22).toFixed(2)}deg`);
        stage.style.setProperty("--rx", `${(8 - y * 16).toFixed(2)}deg`);
        stage.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
        stage.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
      });
    };
    const leave = () => {
      stage.style.setProperty("--ry", "-14deg");
      stage.style.setProperty("--rx", "8deg");
    };
    section.addEventListener("pointermove", move);
    section.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      section.removeEventListener("pointermove", move);
      section.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-[92vh] flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-20 left-1/4 w-[28rem] h-[28rem] bg-[#FF3B3B]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-[20%] w-[28rem] h-[28rem] bg-[#FFD200]/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at 60% 40%, black, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 60% 40%, black, transparent 70%)",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#FFD200]/10 border border-[#FFD200]/20 text-[#FFD200] text-sm font-medium px-4 py-2 rounded-full mb-7">
              <Zap className="w-3.5 h-3.5" /> The VidIQ alternative for YouTube creators
            </div>
            <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.0] tracking-tight mb-6">
              Find viral YouTube ideas <span className="text-gradient-viral">in 60 seconds.</span>
            </h1>
            <p className="text-[#999999] text-lg leading-relaxed mb-8 max-w-lg">
              Real views-per-hour and outlier scores show what&apos;s working in your niche right now. TubeTarzan
              turns it into a title, hook, script and thumbnail text — ready to film.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 bg-[#FFD200] text-[#080808] font-bold text-base px-8 py-4 rounded-btn hover:bg-[#FFE033] transition-colors min-h-[52px] shadow-[0_20px_50px_-20px_rgba(255,210,0,.6)]"
              >
                <Zap className="w-4 h-4" /> Start free — no card
              </Link>
              <a
                href="#inside"
                className="flex items-center justify-center gap-2 border border-[#333333] text-white font-medium text-base px-8 py-4 rounded-btn hover:border-[#555555] transition-colors min-h-[52px]"
              >
                <Play className="w-4 h-4 text-[#FF3B3B] fill-[#FF3B3B]" /> See what&apos;s inside
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#999999]">
              <li>✓ Free plan forever</li>
              <li>✓ Official YouTube data</li>
              <li>✓ Cancel anytime</li>
            </ul>
          </div>

          {/* 3D scene */}
          <div className="tt-scene relative h-[420px] sm:h-[460px]" aria-hidden="true">
            <div className="tt-orbit" style={{ width: 520, height: 520, left: "50%", top: "50%", marginLeft: -260, marginTop: -260 }}><span /></div>
            <div className="tt-orbit r2" style={{ width: 380, height: 380, left: "50%", top: "50%", marginLeft: -190, marginTop: -190 }}><span /></div>

            <div ref={stageRef} className="tt-stage absolute left-1/2 top-1/2 w-[320px] sm:w-[380px] h-[300px] -ml-[160px] sm:-ml-[190px] -mt-[150px]">
              {IDEAS.map((idea, i) => {
                const pos = (i - front + IDEAS.length) % IDEAS.length;
                return (
                  <div key={idea.title} className="tt-card3d p-5" data-pos={pos}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[#999999] text-[11px] font-mono font-semibold tracking-wider">VIRAL IDEA · {idea.niche.toUpperCase()}</span>
                      <span className="bg-[#FF3B3B]/20 text-[#FF6B6B] text-xs font-mono font-bold px-2 py-1 rounded-badge">{idea.score}/100</span>
                    </div>
                    <div className="h-24 rounded-lg mb-4 flex items-center justify-center bg-gradient-to-br from-[#2a1212] to-[#141414] border border-white/5">
                      <span className="font-display font-extrabold text-xl text-white tracking-tight text-center px-3">{idea.thumb}</span>
                    </div>
                    <p className="text-white text-sm font-semibold leading-snug mb-4 line-clamp-2">{idea.title}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/40 rounded-lg p-2.5">
                        <p className="text-[10px] text-[#555555] font-mono">VIEWS / HOUR</p>
                        <p className="text-[#FFD200] font-mono font-bold">{idea.vph.toLocaleString()}</p>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2.5">
                        <p className="text-[10px] text-[#555555] font-mono">OUTLIER</p>
                        <p className="text-[#22C55E] font-mono font-bold">{idea.outlier}x</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="tt-float d1 left-[0%] top-[0%] scale-75"><div className="tt-play"><i /><i /><i /><b /></div></div>
            <div className="tt-float d2 right-[0%] top-[6%]"><span className="tt-chip"><Flame className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />14.2x outlier</span></div>
            <div className="tt-float d3 left-[0%] bottom-[10%]"><span className="tt-chip green"><TrendingUp className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />+1,203 VPH</span></div>
            <div className="tt-float right-[4%] bottom-[4%]"><span className="tt-chip red"><Sparkles className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />Title + hook ready</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
