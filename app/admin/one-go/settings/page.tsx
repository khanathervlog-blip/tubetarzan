"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface OneGoConfig {
  channel_id: string;
  channel_handle: string;
  channel_niche: string;
  target_duration_minutes: number;
  video_language: string;
  face_video_url: string;
  voice_name: string;
  voice_language: string;
  speaking_rate: number;
  pitch: number;
  caption_style: string;
  caption_font_size: number;
  caption_position: string;
  caption_primary_color: string;
  caption_highlight_color: string;
  auto_post: boolean;
  post_platforms: string[];
  weekly_schedule_active: boolean;
  max_runs_per_month: number;
}

const DEFAULTS: OneGoConfig = {
  channel_id: "",
  channel_handle: "",
  channel_niche: "",
  target_duration_minutes: 10,
  video_language: "en",
  face_video_url: "",
  voice_name: "en-US-Neural2-A",
  voice_language: "en-US",
  speaking_rate: 1.0,
  pitch: 0,
  caption_style: "word_highlight",
  caption_font_size: 24,
  caption_position: "bottom",
  caption_primary_color: "#FFFFFF",
  caption_highlight_color: "#FFD200",
  auto_post: true,
  post_platforms: ["youtube"],
  weekly_schedule_active: false,
  max_runs_per_month: 8,
};

const CAPTION_STYLES = [
  { value: "word_highlight", label: "Word Highlight (viral)" },
  { value: "classic_white", label: "Classic White" },
  { value: "yellow_pop", label: "Yellow Pop" },
  { value: "karaoke", label: "Karaoke" },
  { value: "netflix", label: "Netflix Style" },
];

