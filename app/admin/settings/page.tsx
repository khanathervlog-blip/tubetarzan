"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ToggleLeft, ToggleRight, Trash2, Server } from "lucide-react";
import type { AdminSetting } from "@/types/database";

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cacheCount, setCacheCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: settings }, { count }] = await Promise.all([
        supabase
          .from("admin_settings")
          .select("key, value")
          .eq("key", "maintenance_mode")
          .single(),
        supabase
          .from("search_cache")
          .select("*", { count: "exact", head: true }),
      ]);

      setMaintenanceMode((settings as AdminSetting | null)?.value === "true");
      setCacheCount(count || 0);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleMaintenance() {
    setSaving(true);
    const supabase = createClient();
    const newValue = !maintenanceMode;
    await supabase
      .from("admin_settings")
      .upsert({
        key: "maintenance_mode",
        value: newValue ? "true" : "false",
        updated_at: new Date().toISOString(),
      } as AdminSetting);
    setMaintenanceMode(newValue);
    setSaving(false);
    setMessage(
      `Maintenance mode ${newValue ? "enabled" : "disabled"}`
    );
    setTimeout(() => setMessage(""), 3000);
  }

  async function clearCache() {
    if (
      !confirm(
        "Are you sure you want to clear all search cache? This will slow down the next scans."
      )
    )
      return;
    setClearing(true);
    const supabase = createClient();
    await supabase.from("search_cache").delete().gte("id", "0");
    setCacheCount(0);
    setClearing(false);
    setMessage("Cache cleared successfully");
    setTimeout(() => setMessage(""), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#555555]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">
          Platform Settings
        </h1>
        <p className="text-[#555555] text-sm">
          Global platform configuration
        </p>
      </div>

      {message && (
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-sm rounded-badge px-4 py-3 mb-6">
          {message}
        </div>
      )}

      {/* Maintenance Mode */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white text-sm mb-1">
              Maintenance Mode
            </h2>
            <p className="text-[#555555] text-xs">
              When active, shows maintenance page to all non-admin users
            </p>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={saving}
            className="flex items-center gap-2 min-h-[44px]"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#555555]" />
            ) : maintenanceMode ? (
              <>
                <ToggleRight className="w-7 h-7 text-[#FF3B3B]" />
                <span className="text-[#FF3B3B] text-xs font-medium">ON</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-7 h-7 text-[#555555]" />
                <span className="text-[#555555] text-xs font-medium">OFF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cache Stats */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-[#FFD200]" />
          <h2 className="font-semibold text-white text-sm">Search Cache</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#999999] text-sm">
              <span className="text-white font-mono-stats font-bold text-xl">
                {cacheCount ?? "—"}
              </span>{" "}
              cached niche scans
            </p>
            <p className="text-[#555555] text-xs mt-1">
              Cache speeds up repeat searches for the same niche
            </p>
          </div>

          <button
            onClick={clearCache}
            disabled={clearing || cacheCount === 0}
            className="flex items-center gap-2 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-sm px-4 py-2 rounded-btn hover:bg-[#FF3B3B]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            {clearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Clear Cache
              </>
            )}
          </button>
        </div>
      </div>

      {/* API Key Pool */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
        <h2 className="font-semibold text-white text-sm mb-4">
          Platform API Key Pool (Pro/Agency)
        </h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => {
            const hasKey = !!process.env[`YOUTUBE_API_KEY_${n}`];
            return (
              <div
                key={n}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[#999999]">API Key #{n}</span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-badge ${
                    hasKey
                      ? "bg-[#22C55E]/10 text-[#22C55E]"
                      : "bg-[#333333] text-[#555555]"
                  }`}
                >
                  {hasKey ? "Configured" : "Not set"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[#555555] text-xs mt-4">
          Configure API keys in your environment variables.
        </p>
      </div>
    </div>
  );
}
