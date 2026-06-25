"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Check, Trash2, RefreshCw, Loader2, Users } from "lucide-react";

interface ChannelEntry {
  id: string;
  name: string;
  handle: string | null;
  thumbnail: string | null;
  subscriber_count: number | null;
  connected_at: string;
}

interface Props {
  onSwitch?: () => void;
}

export default function AdminChannelManager({ onSwitch }: Props) {
  const [channels, setChannels] = useState<ChannelEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/channels");
      const data = await res.json();
      setChannels(data.channels || []);
      setActiveId(data.activeId || null);
    } catch {
      showToast("Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function switchChannel(channelId: string) {
    if (channelId === activeId) return;
    setSwitching(channelId);
    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (!res.ok) { showToast("Switch failed"); return; }
      setActiveId(channelId);
      showToast("Active channel switched — reload to see updated data");
      onSwitch?.();
    } catch {
      showToast("Switch failed");
    } finally {
      setSwitching(null);
    }
  }

  async function removeChannel(channelId: string) {
    if (!confirm("Remove this channel from your account?")) return;
    setRemoving(channelId);
    try {
      const res = await fetch("/api/admin/channels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (!res.ok) { showToast("Remove failed"); return; }
      setChannels(prev => prev.filter(c => c.id !== channelId));
      if (activeId === channelId) {
        const next = channels.find(c => c.id !== channelId);
        setActiveId(next?.id || null);
        showToast("Channel removed — active channel updated");
        onSwitch?.();
      } else {
        showToast("Channel removed");
      }
    } catch {
      showToast("Remove failed");
    } finally {
      setRemoving(null);
    }
  }

  function formatSubs(n: number | null) {
    if (!n) return null;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#FFD200]" />
          <h2 className="text-white font-semibold text-sm">My Channels</h2>
          <span className="text-[#555555] text-xs">({channels.length} connected)</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="text-[#555555] hover:text-white p-1.5 rounded-btn transition-colors" title="Refresh">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <a href="/api/auth/youtube/connect?addChannel=true&return=dashboard"
            className="flex items-center gap-1.5 bg-[#FFD200] text-[#080808] font-bold text-xs px-3 py-1.5 rounded-btn hover:bg-[#FFE033] transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add Channel
          </a>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-[#1A1A1A] rounded-btn animate-pulse" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-[#555555] text-sm mb-3">No channels connected yet</p>
          <a href="/api/auth/youtube/connect?return=dashboard"
            className="inline-flex items-center gap-2 bg-[#FF3B3B] text-white font-bold text-sm px-5 py-2 rounded-btn hover:bg-[#FF5555] transition-colors">
            Connect Your First Channel →
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map(ch => {
            const isActive = ch.id === activeId;
            const isSwitching = switching === ch.id;
            const isRemoving = removing === ch.id;

            return (
              <div key={ch.id}
                className={`flex items-center gap-3 p-3 rounded-btn border transition-colors ${isActive ? "border-[#FFD200]/30 bg-[#FFD200]/5" : "border-[#1E1E1E] bg-[#0A0A0A]"}`}>
                {ch.thumbnail ? (
                  <img src={ch.thumbnail} alt="" className="w-10 h-10 rounded-full border border-[#1E1E1E] shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#1E1E1E] shrink-0 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#555555]" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium truncate">{ch.name}</p>
                    {isActive && (
                      <span className="shrink-0 text-xs bg-[#FFD200] text-[#080808] font-bold px-1.5 py-0.5 rounded-badge">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {ch.handle && <p className="text-[#555555] text-xs">{ch.handle}</p>}
                    {ch.subscriber_count != null && (
                      <p className="text-[#555555] text-xs">{formatSubs(ch.subscriber_count)} subs</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isActive && (
                    <button onClick={() => switchChannel(ch.id)} disabled={!!switching}
                      className="flex items-center gap-1.5 bg-[#1E1E1E] hover:bg-[#FFD200] hover:text-[#080808] text-[#999999] text-xs px-3 py-1.5 rounded-btn transition-colors min-w-[70px] justify-center">
                      {isSwitching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      {isSwitching ? "..." : "Switch"}
                    </button>
                  )}
                  <button onClick={() => removeChannel(ch.id)} disabled={!!removing || !!switching}
                    className="text-[#555555] hover:text-[#FF3B3B] p-1.5 rounded-btn transition-colors" title="Remove channel">
                    {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="mt-3 text-xs text-[#FFD200] bg-[#FFD200]/10 border border-[#FFD200]/20 rounded-btn px-3 py-2">
          {toast}
        </div>
      )}
    </div>
  );
}
