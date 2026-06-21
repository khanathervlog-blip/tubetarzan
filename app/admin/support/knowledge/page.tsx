"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, BookOpen, CheckCircle2 } from "lucide-react";

interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  content: string;
  chunk_index: number;
  source_doc: string;
  created_at: string;
  view_count: number;
}

const CATEGORIES = [
  "Getting Started",
  "API Key Setup",
  "Plans & Billing",
  "Intelligence Board",
  "Channel Optimiser",
  "Troubleshooting",
  "General",
];

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({ title: "", category: CATEGORIES[0], content: "" });

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    const res = await fetch("/api/support/knowledge/list");
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries || []);
    }
    setLoading(false);
  }

  async function saveArticle() {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    const res = await fetch("/api/support/knowledge/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSaved(true);
      setForm({ title: "", category: CATEGORIES[0], content: "" });
      setShowForm(false);
      await fetchEntries();
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    setDeleting(id);
    await fetch("/api/support/knowledge/ingest", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeleting(null);
  }

  // Group by source_doc (article), showing unique articles
  const articles = entries.filter((e) => e.chunk_index === 0 || !entries.find(
    (other) => other.source_doc === e.source_doc && other.chunk_index < e.chunk_index
  ));

  const byCategory: Record<string, KnowledgeEntry[]> = {};
  articles.forEach((a) => {
    if (!byCategory[a.category]) byCategory[a.category] = [];
    byCategory[a.category].push(a);
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin/support" className="flex items-center gap-2 text-[#555555] hover:text-white text-sm transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Inbox
          </Link>
          <h1 className="font-display font-bold text-2xl text-white">Knowledge Base</h1>
          <p className="text-[#555555] text-sm mt-1">
            {entries.length} chunks · {articles.length} articles
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-4 py-2.5 rounded-btn hover:bg-[#FFE033] transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Article
        </button>
      </div>

      {saved && (
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-sm rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Article saved and indexed successfully
        </div>
      )}

      {/* Add article form */}
      {showForm && (
        <div className="bg-[#111111] border border-[#FFD200]/20 rounded-xl p-6 mb-8">
          <h2 className="text-white font-semibold text-base mb-4">Add New Article</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[#999999] text-xs font-medium mb-1.5">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD200] transition-colors"
                placeholder="e.g. How to get your free YouTube API key"
              />
            </div>
            <div>
              <label className="block text-[#999999] text-xs font-medium mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD200] transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#999999] text-xs font-medium mb-1.5">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={8}
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors resize-none"
                placeholder="Paste the article content here. It will be automatically split into chunks and indexed with AI embeddings."
              />
              <p className="text-[#555555] text-xs mt-1">{form.content.length} characters</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveArticle}
                disabled={saving || !form.title.trim() || !form.content.trim()}
                className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-5 py-2.5 rounded-btn hover:bg-[#FFE033] transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Indexing...
                  </>
                ) : (
                  "Save & Index"
                )}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm({ title: "", category: CATEGORIES[0], content: "" }); }}
                className="text-[#555555] hover:text-white text-sm px-4 py-2.5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Articles by category */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-[#FFD200]" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 bg-[#111111] border border-[#1E1E1E] rounded-xl">
          <BookOpen className="w-12 h-12 text-[#333333] mx-auto mb-4" />
          <p className="text-[#999999] font-medium">No articles yet</p>
          <p className="text-[#555555] text-sm mt-1">Add articles to power the AI support agent</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-[#FFD200] text-[#080808] font-bold px-5 py-2.5 rounded-btn hover:bg-[#FFE033] transition-colors text-sm"
          >
            Add First Article
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([category, arts]) => (
            <div key={category}>
              <h2 className="text-[#555555] text-xs font-bold uppercase tracking-wider mb-3">
                {category} ({arts.length})
              </h2>
              <div className="space-y-2">
                {arts.map((article) => {
                  const totalChunks = entries.filter((e) => e.source_doc === article.source_doc).length;
                  return (
                    <div
                      key={article.id}
                      className="bg-[#111111] border border-[#1E1E1E] rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{article.title}</p>
                        <p className="text-[#555555] text-xs mt-0.5">
                          {totalChunks} chunk{totalChunks > 1 ? "s" : ""}
                          {article.view_count > 0 && ` · used ${article.view_count}×`}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteEntry(article.id)}
                        disabled={deleting === article.id}
                        className="text-[#333333] hover:text-[#FF3B3B] transition-colors flex-shrink-0 p-1"
                      >
                        {deleting === article.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
