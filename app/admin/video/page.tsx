"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Save, Loader2, ToggleLeft, ToggleRight, Video, Key } from "lucide-react";
import type { AdminSetting } from "@/types/database";
import { saveVideoSettings } from "./actions";

export default function AdminVideoPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementLink, setAnnouncementLink] = useState("");
  const [announcementLinkText, setAnnouncementLinkText] = useState("");
  const [onboardingApiVideo, setOnboardingApiVideo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["hero_video_url", "hero_video_title", "announcement_bar", "onboarding_api_key_video"]);

      const settings: Record<string, string> = {};
      (data as AdminSetting[] | null)?.forEach((row) => {
        settings[row.key] = row.value;
      });

      setVideoUrl(settings["hero_video_url"] || "");
      setVideoTitle(settings["hero_video_title"] || "See TubeTarzan in Action");
      setOnboardingApiVideo(settings["onboarding_api_key_video"] || "");
      if (settings["announcement_bar"]) {
        try {
          const ab = JSON.parse(settings["announcement_bar"]);
          setAnnouncementText(ab.message || "");
          setAnnouncementActive(ab.enabled || false);
          setAnnouncementLink(ab.link || "");
          setAnnouncementLinkText(ab.linkText || "");
        } catch { /* ignore */ }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveError("");

    const { error } = await saveVideoSettings({
      hero_video_url: videoUrl,
      hero_video_title: videoTitle,
      announcement_bar_text: announcementText,
      announcement_bar_active: announcementActive,
      announcement_bar_link: announcementLink,
      announcement_bar_link_text: announcementLinkText,
      onboarding_api_key_video: onboardingApiVideo,
    });

    setSaving(false);

    if (error) {
      setSaveError(error);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
          Video & Content
        </h1>
        <p className="text-[#555555] text-sm">
          Manage the demo video and announcement bar without code deployment.
        </p>
      </div>

      {/* Hero Video */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Video className="w-4 h-4 text-[#FFD200]" />
          <h2 className="font-semibold text-white text-sm">Hero Demo Video</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#999999] mb-2">
              YouTube Embed URL
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/VIDEO_ID"
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#999999] mb-2">
              Video Title (shown above embed)
            </label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="See TubeTarzan in Action"
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
            />
          </div>

          {videoUrl && (
            <div>
              <p className="text-xs text-[#555555] mb-2">Preview:</p>
              <div
                className="relative w-full rounded-card overflow-hidden"
                style={{ paddingBottom: "56.25%", border: "1px solid #1E1E1E" }}
              >
                <iframe
                  src={videoUrl}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  title="Video preview"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding API Key Tutorial Video */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Key className="w-4 h-4 text-[#FFD200]" />
          <h2 className="font-semibold text-white text-sm">Onboarding — API Key Tutorial Video</h2>
        </div>
        <p className="text-[#555555] text-xs mb-4">
          Shown on the &ldquo;Set Up Your YouTube API Key&rdquo; step during onboarding (free &amp; creator plans only).
          Leave blank to hide the video.
        </p>

        <div>
          <label className="block text-xs font-medium text-[#999999] mb-2">
            YouTube Embed URL
          </label>
          <input
            type="url"
            value={onboardingApiVideo}
            onChange={(e) => setOnboardingApiVideo(e.target.value)}
            placeholder="https://www.youtube.com/embed/VIDEO_ID"
            className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
          />
          <p className="text-[#555555] text-xs mt-1.5">
            Paste the embed URL (e.g. https://www.youtube.com/embed/ABC123). Find it via YouTube &rarr; Share &rarr; Embed.
          </p>
        </div>

        {onboardingApiVideo && (
          <div className="mt-4">
            <p className="text-xs text-[#555555] mb-2">Preview:</p>
            <div
              className="relative w-full rounded-card overflow-hidden"
              style={{ paddingBottom: "56.25%", border: "1px solid #1E1E1E" }}
            >
              <iframe
                src={onboardingApiVideo}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                title="Onboarding tutorial preview"
              />
            </div>
          </div>
        )}
      </div>

      {/* Announcement Bar */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white text-sm">Announcement Bar</h2>
          <button
            onClick={() => setAnnouncementActive(!announcementActive)}
            className="flex items-center gap-2 text-sm"
          >
            {announcementActive ? (
              <>
                <ToggleRight className="w-6 h-6 text-[#22C55E]" />
                <span className="text-[#22C55E] text-xs">Active</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-6 h-6 text-[#555555]" />
                <span className="text-[#555555] text-xs">Inactive</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#999999] mb-2">
              Announcement Text
            </label>
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="🎉 New feature launched! Try our packaging studio →"
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors min-h-[44px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#999999] mb-2">Link URL (optional)</label>
              <input type="url" value={announcementLink} onChange={e => setAnnouncementLink(e.target.value)}
                placeholder="/dashboard/packaging"
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] min-h-[44px]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#999999] mb-2">Link Text (optional)</label>
              <input type="text" value={announcementLinkText} onChange={e => setAnnouncementLinkText(e.target.value)}
                placeholder="Try it now"
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] min-h-[44px]" />
            </div>
          </div>
        </div>

        {announcementActive && announcementText && (
          <div className="mt-3 bg-[#FF3B3B] text-white text-sm text-center py-2 px-4 rounded-badge">
            Preview: {announcementText}
          </div>
        )}
      </div>

      {saveError && (
        <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B] text-sm rounded-badge px-4 py-3 mb-4">
          Failed to save: {saveError}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-6 py-3 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-60 min-h-[44px]"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : saved ? (
          <>
            ✓ Saved!
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}