const VOICE_OPTIONS = [
  { value: "en-US-Neural2-A", lang: "en-US", label: "English US (Neural A)" },
  { value: "en-US-Neural2-D", lang: "en-US", label: "English US (Neural D)" },
  { value: "en-GB-Neural2-A", lang: "en-GB", label: "English UK (Neural A)" },
  { value: "ur-PK-UzmaNeural", lang: "ur-PK", label: "Urdu PK (Uzma)" },
  { value: "ar-SA-ZariyahNeural", lang: "ar-SA", label: "Arabic SA (Zariyah)" },
  { value: "hi-IN-NeerjaNeural", lang: "hi-IN", label: "Hindi IN (Neerja)" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-[#999999] mb-1">{label}</label>
      {children}
      {hint && <p className="text-[#333333] text-xs mt-1">{hint}</p>}
    </div>
  );
}

export default function OneGoSettingsPage() {
  const [config, setConfig] = useState<OneGoConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/one-go")
      .then(r => r.json())
      .then(data => {
        if (data.config) setConfig({ ...DEFAULTS, ...data.config });
      })
      .catch(() => setError("Failed to load config"))
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof OneGoConfig, value: unknown) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/admin/one-go", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:border-[#FFD200]";

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#555555] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading config...
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">One Go — Settings</h1>
        <p className="text-[#555555] text-sm">Configure once, automate forever.</p>
      </div>

      <div className="space-y-6">
        {/* Channel */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 space-y-4">
          <p className="text-white font-semibold text-sm">My Channel</p>
          <Field label="Channel Handle (without @)">
            <input className={inputCls} value={config.channel_handle} onChange={e => update("channel_handle", e.target.value)} placeholder="YourHandle" />
          </Field>
          <Field label="Channel ID">
            <input className={inputCls} value={config.channel_id} onChange={e => update("channel_id", e.target.value)} placeholder="UCxxxxxxxxxxxx" />
          </Field>
          <Field label="Niche / Topic" hint="e.g. self mastery, driving lessons, travel Pakistan">
            <input className={inputCls} value={config.channel_niche} onChange={e => update("channel_niche", e.target.value)} placeholder="self mastery" />
          </Field>
          <Field label="Target Video Duration (minutes)">
            <select className={inputCls} value={config.target_duration_minutes} onChange={e => update("target_duration_minutes", parseInt(e.target.value))}>
              <option value={5}>5 minutes</option>
              <option value={8}>8 minutes</option>
              <option value={10}>10 minutes (recommended)</option>
              <option value={15}>15 minutes</option>
            </select>
          </Field>
        </div>

        {/* Avatar */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 space-y-4">
          <p className="text-white font-semibold text-sm">Avatar Video for Lip Sync</p>
          <p className="text-[#555555] text-xs">
            Upload a 60-second face video to your Supabase storage and paste the URL here.
            Record yourself looking at the camera with good lighting. You only do this once.
          </p>
          <Field label="Face Video URL (from Supabase storage)">
            <input className={inputCls} value={config.face_video_url} onChange={e => update("face_video_url", e.target.value)} placeholder="https://..." />
          </Field>
          {config.face_video_url && (
            <video src={config.face_video_url} className="w-48 h-28 rounded-btn object-cover" controls />
          )}
        </div>

        {/* Voice */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 space-y-4">
          <p className="text-white font-semibold text-sm">Voice Settings</p>
          <Field label="Voice">
            <select className={inputCls} value={config.voice_name} onChange={e => {
              const opt = VOICE_OPTIONS.find(v => v.value === e.target.value);
              update("voice_name", e.target.value);
              if (opt) update("voice_language", opt.lang);
            }}>
              {VOICE_OPTIONS.map(v => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Speaking Rate" hint="1.0 = normal, 1.2 = slightly faster">
              <input type="number" step="0.1" min="0.5" max="2.0" className={inputCls} value={config.speaking_rate} onChange={e => update("speaking_rate", parseFloat(e.target.value))} />
            </Field>
            <Field label="Pitch" hint="0 = default, -2 to +2">
              <input type="number" step="1" min="-4" max="4" className={inputCls} value={config.pitch} onChange={e => update("pitch", parseFloat(e.target.value))} />
            </Field>
          </div>
        </div>

        {/* Captions */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 space-y-4">
          <p className="text-white font-semibold text-sm">Captions</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Caption Style">
              <select className={inputCls} value={config.caption_style} onChange={e => update("caption_style", e.target.value)}>
                {CAPTION_STYLES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Font Size">
              <input type="number" min="16" max="48" className={inputCls} value={config.caption_font_size} onChange={e => update("caption_font_size", parseInt(e.target.value))} />
            </Field>
            <Field label="Position">
              <select className={inputCls} value={config.caption_position} onChange={e => update("caption_position", e.target.value)}>
                <option value="bottom">Bottom</option>
                <option value="center">Center</option>
                <option value="top">Top</option>
              </select>
            </Field>
            <Field label="Highlight Color">
              <div className="flex gap-2 items-center">
                <input type="color" className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" value={config.caption_highlight_color} onChange={e => update("caption_highlight_color", e.target.value)} />
                <input className={`${inputCls} flex-1`} value={config.caption_highlight_color} onChange={e => update("caption_highlight_color", e.target.value)} />
              </div>
            </Field>
          </div>
        </div>

        {/* Posting */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 space-y-4">
          <p className="text-white font-semibold text-sm">Posting</p>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="auto_post"
              checked={config.auto_post}
              onChange={e => update("auto_post", e.target.checked)}
              className="w-4 h-4 accent-[#FFD200]"
            />
            <label htmlFor="auto_post" className="text-sm text-[#999999]">
              Auto-post when complete (requires platform connected in Settings)
            </label>
          </div>
          {config.auto_post && (
            <div>
              <p className="text-xs text-[#555555] mb-2">Platforms:</p>
              {["youtube", "instagram", "tiktok"].map(p => (
                <label key={p} className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.post_platforms.includes(p)}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...config.post_platforms, p]
                        : config.post_platforms.filter(x => x !== p);
                      update("post_platforms", next);
                    }}
                    className="w-4 h-4 accent-[#FFD200]"
                  />
                  <span className="text-sm text-[#999999] capitalize">{p}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 pt-2 border-t border-[#1E1E1E]">
            <input
              type="checkbox"
              id="weekly"
              checked={config.weekly_schedule_active}
              onChange={e => update("weekly_schedule_active", e.target.checked)}
              className="w-4 h-4 accent-[#FFD200]"
            />
            <label htmlFor="weekly" className="text-sm text-[#999999]">
              Weekly schedule — every Friday 3am UTC (= posts at 7pm EST peak time)
            </label>
          </div>
          <Field label="Max Runs Per Month" hint="Safety limit to prevent runaway costs">
            <input type="number" min="1" max="30" className={inputCls} value={config.max_runs_per_month} onChange={e => update("max_runs_per_month", parseInt(e.target.value))} />
          </Field>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-6 py-2.5 rounded-btn text-sm hover:bg-[#FFE033] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-[#22C55E] text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Saved
          </div>
        )}
        {error && (
          <div className="flex items-center gap-1.5 text-[#FF3B3B] text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
