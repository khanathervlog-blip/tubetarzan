"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Globe, Star, Plus, Trash2, Loader2, Video } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  rating: number;
  is_featured: boolean;
  sort_order: number;
}

const EMPTY_FORM = { name: "", role: "", quote: "", rating: 5, is_featured: false };

export default function LandingPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok = true) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 4000);
  };

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/landing");
    if (res.ok) {
      const data = await res.json();
      setTestimonials(data.testimonials || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addTestimonial = async () => {
    if (!form.name.trim() || !form.quote.trim()) return flash("Name and quote are required", false);
    setSaving("add");
    const res = await fetch("/api/admin/landing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(null);
    if (res.ok) { flash("Testimonial added"); setAdding(false); setForm(EMPTY_FORM); load(); }
    else { const d = await res.json(); flash(d.error || "Error", false); }
  };

  const toggleFeatured = async (t: Testimonial) => {
    setSaving(t.id);
    await fetch("/api/admin/landing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, is_featured: !t.is_featured }),
    });
    setSaving(null);
    load();
  };

  const deleteTestimonial = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    setSaving(`del-${id}`);
    await fetch("/api/admin/landing", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSaving(null);
    flash("Deleted");
    load();
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <Globe className="w-6 h-6 text-[#FFD200]" /> Landing Page
        </h1>
        <p className="text-[#555555] text-sm">Manage testimonials and social proof on the public landing page</p>
      </div>

      {message && (
        <div className={`mb-5 text-sm rounded-badge px-4 py-3 ${message.ok ? "bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]" : "bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 text-[#FF3B3B]"}`}>
          {message.text}
        </div>
      )}

      {/* Hero video / announcement bar lives in Video & Content */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="w-4 h-4 text-[#FFD200] shrink-0" />
          <div>
            <p className="text-white text-sm font-medium">Hero Video &amp; Announcement Bar</p>
            <p className="text-[#555555] text-xs">Managed in Video &amp; Content</p>
          </div>
        </div>
        <Link href="/admin/video" className="text-[#FFD200] text-xs hover:text-white transition-colors whitespace-nowrap">
          Go there →
        </Link>
      </div>

      {/* Testimonials section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white text-sm flex items-center gap-2">
          <Star className="w-4 h-4 text-[#FFD200]" /> Testimonials
          <span className="text-[#555555] font-normal">({testimonials.length})</span>
        </h2>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 bg-[#FFD200] text-[#080808] font-bold px-3 py-1.5 rounded-btn text-sm hover:bg-[#FFE033] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-[#111111] border border-[#FFD200]/30 rounded-card p-5 mb-4">
          <h3 className="text-white text-sm font-semibold mb-4">New Testimonial</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[#555555] text-xs block mb-1.5">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-btn px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD200] transition-colors"
              />
            </div>
            <div>
              <label className="text-[#555555] text-xs block mb-1.5">Role / Channel</label>
              <input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="e.g. 127k subs · Tech niche"
                className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-btn px-3 py-2 text-sm text-white placeholder-[#333333] focus:outline-none focus:border-[#FFD200] transition-colors"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[#555555] text-xs block mb-1.5">Quote *</label>
            <textarea
              value={form.quote}
              onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
              rows={3}
              placeholder="What they said about TubeTarzan…"
              className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-btn px-3 py-2 text-sm text-white placeholder-[#333333] focus:outline-none focus:border-[#FFD200] transition-colors resize-none"
            />
          </div>
          <div className="flex items-center gap-5 mb-4">
            <div>
              <label className="text-[#555555] text-xs block mb-1.5">Rating</label>
              <select
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-btn px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD200] transition-colors"
              >
                {[5, 4, 3].map((n) => <option key={n} value={n}>{n} stars</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                className="w-4 h-4"
              />
              Featured (shown prominently)
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addTestimonial}
              disabled={!!saving}
              className="flex items-center gap-1.5 bg-[#FFD200] text-[#080808] font-bold px-4 py-2 rounded-btn text-sm hover:bg-[#FFE033] transition-colors disabled:opacity-40"
            >
              {saving === "add" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add Testimonial
            </button>
            <button
              onClick={() => { setAdding(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 text-[#555555] text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#555555]" />
        </div>
      ) : testimonials.length === 0 ? (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-12 text-center">
          <Star className="w-8 h-8 text-[#333333] mx-auto mb-3" />
          <p className="text-[#555555] text-sm">No testimonials yet.</p>
          <p className="text-[#333333] text-xs mt-1">Add real user quotes to build trust on the landing page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {testimonials.map((t) => (
            <div key={t.id} className="bg-[#111111] border border-[#1E1E1E] rounded-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-semibold">{t.name}</p>
                    {t.is_featured && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FFD200]/10 text-[#FFD200] font-bold">
                        FEATURED
                      </span>
                    )}
                  </div>
                  {t.role && <p className="text-[#555555] text-xs mt-0.5">{t.role}</p>}
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ color: i < t.rating ? "#FFD200" : "#333333" }}>★</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleFeatured(t)}
                    disabled={!!saving}
                    className="text-xs text-[#555555] hover:text-white border border-[#1E1E1E] rounded-btn px-2 py-1 transition-colors disabled:opacity-40"
                  >
                    {saving === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t.is_featured ? "Unfeature" : "Feature"}
                  </button>
                  <button
                    onClick={() => deleteTestimonial(t.id)}
                    disabled={!!saving}
                    className="text-[#555555] hover:text-[#FF3B3B] transition-colors disabled:opacity-40"
                  >
                    {saving === `del-${t.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-[#999999] text-sm italic">&ldquo;{t.quote}&rdquo;</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
