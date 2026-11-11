"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import TubeTarzanMark from "./TubeTarzanMark";

/**
 * Opening splash: a 3D TubeTarzan mark with orbiting rings, shown once per browser session on the public
 * website. It's part of the server HTML so it appears instantly. A tiny inline script marks <html> with
 * "tt-seen" before the first paint when this tab has already seen it (CSS then hides it), and React removes
 * it on mount. Click / Esc / Enter skips it. This component also drives the 3D scroll reveals.
 */
export default function TubeTarzanSplash() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"show" | "out" | "gone">("show");

  useEffect(() => {
    document.documentElement.classList.add("tt-js");
    if (document.documentElement.classList.contains("tt-seen")) {
      setPhase("gone");
      return;
    }
    let outTimer = 0;
    const end = () => {
      try {
        sessionStorage.setItem("tt_splash", "1");
      } catch {
        /* ignore */
      }
      setPhase((p) => (p === "show" ? "out" : p));
      outTimer = window.setTimeout(() => setPhase("gone"), 800);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") end();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("tt-splash-skip", end);
    const t = window.setTimeout(end, 1500);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(outTimer);
      window.removeEventListener("keydown", key);
      window.removeEventListener("tt-splash-skip", end);
    };
  }, []);

  // 3D reveal on scroll for any element with data-reveal (runs on every route change)
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach((n) => n.classList.add("tt-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("tt-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    const t = window.setTimeout(() => document.querySelectorAll("[data-reveal]:not(.tt-in)").forEach((n) => io.observe(n)), 50);
    return () => {
      window.clearTimeout(t);
      io.disconnect();
    };
  }, [pathname]);

  if (phase === "gone" || pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin")) return null;

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: "try{if(sessionStorage.getItem('tt_splash'))document.documentElement.classList.add('tt-seen')}catch(e){}",
        }}
      />
      <div
        className={`tt-splash ${phase === "out" ? "tt-out" : ""}`}
        aria-hidden="true"
        onClick={() => window.dispatchEvent(new Event("tt-splash-skip"))}
      >
        <div className="text-center">
          <div className="tt-splash-stage">
            <div className="tt-splash-ring a"><i /></div>
            <div className="tt-splash-ring b"><i /></div>
            <div className="tt-splash-core"><TubeTarzanMark size={56} /></div>
          </div>
          <p className="font-display font-extrabold text-2xl text-white tracking-tight -mt-6">
            Tube<span className="text-[#FFD200]">Tarzan</span>
          </p>
          <div className="tt-splash-bar"><span /></div>
        </div>
      </div>
    </>
  );
}
