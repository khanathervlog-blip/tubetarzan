"use client";

import { useState, useEffect } from "react";
import { Key, Check, Loader2, AlertCircle, ExternalLink, User, CreditCard, Tag, Trash2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  full_name?: string;
  email?: string;
  youtube_api_key?: string;
  youtube_api_key_verified?: boolean;
  subscription_plan?: string;
  subscription_status?: string;
  subscription_period_end?: string;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>({});
  const [apiKey, setApiKey] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<"success" | "fail" | null>(null);

  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, youtube_api_key, youtube_api_key_verified, subscription_plan, subscription_status, subscription_period_end")
        .eq("id", user.id)
        .single();
      if (data) {
        const d = data as Profile;
        setProfile(d);
        setFullName(d.full_name || "");
        setIsVerified(d.youtube_api_key_verified || false);
        // Load tags from localStorage keyed by user
        const storedTags = localStorage.getItem(`tag_bank_${user.id}`);
        if (storedTags) { try { setTags(JSON.parse(storedTags)); } catch { /* ignore */ } }
      }
    }
    loadProfile();
  }, []);

  async function handleSaveName() {
    if (!fullName.trim()) return;
    setSavingName(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
    setProfile(prev => ({ ...prev, full_name: fullName.trim() }));
    showToast("Name saved!");
    setSavingName(false);
  }

  async function handleVerifyAndSave() {
    if (!apiKey.trim()) return;
    setIsSaving(true);
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const testRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=UCVHFbw7woebKtRLFDXpSgpw&key=${apiKey.trim()}`
      );
      const testData = await testRes.json();
      if (!testRes.ok || testData.error) {
        setVerifyResult("fail");
        showToast("Invalid API key — please check and try again");
        return;
      }
      setIsVerifying(false);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").update({ youtube_api_key: apiKey.trim(), youtube_api_key_verified: true }).eq("id", user.id);
      setVerifyResult("success");
      setIsVerified(true);
      setApiKey("");
      showToast("API key saved and verified!");
    } catch {
      setVerifyResult("fail");
      showToast("Verification failed.");
    } finally { setIsSaving(false); setIsVerifying(false); }
  }

  async function saveTags(newTags: string[]) {
    setSavingTags(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) localStorage.setItem(`tag_bank_${user.id}`, JSON.stringify(newTags));
    setTags(newTags);
    setSavingTags(false);
    showToast("Tags saved!");
  }

  function handleAddTag() {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9 _-]/g, "");
    if (!t || tags.includes(t)) return;
    const newTags = [...tags, t];
    setTagInput("");
    saveTags(newTags);
  }

  function handleRemoveTag(tag: string) {
    saveTags(tags.filter(t => t !== tag));
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") return;
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (res.ok) {
        window.location.href = "/";
      } else {
        const d = await res.json();
        showToast(d.error || "Delete failed. Please contact support.");
        setDeletingAccount(false);
      }
    } catch { showToast("Delete failed."); setDeletingAccount(false); }
  }

  function planLabel(plan: string | undefined) {
    if (!plan || plan === "free") return "Free Plan";
    return `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">Settings</h1>
        <p className="text-[#555555] text-sm">Manage your account, API keys, and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-[#FFD200]" />
          <h2 className="font-semibold text-white">Profile</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#999999] mb-1">Email</label>
            <p className="text-white text-sm">{profile.email || "—"}</p>
          </div>
          <div>
            <label className="block text-xs text-[#999999] mb-1">Display Name</label>
            <div className="flex gap-2">
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                className="flex-1 bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-[#FFD200]" />
              <button onClick={handleSaveName} disabled={savingName || !fullName.trim() || fullName === profile.full_name}
                className="bg-[#FFD200] text-[#080808] font-bold px-4 py-2 rounded-btn text-sm hover:bg-[#FFE033] disabled:opacity-50 min-h-[40px]">
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#FFD200]" />
            <h2 className="font-semibold text-white">Subscription</h2>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-badge capitalize ${
            profile.subscription_plan && profile.subscription_plan !== "free"
              ? "bg-[#FFD200] text-[#080808]"
              : "bg-[#1E1E1E] text-[#555555]"
          }`}>
            {planLabel(profile.subscription_plan)}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          {profile.subscription_status && (
            <div className="flex items-center gap-2">
              <span className="text-[#555555] w-32">Status</span>
              <span className={`capitalize ${profile.subscription_status === "active" ? "text-[#22C55E]" : "text-[#FFB700]"}`}>
                {profile.subscription_status}
              </span>
            </div>
          )}
          {profile.subscription_period_end && (
            <div className="flex items-center gap-2">
              <span className="text-[#555555] w-32">Renews / ends</span>
              <span className="text-white">{new Date(profile.subscription_period_end).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        {(!profile.subscription_plan || profile.subscription_plan === "free") ? (
          <a href="/#pricing" className="inline-flex items-center gap-2 mt-4 bg-[#FFD200] text-[#080808] font-bold px-4 py-2.5 rounded-btn text-sm hover:bg-[#FFE033]">
            Upgrade Plan →
          </a>
        ) : (
          <p className="text-[#555555] text-xs mt-4">Manage your subscription in the LemonSqueezy customer portal.</p>
        )}
      </div>

      {/* Tag Bank */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4 text-[#FFD200]" />
          <h2 className="font-semibold text-white">Tag Bank</h2>
          {savingTags && <Loader2 className="w-3 h-3 text-[#555555] animate-spin" />}
        </div>
        <p className="text-[#555555] text-xs mb-4">Reusable tags for your niche. Used as default suggestions in video optimisation.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-[#1E1E1E] text-[#999999] text-xs px-2.5 py-1 rounded-badge">
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="text-[#555555] hover:text-[#FF3B3B] transition-colors ml-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {tags.length === 0 && <span className="text-[#555555] text-xs">No tags yet</span>}
        </div>
        <div className="flex gap-2">
          <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
            placeholder="Add a tag..."
            maxLength={50}
            className="flex-1 bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-[#FFD200]" />
          <button onClick={handleAddTag} disabled={!tagInput.trim()}
            className="bg-[#1E1E1E] hover:bg-[#2E2E2E] text-[#999999] hover:text-white px-3 py-2 rounded-btn text-sm transition-colors disabled:opacity-50 min-h-[40px]">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* YouTube API Key */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-[#FFD200]" />
          <h2 className="font-semibold text-white">YouTube Data API Key</h2>
          {isVerified && (
            <span className="flex items-center gap-1 text-xs text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 rounded-badge">
              <Check className="w-3 h-3" />Verified
            </span>
          )}
        </div>
        <p className="text-[#555555] text-sm mb-4 leading-relaxed">
          Free and Creator plan users need their own YouTube Data API key. Get one free from{" "}
          <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer"
            className="text-[#FF3B3B] hover:underline inline-flex items-center gap-0.5">
            Google Cloud Console <ExternalLink className="w-3 h-3" />
          </a>.
        </p>
        {profile.youtube_api_key && (
          <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-btn px-3 py-2 mb-4 flex items-center gap-2">
            <span className="text-[#555555] text-xs">Current key:</span>
            <span className="font-mono text-xs text-white">{"•".repeat(20)}</span>
          </div>
        )}
        <div className="space-y-3">
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full px-3 py-3 bg-[#0A0A0A] border border-[#1E1E1E] rounded-btn text-white placeholder-[#555555] text-sm focus:outline-none focus:border-[#FF3B3B] font-mono min-h-[44px]" />
          {verifyResult === "fail" && (
            <div className="flex items-center gap-2 text-[#FF3B3B] text-xs">
              <AlertCircle className="w-3.5 h-3.5" />Invalid API key.
            </div>
          )}
          <button onClick={handleVerifyAndSave} disabled={!apiKey.trim() || isSaving}
            className="flex items-center gap-2 bg-[#FF3B3B] hover:bg-[#FF5555] disabled:opacity-50 text-white font-bold px-5 py-3 rounded-btn text-sm min-h-[44px]">
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />{isVerifying ? "Verifying..." : "Saving..."}</> : <><Key className="w-4 h-4" />Verify & Save Key</>}
          </button>
        </div>
      </div>

      {/* How to get key */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6 mb-4">
        <h3 className="font-semibold text-white mb-4">How to get a free YouTube API key</h3>
        <ol className="space-y-2 text-sm text-[#999999]">
          {[
            "Go to console.cloud.google.com and sign in",
            "Create a new project",
            'Go to "APIs & Services" → "Library"',
            'Search for "YouTube Data API v3" and Enable',
            'Go to "Credentials" → "Create Credentials" → "API key"',
            "Copy and paste above",
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-[#FF3B3B] font-bold shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Danger zone */}
      <div className="bg-[#111111] border border-[#FF3B3B]/30 rounded-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 className="w-4 h-4 text-[#FF3B3B]" />
          <h2 className="font-semibold text-[#FF3B3B]">Danger Zone</h2>
        </div>
        <p className="text-[#555555] text-sm mb-4">Permanently delete your account and all data. This cannot be undone.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#555555] mb-1">Type DELETE to confirm</label>
            <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="bg-[#0A0A0A] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-[#FF3B3B] w-full max-w-48" />
          </div>
          <button onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== "DELETE" || deletingAccount}
            className="flex items-center gap-2 bg-[#FF3B3B]/10 border border-[#FF3B3B]/40 hover:bg-[#FF3B3B]/20 text-[#FF3B3B] font-bold px-4 py-2.5 rounded-btn text-sm disabled:opacity-50 transition-colors">
            {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete My Account
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#111111] border border-[#1E1E1E] text-white text-sm px-4 py-3 rounded-card shadow-2xl z-50 animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}
