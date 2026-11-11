"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { countryFromTimeZone } from "@/lib/timezone-country";

/**
 * First-party visitor analytics that costs NOTHING on Vercel: the browser writes straight to Supabase with the
 * public anon key (the table only allows inserts, see PHASE9_MIGRATIONS.sql). No IP address is collected;
 * the country is estimated from the browser's time zone.
 *
 *  - one page view per route change
 *  - time on page, sent once when the tab is hidden
 *  - "live now" heartbeat every 2 minutes, only while the tab is visible
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python|axios|node-fetch/i;

function rand(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function stored(storage: "local" | "session", key: string): { value: string; created: boolean } {
  try {
    const s = storage === "local" ? window.localStorage : window.sessionStorage;
    const existing = s.getItem(key);
    if (existing) return { value: existing, created: false };
    const value = rand();
    s.setItem(key, value);
    return { value, created: true };
  } catch {
    return { value: "anon", created: true };
  }
}

function deviceInfo(ua: string) {
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet"
    : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "Other";
  return { device, browser, os };
}

function post(path: string, body: unknown, keepalive = false) {
  if (!SUPABASE_URL || !ANON_KEY) return;
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    keepalive,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  }).catch(() => {});
}

function shouldSkip(path: string): boolean {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return true;
  if (navigator.webdriver || BOT_UA.test(navigator.userAgent)) return true;
  return path.startsWith("/admin") || path.startsWith("/auth") || path.startsWith("/api");
}

export default function Tracker() {
  const pathname = usePathname();
  const current = useRef<{ id: string; start: number } | null>(null);
  const first = useRef(true);

  // page view per route change
  useEffect(() => {
    if (!pathname || shouldSkip(pathname)) return;
    const visitor = stored("local", "tt_vid");
    const session = stored("session", "tt_sid");
    const ua = navigator.userAgent;
    const { device, browser, os } = deviceInfo(ua);
    const sp = new URLSearchParams(window.location.search);
    let referrerHost: string | null = null;
    try {
      const r = document.referrer ? new URL(document.referrer) : null;
      referrerHost = r && r.hostname !== window.location.hostname ? r.hostname : null;
    } catch {
      /* ignore */
    }
    let timeZone = "";
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      /* ignore */
    }

    const id = rand();
    current.current = { id, start: Date.now() };
    post("page_views", {
      id,
      path: pathname.slice(0, 300),
      referrer_host: first.current ? referrerHost : null,
      utm_source: sp.get("utm_source")?.slice(0, 100) || null,
      utm_medium: sp.get("utm_medium")?.slice(0, 100) || null,
      utm_campaign: sp.get("utm_campaign")?.slice(0, 100) || null,
      country: countryFromTimeZone(timeZone),
      timezone: timeZone.slice(0, 64) || null,
      device,
      browser,
      os,
      screen: `${window.screen.width}x${window.screen.height}`.slice(0, 20),
      browser_language: (navigator.language || "").slice(0, 20) || null,
      visitor_id: visitor.value.slice(0, 64),
      session_id: session.value.slice(0, 64),
      is_new_visitor: visitor.created,
      landing: first.current,
      logged_in: /sb-[^=]+-auth-token/.test(document.cookie),
    });
    if (first.current) {
      post("rpc/touch_presence", {
        p_sid: session.value,
        p_path: pathname,
        p_country: countryFromTimeZone(timeZone),
        p_device: device,
        p_referrer: referrerHost,
      });
    }
    first.current = false;
  }, [pathname]);

  // time on page + live heartbeat
  useEffect(() => {
    const sendDuration = () => {
      const c = current.current;
      if (!c) return;
      current.current = null; // only once per page view
      post("rpc/track_duration", { p_id: c.id, p_ms: Date.now() - c.start }, true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendDuration();
    };
    const beat = window.setInterval(() => {
      const path = window.location.pathname;
      if (document.visibilityState !== "visible" || shouldSkip(path)) return;
      let timeZone = "";
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      } catch {
        /* ignore */
      }
      post("rpc/touch_presence", {
        p_sid: stored("session", "tt_sid").value,
        p_path: path,
        p_country: countryFromTimeZone(timeZone),
        p_device: deviceInfo(navigator.userAgent).device,
        p_referrer: null,
      });
    }, 120_000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", sendDuration);
    return () => {
      window.clearInterval(beat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", sendDuration);
    };
  }, []);

  // A route change ends the previous page's timer
  useEffect(() => {
    return () => {
      const c = current.current;
      if (c) post("rpc/track_duration", { p_id: c.id, p_ms: Date.now() - c.start }, true);
    };
  }, [pathname]);

  return null;
}
