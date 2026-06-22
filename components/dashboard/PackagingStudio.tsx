"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Check, Loader2, Copy, Save, RotateCcw, Shield, ChevronRight, FileText, Tag } from "lucide-react";
import { scoreTitle } from "@/lib/scoring";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface ThumbnailOption { text: string; score: number; why: string }
interface Hook { text: string; type: string; strength: number }
interface OutlineSection { section: string; time: string; points: string[] }

export default function PackagingStudio() {
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [titleScore, setTitleScore] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState("");

  const [thumbnailOptions, setThumbnailOptions] = useState<ThumbnailOption[]>([]);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);
  const [selectedThumbnail, setSelectedThumbnail] = useState("");

  const [topic, setTopic] = useState("");
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [clickConfirmation, setClickConfirmation] = useState("");
  const [loadingHooks, setLoadingHooks] = useState(false);
  const [selectedHook, setSelectedHook] = useState("");

  const [outline, setOutline] = useState<OutlineSection[]>([]);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [policyResult, setPolicyResult] = useState<{ status: string; checks: { pass: boolean; text: string }[]; summary: string } | null>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);

  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [descriptionCopied, setDescriptionCopied] = useState(false);

  const [tags, setTags] = useState<string[]>([]);
  const [primaryTags, setPrimaryTags] = useState<string[]>([]);
  const [tagTip, setTagTip] = useState("");
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagsCopied, setTagsCopied] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [savedToTracker, setSavedToTracker] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setTitleScore(scoreTitle(title)), 300);
    return () => clearTimeout(t);
  }, [title]);

  const activeTitle = selectedTitle || title;

  function titleScoreColor(score: number) {
    if (score >= 80) return "text-[#22C55E]";
    if (score >= 60) return "text-[#FFB700]";
    return "text-[#FF3B3B]";
  }

  function strengthStars(n: number) {
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  async function generateThumbnail() {
    if (!activeTitle) return;
    setLoadingThumbnail(true);
    try {
      const res = await fetch("/api/packaging/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "thumbnail", title: activeTitle }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Generation failed"); return; }
      setThumbnailOptions(data.options || []);
    } catch { showToast("Network error"); }
    finally { setLoadingThumbnail(false); }
  }

  async function generateHooks() {
    setLoadingHooks(true);
    try {
      const res = await fetch("/api/packaging/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "hooks", title: activeTitle, thumbnailText: selectedThumbnail, topic }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Generation failed"); return; }
      setHooks(data.hooks || []);
      setClickConfirmation(data.click_confirmation || "");
    } catch { showToast("Network error"); }
    finally { setLoadingHooks(false); }
  }

  async function generateOutline() {
    setLoadingOutline(true);
    setLoadingPolicy(true);
    try {
      const [outlineRes, policyRes] = await Promise.all([
        fetch("/api/packaging/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "outline", title: activeTitle, thumbnailText: selectedThumbnail, topic }),
        }),
        fetch("/api/packaging/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "policy", title: activeTitle, topic }),
        }),
      ]);
      const [outlineData, policyData] = await Promise.all([outlineRes.json(), policyRes.json()]);
      setOutline(outlineData.outline || []);
      setPolicyResult(policyData);
    } catch { showToast("Generation failed"); }
    finally { setLoadingOutline(false); setLoadingPolicy(false); }
  }

  async function generateDescription() {
    setLoadingDescription(true);
    try {
      const res = await fetch("/api/packaging/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "description", title: activeTitle, topic }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Generation failed"); return; }
      setDescription(data.description || "");
      setHashtags(data.hashtags || []);
      setKeywords(data.keywords || []);
    } catch { showToast("Network error"); }
    finally { setLoadingDescription(false); }
  }

  async function generateTags() {
    setLoadingTags(true);
    try {
      const res = await fetch("/api/packaging/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tags", title: activeTitle, topic }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Generation failed"); return; }
      setTags(data.tags || []);
      setPrimaryTags(data.primary_tags || []);
      setTagTip(data.tip || "");
    } catch { showToast("Network error"); }
    finally { setLoadingTags(false); }
  }

  async function saveToTracker() {
    try {
      const res = await fetch("/api/ideas/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: {
            video_title: activeTitle,
            thumbnail_text: selectedThumbnail || "—",
            hook_line: selectedHook || "—",
            click_confirmation: clickConfirmation,
            sub_niche_keyword: topic || activeTitle,
            packaging_notes: `Packaged via Packaging Studio`,
            suggested_tags: tags.slice(0, 15),
            title_score: titleScore,
          },
          sourceVideo: null,
          niche: topic || activeTitle,
        }),
      });
      if (res.ok) { setSavedToTracker(true); showToast("Saved to Idea Tracker!"); }
      else { const d = await res.json(); showToast(d.error || "Save failed"); }
    } catch { showToast("Save failed"); }
  }

  function copyAll() {
    const text = `Title: ${activeTitle}\nThumbnail: ${selectedThumbnail}\nHook: ${selectedHook}\nClick Confirmation: ${clickConfirmation}`;
    navigator.clipboard.writeText(text);
    showToast("Complete packaging copied!");
  }

  function copyDescription() {
    navigator.clipboard.writeText(description + "\n\n" + hashtags.join(" "));
    setDescriptionCopied(true);
    setTimeout(() => setDescriptionCopied(false), 2000);
    showToast("Description copied!");
  }

  function copyTags() {
    navigator.clipboard.writeText(tags.join(", "));
    setTagsCopied(true);
    setTimeout(() => setTagsCopied(false), 2000);
    showToast("Tags copied!");
  }

  function resetAll() {
    setStep(1); setTitle(""); setSelectedTitle("");
    setThumbnailOptions([]); setSelectedThumbnail("");
    setHooks([]); setSelectedHook(""); setClickConfirmation("");
    setOutline([]); setPolicyResult(null);
    setDescription(""); setHashtags([]); setKeywords([]);
    setTags([]); setPrimaryTags([]); setTagTip("");
    setSavedToTracker(false); setTopic("");
  }

  const steps = [
    { n: 1, label: "Title" },
    { n: 2, label: "Thumbnail" },
    { n: 3, label: "Hook" },
    { n: 4, label: "Script" },
    { n: 5, label: "Description" },
    { n: 6, label: "Tags" },
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white mb-1 flex items-center gap-2">
          <Package className="w-6 h-6 text-[#FFD200]" />
          Video Packaging Studio
        </h1>
        <p className="text-[#555555] text-sm">The 6-step formula: title → thumbnail → hook → script → description → tags.</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1 mb-8 flex-wrap">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-1">
            <button
              onClick={() => { if (s.n <= step) setStep(s.n as Step); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-badge text-xs font-medium transition-colors ${
                step === s.n ? "bg-[#FFD200] text-[#080808]" :
                step > s.n ? "bg-[#22C55E]/20 text-[#22C55E]" :
                "bg-[#111111] border border-[#1E1E1E] text-[#555555]"
              }`}
            >
              {step > s.n ? <Check className="w-3 h-3" /> : <span>{s.n}</span>}
              {s.label}
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-[#333333]" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Title */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
            <h2 className="font-semibold text-white mb-1">Step 1 — Craft Your Video Title</h2>
            <p className="text-[#555555] text-sm mb-4">Score updates in real-time as you type.</p>

            <textarea
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Things Not To Do In Istanbul"
              rows={2}
              maxLength={100}
              className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] transition-colors resize-none"
            />

            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${title.length > 65 ? "text-[#FF3B3B]" : "text-[#555555]"}`}>{title.length}/65 chars</span>
              <span className={`font-display font-bold text-2xl ${titleScoreColor(titleScore)}`}>{titleScore}/100</span>
            </div>

            {title.length > 0 && (
              <div className="mt-4 space-y-1 text-xs text-[#555555]">
                {title.length >= 40 && title.length <= 65 && <p className="text-[#22C55E]">✓ Optimal length</p>}
                {title.length > 65 && <p className="text-[#FF3B3B]">✗ Too long — under 65 chars is best</p>}
                {/\d+/.test(title) && <p className="text-[#22C55E]">✓ Contains a number</p>}
                {["things","best","worst","secret","dark side","mistakes","hidden","exposed","honest"].some(w => title.toLowerCase().includes(w)) && (
                  <p className="text-[#22C55E]">✓ Power word detected</p>
                )}
                {["how to ","what is ","guide to ","tips for "].some(s => title.toLowerCase().startsWith(s)) && (
                  <p className="text-[#FFB700]">⚠ Saturated opener — try a stronger hook</p>
                )}
              </div>
            )}
          </div>

          {title.length >= 10 && (
            <div className="flex gap-3">
              <button onClick={() => { setSelectedTitle(title); setStep(2); generateThumbnail(); }}
                className="flex-1 bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] transition-colors flex items-center justify-center gap-2">
                Use This Title in Step 2 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Thumbnail */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
            <h2 className="font-semibold text-white mb-1">Step 2 — Thumbnail Text</h2>
            <p className="text-[#555555] text-sm mb-1">Your title: <span className="text-white">&quot;{activeTitle}&quot;</span></p>
            <p className="text-[#555555] text-sm mb-4">The 2-4 words that go on your thumbnail. Must pair with your title to maximise CTR.</p>

            {loadingThumbnail && (
              <div className="flex items-center gap-2 text-[#555555] py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Generating options...</span>
              </div>
            )}

            {thumbnailOptions.length > 0 && !loadingThumbnail && (
              <div className="space-y-3">
                {thumbnailOptions.map(opt => (
                  <button key={opt.text} onClick={() => setSelectedThumbnail(opt.text)}
                    className={`w-full text-left p-4 rounded-btn border transition-colors ${selectedThumbnail === opt.text ? "border-[#FFD200] bg-[#FFD200]/5" : "border-[#1E1E1E] hover:border-[#2E2E2E]"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-lg">{opt.text}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${opt.score >= 90 ? "text-[#22C55E]" : opt.score >= 80 ? "text-[#FFB700]" : "text-[#FF3B3B]"}`}>{opt.score}/100</span>
                        {selectedThumbnail === opt.text && <Check className="w-4 h-4 text-[#FFD200]" />}
                      </div>
                    </div>
                    <p className="text-[#555555] text-xs mt-1">{opt.why}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={generateThumbnail} disabled={loadingThumbnail}
                className="bg-[#1E1E1E] text-[#999999] hover:text-white text-sm px-4 py-2 rounded-btn transition-colors disabled:opacity-50">
                ↻ Regenerate
              </button>
              <input type="text" value={selectedThumbnail} onChange={e => setSelectedThumbnail(e.target.value)}
                placeholder="Or type your own thumbnail text..."
                className="flex-1 bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-[#FFD200]" />
            </div>
          </div>

          {selectedThumbnail && (
            <button onClick={() => { setStep(3); generateHooks(); }}
              className="w-full bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] transition-colors">
              Use &quot;{selectedThumbnail}&quot; in Step 3 →
            </button>
          )}
        </div>
      )}

      {/* STEP 3: Hook */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
            <h2 className="font-semibold text-white mb-1">Step 3 — Hook Generator</h2>
            <div className="flex gap-4 text-xs text-[#555555] mb-4">
              <span>Title: <span className="text-white">&quot;{activeTitle}&quot;</span></span>
              <span>Thumbnail: <span className="text-[#FFD200] font-bold">{selectedThumbnail}</span></span>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-[#999999] mb-1">Topic (auto-filled, editable)</label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder={`e.g. ${activeTitle}`}
                className="w-full bg-[#080808] border border-[#1E1E1E] text-white placeholder-[#555555] rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-[#FFD200]" />
            </div>

            {loadingHooks && (
              <div className="flex items-center gap-2 text-[#555555] py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Generating hooks...</span>
              </div>
            )}

            {hooks.length > 0 && !loadingHooks && (
              <div className="space-y-3">
                {hooks.map((hook, i) => (
                  <button key={i} onClick={() => setSelectedHook(hook.text)}
                    className={`w-full text-left p-4 rounded-btn border transition-colors ${selectedHook === hook.text ? "border-[#FFD200] bg-[#FFD200]/5" : "border-[#1E1E1E] hover:border-[#2E2E2E]"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#555555]">{hook.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#FFD200] text-xs">{strengthStars(hook.strength)}</span>
                        {selectedHook === hook.text && <Check className="w-4 h-4 text-[#FFD200]" />}
                      </div>
                    </div>
                    <p className="text-white text-sm leading-relaxed">{hook.text}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={generateHooks} disabled={loadingHooks}
                className="bg-[#1E1E1E] text-[#999999] hover:text-white text-sm px-4 py-2 rounded-btn transition-colors disabled:opacity-50">
                ↻ Generate 5 More Hooks
              </button>
            </div>
          </div>

          {selectedHook && (
            <button onClick={() => { setStep(4); generateOutline(); }}
              className="w-full bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] transition-colors">
              Use Hook in Step 4 →
            </button>
          )}
        </div>
      )}

      {/* STEP 4: Script Outline */}
      {step === 4 && (
        <div className="space-y-6">
          {(loadingOutline || loadingPolicy) && (
            <div className="flex items-center gap-2 text-[#555555]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generating script outline and policy check...</span>
            </div>
          )}

          {clickConfirmation && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <h3 className="text-xs font-semibold text-[#999999] uppercase mb-2">Click Confirmation</h3>
              <p className="text-white text-sm leading-relaxed">&quot;{clickConfirmation}&quot;</p>
              <p className="text-[#22C55E] text-xs mt-2">✓ Strong promise — specific and creates anticipation</p>
            </div>
          )}

          {outline.length > 0 && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <h3 className="text-xs font-semibold text-[#999999] uppercase mb-4">Script Outline</h3>
              <div className="space-y-4">
                {outline.map((section, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#FFD200] text-xs font-semibold">{section.section}</span>
                      <span className="text-[#555555] text-xs">{section.time}</span>
                    </div>
                    <ul className="space-y-1">
                      {section.points.map((p, j) => (
                        <li key={j} className="text-[#999999] text-sm flex gap-2">
                          <span className="text-[#333333] shrink-0">•</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {policyResult && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className={`w-4 h-4 ${policyResult.status === "clear" ? "text-[#22C55E]" : policyResult.status === "warning" ? "text-[#FFB700]" : "text-[#FF3B3B]"}`} />
                <h3 className="text-xs font-semibold text-[#999999] uppercase">YouTube Policy Check</h3>
              </div>
              <div className="space-y-1.5">
                {policyResult.checks.map((c, i) => (
                  <p key={i} className={`text-xs flex items-start gap-1.5 ${c.pass ? "text-[#22C55E]" : "text-[#FFB700]"}`}>
                    <span>{c.pass ? "✓" : "⚠"}</span>{c.text}
                  </p>
                ))}
              </div>
              {policyResult.summary && <p className="text-[#555555] text-xs mt-3 border-t border-[#1E1E1E] pt-3">{policyResult.summary}</p>}
            </div>
          )}

          {activeTitle && selectedThumbnail && selectedHook && (
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-5">
              <h3 className="text-xs font-semibold text-[#999999] uppercase mb-3">Your Complete Packaging</h3>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2"><span className="text-[#555555] w-32 shrink-0">Title:</span><span className="text-white">{activeTitle}</span></div>
                <div className="flex gap-2"><span className="text-[#555555] w-32 shrink-0">Thumbnail:</span><span className="text-[#FFD200] font-bold">{selectedThumbnail}</span></div>
                <div className="flex gap-2"><span className="text-[#555555] w-32 shrink-0">Hook:</span><span className="text-white">{selectedHook.slice(0, 80)}...</span></div>
                {clickConfirmation && <div className="flex gap-2"><span className="text-[#555555] w-32 shrink-0">Click Confirm:</span><span className="text-white">{clickConfirmation.slice(0, 80)}...</span></div>}
                <div className="flex gap-2"><span className="text-[#555555] w-32 shrink-0">Est. Score:</span><span className={`font-bold ${titleScore >= 80 ? "text-[#22C55E]" : "text-[#FFB700]"}`}>{titleScore}/100</span></div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={copyAll} className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-4 py-2.5 rounded-btn hover:bg-[#FFE033] text-sm">
                  <Copy className="w-3.5 h-3.5" />Copy Packaging
                </button>
                <button onClick={saveToTracker} disabled={savedToTracker}
                  className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] text-[#999999] hover:text-white px-4 py-2.5 rounded-btn text-sm transition-colors disabled:opacity-50">
                  {savedToTracker ? <><Check className="w-3.5 h-3.5 text-[#22C55E]" />Saved!</> : <><Save className="w-3.5 h-3.5" />Save to Tracker</>}
                </button>
                <button onClick={resetAll} className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] text-[#555555] hover:text-white px-4 py-2.5 rounded-btn text-sm transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />Start New
                </button>
              </div>
            </div>
          )}

          {outline.length > 0 && (
            <button onClick={() => { setStep(5); generateDescription(); }}
              className="w-full bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] transition-colors flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Generate Description in Step 5 →
            </button>
          )}
        </div>
      )}

      {/* STEP 5: Description */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
            <h2 className="font-semibold text-white mb-1">Step 5 — SEO Description</h2>
            <p className="text-[#555555] text-sm mb-4">AI-written description with keywords, timestamps placeholder, and hashtags.</p>

            {loadingDescription && (
              <div className="flex items-center gap-2 text-[#555555] py-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Writing SEO description...</span>
              </div>
            )}

            {description && !loadingDescription && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#999999] uppercase mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={10}
                    className="w-full bg-[#080808] border border-[#1E1E1E] text-white rounded-btn px-4 py-3 text-sm focus:outline-none focus:border-[#FFD200] resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[#555555] text-xs">{description.length} chars</span>
                    {description.length > 4900 && <span className="text-[#FF3B3B] text-xs">⚠ Near 5000 char limit</span>}
                  </div>
                </div>

                {hashtags.length > 0 && (
                  <div>
                    <label className="block text-xs text-[#999999] uppercase mb-2">Hashtags</label>
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map(h => (
                        <span key={h} className="bg-[#FFD200]/10 text-[#FFD200] text-xs px-2.5 py-1 rounded-badge border border-[#FFD200]/20">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {keywords.length > 0 && (
                  <div>
                    <label className="block text-xs text-[#999999] uppercase mb-2">Target Keywords</label>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map(k => (
                        <span key={k} className="bg-[#1E1E1E] text-[#999999] text-xs px-2.5 py-1 rounded-badge">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={copyDescription}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-btn text-sm font-bold transition-colors ${descriptionCopied ? "bg-[#22C55E] text-white" : "bg-[#FFD200] text-[#080808] hover:bg-[#FFE033]"}`}>
                    {descriptionCopied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy Description + Hashtags</>}
                  </button>
                  <button onClick={generateDescription} disabled={loadingDescription}
                    className="bg-[#1E1E1E] text-[#999999] hover:text-white text-sm px-4 py-2 rounded-btn transition-colors disabled:opacity-50">
                    ↻ Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>

          {description && (
            <button onClick={() => { setStep(6); generateTags(); }}
              className="w-full bg-[#FFD200] text-[#080808] font-bold py-3 rounded-btn hover:bg-[#FFE033] transition-colors flex items-center justify-center gap-2">
              <Tag className="w-4 h-4" />
              Generate Tags in Step 6 →
            </button>
          )}
        </div>
      )}

      {/* STEP 6: Tags */}
      {step === 6 && (
        <div className="space-y-6">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-card p-6">
            <h2 className="font-semibold text-white mb-1">Step 6 — Video Tags</h2>
            <p className="text-[#555555] text-sm mb-4">30 optimized tags ordered by search volume. Copy and paste directly into YouTube.</p>

            {loadingTags && (
              <div className="flex items-center gap-2 text-[#555555] py-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Researching tags...</span>
              </div>
            )}

            {tags.length > 0 && !loadingTags && (
              <div className="space-y-4">
                {primaryTags.length > 0 && (
                  <div>
                    <label className="block text-xs text-[#FFD200] uppercase mb-2 font-semibold">Top 5 Priority Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {primaryTags.map(t => (
                        <span key={t} className="bg-[#FFD200]/10 text-[#FFD200] text-sm px-3 py-1 rounded-badge border border-[#FFD200]/20 font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-[#999999] uppercase mb-2">All 30 Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(t => (
                      <span key={t} className={`text-xs px-2.5 py-1 rounded-badge border ${primaryTags.includes(t) ? "bg-[#FFD200]/10 text-[#FFD200] border-[#FFD200]/20" : "bg-[#1E1E1E] text-[#999999] border-[#2E2E2E]"}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {tagTip && (
                  <p className="text-[#555555] text-xs border-t border-[#1E1E1E] pt-3">
                    💡 {tagTip}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={copyTags}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-btn text-sm font-bold transition-colors ${tagsCopied ? "bg-[#22C55E] text-white" : "bg-[#FFD200] text-[#080808] hover:bg-[#FFE033]"}`}>
                    {tagsCopied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy All Tags</>}
                  </button>
                  <button onClick={generateTags} disabled={loadingTags}
                    className="bg-[#1E1E1E] text-[#999999] hover:text-white text-sm px-4 py-2 rounded-btn transition-colors disabled:opacity-50">
                    ↻ Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Final summary card */}
          <div className="bg-[#111111] border border-[#22C55E]/20 rounded-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Check className="w-4 h-4 text-[#22C55E]" />
              <h3 className="font-semibold text-white">Video Fully Packaged</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-[#080808] rounded-btn p-3">
                <p className="text-[#555555] text-xs mb-1">Title Score</p>
                <p className={`font-bold text-lg ${titleScore >= 80 ? "text-[#22C55E]" : "text-[#FFB700]"}`}>{titleScore}/100</p>
              </div>
              <div className="bg-[#080808] rounded-btn p-3">
                <p className="text-[#555555] text-xs mb-1">Tags Generated</p>
                <p className="font-bold text-lg text-white">{tags.length}</p>
              </div>
              <div className="bg-[#080808] rounded-btn p-3">
                <p className="text-[#555555] text-xs mb-1">Hashtags</p>
                <p className="font-bold text-lg text-white">{hashtags.length}</p>
              </div>
              <div className="bg-[#080808] rounded-btn p-3">
                <p className="text-[#555555] text-xs mb-1">Description</p>
                <p className="font-bold text-lg text-[#22C55E]">{description ? "✓ Ready" : "—"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={saveToTracker} disabled={savedToTracker}
                className="flex items-center gap-2 bg-[#FFD200] text-[#080808] font-bold px-4 py-2.5 rounded-btn hover:bg-[#FFE033] text-sm disabled:opacity-70">
                {savedToTracker ? <><Check className="w-3.5 h-3.5" />Saved!</> : <><Save className="w-3.5 h-3.5" />Save to Idea Tracker</>}
              </button>
              <button onClick={resetAll} className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] text-[#555555] hover:text-white px-4 py-2.5 rounded-btn text-sm transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />Package New Video
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#111111] border border-[#1E1E1E] text-white text-sm px-4 py-3 rounded-card shadow-2xl z-50 animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}
